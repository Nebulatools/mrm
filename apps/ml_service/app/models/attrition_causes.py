"""
Attrition causes analysis — root cause classification with SHAP explanations.

Reads from Silver layer (mv_empleados_master + mv_incidencias_enriquecidas)
to classify termination types and extract SHAP-based feature importances.
"""
from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import shap
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from .base import BaseModelTrainer, TrainOutput
from .evaluation import build_preprocessor, get_feature_names_from_pipeline
from ..schemas import ModelType

from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier


# SQL to load attrition data from Silver layer
ATTRITION_SQL = """
SELECT
    m.numero_empleado,
    m.fecha_baja_final AS fecha_baja,
    m.motivo_baja AS motivo,
    m.tipo_baja AS tipo,
    m.edad,
    m.antiguedad_dias,
    m.genero,
    m.generacion,
    m.es_operativo,
    m.departamento,
    m.area,
    m.ubicacion2,
    m.turno,
    m.empresa,
    m.clasificacion
FROM mv_empleados_master m
WHERE m.fecha_baja_final IS NOT NULL
  AND m.fecha_baja_final >= CURRENT_DATE - INTERVAL '24 months';
"""

# We join incident history separately since it needs aggregation
ATTRITION_INCIDENTS_SQL = """
SELECT
    i.numero_empleado,
    COUNT(*) FILTER (WHERE i.es_negativa AND i.fecha >= m.fecha_baja_final - INTERVAL '90 days') AS neg_90d,
    COUNT(*) FILTER (WHERE i.es_negativa AND i.fecha >= m.fecha_baja_final - INTERVAL '180 days') AS neg_180d,
    COUNT(*) FILTER (WHERE i.categoria_incidencia = 'permiso' AND i.fecha >= m.fecha_baja_final - INTERVAL '365 days') AS permisos_365d,
    COUNT(*) FILTER (WHERE i.fecha >= m.fecha_baja_final - INTERVAL '365 days') AS total_365d,
    COUNT(*) FILTER (WHERE i.es_falta_injustificada AND i.fecha >= m.fecha_baja_final - INTERVAL '90 days') AS fi_90d
FROM mv_empleados_master m
JOIN mv_incidencias_enriquecidas i ON i.numero_empleado = m.numero_empleado
WHERE m.fecha_baja_final IS NOT NULL
  AND m.fecha_baja_final >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY i.numero_empleado;
"""

NUMERIC_FEATURES: List[str] = [
    'edad',
    'antiguedad_dias',
    'neg_90d',
    'neg_180d',
    'permisos_365d',
    'total_365d',
    'fi_90d',
    'ratio_neg_90',
    'ratio_neg_180',
    'ratio_fi',
]

CATEGORICAL_FEATURES: List[str] = [
    'genero',
    'generacion',
    'departamento',
    'area',
    'ubicacion2',
    'turno',
    'empresa',
    'clasificacion',
]


class AttritionCausesTrainer(BaseModelTrainer):
    model_id = 'attrition_causes'
    model_name = 'Causas raíz de bajas'
    model_type = ModelType.CLASSIFICATION
    description = (
        'Clasificación de motivos de baja con explicaciones SHAP '
        'para priorizar factores críticos de rotación.'
    )

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        # REST adapter fetches raw mv_empleados_master rows.
        # Filter to terminated employees from last 24 months.
        df = await self.database.fetch_dataframe(ATTRITION_SQL)
        if df.empty:
            return df

        df['fecha_baja_final'] = pd.to_datetime(df.get('fecha_baja_final'), errors='coerce')
        cutoff = pd.Timestamp.now() - pd.DateOffset(months=24)
        df = df[df['fecha_baja_final'].notna() & (df['fecha_baja_final'] >= cutoff)].copy()

        # Rename to match expected columns
        if 'fecha_baja_final' in df.columns and 'fecha_baja' not in df.columns:
            df['fecha_baja'] = df['fecha_baja_final']
        if 'motivo_baja' in df.columns and 'motivo' not in df.columns:
            df['motivo'] = df['motivo_baja']
        if 'tipo_baja' in df.columns and 'tipo' not in df.columns:
            df['tipo'] = df['tipo_baja']

        if df.empty:
            return df

        # Load incidents separately and aggregate per employee
        # Use a query that routes to mv_incidencias_enriquecidas via the REST adapter
        inc_df = await self.database.fetch_dataframe(
            'SELECT * FROM mv_incidencias_enriquecidas'
        )
        if not inc_df.empty:
            inc_df['fecha'] = pd.to_datetime(inc_df['fecha'], errors='coerce')

            # Coerce boolean columns (REST returns strings or booleans)
            for bool_col in ['es_negativa', 'es_falta_injustificada']:
                if bool_col in inc_df.columns:
                    inc_df[bool_col] = inc_df[bool_col].map(
                        {True: True, False: False, 'true': True, 'false': False, 't': True, 'f': False}
                    ).fillna(False)

            # Merge fecha_baja into incidents for window calculations
            baja_map = df.set_index('numero_empleado')['fecha_baja'].to_dict()
            inc_df['fecha_baja'] = inc_df['numero_empleado'].map(baja_map)
            inc_df['fecha_baja'] = pd.to_datetime(inc_df['fecha_baja'], errors='coerce')
            inc_df = inc_df.dropna(subset=['fecha', 'fecha_baja'])

            agg_rows = []
            for emp_id, group in inc_df.groupby('numero_empleado'):
                fb = group['fecha_baja'].iloc[0]
                neg_mask = group['es_negativa'] == True
                fi_mask = group['es_falta_injustificada'] == True
                perm_mask = group['categoria_incidencia'] == 'permiso'

                agg_rows.append({
                    'numero_empleado': emp_id,
                    'neg_90d': int(((group['fecha'] >= fb - pd.Timedelta(days=90)) & neg_mask).sum()),
                    'neg_180d': int(((group['fecha'] >= fb - pd.Timedelta(days=180)) & neg_mask).sum()),
                    'permisos_365d': int(((group['fecha'] >= fb - pd.Timedelta(days=365)) & perm_mask).sum()),
                    'total_365d': int((group['fecha'] >= fb - pd.Timedelta(days=365)).sum()),
                    'fi_90d': int(((group['fecha'] >= fb - pd.Timedelta(days=90)) & fi_mask).sum()),
                })

            if agg_rows:
                inc_agg = pd.DataFrame(agg_rows)
                df = df.merge(inc_agg, on='numero_empleado', how='left')

        # Fill missing incident columns with 0
        for col in ['neg_90d', 'neg_180d', 'permisos_365d', 'total_365d', 'fi_90d']:
            if col not in df.columns:
                df[col] = 0
            else:
                df[col] = df[col].fillna(0).astype(int)

        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        df = df.dropna(subset=['motivo'])
        if df.empty:
            raise ValueError('No hay suficientes registros de bajas recientes para entrenar causas raíz.')

        # Group small motivo classes into 'Otros' to ensure enough samples per class
        motivo_counts = Counter(df['motivo'])
        min_samples = 5
        small_classes = {m for m, c in motivo_counts.items() if c < min_samples}
        df['motivo_grouped'] = df['motivo'].apply(lambda x: 'Otros' if x in small_classes else x)

        target = df['motivo_grouped'].fillna('DESCONOCIDO')
        class_counts = Counter(target)
        if len(class_counts) < 2:
            raise ValueError('Se requiere al menos dos clases de motivo para entrenar el modelo.')

        # Fill missing values
        base_numeric = [f for f in NUMERIC_FEATURES if not f.startswith('ratio_')]
        for col in base_numeric:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            else:
                df[col] = 0

        for col in CATEGORICAL_FEATURES:
            if col in df.columns:
                df[col] = df[col].fillna('DESCONOCIDO').astype(str)
            else:
                df[col] = 'DESCONOCIDO'

        # Derived ratios
        df['ratio_neg_90'] = df['neg_90d'] / df['total_365d'].replace(0, np.nan)
        df['ratio_neg_180'] = df['neg_180d'] / df['total_365d'].replace(0, np.nan)
        df['ratio_fi'] = df['fi_90d'] / df['total_365d'].replace(0, np.nan)
        for col in ['ratio_neg_90', 'ratio_neg_180', 'ratio_fi']:
            df[col] = df[col].replace([np.inf, -np.inf], np.nan).fillna(0)

        X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]

        # Encode string labels to integers for XGBoost
        le = LabelEncoder()
        y = le.fit_transform(target)
        classes = le.classes_.tolist()

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=99, stratify=y,
        )

        # Build pipeline
        preprocessor = build_preprocessor(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
        estimator = XGBClassifier(
            objective='multi:softprob',
            eval_metric='mlogloss',
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.7,
            random_state=99,
            num_class=len(classes),
        )

        pipeline = Pipeline(steps=[
            ('preprocess', preprocessor),
            ('model', estimator),
        ])

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        # Decode labels back to strings for the report
        y_test_labels = le.inverse_transform(y_test)
        y_pred_labels = le.inverse_transform(y_pred)
        report = classification_report(y_test_labels, y_pred_labels, output_dict=True)

        # SHAP analysis — use feature_importances_ as fallback
        feature_names = get_feature_names_from_pipeline(
            pipeline, NUMERIC_FEATURES, CATEGORICAL_FEATURES,
        )

        shap_summary: List[Dict[str, Any]] = []
        per_class_shap: Dict[str, List[Dict[str, Any]]] = {}

        try:
            explainer = shap.TreeExplainer(estimator)
            preprocess_train = pipeline.named_steps['preprocess'].transform(X_train)
            shap_values = explainer.shap_values(preprocess_train)

            # Handle both list (old) and 3D array (new XGBoost) formats
            if isinstance(shap_values, list):
                shap_array = np.mean([np.abs(v).mean(axis=0) for v in shap_values], axis=0)
                for idx, cls in enumerate(classes):
                    cls_importances = np.abs(shap_values[idx]).mean(axis=0)
                    cls_summary = sorted(
                        [{'feature': f, 'importance': float(imp)} for f, imp in zip(feature_names, cls_importances)],
                        key=lambda x: x['importance'], reverse=True,
                    )[:10]
                    per_class_shap[cls] = cls_summary
            elif shap_values.ndim == 3:
                # Shape: (n_samples, n_features, n_classes)
                shap_array = np.abs(shap_values).mean(axis=(0, 2))
                for idx, cls in enumerate(classes):
                    cls_importances = np.abs(shap_values[:, :, idx]).mean(axis=0)
                    cls_summary = sorted(
                        [{'feature': f, 'importance': float(imp)} for f, imp in zip(feature_names, cls_importances)],
                        key=lambda x: x['importance'], reverse=True,
                    )[:10]
                    per_class_shap[cls] = cls_summary
            else:
                shap_array = np.abs(shap_values).mean(axis=0)

            shap_summary = sorted(
                [{'feature': f, 'importance': float(imp)} for f, imp in zip(feature_names, shap_array)],
                key=lambda x: x['importance'], reverse=True,
            )[:15]
        except Exception:
            # Fallback to native feature importances
            if hasattr(estimator, 'feature_importances_'):
                importances = estimator.feature_importances_
                shap_summary = sorted(
                    [{'feature': f, 'importance': float(imp)} for f, imp in zip(feature_names, importances)],
                    key=lambda x: x['importance'], reverse=True,
                )[:15]

        artifacts: Dict[str, Any] = {
            'classification_report': report,
            'shap_top_features': shap_summary,
            'per_class_shap': per_class_shap,
        }

        metrics: Dict[str, Any] = {
            'weighted_f1': float(report['weighted avg']['f1-score']),
            'macro_f1': float(report['macro avg']['f1-score']),
            'classes': dict(class_counts),
            'train_size': int(len(y_train)),
            'test_size': int(len(y_test)),
        }

        return TrainOutput(estimator=pipeline, metrics=metrics, artifacts=artifacts)

from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
    precision_recall_curve,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from .base import BaseModelTrainer, TrainOutput
from ..database import Database
from ..schemas import ModelType
from ..utils.sklearn import build_one_hot_encoder


ROTATION_FEATURES_SQL = """
SELECT
    e.numero_empleado AS employee_id,
    e.genero,
    e.area,
    e.departamento,
    e.puesto,
    e.clasificacion,
    e.ubicacion,
    e.tipo_nomina,
    e.turno,
    e.empresa,
    e.fecha_ingreso,
    e.fecha_antiguedad,
    e.fecha_baja
FROM empleados_sftp e
WHERE e.fecha_ingreso IS NOT NULL
ORDER BY e.numero_empleado;
"""


class RotationAttritionTrainer(BaseModelTrainer):
    model_id = 'rotation'
    model_name = 'Predicción de rotación individual'
    model_type = ModelType.CLASSIFICATION
    description = (
        'Predicción PROACTIVA de riesgo de rotación en próximos 90 días. '
        'Identifica empleados en riesgo ANTES de que decidan renunciar, '
        'permitiendo intervenciones preventivas (mejora salarial, cambio de área, capacitación). '
        'VALOR DE NEGOCIO: Reducir costo de rotación (estimado $50,000 MXN por empleado) '
        'identificando 30-40% de casos con 2-3 meses de anticipación.'
    )

    def __init__(self, settings, database: Database) -> None:
        super().__init__(settings, database)
        self.target_column = 'target_rotacion_90d'  # Nuevo target con ventana temporal

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        # Cargar datos base de empleados
        df_base = await self.database.fetch_dataframe(ROTATION_FEATURES_SQL)

        # Construir ventanas temporales en Python
        df = self._build_temporal_windows(df_base)
        return df

    def _build_temporal_windows(self, df_base: pd.DataFrame) -> pd.DataFrame:
        """
        Construye ventanas temporales (snapshots históricos) en Python.
        Esto evita problemas con SQL complejo en Supabase.
        """
        import datetime
        from dateutil.relativedelta import relativedelta

        # Convertir fechas
        df_base['fecha_ingreso'] = pd.to_datetime(df_base['fecha_ingreso'])
        df_base['fecha_antiguedad'] = pd.to_datetime(df_base['fecha_antiguedad'], errors='coerce')
        df_base['fecha_baja'] = pd.to_datetime(df_base['fecha_baja'], errors='coerce')

        # Generar fechas de snapshot (cada mes en últimos 12 meses)
        end_date = datetime.date.today() - relativedelta(months=3)  # Excluir últimos 3 meses
        start_date = end_date - relativedelta(months=12)

        snapshot_dates = []
        current = start_date
        while current <= end_date:
            snapshot_dates.append(current)
            current = current + relativedelta(months=1)

        # Construir dataset de snapshots
        snapshots = []

        for snapshot_date in snapshot_dates:
            for _, emp in df_base.iterrows():
                fecha_ingreso = emp['fecha_ingreso'].date()
                fecha_baja = emp['fecha_baja'].date() if pd.notna(emp['fecha_baja']) else None

                days_until_baja: int | None = None

                # Reutilizar conteos agregados del dataset base si existen
                count_columns = [
                    'neg_30d',
                    'neg_90d',
                    'neg_365d',
                    'permisos_90d',
                    'permisos_365d',
                    'total_90d',
                    'total_365d',
                ]
                aggregated_counts: Dict[str, float] = {}
                for col in count_columns:
                    value = emp[col] if col in emp.index else 0
                    aggregated_counts[col] = float(value) if pd.notna(value) else 0.0

                # Solo empleados activos en snapshot_date
                if fecha_ingreso < snapshot_date and (fecha_baja is None or fecha_baja >= snapshot_date):
                    # Calcular target: ¿Se dio de baja en próximos 90 días?
                    target = 0
                    if fecha_baja is not None:
                        delta_days = (fecha_baja - snapshot_date).days
                        if delta_days >= 0:
                            days_until_baja = delta_days
                        if 1 <= delta_days <= 90:
                            target = 1

                    # Calcular antigüedad en snapshot_date
                    tenure_days = (snapshot_date - fecha_ingreso).days
                    fecha_ant = emp['fecha_antiguedad'].date() if pd.notna(emp['fecha_antiguedad']) else fecha_ingreso
                    antiguedad_days = (snapshot_date - fecha_ant).days

                    snapshot = {
                        'employee_id': emp['employee_id'],
                        'snapshot_date': snapshot_date,
                        'target_rotacion_90d': target,
                        'tenure_days_at_snapshot': tenure_days,
                        'antiguedad_days_at_snapshot': antiguedad_days,
                        'genero': emp['genero'],
                        'area': emp['area'],
                        'departamento': emp['departamento'],
                        'puesto': emp['puesto'],
                        'clasificacion': emp['clasificacion'],
                        'ubicacion': emp['ubicacion'],
                        'tipo_nomina': emp['tipo_nomina'],
                        'turno': emp['turno'],
                        'empresa': emp['empresa'],
                        'days_until_baja': days_until_baja,
                    }
                    snapshot.update(aggregated_counts)
                    snapshots.append(snapshot)

        return pd.DataFrame(snapshots)

    def prepare_features(
        self,
        frame: pd.DataFrame,
        *,
        include_target: bool = True,
    ) -> tuple[pd.DataFrame, pd.Series | None, List[str], List[str]]:
        df = frame.copy()

        # Fill numeric columns with zero for counts
        count_cols = [
            'neg_30d',
            'neg_90d',
            'neg_365d',
            'permisos_90d',
            'permisos_365d',
            'total_90d',
            'total_365d',
        ]
        for col in count_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # CAMBIO IMPORTANTE: Ya NO calculamos tenure desde ahora, usamos el precalculado
        # tenure_days_at_snapshot y antiguedad_days_at_snapshot ya vienen del SQL
        if 'tenure_days_at_snapshot' in df.columns:
            df['tenure_days'] = pd.to_numeric(df['tenure_days_at_snapshot'], errors='coerce').fillna(0)
        else:
            # Fallback para compatibilidad
            df['tenure_days'] = 0

        if 'antiguedad_days_at_snapshot' in df.columns:
            df['antiguedad_days'] = pd.to_numeric(df['antiguedad_days_at_snapshot'], errors='coerce').fillna(0)
        else:
            # Fallback para compatibilidad
            df['antiguedad_days'] = 0

        # Validar y convertir target
        if include_target and self.target_column in df.columns:
            df[self.target_column] = (
                pd.to_numeric(df[self.target_column], errors='coerce').fillna(0).astype(int)
            )

        # Ratios (calculados con datos de incidencias)
        df['ratio_neg_90d'] = df['neg_90d'] / df['total_90d'].replace(0, np.nan)
        df['ratio_neg_365d'] = df['neg_365d'] / df['total_365d'].replace(0, np.nan)
        df['ratio_permisos_365d'] = df['permisos_365d'] / df['total_365d'].replace(0, np.nan)
        df['ratio_neg_90d'] = df['ratio_neg_90d'].fillna(0)
        df['ratio_neg_365d'] = df['ratio_neg_365d'].fillna(0)
        df['ratio_permisos_365d'] = df['ratio_permisos_365d'].fillna(0)

        features_numeric: List[str] = [
            'tenure_days',
            'antiguedad_days',
            'neg_30d',
            'neg_90d',
            'neg_365d',
            'permisos_90d',
            'permisos_365d',
            'ratio_neg_90d',
            'ratio_neg_365d',
            'ratio_permisos_365d',
        ]

        # Features categóricas
        features_categorical: List[str] = [
            'genero',
            'area',
            'departamento',
            'puesto',
            'clasificacion',
            'ubicacion',
            'tipo_nomina',
            'turno',
            'empresa',
        ]

        # Ensure missing columns exist
        for col in features_numeric:
            if col not in df.columns:
                df[col] = 0
        for col in features_categorical:
            if col not in df.columns:
                df[col] = 'UNKNOWN'

        X = df[features_numeric + features_categorical]
        y = None
        if include_target and self.target_column in df.columns:
            y = pd.to_numeric(df[self.target_column], errors='coerce').fillna(0).astype(int)

        return X, y, features_numeric, features_categorical

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        X, y, features_numeric, features_categorical = self.prepare_features(frame, include_target=True)
        if y is None:
            raise ValueError('Dataset for rotation model is missing target column.')

        positive_samples = int((y == 1).sum())
        negative_samples = int((y == 0).sum())
        if positive_samples == 0:
            raise ValueError(
                'El modelo de rotación necesita al menos algunas bajas registradas en los últimos 24 meses. '
                'Carga datos de motivos de baja antes de volver a entrenar.'
            )
        if min(positive_samples, negative_samples) < 2:
            raise ValueError(
                'No hay suficientes ejemplos por clase para hacer la partición estratificada. '
                'Se requieren al menos dos registros por clase.'
            )

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y,
        )

        numeric_transformer = Pipeline(
            steps=[
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler()),
            ]
        )
        categorical_transformer = Pipeline(
            steps=[
                ('imputer', SimpleImputer(strategy='most_frequent')),
                ('encoder', build_one_hot_encoder()),
            ]
        )

        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, features_numeric),
                ('cat', categorical_transformer, features_categorical),
            ]
        )

        estimator = XGBClassifier(
            max_depth=4,
            n_estimators=300,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.7,
            objective='binary:logistic',
            eval_metric='auc',
            tree_method='hist',
            scale_pos_weight=self._compute_class_weight(y_train),
            reg_lambda=1.0,
            random_state=42,
        )

        pipeline = Pipeline(
            steps=[
                ('preprocess', preprocessor),
                ('model', estimator),
            ]
        )

        pipeline.fit(X_train, y_train)

        # Predicciones
        y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
        y_pred = (y_pred_proba >= 0.5).astype(int)

        # Validación cruzada (5-fold)
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring='roc_auc')

        # Matriz de confusión
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        # Curvas ROC y Precision-Recall
        fpr, tpr, roc_thresholds = roc_curve(y_test, y_pred_proba)
        precision_curve, recall_curve, pr_thresholds = precision_recall_curve(y_test, y_pred_proba)

        # Métricas completas
        metrics: Dict[str, float] = {
            # Métricas principales
            'roc_auc': float(roc_auc_score(y_test, y_pred_proba)),
            'average_precision': float(average_precision_score(y_test, y_pred_proba)),
            'f1': float(f1_score(y_test, y_pred)),
            'precision': float(precision_score(y_test, y_pred, zero_division=0)),
            'recall': float(recall_score(y_test, y_pred, zero_division=0)),

            # Validación cruzada
            'cv_mean': float(cv_scores.mean()),
            'cv_std': float(cv_scores.std()),

            # Matriz de confusión
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp),

            # Tasas derivadas
            'specificity': float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0,
            'false_positive_rate': float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0,
            'false_negative_rate': float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0,

            # Metadata
            'positive_rate': float(y.mean()),
            'train_size': int(len(y_train)),
            'test_size': int(len(y_test)),
            'total_samples': int(len(y)),
        }

        # Feature importance
        feature_importances = self._extract_feature_importances(pipeline, features_numeric, features_categorical)

        # Análisis de valor de negocio
        costo_rotacion_por_empleado = 50_000  # MXN estimado
        empleados_en_riesgo_detectados = int(tp)  # True Positives
        empleados_perdidos_no_detectados = int(fn)  # False Negatives
        falsas_alarmas = int(fp)  # False Positives

        # Asumiendo 30% de efectividad en intervenciones
        tasa_exito_intervencion = 0.30
        empleados_retenidos = int(empleados_en_riesgo_detectados * tasa_exito_intervencion)
        ahorro_potencial_mxn = empleados_retenidos * costo_rotacion_por_empleado

        # Costo de intervenciones (estimado $5,000 MXN por empleado)
        costo_intervencion = 5_000
        costo_total_intervenciones = (empleados_en_riesgo_detectados + falsas_alarmas) * costo_intervencion

        roi_estimado = ahorro_potencial_mxn - costo_total_intervenciones

        business_value = {
            'empleados_en_riesgo_detectados': empleados_en_riesgo_detectados,
            'empleados_perdidos_no_detectados': empleados_perdidos_no_detectados,
            'falsas_alarmas': falsas_alarmas,
            'empleados_retenidos_estimados': empleados_retenidos,
            'ahorro_potencial_mxn': ahorro_potencial_mxn,
            'costo_intervenciones_mxn': costo_total_intervenciones,
            'roi_estimado_mxn': roi_estimado,
            'tasa_exito_intervencion_asumida': tasa_exito_intervencion,
            'costo_rotacion_por_empleado_mxn': costo_rotacion_por_empleado,
        }

        # Artefactos de evaluación
        artifacts: Dict[str, Any] = {
            'feature_importances': feature_importances,
            'confusion_matrix': {
                'true_negatives': int(tn),
                'false_positives': int(fp),
                'false_negatives': int(fn),
                'true_positives': int(tp),
            },
            'roc_curve': {
                'fpr': fpr.tolist(),
                'tpr': tpr.tolist(),
                'thresholds': roc_thresholds.tolist(),
            },
            'precision_recall_curve': {
                'precision': precision_curve.tolist(),
                'recall': recall_curve.tolist(),
                'thresholds': pr_thresholds.tolist(),
            },
            'cv_scores': cv_scores.tolist(),
            'business_value': business_value,
        }

        return TrainOutput(estimator=pipeline, metrics=metrics, artifacts=artifacts)

    def _compute_class_weight(self, y: pd.Series) -> float:
        positives = float(y.sum())
        negatives = float((y == 0).sum())
        if positives == 0:
            return 1.0
        return max(1.0, negatives / positives)

    def _extract_feature_importances(
        self,
        pipeline: Pipeline,
        features_numeric: List[str],
        features_categorical: List[str],
    ) -> Dict[str, float]:
        model: XGBClassifier = pipeline.named_steps['model']
        preprocess: ColumnTransformer = pipeline.named_steps['preprocess']

        encoded_feature_names: List[str] = []
        for name, transformer, features in preprocess.transformers_:
            if name == 'cat':
                encoder = transformer.named_steps['encoder']
                feature_names = encoder.get_feature_names_out(features)
                encoded_feature_names.extend(feature_names.tolist())
            elif name == 'num':
                encoded_feature_names.extend(features)

        importances = model.feature_importances_
        return {
            feature: float(importance)
            for feature, importance in zip(encoded_feature_names, importances)
        }

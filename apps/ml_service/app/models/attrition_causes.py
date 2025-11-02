from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import shap
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from .base import BaseModelTrainer, TrainOutput
from ..schemas import ModelType
from ..utils.sklearn import build_one_hot_encoder


ATTRITION_SQL = """
WITH bajas AS (
    SELECT
        mb.numero_empleado,
        mb.fecha_baja,
        mb.tipo,
        mb.motivo,
        mb.descripcion
    FROM motivos_baja mb
    WHERE mb.fecha_baja >= CURRENT_DATE - INTERVAL '24 months'
),
empleado_snap AS (
    SELECT
        e.numero_empleado,
        e.area,
        e.departamento,
        e.turno,
        e.clasificacion,
        e.tipo_nomina,
        e.empresa,
        e.ubicacion,
        e.fecha_ingreso,
        e.fecha_antiguedad
    FROM empleados_sftp e
),
incidencias_hist AS (
    SELECT
        i.emp AS numero_empleado,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN mb.fecha_baja - INTERVAL '90 days' AND mb.fecha_baja - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_90d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN mb.fecha_baja - INTERVAL '180 days' AND mb.fecha_baja - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_180d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN mb.fecha_baja - INTERVAL '365 days' AND mb.fecha_baja - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])
        ) AS permisos_365d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN mb.fecha_baja - INTERVAL '365 days' AND mb.fecha_baja - INTERVAL '1 day'
        ) AS total_365d
    FROM motivos_baja mb
    LEFT JOIN incidencias i ON i.emp = mb.numero_empleado
    GROUP BY i.emp, mb.fecha_baja
)
SELECT
    b.numero_empleado,
    b.fecha_baja,
    b.tipo,
    b.motivo,
    e.area,
    e.departamento,
    e.turno,
    e.clasificacion,
    e.tipo_nomina,
    e.empresa,
    e.ubicacion,
    DATE_PART('day', b.fecha_baja::timestamp - e.fecha_ingreso::timestamp) AS tenure_days,
    DATE_PART('day', b.fecha_baja::timestamp - COALESCE(e.fecha_antiguedad, e.fecha_ingreso)::timestamp) AS antiguedad_days,
    ih.neg_90d,
    ih.neg_180d,
    ih.permisos_365d,
    ih.total_365d
FROM bajas b
LEFT JOIN empleado_snap e ON e.numero_empleado = b.numero_empleado
LEFT JOIN incidencias_hist ih ON ih.numero_empleado = b.numero_empleado;
"""


class AttritionCausesTrainer(BaseModelTrainer):
    model_id = 'attrition_causes'
    model_name = 'Causas raíz de bajas'
    model_type = ModelType.CLASSIFICATION
    description = 'Clasificación de motivos de baja con explicaciones SHAP para priorizar factores críticos.'

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        df = await self.database.fetch_dataframe(ATTRITION_SQL)
        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        df = df.dropna(subset=['tipo'])
        if df.empty:
            raise ValueError('No hay suficientes registros de bajas recientes para entrenar causas raíz.')

        target = df['tipo'].fillna('DESCONOCIDO')
        class_counts = Counter(target)
        if len(class_counts) < 2:
            raise ValueError('Se requiere al menos dos clases de motivo para entrenar el modelo.')

        numeric_features: List[str] = [
            'tenure_days',
            'antiguedad_days',
            'neg_90d',
            'neg_180d',
            'permisos_365d',
            'total_365d',
        ]
        categorical_features: List[str] = [
            'area',
            'departamento',
            'turno',
            'clasificacion',
            'tipo_nomina',
            'empresa',
            'ubicacion',
            'motivo',
        ]

        for col in numeric_features:
            df[col] = df[col].fillna(0)
        for col in categorical_features:
            df[col] = df[col].fillna('DESCONOCIDO')

        df['ratio_neg_90'] = df['neg_90d'] / df['total_365d'].replace(0, np.nan)
        df['ratio_neg_180'] = df['neg_180d'] / df['total_365d'].replace(0, np.nan)
        df['ratio_permiso'] = df['permisos_365d'] / df['total_365d'].replace(0, np.nan)
        df[['ratio_neg_90', 'ratio_neg_180', 'ratio_permiso']] = df[
            ['ratio_neg_90', 'ratio_neg_180', 'ratio_permiso']
        ].replace([np.inf, -np.inf], np.nan).fillna(0)

        numeric_features.extend(['ratio_neg_90', 'ratio_neg_180', 'ratio_permiso'])

        X = df[numeric_features + categorical_features]
        y = target

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.25,
            random_state=99,
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
                ('num', numeric_transformer, numeric_features),
                ('cat', categorical_transformer, categorical_features),
            ]
        )

        classes = sorted(class_counts.keys())
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

        pipeline = Pipeline(
            steps=[
                ('preprocess', preprocessor),
                ('model', estimator),
            ]
        )

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        report = classification_report(y_test, y_pred, output_dict=True)

        explainer = shap.TreeExplainer(estimator)
        preprocess_train = pipeline.named_steps['preprocess'].transform(X_train)
        shap_values = explainer.shap_values(preprocess_train)
        feature_names = self._get_feature_names(pipeline)

        if isinstance(shap_values, list):
            shap_array = np.mean([np.abs(values).mean(axis=0) for values in shap_values], axis=0)
        else:
            shap_array = np.abs(shap_values).mean(axis=0)

        shap_summary = sorted(
            [
                {'feature': feature, 'importance': float(importance)}
                for feature, importance in zip(feature_names, shap_array)
            ],
            key=lambda item: item['importance'],
            reverse=True,
        )[:15]

        artifacts = {
            'classification_report': report,
            'shap_top_features': shap_summary,
        }

        metrics: Dict[str, Any] = {
            'weighted_f1': float(report['weighted avg']['f1-score']),
            'macro_f1': float(report['macro avg']['f1-score']),
            'classes': class_counts,
        }

        return TrainOutput(estimator=pipeline, metrics=metrics, artifacts=artifacts)

    def _get_feature_names(self, pipeline: Pipeline) -> List[str]:
        preprocessor: ColumnTransformer = pipeline.named_steps['preprocess']
        feature_names: List[str] = []
        for name, transformer, features in preprocessor.transformers_:
            if name == 'num':
                feature_names.extend(features)
            elif name == 'cat':
                encoder = transformer.named_steps['encoder']
                feature_names.extend(encoder.get_feature_names_out(features))
        return feature_names

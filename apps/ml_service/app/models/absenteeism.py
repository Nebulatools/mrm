from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import average_precision_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .base import BaseModelTrainer, TrainOutput
from ..schemas import ModelType
from ..utils.sklearn import build_one_hot_encoder


ABSENTEEISM_SQL = """
WITH params AS (
    SELECT
        date_trunc('month', CURRENT_DATE - INTERVAL '12 months')::date AS start_month,
        date_trunc('month', CURRENT_DATE)::date AS end_month
),
month_grid AS (
    SELECT generate_series(start_month, end_month, INTERVAL '1 month')::date AS month_start
    FROM params
),
employee_month AS (
    SELECT
        e.numero_empleado,
        e.area,
        e.departamento,
        e.turno,
        e.clasificacion,
        e.tipo_nomina,
        e.empresa,
        e.fecha_ingreso,
        e.fecha_antiguedad,
        e.fecha_baja,
        mg.month_start,
        (mg.month_start + INTERVAL '1 month' - INTERVAL '1 day')::date AS month_end
    FROM empleados_sftp e
    CROSS JOIN month_grid mg
    WHERE e.fecha_ingreso <= (mg.month_start + INTERVAL '1 month' - INTERVAL '1 day')
      AND (e.fecha_baja IS NULL OR e.fecha_baja >= mg.month_start)
),
history AS (
    SELECT
        em.numero_empleado,
        em.month_start,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '28 days' AND em.month_start - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_prev_28d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '56 days' AND em.month_start - INTERVAL '29 days'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_prev_56d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '365 days' AND em.month_start - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_prev_365d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '90 days' AND em.month_start - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])
        ) AS permisos_prev_90d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '365 days' AND em.month_start - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])
        ) AS permisos_prev_365d
    FROM employee_month em
    LEFT JOIN incidencias i ON i.emp = em.numero_empleado
    GROUP BY em.numero_empleado, em.month_start
),
future AS (
    SELECT
        em.numero_empleado,
        em.month_start,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start AND em.month_start + INTERVAL '30 days'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_next_30d
    FROM employee_month em
    LEFT JOIN incidencias i ON i.emp = em.numero_empleado
    GROUP BY em.numero_empleado, em.month_start
)
SELECT
    em.numero_empleado AS employee_id,
    em.area,
    em.departamento,
    em.turno,
    em.clasificacion,
    em.tipo_nomina,
    em.empresa,
    em.month_start,
    DATE_PART('day', em.month_start::timestamp - em.fecha_ingreso::timestamp) AS tenure_days,
    DATE_PART('day', em.month_start::timestamp - COALESCE(em.fecha_antiguedad, em.fecha_ingreso)::timestamp) AS antiguedad_days,
    history.neg_prev_28d,
    history.neg_prev_56d,
    history.neg_prev_365d,
    history.permisos_prev_90d,
    history.permisos_prev_365d,
    future.neg_next_30d,
    CASE WHEN future.neg_next_30d >= 2 THEN 1 ELSE 0 END AS target_ausentismo
FROM employee_month em
JOIN history ON history.numero_empleado = em.numero_empleado AND history.month_start = em.month_start
JOIN future ON future.numero_empleado = em.numero_empleado AND future.month_start = em.month_start
WHERE em.month_start >= (SELECT start_month FROM params)
  AND em.month_start < (SELECT end_month FROM params);
"""


class AbsenteeismRiskTrainer(BaseModelTrainer):
    model_id = 'absenteeism_risk'
    model_name = 'Riesgo de ausentismo recurrente'
    model_type = ModelType.CLASSIFICATION
    description = 'Clasificador semanal para detectar empleados propensos a ausentismo recurrente en la siguiente ventana de 30 días.'

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        df = await self.database.fetch_dataframe(ABSENTEEISM_SQL)
        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        if df.empty:
            raise ValueError('No hay suficientes datos de incidencias para entrenar el modelo de ausentismo.')

        numeric_features: List[str] = [
            'tenure_days',
            'antiguedad_days',
            'neg_prev_28d',
            'neg_prev_56d',
            'neg_prev_365d',
            'permisos_prev_90d',
            'permisos_prev_365d',
        ]
        categorical_features: List[str] = [
            'area',
            'departamento',
            'turno',
            'clasificacion',
            'tipo_nomina',
            'empresa',
        ]

        for col in numeric_features:
            if col not in df.columns:
                df[col] = 0
            df[col] = df[col].fillna(0)
        for col in categorical_features:
            if col not in df.columns:
                df[col] = 'UNKNOWN'
            df[col] = df[col].fillna('UNKNOWN')

        df['ratio_neg_56_28'] = df['neg_prev_56d'] / df['neg_prev_28d'].replace(0, np.nan)
        df['ratio_neg_56_28'] = df['ratio_neg_56_28'].replace([np.inf, -np.inf], np.nan).fillna(0)
        df['ratio_permiso'] = df['permisos_prev_90d'] / df['permisos_prev_365d'].replace(0, np.nan)
        df['ratio_permiso'] = df['ratio_permiso'].replace([np.inf, -np.inf], np.nan).fillna(0)

        numeric_features.extend(['ratio_neg_56_28', 'ratio_permiso'])

        X = df[numeric_features + categorical_features]
        y = df['target_ausentismo'].fillna(0).astype(int)

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.25,
            random_state=24,
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

        estimator = RandomForestClassifier(
            n_estimators=400,
            max_depth=8,
            min_samples_split=20,
            class_weight='balanced_subsample',
            random_state=24,
            n_jobs=-1,
        )

        pipeline = Pipeline(
            steps=[
                ('preprocess', preprocessor),
                ('model', estimator),
            ]
        )

        pipeline.fit(X_train, y_train)
        y_proba = pipeline.predict_proba(X_test)[:, 1]
        y_pred = (y_proba >= 0.5).astype(int)

        metrics: Dict[str, Any] = {
            'roc_auc': float(roc_auc_score(y_test, y_proba)),
            'average_precision': float(average_precision_score(y_test, y_proba)),
            'f1': float(f1_score(y_test, y_pred)),
            'positive_rate': float(y.mean()),
            'train_size': int(y_train.shape[0]),
            'test_size': int(y_test.shape[0]),
        }

        feature_importances = self._feature_importances(pipeline, numeric_features, categorical_features)

        artifacts: Dict[str, Any] = {
            'feature_importances': feature_importances,
        }

        return TrainOutput(estimator=pipeline, metrics=metrics, artifacts=artifacts)

    def _feature_importances(
        self,
        pipeline: Pipeline,
        numeric_features: List[str],
        categorical_features: List[str],
    ) -> Dict[str, float]:
        importances = pipeline.named_steps['model'].feature_importances_
        preprocessor: ColumnTransformer = pipeline.named_steps['preprocess']
        feature_names: List[str] = []
        for name, transformer, features in preprocessor.transformers_:
            if name == 'num':
                feature_names.extend(features)
            elif name == 'cat':
                encoder = transformer.named_steps['encoder']
                feature_names.extend(encoder.get_feature_names_out(features))
        return {
            feature: float(importance)
            for feature, importance in zip(feature_names, importances)
        }

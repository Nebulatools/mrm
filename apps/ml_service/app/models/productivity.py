from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import ElasticNet
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

from .base import BaseModelTrainer, TrainOutput
from ..schemas import ModelType
from ..utils.sklearn import build_one_hot_encoder


PRODUCTIVITY_SQL = """
WITH asistencia AS (
    SELECT
        ad.numero_empleado,
        date_trunc('month', ad.fecha)::date AS month_start,
        SUM(ad.horas_incidencia) AS horas_incidencia,
        SUM(ad.horas_trabajadas) AS horas_trabajadas,
        COUNT(*) FILTER (WHERE ad.presente = false OR ad.horas_incidencia > 0) AS dias_con_incidencia
    FROM asistencia_diaria ad
    WHERE ad.fecha >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY ad.numero_empleado, date_trunc('month', ad.fecha)
),
incidencias_resumen AS (
    SELECT
        emp AS numero_empleado,
        date_trunc('month', fecha)::date AS month_start,
        COUNT(*) FILTER (WHERE inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])) AS incidencias_negativas,
        COUNT(*) FILTER (WHERE inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])) AS permisos
    FROM incidencias
    WHERE fecha >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY emp, date_trunc('month', fecha)
)
SELECT
    a.numero_empleado AS employee_id,
    e.area,
    e.departamento,
    e.empresa,
    e.clasificacion,
    e.tipo_nomina,
    e.turno,
    a.month_start,
    a.horas_incidencia,
    a.horas_trabajadas,
    a.dias_con_incidencia,
    COALESCE(i.incidencias_negativas, 0) AS incidencias_negativas,
    COALESCE(i.permisos, 0) AS permisos
FROM asistencia a
JOIN empleados_sftp e ON e.numero_empleado = a.numero_empleado
LEFT JOIN incidencias_resumen i
  ON i.numero_empleado = a.numero_empleado
 AND i.month_start = a.month_start;
"""


class ProductivityImpactTrainer(BaseModelTrainer):
    model_id = 'productivity_impact'
    model_name = 'Impacto en productividad por ausentismo'
    model_type = ModelType.REGRESSION
    description = 'Regresión ElasticNet para estimar impacto monetario del ausentismo a partir de horas y patrones de incidencias.'

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        df = await self.database.fetch_dataframe(PRODUCTIVITY_SQL)
        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        if df.empty:
            raise ValueError(
                'Tabla asistencia_diaria no contiene datos suficientes para estimar el impacto en productividad.'
            )

        default_hour_cost = float(kwargs.get('default_hour_cost', 120.0))

        df['horas_incidencia'] = df['horas_incidencia'].fillna(0)
        df['horas_trabajadas'] = df['horas_trabajadas'].fillna(0)
        df['dias_con_incidencia'] = df['dias_con_incidencia'].fillna(0)
        df['incidencias_negativas'] = df['incidencias_negativas'].fillna(0)
        df['permisos'] = df['permisos'].fillna(0)

        df['impacto_monetario'] = df['horas_incidencia'] * default_hour_cost
        df['intensidad_incidencia'] = df['horas_incidencia'] / df['horas_trabajadas'].replace(0, np.nan)
        df['intensidad_incidencia'] = df['intensidad_incidencia'].replace([np.inf, -np.inf], np.nan).fillna(0)

        numeric_features: List[str] = [
            'horas_incidencia',
            'horas_trabajadas',
            'dias_con_incidencia',
            'incidencias_negativas',
            'permisos',
            'intensidad_incidencia',
        ]
        categorical_features: List[str] = [
            'area',
            'departamento',
            'empresa',
            'clasificacion',
            'tipo_nomina',
            'turno',
        ]

        for col in categorical_features:
            df[col] = df[col].fillna('DESCONOCIDO')

        X = df[numeric_features + categorical_features]
        y = df['impacto_monetario']

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=31,
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

        model = ElasticNet(alpha=0.2, l1_ratio=0.4, random_state=31)
        pipeline = Pipeline(
            steps=[
                ('preprocess', preprocessor),
                ('model', model),
            ]
        )

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        metrics: Dict[str, Any] = {
            'r2': float(r2_score(y_test, y_pred)),
            'mae': float(mean_absolute_error(y_test, y_pred)),
        }

        return TrainOutput(estimator=pipeline, metrics=metrics, artifacts={})

"""
Absenteeism risk prediction — predicts recurrent negative absences.

Reads from Gold layer (ml_employee_features) pre-computed rolling windows.
Evaluates multiple algorithms and selects the best.
"""
from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from .base import BaseModelTrainer, TrainOutput
from .evaluation import (
    evaluate_classifiers,
    extract_feature_importances,
)
from ..schemas import ModelType


# Load historical snapshots from Gold layer
ABSENTEEISM_SQL = """
SELECT
    numero_empleado AS employee_id,
    snapshot_date,
    edad, genero, generacion, antiguedad_dias, es_operativo,
    departamento, area, ubicacion2, turno, empresa, clasificacion,
    faltas_neg_7d, faltas_neg_14d, faltas_neg_28d, faltas_neg_56d, faltas_neg_90d,
    fi_7d, fi_14d, fi_28d, fi_90d,
    salud_28d, salud_90d,
    permisos_28d, permisos_90d,
    vacaciones_90d,
    total_incidencias_28d, total_incidencias_90d,
    tasa_faltas_neg_28d,
    CASE WHEN tendencia_faltas = 'empeorando' THEN 1
         WHEN tendencia_faltas = 'mejorando' THEN -1
         ELSE 0 END AS tendencia_num,
    dias_desde_ultima_falta
FROM ml_employee_features
WHERE snapshot_date < CURRENT_DATE  -- Only historical snapshots
ORDER BY snapshot_date, numero_empleado;
"""

NUMERIC_FEATURES: List[str] = [
    'edad',
    'antiguedad_dias',
    'faltas_neg_7d',
    'faltas_neg_14d',
    'faltas_neg_28d',
    'faltas_neg_56d',
    'faltas_neg_90d',
    'fi_7d',
    'fi_14d',
    'fi_28d',
    'fi_90d',
    'salud_28d',
    'salud_90d',
    'permisos_28d',
    'permisos_90d',
    'vacaciones_90d',
    'total_incidencias_28d',
    'total_incidencias_90d',
    'tasa_faltas_neg_28d',
    'tendencia_num',
    'dias_desde_ultima_falta',
    # Derived ratios
    'ratio_fi_to_neg',
    'ratio_neg_recent_vs_old',
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


class AbsenteeismRiskTrainer(BaseModelTrainer):
    model_id = 'absenteeism_risk'
    model_name = 'Riesgo de ausentismo recurrente'
    model_type = ModelType.CLASSIFICATION
    description = (
        'Clasificador que predice si un empleado tendrá 2+ faltas negativas '
        'en los próximos 30 días. Evalúa múltiples algoritmos.'
    )

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        # REST adapter fetches raw ml_employee_features rows.
        # We derive tendencia_num from tendencia_faltas text and rename employee_id.
        df = await self.database.fetch_dataframe(ABSENTEEISM_SQL)
        if df.empty:
            return df

        # Rename numero_empleado → employee_id if needed by downstream code
        if 'numero_empleado' in df.columns and 'employee_id' not in df.columns:
            df['employee_id'] = df['numero_empleado']

        # Derive tendencia_num from tendencia_faltas text column
        tendencia_map = {'empeorando': 1, 'mejorando': -1}
        if 'tendencia_faltas' in df.columns:
            df['tendencia_num'] = df['tendencia_faltas'].map(tendencia_map).fillna(0).astype(int)
        elif 'tendencia_num' not in df.columns:
            df['tendencia_num'] = 0

        # Filter to historical snapshots only
        if 'snapshot_date' in df.columns:
            df['snapshot_date'] = pd.to_datetime(df['snapshot_date'], errors='coerce')
            df = df[df['snapshot_date'] < pd.Timestamp.now()].copy()

        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        if df.empty:
            raise ValueError('No hay suficientes datos para entrenar el modelo de ausentismo.')

        # Fill missing values
        base_numeric = [f for f in NUMERIC_FEATURES if not f.startswith('ratio_')]
        for col in base_numeric:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            else:
                df[col] = 0

        for col in CATEGORICAL_FEATURES:
            if col in df.columns:
                df[col] = df[col].fillna('UNKNOWN').astype(str)
            else:
                df[col] = 'UNKNOWN'

        # Derive ratio features
        df['ratio_fi_to_neg'] = df['fi_28d'] / df['faltas_neg_28d'].replace(0, np.nan)
        df['ratio_fi_to_neg'] = df['ratio_fi_to_neg'].replace([np.inf, -np.inf], np.nan).fillna(0)

        df['ratio_neg_recent_vs_old'] = df['faltas_neg_28d'] / df['faltas_neg_90d'].replace(0, np.nan)
        df['ratio_neg_recent_vs_old'] = df['ratio_neg_recent_vs_old'].replace([np.inf, -np.inf], np.nan).fillna(0)

        # Build FORWARD-LOOKING target: will this employee have 2+ negative
        # incidents in the NEXT snapshot period?
        # Sort by employee + date, then shift faltas_neg_28d backward so each row
        # gets the NEXT snapshot's value as its target.
        if 'snapshot_date' in df.columns and 'employee_id' in df.columns:
            df = df.sort_values(['employee_id', 'snapshot_date'])
            df['next_faltas_neg_28d'] = df.groupby('employee_id')['faltas_neg_28d'].shift(-1)
            df = df.dropna(subset=['next_faltas_neg_28d'])
            df['target_ausentismo'] = (df['next_faltas_neg_28d'] >= 2).astype(int)
        else:
            # Fallback if no snapshot structure (shouldn't happen with real data)
            df['target_ausentismo'] = (df['faltas_neg_28d'] >= 2).astype(int)

        X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
        y = df['target_ausentismo']

        if y.sum() < 2 or (y == 0).sum() < 2:
            raise ValueError('Not enough samples in both classes to train absenteeism model.')

        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=24, stratify=y,
        )

        # Multi-algorithm evaluation
        eval_result = evaluate_classifiers(
            X_train=X_train,
            y_train=y_train,
            X_test=X_test,
            y_test=y_test,
            numeric_features=NUMERIC_FEATURES,
            categorical_features=CATEGORICAL_FEATURES,
            primary_metric='average_precision',
        )

        # Extract feature importances
        importances = extract_feature_importances(
            eval_result.winner_pipeline,
            NUMERIC_FEATURES,
            CATEGORICAL_FEATURES,
        )

        metrics: Dict[str, Any] = {
            **eval_result.winner_metrics,
            'winner_algorithm': eval_result.winner_name,
            'positive_rate': float(y.mean()),
            'train_size': int(len(y_train)),
            'test_size': int(len(y_test)),
        }

        artifacts: Dict[str, Any] = {
            'feature_importances': importances,
            'algorithm_comparison': eval_result.comparison_summary,
        }

        return TrainOutput(
            estimator=eval_result.winner_pipeline,
            metrics=metrics,
            artifacts=artifacts,
        )

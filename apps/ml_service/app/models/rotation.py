"""
Rotation prediction model — predicts employee attrition at 14d and 28d horizons.

Reads from Gold layer (ml_employee_features) which has pre-computed features
and known outcomes (tuvo_baja_siguiente_14d, tuvo_baja_siguiente_28d).

Evaluates 4 algorithms (XGBoost, LightGBM, RandomForest, LogisticRegression)
and selects the best one automatically.
"""
from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd

from .base import BaseModelTrainer, TrainOutput
from .evaluation import (
    evaluate_classifiers,
    extract_feature_importances,
)
from ..schemas import ModelType


# SQL to load training data from Gold layer
ROTATION_FEATURES_SQL = """
SELECT
    numero_empleado AS employee_id,
    snapshot_date,
    edad, genero, generacion, antiguedad_dias, es_operativo,
    departamento, area, ubicacion2, turno, empresa, clasificacion, puesto,
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
    dias_desde_ultima_falta,
    tuvo_baja_siguiente_14d,
    tuvo_baja_siguiente_28d
FROM ml_employee_features
WHERE tuvo_baja_siguiente_14d IS NOT NULL
ORDER BY snapshot_date, numero_empleado;
"""

PREDICTION_HORIZONS: tuple[int, ...] = (14, 28)

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


class RotationAttritionTrainer(BaseModelTrainer):
    model_id = 'rotation'
    model_name = 'Predicción de rotación individual (14d/28d)'
    model_type = ModelType.CLASSIFICATION
    description = (
        'Predicción de riesgo de baja en próximos 14 y 28 días. '
        'Evalúa 4 algoritmos y selecciona automáticamente el mejor. '
        'Foco en empleados operativos (Sindicalizados).'
    )

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        df = await self.database.fetch_dataframe(ROTATION_FEATURES_SQL)
        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()

        # Fill missing values
        for col in NUMERIC_FEATURES:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            else:
                df[col] = 0

        for col in CATEGORICAL_FEATURES:
            if col in df.columns:
                df[col] = df[col].fillna('UNKNOWN').astype(str)
            else:
                df[col] = 'UNKNOWN'

        # Ensure target columns exist
        for horizon in PREDICTION_HORIZONS:
            target_col = f'tuvo_baja_siguiente_{horizon}d'
            if target_col not in df.columns:
                raise ValueError(f'Missing target column: {target_col}')
            df[target_col] = df[target_col].fillna(False).astype(int)

        X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]

        # Train one model per horizon, evaluating multiple algorithms
        per_horizon_results: Dict[str, Dict[str, Any]] = {}
        per_horizon_pipelines: Dict[int, Any] = {}
        per_horizon_algorithms: Dict[int, str] = {}

        for horizon in PREDICTION_HORIZONS:
            target_col = f'tuvo_baja_siguiente_{horizon}d'
            y = df[target_col]

            positives = int(y.sum())
            if positives < 2:
                raise ValueError(
                    f'Not enough positive samples for {horizon}d horizon '
                    f'(found {positives}, need at least 2).'
                )

            # Temporal split: use last 3 months as test
            if 'snapshot_date' in df.columns:
                dates = pd.to_datetime(df['snapshot_date'])
                cutoff = dates.max() - pd.Timedelta(days=90)
                train_mask = dates <= cutoff
                test_mask = dates > cutoff

                # Ensure test set has both classes
                if y[test_mask].nunique() < 2:
                    # Fall back to random split
                    train_mask = None
            else:
                train_mask = None

            if train_mask is not None:
                X_train, X_test = X[train_mask], X[test_mask]
                y_train, y_test = y[train_mask], y[test_mask]
            else:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42, stratify=y,
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

            per_horizon_pipelines[horizon] = eval_result.winner_pipeline
            per_horizon_algorithms[horizon] = eval_result.winner_name

            # Extract feature importances from winner
            importances = extract_feature_importances(
                eval_result.winner_pipeline,
                NUMERIC_FEATURES,
                CATEGORICAL_FEATURES,
            )
            top_features = sorted(
                importances.items(),
                key=lambda x: x[1],
                reverse=True,
            )[:15]

            per_horizon_results[str(horizon)] = {
                'winner_algorithm': eval_result.winner_name,
                'metrics': eval_result.winner_metrics,
                'comparison': eval_result.comparison_summary,
                'feature_importances': dict(top_features),
                'train_size': int(len(y_train)),
                'test_size': int(len(y_test)),
                'positive_rate_train': float(y_train.mean()),
                'positive_rate_test': float(y_test.mean()),
            }

        # Use 28d horizon as primary for summary metrics
        primary = per_horizon_results['28']
        metrics: Dict[str, Any] = {
            'roc_auc': primary['metrics'].get('roc_auc'),
            'average_precision': primary['metrics'].get('average_precision'),
            'precision': primary['metrics'].get('precision'),
            'recall': primary['metrics'].get('recall'),
            'f1': primary['metrics'].get('f1'),
            'cv_mean': primary['metrics'].get('cv_mean'),
            'cv_std': primary['metrics'].get('cv_std'),
            'winner_algorithm_14d': per_horizon_algorithms[14],
            'winner_algorithm_28d': per_horizon_algorithms[28],
            'per_horizon': per_horizon_results,
        }

        artifacts: Dict[str, Any] = {
            'feature_importances': primary.get('feature_importances', {}),
            'per_horizon': per_horizon_results,
            'algorithms_evaluated': list(per_horizon_results['28']['comparison']),
        }

        # Wrap pipelines in a multi-horizon container
        ensemble = MultiHorizonEnsemble(
            pipelines=per_horizon_pipelines,
            algorithms=per_horizon_algorithms,
        )
        return TrainOutput(estimator=ensemble, metrics=metrics, artifacts=artifacts)


class MultiHorizonEnsemble:
    """Serializable container grouping one pipeline per horizon."""

    def __init__(
        self,
        pipelines: Dict[int, Any],
        algorithms: Dict[int, str],
    ) -> None:
        self._pipelines = dict(pipelines)
        self._algorithms = dict(algorithms)

    @property
    def horizons(self) -> List[int]:
        return sorted(self._pipelines.keys())

    def predict_proba(self, X: pd.DataFrame) -> Dict[int, np.ndarray]:
        probabilities: Dict[int, np.ndarray] = {}
        for horizon, pipeline in self._pipelines.items():
            proba = pipeline.predict_proba(X)
            probabilities[horizon] = proba[:, 1] if proba.ndim == 2 else proba
        return probabilities

    def get_pipeline(self, horizon: int) -> Any:
        if horizon not in self._pipelines:
            raise KeyError(f'No pipeline trained for horizon {horizon}d.')
        return self._pipelines[horizon]

    def get_algorithm(self, horizon: int) -> str:
        return self._algorithms.get(horizon, 'unknown')

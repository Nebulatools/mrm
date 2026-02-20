"""
Prediction generation and logging.

Generates predictions from trained models and writes results
to ml_predictions_log for tracking and accuracy measurement.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .rotation import (
    RotationAttritionTrainer,
    NUMERIC_FEATURES as ROTATION_NUMERIC,
    CATEGORICAL_FEATURES as ROTATION_CATEGORICAL,
    PREDICTION_HORIZONS,
)
from .forecast_absence import AbsenceForecastTrainer, FORECAST_CODES
from .absenteeism import (
    AbsenteeismRiskTrainer,
    NUMERIC_FEATURES as ABSENT_NUMERIC,
    CATEGORICAL_FEATURES as ABSENT_CATEGORICAL,
)
from ..config import Settings
from ..database import Database


async def generate_rotation_predictions(
    trainer: RotationAttritionTrainer,
    database: Database,
    prediction_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """
    Generate attrition predictions for all active operativo employees.

    Loads current features from ml_employee_features, runs the trained
    MultiHorizonEnsemble, and returns per-employee + aggregated predictions.
    """
    prediction_date = prediction_date or date.today()

    # Load trained model
    ensemble = trainer.load_estimator()

    # Load all employee features then filter to latest snapshot + operativo
    features_df = await database.fetch_dataframe(
        'SELECT * FROM ml_employee_features'
    )

    if features_df.empty:
        return []

    # Filter to latest snapshot and operativo (REST doesn't execute WHERE clauses)
    features_df['snapshot_date'] = pd.to_datetime(features_df['snapshot_date'], errors='coerce')
    max_snap = features_df['snapshot_date'].max()
    features_df = features_df[
        (features_df['snapshot_date'] == max_snap)
        & (features_df['es_operativo'] == True)
    ].copy()

    if features_df.empty:
        return []

    # Prepare feature matrix
    for col in ROTATION_NUMERIC:
        if col in features_df.columns:
            features_df[col] = pd.to_numeric(features_df[col], errors='coerce').fillna(0)
        else:
            features_df[col] = 0

    for col in ROTATION_CATEGORICAL:
        if col in features_df.columns:
            features_df[col] = features_df[col].fillna('UNKNOWN').astype(str)
        else:
            features_df[col] = 'UNKNOWN'

    X = features_df[ROTATION_NUMERIC + ROTATION_CATEGORICAL]

    # Get predictions per horizon
    probabilities = ensemble.predict_proba(X)

    rows: List[Dict[str, Any]] = []

    for horizon in PREDICTION_HORIZONS:
        probs = probabilities.get(horizon)
        if probs is None:
            continue

        algorithm = ensemble.get_algorithm(horizon)

        # Per-employee predictions
        for idx, row in features_df.iterrows():
            prob = float(probs[features_df.index.get_loc(idx)])
            risk_level = _classify_risk(prob)

            rows.append({
                'model_name': 'rotation',
                'algorithm_name': algorithm,
                'prediction_date': prediction_date.isoformat(),
                'horizon': horizon,
                'numero_empleado': int(row['numero_empleado']),
                'predicted_probability': round(prob, 4),
                'risk_level': risk_level,
                'segment_type': None,
                'segment_value': None,
                'predicted_count': None,
                'genero': row.get('genero'),
                'generacion': row.get('generacion'),
                'top_features': None,
            })

        # Aggregated predictions by segment
        for segment_type, segment_col in [
            ('area', 'area'),
            ('departamento', 'departamento'),
            ('empresa', 'empresa'),
            ('ubicacion2', 'ubicacion2'),
            ('total', None),
        ]:
            if segment_col is None:
                # Total across all operativos
                predicted_count = float(probs.sum())
                rows.append({
                    'model_name': 'rotation',
                    'algorithm_name': algorithm,
                    'prediction_date': prediction_date.isoformat(),
                    'horizon': horizon,
                    'numero_empleado': None,
                    'predicted_probability': None,
                    'risk_level': None,
                    'segment_type': 'total',
                    'segment_value': 'operativos',
                    'predicted_count': round(predicted_count, 1),
                    'genero': None,
                    'generacion': None,
                    'top_features': None,
                })
            else:
                if segment_col not in features_df.columns:
                    continue
                for value, group_idx in features_df.groupby(segment_col).groups.items():
                    mask = features_df.index.isin(group_idx)
                    predicted_count = float(probs[np.where(mask)].sum())
                    if predicted_count < 0.1:
                        continue
                    rows.append({
                        'model_name': 'rotation',
                        'algorithm_name': algorithm,
                        'prediction_date': prediction_date.isoformat(),
                        'horizon': horizon,
                        'numero_empleado': None,
                        'predicted_probability': None,
                        'risk_level': None,
                        'segment_type': segment_type,
                        'segment_value': str(value),
                        'predicted_count': round(predicted_count, 1),
                        'genero': None,
                        'generacion': None,
                        'top_features': None,
                    })

        # Aggregated by genero
        if 'genero' in features_df.columns:
            for genero, group_idx in features_df.groupby('genero').groups.items():
                mask = features_df.index.isin(group_idx)
                predicted_count = float(probs[np.where(mask)].sum())
                rows.append({
                    'model_name': 'rotation',
                    'algorithm_name': algorithm,
                    'prediction_date': prediction_date.isoformat(),
                    'horizon': horizon,
                    'numero_empleado': None,
                    'predicted_probability': None,
                    'risk_level': None,
                    'segment_type': 'genero',
                    'segment_value': str(genero),
                    'predicted_count': round(predicted_count, 1),
                    'genero': str(genero),
                    'generacion': None,
                    'top_features': None,
                })

        # Aggregated by generacion
        if 'generacion' in features_df.columns:
            for gen, group_idx in features_df.groupby('generacion').groups.items():
                mask = features_df.index.isin(group_idx)
                predicted_count = float(probs[np.where(mask)].sum())
                rows.append({
                    'model_name': 'rotation',
                    'algorithm_name': algorithm,
                    'prediction_date': prediction_date.isoformat(),
                    'horizon': horizon,
                    'numero_empleado': None,
                    'predicted_probability': None,
                    'risk_level': None,
                    'segment_type': 'generacion',
                    'segment_value': str(gen),
                    'predicted_count': round(predicted_count, 1),
                    'genero': None,
                    'generacion': str(gen),
                    'top_features': None,
                })

    return rows


async def generate_forecast_predictions(
    trainer: AbsenceForecastTrainer,
    database: Database,
    prediction_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """
    Generate absence forecast predictions from trained SARIMAX models.
    """
    prediction_date = prediction_date or date.today()

    summary = trainer.latest_summary()
    if not summary:
        return []

    artifacts = summary.get('artifacts', {})
    forecasts_by_code = artifacts.get('forecasts_by_code', {})
    metrics = summary.get('metrics', {})

    rows: List[Dict[str, Any]] = []
    for code, forecasts in forecasts_by_code.items():
        for forecast in forecasts:
            horizon = forecast['horizon_days']
            rows.append({
                'model_name': 'absence_forecast',
                'algorithm_name': 'sarimax',
                'prediction_date': prediction_date.isoformat(),
                'horizon': horizon,
                'numero_empleado': None,
                'predicted_probability': None,
                'risk_level': None,
                'segment_type': 'codigo_incidencia',
                'segment_value': code,
                'predicted_count': forecast['predicted_total'],
                'genero': None,
                'generacion': None,
                'top_features': None,
            })

    return rows


async def generate_absenteeism_predictions(
    trainer: AbsenteeismRiskTrainer,
    database: Database,
    prediction_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """
    Generate absenteeism risk predictions for all active operativo employees.

    Loads current features from ml_employee_features (latest snapshot),
    runs the trained classifier, and returns per-employee risk predictions.
    """
    prediction_date = prediction_date or date.today()

    # Load trained pipeline
    pipeline = trainer.load_estimator()

    # Load all employee features then filter to latest snapshot + operativo
    features_df = await database.fetch_dataframe(
        'SELECT * FROM ml_employee_features'
    )

    if features_df.empty:
        return []

    # Filter to latest snapshot and operativo (REST doesn't execute WHERE clauses)
    features_df['snapshot_date'] = pd.to_datetime(features_df['snapshot_date'], errors='coerce')
    max_snap = features_df['snapshot_date'].max()
    features_df = features_df[
        (features_df['snapshot_date'] == max_snap)
        & (features_df['es_operativo'] == True)
    ].copy()

    if features_df.empty:
        return []

    # Derive tendencia_num from tendencia_faltas
    tendencia_map = {'empeorando': 1, 'mejorando': -1}
    if 'tendencia_faltas' in features_df.columns:
        features_df['tendencia_num'] = features_df['tendencia_faltas'].map(tendencia_map).fillna(0).astype(int)
    elif 'tendencia_num' not in features_df.columns:
        features_df['tendencia_num'] = 0

    # Prepare features
    for col in ABSENT_NUMERIC:
        if col in features_df.columns:
            features_df[col] = pd.to_numeric(features_df[col], errors='coerce').fillna(0)
        else:
            features_df[col] = 0

    for col in ABSENT_CATEGORICAL:
        if col in features_df.columns:
            features_df[col] = features_df[col].fillna('UNKNOWN').astype(str)
        else:
            features_df[col] = 'UNKNOWN'

    # Derive ratio features
    features_df['ratio_fi_to_neg'] = features_df['fi_28d'] / features_df['faltas_neg_28d'].replace(0, np.nan)
    features_df['ratio_fi_to_neg'] = features_df['ratio_fi_to_neg'].replace([np.inf, -np.inf], np.nan).fillna(0)
    features_df['ratio_neg_recent_vs_old'] = features_df['faltas_neg_28d'] / features_df['faltas_neg_90d'].replace(0, np.nan)
    features_df['ratio_neg_recent_vs_old'] = features_df['ratio_neg_recent_vs_old'].replace([np.inf, -np.inf], np.nan).fillna(0)

    X = features_df[ABSENT_NUMERIC + ABSENT_CATEGORICAL]

    # Get predictions
    try:
        probs = pipeline.predict_proba(X)[:, 1]
    except Exception:
        return []

    rows: List[Dict[str, Any]] = []

    # Per-employee predictions
    for idx, row in features_df.iterrows():
        prob = float(probs[features_df.index.get_loc(idx)])
        risk_level = _classify_risk(prob)

        rows.append({
            'model_name': 'absenteeism_risk',
            'algorithm_name': 'auto_selected',
            'prediction_date': prediction_date.isoformat(),
            'horizon': 28,
            'numero_empleado': int(row['numero_empleado']),
            'predicted_probability': round(prob, 4),
            'risk_level': risk_level,
            'segment_type': None,
            'segment_value': None,
            'predicted_count': None,
            'genero': row.get('genero'),
            'generacion': row.get('generacion'),
            'top_features': None,
        })

    # Aggregated total
    predicted_count = float(probs.sum())
    rows.append({
        'model_name': 'absenteeism_risk',
        'algorithm_name': 'auto_selected',
        'prediction_date': prediction_date.isoformat(),
        'horizon': 28,
        'numero_empleado': None,
        'predicted_probability': None,
        'risk_level': None,
        'segment_type': 'total',
        'segment_value': 'operativos',
        'predicted_count': round(predicted_count, 1),
        'genero': None,
        'generacion': None,
        'top_features': None,
    })

    return rows


def _classify_risk(probability: float) -> str:
    """Classify risk level based on predicted probability."""
    if probability >= 0.7:
        return 'ALTO'
    elif probability >= 0.4:
        return 'MEDIO'
    elif probability >= 0.15:
        return 'BAJO'
    return 'MINIMO'

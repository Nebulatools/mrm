from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dateutil.relativedelta import relativedelta

from .config import get_settings
from .database_rest import DatabaseREST
from .models.registry import (
    MODEL_REGISTRY,
    build_model_info,
    create_trainer,
    get_model_config,
    list_model_configs,
)
from .models.rotation import (
    ROTATION_FEATURES_SQL,
    RotationAttritionTrainer,
    NUMERIC_FEATURES as ROTATION_NUMERIC,
    CATEGORICAL_FEATURES as ROTATION_CATEGORICAL,
    PREDICTION_HORIZONS,
)
from .scheduling.scheduler import ModelScheduler
from .utils.schedules import schedule_to_cron
from .models.predictions import (
    generate_rotation_predictions,
    generate_forecast_predictions,
    generate_absenteeism_predictions,
)
from .models.forecast_absence import AbsenceForecastTrainer
from .models.absenteeism import AbsenteeismRiskTrainer
from .schemas import (
    ModelInfo,
    ModelSchedule,
    ScheduleConfig,
    ScheduleFrequency,
    TrainingRequest,
    TrainingResponse,
)

settings = get_settings()

# Use REST API instead of direct PostgreSQL connection
database = DatabaseREST(
    dsn=settings.database_url,
    supabase_url=settings.supabase_project_url or '',
    service_role_key=settings.supabase_service_key or '',
)

scheduler = ModelScheduler(settings, database)

app = FastAPI(
    title='MRM Analytics ML Service',
    description='Orquestador de modelos de analítica avanzada para Recursos Humanos.',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
async def startup_event() -> None:
    scheduler.register_default_jobs()
    scheduler.start()


@app.on_event('shutdown')
async def shutdown_event() -> None:
    await database.close()
    scheduler.shutdown()


@app.get('/health')
async def healthcheck() -> Dict[str, str]:
    return {'status': 'ok'}
@app.get('/models', response_model=List[ModelInfo])
async def list_models() -> List[ModelInfo]:
    infos: List[ModelInfo] = []
    for config in list_model_configs():
        trainer = create_trainer(config.id, settings, database)
        info = build_model_info(config.id, trainer)
        # Override schedule with runtime state
        state = scheduler.get_state().get(config.id)
        cron = state['cron'] if state else config.default_cron
        next_run = pd.to_datetime(state['next_run']).to_pydatetime() if state and state.get('next_run') else None
        schedule = info.schedule or ModelSchedule(frequency=config.default_frequency)
        schedule.cron_expression = cron
        schedule.next_run = next_run
        info.schedule = schedule
        infos.append(info)
    return infos


@app.get('/models/{model_id}', response_model=ModelInfo)
async def get_model(model_id: str) -> ModelInfo:
    if model_id not in MODEL_REGISTRY:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Modelo no encontrado')
    trainer = create_trainer(model_id, settings, database)
    info = build_model_info(model_id, trainer)
    state = scheduler.get_state().get(model_id)
    cron = state['cron'] if state else MODEL_REGISTRY[model_id].default_cron
    next_run = pd.to_datetime(state['next_run']).to_pydatetime() if state and state.get('next_run') else None
    schedule = info.schedule or ModelSchedule(frequency=MODEL_REGISTRY[model_id].default_frequency)
    schedule.cron_expression = cron
    schedule.next_run = next_run
    info.schedule = schedule
    return info


@app.post('/models/{model_id}/train', response_model=TrainingResponse)
async def train_model(model_id: str, request: TrainingRequest | None = None) -> TrainingResponse:
    if model_id not in MODEL_REGISTRY:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Modelo no encontrado')
    trainer = create_trainer(model_id, settings, database)
    request = request or TrainingRequest()
    try:
        result = await trainer.train(**request.hyperparameters)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    info = build_model_info(model_id, trainer)
    state = scheduler.get_state().get(model_id)
    cron = state['cron'] if state else MODEL_REGISTRY[model_id].default_cron
    next_run = pd.to_datetime(state['next_run']).to_pydatetime() if state and state.get('next_run') else None
    schedule = info.schedule or ModelSchedule(frequency=MODEL_REGISTRY[model_id].default_frequency)
    schedule.cron_expression = cron
    schedule.next_run = next_run
    info.schedule = schedule

    return TrainingResponse(
        model=info,
        trained_at=result['trained_at'],
        metrics=result['metrics'],
        artifacts=result['artifacts'],
    )


@app.post('/models/{model_id}/schedule')
async def schedule_model(model_id: str, payload: ScheduleConfig) -> Dict[str, Any]:
    if model_id not in MODEL_REGISTRY:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Modelo no encontrado')
    cron = schedule_to_cron(payload)
    if cron:
        scheduler.schedule_model(model_id, cron)
    else:
        scheduler.remove_schedule(model_id)
    return {'success': True, 'cron': cron, 'state': scheduler.get_state().get(model_id)}


@app.get('/models/{model_id}/analysis')
async def get_model_analysis(model_id: str) -> Dict[str, Any]:
    """
    Get detailed analysis and evaluation metrics for a trained model.

    Returns:
        - Full metrics (ROC-AUC, Precision, Recall, F1, etc.)
        - Confusion matrix
        - ROC curve data
        - Precision-Recall curve data
        - Feature importances
        - Cross-validation scores
        - Recommendations
    """
    if model_id not in MODEL_REGISTRY:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Modelo no encontrado')

    trainer = create_trainer(model_id, settings, database)

    # Load trained model and metrics
    try:
        # Try different possible paths
        model_path = settings.models_dir / model_id / 'v1.joblib'
        metrics_path = settings.metrics_dir / model_id / 'latest.json'

        if not metrics_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Modelo no ha sido entrenado aún. Entrena el modelo primero.'
            )

        # Load metrics
        import json
        with open(metrics_path, 'r') as f:
            saved_data = json.load(f)

        metrics = saved_data.get('metrics', {})
        artifacts = saved_data.get('artifacts', {})

        # Build comprehensive analysis response
        analysis = {
            'model_id': model_id,
            'model_name': MODEL_REGISTRY[model_id].name,
            'last_trained_at': saved_data.get('trained_at'),

            # Main metrics
            'metrics': {
                'roc_auc': metrics.get('roc_auc', 0),
                'precision': metrics.get('precision', 0),
                'recall': metrics.get('recall', 0),
                'f1_score': metrics.get('f1', 0),
                'average_precision': metrics.get('average_precision', 0),
                'specificity': metrics.get('specificity', 0),
            },

            # Cross-validation
            'cross_validation': {
                'cv_mean': metrics.get('cv_mean', 0),
                'cv_std': metrics.get('cv_std', 0),
                'cv_scores': artifacts.get('cv_scores', []),
            },

            # Confusion matrix
            'confusion_matrix': artifacts.get('confusion_matrix', {}),

            # Curves for visualization
            'roc_curve': artifacts.get('roc_curve', {}),
            'precision_recall_curve': artifacts.get('precision_recall_curve', {}),

            # Feature importance (top 10)
            'feature_importances': sorted(
                [{'feature': k, 'importance': v} for k, v in artifacts.get('feature_importances', {}).items()],
                key=lambda x: x['importance'],
                reverse=True
            )[:10],

            # Dataset info
            'dataset': {
                'total_samples': metrics.get('total_samples', 0),
                'train_size': metrics.get('train_size', 0),
                'test_size': metrics.get('test_size', 0),
                'positive_rate': metrics.get('positive_rate', 0),
            },

            # Recommendations and warnings
            'recommendations': _generate_recommendations(metrics, artifacts),

            # Business value analysis
            'business_value': artifacts.get('business_value', {}),

            # Raw artifacts (SHAP, classification report, etc.)
            'artifacts': artifacts,
        }

        return analysis

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Modelo no entrenado. Ejecuta el entrenamiento primero.'
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error al cargar análisis: {str(e)}'
        )


def _generate_recommendations(metrics: Dict[str, Any], artifacts: Dict[str, Any]) -> List[Dict[str, str]]:
    """Generate actionable recommendations based on model metrics."""
    recommendations = []

    roc_auc = metrics.get('roc_auc', 0)
    cv_mean = metrics.get('cv_mean', 0)
    cv_std = metrics.get('cv_std', 0)
    precision = metrics.get('precision', 0)
    recall = metrics.get('recall', 0)

    # Check for overfitting
    if roc_auc > 0.95 and cv_mean < 0.85:
        recommendations.append({
            'type': 'warning',
            'title': 'Posible Overfitting',
            'message': f'ROC-AUC en test ({roc_auc:.2%}) es muy alto pero CV promedio ({cv_mean:.2%}) es menor. El modelo puede estar memorizando.',
            'action': 'Considera aumentar regularización o agregar más datos de entrenamiento.'
        })

    # Check for high variance
    if cv_std > 0.1:
        recommendations.append({
            'type': 'warning',
            'title': 'Alta Varianza en CV',
            'message': f'La desviación estándar en CV ({cv_std:.2%}) es alta.',
            'action': 'El modelo es inestable. Aumenta el tamaño del dataset o simplifica el modelo.'
        })

    # Check precision-recall trade-off
    if precision < 0.6:
        recommendations.append({
            'type': 'info',
            'title': 'Precisión Baja',
            'message': f'Precisión actual: {precision:.2%}. Muchos falsos positivos.',
            'action': 'Ajusta el threshold de decisión o balancea el dataset.'
        })

    if recall < 0.6:
        recommendations.append({
            'type': 'info',
            'title': 'Recall Bajo',
            'message': f'Recall actual: {recall:.2%}. Se están perdiendo casos positivos.',
            'action': 'Considera agregar más features o balancear las clases.'
        })

    # Good performance
    if 0.75 <= roc_auc <= 0.90 and cv_std < 0.05:
        recommendations.append({
            'type': 'success',
            'title': 'Rendimiento Aceptable',
            'message': f'El modelo tiene buen balance: ROC-AUC {roc_auc:.2%}, CV estable.',
            'action': 'Continúa monitoreando el rendimiento en producción.'
        })

    return recommendations


HORIZONS = [14, 28]


def _normalize_clasificacion(value: Any) -> str:
    if value is None:
        return 'Desconocido'
    text = str(value).strip()
    if not text or text.lower() in {'nan', 'none'}:
        return 'Desconocido'
    upper = text.upper()
    if 'SIND' in upper:
        return 'Sindicalizados'
    if 'CONF' in upper:
        return 'Confianza'
    return text.title()


@app.get('/models/{model_id}/trends')
async def get_model_trends(model_id: str) -> Dict[str, Any]:
    if model_id not in MODEL_REGISTRY:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Modelo no encontrado')

    trainer = create_trainer(model_id, settings, database)

    try:
        if model_id == 'rotation':
            if not isinstance(trainer, RotationAttritionTrainer):
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Configuración de modelo inválida')
            return await _build_rotation_trends_response(trainer)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='Modelo sin soporte de tendencias en este momento.'
    )


async def _prepare_rotation_prediction_frame(
    rotation_trainer: RotationAttritionTrainer,
) -> tuple[
    pd.DataFrame,
    Dict[str, Any],
    pd.Series,
    Dict[str, pd.Series],
    Optional[pd.Timestamp],
]:
    """Load training data, run predictions with the MultiHorizonEnsemble, and build actuals."""
    summary = rotation_trainer.latest_summary()
    current_year = datetime.now().year
    start_of_year = pd.Timestamp(year=current_year, month=1, day=1)

    try:
        estimator = rotation_trainer.load_estimator()
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            'Modelo de rotación no entrenado. Entrena el modelo antes de consultar tendencias.'
        ) from exc

    frame = await rotation_trainer.load_training_frame()
    if frame.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Dataset de rotación está vacío; no se pueden generar tendencias.'
        )

    frame = frame.copy()

    if 'employee_id' in frame.columns:
        frame['employee_id'] = pd.to_numeric(frame['employee_id'], errors='coerce')

    # Normalize clasificacion for segmentation
    if 'clasificacion' in frame.columns:
        frame['clasificacion_segment'] = frame['clasificacion'].apply(_normalize_clasificacion)
    else:
        frame['clasificacion_segment'] = 'Desconocido'

    frame['snapshot_date'] = pd.to_datetime(frame['snapshot_date'])

    # Build actual bajas series from motivos_baja
    motivos_df = await rotation_trainer.database.fetch_dataframe(
        'SELECT numero_empleado, fecha_baja FROM motivos_baja'
    )
    actual_series = pd.Series(dtype=float)
    segment_actual_series: Dict[str, pd.Series] = {}
    latest_baja_month: Optional[pd.Timestamp] = None

    if not motivos_df.empty:
        motivos_df = motivos_df.copy()
        motivos_df['fecha_baja'] = pd.to_datetime(motivos_df['fecha_baja'], errors='coerce')
        motivos_df = motivos_df[motivos_df['fecha_baja'].notna()]
        if not motivos_df.empty:
            filtered = motivos_df[motivos_df['fecha_baja'] >= start_of_year]
            if not filtered.empty:
                filtered = filtered.assign(
                    month=filtered['fecha_baja'].dt.to_period('M').dt.to_timestamp()
                )
                latest_baja_month = filtered['month'].max()

                actual_series = (
                    filtered.groupby('month').size().astype(float).sort_index()
                )

                if latest_baja_month is not None and not actual_series.empty:
                    full_index = pd.date_range(
                        start=actual_series.index.min(),
                        end=latest_baja_month,
                        freq='MS',
                    )
                    actual_series = actual_series.reindex(full_index, fill_value=0.0).sort_index()

    # Prepare features and run predictions
    for col in ROTATION_NUMERIC:
        if col in frame.columns:
            frame[col] = pd.to_numeric(frame[col], errors='coerce').fillna(0)
        else:
            frame[col] = 0

    for col in ROTATION_CATEGORICAL:
        if col in frame.columns:
            frame[col] = frame[col].fillna('UNKNOWN').astype(str)
        else:
            frame[col] = 'UNKNOWN'

    X = frame[ROTATION_NUMERIC + ROTATION_CATEGORICAL]

    # Get predictions from MultiHorizonEnsemble
    raw_predictions = estimator.predict_proba(X)
    if isinstance(raw_predictions, dict):
        probabilities_map = {
            int(horizon): np.asarray(values, dtype=float)
            for horizon, values in raw_predictions.items()
        }
    else:
        probabilities_map = {
            28: np.asarray(
                raw_predictions[:, 1] if raw_predictions.ndim == 2 else raw_predictions,
                dtype=float,
            )
        }

    for horizon in PREDICTION_HORIZONS:
        column_name = f'prediction_{horizon}d'
        probs = probabilities_map.get(horizon)
        if probs is not None:
            frame[column_name] = np.asarray(probs, dtype=float)
        else:
            frame[column_name] = 0.0

    frame['snapshot_month'] = frame['snapshot_date'].dt.to_period('M').dt.to_timestamp()

    return frame, summary, actual_series, segment_actual_series, latest_baja_month


def _build_monthly_payload(
    frame: pd.DataFrame,
    actual_series: pd.Series,
    margin: float,
    latest_observed_month: Optional[pd.Timestamp] = None,
) -> Dict[str, Any]:
    """Build monthly actual + predicted payload for the trends endpoint."""
    monthly: List[Dict[str, Any]] = []

    for month, count in actual_series.items():
        monthly.append({
            'month': month.strftime('%Y-%m-%d'),
            'actual': {str(h): float(count) for h in HORIZONS},
            'predicted': {},
            'predicted_lower': {},
            'predicted_upper': {},
        })

    monthly.sort(key=lambda item: item['month'])

    predicted_totals = {str(h): 0.0 for h in HORIZONS}
    forecast_entries: List[Dict[str, Any]] = []

    latest_snapshot_month = frame['snapshot_month'].max() if not frame.empty else None

    observed_month = latest_observed_month
    if observed_month is None and not actual_series.empty:
        observed_month = actual_series.index.max()

    prediction_cols = {f'prediction_{h}d' for h in HORIZONS}
    if not frame.empty and prediction_cols.issubset(frame.columns):
        latest_snapshot_month = frame['snapshot_month'].max()
        latest_snapshot_df = frame[frame['snapshot_month'] == latest_snapshot_month]

        for h in HORIZONS:
            predicted_totals[str(h)] = float(latest_snapshot_df[f'prediction_{h}d'].sum())

        # Generate forecast months
        base_candidates = [m for m in [observed_month, latest_snapshot_month] if m is not None]
        if base_candidates:
            base_month_local = max(base_candidates)
            forecast_start = base_month_local + relativedelta(months=1)

            for index in range(2):  # 2 forecast months for 14d/28d
                forecast_month = forecast_start + relativedelta(months=index)

                if observed_month is not None and forecast_month <= observed_month:
                    continue

                predicted_values = {}
                for h in HORIZONS:
                    pred_total = predicted_totals[str(h)]
                    # Distribute prediction across forecast months
                    predicted_values[str(h)] = pred_total if index == 0 else 0.0

                if all(v == 0 for v in predicted_values.values()):
                    continue

                forecast_entries.append({
                    'month': forecast_month.strftime('%Y-%m-%d'),
                    'actual': {str(h): None for h in HORIZONS},
                    'predicted': predicted_values,
                    'predicted_lower': {
                        str(h): predicted_values[str(h)] * (1 - margin) for h in HORIZONS
                    },
                    'predicted_upper': {
                        str(h): predicted_values[str(h)] * (1 + margin) for h in HORIZONS
                    },
                })

    if forecast_entries:
        combined = monthly + forecast_entries
        monthly_map: Dict[str, Dict[str, Any]] = {}
        for entry in combined:
            key = entry['month']
            existing = monthly_map.get(key)
            if existing is None:
                monthly_map[key] = entry
            else:
                # Prefer entries with actual data
                has_actual_existing = any(v is not None for v in existing.get('actual', {}).values())
                has_actual_entry = any(v is not None for v in entry.get('actual', {}).values())
                if has_actual_entry and not has_actual_existing:
                    monthly_map[key] = entry
        monthly = sorted(monthly_map.values(), key=lambda item: item['month'])

    actual_total = float(actual_series.sum()) if not actual_series.empty else 0.0

    base_month_candidates = [m for m in [observed_month, latest_snapshot_month] if m is not None]
    base_month = max(base_month_candidates) if base_month_candidates else None

    return {
        'monthly': monthly,
        'predicted_totals': predicted_totals,
        'actual_totals': {str(h): actual_total for h in HORIZONS},
        'months_available': int(len(monthly)),
        'records': int(len(frame)),
        'base_month': base_month.isoformat() if base_month else None,
    }


async def _build_rotation_trends_response(
    trainer: RotationAttritionTrainer,
    margin: float = 0.15,
) -> Dict[str, Any]:
    frame, summary, actual_series, segment_actual_series, latest_actual_month = (
        await _prepare_rotation_prediction_frame(trainer)
    )

    overall_payload = _build_monthly_payload(frame, actual_series, margin, latest_actual_month)

    segmented_payload: Dict[str, Dict[str, Any]] = {}
    for segment in sorted(frame['clasificacion_segment'].dropna().unique()):
        segment_frame = frame[frame['clasificacion_segment'] == segment]
        segment_actual = segment_actual_series.get(segment, pd.Series(dtype=float))
        segmented_payload[segment] = _build_monthly_payload(
            segment_frame, segment_actual, margin, latest_actual_month,
        )

    metrics_summary = summary.get('metrics', {}) if summary else {}
    last_trained = summary.get('trained_at') if summary else None

    metadata = {
        'last_trained_at': last_trained,
        'actual_totals': overall_payload['actual_totals'],
        'predicted_totals': overall_payload['predicted_totals'],
        'records': int(len(frame)),
        'months_available': overall_payload['months_available'],
        'base_month': overall_payload.get('base_month'),
        'actual_total_ytd': float(actual_series.sum()) if not actual_series.empty else 0.0,
        'per_horizon_metrics': metrics_summary.get('per_horizon', {}),
        'metrics': metrics_summary,
        'segments': {
            seg: {
                'actual_totals': pay['actual_totals'],
                'predicted_totals': pay['predicted_totals'],
                'records': pay['records'],
                'months_available': pay['months_available'],
                'base_month': pay.get('base_month'),
            }
            for seg, pay in segmented_payload.items()
        },
    }

    return {
        'model_id': trainer.model_id,
        'model_name': trainer.model_name,
        'last_trained_at': last_trained,
        'horizons': HORIZONS,
        'margin': margin,
        'monthly': overall_payload['monthly'],
        'metadata': metadata,
        'segmented': {
            segment: {
                'horizons': HORIZONS,
                'margin': margin,
                'monthly': payload['monthly'],
                'metadata': {
                    'actual_totals': payload['actual_totals'],
                    'predicted_totals': payload['predicted_totals'],
                    'records': payload['records'],
                    'months_available': payload['months_available'],
                },
            }
            for segment, payload in segmented_payload.items()
        },
    }


@app.post('/models/{model_id}/predict')
async def predict_model(model_id: str) -> Dict[str, Any]:
    """Generate predictions for a model and save to ml_predictions_log."""
    if model_id not in MODEL_REGISTRY:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Modelo no encontrado')

    trainer = create_trainer(model_id, settings, database)

    try:
        rows: List[Dict[str, Any]] = []
        if model_id == 'rotation' and isinstance(trainer, RotationAttritionTrainer):
            rows = await generate_rotation_predictions(trainer, database)
        elif model_id == 'absence_forecast' and isinstance(trainer, AbsenceForecastTrainer):
            rows = await generate_forecast_predictions(trainer, database)
        elif model_id == 'absenteeism_risk' and isinstance(trainer, AbsenteeismRiskTrainer):
            rows = await generate_absenteeism_predictions(trainer, database)
        elif model_id == 'attrition_causes':
            # Attrition causes is an analysis model — no per-employee predictions
            return {'success': True, 'predictions_count': 0, 'message': 'Modelo de análisis: consulta /models/attrition_causes/analysis para ver resultados SHAP'}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Modelo {model_id} no soporta predicciones directas',
            )

        if not rows:
            return {'success': True, 'predictions_count': 0, 'message': 'No se generaron predicciones (modelo no entrenado o sin datos)'}

        # Delete old predictions for this model+date to avoid duplicates
        prediction_date = rows[0].get('prediction_date')
        if prediction_date:
            client = await database.connect()
            await client.delete(
                '/ml_predictions_log',
                params={
                    'model_name': f'eq.{model_id}',
                    'prediction_date': f'eq.{prediction_date}',
                },
            )

        count = await database.insert_rows('ml_predictions_log', rows)
        return {
            'success': True,
            'predictions_count': count,
            'model_id': model_id,
            'sample': rows[:3] if rows else [],
        }
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Modelo no entrenado. Ejecuta el entrenamiento primero.',
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@app.get('/predictions')
async def get_predictions(
    model_name: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 500,
) -> Dict[str, Any]:
    """Read predictions from ml_predictions_log."""
    try:
        client = await database.connect()

        params: Dict[str, Any] = {
            'select': '*',
            'order': 'prediction_date.desc,predicted_probability.desc',
            'limit': str(min(limit, 2000)),
        }

        if model_name:
            params['model_name'] = f'eq.{model_name}'
        if risk_level:
            params['risk_level'] = f'eq.{risk_level}'

        resp = await client.get('/ml_predictions_log', params=params)
        resp.raise_for_status()
        rows = resp.json()

        return {
            'success': True,
            'count': len(rows),
            'predictions': rows,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

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
from .models.rotation import ROTATION_FEATURES_SQL, RotationAttritionTrainer
from .models.segment_risk import SegmentRiskTrainer
from .scheduling.scheduler import ModelScheduler
from .utils.schedules import schedule_to_cron
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


HORIZONS = [30, 60, 90]


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
        if model_id == 'segment_risk':
            if not isinstance(trainer, SegmentRiskTrainer):
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Configuración de modelo inválida')
            return await _build_segment_risk_trends_response(trainer)
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
]:
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

    lookup_df = await rotation_trainer.database.fetch_dataframe(
        'SELECT numero_empleado AS employee_id, clasificacion FROM empleados_sftp'
    )
    employee_classification_map: pd.Series | None = None
    normalized_classification_lookup: Dict[int, str] | None = None
    if not lookup_df.empty:
        if 'employee_id' not in lookup_df.columns and 'numero_empleado' in lookup_df.columns:
            lookup_df = lookup_df.rename(columns={'numero_empleado': 'employee_id'})
        lookup_df['employee_id'] = pd.to_numeric(lookup_df['employee_id'], errors='coerce')
        employee_classification_map = (
            lookup_df
            .dropna(subset=['employee_id', 'clasificacion'])
            .set_index('employee_id')['clasificacion']
        )
        if not employee_classification_map.empty:
            employee_classification_map.index = employee_classification_map.index.astype(int)
        normalized_classification_lookup = {
            int(emp_id): _normalize_clasificacion(str(value))
            for emp_id, value in employee_classification_map.dropna().items()
            if pd.notna(emp_id)
        }

    if 'employee_id' in frame.columns:
        frame['employee_id'] = pd.to_numeric(frame['employee_id'], errors='coerce')

    if 'clasificacion' in frame.columns and employee_classification_map is not None:
        needs_lookup = frame['clasificacion'].isna() | (
            frame['clasificacion'].astype(str).str.strip().str.lower().isin({'', 'nan', 'none'})
        )
        if needs_lookup.any():
            frame.loc[needs_lookup, 'clasificacion'] = (
                frame.loc[needs_lookup, 'employee_id'].map(employee_classification_map)
            )
        frame['clasificacion'] = frame['clasificacion'].where(
            frame['clasificacion'].astype(str).str.strip().str.upper().isin({'CONFIANZA', 'SINDICALIZADOS'}),
            None,
        )

    frame['snapshot_date'] = pd.to_datetime(frame['snapshot_date'])
    if normalized_classification_lookup:
        def _resolve_segment(emp_id: Any) -> str:
            if pd.isna(emp_id):
                return 'Desconocido'
            try:
                key = int(emp_id)
            except (ValueError, TypeError):
                return 'Desconocido'
            return normalized_classification_lookup.get(key, 'Desconocido')

        frame['clasificacion_segment'] = frame['employee_id'].apply(_resolve_segment)
    else:
        frame['clasificacion_segment'] = (
            frame.get('clasificacion')
            .astype(str)
            .fillna('DESCONOCIDO')
            .replace({'nan': 'DESCONOCIDO', 'None': 'DESCONOCIDO'})
            .apply(_normalize_clasificacion)
        )

    motivos_df = await rotation_trainer.database.fetch_dataframe('SELECT numero_empleado, fecha_baja FROM motivos_baja')
    actual_series = pd.Series(dtype=float)
    segment_actual_series: Dict[str, pd.Series] = {}
    if not motivos_df.empty:
        motivos_df = motivos_df.copy()
        motivos_df['fecha_baja'] = pd.to_datetime(motivos_df['fecha_baja'], errors='coerce')
        motivos_df = motivos_df[motivos_df['fecha_baja'].notna()]
        if not motivos_df.empty:
            filtered = motivos_df[motivos_df['fecha_baja'] >= start_of_year]
            if not filtered.empty:
                filtered = filtered.assign(
                    month=filtered['fecha_baja']
                    .dt.to_period('M')
                    .dt.to_timestamp()
                )

                # Map clasificación por empleado usando el snapshot más reciente disponible
                classification_map = (
                    frame.sort_values('snapshot_date')
                    .groupby('employee_id')['clasificacion_segment']
                    .agg(lambda series: next((value for value in series[::-1] if value and value != 'DESCONOCIDO'), 'DESCONOCIDO'))
                )

                if normalized_classification_lookup:
                    missing_mask = classification_map.isin({'DESCONOCIDO', 'Desconocido', None})
                    if missing_mask.any():
                        replacement_values: List[str] = []
                        for emp_id in classification_map.index[missing_mask]:
                            if pd.isna(emp_id):
                                replacement_values.append('DESCONOCIDO')
                                continue
                            try:
                                lookup_key = int(emp_id)
                            except (ValueError, TypeError):
                                replacement_values.append('DESCONOCIDO')
                                continue
                            replacement_values.append(
                                normalized_classification_lookup.get(lookup_key, 'DESCONOCIDO')
                            )
                        classification_map.loc[missing_mask] = replacement_values

                filtered['numero_empleado'] = pd.to_numeric(filtered['numero_empleado'], errors='coerce')
                mapped_segments = filtered['numero_empleado'].map(classification_map)
                if normalized_classification_lookup:
                    def _resolve_historical_segment(emp_id: Any, current: Any) -> str:
                        if pd.isna(emp_id):
                            return 'Desconocido'
                        if current in {None, 'DESCONOCIDO', 'Desconocido'} or pd.isna(current):
                            try:
                                key = int(emp_id)
                            except (ValueError, TypeError):
                                return 'Desconocido'
                            return normalized_classification_lookup.get(key, 'Desconocido')
                        return current

                    mapped_segments = [
                        _resolve_historical_segment(emp_id, current)
                        for emp_id, current in zip(filtered['numero_empleado'], mapped_segments)
                    ]

                filtered['clasificacion_segment'] = pd.Series(mapped_segments).fillna('Desconocido')

                actual_series = (
                    filtered.groupby('month')
                    .size()
                    .astype(float)
                    .sort_index()
                )

                for segment, group in filtered.groupby('clasificacion_segment'):
                    segment_series = (
                        group.groupby('month')
                        .size()
                        .astype(float)
                        .sort_index()
                    )
                    segment_actual_series[_normalize_clasificacion(segment)] = segment_series

    X, _, _, _ = rotation_trainer.prepare_features(frame, include_target=False)
    raw_predictions = estimator.predict_proba(X)
    if isinstance(raw_predictions, dict):
        probabilities_map = {
            int(horizon): np.asarray(values, dtype=float)
            for horizon, values in raw_predictions.items()
        }
    else:
        probabilities_map = {
            90: np.asarray(raw_predictions[:, 1] if raw_predictions.ndim == 2 else raw_predictions, dtype=float)
        }

    frame['days_until_baja'] = pd.to_numeric(frame.get('days_until_baja'), errors='coerce')
    frame['actual_90'] = frame[rotation_trainer.target_column].astype(int)
    frame['actual_30'] = (
        (frame['days_until_baja'].notna()) & (frame['days_until_baja'] <= 30)
    ).astype(int)
    frame['actual_60'] = (
        (frame['days_until_baja'].notna()) & (frame['days_until_baja'] <= 60)
    ).astype(int)

    total_90 = frame['actual_90'].sum()
    fallback_weights: Dict[int, float] = {
        90: 1.0,
        30: float(frame['actual_30'].sum() / total_90) if total_90 else 30 / 90,
        60: float(frame['actual_60'].sum() / total_90) if total_90 else 60 / 90,
    }

    base_probs = probabilities_map.get(90)
    if base_probs is None:
        raise ValueError('El estimador de rotación no regresó probabilidades para el horizonte de 90 días.')

    for horizon in [30, 60, 90]:
        column_name = f'prediction_{horizon}d'
        probs = probabilities_map.get(horizon)
        if probs is None:
            frame[column_name] = (base_probs * fallback_weights[horizon]).astype(float)
        else:
            frame[column_name] = np.asarray(probs, dtype=float)

    frame['predicted_30'] = frame['prediction_30d']
    frame['predicted_60'] = frame['prediction_60d']
    frame['predicted_90'] = frame['prediction_90d']

    frame['snapshot_month'] = frame['snapshot_date'].dt.to_period('M').dt.to_timestamp()
    frame['segment_key'] = list(
        zip(
            frame['empresa'].fillna(''),
            frame['area'].fillna(''),
            frame['departamento'].fillna(''),
        )
    )

    return frame, summary, actual_series, segment_actual_series


def _build_monthly_payload(
    frame: pd.DataFrame,
    actual_series: pd.Series,
    margin: float,
) -> Dict[str, Any]:
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

    predicted_totals = {'30': 0.0, '60': 0.0, '90': 0.0}
    weights = {'30': 30 / 90, '60': 60 / 90, '90': 1.0}
    forecast_entries: List[Dict[str, Any]] = []

    if not frame.empty and {'prediction_30d', 'prediction_60d', 'prediction_90d'}.issubset(frame.columns):
        latest_snapshot_month = frame['snapshot_month'].max()
        latest_snapshot_df = frame[frame['snapshot_month'] == latest_snapshot_month]

        pred_30_total = float(latest_snapshot_df['prediction_30d'].sum())
        pred_60_total = float(latest_snapshot_df['prediction_60d'].sum())
        pred_90_total = float(latest_snapshot_df['prediction_90d'].sum())

        predicted_totals = {
            '30': pred_30_total,
            '60': pred_60_total,
            '90': pred_90_total,
        }

        if pred_90_total > 0:
            weights = {
                '30': pred_30_total / pred_90_total,
                '60': pred_60_total / pred_90_total,
                '90': 1.0,
            }

        delta_60 = max(pred_60_total - pred_30_total, 0.0)
        delta_90 = max(pred_90_total - pred_60_total, 0.0)

        contributions: Dict[str, List[float]] = {
            '30': [pred_30_total, 0.0, 0.0],
            '60': [pred_30_total, delta_60, 0.0],
            '90': [pred_30_total, delta_60, delta_90],
        }

        if any(value > 0 for values in contributions.values() for value in values):
            if actual_series.empty:
                forecast_start = latest_snapshot_month + relativedelta(months=1)
            else:
                forecast_start = max(actual_series.index.max(), latest_snapshot_month) + relativedelta(months=1)

            for index in range(3):
                forecast_month = forecast_start + relativedelta(months=index)
                predicted_values = {str(h): contributions[str(h)][index] for h in HORIZONS}

                if all(value == 0 for value in predicted_values.values()):
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
        monthly.extend(forecast_entries)
        monthly.sort(key=lambda item: item['month'])

    actual_total = float(actual_series.sum()) if not actual_series.empty else 0.0
    actual_totals = {str(h): actual_total for h in HORIZONS}

    return {
        'monthly': monthly,
        'predicted_totals': predicted_totals,
        'actual_totals': actual_totals,
        'months_available': int(len(monthly)),
        'records': int(len(frame)),
        'weights': weights,
    }


async def _build_rotation_trends_response(
    trainer: RotationAttritionTrainer,
    margin: float = 0.15,
) -> Dict[str, Any]:
    frame, summary, actual_series, segment_actual_series = await _prepare_rotation_prediction_frame(trainer)

    overall_payload = _build_monthly_payload(frame, actual_series, margin)

    segmented_payload: Dict[str, Dict[str, Any]] = {}
    for segment in sorted(frame['clasificacion_segment'].dropna().unique()):
        segment_frame = frame[frame['clasificacion_segment'] == segment]
        segment_actual = segment_actual_series.get(segment, pd.Series(dtype=float))
        segmented_payload[segment] = _build_monthly_payload(segment_frame, segment_actual, margin)

    segments_metadata = {
        segment: {
            'actual_totals': payload['actual_totals'],
            'predicted_totals': payload['predicted_totals'],
            'weights': payload.get('weights', {}),
            'records': payload['records'],
            'months_available': payload['months_available'],
        }
        for segment, payload in segmented_payload.items()
    }

    metrics_summary = summary.get('metrics', {}) if summary else {}
    last_trained = summary.get('trained_at') if summary else None

    metadata = {
        'last_trained_at': last_trained,
        'actual_totals': overall_payload['actual_totals'],
        'predicted_totals': overall_payload['predicted_totals'],
        'weights': overall_payload.get('weights', {}),
        'records': int(len(frame)),
        'months_available': overall_payload['months_available'],
        'actual_total_ytd': float(actual_series.sum()) if not actual_series.empty else 0.0,
        'per_horizon_metrics': metrics_summary.get('per_horizon', {}),
        'metrics': metrics_summary,
        'segments': segments_metadata,
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
                    'weights': payload.get('weights', {}),
                    'records': payload['records'],
                    'months_available': payload['months_available'],
                },
            }
            for segment, payload in segmented_payload.items()
        },
    }


async def _build_segment_risk_trends_response(
    trainer: SegmentRiskTrainer,
    margin: float = 0.15,
) -> Dict[str, Any]:
    frame, rotation_summary, actual_series, segment_actual_series = await _prepare_rotation_prediction_frame(
        trainer.rotation_trainer
    )

    rotation_payload = _build_monthly_payload(frame, actual_series, margin)
    rotation_last_trained_at = rotation_summary.get('trained_at') if rotation_summary else None
    overall_weights = rotation_payload.get('weights', {'30': 30 / 90, '60': 60 / 90, '90': 1.0})

    try:
        segment_pipeline = trainer.load_estimator()
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            'Modelo de riesgo por segmento no entrenado. Entrena el modelo antes de consultar tendencias.'
        ) from exc

    feature_cols = [
        'headcount',
        'riesgo_promedio',
        'riesgo_p75',
        'ratio_negativa',
        'ratio_permiso',
    ]

    monthly_entries: List[Dict[str, Any]] = []
    for month, count in actual_series.items():
        monthly_entries.append({
            'month': month.strftime('%Y-%m-%d'),
            'actual': {str(h): float(count) for h in HORIZONS},
            'predicted': {},
            'predicted_lower': {},
            'predicted_upper': {},
            'segments': [],
        })

    monthly_entries.sort(key=lambda item: item['month'])

    high_risk_segments_accum: Dict[str, Dict[str, Any]] = {}

    latest_snapshot_month = frame['snapshot_month'].max()
    latest_snapshot_df = frame[frame['snapshot_month'] == latest_snapshot_month]

    forecast_entries: List[Dict[str, Any]] = []
    pred_30_total = 0.0
    pred_60_total = 0.0
    pred_90_total = 0.0
    if not latest_snapshot_df.empty:
        aggregated = (
            latest_snapshot_df.groupby(['empresa', 'area', 'departamento'], dropna=False)
            .agg(
                headcount=('employee_id', 'count'),
                riesgo_promedio=('prediction_90d', 'mean'),
                riesgo_p75=('prediction_90d', lambda s: float(np.percentile(s, 75))),
                incidencias_neg_90d=('neg_90d', 'sum'),
                incidencias_neg_365d=('neg_365d', 'sum'),
                permisos_365d=('permisos_365d', 'sum'),
                total_365d=('total_365d', 'sum'),
            )
            .reset_index()
        )

        aggregated['ratio_negativa'] = aggregated['incidencias_neg_365d'] / aggregated['total_365d'].replace(0, np.nan)
        aggregated['ratio_negativa'] = aggregated['ratio_negativa'].fillna(0)
        aggregated['ratio_permiso'] = aggregated['permisos_365d'] / aggregated['total_365d'].replace(0, np.nan)
        aggregated['ratio_permiso'] = aggregated['ratio_permiso'].fillna(0)
        aggregated['segment_key'] = list(
            zip(
                aggregated['empresa'].fillna(''),
                aggregated['area'].fillna(''),
                aggregated['departamento'].fillna(''),
            )
        )

        if not aggregated.empty:
            features = aggregated[feature_cols]
            clusters = segment_pipeline.predict(features)
            aggregated['cluster'] = clusters

            cluster_scores = aggregated.groupby('cluster')['riesgo_promedio'].mean()
            if not cluster_scores.empty:
                high_cluster = cluster_scores.idxmax()
                high_segments_df = aggregated[aggregated['cluster'] == high_cluster]
                high_keys = set(high_segments_df['segment_key'])

                high_df = latest_snapshot_df[latest_snapshot_df['segment_key'].isin(high_keys)]

                pred_30_total = float(high_df['predicted_30'].sum())
                pred_60_total = float(high_df['predicted_60'].sum())
                pred_90_total = float(high_df['predicted_90'].sum())

                delta_60 = max(pred_60_total - pred_30_total, 0.0)
                delta_90 = max(pred_90_total - pred_60_total, 0.0)

                contributions = {
                    '30': [pred_30_total, 0.0, 0.0],
                    '60': [pred_30_total, delta_60, 0.0],
                    '90': [pred_30_total, delta_60, delta_90],
                }

                if any(value > 0 for values in contributions.values() for value in values):
                    if actual_series.empty:
                        forecast_start = latest_snapshot_month + relativedelta(months=1)
                    else:
                        forecast_start = max(actual_series.index.max(), latest_snapshot_month) + relativedelta(months=1)

                    for index in range(3):
                        forecast_month = forecast_start + relativedelta(months=index)
                        predicted_values = {str(h): contributions[str(h)][index] for h in [30, 60, 90]}

                        if all(value == 0 for value in predicted_values.values()):
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
                            'segments': [
                                {
                                    'empresa': row['empresa'],
                                    'area': row['area'],
                                    'departamento': row['departamento'],
                                    'headcount': int(row['headcount']),
                                    'riesgo_promedio': float(row['riesgo_promedio']),
                                    'riesgo_p75': float(row['riesgo_p75']),
                                }
                                for _, row in high_segments_df.sort_values('riesgo_promedio', ascending=False).head(5).iterrows()
                            ],
                        })

                for _, row in high_segments_df.iterrows():
                    key = '|'.join([
                        str(row['empresa'] or ''),
                        str(row['area'] or ''),
                        str(row['departamento'] or ''),
                    ])
                    stored = high_risk_segments_accum.setdefault(key, {
                        'empresa': row['empresa'],
                        'area': row['area'],
                        'departamento': row['departamento'],
                        'headcount': 0,
                        'riesgo_promedio': [],
                    })
                    stored['headcount'] += int(row['headcount'])
                    stored['riesgo_promedio'].append(float(row['riesgo_promedio']))

    metadata = {
        'rotation_last_trained_at': rotation_last_trained_at,
        'overall_actual_totals': rotation_payload['actual_totals'],
        'overall_predicted_totals': rotation_payload['predicted_totals'],
        'overall_weights': overall_weights,
        'clusters': trainer.n_clusters,
        'months_available': int(len(monthly_entries) + len(forecast_entries)),
        'actual_totals_ytd': {
            str(h): float(actual_series.sum()) if not actual_series.empty else 0.0 for h in HORIZONS
        },
        'high_risk_predicted_totals': {
            '30': pred_30_total,
            '60': pred_60_total,
            '90': pred_90_total,
        },
        'segments_high_risk': sorted(
            [
                {
                    'empresa': value['empresa'],
                    'area': value['area'],
                    'departamento': value['departamento'],
                    'headcount': value['headcount'],
                    'riesgo_promedio': float(np.mean(value['riesgo_promedio'])) if value['riesgo_promedio'] else 0.0,
                }
                for value in high_risk_segments_accum.values()
            ],
            key=lambda item: item['riesgo_promedio'],
            reverse=True,
        )[:10],
    }

    if forecast_entries:
        monthly_entries.extend(forecast_entries)
        monthly_entries.sort(key=lambda item: item['month'])

    return {
        'model_id': trainer.model_id,
        'model_name': trainer.model_name,
        'last_trained_at': rotation_last_trained_at,
        'horizons': HORIZONS,
        'margin': margin,
        'monthly': monthly_entries,
        'metadata': metadata,
    }

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Type

import pandas as pd

from ..config import Settings
from ..database import Database
from ..schemas import ModelInfo, ModelSchedule, ModelType, ScheduleFrequency
from .absenteeism import AbsenteeismRiskTrainer
from .attrition_causes import AttritionCausesTrainer
from .forecast_absence import AbsenceForecastTrainer
from .rotation import RotationAttritionTrainer
from .base import BaseModelTrainer


@dataclass
class ModelConfig:
    id: str
    trainer_cls: Type[BaseModelTrainer]
    name: str
    description: str
    model_type: ModelType
    version: str = 'v1'
    default_frequency: ScheduleFrequency = ScheduleFrequency.MANUAL
    default_cron: Optional[str] = None


MODEL_REGISTRY: Dict[str, ModelConfig] = {
    'rotation': ModelConfig(
        id='rotation',
        trainer_cls=RotationAttritionTrainer,
        name='Predicción de rotación individual',
        description='Probabilidad de baja individual en horizonte de 14/28 días.',
        model_type=ModelType.CLASSIFICATION,
        default_frequency=ScheduleFrequency.WEEKLY,
        default_cron='0 2 * * 1',  # Lunes 2am, semanas pares (controlado por scheduler)
    ),
    'absenteeism_risk': ModelConfig(
        id='absenteeism_risk',
        trainer_cls=AbsenteeismRiskTrainer,
        name='Riesgo de ausentismo recurrente',
        description='Clasificador que anticipa ausentismo repetitivo a 30 días.',
        model_type=ModelType.CLASSIFICATION,
        default_frequency=ScheduleFrequency.WEEKLY,
        default_cron='0 3 * * 1',  # Lunes 3am
    ),
    'absence_forecast': ModelConfig(
        id='absence_forecast',
        trainer_cls=AbsenceForecastTrainer,
        name='Forecast de faltas por código',
        description='Proyección SARIMAX de faltas por código de incidencia.',
        model_type=ModelType.TIME_SERIES,
        default_frequency=ScheduleFrequency.WEEKLY,
        default_cron='30 3 * * 1',  # Lunes 3:30am
    ),
    'attrition_causes': ModelConfig(
        id='attrition_causes',
        trainer_cls=AttritionCausesTrainer,
        name='Causas raíz de bajas (SHAP)',
        description='Explainability con SHAP sobre variables de impacto en bajas.',
        model_type=ModelType.CLASSIFICATION,
        default_frequency=ScheduleFrequency.MONTHLY,
        default_cron='30 3 1 * *',
    ),
}


def list_model_configs() -> List[ModelConfig]:
    return list(MODEL_REGISTRY.values())


def get_model_config(model_id: str) -> ModelConfig:
    if model_id not in MODEL_REGISTRY:
        raise KeyError(f'Modelo {model_id} no registrado.')
    return MODEL_REGISTRY[model_id]


def create_trainer(model_id: str, settings: Settings, database: Database) -> BaseModelTrainer:
    config = get_model_config(model_id)
    return config.trainer_cls(settings, database)


def build_model_info(model_id: str, trainer: BaseModelTrainer) -> ModelInfo:
    config = get_model_config(model_id)
    summary = trainer.latest_summary()
    schedule = ModelSchedule(
        frequency=config.default_frequency,
        cron_expression=config.default_cron,
        next_run=None,
    )

    return ModelInfo(
        id=config.id,
        name=config.name,
        description=config.description,
        type=config.model_type,
        version=config.version,
        last_trained_at=pd.to_datetime(summary['trained_at']).to_pydatetime()
        if summary and summary.get('trained_at')
        else None,
        metrics=summary.get('metrics', {}) if summary else {},
        schedule=schedule,
    )

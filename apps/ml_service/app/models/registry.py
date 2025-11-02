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
from .interventions import PreventiveInterventionsTrainer
from .lifecycle import EmployeeLifecycleTrainer
from .patterns import PatternsClusteringTrainer
from .productivity import ProductivityImpactTrainer
from .rotation import RotationAttritionTrainer
from .segment_risk import SegmentRiskTrainer
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
        description='Probabilidad de baja individual en horizonte de 90 días.',
        model_type=ModelType.CLASSIFICATION,
        default_frequency=ScheduleFrequency.WEEKLY,
        default_cron='0 2 * * 0',
    ),
    'segment_risk': ModelConfig(
        id='segment_risk',
        trainer_cls=SegmentRiskTrainer,
        name='Riesgo de rotación por segmento',
        description='Clustering de áreas/departamentos basado en probabilidad de baja.',
        model_type=ModelType.CLUSTERING,
        default_frequency=ScheduleFrequency.WEEKLY,
        default_cron='15 2 * * 0',
    ),
    'absenteeism_risk': ModelConfig(
        id='absenteeism_risk',
        trainer_cls=AbsenteeismRiskTrainer,
        name='Riesgo de ausentismo recurrente',
        description='Clasificador que anticipa ausentismo repetitivo a 30 días.',
        model_type=ModelType.CLASSIFICATION,
        default_frequency=ScheduleFrequency.WEEKLY,
        default_cron='0 2 * * 1',
    ),
    'absence_forecast': ModelConfig(
        id='absence_forecast',
        trainer_cls=AbsenceForecastTrainer,
        name='Forecast de faltas/permisos',
        description='Proyección diaria SARIMAX de ausentismo y permisos.',
        model_type=ModelType.TIME_SERIES,
        default_frequency=ScheduleFrequency.WEEKLY,
        default_cron='30 2 * * 0',
    ),
    'labor_patterns': ModelConfig(
        id='labor_patterns',
        trainer_cls=PatternsClusteringTrainer,
        name='Clustering de patrones laborales',
        description='Agrupa empleados en patrones de comportamiento de asistencia.',
        model_type=ModelType.CLUSTERING,
        default_frequency=ScheduleFrequency.MONTHLY,
        default_cron='0 3 1 * *',
    ),
    'attrition_causes': ModelConfig(
        id='attrition_causes',
        trainer_cls=AttritionCausesTrainer,
        name='Causas raíz de bajas',
        description='Explainability con SHAP sobre motivos de bajas.',
        model_type=ModelType.CLASSIFICATION,
        default_frequency=ScheduleFrequency.MONTHLY,
        default_cron='30 3 1 * *',
    ),
    'productivity_impact': ModelConfig(
        id='productivity_impact',
        trainer_cls=ProductivityImpactTrainer,
        name='Impacto en productividad por ausentismo',
        description='Estimación monetaria del impacto del ausentismo.',
        model_type=ModelType.REGRESSION,
        default_frequency=ScheduleFrequency.MONTHLY,
        default_cron='0 4 1 * *',
    ),
    'preventive_interventions': ModelConfig(
        id='preventive_interventions',
        trainer_cls=PreventiveInterventionsTrainer,
        name='Intervenciones preventivas sugeridas',
        description='Recomendador basado en árbol de decisión sobre riesgos combinados.',
        model_type=ModelType.RECOMMENDER,
        default_frequency=ScheduleFrequency.MONTHLY,
        default_cron='30 4 1 * *',
    ),
    'employee_lifecycle': ModelConfig(
        id='employee_lifecycle',
        trainer_cls=EmployeeLifecycleTrainer,
        name='Ciclo de vida del colaborador',
        description='Curvas de supervivencia y hazard por segmento laboral.',
        model_type=ModelType.SURVIVAL,
        default_frequency=ScheduleFrequency.QUARTERLY,
        default_cron='0 5 1 1,4,7,10 *',
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

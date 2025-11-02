from __future__ import annotations

from datetime import datetime, time
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, validator


class ModelType(str, Enum):
    CLASSIFICATION = 'classification'
    REGRESSION = 'regression'
    TIME_SERIES = 'time_series'
    CLUSTERING = 'clustering'
    SURVIVAL = 'survival'
    RECOMMENDER = 'recommender'


class ScheduleFrequency(str, Enum):
    MANUAL = 'manual'
    DAILY = 'daily'
    WEEKLY = 'weekly'
    MONTHLY = 'monthly'
    QUARTERLY = 'quarterly'


class ScheduleConfig(BaseModel):
    frequency: ScheduleFrequency = ScheduleFrequency.MANUAL
    day_of_week: Optional[str] = Field(
        None,
        description='Día de ejecución (en minúsculas, ej. monday) para frecuencias semanales/mayores',
    )
    day_of_month: Optional[int] = Field(
        None,
        ge=1,
        le=31,
        description='Día del mes (1-31) cuando frequency = monthly o quarterly',
    )
    run_time: time = Field(time(hour=2, minute=0), description='Hora local de ejecución')

    @validator('day_of_week')
    def _normalize_weekday(cls, value: Optional[str], values: Dict[str, Any]) -> Optional[str]:
        if values.get('frequency') in {ScheduleFrequency.WEEKLY}:
            if not value:
                raise ValueError('day_of_week es requerido para frecuencia semanal')
            return value.lower()
        return value.lower() if value else value


class ModelSchedule(BaseModel):
    frequency: ScheduleFrequency
    cron_expression: Optional[str] = None
    next_run: Optional[datetime] = None


class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    type: ModelType
    version: str
    last_trained_at: Optional[datetime]
    metrics: Dict[str, Any] = Field(default_factory=dict)
    schedule: Optional[ModelSchedule]


class TrainingRequest(BaseModel):
    force: bool = False
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)


class TrainingResponse(BaseModel):
    model: ModelInfo
    trained_at: datetime
    metrics: Dict[str, Any]
    artifacts: Dict[str, Any] = Field(default_factory=dict)

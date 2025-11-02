from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    database_url: str = Field(..., validation_alias=AliasChoices('DATABASE_URL', 'SUPABASE_DATABASE_URL'))
    supabase_service_key: Optional[str] = Field(
        None,
        validation_alias=AliasChoices('SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
    )
    supabase_project_url: Optional[str] = Field(
        None,
        validation_alias=AliasChoices('SUPABASE_PROJECT_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
    )

    models_dir: Path = Field(Path('apps/ml_service/storage/models'), alias='ML_MODELS_DIR')
    metrics_dir: Path = Field(Path('apps/ml_service/storage/metrics'), alias='ML_METRICS_DIR')
    scheduler_state_path: Path = Field(
        Path('apps/ml_service/storage/scheduler.json'),
        alias='ML_SCHEDULER_STATE_PATH',
    )
    timezone: str = Field('America/Mexico_City', alias='ML_TIMEZONE')

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    # Resolve relative paths once to avoid surprises when launched from other cwd
    settings.models_dir = settings.models_dir.resolve()
    settings.metrics_dir = settings.metrics_dir.resolve()
    settings.scheduler_state_path = settings.scheduler_state_path.resolve()
    return settings

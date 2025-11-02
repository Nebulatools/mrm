from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from ..config import Settings
from ..database import Database
from ..models.registry import ModelConfig, create_trainer, get_model_config, MODEL_REGISTRY
from ..utils.io import ensure_directory, read_json, write_json


@dataclass
class ScheduledJob:
    model_id: str
    cron: str
    next_run: Optional[str] = None


class ModelScheduler:
    """
    Wrapper around APScheduler to orchestrate periodic model training.
    """

    def __init__(self, settings: Settings, database: Database) -> None:
        self.settings = settings
        self.database = database
        self.scheduler = AsyncIOScheduler(timezone=settings.timezone)
        self._state_path: Path = settings.scheduler_state_path
        ensure_directory(self._state_path.parent)
        self._state: Dict[str, ScheduledJob] = {}
        self._load_state()

    def start(self) -> None:
        if not self.scheduler.running:
            self.scheduler.start()

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def _load_state(self) -> None:
        data = read_json(self._state_path, default={})
        for model_id, payload in data.items():
            self._state[model_id] = ScheduledJob(
                model_id=model_id,
                cron=payload.get('cron'),
                next_run=payload.get('next_run'),
            )

    def _persist_state(self) -> None:
        write_json(
            self._state_path,
            {
                model_id: {
                    'cron': job.cron,
                    'next_run': job.next_run,
                }
                for model_id, job in self._state.items()
            },
        )

    def register_default_jobs(self) -> None:
        for model_id, config in MODEL_REGISTRY.items():
            if config.default_cron:
                self.schedule_model(model_id, config.default_cron, persist=False)
        self._persist_state()

    def schedule_model(self, model_id: str, cron_expression: str, persist: bool = True) -> None:
        """
        Create/update cron-based job for the provided model id.
        """
        trigger = CronTrigger.from_crontab(cron_expression, timezone=self.scheduler.timezone)

        if self.scheduler.get_job(model_id):
            self.scheduler.reschedule_job(model_id, trigger=trigger)
        else:
            self.scheduler.add_job(
                self._run_training,
                trigger=trigger,
                args=[model_id],
                id=model_id,
                replace_existing=True,
                coalesce=True,
                misfire_grace_time=300,
            )

        job = self.scheduler.get_job(model_id)
        # APScheduler only populates ``next_run_time`` after the scheduler is running.
        next_run_time = getattr(job, 'next_run_time', None) if job else None
        self._state[model_id] = ScheduledJob(
            model_id=model_id,
            cron=cron_expression,
            next_run=next_run_time.isoformat() if next_run_time else None,
        )

        if persist:
            self._persist_state()

    def remove_schedule(self, model_id: str) -> None:
        if self.scheduler.get_job(model_id):
            self.scheduler.remove_job(model_id)
        if model_id in self._state:
            del self._state[model_id]
            self._persist_state()

    async def _run_training(self, model_id: str) -> None:
        """
        Background task executed by the scheduler; trains the given model.
        """
        config: ModelConfig = get_model_config(model_id)
        trainer = create_trainer(model_id, self.settings, self.database)
        try:
            result = await trainer.train()
            job = self.scheduler.get_job(model_id)
            self._state[model_id] = ScheduledJob(
                model_id=model_id,
                cron=self._state.get(model_id, ScheduledJob(model_id, config.default_cron or '')).cron,
                next_run=job.next_run_time.isoformat() if job and job.next_run_time else None,
            )
            self._persist_state()
            print(f'[Scheduler] Modelo {model_id} entrenado correctamente a las {result["trained_at"]}')
        except Exception as exc:  # noqa: BLE001
            print(f'[Scheduler] Error entrenando modelo {model_id}: {exc}')

    def get_state(self) -> Dict[str, Any]:
        return {
            model_id: {
                'cron': job.cron,
                'next_run': job.next_run,
            }
            for model_id, job in self._state.items()
        }

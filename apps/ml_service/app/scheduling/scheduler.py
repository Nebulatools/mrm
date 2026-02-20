from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, date
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
    Wrapper around APScheduler to orchestrate periodic model training,
    feature refresh, prediction generation, and accuracy tracking.
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
        """Register model training jobs + infrastructure jobs."""
        # Model training jobs from registry
        for model_id, config in MODEL_REGISTRY.items():
            if config.default_cron:
                self.schedule_model(model_id, config.default_cron, persist=False)

        # Daily feature refresh at 1am
        self.scheduler.add_job(
            self._refresh_features,
            CronTrigger.from_crontab('0 1 * * *', timezone=self.scheduler.timezone),
            id='refresh_features',
            replace_existing=True,
            coalesce=True,
            misfire_grace_time=600,
        )

        # Silver views refresh at 12:30am daily
        self.scheduler.add_job(
            self._refresh_silver_views,
            CronTrigger.from_crontab('30 0 * * *', timezone=self.scheduler.timezone),
            id='refresh_silver',
            replace_existing=True,
            coalesce=True,
            misfire_grace_time=600,
        )

        # Weekly snapshot on Sundays at 11pm
        self.scheduler.add_job(
            self._take_weekly_snapshot,
            CronTrigger.from_crontab('0 23 * * 0', timezone=self.scheduler.timezone),
            id='weekly_snapshot',
            replace_existing=True,
            coalesce=True,
            misfire_grace_time=3600,
        )

        # Accuracy tracking: Mondays at 4am (biweekly check done inside)
        self.scheduler.add_job(
            self._track_accuracy,
            CronTrigger.from_crontab('0 4 * * 1', timezone=self.scheduler.timezone),
            id='accuracy_tracking',
            replace_existing=True,
            coalesce=True,
            misfire_grace_time=600,
        )

        self._persist_state()

    def schedule_model(self, model_id: str, cron_expression: str, persist: bool = True) -> None:
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
        """Train the given model and generate predictions."""
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

            # Generate predictions after training
            await self._generate_predictions(model_id)

        except Exception as exc:  # noqa: BLE001
            print(f'[Scheduler] Error entrenando modelo {model_id}: {exc}')

    async def _generate_predictions(self, model_id: str) -> None:
        """Generate predictions and log to ml_predictions_log."""
        try:
            from ..models.predictions import (
                generate_rotation_predictions,
                generate_forecast_predictions,
            )
            from ..models.rotation import RotationAttritionTrainer
            from ..models.forecast_absence import AbsenceForecastTrainer

            trainer = create_trainer(model_id, self.settings, self.database)

            rows = []
            if model_id == 'rotation' and isinstance(trainer, RotationAttritionTrainer):
                rows = await generate_rotation_predictions(trainer, self.database)
            elif model_id == 'absence_forecast' and isinstance(trainer, AbsenceForecastTrainer):
                rows = await generate_forecast_predictions(trainer, self.database)

            if rows:
                count = await self.database.insert_rows('ml_predictions_log', rows)
                print(f'[Scheduler] Saved {count} predictions for {model_id}')
        except Exception as exc:  # noqa: BLE001
            print(f'[Scheduler] Error generando predicciones para {model_id}: {exc}')

    async def _refresh_silver_views(self) -> None:
        """Refresh Silver layer materialized views."""
        try:
            print('[Scheduler] Refreshing Silver layer views...')
            await self.database.rpc('refresh_silver_views')
            print('[Scheduler] Silver views refreshed successfully')
        except Exception as exc:  # noqa: BLE001
            print(f'[Scheduler] Error refreshing Silver views: {exc}')

    async def _refresh_features(self) -> None:
        """Refresh Gold layer ml_employee_features for current date."""
        try:
            today = date.today()
            print(f'[Scheduler] Refreshing ml_employee_features for {today}...')
            await self.database.rpc('refresh_ml_employee_features', {'snapshot_date': str(today)})
            print(f'[Scheduler] Features refreshed for {today}')
        except Exception as exc:  # noqa: BLE001
            print(f'[Scheduler] Error refreshing features: {exc}')

    async def _take_weekly_snapshot(self) -> None:
        """Take weekly snapshot of active employees and incidents."""
        try:
            print(f'[Scheduler] Taking weekly snapshot for {date.today()}...')
            await self.database.rpc('take_weekly_snapshot')
            print('[Scheduler] Weekly snapshot completed')
        except Exception as exc:  # noqa: BLE001
            print(f'[Scheduler] Error taking weekly snapshot: {exc}')

    async def _track_accuracy(self) -> None:
        """
        Compare predictions from 2 weeks ago with actual outcomes.
        Updates ml_predictions_log.was_correct and actual_value.
        """
        try:
            print('[Scheduler] Running accuracy tracking...')
            import pandas as pd
            from datetime import timedelta

            cutoff = date.today() - timedelta(days=14)

            # Read predictions older than 14 days that haven't been checked
            preds_df = await self.database.fetch_dataframe(
                'SELECT * FROM ml_predictions_log'
            )
            if preds_df.empty:
                print('[Scheduler] No predictions to track')
                return

            preds_df['prediction_date'] = pd.to_datetime(preds_df['prediction_date'])
            pending = preds_df[
                (preds_df['prediction_date'] <= str(cutoff))
                & (preds_df['was_correct'].isna())
                & (preds_df['numero_empleado'].notna())
            ]

            if pending.empty:
                print('[Scheduler] No pending predictions to verify')
                return

            # Read actual bajas
            bajas_df = await self.database.fetch_dataframe(
                'SELECT numero_empleado, fecha_baja FROM motivos_baja'
            )
            if bajas_df.empty:
                print('[Scheduler] No motivos_baja data for comparison')
                return

            bajas_df['fecha_baja'] = pd.to_datetime(bajas_df['fecha_baja'])
            baja_employees = set(bajas_df['numero_empleado'].dropna().astype(int))

            # Update each pending prediction
            client = await self.database.connect()
            updated = 0
            for _, row in pending.iterrows():
                emp_id = int(row['numero_empleado'])
                pred_date = row['prediction_date']
                horizon = int(row['horizon']) if pd.notna(row.get('horizon')) else 28
                window_end = pred_date + timedelta(days=horizon)

                actual_baja = bajas_df[
                    (bajas_df['numero_empleado'] == emp_id)
                    & (bajas_df['fecha_baja'] >= pred_date)
                    & (bajas_df['fecha_baja'] <= window_end)
                ]
                did_leave = len(actual_baja) > 0
                was_high_risk = row.get('risk_level') in ('ALTO', 'MEDIO')
                was_correct = (did_leave and was_high_risk) or (not did_leave and not was_high_risk)

                resp = await client.patch(
                    f'/ml_predictions_log?id=eq.{int(row["id"])}',
                    json={
                        'was_correct': was_correct,
                        'actual_value': 1.0 if did_leave else 0.0,
                    },
                )
                if resp.status_code < 300:
                    updated += 1

            print(f'[Scheduler] Accuracy tracking: updated {updated} predictions')
        except Exception as exc:  # noqa: BLE001
            print(f'[Scheduler] Error in accuracy tracking: {exc}')

    def get_state(self) -> Dict[str, Any]:
        return {
            model_id: {
                'cron': job.cron,
                'next_run': job.next_run,
            }
            for model_id, job in self._state.items()
        }

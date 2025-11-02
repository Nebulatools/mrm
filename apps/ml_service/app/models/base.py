from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import pandas as pd

from ..config import Settings
from ..database import Database
from ..schemas import ModelType
from ..utils.io import ensure_directory, read_json, write_json


@dataclass
class TrainOutput:
    estimator: Any
    metrics: Dict[str, Any]
    artifacts: Dict[str, Any] = field(default_factory=dict)


class BaseModelTrainer(ABC):
    """
    Abstract trainer encapsulating common persistence logic shared by all models.
    """

    model_id: str
    model_name: str
    model_type: ModelType
    model_version: str = 'v1'
    description: str = ''

    def __init__(self, settings: Settings, database: Database) -> None:
        self.settings = settings
        self.database = database
        self._model_dir = ensure_directory(Path(settings.models_dir) / self.model_id)
        self._metrics_dir = ensure_directory(Path(settings.metrics_dir) / self.model_id)

    # ----- Hooks to be implemented by subclasses ---------------------------------

    @abstractmethod
    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        """Return the dataframe required for training."""

    @abstractmethod
    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        """Train the underlying estimator and return metrics/artifacts."""

    # ----- Public API ------------------------------------------------------------

    async def train(self, **kwargs: Any) -> Dict[str, Any]:
        frame = await self.load_training_frame(**kwargs)
        if frame.empty:
            raise ValueError(f'Dataset for model {self.model_id} está vacío; no se puede entrenar.')

        output = self.run_training(frame, **kwargs)
        trained_at = datetime.now(timezone.utc)

        model_path = self._persist_estimator(output.estimator)
        metrics_path = self._persist_metrics(output.metrics, trained_at, output.artifacts)

        return {
            'model_id': self.model_id,
            'trained_at': trained_at,
            'model_path': str(model_path),
            'metrics_path': str(metrics_path),
            'metrics': output.metrics,
            'artifacts': output.artifacts,
        }

    def latest_summary(self) -> Dict[str, Any]:
        payload = read_json(self._metrics_dir / 'latest.json', default=None)
        if payload:
            payload['model_id'] = self.model_id
            payload.setdefault('model_version', self.model_version)
        return payload or {}

    # ----- Persistence helpers ---------------------------------------------------

    def _persist_estimator(self, estimator: Any) -> Path:
        artifact_path = self._model_dir / f'{self.model_version}.joblib'
        joblib.dump(estimator, artifact_path)
        return artifact_path

    def load_estimator(self) -> Any:
        artifact_path = self._model_dir / f'{self.model_version}.joblib'
        if not artifact_path.exists():
            raise FileNotFoundError(
                f'No se encontró el artefacto entrenado para el modelo {self.model_id}. '
                'Entrena el modelo antes de solicitar análisis.'
            )
        return joblib.load(artifact_path)

    def _persist_metrics(
        self,
        metrics: Dict[str, Any],
        trained_at: datetime,
        artifacts: Optional[Dict[str, Any]] = None,
    ) -> Path:
        payload = {
            'model_id': self.model_id,
            'model_name': self.model_name,
            'model_version': self.model_version,
            'trained_at': trained_at.isoformat(),
            'metrics': metrics,
            'artifacts': artifacts or {},
        }
        metrics_path = self._metrics_dir / 'latest.json'
        write_json(metrics_path, payload)
        history_path = self._metrics_dir / f'history_{trained_at.strftime("%Y%m%d%H%M%S")}.json'
        write_json(history_path, payload)
        return metrics_path

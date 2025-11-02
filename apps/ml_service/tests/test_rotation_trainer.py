import asyncio
import datetime
from pathlib import Path

import pandas as pd
import pytest
from dateutil.relativedelta import relativedelta

pytest.importorskip('xgboost')

from apps.ml_service.app.config import Settings
from apps.ml_service.app.models.rotation import RotationAttritionTrainer


class DummyDatabase:
    def __init__(self, frame: pd.DataFrame) -> None:
        self._frame = frame

    async def fetch_dataframe(self, query: str, *args):  # noqa: ARG002 - query retained for interface compatibility
        await asyncio.sleep(0)  # guarantee coroutine behaviour
        return self._frame.copy()


@pytest.mark.asyncio
async def test_rotation_trainer_trains(tmp_path: Path):
    rows = []
    fecha_baja_base = datetime.date.today() - relativedelta(months=2)
    for idx in range(60):
        target = 1 if idx % 5 == 0 else 0
        rows.append(
            {
                'employee_id': idx + 1,
                'activo': bool(1 - target),
                'genero': 'M' if idx % 2 == 0 else 'F',
                'area': 'Operaciones' if idx % 3 else 'Ventas',
                'departamento': 'Depto A',
                'puesto': 'Operador',
                'clasificacion': 'SINDICALIZADO',
                'ubicacion': 'PLANTA',
                'tipo_nomina': 'Mensual',
                'turno': 'Matutino',
                'empresa': 'MRM',
                'fecha_ingreso': '2022-01-01',
                'fecha_antiguedad': '2022-01-01',
                'fecha_baja': fecha_baja_base.isoformat() if target else None,
                'neg_30d': 0,
                'neg_90d': 1 if target else 0,
                'neg_365d': 3 if target else 1,
                'permisos_90d': 2,
                'permisos_365d': 4,
                'total_90d': 3,
                'total_365d': 10,
                'motivo_tipo': 'Término del contrato' if target else None,
                'motivo_detalle': 'Separación voluntaria' if target else None,
                'ultima_fecha_baja': None,
                'target_rotacion': target,
            }
        )
    frame = pd.DataFrame(rows)

    settings = Settings(
        DATABASE_URL='postgresql://user:pass@localhost:5432/postgres',
        ML_MODELS_DIR=tmp_path / 'models',
        ML_METRICS_DIR=tmp_path / 'metrics',
        ML_SCHEDULER_STATE_PATH=tmp_path / 'scheduler.json',
    )

    trainer = RotationAttritionTrainer(settings, DummyDatabase(frame))
    result = await trainer.train()

    assert 'roc_auc' in result['metrics']
    assert result['metrics']['roc_auc'] >= 0.0
    model_artifact = tmp_path / 'models' / trainer.model_id / f'{trainer.model_version}.joblib'
    assert model_artifact.exists()

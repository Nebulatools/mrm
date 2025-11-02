from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd
from lifelines import CoxPHFitter

from .base import BaseModelTrainer, TrainOutput
from ..schemas import ModelType


LIFECYCLE_SQL = """
WITH bajas AS (
    SELECT DISTINCT ON (numero_empleado)
        numero_empleado,
        fecha_baja,
        tipo,
        motivo
    FROM motivos_baja
    WHERE fecha_baja IS NOT NULL
    ORDER BY numero_empleado, fecha_baja DESC
)
SELECT
    e.numero_empleado AS employee_id,
    e.area,
    e.departamento,
    e.empresa,
    e.clasificacion,
    e.tipo_nomina,
    e.turno,
    e.fecha_ingreso,
    e.fecha_baja,
    COALESCE(b.tipo, 'Activo') AS motivo_tipo,
    COALESCE(b.motivo, 'Sin registro') AS motivo_detalle,
    CASE WHEN e.fecha_baja IS NULL THEN 0 ELSE 1 END AS event_observed
FROM empleados_sftp e
LEFT JOIN bajas b ON b.numero_empleado = e.numero_empleado
WHERE e.fecha_ingreso IS NOT NULL;
"""


class EmployeeLifecycleTrainer(BaseModelTrainer):
    model_id = 'employee_lifecycle'
    model_name = 'Ciclo de vida del empleado'
    model_type = ModelType.SURVIVAL
    description = 'Modelo de supervivencia Cox para estimar curva de retención y hazard por segmento.'

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        df = await self.database.fetch_dataframe(LIFECYCLE_SQL)
        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        if df.empty:
            raise ValueError('No hay datos de empleados suficientes para el análisis de ciclo de vida.')

        df['fecha_ingreso'] = pd.to_datetime(df['fecha_ingreso'])
        df['fecha_baja'] = pd.to_datetime(df['fecha_baja'])
        censor_date = kwargs.get('censor_date')
        if censor_date:
            censor_date = pd.to_datetime(censor_date)
        else:
            censor_date = pd.Timestamp('today', tz=None).normalize()

        df['event_observed'] = df['event_observed'].fillna(0).astype(int)
        df['event_observed'] = df.apply(
            lambda row: 0 if pd.isna(row['fecha_baja']) else 1,
            axis=1,
        )

        df['duration_days'] = df.apply(
            lambda row: (min(row['fecha_baja'], censor_date) - row['fecha_ingreso']).days
            if row['event_observed'] == 1
            else (censor_date - row['fecha_ingreso']).days,
            axis=1,
        )
        df = df[df['duration_days'] > 0]

        categorical_features: List[str] = [
            'area',
            'departamento',
            'empresa',
            'clasificacion',
            'tipo_nomina',
            'turno',
        ]

        df_encoded = pd.get_dummies(df[categorical_features], dummy_na=True)
        df_model = pd.concat([df[['duration_days', 'event_observed']], df_encoded], axis=1)

        cox = CoxPHFitter(penalizer=0.01, l1_ratio=0.0)
        cox.fit(df_model, duration_col='duration_days', event_col='event_observed')

        concordance = float(cox.concordance_index_)

        survival_table = cox.predict_survival_function(df_model.head(5)).T
        survival_preview = survival_table.iloc[:, :10].round(4).to_dict(orient='list')

        artifacts = {
            'survival_preview': survival_preview,
            'coefficients': cox.params_.round(4).to_dict(),
        }

        metrics: Dict[str, Any] = {
            'concordance_index': concordance,
            'observations': int(df_model.shape[0]),
            'events': int(df_model['event_observed'].sum()),
        }

        return TrainOutput(estimator=cox, metrics=metrics, artifacts=artifacts)

from __future__ import annotations

from typing import Any, Dict

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

from .base import BaseModelTrainer, TrainOutput
from ..schemas import ModelType


FORECAST_SQL = """
WITH date_bounds AS (
    SELECT
        (SELECT COALESCE(MIN(fecha), CURRENT_DATE - INTERVAL '365 days') FROM incidencias) AS start_date,
        CURRENT_DATE::date AS end_date
),
calendar AS (
    SELECT generate_series(
        (SELECT GREATEST(start_date::date, CURRENT_DATE - INTERVAL '400 days') FROM date_bounds),
        (SELECT end_date FROM date_bounds),
        INTERVAL '1 day'
    )::date AS day
),
daily_incidencias AS (
    SELECT
        i.fecha::date AS day,
        COUNT(*) FILTER (WHERE i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])) AS ausentismo,
        COUNT(*) FILTER (WHERE i.inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])) AS permisos
    FROM incidencias i
    WHERE i.fecha >= CURRENT_DATE - INTERVAL '400 days'
    GROUP BY i.fecha::date
),
daily_headcount AS (
    SELECT
        c.day,
        COUNT(*) AS headcount
    FROM calendar c
    JOIN empleados_sftp e
      ON e.fecha_ingreso <= c.day
     AND (e.fecha_baja IS NULL OR e.fecha_baja >= c.day)
    GROUP BY c.day
)
SELECT
    c.day,
    COALESCE(di.ausentismo, 0) AS ausentismo,
    COALESCE(di.permisos, 0) AS permisos,
    COALESCE(dh.headcount, 0) AS headcount
FROM calendar c
LEFT JOIN daily_incidencias di ON di.day = c.day
LEFT JOIN daily_headcount dh ON dh.day = c.day
ORDER BY c.day;
"""


class AbsenceForecastTrainer(BaseModelTrainer):
    model_id = 'absence_forecast'
    model_name = 'Forecast de faltas y permisos'
    model_type = ModelType.TIME_SERIES
    description = 'Modelo SARIMAX para proyectar ausentismo diario con variables exógenas (permisos, headcount).'

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        df = await self.database.fetch_dataframe(FORECAST_SQL)
        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        if df.empty:
            raise ValueError('No existen registros de incidencias suficientes para entrenar el forecast.')

        df['day'] = pd.to_datetime(df['day'])
        df = df.set_index('day').asfreq('D')
        df[['ausentismo', 'permisos', 'headcount']] = df[['ausentismo', 'permisos', 'headcount']].fillna(0)

        # Train/test split: last 28 days as validation
        horizon = kwargs.get('validation_horizon', 28)
        train_df = df.iloc[:-horizon]
        test_df = df.iloc[-horizon:]

        train_endog = train_df['ausentismo']
        train_exog = train_df[['permisos', 'headcount']]

        model = SARIMAX(
            train_endog,
            exog=train_exog,
            order=(1, 1, 1),
            seasonal_order=(0, 1, 1, 7),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        fitted = model.fit(disp=False)

        test_forecast = fitted.get_forecast(steps=horizon, exog=test_df[['permisos', 'headcount']])
        forecast_series = test_forecast.predicted_mean

        rmse = float(np.sqrt(np.mean((forecast_series - test_df['ausentismo']) ** 2)))
        mase = self._mean_absolute_scaled_error(test_df['ausentismo'], forecast_series, train_endog)

        # Refit on full dataset
        full_model = SARIMAX(
            df['ausentismo'],
            exog=df[['permisos', 'headcount']],
            order=(1, 1, 1),
            seasonal_order=(0, 1, 1, 7),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        full_results = full_model.fit(disp=False)

        future_steps = kwargs.get('forecast_steps', 30)
        future_exog = self._build_future_exog(df, future_steps)
        future_forecast = full_results.get_forecast(steps=future_steps, exog=future_exog)

        forecast_index = pd.date_range(df.index[-1] + pd.Timedelta(days=1), periods=future_steps, freq='D')
        forecast_values = future_forecast.predicted_mean

        artifacts = {
            'validation': {
                'dates': test_df.index.strftime('%Y-%m-%d').tolist(),
                'actuals': test_df['ausentismo'].tolist(),
                'forecast': forecast_series.tolist(),
            },
            'forecast_next': [
                {'date': date.strftime('%Y-%m-%d'), 'ausentismo': float(value)}
                for date, value in zip(forecast_index, forecast_values)
            ],
        }

        metrics: Dict[str, Any] = {
            'rmse': rmse,
            'mase': mase,
            'train_samples': int(len(train_df)),
            'validation_samples': int(len(test_df)),
        }

        return TrainOutput(estimator=full_results, metrics=metrics, artifacts=artifacts)

    def _mean_absolute_scaled_error(self, actuals: pd.Series, forecast: pd.Series, insample: pd.Series) -> float:
        mae = float(np.mean(np.abs(actuals - forecast)))
        naive = float(np.mean(np.abs(insample.diff().dropna())))
        if naive == 0:
            return 0.0
        return mae / naive

    def _build_future_exog(self, df: pd.DataFrame, steps: int) -> pd.DataFrame:
        last_row = df.iloc[-1]
        # Simple assumption: use last observed values for permisos/headcount
        future_exog = pd.DataFrame(
            {
                'permisos': [last_row['permisos']] * steps,
                'headcount': [last_row['headcount']] * steps,
            }
        )
        return future_exog

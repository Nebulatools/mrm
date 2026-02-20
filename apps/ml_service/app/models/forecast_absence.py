"""
Absence forecast by incident code — time series forecasting.

Forecasts daily counts per incident code (FI, INC, VAC, PCON, etc.)
using SARIMAX models. Reads from Silver layer mv_incidencias_enriquecidas.
"""
from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

from .base import BaseModelTrainer, TrainOutput
from ..schemas import ModelType


# SQL to load daily incident counts by code from Silver layer
FORECAST_SQL = """
WITH date_bounds AS (
    SELECT
        (CURRENT_DATE - INTERVAL '400 days')::date AS start_date,
        CURRENT_DATE::date AS end_date
),
calendar AS (
    SELECT generate_series(
        (SELECT start_date FROM date_bounds),
        (SELECT end_date FROM date_bounds),
        INTERVAL '1 day'
    )::date AS day
),
codes AS (
    SELECT UNNEST(ARRAY['FI','INC','VAC','PCON','PSIN','SUSP','ENFE']) AS codigo
),
daily_by_code AS (
    SELECT
        i.fecha::date AS day,
        i.codigo_incidencia AS codigo,
        COUNT(*) AS count
    FROM mv_incidencias_enriquecidas i
    WHERE i.fecha >= CURRENT_DATE - INTERVAL '400 days'
    GROUP BY i.fecha::date, i.codigo_incidencia
),
daily_headcount AS (
    SELECT
        c.day,
        COUNT(*) AS headcount
    FROM calendar c
    JOIN mv_empleados_master e
      ON e.fecha_ingreso <= c.day
     AND (e.fecha_baja_final IS NULL OR e.fecha_baja_final >= c.day)
    GROUP BY c.day
)
SELECT
    c.day,
    codes.codigo,
    COALESCE(dbc.count, 0) AS count,
    COALESCE(dh.headcount, 0) AS headcount
FROM calendar c
CROSS JOIN codes
LEFT JOIN daily_by_code dbc ON dbc.day = c.day AND dbc.codigo = codes.codigo
LEFT JOIN daily_headcount dh ON dh.day = c.day
ORDER BY c.day, codes.codigo;
"""

# Codes to forecast
FORECAST_CODES = ['FI', 'INC', 'VAC', 'PCON', 'PSIN', 'SUSP', 'ENFE', 'MAT3', 'FEST', 'PATER', 'ACCI']


class AbsenceForecastTrainer(BaseModelTrainer):
    model_id = 'absence_forecast'
    model_name = 'Forecast de faltas por código'
    model_type = ModelType.TIME_SERIES
    description = (
        'Modelo SARIMAX para proyectar faltas diarias por código de incidencia. '
        'Genera forecasts a 7, 14 y 28 días por código.'
    )

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        # REST adapter fetches raw rows from mv_incidencias_enriquecidas.
        # We aggregate in Python to produce the expected (day, codigo, count, headcount) format.
        # Use explicit query that routes to mv_incidencias_enriquecidas (not FORECAST_SQL
        # which also mentions mv_empleados_master and confuses the REST router)
        raw = await self.database.fetch_dataframe(
            'SELECT * FROM mv_incidencias_enriquecidas'
        )
        if raw.empty:
            return pd.DataFrame(columns=['day', 'codigo', 'count', 'headcount'])

        raw['fecha'] = pd.to_datetime(raw['fecha'], errors='coerce')
        raw = raw.dropna(subset=['fecha'])

        cutoff = pd.Timestamp.now() - pd.Timedelta(days=400)
        raw = raw[raw['fecha'] >= cutoff]

        if raw.empty:
            return pd.DataFrame(columns=['day', 'codigo', 'count', 'headcount'])

        # Daily counts by incident code
        daily_by_code = (
            raw.groupby([raw['fecha'].dt.date, 'codigo_incidencia'])
            .size()
            .reset_index(name='count')
        )
        daily_by_code.columns = ['day', 'codigo', 'count']

        # Build calendar × codes grid
        min_day = daily_by_code['day'].min()
        max_day = daily_by_code['day'].max()
        calendar = pd.date_range(start=min_day, end=max_day, freq='D').date
        grid = pd.MultiIndex.from_product(
            [calendar, FORECAST_CODES], names=['day', 'codigo']
        ).to_frame(index=False)
        grid = grid.merge(daily_by_code, on=['day', 'codigo'], how='left')
        grid['count'] = grid['count'].fillna(0).astype(int)

        # Headcount: load employees and compute daily active count
        # Route explicitly to mv_empleados_master
        emp_df = await self.database.fetch_dataframe(
            'SELECT * FROM mv_empleados_master'
        )
        if not emp_df.empty:
            emp_df['fecha_ingreso'] = pd.to_datetime(emp_df['fecha_ingreso'], errors='coerce')
            emp_df['fecha_baja_final'] = pd.to_datetime(emp_df['fecha_baja_final'], errors='coerce')

            headcounts = {}
            for d in calendar:
                dt = pd.Timestamp(d)
                active = emp_df[
                    (emp_df['fecha_ingreso'] <= dt)
                    & (emp_df['fecha_baja_final'].isna() | (emp_df['fecha_baja_final'] >= dt))
                ]
                headcounts[d] = len(active)

            grid['headcount'] = grid['day'].map(headcounts).fillna(0).astype(int)
        else:
            grid['headcount'] = 0

        return grid

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        if df.empty:
            raise ValueError('No existen registros suficientes para entrenar el forecast.')

        df['day'] = pd.to_datetime(df['day'])

        # Train one SARIMAX per code
        models: Dict[str, Any] = {}
        per_code_metrics: Dict[str, Dict[str, Any]] = {}
        per_code_forecasts: Dict[str, List[Dict[str, Any]]] = {}
        validation_horizon = kwargs.get('validation_horizon', 28)
        forecast_horizons = [7, 14, 28]

        for code in FORECAST_CODES:
            code_df = df[df['codigo'] == code].copy()
            if code_df.empty or len(code_df) < 60:
                continue

            # Pivot to daily series
            daily = code_df.groupby('day')['count'].sum().reset_index()
            daily = daily.set_index('day').asfreq('D', fill_value=0)

            if len(daily) < 60:
                continue

            # Get headcount as exog
            headcount = code_df.groupby('day')['headcount'].first().reset_index()
            headcount = headcount.set_index('day').asfreq('D', method='ffill')
            headcount = headcount.reindex(daily.index, method='ffill').fillna(method='bfill')

            # Train/test split
            train_series = daily.iloc[:-validation_horizon]
            test_series = daily.iloc[-validation_horizon:]
            train_exog = headcount.iloc[:-validation_horizon]
            test_exog = headcount.iloc[-validation_horizon:]

            try:
                model = SARIMAX(
                    train_series['count'],
                    exog=train_exog,
                    order=(1, 1, 1),
                    seasonal_order=(0, 1, 1, 7),
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                )
                fitted = model.fit(disp=False)

                # Validate
                test_forecast = fitted.get_forecast(
                    steps=validation_horizon,
                    exog=test_exog,
                )
                forecast_values = test_forecast.predicted_mean

                rmse = float(np.sqrt(np.mean(
                    (forecast_values - test_series['count']) ** 2
                )))
                mae = float(np.mean(np.abs(
                    forecast_values - test_series['count']
                )))
                mase = self._mase(test_series['count'], forecast_values, train_series['count'])

                # Refit on full data
                full_model = SARIMAX(
                    daily['count'],
                    exog=headcount,
                    order=(1, 1, 1),
                    seasonal_order=(0, 1, 1, 7),
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                )
                full_fitted = full_model.fit(disp=False)
                models[code] = full_fitted

                # Generate forecasts for each horizon
                max_horizon = max(forecast_horizons)
                future_exog = pd.DataFrame(
                    {'headcount': [headcount.iloc[-1]['headcount']] * max_horizon},
                )
                future_forecast = full_fitted.get_forecast(steps=max_horizon, exog=future_exog)
                future_values = future_forecast.predicted_mean

                forecast_index = pd.date_range(
                    daily.index[-1] + pd.Timedelta(days=1),
                    periods=max_horizon,
                    freq='D',
                )

                code_forecasts = []
                for h in forecast_horizons:
                    weekly_sum = float(max(0, future_values[:h].sum()))
                    code_forecasts.append({
                        'horizon_days': h,
                        'predicted_total': round(weekly_sum, 1),
                        'predicted_daily_avg': round(weekly_sum / h, 2),
                    })

                per_code_forecasts[code] = code_forecasts
                per_code_metrics[code] = {
                    'rmse': rmse,
                    'mae': mae,
                    'mase': mase,
                    'train_samples': int(len(train_series)),
                    'validation_samples': int(len(test_series)),
                }
            except Exception:
                # Skip codes that fail to converge
                continue

        if not models:
            raise ValueError('No se pudo entrenar ningún modelo de forecast.')

        # Aggregate metrics
        avg_rmse = np.mean([m['rmse'] for m in per_code_metrics.values()])
        avg_mase = np.mean([m['mase'] for m in per_code_metrics.values()])

        metrics: Dict[str, Any] = {
            'rmse_avg': float(avg_rmse),
            'mase_avg': float(avg_mase),
            'codes_trained': list(models.keys()),
            'per_code': per_code_metrics,
        }

        artifacts: Dict[str, Any] = {
            'forecasts_by_code': per_code_forecasts,
        }

        return TrainOutput(estimator=models, metrics=metrics, artifacts=artifacts)

    def _mase(
        self,
        actuals: pd.Series,
        forecast: pd.Series,
        insample: pd.Series,
    ) -> float:
        mae = float(np.mean(np.abs(actuals - forecast)))
        naive = float(np.mean(np.abs(insample.diff().dropna())))
        if naive == 0:
            return 0.0
        return mae / naive

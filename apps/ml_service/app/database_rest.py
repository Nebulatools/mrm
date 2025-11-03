"""
REST API-based database adapter for Supabase.

This module provides a drop-in replacement for the asyncpg-based Database class,
using Supabase REST API (PostgREST) instead of direct PostgreSQL connection.
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Optional

import httpx
import pandas as pd


# Mapping from SQL query constants to Supabase view names
SQL_TO_VIEW_MAP = {
    'ROTATION_FEATURES_SQL': 'ml_rotation_features',
    'ABSENTEEISM_SQL': 'ml_absenteeism_features',
    'ATTRITION_SQL': 'ml_attrition_features',
    'FORECAST_SQL': 'ml_forecast_features',
    'LIFECYCLE_SQL': 'ml_lifecycle_features',
    'PATTERNS_SQL': 'ml_patterns_features',
    'PRODUCTIVITY_SQL': 'ml_productivity_features',
}


class DatabaseREST:
    """
    REST API-based database adapter using Supabase PostgREST.

    Compatible interface with the asyncpg-based Database class.
    """

    def __init__(
        self,
        dsn: str,
        *,
        supabase_url: str,
        service_role_key: str,
        min_size: int = 1,
        max_size: int = 10,
    ) -> None:
        """
        Initialize REST API database adapter.

        Args:
            dsn: PostgreSQL DSN (not used, but kept for compatibility)
            supabase_url: Supabase project URL (e.g., https://xxx.supabase.co)
            service_role_key: Supabase service role key for auth
            min_size: Not used (kept for compatibility)
            max_size: Not used (kept for compatibility)
        """
        self._dsn = dsn
        self._supabase_url = supabase_url.rstrip('/')
        self._service_role_key = service_role_key
        self._client: Optional[httpx.AsyncClient] = None
        self._lock = asyncio.Lock()

        # Base headers for all requests
        self._headers = {
            'apikey': service_role_key,
            'Authorization': f'Bearer {service_role_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        }

    async def connect(self) -> httpx.AsyncClient:
        """Create and return HTTP client."""
        if self._client is None:
            async with self._lock:
                if self._client is None:
                    self._client = httpx.AsyncClient(
                        base_url=f'{self._supabase_url}/rest/v1',
                        headers=self._headers,
                        timeout=httpx.Timeout(30.0, connect=10.0),
                    )
        return self._client

    async def close(self) -> None:
        """Close HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    @asynccontextmanager
    async def acquire(self) -> AsyncIterator[httpx.AsyncClient]:
        """Acquire HTTP client (context manager for compatibility)."""
        client = await self.connect()
        yield client

    async def execute(self, query: str, *args: Any) -> str:
        """
        Execute query (not implemented for REST API).

        Raises:
            NotImplementedError: REST API doesn't support arbitrary SQL execution
        """
        raise NotImplementedError(
            'REST API does not support arbitrary SQL execution. '
            'Use fetch_dataframe() with predefined views instead.'
        )

    async def fetch(self, query: str, *args: Any) -> list[dict[str, Any]]:
        """
        Fetch query results (not implemented for REST API).

        Raises:
            NotImplementedError: REST API doesn't support arbitrary SQL execution
        """
        raise NotImplementedError(
            'REST API does not support arbitrary SQL queries. '
            'Use fetch_dataframe() with predefined views instead.'
        )

    def _detect_view_name(self, query: str) -> str:
        """
        Detect which Supabase view to query based on SQL content.

        This is a heuristic approach that looks for characteristic table names
        and query patterns to map to the correct view.

        Args:
            query: SQL query string

        Returns:
            View name to query

        Raises:
            ValueError: If view cannot be detected
        """
        query_lower = query.lower()

        # Direct table lookups
        if (
            'from empleados_sftp' in query_lower
            and 'select numero_empleado' in query_lower
            and 'clasificacion' in query_lower
            and 'neg_30d' not in query_lower
        ):
            return 'empleados_sftp'

        # Check for rotation features (most common)
        if 'target_rotacion' in query_lower or 'motivo_tipo' in query_lower:
            return 'ml_rotation_features'

        if 'motivos_baja' in query_lower:
            return 'motivos_baja'

        # Check for absenteeism features
        if 'target_ausentismo' in query_lower or 'month_start' in query_lower:
            if 'neg_prev_28d' in query_lower:
                return 'ml_absenteeism_features'

        # Check for attrition features
        if 'motivos_baja' in query_lower and 'fecha_baja' in query_lower:
            if 'tenure_days' in query_lower:
                return 'ml_attrition_features'

        # Check for forecast features
        if 'generate_series' in query_lower and 'day' in query_lower:
            return 'ml_forecast_features'

        # Check for lifecycle features
        if 'event_observed' in query_lower:
            return 'ml_lifecycle_features'

        # Check for patterns features
        if 'neg_rate_90d' in query_lower or 'dias_presentes_90d' in query_lower:
            return 'ml_patterns_features'

        # Check for productivity features
        if 'horas_trabajadas' in query_lower and 'month_start' in query_lower:
            return 'ml_productivity_features'

        # Default fallback: try rotation features (most common)
        return 'ml_rotation_features'

    async def fetch_dataframe(self, query: str, *args: Any) -> pd.DataFrame:
        """
        Fetch query results as pandas DataFrame.

        Args:
            query: SQL query string (used for view detection)
            *args: Query parameters (not used in REST API)

        Returns:
            DataFrame with query results
        """
        # Detect which view to query
        view_name = self._detect_view_name(query)

        client = await self.connect()

        try:
            results: list[dict[str, Any]] = []
            limit = 1000
            offset = 0
            total: Optional[int] = None

            while True:
                response = await client.get(
                    f'/{view_name}',
                    params={'select': '*', 'limit': limit, 'offset': offset},
                )
                response.raise_for_status()

                batch = response.json()
                if not batch:
                    break

                results.extend(batch)

                content_range = response.headers.get('content-range')
                if content_range:
                    try:
                        _, range_part = content_range.split(' ')
                        _, total_part = range_part.split('/')
                        total = int(total_part)
                    except (ValueError, IndexError):
                        total = None

                offset += limit
                if total is not None and offset >= total:
                    break
                if len(batch) < limit:
                    break

            if not results:
                return pd.DataFrame()

            return pd.DataFrame(results)

        except httpx.HTTPStatusError as e:
            # Better error messages
            if e.response.status_code == 404:
                raise ValueError(
                    f'View "{view_name}" not found. '
                    f'Make sure you have created the views in Supabase using setup_database_views.sql'
                ) from e
            elif e.response.status_code == 401:
                raise ValueError(
                    'Authentication failed. Check your SUPABASE_SERVICE_ROLE_KEY'
                ) from e
            else:
                raise ValueError(
                    f'HTTP {e.response.status_code}: {e.response.text}'
                ) from e
        except Exception as e:
            raise ValueError(
                f'Failed to fetch data from view "{view_name}": {str(e)}'
            ) from e

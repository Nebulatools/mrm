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


# Mapping from SQL query constants to Supabase view/table names
SQL_TO_VIEW_MAP = {
    'ROTATION_FEATURES_SQL': 'ml_employee_features',
    'ABSENTEEISM_SQL': 'ml_employee_features',
    'ATTRITION_SQL': 'mv_empleados_master',
    'FORECAST_SQL': 'mv_incidencias_enriquecidas',
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

    async def insert_rows(self, table: str, rows: list[dict]) -> int:
        """Insert rows into a Supabase table in batches of 500."""
        if not rows:
            return 0
        client = await self.connect()
        inserted = 0
        for i in range(0, len(rows), 500):
            batch = rows[i:i + 500]
            resp = await client.post(f'/{table}', json=batch)
            resp.raise_for_status()
            inserted += len(batch)
        return inserted

    async def rpc(self, function_name: str, params: dict | None = None) -> Any:
        """Call a Supabase RPC (database function)."""
        client = await self.connect()
        resp = await client.post(f'/rpc/{function_name}', json=params or {})
        resp.raise_for_status()
        return resp.json()

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

        # Gold layer tables
        if 'ml_employee_features' in query_lower:
            return 'ml_employee_features'
        if 'ml_predictions_log' in query_lower:
            return 'ml_predictions_log'
        if 'ml_weekly_snapshots' in query_lower:
            return 'ml_weekly_snapshots'

        # Silver layer materialized views
        if 'mv_empleados_master' in query_lower:
            return 'mv_empleados_master'
        if 'mv_incidencias_enriquecidas' in query_lower:
            return 'mv_incidencias_enriquecidas'

        # Direct table lookups
        if 'from empleados_sftp' in query_lower:
            return 'empleados_sftp'
        if 'from motivos_baja' in query_lower or 'motivos_baja' in query_lower:
            return 'motivos_baja'

        # Default fallback
        return 'ml_employee_features'

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

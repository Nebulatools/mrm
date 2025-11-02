from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Iterable, Optional

import asyncpg
import pandas as pd


class Database:
    """
    Simple async wrapper around asyncpg with helpers to return pandas DataFrames.
    """

    def __init__(self, dsn: str, *, min_size: int = 1, max_size: int = 10) -> None:
        self._dsn = dsn
        self._pool: Optional[asyncpg.Pool] = None
        self._min_size = min_size
        self._max_size = max_size
        self._lock = asyncio.Lock()

    async def connect(self) -> asyncpg.Pool:
        if self._pool is None:
            async with self._lock:
                if self._pool is None:
                    self._pool = await asyncpg.create_pool(
                        dsn=self._dsn,
                        min_size=self._min_size,
                        max_size=self._max_size,
                    )
        return self._pool

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    @asynccontextmanager
    async def acquire(self) -> AsyncIterator[asyncpg.Connection]:
        pool = await self.connect()
        async with pool.acquire() as connection:
            yield connection

    async def execute(self, query: str, *args: Any) -> str:
        async with self.acquire() as connection:
            return await connection.execute(query, *args)

    async def fetch(self, query: str, *args: Any) -> Iterable[asyncpg.Record]:
        async with self.acquire() as connection:
            return await connection.fetch(query, *args)

    async def fetch_dataframe(self, query: str, *args: Any) -> pd.DataFrame:
        records = await self.fetch(query, *args)
        if not records:
            return pd.DataFrame()
        df = pd.DataFrame(records, columns=records[0].keys())
        return df

"""Postgres access via the Supabase session pooler. RLS is on with no policies
on every table, so this connection (not the client) is the only thing that
can read or write data -- every query below scopes rows to the caller itself.
"""

from contextlib import contextmanager
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import get_settings

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(get_settings().database_url, min_size=1, max_size=10, open=True)
    return _pool


@contextmanager
def cursor():
    with get_pool().connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        yield cur


def query(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    with cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def one(sql: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: dict[str, Any] | None = None) -> None:
    with cursor() as cur:
        cur.execute(sql, params)

"""Postgres access via the Supabase session pooler. RLS is on with no policies
on every table, so this connection (not the client) is the only thing that
can read or write data -- every query below scopes rows to the caller itself.
"""

import time
from contextlib import contextmanager
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import get_settings

_pool: ConnectionPool | None = None


# The hosted pooler is ~175ms away, so round trips are the whole cost of a request.
# Autocommit drops the BEGIN/COMMIT around every single-statement query (3 trips -> 1),
# and only connections idle long enough to have been dropped get a health ping.
_IDLE_CHECK_S = 30


def _check_if_idle(conn) -> None:
    if time.monotonic() - getattr(conn, "_returned_at", 0) > _IDLE_CHECK_S:
        ConnectionPool.check_connection(conn)


def _mark_returned(conn) -> None:
    conn._returned_at = time.monotonic()


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            get_settings().database_url,
            min_size=1,
            max_size=10,
            open=True,
            kwargs={"autocommit": True},
            check=_check_if_idle,
            reset=_mark_returned,
        )
    return _pool


@contextmanager
def cursor():
    with get_pool().connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        yield cur


@contextmanager
def transaction():
    """For multi-statement work that must be atomic -- everything else autocommits."""
    with get_pool().connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
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

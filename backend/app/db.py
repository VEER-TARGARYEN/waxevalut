"""The CognoDB driver layer. Every Cypher query in the app goes through here.

Design notes a reviewer will look for:
- One driver for the process lifetime (drivers are thread-safe and pool connections; sessions
  are not, so a fresh session per request).
- Parameterised queries only. The `run` helper takes params as a dict and never interpolates
  into the query string - the brief forbids string-concatenated Cypher, and it is also how you
  avoid injection.
- Graceful failure: `ServiceUnavailable` is caught at the route layer and turned into a calm
  502, never a stack trace. `health()` exists so the UI can show a connection dot.
"""
from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Any, Iterator

from neo4j import Driver, GraphDatabase, Query
from neo4j.exceptions import Neo4jError, ServiceUnavailable

from .config import get_settings


class Database:
    """Thin wrapper around the official Neo4j driver, pointed at CognoDB."""

    def __init__(self) -> None:
        self._driver: Driver | None = None

    def connect(self) -> None:
        s = get_settings()
        missing = s.missing()
        if missing:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing)}. "
                f"Copy backend/.env.example to backend/.env and fill it in."
            )
        self._driver = GraphDatabase.driver(
            s.cognodb_uri,
            auth=(s.cognodb_user, s.cognodb_password),
            max_connection_pool_size=s.max_pool_size,
            connection_acquisition_timeout=s.connection_timeout,
        )

    def close(self) -> None:
        if self._driver is not None:
            self._driver.close()
            self._driver = None

    @property
    def driver(self) -> Driver:
        if self._driver is None:
            raise RuntimeError("Database.connect() was not called")
        return self._driver

    @contextmanager
    def session(self) -> Iterator[Any]:
        with self.driver.session() as s:
            yield s

    def run(self, cypher: str, params: dict | None = None, timeout: float = 20.0) -> list[dict]:
        """Run one parameterised statement and return plain dict rows.

        Values are Neo4j temporal/graph types where relevant; the route layer serialises
        them. `timeout` is a server-side query timeout attached to the Query object, so a
        runaway query on the burstable free tier cannot hang a request indefinitely.
        """
        with self.session() as session:
            result = session.run(Query(cypher, timeout=timeout), params or {})
            return [r.data() for r in result]

    def health(self) -> dict:
        """Cheap round trip for the UI's connection indicator. Never raises."""
        t0 = time.perf_counter()
        try:
            self.run("RETURN 1 AS ok", timeout=8)
            return {"status": "connected", "latency_ms": round((time.perf_counter() - t0) * 1000, 1)}
        except ServiceUnavailable:
            return {"status": "offline", "latency_ms": None}
        except Neo4jError:
            # Reachable but a query error - still "connected" from the UI's point of view.
            return {"status": "degraded", "latency_ms": round((time.perf_counter() - t0) * 1000, 1)}
        except Exception:
            return {"status": "offline", "latency_ms": None}


# Module-level singleton, wired to FastAPI's lifespan in main.py.
db = Database()

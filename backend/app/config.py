"""Configuration. Connection secrets come from the environment, never from a committed file.

The brief is explicit: "Connection details (URI, password) read from environment variables
never committed to the repository." So there is exactly one place secrets enter the process -
here - and .env is gitignored with a committed .env.example beside it.
"""
from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()  # reads .env if present; real deployments set real env vars instead


class Settings:
    # CognoDB connection. The URI looks like bolt+s://<id>.databases.cognodb.cloud
    cognodb_uri: str = os.environ.get("COGNODB_URI", "")
    cognodb_user: str = os.environ.get("COGNODB_USER", "cognodb")
    cognodb_password: str = os.environ.get("COGNODB_PASSWORD", "")

    # Driver pool settings - modest, because the free tier caps at 200 connections and the
    # app is single-user. Kept explicit rather than defaulted so they are reviewable.
    max_pool_size: int = int(os.environ.get("COGNODB_POOL_SIZE", "20"))
    connection_timeout: float = float(os.environ.get("COGNODB_CONN_TIMEOUT", "15"))

    # CORS - the front end runs on a different origin in dev and on its own host in prod.
    # Comma-separated list; "*" is allowed for the demo but say so.
    cors_origins: list[str] = [
        o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()
    ]

    # Seed/demo session id, so seeded facts are attributable to a known Session node.
    seed_session_id: str = os.environ.get("SEED_SESSION_ID", "sess_seed")

    def missing(self) -> list[str]:
        """Which required secrets are absent - used to fail loudly at startup, not mid-request."""
        out = []
        if not self.cognodb_uri:
            out.append("COGNODB_URI")
        if not self.cognodb_password:
            out.append("COGNODB_PASSWORD")
        return out


@lru_cache
def get_settings() -> Settings:
    return Settings()

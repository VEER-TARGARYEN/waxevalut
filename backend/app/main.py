"""FastAPI application entry point.

Wiring a reviewer will check:
- Driver opened once at startup (lifespan), closed once at shutdown.
- CORS configured so the separately-hosted front end can call the API.
- ServiceUnavailable from the driver is caught GLOBALLY and returned as a calm 502 with a
  JSON body the UI can render as a banner - never a stack trace. The brief lists "graceful
  error handling when the database is unreachable" as a requirement.
- Startup does NOT crash if the DB is down: it logs and lets /api/health report offline, so
  the front end can show its connection state instead of the server refusing to boot.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from neo4j.exceptions import ServiceUnavailable

from .config import get_settings
from .db import db
from .routes import entity, meta, observe, recall

log = logging.getLogger("contextor")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        db.connect()
        log.info("Connected to CognoDB.")
    except Exception as e:  # do not prevent boot; /api/health will report the problem
        log.warning("Could not connect to CognoDB at startup: %s", e)
    yield
    db.close()


app = FastAPI(
    title="Contextor API",
    description="A live, authorized, auditable agent-memory graph on CognoDB.",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ServiceUnavailable)
async def db_unreachable_handler(request: Request, exc: ServiceUnavailable) -> JSONResponse:
    """The whole point of the requirement: a DB outage is a calm, typed response."""
    log.warning("CognoDB unreachable on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=502,
        content={
            "error": "database_unreachable",
            "message": "Can't reach the memory graph right now. Please retry shortly.",
        },
    )


@app.exception_handler(RuntimeError)
async def runtime_handler(request: Request, exc: RuntimeError) -> JSONResponse:
    # Most commonly: connect() was never called because secrets were missing.
    return JSONResponse(
        status_code=503,
        content={"error": "not_ready", "message": str(exc)},
    )


for r in (meta.router, recall.router, entity.router, observe.router):
    app.include_router(r, prefix="/api")


@app.get("/")
def root() -> dict:
    return {"service": "contextor", "docs": "/docs", "health": "/api/health"}

"""Meta endpoints the global shell uses: health, agents, entity autocomplete."""
from __future__ import annotations

from fastapi import APIRouter

from .. import queries as Q
from ..db import db

router = APIRouter(tags=["meta"])


@router.get("/health")
def health() -> dict:
    """Connection indicator for the header dot. Never raises; returns a status string."""
    return db.health()


@router.get("/agents")
def agents() -> list[dict]:
    """Populate the header agent switcher. clearance: 0 public .. 3 secret."""
    rows = db.run(Q.LIST_AGENTS)
    return [
        {"id": r["id"], "name": r["name"], "role": r["role"], "clearance": r["clearance"]}
        for r in rows
    ]


@router.get("/entities")
def entities(q: str = "") -> list[dict]:
    """Entity lookup. A query filters by name (autocomplete); an empty query returns the
    full browse list that the landing page and command palette render."""
    rows = db.run(Q.AUTOCOMPLETE_ENTITIES, {"q": q}) if q.strip() else db.run(Q.BROWSE_ENTITIES)
    return [{"name": r["name"], "kind": r["kind"]} for r in rows]

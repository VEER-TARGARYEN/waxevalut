"""The write path: POST /api/observe. Records a new fact, optionally as a correction."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import queries as Q
from ..config import get_settings
from ..db import db
from ..serialize import data_class_level

router = APIRouter(tags=["observe"])


class ObserveRequest(BaseModel):
    entity: str
    kind: str = "entity"
    statement: str
    data_class: str = "internal"        # public | internal | pii | secret
    source_kind: str = "conversation"   # conversation | document | api
    source_uri: str = ""
    session_id: str | None = None
    supersedes_fact_id: str | None = None


@router.post("/observe")
def observe(req: ObserveRequest) -> dict:
    if not req.entity.strip() or not req.statement.strip():
        raise HTTPException(status_code=400, detail="entity and statement are required")

    fact_id = f"f_{uuid.uuid4().hex[:12]}"
    source_id = f"s_{uuid.uuid4().hex[:8]}"
    session_id = req.session_id or get_settings().seed_session_id
    level = data_class_level(req.data_class)

    rows = db.run(Q.WRITE_OBSERVATION, {
        "entity": req.entity.strip(),
        "kind": req.kind or "entity",
        "statement": req.statement.strip(),
        "data_class": req.data_class.lower(),
        "data_class_level": level,
        "fact_id": fact_id,
        "source_id": source_id,
        "source_kind": req.source_kind,
        "source_uri": req.source_uri or f"{req.source_kind}:{source_id}",
        "session_id": session_id,
        "session_agent": "operator",
    })
    if not rows:
        raise HTTPException(status_code=500, detail="write did not return a fact")

    # If this observation corrects an earlier fact, link the SUPERSEDES edge so the new fact
    # replaces the old one in default recall while the history stays walkable.
    if req.supersedes_fact_id:
        db.run(Q.WRITE_SUPERSEDES, {"new_fact_id": fact_id, "old_fact_id": req.supersedes_fact_id})

    return {"ok": True, "fact_id": fact_id, "entity": rows[0]["entity"]}

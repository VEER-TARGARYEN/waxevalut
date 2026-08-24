"""The core loop: POST /api/recall.

Given an acting agent and a query, return the authorized, bounded, source-cited answer plus
the token-savings figure. Authorization is enforced in the Cypher (clearance >= data_class),
not here - this route only assembles the response shape PAGES.md promises.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import queries as Q
from ..db import db
from ..serialize import fact_from_row, token_block

router = APIRouter(tags=["recall"])


class RecallRequest(BaseModel):
    agent_id: str
    query: str


@router.post("/recall")
def recall(req: RecallRequest) -> dict:
    q = req.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="query is required")

    agent_rows = db.run(Q.GET_AGENT, {"agent_id": req.agent_id})
    if not agent_rows:
        raise HTTPException(status_code=404, detail=f"unknown agent '{req.agent_id}'")
    agent = agent_rows[0]
    clearance = agent["clearance"]

    matched = db.run(Q.RECALL_MATCHED_ENTITIES, {"index": Q.FULLTEXT_INDEX, "q": q})

    # The read path returns non-superseded facts about the matched entities; we filter by
    # clearance here so the "packet" the model would see is exactly what the agent may read.
    rows = db.run(Q.RECALL, {"index": Q.FULLTEXT_INDEX, "q": q})
    visible = [r for r in rows if (r.get("data_class_level") or 0) <= clearance]
    facts = [fact_from_row(r) for r in visible]

    redacted = db.run(
        Q.RECALL_REDACTED_COUNT, {"index": Q.FULLTEXT_INDEX, "q": q, "clearance": clearance}
    )
    redacted_count = redacted[0]["redacted"] if redacted else 0

    corpus = db.run(Q.RECALL_CORPUS_BASELINE, {"index": Q.FULLTEXT_INDEX, "q": q})
    corpus_chars = (corpus[0]["corpus_chars"] or 0) if corpus else 0
    packet_chars = sum(len(f["statement"] or "") for f in facts)

    return {
        "query": q,
        "agent": {
            "id": agent["id"], "name": agent["name"],
            "role": agent["role"], "clearance": clearance,
        },
        "matched_entities": [
            {"name": m["name"], "kind": m["kind"], "score": round(m["score"], 4)}
            for m in matched
        ],
        "facts": facts,
        "redacted_count": redacted_count,
        "redacted_reason": "requires higher clearance" if redacted_count else None,
        "tokens": token_block(corpus_chars, packet_chars),
    }

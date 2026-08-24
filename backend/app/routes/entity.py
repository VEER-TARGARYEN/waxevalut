"""Entity detail, impact/blast-radius, graph neighbourhood, and fact provenance."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from .. import queries as Q
from ..db import db
from ..serialize import fact_from_row, iso

router = APIRouter(tags=["entity"])


def _clearance(agent_id: str) -> int:
    rows = db.run(Q.GET_AGENT, {"agent_id": agent_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"unknown agent '{agent_id}'")
    return rows[0]["clearance"]


@router.get("/entity/{name}")
def entity_detail(
    name: str,
    agent_id: str = Query(...),
    as_of: str | None = Query(None, description="ISO timestamp for time-travel; null = now"),
) -> dict:
    clearance = _clearance(agent_id)

    header = db.run(Q.ENTITY_HEADER, {"name": name})
    if not header:
        raise HTTPException(status_code=404, detail=f"unknown entity '{name}'")
    h = header[0]

    fact_rows = db.run(
        Q.ENTITY_FACTS, {"name": name, "clearance": clearance, "as_of": as_of}
    )
    facts = [fact_from_row({**r, "entity": name}) for r in fact_rows]

    redacted = db.run(Q.ENTITY_REDACTED_COUNT, {"name": name, "clearance": clearance})
    redacted_count = redacted[0]["redacted"] if redacted else 0

    corr_rows = db.run(Q.ENTITY_CORRECTIONS, {"name": name, "clearance": clearance})
    corrections = [
        {
            "old": {"id": c["old_id"], "statement": c["old_statement"], "observed_at": iso(c["old_observed"])},
            "new": {"id": c["new_id"], "statement": c["new_statement"], "observed_at": iso(c["new_observed"])},
        }
        for c in corr_rows
    ]

    rel_rows = db.run(Q.ENTITY_RELATIONS, {"name": name})
    relations = [
        {"type": r["type"], "target": r["target"], "target_kind": r["target_kind"]}
        for r in rel_rows
    ]

    return {
        "entity": {"name": h["name"], "kind": h["kind"], "created_at": iso(h["created_at"])},
        "facts": facts,
        "redacted_count": redacted_count,
        "corrections": corrections,
        "relations": relations,
        "as_of": as_of,
    }


@router.get("/entity/{name}/impact")
def entity_impact(
    name: str, agent_id: str = Query(...), depth: int = Query(3, ge=1, le=3)
) -> dict:
    clearance = _clearance(agent_id)
    if not db.run(Q.ENTITY_HEADER, {"name": name}):
        raise HTTPException(status_code=404, detail=f"unknown entity '{name}'")
    rows = db.run(Q.ENTITY_IMPACT, {"name": name, "clearance": clearance})
    return {
        "root": name,
        "reached": [
            {"entity": r["entity"], "hops": r["hops"], "what_we_know": r["what_we_know"]}
            for r in rows
        ],
    }


@router.get("/entity/{name}/graph")
def entity_graph(
    name: str, agent_id: str = Query(...), depth: int = Query(2, ge=0, le=3)
) -> dict:
    clearance = _clearance(agent_id)
    if not db.run(Q.ENTITY_HEADER, {"name": name}):
        raise HTTPException(status_code=404, detail=f"unknown entity '{name}'")

    rows = db.run(Q.graph_neighbourhood(depth), {"name": name, "clearance": clearance})

    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    def add(node_id: str, node: dict) -> None:
        if node_id and node_id not in nodes:
            nodes[node_id] = node

    for r in rows:
        ent_id = f"e_{r['entity']}"
        add(ent_id, {"id": ent_id, "label": r["entity"], "type": "entity", "kind": r["entity_kind"]})
        if r.get("fact_id"):
            fid = f"f_{r['fact_id']}"
            add(fid, {"id": fid, "label": (r["fact_statement"] or "")[:60],
                      "type": "fact", "data_class": r["fact_class"]})
            edges.append({"source": fid, "target": ent_id, "type": "ABOUT"})
            if r.get("source_id"):
                sid = f"s_{r['source_id']}"
                add(sid, {"id": sid, "label": r["source_uri"], "type": "source", "kind": r["source_kind"]})
                edges.append({"source": fid, "target": sid, "type": "SOURCED_FROM"})

    if depth >= 1:  # a 0-hop view is just the anchor entity and its own facts, no edges
        for r in db.run(Q.graph_entity_edges(depth), {"name": name}):
            if r["source"] and r["target"]:
                edges.append({
                    "source": f"e_{r['source']}", "target": f"e_{r['target']}",
                    "type": r.get("type") or "RELATES_TO",
                })

    redacted = db.run(Q.ENTITY_REDACTED_COUNT, {"name": name, "clearance": clearance})
    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "redacted_count": redacted[0]["redacted"] if redacted else 0,
    }


@router.get("/fact/{fact_id}/provenance")
def fact_provenance(fact_id: str) -> dict:
    rows = db.run(Q.FACT_PROVENANCE, {"fact_id": fact_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"unknown fact '{fact_id}'")
    r = rows[0]
    return {
        "fact": {
            "id": r["fact_id"], "statement": r["statement"],
            "data_class": r["data_class"], "observed_at": iso(r["observed_at"]),
            "entity": r["entity"],
        },
        "source": {
            "id": r["source_id"], "kind": r["source_kind"],
            "uri": r["source_uri"], "ingested_at": iso(r["source_ingested"]),
        },
        "session": {
            "id": r["session_id"], "agent": r["session_agent"],
            "started_at": iso(r["session_started"]),
        },
        # The on-thesis touch: show the parameterised Cypher that retrieved this. Ties to
        # CognoDB's own line - "the query it ran is the citation for what it recalled."
        "retrieval_cypher": Q.ENTITY_FACTS.strip(),
    }

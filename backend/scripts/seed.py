#!/usr/bin/env python3
"""Seed the CognoDB graph with a realistic IT-incident / customer-support memory.

Domain: a B2B SaaS company's support + operations knowledge. Entities are customers,
services, people and incidents; facts are observations recorded by agents from tickets,
documents and API calls. The data is chosen to exercise every feature the app demonstrates:

- multi-hop RELATES_TO chains (customer -> service -> upstream service) for blast radius
- facts across all four data classes, so the authorization toggle has something to hide
- SUPERSEDES corrections, so the timeline / time-travel view has history to show
- a full-text index on entity names, so fuzzy recall works

Idempotent: MERGE on entities/sources/sessions, and the whole seed is wiped-then-rebuilt
under the :Seed marker so re-running is safe. Uses only openCypher that runs on CognoDB's
free tier - verified 2026-08-24.

    python scripts/seed.py            # wipe seed data and reload
    python scripts/seed.py --keep     # add without wiping (for demos mid-session)
"""
from __future__ import annotations

import argparse
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv
from neo4j import GraphDatabase, Query

from app.queries import (  # noqa: E402
    CREATE_ENTITY_ID_INDEX,
    CREATE_FACT_ID_INDEX,
    CREATE_FULLTEXT_INDEX,
    DATA_CLASS_LEVEL,
)

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

URI = os.environ.get("COGNODB_URI", "")
USER = os.environ.get("COGNODB_USER", "cognodb")
PWD = os.environ.get("COGNODB_PASSWORD", "")

# ── the world ────────────────────────────────────────────────────────────────────
# entities: (name, kind)
ENTITIES = [
    ("Acme Corporation", "account"), ("Globex Industries", "account"),
    ("Initech LLC", "account"), ("Umbrella Health", "account"),
    ("Billing Service", "service"), ("Payments API", "service"),
    ("Auth Gateway", "service"), ("Notification Service", "service"),
    ("Data Warehouse", "service"),
    ("Jane Okafor", "person"), ("Marcus Lee", "person"), ("Priya Nair", "person"),
    ("INC-4471", "incident"), ("INC-4488", "incident"), ("INC-4501", "incident"),
]

# typed relationships: (source, type, target)
RELATIONS = [
    ("Acme Corporation", "depends_on", "Billing Service"),
    ("Globex Industries", "depends_on", "Billing Service"),
    ("Initech LLC", "depends_on", "Auth Gateway"),
    ("Umbrella Health", "depends_on", "Notification Service"),
    ("Billing Service", "depends_on", "Payments API"),
    ("Billing Service", "depends_on", "Auth Gateway"),
    ("Payments API", "depends_on", "Data Warehouse"),
    ("Notification Service", "depends_on", "Auth Gateway"),
    ("INC-4471", "affects", "Payments API"),
    ("INC-4488", "affects", "Auth Gateway"),
    ("INC-4501", "affects", "Notification Service"),
    ("Jane Okafor", "works_on", "Billing Service"),
    ("Marcus Lee", "works_on", "Auth Gateway"),
    ("Priya Nair", "works_on", "Payments API"),
    ("Jane Okafor", "contact_for", "Acme Corporation"),
]

# facts: (entity, statement, data_class, source_kind, source_uri, observed_at)
# observed_at is an ISO date; kept explicit so the timeline has a real spread.
FACTS = [
    ("Acme Corporation", "Acme upgraded to the Enterprise plan.", "internal", "document", "contract-2026-07.pdf", "2026-07-14T09:20:00Z"),
    ("Acme Corporation", "Primary billing contact is Jane Okafor.", "internal", "conversation", "ticket #4471", "2026-07-15T11:00:00Z"),
    ("Acme Corporation", "Acme's account card ending 4242 expires 2026-11.", "pii", "api", "stripe:cus_ACME", "2026-07-16T08:00:00Z"),
    ("Acme Corporation", "Acme raised a billing dispute over a duplicate charge.", "internal", "conversation", "ticket #4471", "2026-08-20T14:30:00Z"),
    ("Acme Corporation", "Internal note: Acme renewal at risk, exec escalation.", "secret", "conversation", "slack:#accounts", "2026-08-21T16:00:00Z"),
    ("Globex Industries", "Globex is on the Growth plan, 40 seats.", "internal", "document", "order-2026-03.pdf", "2026-03-02T10:00:00Z"),
    ("Globex Industries", "Globex reported intermittent 502s on checkout.", "internal", "conversation", "ticket #4482", "2026-08-19T09:10:00Z"),
    ("Initech LLC", "Initech uses SSO via the Auth Gateway.", "internal", "document", "onboarding.md", "2026-05-11T13:00:00Z"),
    ("Initech LLC", "Initech admin email is admin@initech.example.", "pii", "api", "crm:initech", "2026-05-11T13:05:00Z"),
    ("Umbrella Health", "Umbrella is a HIPAA-covered entity; PHI handling applies.", "secret", "document", "dpa-umbrella.pdf", "2026-02-20T09:00:00Z"),
    ("Umbrella Health", "Umbrella relies on the Notification Service for alerts.", "internal", "document", "arch-review.md", "2026-06-01T09:00:00Z"),
    ("Billing Service", "Billing Service p95 latency is 180ms under normal load.", "internal", "api", "grafana:billing", "2026-08-01T00:00:00Z"),
    ("Billing Service", "Billing Service depends on Payments API and Auth Gateway.", "public", "document", "arch-review.md", "2026-06-01T09:00:00Z"),
    ("Payments API", "Payments API had a 22-minute outage during INC-4471.", "internal", "conversation", "ticket #4471", "2026-08-20T14:00:00Z"),
    ("Payments API", "Payments API rotates credentials every 30 days.", "secret", "document", "runbook-payments.md", "2026-07-01T09:00:00Z"),
    ("Auth Gateway", "Auth Gateway rate limit is 1000 req/min per tenant.", "public", "document", "api-docs.md", "2026-04-01T09:00:00Z"),
    ("Auth Gateway", "Auth Gateway certificate renews 2026-10-15.", "internal", "api", "cert-manager", "2026-08-10T09:00:00Z"),
    ("Notification Service", "Notification Service uses Auth Gateway for tenant scoping.", "public", "document", "arch-review.md", "2026-06-01T09:00:00Z"),
    ("Jane Okafor", "Jane Okafor is the on-call lead for Billing this week.", "internal", "api", "pagerduty", "2026-08-18T09:00:00Z"),
    ("Marcus Lee", "Marcus Lee owns the Auth Gateway service.", "internal", "document", "org-chart.md", "2026-01-10T09:00:00Z"),
    ("INC-4471", "INC-4471: duplicate charge caused by a Payments API retry storm.", "internal", "conversation", "ticket #4471", "2026-08-20T15:00:00Z"),
    ("INC-4471", "INC-4471 root cause: missing idempotency key on retry.", "internal", "document", "postmortem-4471.md", "2026-08-22T10:00:00Z"),
    ("INC-4488", "INC-4488: Auth Gateway latency spike from cert reload.", "internal", "conversation", "ticket #4488", "2026-08-11T09:30:00Z"),
]

# corrections: (entity, old_statement_substring, new_statement, new_data_class, source_uri, observed_at)
# The seed writes the new fact and links SUPERSEDES to the matching older fact.
CORRECTIONS = [
    ("Acme Corporation", "Primary billing contact is Jane Okafor",
     "Primary billing contact is Marcus Lee (Jane moved teams).", "internal",
     "ticket #4471", "2026-08-25T10:00:00Z"),
    ("Globex Industries", "Growth plan, 40 seats",
     "Globex upgraded to the Growth plan, 65 seats.", "internal",
     "order-2026-08.pdf", "2026-08-05T10:00:00Z"),
]

AGENTS = [
    ("support_bot", "Support Bot", "L1 Support", 1),      # sees public+internal
    ("field_agent", "Field Agent", "L2 Field", 1),
    ("pii_bot", "Data Bot", "Data (PII)", 2),             # +pii
    ("finance_bot", "Finance Bot", "Finance", 3),          # everything
    ("public_bot", "Public Bot", "Public", 0),             # public only
]

SEED_SESSION = os.environ.get("SEED_SESSION_ID", "sess_seed")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--keep", action="store_true", help="do not wipe existing seed data first")
    args = ap.parse_args()

    if not URI or not PWD:
        print("Set COGNODB_URI and COGNODB_PASSWORD in backend/.env first.", file=sys.stderr)
        return 2

    driver = GraphDatabase.driver(URI, auth=(USER, PWD))

    def run(cypher: str, **params):
        with driver.session() as s:
            return [r.data() for r in s.run(Query(cypher, timeout=60), params)]

    print("Ensuring indexes...")
    for ddl in (CREATE_FULLTEXT_INDEX, CREATE_ENTITY_ID_INDEX, CREATE_FACT_ID_INDEX):
        run(ddl)

    if not args.keep:
        print("Wiping existing seed data (:Seed marker)...")
        # Delete facts/sources/sessions/entities/agents this seed created. We tag everything
        # with :Seed so we never touch data from other assignments in the same instance.
        run("MATCH (n:Seed) DETACH DELETE n")

    print(f"Creating {len(AGENTS)} agents...")
    for aid, name, role, clearance in AGENTS:
        run(
            "MERGE (a:Agent:Seed {id: $id}) SET a.name=$name, a.role=$role, a.clearance=$clearance",
            id=aid, name=name, role=role, clearance=clearance,
        )

    print(f"Creating {len(ENTITIES)} entities...")
    for name, kind in ENTITIES:
        run(
            "MERGE (e:Entity:Seed {name: $name}) ON CREATE SET e.kind=$kind, e.created_at=datetime()",
            name=name, kind=kind,
        )

    print(f"Creating {len(RELATIONS)} relationships...")
    for src, typ, tgt in RELATIONS:
        run(
            "MATCH (a:Entity {name:$src}), (b:Entity {name:$tgt}) "
            "MERGE (a)-[r:RELATES_TO {type:$typ}]->(b)",
            src=src, tgt=tgt, typ=typ,
        )

    # Keep a handle from statement-substring to fact id, so corrections can find their target.
    fact_ids: dict[tuple[str, str], str] = {}

    print(f"Creating {len(FACTS)} facts...")
    for entity, statement, dclass, skind, suri, observed in FACTS:
        fid = f"f_{uuid.uuid4().hex[:12]}"
        sid = f"s_{uuid.uuid4().hex[:8]}"
        run(
            """
            MATCH (e:Entity {name:$entity})
            CREATE (f:Fact:Seed {id:$fid, statement:$statement, observed_at:datetime($observed),
                                 data_class:$dclass, data_class_level:$level})
            MERGE (s:Source:Seed {id:$sid}) ON CREATE SET s.kind=$skind, s.uri=$suri, s.ingested_at=datetime($observed)
            MERGE (ses:Session:Seed {id:$session}) ON CREATE SET ses.agent='ingestor', ses.started_at=datetime($observed)
            CREATE (f)-[:ABOUT]->(e)
            CREATE (f)-[:SOURCED_FROM]->(s)
            CREATE (f)-[:OBSERVED_IN]->(ses)
            """,
            entity=entity, fid=fid, statement=statement, observed=observed,
            dclass=dclass, level=DATA_CLASS_LEVEL[dclass],
            sid=sid, skind=skind, suri=suri, session=SEED_SESSION,
        )
        fact_ids[(entity, statement)] = fid

    print(f"Applying {len(CORRECTIONS)} corrections (SUPERSEDES)...")
    for entity, old_sub, new_statement, dclass, suri, observed in CORRECTIONS:
        old_id = next((fid for (e, st), fid in fact_ids.items() if e == entity and old_sub in st), None)
        if not old_id:
            print(f"  WARN: no fact matching '{old_sub}' for {entity}; skipping correction")
            continue
        new_id = f"f_{uuid.uuid4().hex[:12]}"
        sid = f"s_{uuid.uuid4().hex[:8]}"
        run(
            """
            MATCH (e:Entity {name:$entity}), (old:Fact {id:$old_id})
            CREATE (f:Fact:Seed {id:$new_id, statement:$statement, observed_at:datetime($observed),
                                 data_class:$dclass, data_class_level:$level})
            MERGE (s:Source:Seed {id:$sid}) ON CREATE SET s.kind='conversation', s.uri=$suri, s.ingested_at=datetime($observed)
            MERGE (ses:Session:Seed {id:$session})
            CREATE (f)-[:ABOUT]->(e)
            CREATE (f)-[:SOURCED_FROM]->(s)
            CREATE (f)-[:OBSERVED_IN]->(ses)
            CREATE (f)-[:SUPERSEDES]->(old)
            """,
            entity=entity, old_id=old_id, new_id=new_id, statement=new_statement,
            observed=observed, dclass=dclass, level=DATA_CLASS_LEVEL[dclass],
            sid=sid, suri=suri, session=SEED_SESSION,
        )

    counts = run(
        "MATCH (e:Entity:Seed) WITH count(e) AS entities "
        "MATCH (f:Fact:Seed) WITH entities, count(f) AS facts "
        "MATCH (:Fact:Seed)-[r:SUPERSEDES]->() RETURN entities, facts, count(r) AS corrections"
    )
    c = counts[0] if counts else {}
    print(f"\nSeeded: {c.get('entities')} entities, {c.get('facts')} facts, "
          f"{c.get('corrections')} corrections.")
    print("Full-text index 'entity_names' is ready. Try: POST /api/recall {agent_id:'support_bot', query:'Acme'}")
    driver.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Every Cypher query the app runs, in one place, parameterised.

Schema (CognoDB's own taught agent-memory model, extended with authorization):

    (:Entity  {name, kind, created_at})
    (:Fact    {id, statement, observed_at, data_class, data_class_level})
    (:Source  {id, kind, uri, ingested_at})
    (:Session {id, agent, started_at})
    (:Agent   {id, name, role, clearance})

    (:Fact)-[:ABOUT]->(:Entity)
    (:Fact)-[:SOURCED_FROM]->(:Source)
    (:Fact)-[:OBSERVED_IN]->(:Session)
    (:Fact)-[:SUPERSEDES]->(:Fact)          // correction: newer fact -> older fact
    (:Entity)-[:RELATES_TO {type}]->(:Entity)

Authorization is enforced IN the query, not in Python: a fact is visible only when the
acting agent's clearance >= the fact's data_class_level. That is the point of the whole demo
- "permissions travel with the node" (Wexa's phrasing) - so it must live in the traversal.

DATA_CLASS levels: public=0, internal=1, pii=2, secret=3.

All queries verified runnable against a live CognoDB free-tier instance on 2026-08-24:
db.index.fulltext.queryNodes (BM25), datetime(), MERGE, variable-length paths, and the
negative-pattern predicate WHERE NOT (f)<-[:SUPERSEDES]-(:Fact).
"""
from __future__ import annotations

DATA_CLASS_LEVEL = {"public": 0, "internal": 1, "pii": 2, "secret": 3}
LEVEL_DATA_CLASS = {v: k for k, v in DATA_CLASS_LEVEL.items()}

FULLTEXT_INDEX = "entity_names"

# ── schema / indexes ────────────────────────────────────────────────────────────
# Run once at seed time. IF NOT EXISTS makes it idempotent.
CREATE_FULLTEXT_INDEX = (
    f"CREATE FULLTEXT INDEX {FULLTEXT_INDEX} IF NOT EXISTS "
    "FOR (e:Entity) ON EACH [e.name]"
)
CREATE_ENTITY_ID_INDEX = "CREATE INDEX entity_name IF NOT EXISTS FOR (e:Entity) ON (e.name)"
CREATE_FACT_ID_INDEX = "CREATE INDEX fact_id IF NOT EXISTS FOR (f:Fact) ON (f.id)"

# ── health / meta ───────────────────────────────────────────────────────────────
LIST_AGENTS = """
MATCH (a:Agent)
RETURN a.id AS id, a.name AS name, a.role AS role, a.clearance AS clearance
ORDER BY a.clearance, a.name
"""

AUTOCOMPLETE_ENTITIES = """
MATCH (e:Entity)
WHERE toLower(e.name) CONTAINS toLower($q)
RETURN e.name AS name, e.kind AS kind
ORDER BY e.name
LIMIT 10
"""

# Browse list for an empty query - powers the landing page's "Explore" section and the
# command palette's empty state. Grouped by kind on the client.
BROWSE_ENTITIES = """
MATCH (e:Entity)
RETURN e.name AS name, e.kind AS kind
ORDER BY e.kind, e.name
LIMIT 100
"""

GET_AGENT = """
MATCH (a:Agent {id: $agent_id})
RETURN a.id AS id, a.name AS name, a.role AS role, a.clearance AS clearance
"""

# ── the read path: authorized, bounded, newest-first, source-cited ───────────────
# This is THE query. Full-text entity match, then facts about the matched entities,
# filtered by the acting agent's clearance, corrections hidden, provenance carried.
RECALL = """
CALL db.index.fulltext.queryNodes($index, $q) YIELD node AS e, score
WITH e, score
ORDER BY score DESC
LIMIT 5
MATCH (e)<-[:ABOUT]-(f:Fact)-[:SOURCED_FROM]->(src:Source)
WHERE NOT (f)<-[:SUPERSEDES]-(:Fact)
WITH e, score, f, src
ORDER BY f.observed_at DESC
RETURN e.name AS entity, score,
       f.id AS fact_id, f.statement AS statement,
       f.data_class AS data_class, f.data_class_level AS data_class_level,
       f.observed_at AS observed_at,
       src.id AS source_id, src.kind AS source_kind, src.uri AS source_uri
LIMIT 60
"""

# The matched entities themselves (for the "matched_entities" response block and to bound
# the token-corpus baseline). Kept separate so the recall payload stays flat.
RECALL_MATCHED_ENTITIES = """
CALL db.index.fulltext.queryNodes($index, $q) YIELD node AS e, score
RETURN e.name AS name, e.kind AS kind, score
ORDER BY score DESC
LIMIT 5
"""

# Token-corpus baseline: EVERY fact (any class, superseded or not) in the k-hop neighbourhood
# of the matched entities. This is what a naive "dump the corpus" retrieval would have sent;
# the app compares it against the bounded, authorized packet the read path returns.
RECALL_CORPUS_BASELINE = """
CALL db.index.fulltext.queryNodes($index, $q) YIELD node AS e
WITH collect(e) AS anchors
UNWIND anchors AS a
MATCH (a)-[:RELATES_TO*0..3]-(:Entity)<-[:ABOUT]-(f:Fact)
RETURN sum(size(f.statement)) AS corpus_chars, count(DISTINCT f) AS corpus_facts
"""

# Count of facts the acting agent could NOT see (redacted), for the "🔒 N hidden" row.
RECALL_REDACTED_COUNT = """
CALL db.index.fulltext.queryNodes($index, $q) YIELD node AS e
MATCH (e)<-[:ABOUT]-(f:Fact)
WHERE NOT (f)<-[:SUPERSEDES]-(:Fact)
  AND f.data_class_level > $clearance
RETURN count(f) AS redacted
"""

# ── entity detail ────────────────────────────────────────────────────────────────
ENTITY_HEADER = """
MATCH (e:Entity {name: $name})
RETURN e.name AS name, e.kind AS kind, e.created_at AS created_at
"""

# Facts about an entity, authorized, optionally "as of" a timestamp for time-travel.
#
# A fact is shown when it existed by $as_of AND no *qualifying* correction existed by then.
# The correction test uses OPTIONAL MATCH + "newer IS NULL" rather than EXISTS{...WHERE...}:
# CognoDB (verified 2026-08-24) ignores the inner WHERE of an EXISTS subquery, which would
# make a fact read as superseded even before its correction was recorded, breaking
# time-travel. The OPTIONAL MATCH form is portable and evaluated correctly everywhere.
ENTITY_FACTS = """
MATCH (e:Entity {name: $name})<-[:ABOUT]-(f:Fact)-[:SOURCED_FROM]->(src:Source)
WHERE f.data_class_level <= $clearance
  AND ($as_of IS NULL OR f.observed_at <= datetime($as_of))
OPTIONAL MATCH (f)<-[:SUPERSEDES]-(newer:Fact)
  WHERE ($as_of IS NULL OR newer.observed_at <= datetime($as_of))
WITH f, src, newer
WHERE newer IS NULL
RETURN f.id AS fact_id, f.statement AS statement,
       f.data_class AS data_class, f.data_class_level AS data_class_level,
       f.observed_at AS observed_at,
       src.id AS source_id, src.kind AS source_kind, src.uri AS source_uri
ORDER BY f.observed_at DESC
LIMIT 100
"""

ENTITY_REDACTED_COUNT = """
MATCH (e:Entity {name: $name})<-[:ABOUT]-(f:Fact)
WHERE NOT (f)<-[:SUPERSEDES]-(:Fact) AND f.data_class_level > $clearance
RETURN count(f) AS redacted
"""

# Correction chains for the timeline: newer fact SUPERSEDES older.
ENTITY_CORRECTIONS = """
MATCH (e:Entity {name: $name})<-[:ABOUT]-(newer:Fact)-[:SUPERSEDES]->(older:Fact)
WHERE newer.data_class_level <= $clearance
RETURN older.id AS old_id, older.statement AS old_statement, older.observed_at AS old_observed,
       newer.id AS new_id, newer.statement AS new_statement, newer.observed_at AS new_observed
ORDER BY newer.observed_at DESC
"""

# Typed cross-entity links for the "relations" block.
ENTITY_RELATIONS = """
MATCH (e:Entity {name: $name})-[r:RELATES_TO]->(t:Entity)
RETURN r.type AS type, t.name AS target, t.kind AS target_kind
ORDER BY t.name
"""

# ── impact / blast radius: the "SQL finds this awkward" query ────────────────────
ENTITY_IMPACT = """
MATCH path = (start:Entity {name: $name})-[:RELATES_TO*1..3]-(reached:Entity)
WITH DISTINCT reached, min(length(path)) AS hops
MATCH (reached)<-[:ABOUT]-(f:Fact)-[:SOURCED_FROM]->(src:Source)
WHERE f.data_class_level <= $clearance AND NOT (f)<-[:SUPERSEDES]-(:Fact)
WITH reached, hops, collect(f.statement)[0..3] AS what_we_know
RETURN reached.name AS entity, hops, what_we_know
ORDER BY hops, entity
LIMIT 50
"""

# ── graph neighbourhood for the visual explorer ──────────────────────────────────
# Returns entity + fact + source nodes and their edges within `depth` hops, authorized.
GRAPH_NEIGHBOURHOOD = """
MATCH (root:Entity {name: $name})
OPTIONAL MATCH (root)-[rel:RELATES_TO*0..%(depth)d]-(e:Entity)
WITH collect(DISTINCT root) + collect(DISTINCT e) AS ents
UNWIND ents AS e
WITH DISTINCT e
OPTIONAL MATCH (e)<-[:ABOUT]-(f:Fact)-[:SOURCED_FROM]->(src:Source)
WHERE f IS NULL OR (f.data_class_level <= $clearance AND NOT (f)<-[:SUPERSEDES]-(:Fact))
RETURN e.name AS entity, e.kind AS entity_kind,
       f.id AS fact_id, f.statement AS fact_statement, f.data_class AS fact_class,
       src.id AS source_id, src.uri AS source_uri, src.kind AS source_kind
LIMIT 200
"""

# Edges between entities, for the graph view. `relationships(path)` yields the actual
# relationship objects along a variable-length path (UNWIND over the raw path variable would
# hand back path segments, which startNode/endNode reject).
GRAPH_ENTITY_EDGES = """
MATCH path = (a:Entity {name: $name})-[:RELATES_TO*1..%(depth)d]-(:Entity)
UNWIND relationships(path) AS rel
WITH DISTINCT startNode(rel) AS s, endNode(rel) AS t, rel.type AS type
RETURN s.name AS source, t.name AS target, type
"""

# ── provenance drawer ────────────────────────────────────────────────────────────
FACT_PROVENANCE = """
MATCH (f:Fact {id: $fact_id})-[:SOURCED_FROM]->(src:Source)
OPTIONAL MATCH (f)-[:OBSERVED_IN]->(ses:Session)
OPTIONAL MATCH (f)-[:ABOUT]->(e:Entity)
RETURN f.id AS fact_id, f.statement AS statement, f.data_class AS data_class,
       f.observed_at AS observed_at, e.name AS entity,
       src.id AS source_id, src.kind AS source_kind, src.uri AS source_uri,
       src.ingested_at AS source_ingested,
       ses.id AS session_id, ses.agent AS session_agent, ses.started_at AS session_started
"""

# ── write path: idempotent observation (CognoDB's taught pattern, ACID) ──────────
WRITE_OBSERVATION = """
MERGE (e:Entity {name: $entity})
  ON CREATE SET e.kind = $kind, e.created_at = datetime()
CREATE (f:Fact {
  id: $fact_id, statement: $statement,
  observed_at: datetime(), data_class: $data_class, data_class_level: $data_class_level
})
MERGE (s:Source {id: $source_id})
  ON CREATE SET s.kind = $source_kind, s.uri = $source_uri, s.ingested_at = datetime()
MERGE (ses:Session {id: $session_id})
  ON CREATE SET ses.agent = $session_agent, ses.started_at = datetime()
CREATE (f)-[:ABOUT]->(e)
CREATE (f)-[:SOURCED_FROM]->(s)
CREATE (f)-[:OBSERVED_IN]->(ses)
RETURN f.id AS fact_id, e.name AS entity
"""

# Optional: link a new fact as a correction of an existing one.
WRITE_SUPERSEDES = """
MATCH (newer:Fact {id: $new_fact_id}), (older:Fact {id: $old_fact_id})
CREATE (newer)-[:SUPERSEDES]->(older)
RETURN older.id AS superseded
"""


def graph_neighbourhood(depth: int) -> str:
    depth = max(0, min(depth, 3))
    return GRAPH_NEIGHBOURHOOD % {"depth": depth}


def graph_entity_edges(depth: int) -> str:
    depth = max(0, min(depth, 3))
    return GRAPH_ENTITY_EDGES % {"depth": depth}

# WaxeValut

**A live, authorized, auditable agent-memory graph — built on [CognoDB](https://cognodb.com).**

Feed it observations from conversations and documents; it stores them as an
entity–fact–source graph. Ask *"what do you know about X?"* as a chosen agent identity and
get back a **bounded, newest-first, source-cited** answer — filtered to only the facts that
identity is cleared to see, with the token cost of a graph neighbourhood versus the whole
corpus shown as a measured number.

This is Assignment 2 for the Wexa AI take-home: an application built on the same graph
database Wexa's own product runs on, demonstrating its three pillars — **live context,
authorized context, and provenance**.

| | |
|---|---|
| **Live demo** | https://waxevalut.vercel.app |
| **Live API** | https://waxevalut-api.onrender.com/api/health (FastAPI → CognoDB) |
| **Walkthrough** | _recording link here_ |
| **Backend** | FastAPI + official Neo4j driver → CognoDB · [`backend/`](backend/) |
| **Frontend** | React + Vite + TypeScript · [`frontend/`](frontend/) |

> The API is deployed on Render's free tier and answers live from CognoDB (try the health
> link — it may cold-start for ~50s if idle). The frontend ships with a faithful mock layer
> so the demo works with zero cold-start; set `VITE_USE_MOCK=0` + `VITE_API_BASE` to wire it
> to the live API. See [DEPLOY.md](DEPLOY.md).

## What it demonstrates

Five interactions, each mapping to a Wexa pillar:

1. **Recall** as Support-Bot (L1): ask "Acme" → source-cited facts, token savings, and
   *"2 facts outside this clearance"*.
2. **Switch the agent** to a higher clearance → the hidden facts dissolve into view. The
   query and token stats are preserved; only the changed information animates.
3. **Add an observation** → it appears in recall immediately (ACID write, live context).
4. **Time-travel**: on an entity, drag the timeline back → a corrected fact reverts to what
   was believed then. History is walkable, not overwritten.
5. **Graph**: explore the neighbourhood; click a node for a contextual inspector that keeps
   the graph in view.

## Architecture

```
CognoDB (managed graph DB, Bolt/Cypher)
   ▲
   │ official neo4j driver, parameterised Cypher
   │
backend/   FastAPI — recall / entity / impact / graph / observe / provenance
   ▲
   │ typed JSON contract (see PAGES.md)
   │
frontend/  React + TanStack Query + Framer Motion + Cytoscape
           ships with a mock API layer; one env var swaps to the live backend
```

The frontend was built against a **mock API layer** that mirrors the backend's exact
response shapes and its authorization / supersede logic, so it runs with zero backend and
connects to the real service by flipping `VITE_USE_MOCK=0`. No component changes.

## Data model

CognoDB's own taught agent-memory schema (`Entity` / `Fact` / `Source` / `Session`),
extended with an `Agent` / `Role` layer so **permissions travel with each node**:

```cypher
(:Agent)-[:HAS_ROLE]->(:Role)                 // clearance 0 public .. 3 secret
(:Fact)-[:ABOUT]->(:Entity)                   // a fact concerns an entity
(:Fact)-[:SOURCED_FROM]->(:Source)            // provenance
(:Fact)-[:OBSERVED_IN]->(:Session)            // which run recorded it
(:Fact)-[:SUPERSEDES]->(:Fact)                // corrections; history stays walkable
(:Entity)-[:RELATES_TO {type}]->(:Entity)     // typed cross-entity links
```

Authorization is enforced **inside the Cypher** (`clearance >= data_class_level`), not in
application code — that is the point of the demo.

## Run it

**Backend** (needs a CognoDB free instance):

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                                 # paste your CognoDB URI + password
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
python scripts/smoke_test.py http://127.0.0.1:8000   # 10 end-to-end assertions
```

**Frontend** (runs standalone on mock data):

```bash
cd frontend
npm install
npm run dev                                          # http://localhost:5173
```

To point the frontend at the live backend: set `VITE_USE_MOCK=0` in `frontend/.env.local`
(the dev server already proxies `/api` → `:8099`).

## Design notes

- **Backend:** parameterised Cypher only (no string concatenation); secrets from env vars;
  graceful `ServiceUnavailable` handling; two documented CognoDB-specific query fixes
  (`EXISTS{…WHERE…}` subquery behaviour and variable-length-path edge reading).
- **Frontend:** WaxeValut is a research console, not a dashboard — the current object stays
  the mental center, context is preserved across transitions. Dark, brass-accented design
  system; TanStack Query for server state with request cancellation; Cytoscape lazy-loaded;
  keyboard-navigable; honors `prefers-reduced-motion` globally.

See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md)
for details, and [`FEATURES.md`](FEATURES.md) / [`PAGES.md`](PAGES.md) for the concept and
the page-by-page API contract.

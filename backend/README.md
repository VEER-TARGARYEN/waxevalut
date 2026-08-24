# Contextor — backend

A FastAPI service over **CognoDB** implementing a live, authorized, auditable agent-memory
graph. This is the data + API layer; the front end lives separately and talks to it over the
JSON contract in [`../PAGES.md`](../PAGES.md).

## What it is

CognoDB (the graph database Wexa AI is built on) publishes an
[agent-memory schema](https://cognodb.com/learn) — Entity / Fact / Source / Session. This
service implements exactly that schema, extended with an **Agent / Role** layer so that
*permissions travel with each node*: the same question returns different facts depending on
who is asking. Every answer is bounded to a connected neighbourhood (not a corpus dump),
carries its provenance, and hides corrected facts while keeping their history walkable.

## Run it

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate      # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                                 # then paste your CognoDB URI + password
```

Seed the graph, start the API, verify:

```bash
python scripts/seed.py
```
```bash
uvicorn app.main:app --reload --port 8000
```
```bash
python scripts/smoke_test.py http://127.0.0.1:8000
```

Interactive API docs: <http://127.0.0.1:8000/docs>.

## Endpoints (full shapes in ../PAGES.md)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | connection status for the UI dot |
| GET | `/api/agents` | identities + clearances for the agent switcher |
| GET | `/api/entities?q=` | entity autocomplete |
| POST | `/api/recall` | **the core loop** — authorized, bounded, source-cited answer + token savings |
| GET | `/api/entity/{name}` | facts, corrections, relations; `?as_of=` for time-travel |
| GET | `/api/entity/{name}/impact` | multi-hop blast radius |
| GET | `/api/entity/{name}/graph` | neighbourhood nodes + edges for the visual explorer |
| GET | `/api/fact/{id}/provenance` | source + session + the retrieval Cypher |
| POST | `/api/observe` | write path — records a fact, optionally a correction |

## Layout

```
backend/
  app/
    config.py        env-var settings; secrets never hard-coded
    db.py            the CognoDB driver layer — one place all Cypher runs through
    queries.py       every Cypher statement, parameterised, documented
    serialize.py     driver rows -> the exact JSON the front end expects
    main.py          FastAPI app, CORS, lifespan, graceful DB-down handler
    routes/          meta / recall / entity / observe
  scripts/
    seed.py          realistic IT-incident memory; idempotent, :Seed-tagged
    smoke_test.py    end-to-end assertions incl. the authorization + time-travel behaviours
```

## Engineering notes a reviewer will look for

- **Secrets are env-only.** `.env` is gitignored; `.env.example` is committed. The brief
  requires this.
- **Parameterised Cypher only.** No statement is built by string concatenation; every value
  is a query parameter. The brief forbids concatenated Cypher, and it is also injection-safe.
- **Authorization lives in the query, not in Python.** A fact is filtered by
  `clearance >= data_class_level` inside the traversal — that is the whole point of the demo.
- **Graceful DB-down.** A `ServiceUnavailable` is caught globally and returned as a calm 502
  JSON body; `/api/health` reports `offline` rather than the process crashing.
- **Two CognoDB-specific fixes, documented in `queries.py`:** its `EXISTS { … WHERE … }`
  subquery ignores the inner `WHERE` (broke time-travel — replaced with the portable
  `OPTIONAL MATCH … WHERE newer IS NULL` form), and variable-length path edges must be read
  via `relationships(path)`, not by unwinding the raw path variable. Both verified against a
  live free-tier instance on 2026-08-24.

## Deploy

Any free tier that runs a Python ASGI app (Render, Railway, Fly). Set `COGNODB_URI`,
`COGNODB_USER`, `COGNODB_PASSWORD`, and `CORS_ORIGINS` (your front end's origin) as
environment variables. Start command:

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

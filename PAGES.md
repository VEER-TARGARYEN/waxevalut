# Page-by-Page Front-End Spec + API Contract

> Build the front end from this. Every page lists its components, states, and the **exact
> API call + JSON response shape** it consumes. Mock those shapes while you build; I will
> build the backend to return exactly these, so connecting later is just swapping the mock
> for the real base URL.
>
> **The contract is the important part.** As long as your components read the field names
> below, your UI and my backend meet with zero rework.

---

## Global shell (present on every page)

**Header bar**
- Left: app name/logo ("Contextor" or your choice).
- Center: **Agent switcher** — a dropdown/segmented control showing the active agent and its
  role, e.g. `acting as: Support-Bot · L1`. Switching it re-runs whatever the current page
  shows. This is the single most important control in the app — make it prominent.
- Right: **Connection status dot** — green "connected" / amber "reconnecting" / red "offline",
  fed by `GET /api/health`. Poll every 10s.

**Global "Add observation" button** — floating action button or header button, opens the
Add-Observation modal (Page 4) from anywhere.

**Three states every data component must have:** loading (skeleton, not spinner), empty
(helpful prompt), error (calm banner + retry — never a raw stack trace).

---

## Page 1 — Recall (Home) `/`

**Purpose:** the core loop. Pick an identity, ask about an entity, get an authorized,
source-cited, bounded answer.

**Layout (top to bottom):**
1. Big centered **search box** — placeholder "Ask about a customer, service, or project…".
   Optional autocomplete from `GET /api/entities?q=`.
2. The **active agent pill** sits right beside/under the box: `acting as: Support-Bot · L1`.
3. **Token-savings meter** (appears after a query) — "Full corpus: 12,840 → Graph packet:
   190 tokens · **98.5% smaller**". Animate the number. Small footnote: "token counts are
   char/4 estimates."
4. **Answer feed** — one card per fact, newest first.
5. **Redacted row(s)** — facts the current role can't see render as a locked row:
   `🔒 1 fact hidden — requires PII clearance`. Do NOT drop them silently; the whole point
   is that switching agents makes them appear.

**Fact card contents:** the statement (primary text); a data-class chip (Public/Internal/
PII/Secret, colour-coded); an `observed_at` timestamp; a **source footer chip**
("from: ticket #4471") that opens the provenance drawer (Page 5) on click; an entity tag.

**States:**
- Empty (no query yet): "Ask about a customer, service, or project."
- Loading: 3–4 skeleton cards.
- No results: "Nothing recorded about '{q}' that {agent} can see." (Note: could be
  zero facts OR all redacted — the copy should hint at that.)
- Error: banner "Can't reach the memory graph — retrying…".

**API:**
```
POST /api/recall
Request:  { "agent_id": "support_bot", "query": "Acme" }
Response:
{
  "query": "Acme",
  "agent": { "id": "support_bot", "name": "Support Bot", "role": "L1", "clearance": 1 },
  "matched_entities": [ { "name": "Acme Corporation", "kind": "account", "score": 0.71 } ],
  "facts": [
    {
      "id": "f_1042",
      "entity": "Acme Corporation",
      "statement": "Acme upgraded to the Enterprise plan on 2026-07-14.",
      "data_class": "internal",
      "data_class_level": 1,
      "observed_at": "2026-07-14T09:20:00Z",
      "source": { "id": "s_88", "kind": "document", "uri": "contract-2026-07.pdf" },
      "superseded": false
    }
  ],
  "redacted_count": 2,
  "redacted_reason": "requires PII clearance",
  "tokens": { "corpus": 12840, "packet": 190, "reduction_pct": 98.5 }
}
```

---

## Page 2 — Entity Detail `/entity/:name`

**Purpose:** everything known about one entity, plus the features SQL can't do — corrections
timeline and blast radius. Reached by clicking any entity tag/card.

**Layout — tabbed or sectioned:**

**Section A — Facts** (default): same fact cards as Page 1, but for this entity only, still
authorized-filtered by the active agent. Redacted rows shown the same way.

**Section B — Timeline / "As of"** — the time-travel feature:
- A **date slider** or date-picker labelled "What we believed as of: {date}".
- Dragging it back re-queries; facts revert to what was current then. A fact later corrected
  shows a struck-through trail: ~~"Contact is Jane Doe"~~ → "corrected 2026-07-02".
- This is your most distinctive screen — give it room.

**Section C — Impact / Blast radius** (this can be P2; stub it if short on time):
- "If {entity} is affected, what connects to it?" — a ranked list of reachable entities by
  hop distance (1-hop, 2-hop, 3-hop), each with a one-line "what we know".

**Section D — Mini graph** — a small force-directed neighbourhood view (see Page 3); or embed
Page 3 here and skip a standalone route.

**API:**
```
GET /api/entity/{name}?agent_id=support_bot&as_of=2026-08-01T00:00:00Z
Response:
{
  "entity": { "name": "Acme Corporation", "kind": "account", "created_at": "..." },
  "facts": [ { ...same fact shape as Page 1... , "supersedes": "f_1010" } ],
  "redacted_count": 1,
  "corrections": [
    { "old": { "id": "f_1010", "statement": "Contact is Jane Doe", "observed_at": "..." },
      "new": { "id": "f_1042", "statement": "Contact is John Roe", "observed_at": "..." } }
  ],
  "relations": [
    { "type": "depends_on", "target": "Billing Service", "target_kind": "service" }
  ]
}

GET /api/entity/{name}/impact?agent_id=support_bot&depth=3
Response:
{
  "root": "Billing Service",
  "reached": [
    { "entity": "Acme Corporation", "hops": 1, "what_we_know": ["Enterprise plan", "..."] },
    { "entity": "Payments API", "hops": 2, "what_we_know": ["..."] }
  ]
}
```

---

## Page 3 — Graph Explorer `/graph` (or embedded in Page 2)

**Purpose:** the "it's a graph" moment. A small, readable force-directed view of an entity's
neighbourhood.

**Layout:**
- Search/entity selector at top (reuse the Page 1 box).
- Canvas: nodes = entities (larger) + facts (smaller) + sources; edges typed
  (ABOUT / SOURCED_FROM / RELATES_TO). **Node colour = data-class.** Cap the node count to
  the returned neighbourhood — keep it legible, not a hairball.
- Click a node → focus + side panel with its details.
- Depth control: 1 / 2 / 3 hops.

**Library:** Cytoscape.js or vis-network. Don't hand-roll it.

**API:**
```
GET /api/entity/{name}/graph?agent_id=support_bot&depth=2
Response:
{
  "nodes": [
    { "id": "e_Acme", "label": "Acme Corporation", "type": "entity", "kind": "account" },
    { "id": "f_1042", "label": "Enterprise plan", "type": "fact", "data_class": "internal" },
    { "id": "s_88",  "label": "contract-2026-07.pdf", "type": "source" }
  ],
  "edges": [
    { "source": "f_1042", "target": "e_Acme", "type": "ABOUT" },
    { "source": "f_1042", "target": "s_88",  "type": "SOURCED_FROM" }
  ],
  "redacted_count": 1
}
```

---

## Page 4 — Add Observation (modal, reachable from anywhere)

**Purpose:** the write path. Records a new fact live; it must appear in the next query
immediately (demonstrates ACID + live context).

**Form fields:**
- Entity (text, with autocomplete from `GET /api/entities?q=`).
- Entity kind (person / service / account / project) — only used if the entity is new.
- Statement (textarea).
- Data class — a **4-way segmented control**: Public / Internal / PII / Secret, colour-coded.
- Source kind (conversation / document / api) + source reference/uri.
- Optional: "supersedes" — pick an existing fact this one corrects (turns it into a
  correction; powers the timeline).

**Behaviour:** on submit → success toast → if the entity matches the current view, refresh so
the new fact shows instantly. On failure → inline error, keep the form filled.

**API:**
```
POST /api/observe
Request:
{
  "entity": "Acme Corporation",
  "kind": "account",
  "statement": "Acme raised a billing dispute on 2026-08-20.",
  "data_class": "internal",
  "source_kind": "conversation",
  "source_uri": "ticket #4471",
  "session_id": "sess_demo",
  "supersedes_fact_id": null
}
Response: { "ok": true, "fact_id": "f_1103", "entity": "Acme Corporation" }
```

---

## Page 5 — Provenance drawer (slide-over, not a full page)

**Purpose:** the audit/receipt moment. Opens when a source chip is clicked on any fact.

**Contents:** the full `Source` (kind, uri, ingested_at); the `Session` that recorded it
(agent, started_at); the fact's own metadata; and — the on-thesis touch — a collapsible
**"How this was retrieved"** block showing the actual parameterised Cypher that produced the
answer (P2-2 from the feature spec; cheap and very Wexa-flavoured).

**API:** data comes from the fact object already returned by Page 1/2 (no new call needed);
the Cypher-echo, if you build it, comes from a field I'll include:
```
GET /api/fact/{id}/provenance
Response:
{
  "fact": { ...fact shape... },
  "source": { "id": "s_88", "kind": "document", "uri": "contract-2026-07.pdf", "ingested_at": "..." },
  "session": { "id": "sess_07", "agent": "ingestor", "started_at": "..." },
  "retrieval_cypher": "MATCH (e)<-[:ABOUT]-(f:Fact)-[:SOURCED_FROM]->(src) WHERE ... "
}
```

---

## Supporting endpoints (no dedicated page — the shell/components use them)

```
GET /api/health
  → { "status": "connected" | "degraded" | "offline", "latency_ms": 4 }

GET /api/agents
  → [ { "id": "support_bot", "name": "Support Bot", "role": "L1", "clearance": 1 },
      { "id": "finance_bot", "name": "Finance Bot", "role": "Finance", "clearance": 3 } ]
  (Used to populate the header Agent switcher. Clearance 0=public…3=secret.)

GET /api/entities?q=Ac
  → [ { "name": "Acme Corporation", "kind": "account" }, ... ]   (autocomplete)
```

---

## The demo storyboard (design the pages so this flow is smooth)

Your screen recording — and the reviewer's first click-through — should be exactly this, so
optimise the pages for it:

1. **Recall page**, agent = Support-Bot (L1). Ask "Acme". Get a few facts + a
   `🔒 2 facts hidden — requires PII clearance` row. Note the token meter.
2. **Switch the agent** to Finance-Bot (L3) in the header. Same question re-runs; the hidden
   facts **appear**. ← the money shot.
3. **Add an observation** about Acme via the modal. It shows up immediately.
4. **Open the entity page**, drag the **"as of" slider** back; watch a fact revert to its
   pre-correction value.
5. **Open the graph view**; click the Acme node.

Five interactions, each mapping to a Wexa pillar. Build the pages to make that path
effortless and it films itself.

---

## Field-name cheat sheet (so your mocks match my backend exactly)

| Field | Type | Notes |
|---|---|---|
| `agent_id` | string | e.g. `support_bot` |
| `clearance` / `data_class_level` | int 0–3 | 0 public · 1 internal · 2 pii · 3 secret |
| `data_class` | string | `public`/`internal`/`pii`/`secret` (label for the int) |
| `observed_at`, `ingested_at`, `started_at` | ISO 8601 string | render however you like |
| `superseded` | bool | true = corrected; hidden from default recall |
| `tokens.reduction_pct` | number | already computed server-side |
| `redacted_count` | int | how many facts the current role couldn't see |

Build to these names and we connect on the first try. When your front end is ready, hand me
the code and I'll wire each component to the live endpoints and deploy.

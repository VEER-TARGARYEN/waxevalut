# Draft reply — Assignment 2 (Software Developer Intern)

**To:** hr@wexa.ai (reply to Asha Das / Recruitment Team)
**Subject:** CognoDB Assignment 2 – <Your Name>

---

Dear Recruitment Team,

Please find my completed assessment below.

**Live demo:** https://waxevalut.vercel.app
**Repository:** https://github.com/VEER-TARGARYEN/waxevalut
**Live API (FastAPI → CognoDB):** https://waxevalut-api.onrender.com/api/health
**Walkthrough:** <recording link>

## What it is

**WaxeValut** — a live, authorized, auditable agent-memory graph built on CognoDB. You feed
it observations from conversations and documents; it stores them as an entity–fact–source
graph. Acting as a chosen agent identity, you ask *"what do you know about X?"* and get back
a bounded, newest-first, source-cited answer, filtered to only the facts that identity is
cleared to see — with the token cost of a graph neighbourhood shown against the whole corpus.

I built it on the exact `Entity / Fact / Source / Session` schema CognoDB documents in its
agent-memory guide, extended with an `Agent / Role` layer, to demonstrate the three pillars
from wexa.ai — **live context, authorized context, and provenance** — at a scale a reviewer
can hold in their head.

## Try these five things (≈2 minutes)

1. Search **Acme** as Support-Bot (L1) → source-cited facts, a token-savings figure, and a
   note that some facts are outside this clearance.
2. Switch the agent (top bar) to **Finance-Bot (L3)** → the hidden facts appear. Same
   question, different lens; the query and token stats are preserved.
3. **Add an observation** → it shows up in recall immediately.
4. Open an entity → drag the **timeline** back → a corrected fact reverts to what was
   believed then (history is walkable, not overwritten).
5. Open the **graph** → click a node → a contextual inspector opens while the graph stays in
   view.

## A few things worth noting

- **Authorization is enforced inside the Cypher** (`clearance >= data_class_level`), not in
  application code — permissions travel with the node, which is the point of the demo.
- **Provenance and time-travel:** every fact links to its source; corrections use a
  `SUPERSEDES` edge so the history stays queryable ("what did we believe at time T").
- Parameterised Cypher throughout, secrets from environment variables, graceful handling
  when the database is unreachable, a seed script and an end-to-end smoke test.
- The frontend was built against a faithful mock of the API contract, so it runs with zero
  backend and connects to the live CognoDB service through one environment variable.
- I documented two CognoDB-specific query behaviours I hit and worked around (an
  `EXISTS { … WHERE … }` subquery detail that affected time-travel, and reading
  variable-length-path edges) — happy to walk through both.

Use of an AI coding assistant is noted per the assignment; I can explain and defend every
part of the code and the design in the follow-up.

Thank you for the opportunity — I enjoyed this one.

Best regards,
<Your Name>
<phone · GitHub: VEER-TARGARYEN>

---

## Before you send — checklist

- [ ] Record the 2–3 min walkthrough (the five steps above) and paste the link in.
- [ ] Fill in `<Your Name>` and contact details (and in `LICENSE`).
- [ ] Decide mock vs live for the demo link (see below) and, if live, **warm the backend
      first** by opening the health link once.
- [ ] Keep the CognoDB instance running until you hear back.

## Mock vs live demo — pick one

The deployed frontend currently runs on the **mock layer** (identical behaviour, zero
cold-start — the safest thing to record against). The live CognoDB backend is deployed and
verified separately at the API link above, which proves the integration is real.

If you want the *demo itself* to round-trip through CognoDB: in Vercel → Settings →
Environment Variables set `VITE_USE_MOCK=0` and
`VITE_API_BASE=https://waxevalut-api.onrender.com/api`, then **redeploy** (Vite bakes env
vars at build time, so the redeploy is required). Warm the backend before recording.
Either choice fully satisfies the assignment.

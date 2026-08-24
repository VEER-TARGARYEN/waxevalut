# WaxeValut — frontend

An intelligent interface for exploring organizational memory: facts, provenance,
authorization, historical state, and graph relationships. Built on CognoDB via the backend
in [`../backend`](../backend).

Not a dashboard — a research console. The current object stays the mental center:
search → investigation → discovery, with context preserved across every transition.

## Run

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Ships with a **mock API layer on by default**, so it runs with zero backend. To point it at
the live FastAPI service instead:

```bash
# .env.local
VITE_USE_MOCK=0
VITE_API_BASE=http://127.0.0.1:8099/api
```

The Vite dev server also proxies `/api` → `http://127.0.0.1:8099`, so with the backend
running you can flip `VITE_USE_MOCK=0` and leave `VITE_API_BASE` unset.

```bash
npm run build          # tsc + vite production build
npm run lint           # tsc --noEmit
```

## How the mock/live swap works (the important part)

Components import `api` from `@/lib/api` and never construct requests themselves. That module
picks the implementation from one env var:

```
src/lib/api/
  types.ts     the exact response shapes from PAGES.md — the single source of truth
  mock.ts      client-side impl mirroring backend/scripts/seed.py + its auth/supersede logic
  client.ts    real HTTP client, same interface
  index.ts     const api = VITE_USE_MOCK ? mockApi : httpApi
```

Connecting the backend is a one-line change; no component is rewritten.

## Architecture

- **React 18 + Vite + TypeScript**, React Router for routing.
- **TanStack Query** owns all server state (caching, cancellation via `AbortSignal`,
  `placeholderData` so agent-switch and timeline-scrub keep prior data visible until new
  arrives).
- **Zustand** holds only tiny global UI state (active agent, open overlays). Everything else
  is URL-driven so context is shareable and survives reload.
- **Framer Motion** for context transitions, drawers, and the redaction dissolve; simple
  hovers stay in CSS.
- **Cytoscape.js** (lazy-loaded, code-split) for the graph, with the `fcose` layout.

```
src/
  components/
    shell/        header, agent switcher, connection status, command palette, app shell
    recall/       search bar, fact card, source chip, redaction, token savings
    entity/       timeline (the signature interaction), correction trail, impact
    graph/        cytoscape view + contextual inspector
    observe/      add-observation modal
    provenance/   provenance drawer
    ui/           primitives + custom inline icon set (no icon library)
  pages/          RecallPage, EntityPage, GraphPage
  hooks/          TanStack Query hooks
  lib/            api layer, motion system, formatting
  store/          zustand app store
  styles/         design tokens + base (dark, brass accent)
```

## Design system

Identity: a **vault of sealed organizational memory** — cool near-black charcoal lit by a
single warm **brass** accent (the wax seal), reserved strictly for interaction and focus.
Data classifications get their own quiet semantic hues (slate / blue / violet / rose) that
never compete with the brass. Tokens live in `src/styles/index.css`; a coherent motion
timing scale lives in `src/lib/motion.ts`. Redaction is never red; red is reserved for
errors.

## The five-interaction demo

Everything is tuned so this sequence feels effortless:

1. Support-Bot (L1) · search **Acme** → 3 facts, token savings, **2 facts redacted**
2. Switch to **Data Bot / Finance Bot** → the hidden facts dissolve into view (query and
   token stats preserved)
3. **Add observation** → appears in recall immediately
4. Open **Acme → Timeline**, drag the time lens back → the contact reverts to its
   pre-correction value
5. Open the **Graph**, click a node → contextual inspector, graph stays visible

## Accessibility

Keyboard nav throughout (⌘K palette, `/` to focus search, arrow keys, Escape to close),
visible brass focus rings, `role`/`aria` on interactive controls, and
`prefers-reduced-motion` honored (including the animated counters).

## Deploy

Static build — host `dist/` on any free tier (Vercel, Netlify, Cloudflare Pages). Set
`VITE_USE_MOCK=0` and `VITE_API_BASE=<your-backend-url>/api` at build time to talk to the
deployed backend, or leave the mock on for a zero-infrastructure demo.

# Deploying WaxeValut

Two ways, depending on how much you want live:

- **Path A — frontend only (fastest, most reliable demo).** The frontend ships with a mock
  API layer that mirrors the backend exactly, so it works with no backend at all. One
  deploy, one link, always up. Best for the submission link and the recording.
- **Path B — full stack (frontend + live CognoDB backend).** More impressive, but the free
  backend tier cold-starts after idle. Do Path A first, then optionally wire the backend.

Config files are already in the repo: `frontend/vercel.json`, `frontend/netlify.toml`,
`render.yaml`.

---

## Path A — frontend on Vercel (mock data, ~3 minutes)

1. Go to <https://vercel.com/new> and **Import** the `waxevalut` repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Vite (build `npm run build`,
   output `dist`); `vercel.json` handles SPA routing.
3. Leave environment variables empty — with none set, the app defaults to the mock layer
   and just works.
4. **Deploy.** You get a URL like `https://waxevalut.vercel.app`.

That URL is your demo link. Every one of the five demo interactions works on it.

> **Netlify instead:** <https://app.netlify.com> → Add new site → Import from Git → pick the
> repo. `netlify.toml` sets base `frontend`, build, publish, and the SPA redirect. Same
> result.

---

## Path B — add the live backend on Render

### 1. Deploy the API

1. Go to <https://dashboard.render.com> → **New** → **Blueprint** → pick the `waxevalut`
   repo. Render reads `render.yaml` and proposes the `waxevalut-api` service.
2. When prompted, fill the secrets (they are never in the repo):
   - `COGNODB_URI` — `bolt+s://<your-instance>.databases.cognodb.com`
   - `COGNODB_PASSWORD` — your instance password
   - `CORS_ORIGINS` — your frontend origin from Path A, e.g. `https://waxevalut.vercel.app`
3. **Apply.** First build takes a few minutes. When live you get a URL like
   `https://waxevalut-api.onrender.com`.
4. Check it: open `https://waxevalut-api.onrender.com/api/health` → `{"status":"connected"}`.
5. **Seed the graph** (once). Easiest from your machine, pointed at the same instance:
   ```bash
   cd backend && python scripts/seed.py
   ```
   (The seed writes to CognoDB, which the deployed API then reads.)

### 2. Point the frontend at it

In your Vercel (or Netlify) project → **Settings → Environment Variables**, add:

```
VITE_USE_MOCK = 0
VITE_API_BASE = https://waxevalut-api.onrender.com/api
```

Redeploy the frontend. It now reads live data from CognoDB through your API.

> **Cold-start note.** Render's free tier sleeps after ~15 min idle; the first request then
> takes ~50s. Before recording a live demo, hit `/api/health` once to wake it. If you want
> the recording to be bulletproof, record against Path A (mock) — the behavior is identical.

---

## After deploying

Put the links at the top of the main `README.md` (replace the two placeholders) and in your
submission email:

- **Live demo:** `https://waxevalut.vercel.app`
- **Repo:** `https://github.com/VEER-TARGARYEN/waxevalut`

Keep your CognoDB instance running until you hear back — the assignment asks for it, and
Path B reads from it live.

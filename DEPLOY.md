# Deployment

The app is a **single long-running Node process** by design (TDD): an
in-memory job registry, a background processor, per-session temp files on
disk, and a 1-hour sweeper. This rules out serverless platforms (Vercel,
Cloud Run defaults, Workers): their functions are ephemeral and would kill
in-flight jobs and drop all job state between requests.

No API keys or secrets are required. Every setting is optional tuning via
environment variables (see `.env.example`). Production build verified:
`npm run build` (standalone output) and the full download flow tested.

## Option A — Render (free web service) — recommended

1. Put this project in a GitHub/GitLab repository.
2. In Render: **New → Blueprint**, select the repo — `render.yaml` configures
   everything (Node runtime, build/start commands, health check
   `/api/health`, free plan).
3. Set any `MAX_*` limits you want (blank = PRD defaults).

Free-plan caveats (unchanged product behavior, platform limits):

- **Spin-down after ~15 min idle** → first request pays a ~30–50 s cold
  start; in-flight jobs would be killed by a spin-down, but typical jobs
  finish in seconds.
- **512 MB RAM**: worst case (20 × 50 MB fully in memory) exceeds it. Lower
  `MAX_FILE_SIZE_MB` / `MAX_FILES_PER_SESSION` via env if you expect heavy
  use; typical documents are far below the caps.

## Option B — Docker (any host or VPS)

```bash
docker build -t pdf-utility .
docker run -p 3000:3000 pdf-utility
```

Multi-stage image, non-root user, standalone output. Works on Render
(Docker runtime), Koyeb, Fly.io, HF Spaces, or any VPS.

## Option C — Koyeb free tier

Create a web service from the Git repo (build: `npm ci && npm run build`,
run: `npm start`, port 3000, health check `/api/health`). Same caveats
as Render's free plan.

## Health check

`GET /api/health` → `{"ok": true}` (no session, no internals exposed).

## Environment variables (all optional)

| Variable | Default | Meaning |
|---|---|---|
| `MAX_FILE_SIZE_MB` | 50 | Per-PDF upload limit |
| `MAX_FILES_PER_SESSION` | 20 | PDFs per task |
| `MAX_TOTAL_PAGES` | 100 | Pages in the output |
| `JOB_TTL_MS` | 3600000 | Temp-file lifetime (1 h) |
| `SWEEP_INTERVAL_MS` | 60000 | Cleanup sweep interval |
| `MAX_CONCURRENT_JOBS` | 2 | Concurrent processing cap |
| `RATE_LIMIT_*_PER_MIN` | route-specific | Per-IP rate limits |
| `TMP_DIR` | os.tmpdir()/pdf-utility | Temp storage root |

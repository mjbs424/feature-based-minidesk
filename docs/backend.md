# MiniDesk backend operation

The implemented MiniDesk API is a public, shared TypeScript Vercel Function under `/api/minidesk/v1/`. Its behavior and payloads are defined in the [product and API blueprint](product-api-frontend-blueprint.md). The frontend must consume that HTTP contract through feature service, endpoint, and transport layers; it must not import from `api/` or `server/`.

## Storage and reset

Neon Postgres uses separate MiniDesk-owned relational tables: `minidesk_task_categories`, `minidesk_expense_categories`, `minidesk_tasks`, `minidesk_expenses`, `minidesk_budgets`, `minidesk_focus_sessions`, `minidesk_focus_segments`, and `minidesk_rum_events`. `minidesk_generation` holds the active dataset ID, window, and write count; `minidesk_idempotency` and `minidesk_write_ticks` hold temporary request controls. `minidesk_schema_migrations` tracks schema versions. Foreign keys, uniqueness rules, checks, and indexes are in [the relational migration](../server/minidesk/migrations/002_relational.sql). Only the cached HTTP response body in the idempotency table uses JSONB; feature records have typed columns.

A new generation at 00:00 or 12:00 UTC clears only MiniDesk feature and request-control tables in one transaction, rotates the MiniDesk dataset ID, and restores built-in categories before serving the first request in that generation. The migration ledger and any other project's tables are outside the reset. Physical cleanup is lazy, at that first request. No cron or always-on process is needed. The previous single-column `minidesk_state` prototype is removed by the relational migration; it contained only temporary MiniDesk demo data, and migration starts a fresh generation.

Built-in task categories are Work, Personal, Errands, Travel, and Other. Built-in expense categories are Groceries, Bills, Transport, Food, and Other. They are recreated on every reset; custom categories and all other MiniDesk records are cleared. A reset does not delete other projects' data.

Every write requires the current `X-Minidesk-Dataset-Id` returned by `GET /api/minidesk/v1/demo`. Resource updates and deletes require `If-Match` with the quoted resource version. The database connection is server-only. The runtime uses Neon's pooled URL; migration uses its direct URL.

To protect the free demo, writes are limited to 120 per minute and 10,000 per generation. Current records are capped at 1,000 tasks, 1,000 expenses, 1,000 focus sessions, and 5,000 monitoring events per generation. Requests beyond the write or record caps return `429`; excess monitoring events in an otherwise valid batch count as rejected.

## Local setup

Use Node 24 and the repository's pnpm version. Create the primary `.env.local` and separate `.env.preview.local` exactly as described in the [first-time setup guide](agent-tooling-setup.md#minidesk-database-environment). Keep connection strings out of Git, browser code, and chat. Then run:

```powershell
pnpm install --frozen-lockfile
pnpm run db:migrate
```

Start two terminals from the repository root:

```powershell
pnpm run dev:api
```

```powershell
pnpm dev
```

The API listens on `127.0.0.1:3100`; Vite proxies `/api` to it so browser calls use the same origin. Restart `dev:api` after backend source changes. The local server requires `DATABASE_URL` at startup; deployed requests return `503 DATABASE_UNAVAILABLE` if it is missing. The migration is safe to rerun.

## Vercel deployment

Set the server-side environment variable `DATABASE_URL` in both Vercel projects. Production uses the **pooled** connection string for Neon's primary branch. Preview must use the **pooled** connection string for a separate Neon `preview` branch; do not give PR deployments the production database credential. A Preview branch created before the relational migration needs `pnpm run db:migrate` run against that branch's direct URL before its first deployment; a branch created afterward inherits the new tables. Apply each pooled value to the environment used by its project and redeploy after a value changes. Do not set a `VITE_` database variable. `DATABASE_DIRECT_URL` is needed only when running the migration outside Vercel.

For an existing Preview branch, put only its **direct** Neon connection string in an ignored `.env.preview.local` file at the repository root, as `DATABASE_DIRECT_URL=...`. In PowerShell, run `Remove-Item Env:DATABASE_DIRECT_URL -ErrorAction SilentlyContinue` before `node --env-file=.env.preview.local scripts/migrate-minidesk.mjs`; Node otherwise prefers an inherited shell value over the file. Keep the primary branch's `.env.local` unchanged. The migration is versioned and safe to rerun. It replaces the old temporary MiniDesk dataset on that branch and does not touch other projects' tables.

CI builds the Vite frontend and bundles the Node 24 Function into Vercel Build Output API format. The deploy workflow accepts only the expected static and MiniDesk Function artifact shape. Routes send `/api/minidesk/v1/*` to the Function before the static-file and SPA fallback. Before a PR's Function artifact can deploy with Preview secrets, a repository writer must add an exact PR comment `/approve-preview <40-character-commit-SHA>` for the current head commit. A new commit requires a new approval. The trusted deploy code on `main` checks the commenter's current repository permission and matches the artifact's PR number and head commit to trusted GitHub run metadata. For fork runs where `workflow_run.pull_requests` is empty, it resolves the PR from the run's head repository and branch, then verifies its head SHA. Existing production and Preview deployment protection settings remain the project's deployment policy. This repository contains only MiniDesk API routes; future projects require separate route and ownership decisions.

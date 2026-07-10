# Session Sync Runbook

Date: 2026-07-10
Project: Lumbung Bersama
Purpose: repeatable loop for syncing Codex chat sessions, repo audit evidence, and Obsidian project memory.

## Current Sync Anchors

Primary Agent Eksplorasi thread:

`019f4a4b-4e36-7423-a631-e608dea29546`

Repo clone:

`C:\Users\Lenovo LOQ\OneDrive\Documents\Lumbung Bersama\lumbung-bersama-repo`

Project vault:

`C:\Kevin Dev Vaults\Projects\KopDes Cerdas - Hackathon Kemenkop Indonesia`

MeetsIn learning vault:

`C:\Kevin Dev Vaults\MeetsIn Suite\Project Learning`

Current completed audit note:

`C:\Kevin Dev Vaults\MeetsIn Suite\Project Learning\Daily\2026-07-10 Lumbung Bersama Repo Feature Audit.md`

Current project sync doc:

`docs/30-agent-exploration-sync-and-feature-backlog.md`

## Loop Steps

Run these steps whenever continuing the full sync session.

1. Read the latest Agent Eksplorasi thread state.
2. Check repo working tree state with `git status --short --branch`.
3. Read or diff the current sync docs.
4. Extract only evidence-backed findings from the thread.
5. Classify findings into:
   - verification evidence;
   - feature inventory;
   - implementation gap;
   - security/quality risk;
   - environment blocker;
   - backlog item.
6. Update `docs/30-agent-exploration-sync-and-feature-backlog.md` or create the next numbered checkpoint.
7. Mirror project-critical updates into:
   - `C:\Kevin Dev Vaults\Projects\KopDes Cerdas - Hackathon Kemenkop Indonesia\docs`;
   - `C:\Kevin Dev Vaults\Projects\KopDes Cerdas - Hackathon Kemenkop Indonesia\docs\12-development-progress.md`.
8. If the thread writes a MeetsIn learning note, link it from the project-specific sync doc.
9. Verify anchors with `rg` or `Select-String`.
10. Report working tree state and do not stage/commit unless explicitly requested.

## Required Evidence Per Loop

Every loop should capture:

1. Thread id and thread status.
2. Repo path and branch state.
3. Changed files.
4. Commands run and pass/fail status.
5. Render/API proof if runtime was tested.
6. Blockers separated from code failures.
7. Backlog changes and acceptance gates.
8. Vault note paths updated.

## Current Known Runtime Facts

Static/build state:

1. `npm run lint` passed.
2. `npm run build` passed.
3. `npm audit --audit-level=moderate` reports a transitive PostCSS advisory through `next@16.2.9`.

Browser/API state from the completed audit:

1. `/` rendered in browser.
2. `/peta-unggulan` rendered with Leaflet container, search, and filters.
3. `/dashboard` redirected to `/login?next=/dashboard`.
4. `/api/health` returned setup-required without DB env.
5. `/api/open-data/sources` worked in static mode.
6. `/api/peta-unggulan/source-check` worked without full DB runtime.
7. `/api/dashboard` and `/api/peta-unggulan/data` returned `DATABASE_URL_REQUIRED` without DB runtime.
8. `/pilot` returned `404` and README was corrected.

Environment blocker:

Full DB-backed verification is not proven because Docker Desktop engine was not running, port `5432` was closed, and local PostgreSQL lacked `initdb`/`pg_ctl`.

## Backlog Start Point

Do not restart broad discovery unless the repo changed materially. Start implementation from P0 in `docs/30-agent-exploration-sync-and-feature-backlog.md`:

1. Agent Exploration Session Memory.
2. WA Center API-backed send/history.
3. Record lifecycle audit trail.

Then move to P1:

1. Voice/photo evidence pipeline.
2. Aceh IDM direct desa connector.
3. Data-source coverage dashboard.

## Completion Rule

A sync loop is complete when:

1. latest thread state has been read;
2. repo state has been checked;
3. any new evidence has been written to the right docs;
4. project-specific and MeetsIn learning notes are cross-linked when both exist;
5. working tree state is reported.

Do not mark production readiness complete until DB-backed runtime, authenticated flows, and env-gated integrations have real verification.


# Agent Exploration Sync and Feature Backlog

Date: 2026-07-10
Project: Lumbung Bersama
Repo snapshot: `C:\Users\Lenovo LOQ\OneDrive\Documents\Lumbung Bersama\lumbung-bersama-repo`
Related Codex thread: `019f4a4b-4e36-7423-a631-e608dea29546` (`Agent Eksplorasi`)
Status: synced with completed Agent Eksplorasi audit loop

## Purpose

This document keeps the Agent Eksplorasi chat session, local repository audit, and Kevin Dev Vault project memory aligned.

The main rule is simple:

1. Do not treat chat exploration as disposable notes.
2. Convert every confirmed finding into a backlog item, source-truth decision, or verification gate.
3. Keep demo, pilot, env-gated, and production-ready claims separate.

## Sources Synced

1. Agent Eksplorasi thread status.
2. Local clone from `meets-indonesia/lumbung-bersama`.
3. Existing Kevin Dev Vault project memory for Lumbung Bersama.
4. Local commands run against the clone.
5. Agent Eksplorasi final Obsidian note:
   `C:\Kevin Dev Vaults\MeetsIn Suite\Project Learning\Daily\2026-07-10 Lumbung Bersama Repo Feature Audit.md`

## Current Evidence

### Repository

Current local clone:

`C:\Users\Lenovo LOQ\OneDrive\Documents\Lumbung Bersama\lumbung-bersama-repo`

Observed branch state:

`main...origin/main`

Working tree at this snapshot was clean before this document was added.

### Stack

Observed from `package.json`:

1. Next.js `16.2.9`
2. React `19.2.4`
3. PostgreSQL via `pg`
4. Leaflet map UI
5. Tailwind CSS v4 toolchain
6. Playwright dependency present

### Verification Already Completed In This Sync Loop

Commands:

```powershell
npm run lint
npm run build
npm audit --audit-level=moderate
```

Results:

1. `npm run lint` passed.
2. `npm run build` passed.
3. `npm audit --audit-level=moderate` reported 2 moderate vulnerabilities from `postcss` through `next@16.2.9`.
4. `npm audit fix --force` is not recommended because the audit output proposes a breaking downgrade path to an old Next version.

### Agent Eksplorasi Thread Status

The related thread is completed. Final readable status from the thread:

1. Repo clone completed.
2. Feature inventory, backend/data readiness, and security/test risk audits were started through explorer agents.
3. `npm ci` completed.
4. Lint and production build passed.
5. Dev server started at `127.0.0.1:3000`.
6. Public routes were smoke-tested as alive.
7. Auth-protected routes redirected with `307`.
8. Stateful APIs returned `503` when database env/runtime was absent.
9. Docker CLI exists, but Docker Desktop engine was not running.
10. PostgreSQL client binaries exist locally, but no running service was found on port `5432`.
11. Local PostgreSQL install did not include enough tooling (`initdb`/`pg_ctl`) to create a temporary cluster.
12. Browser render verification was started after HTTP smoke checks.
13. Landing page rendered normally in browser: title correct, brand text present, and navigation links present.
14. `/peta-unggulan` rendered with a Leaflet container, search input, and sector/filter controls.
15. `/dashboard` auth guard redirected to `/login?next=/dashboard` and displayed login form.
16. API evidence showed `/api/health` in `setup-required` mode without database env.
17. Static source catalog and `/api/peta-unggulan/source-check` worked without full database runtime.
18. `/api/peta-unggulan/data` and `/api/dashboard` returned `DATABASE_URL_REQUIRED` without database runtime.
19. `/pilot` returned real `404`; the README route listing has been corrected in this sync loop.
20. Security explorer reported missing login throttling, role/tenant scoping gaps on mutations, missing CSRF protection, missing webhook idempotency, and public external fetch timeout/rate-limit needs.
21. Backend/data explorer finished and the final Obsidian note was written to MeetsIn Suite Project Learning.
22. Final note adds that `POSTGIS_URL` is documented but unused, `/api/health` should eventually split public health from private readiness, commodity-profile explanation should avoid describing `bps-direct-*` as inherited baseline, and automated tests are missing for auth, webhook, imports, and dashboard actions.
23. Agent Eksplorasi marked its own goal complete after clone, multi-agent audit, local verification, and Obsidian sync.

Interpretation:

The code passes static/build gates. Full DB-backed runtime verification is blocked by local database runtime availability, not by a confirmed application bug.

Additional interpretation:

1. The public/rendered app shell is alive.
2. Env-gating behavior is explicit and mostly correct.
3. `/pilot` was documentation drift, not an implemented route.
4. Security and governance hardening should be treated as product-readiness backlog, not cosmetic polish.
5. The final Agent Eksplorasi note and this project-specific sync document now point at the same evidence and backlog.
6. This sync document is now the handoff anchor for the next implementation loop, not a temporary draft.

## Current Feature Inventory

### Existing Product Surfaces

1. Public landing page.
2. Login route.
3. Operator dashboard.
4. WA Center.
5. Agent AI Center.
6. Module index and module detail routes.
7. Lapor Siap reporting route.
8. Integration readiness route.
9. Peta Unggulan route.
10. Peta Potensi legacy redirect/compatibility route.
11. Voice-note demo route.

### Existing API Groups

1. Auth: login, logout, session-backed user profile.
2. Dashboard data.
3. Notifications.
4. WA messages, send, webhook.
5. Agent run.
6. Operator queue mutation.
7. Buyer approval.
8. Finance review.
9. Stock restock.
10. Report section and report period lock.
11. Open data sources.
12. Admin area search, drilldown, boundaries.
13. Commodity profile search and coverage.
14. Commodity news.
15. Peta Unggulan data, analysis, source check.

### Existing Data Tables

1. `cooperatives`
2. `operator_queue`
3. `users`
4. `auth_sessions`
5. `notifications`
6. `stock_items`
7. `buyer_matches`
8. `finance_requests`
9. `report_sections`
10. `report_periods`
11. `wa_messages`
12. `agent_runs`
13. `map_regions`
14. `villages`
15. `village_commodities`
16. `village_assets`
17. `open_data_sources`
18. `administrative_areas`
19. `regional_commodity_profiles`
20. `admin_boundary_cache`
21. `regional_commodity_signals`
22. `data_import_runs`

## Key Gaps To Develop

### 1. Agent Exploration Session Memory

Problem:

`agent_runs` stores individual agent outputs, but it does not store multi-turn exploration sessions, findings, decisions, or backlog promotion.

Recommended feature:

Add an exploration workspace:

1. `exploration_sessions`
2. `exploration_messages`
3. `exploration_findings`
4. `feature_backlog_items`
5. `decision_logs`

Expected routes:

1. `/eksplorasi`
2. `/api/exploration/sessions`
3. `/api/exploration/findings`
4. `/api/backlog/items`
5. `/api/backlog/items/[id]/promote`

Acceptance gate:

An Agent Eksplorasi finding can be saved, classified by module, assigned severity, linked to evidence, and promoted to a backlog item with a verification checklist.

### 2. WA Center Must Use Real Local API

Problem:

The standalone WA Center currently behaves as a client-side simulator. It should post to `/api/wa/messages` when authenticated and clearly show env-gated delivery status.

Recommended feature:

1. Replace local timeout-only send behavior with API-backed send.
2. Keep unauthenticated/public demo mode separate.
3. Show persisted `wa_messages` history from the database.
4. Route follow-up actions into operator queue.

Acceptance gate:

Sending a WA Center message creates a `wa_messages` row and displays the saved bot reply/status returned by the API.

### 3. Voice Note and Photo Evidence Pipeline

Problem:

Webhook can identify an audio message marker, but media download, transcription, photo evidence, and evidence attachment are not implemented as a real pipeline.

Recommended feature:

Add:

1. `media_evidence`
2. `submission_evidence`
3. `transcription_jobs`
4. env-gated media download using WhatsApp media API
5. env-gated transcription using configured AI provider

Acceptance gate:

A voice-note webhook creates a media evidence record, transcription status, extracted fields, and a human review checklist without exposing raw credentials.

### 4. Record Lifecycle and Audit Trail

Problem:

Current status fields are useful but too coarse for audited cooperative operations.

Recommended lifecycle:

`WA masuk -> draft -> extracted -> needs_followup -> operator_review -> verified -> manager_approved -> locked -> exported`

Recommended table:

`record_events`

Acceptance gate:

Every queue mutation writes an immutable event with actor, timestamp, previous state, next state, reason, and source.

### 5. Direct Desa Data Connector Loop

Problem:

The product memory correctly avoids fake desa-level claims. The next useful data step is a direct desa connector rather than more inherited baseline.

Recommended build order:

1. `scripts/import-aceh-idm-commodity-signals.mjs`
2. `scripts/import-idm-export.mjs`
3. supervised CSV/XLSX upload for regional portals
4. data-source coverage dashboard

Acceptance gate:

Aceh IDM/open-data rows with positive numeric desa metrics can be imported into `regional_commodity_signals` and map/search profiles with `source_level = regional-open-data-desa`.

### 6. Data Source Coverage Dashboard

Problem:

Operators and judges need to see what data is real, baseline, env-gated, or missing by province/source.

Recommended route:

`/integrasi/data-coverage` or dashboard tab `Data Coverage`

Required breakdown:

1. administrative hierarchy
2. boundary polygons
3. BPS province profiles
4. BPS kabupaten/kota profiles
5. regional desa rows
6. operator verified records
7. WA verified records
8. SIMKOPDES/Kemenkop status

Acceptance gate:

Coverage page can explain why a village is searchable even when direct commodity truth is not available.

### 7. Buyer and Market CRM

Problem:

Buyer matching exists, but there is no durable outreach history or buyer requirement model.

Recommended feature:

1. buyer directory
2. commodity requirements
3. outreach scripts
4. approval history
5. deal status
6. logistics terms

Acceptance gate:

Approving a buyer match creates an outreach event and keeps the human approval trail.

### 8. Stock Ledger

Problem:

`stock_items` tracks current state, but not stock movement history.

Recommended feature:

1. `stock_movements`
2. `supplier_orders`
3. `physical_counts`
4. `stock_adjustments`

Acceptance gate:

Restock, stock-in, stock-out, and manual adjustment create ledger rows and update the current item state.

### 9. Governance and Role Matrix

Problem:

Auth exists, but role boundaries and approval matrix are not yet deep enough for cooperative operations.

Recommended feature:

1. roles: admin, manager, operator, gerai, finance_committee, viewer
2. approval policy per module
3. export permission
4. finance no-auto-approval guard
5. audit-friendly access log

Acceptance gate:

Finance, buyer approval, report locking, and exports require explicit allowed roles and create audit records.

### 10. Security Hardening Loop

Problem:

The current app has basic auth/session protection, but the Agent Eksplorasi security pass identified missing production-hardening controls.

Recommended feature:

1. Login throttling by email and IP.
2. Mutation route role checks.
3. Tenant/cooperative scoping on stateful records.
4. CSRF protection for cookie-authenticated mutations.
5. WhatsApp webhook idempotency by provider message id.
6. Timeout and rate-limit wrappers for public external fetches.

Acceptance gate:

Repeated login failures are throttled, mutation routes reject unauthorized roles, webhook replay is ignored, and external-source checks fail fast with safe fallback messages.

### 11. Test and Migration Framework

Problem:

The repo has build/lint verification and scripts for setup/imports, but no durable automated test suite or migration history/rollback framework.

Recommended feature:

1. Add migration history table or adopt a migration tool.
2. Add rollback-safe migration conventions.
3. Add API tests for auth, webhook, data imports, and dashboard mutations.
4. Add browser smoke tests for public page, Peta Unggulan, login redirect, and env-gated API states.

Acceptance gate:

CI or local verification can run a repeatable test suite that proves route behavior, auth guard behavior, webhook safety, and core data import assumptions.

## Priority Backlog

| Priority | Feature | Why Now | Verification |
|---|---|---|---|
| P0 | Agent Exploration Session Memory | Required for full sync with Agent Eksplorasi chat | Finding can become backlog with evidence |
| P0 | WA Center API-backed send | Existing UI should persist messages | `/api/wa/messages` row exists after send |
| P0 | Record lifecycle audit trail | Needed for human-reviewed AI and cooperative governance | Every mutation writes `record_events` |
| P1 | Voice/photo evidence pipeline | Needed for real WhatsApp-first intake | Media evidence and transcription status exist |
| P1 | Aceh IDM desa connector | First direct desa commodity source | `regional-open-data-desa` profiles appear |
| P1 | Data coverage dashboard | Makes source truth visible | Coverage by source/level/province shown |
| P2 | Buyer CRM | Turns matching into operations | Outreach event after approval |
| P2 | Stock ledger | Turns stock cards into auditable inventory | Movement rows update item state |
| P2 | Role matrix | Needed before serious pilot | Restricted actions enforce roles |
| P2 | Security hardening loop | Needed before pilot traffic | Throttle, CSRF, idempotency, timeout checks pass |
| P2 | Test and migration framework | Needed for repeatable delivery | API/browser tests and migration history exist |

## Runtime Verification Still Needed

Full DB-backed verification still needs one of:

1. Docker Desktop engine running locally.
2. A reachable local PostgreSQL service.
3. A safe remote/staging database URL.

Once available, run:

```powershell
npm run db:migrate
npm run db:seed
npm run data:import-wilayah
npm run data:import-commodity-baseline
npm run data:import-bps-commodities
npm run data:warm-boundaries
npm run lint
npm run build
```

Then smoke:

1. `/`
2. `/login`
3. `/dashboard`
4. `/wa`
5. `/agents`
6. `/peta-unggulan`
7. `/api/health`
8. `/api/dashboard`
9. `/api/wa/messages`
10. `/api/agents/run`
11. `/api/commodity-profiles/coverage`
12. `/api/admin-areas/drilldown?code=32&limit=5`

## Session Sync Rule Going Forward

For every Agent Eksplorasi loop:

1. Read latest thread status.
2. Extract only evidence-backed findings.
3. Update this document or a numbered follow-up checkpoint.
4. If implementation starts, link each code change to one backlog item.
5. Do not mark env-gated integrations as production-ready until live credentials and smoke tests prove it.

# QA Review Orchestration - 2026-07-10

Project: Lumbung Bersama
Repo: `C:\Users\Lenovo LOQ\OneDrive\Documents\Lumbung Bersama\lumbung-bersama-repo`
Role: main QA/reviewer with executor, explorer, and memory/checklist agents

## Session Anchors

- QA/reviewer thread: `019f4a92-6e78-7e23-9cf5-d283d64e51a3`
- Agent Eksekutor thread: `019f4a90-1ff3-7871-a3c9-b48f3fc800bb`
- Agent Eksplorasi thread: `019f4a4b-4e36-7423-a631-e608dea29546`

## Product Decision

The current MVP flow remains:

`Peta Potensi Desa -> Rekomendasi Komoditas/Produk -> Buyer Matching Lite -> Stok/Readiness -> Laporan Aksi`

The demo must not present Lumbung Bersama as a full marketplace, full SIMKOPDES integration, live WhatsApp production system, autonomous AI decisioning platform, or production-ready national direct-desa coverage.

## Agents Used

- Main QA/reviewer: orchestrated scope, verified patches, ran lint/build/smoke checks, and kept claims scoped.
- Executor agent: ran independent lint/build/production-smoke checks. It reported no build/runtime blocker and made no file edits.
- Memory/checklist agent: produced P0/P1/P2 acceptance checklist from `AGENTS.md`, `docs/30`, `docs/31`, and `docs/32`.
- Explorer QA agent: route/API read-only audit completed. It found no P0, then reported P1 risks around WA delivery wording, agent `ai-ready` wording, webhook idempotency/bad JSON, and P2 consistency issues around inherited baseline coverage and dependency advisory.

## Fixes Applied

1. Public navigation anchors were aligned with the current homepage sections:
   - `MVP -> #mvp`
   - `Peta -> #unggulan`
   - `Flow -> #buyer`
   - `Tata kelola -> #tata-kelola`
   - `FAQ -> #faq`

2. WA Center authenticated surface was moved from timeout-only client simulation to `/api/wa/messages`:
   - valid messages call the local API;
   - successful responses show saved status and bot reply from the API;
   - failures show the real env/DB blocker;
   - production gate copy now separates `DATABASE_URL` for local records from `WHATSAPP_BUSINESS_TOKEN` for live delivery.

3. Homepage unused imports were removed after the MVP copy changes so lint stays clean.

4. WA draft statuses were made explicit:
   - `/api/wa/messages` now says a draft is saved and live delivery is a separate env-gated step;
   - operator queue follow-up now says a follow-up draft is saved and live delivery is separate;
   - only `/api/wa/send` should report successful Graph API delivery.

5. Agent and peta analysis statuses no longer claim `ai-ready` when no provider call is made. With `OPENAI_API_KEY` configured, the status now says provider is configured but the output remains rules/Postgres based.

6. WhatsApp webhook robustness was improved:
   - invalid signed JSON returns `400 INVALID_WEBHOOK_JSON`;
   - `wa_messages.provider_message_id` was added with a unique partial index;
   - webhook inserts now use provider message IDs and ignore duplicate replays.

7. Commodity coverage defaults were aligned so public coverage and dashboard helpers exclude `inherited-province-baseline` unless an explicit audit endpoint/mode is used.

8. A build-blocking fallback bug was fixed in `src/lib/peta-demo-fallback.ts`: the commodity-search fallback no longer overwrites duplicate object fields through a late spread.

9. A repeatable setup-required QA smoke gate was added:
   - `npm run qa:smoke` starts `next start` on port `3107` when needed;
   - verifies `/`, `/peta-unggulan`, `/dashboard` login redirect, `/api/health`, and `/api/wa/messages`;
   - scans source for `ai-ready` and `Siap dikirim` overclaim text;
   - stops the Windows process tree cleanly after the run.

10. WA intake now has an operator-queue bridge:
   - local WA messages and webhook messages can create deterministic operator queue entries;
   - duplicate provider webhook IDs reuse the same queue identity through `provider_message_id`;
   - the bridge lives in `src/lib/wa-operator-queue.ts`.

11. Pilot security gates were tightened without adding a migration:
   - authenticated mutation routes using `requireAuthenticatedRequest` now reject cross-origin browser mutations with `403 CSRF_REJECTED`;
   - login and logout routes also apply the same-origin mutation gate;
   - login has an in-memory IP+email throttle returning `429 LOGIN_THROTTLED` after repeated failures.

12. Agent Center runs are now case-backed when possible:
   - `/api/agents/run` looks up `recordId` in `operator_queue`;
   - if no queue row exists, it looks up `recordId` as `wa_messages.id` or `wa_messages.provider_message_id`;
   - output, explanation, checks, status, and next action include sender/source/module/status/summary when a case is found;
   - unknown records still fall back to the previous rules-based behavior so the UI remains usable.

13. Remaining pilot gate work was tightened:
   - `auth.ts` exposes a reusable operational mutation role gate;
   - `/api/wa/messages`, `/api/wa/send`, and `/api/agents/run` now require an operational role after auth/CSRF;
   - runtime API external fetches now route through timeout-aware helpers, with WA live send also rate-limited;
   - source scan confirms no raw server-route `await fetch(...)` remains outside `src/lib/external-fetch.ts`.

14. Shared hackathon DB compatibility layer was added as read-only:
   - `src/lib/hackathon-shared-db.ts` builds a separate pool from `HACKATHON_SHARED_DATABASE_URL` or local `DB_*` env, never from app `DATABASE_URL`;
   - all helper queries reject non-`SELECT`/`WITH` SQL and run inside `BEGIN READ ONLY`;
   - `/api/hackathon/mvp-summary` exposes authenticated aggregate-only MVP evidence from `referensi_wilayah`, `referensi_komoditas_desa`, `profil_koperasi`, `produk_koperasi`, `inventaris_produk`, `transaksi_penjualan`, and `pengajuan_kemitraan`;
   - the endpoint does not expose NIK, phone numbers, member/customer rows, or other personal detail.

15. Follow-up QA P1 findings were closed:
   - default commodity coverage counters in dashboard, peta data, source check, and commodity intelligence now exclude `inherited-province-baseline` for `totalAreas` and `totalProfiles`, while exposing inherited rows only as legacy/audit counts;
   - `/api/agents/run` now passes the active cooperative id into case lookup and filters both `operator_queue` and `wa_messages` by `cooperative_id`, preventing cross-cooperative record lookup in the case-backed agent path.

16. A repeatable DB-backed authenticated QA gate was added:
   - `scripts/load-local-env.mjs` loads `.env.local` / `.env` for local Node scripts without overriding shell env;
   - `scripts/db-migrate.mjs` and `scripts/db-seed.mjs` now load local env before checking `DATABASE_URL`;
   - `npm run qa:auth-smoke` runs the authenticated happy path after Postgres/admin env are available: health `operator-ready`, login/session, `/api/me`, `/api/dashboard`, buyer approve, stock restock, finance review, operator queue patch/follow-up, report section, report lock, WA intake-to-queue, agent case-backed runs for seeded queue and WA message, notifications, profile patch, logout, and revoked-session rejection;
   - the auth smoke fails fast when `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, or `QA_ADMIN_PASSWORD` are missing, so it cannot be mistaken for a pass in setup-required mode.

17. Production build mode was locked to webpack:
   - the default `next build` Turbopack output on Next.js `16.2.9` passed compilation but `next start` returned `500` for authenticated `/agents` with `Invariant: The client reference manifest for route "/agents" does not exist`;
   - `npx next build --webpack` produced a stable production artifact and `npm run qa:auth-smoke` then passed `/agents -> 200`;
   - `package.json` now runs `next build --webpack` so future CI/local QA uses the stable build mode until the Turbopack runtime issue is intentionally re-evaluated.

18. Shared DB MVP enrichment was surfaced in the dashboard without changing the map UI:
   - `/api/hackathon/mvp-summary` now marks the shared DB schema as a limited SIMKOPDES exploration sample, not the primary SIMKOPDES reference;
   - the same schema-scope caveat is returned by `/api/hackathon/data-quality`, `/api/hackathon/opportunity-scores`, and `/api/hackathon/buyer-matching`;
   - Dashboard `Lumbung Data` now fetches `/api/hackathon/mvp-summary` and shows env-gated read-only aggregate cards for coverage, province opportunities, cooperative candidates, and data-quality flags;
   - the UI keeps the source caveat visible and does not expose PII or row-level personal data.

19. Follow-up executor pass for the latest exploration handover:
   - Dashboard `Lumbung Data` now loads all four hackathon evidence endpoints: MVP summary, data quality, opportunity scores, and buyer matching lite;
   - `/laporan` was rebuilt as a real API-backed action report using `/api/dashboard` plus optional shared DB aggregate evidence, instead of static pilot data;
   - `/api/open-data/sources` now returns source labels and the P0 external-data roadmap from `docs/37`, with matching seed rows for BIG, Kemendesa, BPS, Bapanas, PIHPS, Kemendag/SISP, and BPK regulation references;
   - `npm run qa:smoke` now covers protected demo routes `/agents`, `/wa`, `/laporan`, `/integrasi` and all four `/api/hackathon/*` endpoints.

## Verification Evidence

Commands run from repo root:

```powershell
npm run lint
npm run build
npm run qa:smoke
npm run start -- -p 3107
curl.exe -s -I http://localhost:3107/
curl.exe -s -I http://localhost:3107/peta-unggulan
curl.exe -s -i http://localhost:3107/api/health
curl.exe -s -i -X POST http://localhost:3107/api/wa/messages -H "Content-Type: application/json" --data "{\"message\":\"Kopi kering siap dicek buyer\",\"sender\":\"Warga\"}"
```

Observed results:

- `npm run lint` passed with no warnings.
- `npm run build` passed on Next.js `16.2.9` after fixing the fallback duplicate-field type error.
- `npm run qa:smoke` passed and exited cleanly.
- After the Agent Center case-backed patch, `npm run lint`, `npm run build`, and `npm run qa:smoke` passed again.
- After the role/timeout pass, `npm run lint`, `npm run build`, and `npm run qa:smoke` passed again.
- Latest `npm run qa:smoke` also proves `/api/auth/login` rejects a cross-origin mutation with `CSRF_REJECTED` and scans source for CSRF/throttle gates.
- Latest `npm run qa:smoke` also confirms role/scope and external fetch gates.
- Latest `npm run qa:smoke` also confirms `/api/hackathon/mvp-summary` is gated by shared DB config or auth before exposing data.
- After the P1 coverage/scoping patch, `npm run lint`, `npm run build`, and `npm run qa:smoke` passed again.
- The final `npm run build` included `/api/hackathon/mvp-summary` in the Next.js route manifest.
- After adding `qa:auth-smoke`, `node --check scripts/qa-auth-smoke.mjs`, `node --check scripts/load-local-env.mjs`, `npm run lint`, `npm run build`, and `npm run qa:smoke` passed.
- Docker Desktop was started successfully after an initial service permission warning, then `docker compose -f docker-compose.postgres.yml up -d` pulled `postgres:16-alpine` and started `lumbung-bersama-postgres`.
- `docker compose -f docker-compose.postgres.yml ps` shows `lumbung-bersama-postgres` healthy on `0.0.0.0:5432->5432/tcp`.
- With ephemeral local admin credentials supplied only through the shell environment, `npm run db:setup` passed: schema and seed were applied to the local Postgres container.
- `npm run qa:auth-smoke` passed against the local DB on port `3108`:
  - `/api/health` returned `operator-ready`;
  - unauthenticated `/dashboard` redirected to login;
  - admin login set `lb_session`;
  - authenticated pages `/dashboard`, `/wa`, `/agents`, `/laporan`, and `/integrasi` returned `200`;
  - `/api/dashboard` returned seeded cooperative workspace;
  - buyer approval, stock restock, finance review, queue patch/follow-up, report section toggle, and report lock mutations passed;
  - WA intake created a `wa_messages` row and an operator queue item;
  - agent runs were case-backed for both seeded queue `LB-1024` and a newly created WA message;
  - notifications, profile patch, logout, and revoked-session rejection passed.
- Per user request, the DB-authenticated gate was run again after reseeding; the second `npm run qa:auth-smoke` run passed with the same coverage.
- Executor rerun found one idempotency bug after repeated local seed/login cycles: `/api/auth/login` inserted bootstrap admin `id='admin-primary'` but only handled `ON CONFLICT (email)`, causing `users_pkey` duplicate errors when the existing admin row used a different email. The login bootstrap now conflicts on `id`, refreshes email/hash/name/title/avatar fields, and rerun evidence passed: `npm run lint`, `npm run build`, `node scripts/db-seed.mjs`, `node scripts/qa-auth-smoke.mjs`, and `npm run qa:smoke`.
- Fresh rerun on user request found a production-only Turbopack artifact bug: after `npm run build` with default Turbopack, `npm run qa:auth-smoke` failed at `/agents` with `500` and a missing client reference manifest for route `"/agents"`.
- After switching the build script to `next build --webpack`, these commands passed again from repo root: `npm run build`, `npm run lint`, `npm run qa:smoke`, reseeded `npm run db:seed`, and `npm run qa:auth-smoke`.
- The final authenticated rerun returned `200` for `/dashboard`, `/wa`, `/agents`, `/laporan`, and `/integrasi`, and passed the dashboard, buyer, stock, finance, queue, report, WA intake, agent case-backed, notifications, profile, logout, and revoked-session checks.
- After the shared DB dashboard-enrichment pass, `npm run lint`, `npm run build`, `npm run qa:smoke`, and `git diff --check -- src/app/api/hackathon/mvp-summary/route.ts src/components/DashboardClient.tsx` passed.
- Local `.env.local` currently has shared DB host/database/user/prefix keys present, but `DB_PASSWORD` and `HACKATHON_SHARED_DATABASE_URL` are empty. Shared DB live queries were therefore not executed in this run; the dashboard will show the env-gated state until the secret is supplied through the environment.
- After the latest executor handover pass, `npm run lint`, `npm run build`, `npm run qa:smoke`, and targeted `git diff --check` passed for `DashboardClient`, `ReportClient`, `qa-smoke`, `open-data` registry/API, and `db/seed.sql`.
- Production server started at `http://localhost:3107` and was stopped after smoke checks.
- `/` returned `200 OK`.
- `/peta-unggulan` returned `200 OK`.
- `/api/health` returned `200 OK` with `mode: setup-required`, `database.configured: false`, and all production integrations not configured.
- `/api/wa/messages` returned `503 DATABASE_URL_REQUIRED`, which is expected without local Postgres and is now surfaced by the WA Center instead of hidden behind a fake timeout.

Additional scan evidence:

- No `Siap dikirim` wording remains in source after the draft/live-delivery split.
- No `ai-ready` status remains in source for rules-only outputs.
- `provider_message_id`, `INVALID_WEBHOOK_JSON`, and baseline-exclusion predicates are present in the patched code.
- `/api/agents/run` now contains `Case source`, `Record status`, and `Human approval` checks for matched records, and uses `case-backed-rules-complete` statuses without `ai-ready` wording.
- Docker/Postgres blocker is resolved for local QA: `lumbung-bersama-postgres` is healthy and DB-backed authenticated scenarios passed twice.
- Browser QA on `http://127.0.0.1:3107` passed for setup-required public surfaces:
  - desktop home: H1 `Peta peluang desa yang berakhir menjadi aksi koperasi.`, `#mvp` and `#buyer` anchors present, `/peta-unggulan` CTA present, no horizontal overflow;
  - desktop peta: Leaflet rendered, search present, `Mode demo lokal` visible, no `DATABASE_URL_REQUIRED` or Postgres setup text leaked, no horizontal overflow;
  - mobile 390x844 home and peta: no horizontal overflow, peta Leaflet/search/demo label/komoditas text visible.
- Port `3107` was verified empty after browser QA.

## Current DB Runtime State

- Local DB-backed QA now uses the repo Docker compose service `lumbung-bersama-postgres`.
- The app `.env.local` still intentionally leaves `DATABASE_URL` empty, so normal setup-required smoke does not accidentally bind the app to a DB.
- For authenticated DB QA, set `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `QA_ADMIN_PASSWORD` in the shell, run `npm run db:setup` or at least `npm run db:seed`, then run `npm run qa:auth-smoke`.
- Plaintext QA passwords are ephemeral shell values only and must not be written to repo docs or vault notes.

## Current P0 QA Gates

1. Prove the MVP flow in browser on desktop and mobile:
   `/peta-unggulan -> /agents or dashboard recommendation -> buyer matching lite -> stok/readiness -> /laporan`.
2. Keep all live integration claims env-gated and source-labeled.
3. Do not write to the shared live hackathon database unless explicit permission and table-prefix/create access are confirmed.
4. Add or verify remaining security gates before pilot traffic:
   login throttling, same-origin CSRF rejection, webhook idempotency, mutation role checks, tenant/cooperative scoping, and external fetch timeouts/rate limits now have implementation and smoke evidence. Continue hardening with DB-backed role/tenant tests when Postgres is available.
5. DB-backed verification is now covered by `npm run qa:auth-smoke`; rerun it after any auth/dashboard/mutation/WA/agent/report changes.

## Working Tree Note

The worktree already had broad MVP alignment changes from the executor flow. This QA pass only intentionally touched:

- `src/components/PublicHeader.tsx`
- `src/components/WhatsAppHubClient.tsx`
- `src/app/page.tsx`
- `src/app/api/agents/run/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/admin-areas/boundaries/route.ts`
- `src/app/api/buyer-matches/[id]/approve/route.ts`
- `src/app/api/commodity-news/route.ts`
- `src/app/api/dashboard/route.ts`
- `src/app/api/finance-requests/[id]/review/route.ts`
- `src/app/api/operator-queue/[id]/route.ts`
- `src/app/api/peta-potensi/analyze/route.ts`
- `src/app/api/peta-potensi/source-check/route.ts`
- `src/app/api/peta-unggulan/data/route.ts`
- `src/app/api/report-periods/current/lock/route.ts`
- `src/app/api/report-sections/[id]/route.ts`
- `src/app/api/stocks/[id]/restock/route.ts`
- `src/app/api/wa/send/route.ts`
- `src/app/api/wa/messages/route.ts`
- `src/app/api/wa/webhook/route.ts`
- `src/lib/commodity-intelligence.ts`
- `src/lib/auth.ts`
- `src/lib/external-fetch.ts`
- `src/lib/peta-demo-fallback.ts`
- `src/lib/wa-operator-queue.ts`
- `src/lib/hackathon-shared-db.ts`
- `scripts/load-local-env.mjs`
- `scripts/db-migrate.mjs`
- `scripts/db-seed.mjs`
- `scripts/qa-auth-smoke.mjs`
- `src/app/api/hackathon/mvp-summary/route.ts`
- `src/components/DashboardClient.tsx`
- `src/components/ReportClient.tsx`
- `src/app/api/open-data/sources/route.ts`
- `src/lib/open-data-sources.ts`
- `db/schema.sql`
- `db/seed.sql`
- `package.json`
- `scripts/qa-smoke.mjs`
- `docs/33-qa-review-orchestration-2026-07-10.md`

Do not assume the other modified files were authored by this QA pass without checking their diffs.

## Executor Follow-up: Buyer Archetype Guard

After the multi-agent implementation round, QA found a P1 risk: seeded and fallback buyer rows still used real-looking buyer names, while the hackathon buyer-matching endpoint correctly framed matches as archetypes only. The executor follow-up addressed that risk without changing the shared DB contract:

- `/api/dashboard` now sanitizes buyer match rows before returning them to UI clients. The `buyer` display value is an archetype label, the payload carries `buyerSource`, `sourceLabel`, and `verifiedBuyer: false`, and old contact-ready statuses are normalized to operator review.
- Dashboard buyer panels now show source labels, select matches by `id`, and generate a generic draft outreach to a calon mitra rather than addressing a named buyer.
- `/laporan` now reports buyer readiness actions as aggregate/archetype evidence and shows the same source label in the buyer readiness section.
- Seed and fallback demo data now use buyer archetypes and no longer include named roastery/warung/olahan buyer examples.
- `qa:smoke` now scans source and seed files for MVP red-line claims: rules-only `ai-ready`, live WA delivery wording, contact-ready buyer rows, named demo buyers, live/production SIMKOPDES claims, autonomous AI decisioning, auto-financing approval, marketplace checkout, and guaranteed buyer demand.

Verification after this follow-up:

- `npm run lint` passed with exit code 0. It still reports one pre-existing warning in `tmp/spreadsheet_pack_builder/build-hackathon-data-pack.mjs`.
- `npm run build` passed. The first build attempt hit a webpack `WasmHash` cache crash on Node v24.14.0; deleting only `.next/cache` inside the repo resolved it and the rerun completed.
- `npm run qa:smoke` passed: public routes, protected redirects, health, WA DB gate, all four hackathon shared-DB gates, CSRF rejection, MVP red-line source scan, archetype-only buyer evidence gates, CSRF/login-throttle source gates, role/scope gates, and external fetch gates.
- `git diff --check` passed for the executor-touched files.

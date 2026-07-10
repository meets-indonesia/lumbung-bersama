# Lumbung Bersama Implementation Delegation Plan

Date: 2026-07-10
Purpose: executor-agent handoff for finishing the hackathon MVP safely
Team/table prefix: `anak_sarengklek_`

## 1. Scope Rule

This plan is for implementable MVP work after exploration. It must not overwrite broad existing changes in the dirty worktree.

Execution principles:

1. Small, additive changes.
2. Disjoint file ownership per executor.
3. No secrets in repo, docs, logs, or screenshots.
4. No shared DB mutation unless explicit privilege is confirmed.
5. Use `anak_sarengklek_` for any derived table or materialized artifact.
6. Demo endpoints must be aggregate-only and no PII.
7. Every live integration claim must be env-gated and smoke-tested.
8. Treat the hackathon schema/sample data as limited exploration material, not the primary SIMKOPDES reference.

## 2. Current Product Anchor

The MVP flow is fixed:

`Peta Potensi Desa -> Opportunity Score -> Buyer Matching Lite -> Aggregation/Stock Readiness -> Financing Readiness -> Laporan Aksi`

Keep:

1. `/peta-unggulan` as the main visual proof.
2. Explainable recommendation cards.
3. Buyer Matching Lite, not marketplace checkout.
4. Stock/readiness as proof of execution feasibility.
5. Laporan Aksi as the final output.
6. Auth/login and integration health as trust signals.

Avoid:

1. Marketplace checkout.
2. Payment settlement.
3. Automatic financing approval.
4. Live SIMKOPDES claim.
5. Claiming the sample schema is final SIMKOPDES production truth.
6. Autonomous AI claim.
7. PII exposure.

## 3. Executor Assignments Started

### Executor 1 - Shared DB Data Quality Endpoint

Completed agent nickname:

`Boole`

Assigned file:

`src/app/api/hackathon/data-quality/route.ts`

Goal:

Create authenticated read-only endpoint that reports data quality flags for MVP tables.

Expected response:

1. `source`
2. `mode`
3. `tablePrefix`
4. `checks`
5. `piiGuardrails`
6. `recommendations`

Tables:

1. `referensi_komoditas_desa`
2. `profil_koperasi`
3. `inventaris_produk`
4. `pengajuan_kemitraan`

Acceptance:

1. Uses `requireAuthenticatedRequest`.
2. Uses `hackathon-shared-db` read-only helpers.
3. No mutation.
4. No PII fields selected.
5. `npm run lint` passes.

Status:

Completed. Earlier transport attempt failed, then Boole implemented the endpoint and reported `npm run lint` passing.

### Executor 2 - Opportunity Scores Endpoint

Completed agent nickname:

`Pauli`

Assigned file:

`src/app/api/hackathon/opportunity-scores/route.ts`

Goal:

Create authenticated read-only endpoint that ranks area opportunities with explainable components.

Expected response:

1. `source`
2. `mode`
3. `tablePrefix`
4. `scoreWeights`
5. `topAreas`
6. `guardrails`
7. `recommendations`

Formula:

`30 commodity potential + 20 cooperative readiness + 20 product/stock readiness + 15 market signal + 10 partnership signal + 5 data quality`

Acceptance:

1. Score bounded 0-100.
2. Component scores visible.
3. Aggregate by safe area fields.
4. Limit top 15.
5. No PII.
6. `npm run lint` passes.

Status:

Completed. Earlier transport attempt failed, then Pauli implemented the endpoint and reported `npm run lint` passing. The main reviewer added a small integration patch so cooperative readiness now uses `profil_koperasi` signals as claimed.

### Executor 3 - Buyer Matching Lite Endpoint

Completed agent nickname:

`Fermat`

Assigned file:

`src/app/api/hackathon/buyer-matching/route.ts`

Goal:

Create authenticated read-only endpoint that shows buyer matching as readiness/archetype logic without fake named buyers.

Expected response:

1. `source`
2. `mode`
3. `tablePrefix`
4. `buyerArchetypes`
5. `matchWeights`
6. `matches`
7. `guardrails`
8. `nextActions`

Formula:

`25 product fit + 20 stock readiness + 15 supply consistency + 15 location/logistics + 10 quality/readiness proxy + 10 transaction/partnership signal + 5 governance readiness`

Acceptance:

1. Top 20 matches.
2. Uses generic buyer archetypes until real buyer requirement data exists.
3. No PII.
4. `npm run lint` passes.

Status:

Completed. Earlier transport attempt failed, then Fermat implemented the endpoint and reported `npm run lint` passing.

### Executor 4 - Financing Readiness Endpoint And Report Surface

Completed agent nickname:

`Codex executor`

Assigned files:

1. `src/app/api/hackathon/financing-readiness/route.ts`
2. `src/components/DashboardClient.tsx`
3. `src/components/ReportClient.tsx`
4. `scripts/qa-smoke.mjs`

Goal:

Expose financing readiness as aggregate-only deal-room evidence for the final MVP flow.

Expected response:

1. `source`
2. `mode`
3. `tablePrefix`
4. `freshness`
5. `confidence`
6. `totals`
7. `statusSummary`
8. `channelSummary`
9. `actionChecklist`
10. `guardrails`

Acceptance:

1. Authenticated and read-only.
2. No row-level borrower/member/bank/PII fields returned.
3. Draft/requested/verified counts visible.
4. Deal room checklist states readiness only, not financing approval.
5. Dashboard and Laporan Aksi consume the aggregate response.

Status:

Completed. The dashboard now shows the final problem thesis, six-step MVP flow, financing readiness status cards, and action checklist. `/laporan` includes financing readiness in the visible report and CSV export with source, freshness, confidence, next action, privacy scope, and caveat columns.

## 4. Next Executor Tasks To Delegate After Endpoints

### Task A - Dashboard Consumption Panel

Suggested owner:

Frontend executor.

Files:

1. `src/components/DashboardClient.tsx`
2. Optional new component under `src/components/`

Goal:

Add a compact "Hackathon Evidence" panel showing:

1. Shared DB configured/not configured.
2. MVP summary counts.
3. Top opportunity areas.
4. Buyer matching lite readiness.
5. Data quality warnings.

Guardrails:

1. Do not break current dashboard layout.
2. Show "requires login/shared DB" states cleanly.
3. No PII.
4. No fake metrics.

### Task B - Laporan Aksi MVP Export Content

Suggested owner:

Reporting executor.

Files:

1. `src/components/ReportClient.tsx`
2. Optional API route only if needed.

Goal:

Make Laporan Aksi mirror the pitch:

1. Top opportunities.
2. Evidence/source.
3. Pending verification.
4. Buyer action.
5. Stock/readiness gap.
6. Human decision status.

Guardrails:

1. Keep financing as readiness, not approval.
2. No PII.
3. Export must not include secrets.

### Task C - Demo Route Checklist

Suggested owner:

QA executor.

Files:

1. `scripts/qa-smoke.mjs`
2. Optional new `scripts/qa-hackathon-demo.mjs`

Goal:

Add a repeatable route smoke for:

1. `/`
2. `/peta-unggulan`
3. `/dashboard`
4. `/agents`
5. `/wa`
6. `/laporan`
7. `/integrasi`
8. `/api/hackathon/mvp-summary`
9. `/api/hackathon/data-quality`
10. `/api/hackathon/opportunity-scores`
11. `/api/hackathon/buyer-matching`
12. `/api/hackathon/financing-readiness`

Guardrails:

1. If shared DB is not configured, expected result is 503 config-required, not failure.
2. Auth gating must be recognized.
3. No real credentials logged.

### Task D - Optional Derived Tables

Suggested owner:

Backend/data executor after explicit DB-write permission only.

Tables must use prefix:

1. `anak_sarengklek_mvp_table_counts`
2. `anak_sarengklek_area_commodity_coverage`
3. `anak_sarengklek_village_opportunity_scores`
4. `anak_sarengklek_cooperative_readiness_scores`
5. `anak_sarengklek_stock_readiness_summary`
6. `anak_sarengklek_buyer_offtakers`
7. `anak_sarengklek_buyer_requirements`
8. `anak_sarengklek_buyer_match_scores`
9. `anak_sarengklek_report_action_items`
10. `anak_sarengklek_data_quality_flags`

Guardrails:

1. Do not create/write these until DB privilege and table-prefix rules are confirmed.
2. Use migrations with rollback.
3. No PII columns unless strictly required and access-controlled.

## 5. Technical Baseline

Existing stack:

1. Next.js 16.
2. React 19.
3. Relational data layer via `pg`.
4. Leaflet for map.
5. Tailwind v4.
6. ESLint.

Existing trust features:

1. Auth with HttpOnly session cookie.
2. PBKDF2 password hash.
3. Session rows in the app data store.
4. Logout session revoke.
5. Same-origin CSRF rejection for mutations.
6. Operational role gate helpers.
7. Timeout-aware external fetch helper.
8. Shared DB helper running read-only transactions.

Important env guidance:

1. Local secrets belong in `.env.local` or shell env, never in git.
2. Google account passwords must be changed interactively by the account owner and then stored in a password manager.
3. Production secrets belong in Google Secret Manager.
4. Shared DB password must not appear in docs, slides, screenshots, or final reports.
5. Shared DB sample data is for exploration and aggregate evidence; production SIMKOPDES mapping needs official schema/access confirmation.

## 6. Google Cloud Credit Best Practice

Budget discipline:

1. Create billing budget alert before deploy.
2. Use Cloud Run min instances 0.
3. Use small DB/runtime size.
4. Avoid always-on GPU.
5. Limit AI calls and cache source checks.
6. Delete unused resources after demo.

Suggested architecture:

1. Cloud Run: Next.js/API container.
2. Secret Manager: DB URL, auth/admin secrets, WhatsApp token, AI key.
3. Cloud Logging: audit and route errors.
4. Cloud Scheduler/Cloud Run Jobs: data import refresh.
5. Cloud Storage: evidence files only if upload/media pipeline is enabled.
6. Cloud SQL relational database: only if not using the provided shared evidence source for demo evidence.

## 7. Verification Gates

Before final demo:

1. `npm run lint`
2. `npm run build`
3. `npm run qa:smoke`
4. `node --check scripts/qa-auth-smoke.mjs`
5. Browser check desktop and mobile for:
   - `/`
   - `/peta-unggulan`
   - `/dashboard`
   - `/wa`
   - `/agents`
   - `/laporan`
6. API check:
   - shared DB endpoints return config-required, auth-required, or aggregate data correctly.
   - no endpoint returns PII.

Expected blocker if no local app DB:

`npm run qa:auth-smoke` may fail fast with missing `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, or `QA_ADMIN_PASSWORD`. This is acceptable only if documented as environment blocker, not app pass.

## 8. Implementation Priority

P0 for presentation:

1. Shared DB aggregate endpoints.
2. Dashboard evidence panel.
3. Clean MVP route flow.
4. Laporan Aksi aligned with pitch.
5. Lint/build pass.
6. Screenshot-ready demo states.

P1 after presentation:

1. Buyer requirement real table/import.
2. Stock ledger.
3. External data source connector registry from `docs/37-external-data-source-map.md`.
4. Data coverage dashboard.
5. Media evidence pipeline.
6. DB-backed authenticated QA.

P2 pilot hardening:

1. Role matrix per cooperative.
2. Record lifecycle/audit events.
3. Migration history/rollback.
4. SIMKOPDES mapping after official standard/access.
5. Advanced AI evaluation.

## 9. Executor Prompt Template

Use this for new agents:

```text
You are an executor in the Lumbung Bersama repo. The worktree is dirty and other agents/users may be editing files. Do not revert or overwrite unrelated edits. Your ownership is limited to: [FILES].

Goal: [ONE CONCRETE FEATURE].

Rules:
- No secrets in code/docs/logs.
- No PII in demo outputs.
- No shared DB mutation unless explicitly authorized.
- Use team table prefix `anak_sarengklek_` for any derived table.
- Keep claims source-labeled and env-gated.
- Run `npm run lint` and relevant checks if feasible.

Final response:
- Changed files.
- What works.
- Verification.
- Blockers.
```

# Lumbung Bersama App

Next.js hackathon MVP app for Lumbung Bersama, focused on turning village-potential data into auditable cooperative action.

Current MVP flow:

`Peta Potensi Desa -> Opportunity Score -> Buyer Matching Lite -> Aggregation/Stock Readiness -> Financing Readiness -> Laporan Aksi`

WhatsApp remains an intake and verification support channel. Do not present the app as a full marketplace, POS, bank integration, autonomous AI decision system, or official government production system.

## Routes

| Route | Purpose |
|---|---|
| `/` | Light, SEO-ready public MVP landing page |
| `/wa` | WA intake operator untuk catatan inbound dan outbound env-gated |
| `/dashboard` | Operator command center with dark/light check |
| `/peta-unggulan` | Main MVP map surface for village potential, commodities, source checks, and opportunity analysis |
| `/peta-potensi` | Legacy redirect to `/peta-unggulan` |
| `/agents` | Three focused MVP agents: unggulan desa, pasar/mitra, laporan |
| `/modules` | Core MVP modules first, support modules second |
| `/modules/[slug]` | Detail page for each module |
| `/laporan` | Lapor Siap report preview and CSV export |
| `/integrasi` | Env-gated integration readiness and API health check |
| `/api/health` | Integration/env health route |
| `/api/agents/run` | Pilot agent execution route |
| `/api/peta-unggulan/analyze` | Rule-backed pilot analysis for village opportunity |
| `/api/peta-unggulan/source-check` | Reachability check for national data-source candidates |
| `/api/open-data/sources` | Open-data catalog and import coverage |
| `/api/admin-areas/search` | National administrative-area search after import |
| `/api/hackathon/mvp-summary` | Authenticated, read-only aggregate summary from shared hackathon DB |
| `/api/hackathon/data-quality` | Authenticated, read-only aggregate quality checks for MVP source tables |
| `/api/hackathon/opportunity-scores` | Authenticated, read-only explainable area opportunity scoring |
| `/api/hackathon/buyer-matching` | Authenticated, read-only buyer matching lite with generic buyer archetypes |
| `/api/hackathon/financing-readiness` | Authenticated, read-only aggregate financing readiness by draft/requested/verified status |

## Project Sync Docs

| Doc | Purpose |
|---|---|
| `docs/30-agent-exploration-sync-and-feature-backlog.md` | Sync snapshot between Agent Eksplorasi chat, local repo audit, and Kevin Dev Vault memory |
| `docs/31-session-sync-runbook.md` | Repeatable procedure for the next full session-sync loop |
| `docs/32-metadata-database-mvp-feature-analysis.md` | Metadata workbook analysis for hackathon MVP features, scoring, buyer matching, and supply-chain roadmap |
| `docs/34-war-room-jury-qa-and-pitch-playbook.md` | Jury QA and pitch guardrails |
| `docs/35-slide-presentation-guide.md` | Slide and presentation guide |
| `docs/36-implementation-delegation-plan.md` | Implementation ownership and backlog |
| `docs/37-external-data-source-map.md` | External data source registry |
| `docs/38-agent-shortcuts-and-secret-activation.md` | Agent shortcuts and secret-safe server activation |

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run qa:smoke
npm run qa:auth-smoke
npm run env:merge
npm run db:setup
npm run data:import-wilayah
```

`npm run qa:smoke` is the setup-required gate. It must pass even when local Postgres is not configured.

`npm run qa:auth-smoke` is the DB-backed authenticated gate. Run it only after Postgres is reachable, `npm run db:setup` has completed, and local admin login env is configured:

```bash
export DATABASE_URL="postgresql://lumbung:lumbung_local_password@localhost:5432/lumbung_bersama"
export ADMIN_EMAIL="admin@lumbung-bersama.local"
export ADMIN_PASSWORD_HASH="<hash from npm run auth:hash-password>"
export QA_ADMIN_PASSWORD="<plaintext local QA password>"
npm run qa:auth-smoke
```

On Windows PowerShell, use `$env:NAME="value"` instead of `export`.

## Data Rules

The dashboard reads operational records from Postgres when `DATABASE_URL` is configured. Seed data is only the starter dataset for hackathon presentation and local development.

The public map has a read-only local demo fallback when `DATABASE_URL` is missing. This keeps cloned-repo QA usable, but it is explicitly labeled as demo data and must not be used for production claims.

The shared hackathon PostgreSQL database is treated as a separate read-only exploration source. The organizer clarified that this schema and sample data are a limited representation of the running SIMKOPDES system and are not the primary reference. Configure it with `HACKATHON_SHARED_DATABASE_URL` or the `DB_HOST` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` variables, set `HACKATHON_SHARED_DB_SSL=require` or `PGSSLMODE=require`, keep `HACKATHON_TABLE_PREFIX=anak_sarengklek_`, and use `/api/hackathon/mvp-summary`, `/api/hackathon/data-quality`, `/api/hackathon/opportunity-scores`, `/api/hackathon/buyer-matching`, and `/api/hackathon/financing-readiness` for aggregate MVP evidence. Do not point `DATABASE_URL` at the shared schema unless a compatibility migration is intentionally built.

The national administrative-code importer can load province, regency/city, district, and village/kelurahan codes from the open-source `cahyadsn/wilayah` dataset:

```bash
npm run data:import-wilayah
```

Commodity, koperasi, UMKM, warehouse, sawah, and livestock coverage must not be invented. They need verified operator input, citizen reports, official connector imports, authorized uploads, or clearly attributed open-data enrichment.

Do not claim:

1. Official Kemenkop endorsement.
2. Live SIMKOPDES integration.
3. Real WhatsApp delivery.
4. Real village production metrics.
5. Full national commodity or boundary coverage before import and verification.

## Env-Gated Features

Future production features should be gated by environment variables:

1. `OPENAI_API_KEY` for live AI extraction and analysis. Optional OpenAI-compatible gateway env: `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_WIRE_API` (`responses` or `chat-completions`), and `AI_PROVIDER_TIMEOUT_MS`.
2. `WHATSAPP_BUSINESS_TOKEN` for real WhatsApp messaging.
3. `WHATSAPP_PHONE_NUMBER_ID` for WhatsApp sender identity.
4. `DATABASE_URL` for persistent records.
5. `HACKATHON_SHARED_DATABASE_URL` or `DB_HOST` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` for read-only shared DB evidence, plus `HACKATHON_SHARED_DB_SSL=require`.
6. `S3_OR_R2_BUCKET` for uploaded media.
7. `BPS_API_KEY` for official BPS connector work.
8. `WILAYAH_SOURCE_URL` for national administrative-code import.
9. `OVERPASS_API_URL` for OSM/Overpass physical-asset enrichment.

The WhatsApp implementation uses WhatsApp Business Platform Cloud API webhook/send semantics. QR pairing is not part of Cloud API; a QR sync mode would require a separate adapter/service and should not be described as active until implemented and tested.

## Design Rules

Read these before frontend work:

1. `..\docs\09-lumbung-bersama-brand-system.md`
2. `..\docs\10-uiux-pro-max-frontend-workflow.md`
3. `..\docs\11-domain-and-naming-decision.md`

Important:

1. Public pages are light and SEO-ready.
2. Dashboard pages must be checked in dark mode.
3. No fake metrics.
4. No dead buttons.
5. Inputs must expose complete states.
6. Browser desktop/mobile checks should run when practical.

## Verified

Last verified on 2026-07-10:

1. `npm run lint`
2. `npm run build`
3. `npm run qa:smoke`
4. `node --check scripts/qa-auth-smoke.mjs`
5. `node --check scripts/load-local-env.mjs`
6. `npm audit --audit-level=moderate` reports a transitive PostCSS advisory through `next@16.2.9`; do not run `npm audit fix --force` because it proposes a breaking downgrade path.

## Full Feature Surface

The app now prioritizes:

1. Peta Unggulan Desa as the main demo surface.
2. Explainable commodity/product recommendation.
3. Buyer Matching Lite with human approval.
4. Stock and cooperative readiness.
5. Laporan Aksi / Lapor Siap.
6. Lumbung Data and WA intake as verification support.
7. Integration readiness and source-check APIs.

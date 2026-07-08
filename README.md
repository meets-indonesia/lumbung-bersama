# Lumbung Bersama App

Next.js full-feature hackathon production-style app for Lumbung Bersama, a WhatsApp-first assistant for Koperasi Desa/Kelurahan Merah Putih workflows.

## Routes

| Route | Purpose |
|---|---|
| `/` | Light, SEO-ready public landing page |
| `/pilot` | Pilot route selector |
| `/wa` | WA Center operator untuk catatan inbound dan outbound env-gated |
| `/dashboard` | Operator command center with dark/light check |
| `/wa` | WhatsApp command center for all feature intents |
| `/peta-unggulan` | Peta Unggulan Desa, layer toggles, source check, and opportunity analysis |
| `/peta-potensi` | Legacy redirect to `/peta-unggulan` |
| `/agents` | Agent AI center with API-backed pilot run |
| `/modules` | All product modules |
| `/modules/[slug]` | Detail page for each module |
| `/laporan` | Lapor Siap report preview and CSV export |
| `/integrasi` | Env-gated integration readiness and API health check |
| `/api/health` | Integration/env health route |
| `/api/agents/run` | Pilot agent execution route |
| `/api/peta-unggulan/analyze` | Rule-backed pilot analysis for village opportunity |
| `/api/peta-unggulan/source-check` | Reachability check for national data-source candidates |
| `/api/open-data/sources` | Open-data catalog and import coverage |
| `/api/admin-areas/search` | National administrative-area search after import |

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run db:setup
npm run data:import-wilayah
```

## Data Rules

The dashboard reads operational records from Postgres when `DATABASE_URL` is configured. Seed data is only the starter dataset for hackathon presentation and local development.

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

1. `OPENAI_API_KEY` for live AI extraction and analysis.
2. `WHATSAPP_BUSINESS_TOKEN` for real WhatsApp messaging.
3. `WHATSAPP_PHONE_NUMBER_ID` for WhatsApp sender identity.
4. `DATABASE_URL` for persistent records.
5. `S3_OR_R2_BUCKET` for uploaded media.
6. `BPS_API_KEY` for official BPS connector work.
7. `WILAYAH_SOURCE_URL` for national administrative-code import.
8. `OVERPASS_API_URL` for OSM/Overpass physical-asset enrichment.

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

Last verified on 2026-06-28:

1. `npm run lint`
2. `npm run build`
3. Build output included `/api/open-data/sources` and `/api/admin-areas/search`.

## Full Feature Surface

The app now includes:

1. WA Center.
2. Suara Warga.
3. Lumbung Data.
4. Agent AI Center.
5. Gerai Pintar.
6. Stok and Logistik.
7. Pasar and Mitra.
8. Simpan Pinjam Aman.
9. Peta Unggulan Desa.
10. Lapor Siap.
11. Integration readiness.
12. Module detail pages.
13. Pilot API routes.
14. Peta Unggulan Desa.
15. Data-source readiness checks for national coverage planning.
16. Open-data source catalog.
17. National administrative-code importer.
18. Administrative-area search API.

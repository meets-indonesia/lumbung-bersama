# FEATURE.md - Lumbung Bersama Complete Feature Brief for Stitch

Tanggal: 2026-07-10
Produk: Lumbung Bersama
Tema Hackathon: Optimalisasi Potensi Desa Melalui Koperasi
Target penggunaan: prompt/brief desain dashboard di Stitch

## 1. Product One-Liner

Lumbung Bersama adalah dashboard kerja koperasi desa untuk mengubah data potensi desa menjadi aksi ekonomi yang bisa diverifikasi: peta potensi, rekomendasi komoditas/produk, buyer matching lite, stok/readiness, dan laporan aksi.

## 2. Core Positioning

Jangan desain sebagai marketplace umum, checkout, POS, aplikasi bank, atau sistem pemerintah final.

Desain sebagai:

1. Cooperative operating layer.
2. Trust layer untuk data potensi desa.
3. Command center koperasi desa.
4. Decision-support dashboard dengan human approval.
5. Evidence workspace untuk juri, pengurus, operator, dan pendamping.

MVP flow utama:

`Peta Potensi Desa -> Rekomendasi Komoditas/Produk -> Buyer Matching Lite -> Stok/Readiness -> Laporan Aksi`

## 3. Important Claim Guardrails

Wajib tampilkan atau rasakan dalam desain:

1. Data hackathon adalah sample eksplorasi terbatas, bukan referensi utama/final SIMKOPDES.
2. SIMKOPDES hanya readiness/mapping reference, bukan integrasi produksi.
3. WhatsApp adalah intake/verifikasi/follow-up draft, bukan klaim live delivery kecuali env terbukti.
4. AI adalah explainable assistant, bukan pengambil keputusan otomatis.
5. Financing adalah readiness, bukan credit scoring atau auto approval.
6. Buyer Matching Lite adalah shortlist/archetype + approval, bukan marketplace checkout.
7. Semua rekomendasi harus punya source label, evidence, confidence, risk, next action, dan human approval state.
8. Jangan tampilkan PII: NIK, nomor KTP, file KTP, email pribadi, nomor telepon, alamat detail, nama anggota/pelanggan.
9. Jangan tampilkan secret/env/token/password.
10. Jangan pakai angka fake tanpa source label.

## 4. Judging Criteria Alignment

Desain harus membantu tim menang pada metrik penilaian:

| Kriteria | Bobot | Cara fitur menjawab |
|---|---:|---|
| Relevansi masalah | 25% | Peta potensi desa, gap komoditas-produk-stok-transaksi, koperasi sebagai aggregator |
| Inovasi dan kreativitas | 20% | Trust layer koperasi, explainable opportunity score, buyer matching lite berbasis readiness, source-labeled AI |
| Dampak dan manfaat | 20% | Meningkatkan pemanfaatan potensi desa, akses pasar, nilai tambah, laporan aksi koperasi |
| Kemudahan implementasi | 15% | Mulai dari dashboard, shared DB read-only, official data source registry, WA/operator verification |
| Kualitas teknologi | 15% | Auth, Postgres, read-only aggregate endpoints, data quality checks, env-gated integrations |
| Presentasi dan pitch | 5% | Storyline dashboard jelas dari peta sampai laporan aksi |

## 5. Brand and Visual Direction

Logo:

1. Production/canonical: `https://lumbungbersama.id/icon.svg?v=4`
2. Local dev: `http://localhost:3000/icon.svg?v=4`
3. Source repo: `src/app/icon.svg`

Brand concept:

1. Atap merah: amanah dan perlindungan koperasi.
2. Rangka coklat: fondasi desa dan operasional nyata.
3. Butir padi emas: hasil ekonomi desa.
4. Lengkung hijau: pertumbuhan dan potensi lokal.
5. Garis dasar arang: akuntabilitas data.

Palette:

1. Merah Amanah `#C92A2A` - primary action, urgent decision.
2. Putih Padi `#FFF8EA` - warm background.
3. Hijau Sawah `#2F7D32` - verified, ready, growth.
4. Emas Gabah `#D79A2B` - opportunity, warning ringan.
5. Coklat Tanah `#7A4E2D` - metadata, rural grounding.
6. Arang Tinta `#1F2933` - main text.
7. Abu Berkas `#E7DED1` - borders/dividers.
8. Dark Canvas `#0F1519`
9. Dark Surface `#111A20`
10. Dark Panel `#172027`
11. Light Ink `#F8F4EA`
12. Biru Layanan `#1D5D8F` - integration/info.

Design tone:

1. Serious cooperative command center.
2. Dense but readable.
3. Warm Indonesian rural economy palette.
4. Dashboard dark-first, public/slide assets light-friendly.
5. No purple SaaS gradient, no neon glow, no AI mascot, no shopping cart.

## 6. Information Architecture

Sidebar groups:

### MVP Utama

1. Ringkasan
2. Peta Potensi
3. Rekomendasi

### Data dan Verifikasi

1. Lumbung Data
2. WA Intake
3. Data Quality

### Eksekusi

1. Buyer Matching
2. Stok Readiness
3. Laporan Aksi

### Pendukung

1. Gerai Readiness
2. Financing Readiness
3. Integrasi
4. Source Registry

## 7. Primary Screens To Design

### 7.1 Login

Purpose:

Secure operator access.

Must show:

1. Logo and product name.
2. Email/password form.
3. Short trust copy: `Akses operator koperasi`.
4. No public register.
5. No secret hints.

States:

1. Normal.
2. Invalid login.
3. Rate limited.
4. Redirect note: `Masuk untuk membuka dashboard`.

### 7.2 Ringkasan Operator

Purpose:

First screen for operator/pengurus to understand today's work.

Top content:

1. Koperasi name and location.
2. Source mode: Postgres operational / Shared DB read-only / Demo baseline / Official connector.
3. Four KPI cards:
   - Laporan warga hari ini.
   - Draft perlu dicek.
   - Stok kritis.
   - Paket laporan siap.
4. Work queue table.
5. Opportunity highlight.
6. Shortcut to Peta Potensi, Buyer Matching, Laporan Aksi.

Design:

1. Dense table/list, not oversized marketing cards.
2. Every row has status badge, source label, module tag, action.
3. Urgent rows use left border Merah Amanah.
4. No fake metrics without label.

### 7.3 Hackathon Evidence Panel

Purpose:

Show that the app is backed by real aggregate evidence and safe data rules.

Must show:

1. Shared DB status: configured / missing / SSL required / error.
2. Team prefix: `anak_sarengklek_`.
3. Aggregate table counts from shared DB:
   - `referensi_wilayah`
   - `referensi_komoditas_desa`
   - `profil_koperasi`
   - `produk_koperasi`
   - `inventaris_produk`
   - `transaksi_penjualan`
   - `pengajuan_kemitraan`
4. Data-quality warning summary.
5. Opportunity score summary.
6. Buyer matching lite summary.
7. Caveat: `Sample eksplorasi terbatas, bukan referensi final SIMKOPDES`.

API surfaces:

1. `/api/hackathon/mvp-summary`
2. `/api/hackathon/data-quality`
3. `/api/hackathon/opportunity-scores`
4. `/api/hackathon/buyer-matching`

### 7.4 Peta Potensi Desa

Purpose:

Main spatial workspace for identifying potential.

Must show:

1. Full map workspace, not mini map.
2. Search wilayah/desa.
3. Breadcrumb drilldown: Provinsi -> Kabupaten/Kota -> Kecamatan -> Desa.
4. Layer toggles:
   - Batas wilayah.
   - Komoditas.
   - Koperasi.
   - Gerai/gudang.
   - UMKM/aset.
   - External data.
5. Right inspector panel:
   - Desa/wilayah selected.
   - Commodity potential.
   - Cooperative links.
   - Readiness status.
   - Source label.
   - Risk and next action.
6. Legend with source colors.

External sources to show as registry/labels:

1. BIG Batas Desa/Kelurahan.
2. Kemendesa IDM.
3. Kemendesa SDGs Desa.
4. BPS Master File Desa.
5. BPS WebAPI.
6. Regional CKAN/open data.

### 7.5 Opportunity Score

Purpose:

Explain why a village/cooperative/commodity should be prioritized.

Formula:

`30% Potensi Komoditas + 20% Kesiapan Koperasi + 20% Produk/Stok + 15% Sinyal Pasar + 10% Kemitraan + 5% Kelengkapan Data`

Must show:

1. Score 0-100.
2. Component breakdown.
3. Raw signal/evidence summary.
4. Data completeness warning.
5. Source labels.
6. Recommended status:
   - `Rekomendasi awal`
   - `Perlu verifikasi`
   - `Siap tindak lanjut`
   - `Jangan diprioritaskan dulu`
7. Human review action.

Do not:

1. Present score as final truth.
2. Hide missing data.
3. Show personal records.

### 7.6 Rekomendasi Komoditas/Produk

Purpose:

Turn potential into product/value-add action.

Card fields:

1. Komoditas/produk.
2. Desa/wilayah.
3. Opportunity reason.
4. Why now.
5. Evidence/source.
6. Risk.
7. Suggested value-add:
   - grading;
   - packaging;
   - processing;
   - storage;
   - gerai/channel use;
   - financing readiness.
8. First operator action.
9. WA verification script draft.
10. Human approval status.

Agent:

`Agen Unggulan Desa`

### 7.7 Buyer Matching Lite

Purpose:

Match cooperative readiness to market/offtaker opportunity without fake buyer names.

Must show:

1. Pipeline:
   - Kandidat.
   - Cocok sebagian.
   - Perlu cek kualitas.
   - Approved outreach.
   - Follow-up.
2. Generic buyer archetypes:
   - Retail packaged goods.
   - Bulk offtaker.
   - HORECA local.
   - Institutional procurement.
3. Match score 0-100.
4. Component breakdown:
   - Product fit 25%.
   - Stock readiness 20%.
   - Supply consistency 15%.
   - Location/logistics 15%.
   - Quality/readiness proxy 10%.
   - Transaction/partnership signal 10%.
   - Governance approval readiness 5%.
5. Product snapshot.
6. Stock snapshot.
7. Matched keywords or evidence.
8. Next action:
   - `Ajukan ke pengurus`
   - `Setujui outreach`
   - `Download script`
   - `Catat hasil`

Important:

Use buyer archetype until verified buyer/offtaker data exists. Do not show fake company names.

### 7.8 Stok and Readiness

Purpose:

Show whether opportunity can actually be fulfilled.

Must show:

1. Stock table by product.
2. Status:
   - Stok Aman.
   - Terbatas.
   - Perlu Restok.
   - Menunggu Grade.
   - Jadwal Pickup.
3. Stock source:
   - Operational DB.
   - Shared DB exploration.
   - WA/operator verified.
   - Demo baseline.
4. Restock request.
5. Aging risk.
6. Pickup/manifest draft.
7. Export supplier/manifest button.

Future feature:

Stock ledger with stock-in, stock-out, physical count, adjustment.

### 7.9 WA Intake

Purpose:

Capture field updates and verification requests.

Must show:

1. Inbox operational view.
2. Message source.
3. Intent classification.
4. Module target.
5. Bot reply draft.
6. Queue ID.
7. Follow-up draft.
8. Env status:
   - local draft;
   - Graph API configured;
   - webhook verified;
   - delivery not configured.

Copy guardrail:

Use `Draft follow-up tersimpan`, not `WhatsApp terkirim`, unless live delivery is proven.

### 7.10 Agent Center

Purpose:

Show agent runs as auditable decision support.

Agents:

1. Agen Unggulan Desa.
2. Agen Pasar dan Mitra.
3. Agen Laporan.

Each run must show:

1. Input record ID.
2. Agent name.
3. Mode: `rules + Postgres` or `provider configured`.
4. Checks.
5. Output.
6. Explanation.
7. Source fields.
8. Confidence.
9. Next action.
10. Human approval state.
11. Created at.

Do not design as empty chatbot or AI mascot.

### 7.11 Financing Readiness

Purpose:

Show financing preparation without credit approval.

Must show:

1. Financing request list.
2. Required documents.
3. Working capital/asset financing category.
4. Committee meeting readiness.
5. Status:
   - Draft.
   - Perlu dokumen.
   - Siap rapat komite.
   - Diputuskan pengurus.
6. Copy: `Keputusan tetap di komite koperasi`.

Do not:

1. Show credit score.
2. Show auto approve.
3. Show bank integration as live.

### 7.12 Laporan Aksi

Purpose:

Final output for cooperative meeting, pitch demo, and monitoring.

Report sections:

1. Executive summary.
2. Top opportunities.
3. Evidence/source.
4. Pending verification.
5. Buyer action plan.
6. Stock/readiness gap.
7. Data-quality flags.
8. External data notes.
9. Human decision status.
10. Risk and next 7 days.

Actions:

1. Lock period.
2. Unlock period.
3. Export CSV/PDF-ready content.
4. Copy pitch summary.
5. Assign follow-up.

Design:

Looks like a board/meeting packet, not a blog post.

### 7.13 Integrasi and Health

Purpose:

Show implementation readiness and cost discipline.

Must show:

1. App mode: local / staging / production.
2. Database configured.
3. Shared DB configured.
4. Shared DB SSL required.
5. Auth configured.
6. WhatsApp configured.
7. AI provider configured.
8. BPS/API/source connector readiness.
9. SIMKOPDES readiness only.
10. Last health check.
11. Cost discipline:
    - Cloud Run scale-to-zero.
    - Secret Manager.
    - Cloud Logging.
    - Cloud Scheduler/Jobs.
    - Budget alert.
    - no always-on GPU.

Never show credential values.

### 7.14 Source Registry

Purpose:

Show official external datasets that strengthen the MVP beyond the limited hackathon DB.

Source groups:

1. Spatial and village:
   - BIG Batas Desa/Kelurahan.
   - Kemendesa IDM.
   - Kemendesa SDGs Desa.
   - BPS Master File Desa.
   - BPS WebAPI.
   - OpenData Aceh/CKAN.
2. Market and commodity:
   - Bapanas Panel Harga.
   - Open Data Bapanas.
   - PIHPS BI.
   - Satu Data Kemendag.
   - SISP Kemendag.
   - BPS production/trade.
3. Cooperative governance:
   - UU 25/1992.
   - PP 7/2021.
   - Permenkop relevant regulations.
   - SIMKOPDES portal.
   - IDXCOOP.
   - Kemenkop Corporate University.
   - BPS active cooperatives.

Each source card:

1. Owner.
2. URL.
3. Data type.
4. Access method.
5. MVP usage.
6. Caveat.
7. Source label.
8. Integration status: `candidate`, `manual reference`, `download-ready`, `API-ready`, `implemented`.

## 8. Data Sources and Endpoints

### Existing App/Operational Data

1. `operator_queue`
2. `wa_messages`
3. `stock_items`
4. `buyer_matches`
5. `finance_requests`
6. `report_sections`
7. `report_periods`
8. `agent_runs`
9. `villages`
10. `village_commodities`
11. `village_assets`
12. `open_data_sources`
13. `administrative_areas`
14. `regional_commodity_profiles`
15. `regional_commodity_signals`
16. `admin_boundary_cache`

### Shared Hackathon DB Exploration Tables

1. `referensi_wilayah`
2. `referensi_profil_desa`
3. `referensi_komoditas_desa`
4. `referensi_koperasi_wilayah`
5. `profil_koperasi`
6. `anggota_koperasi`
7. `pengurus_koperasi`
8. `karyawan_koperasi`
9. `aset_koperasi`
10. `gerai_koperasi`
11. `rat_koperasi`
12. `produk_koperasi`
13. `inventaris_produk`
14. `barang_masuk_produk`
15. `barang_keluar_produk`
16. `transaksi_penjualan`
17. `pengajuan_kemitraan`
18. `pengajuan_pembiayaan`
19. `modal_koperasi`
20. `akun_bank_koperasi`
21. `simpanan_anggota`

### Read-Only Hackathon API Endpoints

1. `/api/hackathon/mvp-summary`
   - Aggregate MVP evidence.
   - Table counts, coverage, province opportunities, cooperative candidates.

2. `/api/hackathon/data-quality`
   - Aggregate data-quality checks.
   - Missing refs, missing names, numeric text risk, stock risk, kemitraan completeness.

3. `/api/hackathon/opportunity-scores`
   - Explainable area opportunity scoring.
   - Top areas, component score breakdown, recommendations.

4. `/api/hackathon/buyer-matching`
   - Buyer matching lite.
   - Generic buyer archetypes, match weights, matches, next actions.

## 9. Feature Priority

### P0 - Presentation Critical

1. Ringkasan Operator.
2. Peta Potensi Desa.
3. Opportunity Score.
4. Rekomendasi Komoditas/Produk.
5. Buyer Matching Lite.
6. Stok and Readiness.
7. Laporan Aksi.
8. Hackathon Evidence Panel.
9. Data Quality Summary.
10. Auth/Login.
11. Integrasi and Health.

### P1 - Strong Differentiator

1. Source Registry.
2. External data layer cards.
3. WA Intake with queue bridge.
4. Agent Center audit runs.
5. Financing Readiness.
6. Data coverage panel.
7. Demo route checklist.

### P2 - Pilot Hardening

1. Buyer/offtaker directory.
2. Buyer requirements.
3. Buyer outreach events.
4. Stock ledger.
5. Media evidence pipeline.
6. Record lifecycle/audit events.
7. Role matrix per cooperative.
8. DB-backed authenticated QA.
9. SIMKOPDES mapping after official access/standard.

## 10. Suggested Dashboard Layout

### Desktop

Use a fixed/collapsible sidebar and dense content.

Layout:

1. Top app bar:
   - logo;
   - koperasi name;
   - current area;
   - source mode;
   - notifications;
   - profile/logout.
2. Main grid:
   - left 65%: work queue, map, recommendations.
   - right 35%: evidence panel, data quality, next actions.
3. Lower section:
   - buyer matching pipeline.
   - stock readiness.
   - report preview.

### Mobile

1. Collapse sidebar to bottom/tab nav.
2. One-column cards.
3. Keep map searchable.
4. No horizontal scroll.
5. Long tables become list rows.

## 11. Screen Copy Library

Use these phrases:

1. `Source: Shared DB exploration`
2. `Source: WA/operator verified`
3. `Source: Official connector`
4. `Baseline, belum verified`
5. `Perlu dicek`
6. `Menunggu verifikasi`
7. `Siap rapat pengurus`
8. `Draft follow-up`
9. `Keputusan tetap oleh pengurus`
10. `Skema sample, bukan referensi final SIMKOPDES`
11. `Buyer archetype, bukan buyer commitment`
12. `AI assistant, human-approved`

Avoid these phrases:

1. `AI otomatis memutuskan`
2. `Terintegrasi resmi SIMKOPDES`
3. `WhatsApp sudah terkirim`
4. `Marketplace end-to-end`
5. `Kredit otomatis disetujui`
6. `Data nasional lengkap dan verified`
7. `Buyer pasti membeli`

## 12. Required Components

1. Source badge.
2. Confidence badge.
3. Human approval badge.
4. Score breakdown meter.
5. Data-quality flag.
6. Evidence row.
7. Work queue row.
8. Buyer pipeline stage.
9. Stock status badge.
10. Integration status tile.
11. External source card.
12. Report section card.
13. Map legend.
14. Empty/config-required state.
15. Error state with safe explanation.

## 13. Empty and Error States

Design graceful states:

1. Shared DB missing:
   - `Shared DB belum dikonfigurasi`
   - show prefix `anak_sarengklek_`
   - no password field shown.
2. Auth required:
   - redirect/login prompt.
3. Official connector not configured:
   - show source candidate and setup requirement.
4. No data:
   - explain what operator should verify.
5. Partial data:
   - show confidence lower and data-quality flags.
6. External source candidate:
   - show `Belum otomatis, siap diintegrasikan`.

## 14. Stitch Prompt

```text
Design a high-fidelity dashboard app for Lumbung Bersama, a cooperative operating layer for Tema 2: Optimalisasi Potensi Desa Melalui Koperasi.

The product is not a marketplace, checkout, POS, bank app, or final government system. It is a serious cooperative command center that turns village potential data into verified economic action.

Main MVP flow:
Peta Potensi Desa -> Rekomendasi Komoditas/Produk -> Buyer Matching Lite -> Stok/Readiness -> Laporan Aksi.

Brand:
- Logo: https://lumbungbersama.id/icon.svg?v=4
- Merah Amanah #C92A2A
- Putih Padi #FFF8EA
- Hijau Sawah #2F7D32
- Emas Gabah #D79A2B
- Coklat Tanah #7A4E2D
- Arang Tinta #1F2933
- Abu Berkas #E7DED1
- Dark Canvas #0F1519
- Dark Surface #111A20
- Dark Panel #172027
- Biru Layanan #1D5D8F

Create these screens:
1. Login.
2. Ringkasan Operator.
3. Hackathon Evidence Panel.
4. Peta Potensi Desa full-map workspace.
5. Opportunity Score.
6. Rekomendasi Komoditas/Produk.
7. Buyer Matching Lite.
8. Stok and Readiness.
9. WA Intake.
10. Agent Center.
11. Financing Readiness.
12. Laporan Aksi.
13. Integrasi and Health.
14. Source Registry.

Every metric and recommendation must show a source label. Use labels like Shared DB exploration, Official connector, WA/operator verified, Postgres operational, Demo baseline.

Every recommendation must show evidence, confidence, risk, next action, and human approval state.

Important guardrails:
- The hackathon DB is limited exploration material, not final SIMKOPDES reference.
- Do not claim production SIMKOPDES integration.
- Do not show PII.
- Do not show secrets.
- Do not show fake buyer names.
- Buyer Matching Lite uses buyer archetypes until verified buyer data exists.
- Financing is readiness only, not automatic approval.
- WhatsApp is intake/follow-up draft unless live delivery is verified.
- AI is explainable assistant, not autonomous decision-maker.

Design tone:
Serious, warm, data-rich, operational, Indonesian rural economy, dense but readable, dark dashboard first.
No neon purple/blue SaaS gradient, no AI mascot, no shopping cart, no oversized marketing hero inside dashboard.
```

## 15. Final Checklist For Stitch Output

1. Logo visible.
2. MVP flow visible.
3. Source labels visible.
4. Hackathon DB caveat visible.
5. Opportunity score has component breakdown.
6. Buyer matching has archetypes and pipeline.
7. Stock/readiness status visible.
8. Laporan Aksi appears as final output.
9. External source registry exists.
10. Integration health panel hides secrets.
11. Human approval state visible.
12. No PII.
13. No fake marketplace checkout.
14. No autonomous AI wording.
15. No SIMKOPDES production claim.


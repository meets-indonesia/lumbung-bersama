# Lumbung Bersama Slide Presentation Guide

Date: 2026-07-10
Theme: Tema 2 - Optimalisasi Potensi Desa Melalui Koperasi
Audience: hackathon jury, cooperative stakeholders, design team, demo team

## 1. Presentation Objective

The deck must make one argument:

> Koperasi desa tidak kekurangan potensi, tetapi kekurangan operating layer untuk mengubah potensi menjadi keputusan usaha yang terverifikasi.

The product answer:

> Lumbung Bersama maps village potential, recommends commodity/product priorities, matches cooperative readiness to buyer opportunities, monitors stock/readiness, and produces action reports for cooperative governance.

Hackathon database caveat:

The provided database schema and sample data are a limited representation of SIMKOPDES and are not the primary reference. Use them as exploration material to understand data patterns, identify problems, and generate innovation ideas. Do not present them as the final SIMKOPDES production schema.

Do not make the deck look like a marketplace pitch. Make it feel like a serious cooperative command center.

## 2. Visual Direction For Slides

Use the same brand direction as `DESIGN.md`.

Logo:

1. Production/canonical when available: `https://lumbungbersama.id/icon.svg?v=4`.
2. Local fallback: `http://localhost:3000/icon.svg?v=4`.
3. Source file: `src/app/icon.svg`.

Colors:

1. Merah Amanah `#C92A2A` for decisive action and primary emphasis.
2. Putih Padi `#FFF8EA` for warm light backgrounds.
3. Hijau Sawah `#2F7D32` for verified/readiness/growth.
4. Emas Gabah `#D79A2B` for opportunity/warning.
5. Coklat Tanah `#7A4E2D` for rural grounding and metadata.
6. Arang Tinta `#1F2933` for text.
7. Abu Berkas `#E7DED1` for dividers.
8. Dashboard dark canvas `#0F1519`, dark surface `#111A20`, dark panel `#172027`.

Typography:

1. Use a clean sans-serif such as Geist, Satoshi, or Outfit.
2. Use mono only for IDs, score formulas, and table prefix.
3. Avoid tiny tables. Use diagram + few rows.

Slide style:

1. Dense but readable.
2. Use source labels on screenshots.
3. Avoid decorative gradients.
4. Avoid marketplace shopping-cart imagery.
5. Avoid fake photos or fake buyer logos.
6. Use product screenshots/wireframes and schema diagrams.

## 3. Recommended 14-Slide Deck

### Slide 1 - Title

Title:

`Lumbung Bersama`

Subtitle:

`Operating layer koperasi untuk mengubah potensi desa menjadi aksi ekonomi yang terverifikasi`

Visual:

1. Logo large.
2. Small MVP flow ribbon: `Peta -> Rekomendasi -> Buyer Matching -> Stok -> Laporan`.

Speaker notes:

> Kami mengambil Tema 2: optimalisasi potensi desa melalui koperasi. Fokus kami bukan membuat marketplace umum, tetapi membangun lapisan kerja koperasi agar potensi desa dapat dipetakan, diprioritaskan, dan ditindaklanjuti.

Key message:

> From potential to cooperative action.

### Slide 2 - Problem

Title:

`Potensi Ada, Jalur Eksekusinya Terputus`

Content:

1. Data potensi desa tersebar.
2. Koperasi belum selalu terhubung dengan komoditas unggulan wilayah.
3. Produk, stok, dan transaksi belum menjadi sinyal readiness.
4. Buyer/offtaker sulit dipilih tanpa bukti kesiapan.
5. Laporan untuk rapat pengurus sering manual.

Visual:

Fragmented data diagram:

`Desa -> Komoditas -> Koperasi -> Produk/Stok -> Buyer -> Laporan`

Speaker notes:

> Masalahnya bukan hanya tidak ada data. Sering data ada, tetapi tidak tersambung menjadi keputusan. Pengurus perlu tahu potensi mana yang layak diprioritaskan dan apa langkah berikutnya.

### Slide 3 - Why Koperasi Is The Right Lever

Title:

`Koperasi Sebagai Aggregator Ekonomi Desa`

Content:

1. Koperasi punya posisi sosial dan kelembagaan.
2. Koperasi dapat mengumpulkan produk, stok, dan kebutuhan pembiayaan.
3. Koperasi dapat bernegosiasi dengan buyer lebih baik daripada individu.
4. Keputusan tetap melalui pengurus, RAT, and governance process.

Visual:

Koperasi in center, connected to farmers/UMKM, stock/gerai, buyer, pendamping.

Speaker notes:

> Kami memilih koperasi sebagai pusat karena koperasi bukan hanya seller. Ia adalah aggregator dan governance layer. Teknologi harus memperkuat peran itu, bukan mengambil alih.

### Slide 4 - Solution Overview

Title:

`Lumbung Bersama: Trust Layer Untuk Koperasi Desa`

Content:

MVP flow:

1. Peta Potensi Desa.
2. Rekomendasi Komoditas/Produk.
3. Buyer Matching Lite.
4. Stok/Readiness.
5. Laporan Aksi.

Visual:

Five-step pipeline with each step showing source label and human approval badge.

Speaker notes:

> Flow ini sengaja dibuat satu garis. Peta bukan akhir. Rekomendasi bukan akhir. Yang kami kejar adalah laporan aksi yang bisa dipakai koperasi untuk memutuskan tindakan.

### Slide 5 - Database Foundation

Title:

`Sample Data Membuka Pola Desa dan Koperasi`

Content:

Use this grouping:

1. Wilayah/potensi: `referensi_wilayah`, `referensi_profil_desa`, `referensi_komoditas_desa`.
2. Koperasi: `profil_koperasi`, `referensi_koperasi_wilayah`, `gerai_koperasi`, `aset_koperasi`.
3. Produk/stok/transaksi: `produk_koperasi`, `inventaris_produk`, `barang_masuk_produk`, `barang_keluar_produk`, `transaksi_penjualan`.
4. Market/enablement: `pengajuan_kemitraan`, `pengajuan_pembiayaan`, `modal_koperasi`, `akun_bank_koperasi`.

Visual:

Schema spine:

`referensi_wilayah -> referensi_koperasi_wilayah -> profil_koperasi -> produk/stok/transaksi/kemitraan`

Speaker notes:

> Ini penting untuk juri: ide kami tidak berdiri di udara, tetapi kami juga tidak mengklaim ini skema final SIMKOPDES. Database hackathon adalah representasi terbatas untuk eksplorasi. Dari sample ini terlihat pola data yang perlu dihubungkan: wilayah, komoditas, koperasi, produk, stok, transaksi, dan kemitraan.

### Slide 6 - Peta Potensi Desa

Title:

`Identifikasi Potensi Yang Belum Dimanfaatkan`

Content:

1. Map/search wilayah.
2. Commodity and cooperative coverage.
3. Source label: shared DB, official connector, operator verified, demo/baseline.
4. Gap detection: potential exists, product/stock/sales not yet strong.

Visual:

Screenshot/wireframe of `/peta-unggulan`.

Speaker notes:

> Dari peta, operator bisa melihat potensi komoditas dan keterhubungannya dengan koperasi. Yang kami cari adalah gap: komoditas potensial tetapi belum menjadi produk/stok/transaksi yang kuat.

### Slide 7 - Opportunity Score

Title:

`Rekomendasi Yang Bisa Dijelaskan`

Content:

Formula:

`30% Potensi Komoditas + 20% Kesiapan Koperasi + 20% Produk/Stok + 15% Sinyal Pasar + 10% Kemitraan + 5% Kelengkapan Data`

Show:

1. Score 0-100.
2. Component breakdown.
3. Evidence rows.
4. Risk and next action.

Speaker notes:

> Skor bukan keputusan final. Skor adalah cara untuk membantu pengurus menentukan prioritas awal secara transparan.

### Slide 8 - Buyer Matching Lite

Title:

`Mencocokkan Kesiapan Koperasi Dengan Kebutuhan Pasar`

Content:

Match components:

1. Product fit.
2. Stock readiness.
3. Supply consistency.
4. Location/logistics.
5. Quality/readiness proxy.
6. Transaction/partnership signal.
7. Governance readiness.

Visual:

Pipeline:

`Kandidat -> Cocok sebagian -> Perlu cek kualitas -> Approved outreach -> Follow-up`

Speaker notes:

> Kami tidak mengklaim marketplace. Buyer matching lite membantu koperasi melihat buyer archetype atau buyer requirement yang cocok, lalu outreach tetap melalui approval manusia.

### Slide 9 - Stok and Readiness

Title:

`Dari Potensi Ke Produk Siap Jual`

Content:

1. Inventory signal.
2. Barang masuk/keluar.
3. Transaction signal.
4. Stock risk.
5. Readiness status.

Visual:

Readiness matrix:

`Aman`, `Terbatas`, `Perlu Restok`, `Menunggu Grade`, `Pickup Draft`.

Speaker notes:

> Buyer matching tidak berguna kalau stok tidak siap. Karena itu stok/readiness menjadi gate sebelum outreach.

### Slide 10 - WA/Operator Verification

Title:

`Data Lapangan Tetap Perlu Verifikasi`

Content:

1. WA as intake and follow-up draft.
2. Operator queue.
3. Human review.
4. Source-labeled updates.
5. No live delivery claim unless configured.

Visual:

Inbox/queue with status badges.

Speaker notes:

> Lapangan dinamis. WA membantu intake dan follow-up, tetapi kami menjaga klaim: live delivery hanya disebut jika token/env sudah terbukti.

### Slide 11 - Laporan Aksi

Title:

`Output Akhir: Paket Keputusan Koperasi`

Content:

Report sections:

1. Executive summary.
2. Top opportunities.
3. Evidence.
4. Pending verification.
5. Buyer action plan.
6. Stock risks.
7. Governance decision status.

Speaker notes:

> Dashboard yang baik tidak berhenti di grafik. Kami menutup flow dengan laporan aksi yang bisa dibawa ke rapat pengurus dan pendamping.

### Slide 12 - Architecture and Security

Title:

`Cloud-Ready, Hemat, and Governable`

Content:

1. Next.js app/API.
2. PostgreSQL operational DB.
3. Shared hackathon DB read-only evidence layer.
4. Cloud Run scale-to-zero.
5. Secret Manager for credentials.
6. Cloud Logging for audit.
7. Scheduler/Jobs for data refresh.
8. Budget alert.

Security:

1. HttpOnly session.
2. PBKDF2 password hash.
3. CSRF same-origin gate.
4. Role checks.
5. No PII in demo endpoints.

Speaker notes:

> Karena ada Google Cloud credit, kami desain yang realistis: tidak perlu GPU always-on dan tidak menyimpan secret di code. Budget alert perlu dibuat karena alert tidak otomatis menghentikan biaya. Shared DB hackathon dipakai sebagai exploration evidence layer, bukan production source of truth SIMKOPDES.

### Slide 13 - Impact and Business Model

Title:

`Dampak: Potensi Desa Menjadi Pipeline Ekonomi`

Content:

Impact metrics:

1. Verified opportunities.
2. Recommendations approved.
3. Buyer outreach count.
4. Stock readiness improvements.
5. Data quality flags reduced.
6. Reports used by cooperative meetings.

Business model:

1. SaaS/managed platform for koperasi/federasi/program.
2. Implementation support.
3. Buyer/offtaker workflow.
4. Data-readiness and reporting service.

Speaker notes:

> Monetisasi mengikuti value. Tahap awal bukan transaksi checkout, tetapi workflow yang membuat koperasi lebih siap masuk pasar.

### Slide 14 - Ask and Next 30 Days

Title:

`Pilot Plan`

Content:

Week 1:

1. Finalize MVP endpoints.
2. Clean demo dashboard.
3. Run DB-backed QA.

Week 2:

1. Pilot one cooperative or sample area.
2. Validate opportunity score with human reviewers.
3. Load buyer requirements or archetypes.

Week 3:

1. Track outreach outcomes.
2. Improve data quality flags.
3. Generate action reports.

Week 4:

1. Prepare integration mapping.
2. Document policy/governance requirements.
3. Publish pilot metrics.

Speaker notes:

> Next step kami konkret: bukan menambah fitur sebanyak mungkin, tetapi membuktikan satu flow sampai menghasilkan keputusan dan tindakan.

## 4. Optional Backup Slides

### Backup A - Full Data Table Mapping

Use when asked by technical judges:

| Group | Tables | Usage |
|---|---|---|
| Wilayah | `referensi_wilayah`, `referensi_profil_desa` | Peta, filtering, area coverage |
| Komoditas | `referensi_komoditas_desa` | Potential, volume/value/SDM signals |
| Koperasi | `profil_koperasi`, `referensi_koperasi_wilayah` | Cooperative linkage and readiness |
| Produk | `produk_koperasi` | Product availability |
| Stok | `inventaris_produk`, `barang_masuk_produk`, `barang_keluar_produk` | Inventory and supply flow |
| Market | `transaksi_penjualan`, `pengajuan_kemitraan` | Demand/partnership signals |
| Governance | `dokumen_koperasi`, `rat_koperasi`, `pengurus_koperasi` | Readiness and approval context |
| Financing | `pengajuan_pembiayaan`, `modal_koperasi`, `simpanan_anggota` | Financing readiness, not auto loan |

### Backup A2 - External Data Layer

Use when judges ask what data beyond the hackathon sample can strengthen the MVP:

1. BIG for village boundaries.
2. Kemendesa IDM/SDGs Desa for village readiness.
3. BPS WebAPI and Master File Desa for official statistics and code reconciliation.
4. Bapanas and BI/PIHPS for food price signals.
5. Kemendag/SISP for trade and market access signals.
6. BPK/JDIH/Kemenkop sources for cooperative governance.

Speaker note:

> Sample database membantu kami memahami pola. External data layer membuat rekomendasi lebih defensible, source-labeled, dan siap divalidasi saat pilot.

### Backup B - Red-Line Claims

Show only if asked about risk:

1. No live WhatsApp delivery claim unless verified.
2. No production SIMKOPDES integration claim.
3. No claim that the hackathon schema is the final or primary SIMKOPDES reference.
4. No national verified direct-desa coverage claim.
5. No autonomous AI decisions.
6. No automatic loan approval.
7. No PII in demo endpoint.
8. No shared DB mutation without explicit privilege and table prefix.

### Backup C - Google Cloud Cost Discipline

Recommended low-cost architecture:

1. Cloud Run min instances 0.
2. Small Cloud SQL or managed Postgres only when needed.
3. Secret Manager, not `.env` in repo.
4. Cloud Scheduler for short jobs, not always-on workers.
5. Cloud Storage lifecycle rules for evidence files.
6. Budget alerts.
7. Bounded AI calls and cached source checks.

### Backup D - Evaluation Plan

Measure:

1. Precision of recommendation after human review.
2. Reduction in data quality gaps.
3. Number of approved buyer outreach events.
4. Stock readiness before/after recommendation.
5. Report adoption by cooperative meetings.
6. Time saved for operator/pendamping.

## 5. What Each Team Member Should Explain

### Product Lead

Explain:

1. Problem.
2. MVP flow.
3. Why not marketplace first.
4. Business model.
5. Impact.

Avoid:

1. Overclaiming every module as production-ready.
2. Making it sound like a generic SaaS dashboard.

### Technical Lead

Explain:

1. Next.js/Postgres architecture.
2. Shared DB read-only evidence layer.
3. Auth/session/security basics.
4. Cloud Run/Secret Manager plan.
5. Endpoint guardrails: aggregate-only, no PII.

Avoid:

1. Displaying credentials.
2. Claiming live integrations without smoke evidence.

### Data/AI Lead

Explain:

1. Metadata-backed table mapping.
2. Opportunity score formula.
3. Buyer match formula.
4. Explainability and human approval.
5. Data quality flags.

Avoid:

1. Saying AI decides autonomously.
2. Saying incomplete data is verified.

### Demo Driver

Explain:

1. Navigate in the MVP order.
2. Highlight source labels.
3. Show approval states.
4. End in Laporan Aksi.

Avoid:

1. Jumping randomly across modules.
2. Spending too much time on homepage.

## 6. Slide Design Checklist

1. Logo visible on slide 1 and small mark in footer after that.
2. Flow appears at least 3 times: intro, solution, demo recap.
3. Every data screenshot has source label.
4. No fake secret values.
5. No PII screenshots.
6. No marketplace/cart visual.
7. No "AI otomatis memutuskan" wording.
8. No "SIMKOPDES live" wording.
9. No "WhatsApp terkirim" wording unless live delivery is verified.
10. Closing slide has concrete next 30-day pilot plan.

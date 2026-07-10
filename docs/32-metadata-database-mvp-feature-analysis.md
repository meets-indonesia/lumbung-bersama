# Metadata Database MVP Feature Analysis

Date: 2026-07-10
Project: Lumbung Bersama
Related Codex thread: `019f4a4b-4e36-7423-a631-e608dea29546` (`Agent Eksplorasi`)
Source workbook: `C:\Users\Lenovo LOQ\Downloads\metadata_database_hackathon_final.xlsx`
Status: synced from Agent Eksplorasi metadata-analysis loop

## Purpose

This checkpoint converts the hackathon database metadata workbook into a practical feature roadmap for Tema 2: optimalisasi potensi desa melalui koperasi.

The important shift is:

1. Do not pitch a generic marketplace first.
2. Use the metadata-backed graph of village, cooperative, commodity, product, stock, transaction, asset, and partnership data.
3. Present a realistic MVP that answers the challenge questions with fields already represented in the workbook.

## Workbook Facts

The workbook has two sheets:

1. `Metadata`
2. `Relasi`

Observed structure:

1. `27` tables.
2. `288` metadata fields.
3. `59` key or relationship rows.
4. `27` primary keys.
5. `32` foreign keys.

The core relationship spine is:

`referensi_wilayah -> referensi_koperasi_wilayah -> profil_koperasi -> produk/stok/transaksi/kemitraan/pembiayaan`

Village potential data is represented through:

1. `referensi_wilayah`
2. `referensi_profil_desa`
3. `referensi_komoditas_desa`
4. `referensi_koperasi_wilayah`

Cooperative operation data is represented through:

1. `profil_koperasi`
2. `anggota_koperasi`
3. `pengurus_koperasi`
4. `karyawan_koperasi`
5. `gerai_koperasi`
6. `aset_koperasi`
7. `dokumen_koperasi`
8. `modal_koperasi`
9. `rat_koperasi`

Product and supply-chain data is represented through:

1. `produk_koperasi`
2. `inventaris_produk`
3. `barang_masuk_produk`
4. `barang_keluar_produk`
5. `transaksi_penjualan`

Market and enablement data is represented through:

1. `pengajuan_kemitraan`
2. `pengajuan_pembiayaan`
3. `pengajuan_rekening_bank`
4. `akun_bank_koperasi`
5. `simpanan_anggota`

## Strong MVP Direction

The most defensible MVP for the hackathon presentation is:

`Village Potential Mapping + AI Commodity Recommendation + Buyer Matching Lite`

Why this is stronger than starting with a full marketplace:

1. It directly answers what potential is underused.
2. It can explain why a village or cooperative should prioritize a commodity.
3. It can connect production potential to product, stock, and transaction readiness.
4. It can show an offtaker/buyer match without building checkout, payment, or logistics settlement first.
5. It matches the existing app strengths around `/peta-unggulan`, source-labeled data, WA-first intake, and agent-assisted decisions.

## Challenge Mapping

### Potensi ekonomi apa yang belum dimanfaatkan optimal?

Use:

1. `referensi_komoditas_desa.nama_komoditas`
2. `referensi_komoditas_desa.luas_area`
3. `referensi_komoditas_desa.volume`
4. `referensi_komoditas_desa.jumlah_sdm_terlibat`
5. `referensi_komoditas_desa.nilai_potensi_desa`
6. `produk_koperasi`
7. `inventaris_produk`
8. `transaksi_penjualan`

Demo claim:

The system finds villages with high commodity potential but weak product, inventory, or sales conversion.

### Bagaimana mencocokkan potensi desa dengan kebutuhan pasar?

Use:

1. `produk_koperasi`
2. `inventaris_produk`
3. `barang_masuk_produk`
4. `barang_keluar_produk`
5. `transaksi_penjualan`
6. new `buyer_requirements`

Demo claim:

The system matches commodity and stock readiness against buyer requirements by commodity, location, unit, volume, and supply consistency.

### Bagaimana mempertemukan koperasi dengan buyer atau offtaker?

Use:

1. `pengajuan_kemitraan`
2. `profil_koperasi`
3. `produk_koperasi`
4. `inventaris_produk`
5. new `buyer_offtakers`
6. new `buyer_match_scores`

Demo claim:

The system generates buyer recommendations and keeps the human approval path visible.

### Bagaimana meningkatkan nilai tambah produk desa?

Use:

1. `referensi_komoditas_desa`
2. `aset_koperasi`
3. `gerai_koperasi`
4. `pengajuan_pembiayaan`
5. `modal_koperasi`
6. `transaksi_penjualan`

Demo claim:

The system recommends product upgrading, asset use, financing, and gerai/channel actions based on readiness gaps.

## Feature Backlog Added From Metadata

### P0 - Metadata Ingestion and Mapping

Build a safe importer path from the workbook-derived schema into the current app model.

Recommended tables:

1. `koperasi_reference_imports`
2. `village_potential_imports`
3. `cooperative_product_imports`
4. `metadata_import_runs`

Acceptance gate:

An uploaded or scripted metadata sample can map village, cooperative, commodity, product, and inventory fields into source-labeled staging tables without overwriting existing operational records.

### P0 - Opportunity Score

Add a scoring model that turns the metadata into a judge-visible insight.

Recommended table:

`village_opportunity_scores`

Suggested scoring inputs:

1. `nilai_potensi_desa`
2. `volume`
3. `luas_area`
4. `jumlah_sdm_terlibat`
5. cooperative readiness from `profil_koperasi`, `gerai_koperasi`, and `aset_koperasi`
6. product readiness from `produk_koperasi` and `inventaris_produk`
7. sales conversion from `transaksi_penjualan`

Acceptance gate:

For one village or cooperative, the UI can show an explainable score with evidence rows and a plain-language reason.

### P0 - Recommendation Cards

Add agent-assisted cards for:

1. commodity priority;
2. product derivative suggestion;
3. buyer match suggestion;
4. financing need;
5. asset or gerai utilization;
6. next operator action.

Recommended table:

`commodity_recommendations`

Acceptance gate:

Every recommendation includes source fields, confidence, reasoning, and human review status.

### P1 - Buyer Matching Lite

Add the minimum buyer/offtaker data model:

1. `buyer_offtakers`
2. `buyer_requirements`
3. `buyer_match_scores`
4. `buyer_outreach_events`

Acceptance gate:

A cooperative product or commodity can produce a buyer shortlist with match reasons and an approval/outreach event.

### P1 - Supply Chain Monitor Mini

Use existing metadata tables:

1. `barang_masuk_produk`
2. `barang_keluar_produk`
3. `inventaris_produk`
4. `transaksi_penjualan`

Recommended current-app bridge:

1. `stock_movements`
2. `supplier_orders`
3. `sales_order_lines`

Acceptance gate:

The app can show stock in, stock out, available quantity, fast-moving products, and supply gap for a selected cooperative.

### P1 - Cooperative Readiness Profile

Combine:

1. `profil_koperasi`
2. `dokumen_koperasi`
3. `pengurus_koperasi`
4. `anggota_koperasi`
5. `gerai_koperasi`
6. `aset_koperasi`
7. `rat_koperasi`

Acceptance gate:

The dashboard can explain whether a cooperative is ready for buyer matching, financing, production scaling, or only basic data cleanup.

### P2 - Financing Readiness

Use:

1. `pengajuan_pembiayaan`
2. `modal_koperasi`
3. `akun_bank_koperasi`
4. `pengajuan_rekening_bank`
5. `simpanan_anggota`

Acceptance gate:

A recommendation can say whether a cooperative needs working capital, asset financing, or bank-account cleanup before matching with buyers.

## Database Improvements

Recommended improvements before production import:

1. Split `koordinat_dibulatkan` into `latitude` and `longitude`.
2. Do not use `__row_id` as long-term business identity for transactional details.
3. Add `source_id`, `source_level`, `confidence`, `verified_at`, and `verified_by` to any imported potential claim.
4. Add status/reference tables or constrained enums for repeated statuses, bank names, gerai types, document types, transaction status, and commodity categories.
5. Reduce nullable on true keys and analytical fields such as `kode_wilayah`, `koperasi_ref`, `nama_produk`, `volume`, `nilai_potensi_desa`, `stok`, `jumlah_masuk`, and `jumlah_keluar`.
6. Add indexes for `kode_wilayah`, `koperasi_ref`, `produk_sample_id`, `nama_komoditas`, `status`, and date fields used for dashboards.
7. Add `record_events` for audit trail across imports, recommendations, approvals, and operator actions.

## What Not To Build First

Defer:

1. full marketplace checkout;
2. payment settlement;
3. bank integration;
4. autonomous AI decisions;
5. SIMKOPDES production integration;
6. national direct-desa claims without source labels;
7. complex logistics optimization.

These can become later modules after the map, scoring, recommendations, buyer matching lite, and supply-chain monitor have real data paths.

## Presentation Narrative

Use this product narrative:

> Lumbung Bersama mengubah data koperasi dan potensi desa yang tersebar menjadi peta peluang ekonomi. Sistem mendeteksi komoditas bernilai tinggi yang belum dimaksimalkan, merekomendasikan produk bernilai tambah, mencocokkan koperasi dengan buyer, lalu memonitor stok dan distribusi.

Do not present it as a generic agriculture marketplace.

Position it as an operating layer for cooperatives:

1. village potential mapping;
2. cooperative readiness;
3. AI-assisted recommendation;
4. buyer/offtaker matching;
5. stock and distribution monitoring;
6. human-reviewed governance.

## Sync Decision

This metadata checkpoint should be read after:

1. `docs/30-agent-exploration-sync-and-feature-backlog.md`
2. `docs/31-session-sync-runbook.md`

It should guide the next implementation loop if the user asks for MVP features for the hackathon presentation.

## Final Agent Review Addendum

After this checkpoint was created, Agent Eksplorasi completed another multi-agent review with product/MVP, data/schema, and demo/hackathon-defensibility angles.

Final readable status from that thread:

1. Thread status: `idle`.
2. Turn status: `completed`.
3. All three reviewers agreed that Lumbung Bersama should not be pitched as a cooperative super-app for the hackathon presentation.
4. The final MVP flow is:

`Peta Potensi Desa -> Rekomendasi Komoditas/Produk -> Buyer Matching Lite -> Stok/Readiness -> Laporan Aksi`

Keep for MVP:

1. `/peta-unggulan` as the main hero surface.
2. Explainable commodity and product recommendations.
3. Lumbung Data and operator verification.
4. Buyer Matching Lite, not a marketplace.
5. Cooperative stock and readiness.
6. Lapor Siap as the closing action/report surface.

Adjust for presentation:

1. WA Center becomes intake and verification only, not a live WhatsApp delivery claim.
2. Agent Center should show only three focused agents:
   - `Agen Unggulan Desa`;
   - `Agen Pasar dan Mitra`;
   - `Agen Laporan`.
3. Gerai Pintar becomes channel/readiness asset, not full POS retail.
4. Simpan Pinjam Aman becomes financing readiness, not credit scoring.
5. Homepage and module catalog should not be used as the main demo flow.

Hide from presentation:

1. Full marketplace, checkout, and payment.
2. Bank integration.
3. SIMKOPDES production integration.
4. Live WhatsApp delivery.
5. Autonomous AI decisioning.
6. National direct-desa production coverage claims.
7. Financing approval or credit scoring.
8. Claims that all modules are production-ready.

Final presentation narrative:

> Lumbung Bersama mengubah data potensi desa dan koperasi menjadi rekomendasi usaha yang bisa diaudit: komoditas prioritas, kesiapan koperasi, buyer potensial, dan aksi pengurus berikutnya.

Sync implication:

This checkpoint now reflects the final Agent Eksplorasi multi-agent review. Use it as the current product-decision anchor before implementation or pitch preparation.

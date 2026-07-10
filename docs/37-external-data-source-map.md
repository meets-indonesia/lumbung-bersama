# External Data Source Map - Lumbung Bersama

Date: 2026-07-10
Theme: Tema 2 - Optimalisasi Potensi Desa Melalui Koperasi
Purpose: external data exploration layer for MVP scoring, demo defense, and post-hackathon roadmap

## 1. Core Rule

The hackathon database is exploration material, not the canonical SIMKOPDES production reference.

Use it to understand patterns:

1. wilayah;
2. desa;
3. komoditas;
4. koperasi;
5. produk;
6. stok;
7. transaksi;
8. kemitraan.

Then strengthen the MVP with external official sources that can be cited and source-labeled.

Pitch-safe wording:

> Database hackathon kami gunakan sebagai sample eksplorasi terbatas. Untuk memperkuat rekomendasi, Lumbung Bersama menambahkan layer data resmi seperti Kemendesa, BIG, BPS, Bapanas, Kemendag, BI, dan regulasi koperasi.

## 2. External Data Architecture

Use four evidence layers:

1. Shared DB exploration layer: sample schema/data from the hackathon.
2. Official spatial and village layer: Kemendesa, BIG, BPS, Satu Data/CKAN.
3. Official market and commodity layer: Bapanas, BI/PIHPS, Kemendag, BPS.
4. Cooperative governance layer: BPK/JDIH, Kemenkop, BPS cooperative baseline, IDXCOOP, SIMKOPDES portal.

Recommended data labels in the app:

1. `Shared DB exploration`
2. `Official spatial boundary`
3. `Official village index`
4. `Official statistics`
5. `Official market price`
6. `Official trade signal`
7. `Official regulation`
8. `Regional open data`
9. `Operator verified`
10. `Demo baseline`

## 3. Village and Spatial Sources

| Source | Owner | URL | Data type | Access | MVP usage | Caveat |
|---|---|---|---|---|---|---|
| SID Kemendesa - IDM | Kemendesa PDTT | https://sid.kemendesa.go.id/idm | IDM score/status by wilayah/desa | Portal web | Desa readiness, status desa, baseline prioritization | BNBA/detail may require login; API public contract is not explicit |
| SID Kemendesa - SDGs Desa | Kemendesa PDTT | https://sid.kemendesa.go.id/sdgs | SDGs Desa score, 18 goals, program recommendations | Portal web | Social/economic/environmental profile and issue layer | Some detail access is restricted |
| Satu Data Kemendesa - IDM 2024 | Kemendesa PDTT | https://satudata.kemendesa.go.id/dataset/data-indeks-desa-membangun-tahun-2024/resource/2076c47d-5bf0-491e-a673-6e4dd5a63431 | XLSX/PDF IDM 2024 | CKAN download | Official ingest file for audit and reconciliation | 2024 dataset uses mixed server/data-year basis |
| Data.go.id - IDM 2024 | Satu Data Indonesia | https://data.go.id/dataset/dataset/data-indeks-desa-membangun-tahun-2024 | Dataset catalog/metadata | Portal/API where available | Discovery hub and source registry | Aggregator, not always final source of truth |
| BIG Batas Desa/Kelurahan 10K | Badan Informasi Geospasial | https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_KelDesa_10K/MapServer | Village/kelurahan polygons | ArcGIS REST, JSON/GeoJSON support | Boundary layer, map drilldown, spatial joins | Boundary reconciliation caveats exist |
| BPS Master File Desa | BPS | https://sumut.bps.go.id/id/publication/2025/11/17/7cd4d7cd214f79ee2e3f9cde/master-file-desa-provinsi-sumatera-utara-semester-i-2025.html | Village codes/names, urban-rural, statistical maps | Provincial publication/download | Code normalization and wilayah reconciliation | Not a single national API; province-by-province |
| BPS WebAPI | BPS | https://webapi.bps.go.id/developer | Publications, press releases, statistical tables, infographics | JSON API | Regional statistics enrichment | Village granularity varies by indicator |
| OpenData Aceh/CKAN | Pemerintah Aceh | https://data.acehprov.go.id/apihelper | Regional CSV/API datasets | CKAN API/download | Pilot augmentation for desa-level indicators | Regional only, schemas vary |

Top 5 to integrate first:

1. BIG village boundaries for map reliability.
2. SID Kemendesa IDM for village status/readiness.
3. SID Kemendesa SDGs Desa for thematic profile.
4. BPS Master File Desa for code and name reconciliation.
5. BPS WebAPI for regional official statistics.

## 4. Market, Commodity, and Buyer Signal Sources

| Source | Owner | URL | Data type | Access | MVP usage | Caveat | Score component |
|---|---|---|---|---|---|---|---|
| Panel Harga Pangan | Bapanas | https://dev-panelharga.badanpangan.go.id/ | Producer, wholesale, retail food prices | Web table/map, table download | Daily/near-daily price benchmark | Monitoring price, not transaction volume | Price level, price momentum, area spread |
| Open Data Bapanas | Bapanas / data.go.id | https://data.go.id/instantion/badan-pangan-nasional | Food availability, stock, reserve datasets | CSV/JSON/XLSX where available | Availability and deficit-risk signals | Some datasets may still be in SDI fulfillment process | Availability, buffer stock, deficit risk |
| PIHPS Nasional | Bank Indonesia / PIHPS | https://www.bi.go.id/hargapangan | Strategic food prices by market type | Web table/map | Cross-check price by market and region | Market type differences require careful interpretation | Retail-wholesale spread, price anomaly |
| Satu Data Perdagangan | Kemendag | https://satudata.kemendag.go.id/ | Trade, export/import, inflation, PDB, dashboard | Dashboard/download | Demand pull and trade flow | Aggregate data, not buyer commitments | Export/import signal, substitution opportunity |
| SISP Kemendag | Kemendag | https://sisp.kemendag.go.id/ | Market facilities and price/distribution context | Public web, deeper features may need login | Market node and distribution proxy | Not offtaker commitment | Market access/logistics |
| BPS WebAPI/statistical tables | BPS | https://webapi.bps.go.id/developer | Production, prices, WPI, CPI, regional stats | JSON API and tables | Production and supply outlook | Publication lag varies | Supply, margin, trend |
| BPS trade publications | BPS | https://www.bps.go.id/ | Export/import and regional trade publications | Publication/PDF/API depending table | Commodity flow and trade corridor | Often lagging; not real-time | Demand pull and corridor matching |
| Kemendag food price analysis | BKPerdag / Kemendag | https://bkperdag.kemendag.go.id/publikasi/kategori/analisis-harga-pangan-pokok | Food price analysis publications | PDF/download | Secondary explanation for anomalies | Secondary signal only | News/confirmation flag |

Top 5 market signals:

1. Daily price and regional spread from Bapanas and PIHPS.
2. Food stock and availability from Open Data Bapanas.
3. Production, WPI, CPI, and regional statistics from BPS.
4. Export/import and trade balance from BPS and Satu Data Kemendag.
5. Market node/logistics proxy from SISP and BPS regional trade publications.

Buyer Matching Lite implication:

Do not invent buyer names. Use these external sources as market-readiness and offtaker-readiness proxies until verified buyer/offtaker records are available.

## 5. Cooperative Governance and Policy Sources

| Source | Owner | URL | Data/content type | MVP usage | Caveat | Defensive wording |
|---|---|---|---|---|---|---|
| UU No. 25 Tahun 1992 | Pemerintah RI / BPK | https://peraturan.bpk.go.id/Details/46650/uu-no-25-tahun-1992 | Cooperative law | Legal framing for cooperative governance | General legal base | "Validasi kami bertumpu pada badan hukum dan tata kelola koperasi." |
| PP No. 7 Tahun 2021 | Pemerintah RI / BPK | https://peraturan.bpk.go.id/Details/161837/pp-no-7-tahun-2021 | Protection and empowerment framework | Policy context for UMKM/cooperative empowerment | General policy | "MVP mendukung pembinaan dan pemberdayaan." |
| Permenkop UKM No. 2/2024 | Kemenkop / BPK | https://peraturan.bpk.go.id/Details/308465/permenkop-ukm-no-2-tahun-2024 | Cooperative accounting and finance guidance | Reporting/financial readiness | Must match cooperative type | "Laporan aksi tidak menggantikan standar akuntansi koperasi." |
| Permenkop UKM No. 8/2023 | Kemenkop / BPK | https://peraturan.bpk.go.id/Details/260414/permenkop-ukm-no-8-tahun-2023 | Cooperative savings/loan governance | Financing readiness guardrail | Not automatic credit decision | "Financing is readiness, not auto approval." |
| SIMKOPDES portal | Kemenkop | https://simkopdes.go.id/ | Official KDKMP/SIMKOPDES portal | Readiness/mapping reference | Not proof of integration for this app | "Kami tidak mengklaim integrasi produksi." |
| IDXCOOP | Kemenkop + ICCI | https://idxcoop.kop.go.id/ | Cooperative digital transformation portal | Adoption and digitalization context | Program portal, not regulation | "Kemenkop mendorong transformasi digital koperasi." |
| Kemenkop Corporate University | Kemenkop | https://lms.kop.go.id/ | Learning portal | Operator/pengurus capacity building | Not operational data | "Pilot perlu pendampingan dan pelatihan." |
| BPS active cooperatives | BPS | https://www.bps.go.id/id/statistics-table/2/NzYwIzI%3D/jumlah-koperasi-aktif-menurut-provinsi.html | Active cooperative statistics | Baseline by province | Lagging, not real-time | "BPS dipakai sebagai baseline statistik." |

## 6. How External Sources Improve The MVP Score

Current MVP formula:

`30% Potensi Komoditas + 20% Kesiapan Koperasi + 20% Produk/Stok + 15% Sinyal Pasar + 10% Kemitraan + 5% Kelengkapan Data`

Recommended external-data upgrade:

| Score component | Existing DB signal | External upgrade |
|---|---|---|
| Potensi komoditas | `referensi_komoditas_desa.nilai_potensi_desa`, `volume`, `luas_area` | BPS production, Kemendesa IDM/SDGs, Bapanas availability |
| Kesiapan koperasi | `profil_koperasi`, `rat_koperasi`, `dokumen_koperasi` | UU/PP/Permenkop rules, BPS active cooperative baseline |
| Produk/stok | `produk_koperasi`, `inventaris_produk`, stock movements | Bapanas stock/availability, price spread |
| Sinyal pasar | `transaksi_penjualan`, `pengajuan_kemitraan` | Bapanas/PIHPS prices, Kemendag trade data, BPS export/import |
| Kemitraan | `pengajuan_kemitraan` | SISP market nodes, verified buyer requirement table later |
| Data quality | source labels, completeness checks | BIG/BPS/Kemendesa code reconciliation |

## 7. P0 Integration Plan

### P0.1 Boundary and Code Reconciliation

Use:

1. BIG Batas Desa/Kelurahan.
2. BPS Master File Desa.
3. `referensi_wilayah`.

Output:

1. normalized `kode_wilayah`;
2. village/regency/province labels;
3. map-ready geometry cache;
4. source label and confidence.

### P0.2 Village Readiness Enrichment

Use:

1. SID Kemendesa IDM.
2. SID Kemendesa SDGs Desa.
3. Satu Data Kemendesa IDM 2024.

Output:

1. village readiness status;
2. social/economic/ecology indicators;
3. recommendation context;
4. caveat if data is portal-only or not directly downloadable.

### P0.3 Commodity Market Signal

Use:

1. Bapanas Panel Harga.
2. PIHPS BI.
3. BPS WebAPI.

Output:

1. price trend;
2. spread by area/market level;
3. anomaly flag;
4. supply/demand proxy.

### P0.4 Governance Guardrail

Use:

1. UU 25/1992.
2. PP 7/2021.
3. Kemenkop/JDIH regulations.
4. SIMKOPDES portal as readiness reference.

Output:

1. governance language for pitch;
2. role approval rules;
3. no-auto-financing guardrail;
4. no-live-SIMKOPDES claim.

## 8. Slide Add-On

Add one backup slide after the database foundation:

Title:

`Data Hackathon Sebagai Eksplorasi, Data Resmi Sebagai Penguat`

Content:

1. Hackathon DB: sample pattern for MVP ideation.
2. BIG: official boundary layer.
3. Kemendesa IDM/SDGs: village status/readiness.
4. BPS: official regional statistics and cooperative baseline.
5. Bapanas/BI/Kemendag: price, market, and trade signals.
6. Kemenkop/BPK/JDIH: cooperative governance and policy.

Speaker note:

> Kami tidak memperlakukan sample database sebagai referensi final SIMKOPDES. Justru MVP kami dirancang agar bisa menggabungkan sample exploration layer dengan sumber resmi yang source-labeled.

## 9. Jury Q&A Additions

### Q: Kalau database hackathon terbatas, bagaimana sistem tetap kuat?

Answer:

> Karena arsitektur kami source-labeled. Sample database dipakai untuk memahami pola dan membangun MVP flow. Setelah itu, rekomendasi diperkuat dengan sumber resmi seperti BIG untuk batas desa, Kemendesa untuk IDM/SDGs, BPS untuk statistik, Bapanas/BI/Kemendag untuk sinyal pasar, dan regulasi koperasi untuk governance.

### Q: Apakah data luar ini otomatis valid untuk keputusan?

Answer:

> Tidak otomatis. Data luar menjadi evidence layer. Sistem tetap menampilkan sumber, tanggal, granularitas, dan caveat. Keputusan tetap oleh pengurus/operator.

### Q: Apakah bisa menyebut buyer nyata?

Answer:

> Belum, kecuali ada buyer/offtaker record yang verified. Untuk MVP, kami gunakan market-readiness proxy dan buyer archetype agar tidak membuat klaim palsu.

### Q: Kenapa pakai Bapanas, BI, Kemendag, dan BPS sekaligus?

Answer:

> Karena masing-masing menjawab sinyal berbeda: harga harian, perbedaan pasar, produksi/statistik, dan perdagangan. Kombinasi ini membuat rekomendasi lebih explainable daripada hanya satu angka.

## 10. Red Lines

Do not claim:

1. external source integration is already fully automated unless implemented and tested;
2. SIMKOPDES production integration;
3. hackathon schema as final SIMKOPDES reference;
4. BPS/Bapanas/BI/Kemendag data as real-time buyer commitment;
5. national desa-level commodity truth without source and date;
6. AI recommendation as final decision;
7. named buyer/offtaker without verified source.

Safe claim:

> Lumbung Bersama is ready to integrate source-labeled official datasets in stages, starting with boundaries, village readiness, market price signals, and cooperative governance baselines.


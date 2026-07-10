# DESIGN.md - Lumbung Bersama MVP Dashboard

## 1. Product Positioning

Lumbung Bersama adalah dashboard kerja koperasi desa untuk mengubah data potensi desa menjadi aksi ekonomi yang bisa diaudit. Jangan desain sebagai marketplace umum, POS, aplikasi bank, atau sistem pemerintah final.

Narasi utama untuk hackathon Tema 2:

`Peta Potensi Desa -> Rekomendasi Komoditas/Produk -> Buyer Matching Lite -> Stok/Readiness -> Laporan Aksi`

Tujuan layar utama:

1. Membantu operator dan pengurus koperasi melihat potensi ekonomi desa.
2. Menunjukkan komoditas/produk yang paling layak dikejar.
3. Menghubungkan kesiapan koperasi dengan kebutuhan buyer/offtaker.
4. Menampilkan gap stok, logistik, dan verifikasi.
5. Membuat laporan aksi yang jelas untuk rapat pengurus, pendamping, atau juri.

## 2. Logo Asset

Gunakan logo aktif Lumbung Bersama yang ada di aplikasi.

- Canonical app URL setelah deploy: `https://lumbungbersama.id/icon.svg?v=4`
- Local dev URL ketika `npm run dev`: `http://localhost:3000/icon.svg?v=4`
- Source file repo: `src/app/icon.svg`
- Inline React mark: `src/components/BrandMark.tsx`

Catatan: kalau domain produksi belum aktif, gunakan local dev URL atau langsung ambil SVG dari `src/app/icon.svg`.

## 3. Brand Concept

Logo dibaca sebagai:

- Atap lumbung merah: perlindungan, amanah, dan koperasi sebagai rumah bersama.
- Rangka lumbung coklat: fondasi desa, tanah, dan operasional nyata.
- Butir padi emas: hasil ekonomi desa dan nilai tambah produk.
- Lengkung hijau: pertumbuhan, sawah, kebun, dan potensi lokal.
- Garis dasar arang: stabilitas data dan akuntabilitas.
- Titik hijau: sinyal peluang yang perlu diverifikasi.

Visual dashboard harus terasa seperti command center koperasi desa: hangat, serius, berorientasi data, tetapi tetap mudah dibaca oleh pengurus non-teknis.

## 4. Color Palette

Ambil warna dari logo dan gunakan secara konsisten. Jangan pakai neon purple/blue, gradient berlebihan, atau warna random di luar palet.

### Core Brand

- Merah Amanah `#C92A2A`
  - Role: primary CTA, alert penting, aksen brand, keputusan yang butuh perhatian.
  - Gunakan hemat. Jangan jadikan semua elemen merah.

- Putih Padi `#FFF8EA`
  - Role: background hangat untuk public page, card terang, logo tile.

- Hijau Sawah `#2F7D32`
  - Role: verified, ready, growth opportunity, stok aman, data sudah dicek.

- Emas Gabah `#D79A2B`
  - Role: opportunity, recommendation highlight, score sedang, warning ringan.

- Coklat Tanah `#7A4E2D`
  - Role: metadata, sublabel, border hangat, secondary text di area terang.

- Arang Tinta `#1F2933`
  - Role: text utama, title, garis dasar, icon utama.

- Abu Berkas `#E7DED1`
  - Role: border, divider, skeleton, inactive outline.

### Dashboard Dark Mode

- Dark Canvas `#0F1519`
  - Role: background utama dashboard.

- Dark Surface `#111A20`
  - Role: sidebar dan panel utama.

- Dark Panel `#172027`
  - Role: card, table group, module panel.

- Light Ink `#F8F4EA`
  - Role: text utama di dark mode.

- Muted Dark Text `#CFC3B2`
  - Role: helper text, metadata, secondary text.

### Semantic Status

- Verified: `#2F7D32`
- Warning/opportunity: `#D79A2B`
- Critical/action needed: `#C92A2A`
- Integration/info: `#1D5D8F`
- Neutral/draft: `#7A4E2D`

Rule: satu layar boleh memakai banyak status color, tetapi hanya satu command accent utama. Primary command tetap Merah Amanah atau Biru Layanan sesuai konteks.

## 5. Typography

Gunakan sans-serif modern yang rapi dan mudah dibaca.

- Display/title: `Geist`, `Satoshi`, atau `Outfit`.
- Body: `Geist` atau `Satoshi`.
- Numbers, IDs, timestamps: `Geist Mono` atau `JetBrains Mono`.
- Jangan gunakan `Inter` sebagai pilihan utama untuk desain baru.
- Jangan gunakan serif di dashboard.

Ukuran rekomendasi:

- Dashboard page title: 28-36px, weight 800/900.
- Panel title: 18-24px, weight 800.
- Body/table text: 14-16px, weight 500/600.
- Metadata: 12-13px, weight 600/700.
- KPI number: 32-56px, pakai mono bila konteksnya angka operasional.

## 6. Dashboard Information Architecture

Dashboard harus menceritakan flow MVP, bukan sekadar kumpulan card.

### Sidebar Grouping

1. MVP Utama
   - Ringkasan
   - Peta Potensi
   - Rekomendasi

2. Data dan Verifikasi
   - Lumbung Data
   - WA Intake

3. Eksekusi
   - Buyer Matching
   - Stok Readiness
   - Laporan Aksi

4. Pendukung
   - Gerai Readiness
   - Financing Readiness
   - Integrasi

### First Screen Layout

Layar pertama harus langsung menunjukkan:

- Nama koperasi dan lokasi.
- Status data: Postgres, demo fallback, official connector, WA/operator, atau baseline.
- 4 KPI yang tidak fake:
  - Laporan warga hari ini.
  - Draft perlu dicek.
  - Stok kritis.
  - Paket laporan siap.
- Work queue paling penting.
- Opportunity highlight komoditas.
- Shortcut ke Peta Potensi dan Buyer Matching.

Jangan buat hero marketing besar di dashboard. Dashboard adalah ruang kerja padat, bukan landing page.

## 7. MVP Feature Sections

### 7.1 Ringkasan Operator

Fungsi:

- Melihat metrik operasional.
- Melihat queue verifikasi.
- Search nomor LB, nama warga, modul, atau status.
- Approve draft.
- Buat follow-up WA draft.
- Buka modul terkait.

Data source:

- `operator_queue`
- `wa_messages`
- `stock_items`
- `buyer_matches`
- `report_sections`
- `agent_runs`

Design:

- Gunakan table/list dense, bukan card besar semua.
- Setiap row punya status badge, source label, module tag, dan action.
- Row paling urgent diberi border kiri Merah Amanah.

### 7.2 Peta Potensi Desa

Fungsi:

- Peta wilayah dan desa.
- Search administrasi.
- Drilldown wilayah.
- Layer komoditas, koperasi, gudang, UMKM, sawah, peternakan.
- Commodity insight dan source check.
- Opportunity analysis.

Data source:

- App schema: `villages`, `village_commodities`, `village_assets`, `administrative_areas`, `regional_commodity_profiles`, `regional_commodity_signals`, `admin_boundary_cache`.
- Shared hackathon schema: `referensi_wilayah`, `referensi_profil_desa`, `referensi_komoditas_desa`, `referensi_koperasi_wilayah`.

Design:

- Peta full workspace, bukan mini preview.
- Panel kanan berisi detail desa, komoditas, readiness, risk, dan first action.
- Setiap insight wajib punya confidence/source label.
- Jangan klaim data produksi desa sebagai verified jika hanya baseline.

### 7.3 Opportunity Score

Fungsi:

- Menilai potensi komoditas/produk berdasarkan supply, demand, kesiapan aset, koperasi, buyer, stok, dan risiko.

Suggested score components:

- Supply signal.
- Demand/buyer signal.
- Cooperative readiness.
- Stock/readiness.
- Processing/value-add opportunity.
- Logistics risk.
- Evidence completeness.

Design:

- Score jangan tampil sebagai angka mutlak tanpa penjelasan.
- Gunakan breakdown horizontal atau stacked evidence meter.
- Label: `Rekomendasi awal`, `Perlu verifikasi`, `Siap tindak lanjut`, atau `Jangan diprioritaskan dulu`.

### 7.4 Rekomendasi Komoditas/Produk

Fungsi:

- Menampilkan komoditas prioritas.
- Menjelaskan alasan rekomendasi.
- Menampilkan risiko dan action pertama.
- Memberi script WA untuk validasi warga/pengurus.

Agent terkait:

- `Agen Unggulan Desa`

Design:

- Card rekomendasi harus punya:
  - Komoditas.
  - Desa/wilayah.
  - Opportunity.
  - Why now.
  - Risk.
  - Evidence/source.
  - Next action.
  - Human approval state.

### 7.5 Buyer Matching Lite

Fungsi:

- Buyer shortlist.
- Match score.
- Alasan match.
- Kebutuhan buyer.
- Status approval pengurus.
- Outreach script.

Data source:

- App schema: `buyer_matches`.
- Shared schema: `pengajuan_kemitraan`, `produk_koperasi`, `inventaris_produk`, `transaksi_penjualan`.

Design:

- Jangan tampilkan seperti marketplace checkout.
- Tampilkan sebagai pipeline:
  - Kandidat buyer.
  - Cocok sebagian.
  - Perlu cek kualitas.
  - Approved outreach.
  - Follow-up.
- CTA utama: `Ajukan ke pengurus`, `Setujui outreach`, `Download script`, `Catat hasil`.

### 7.6 Stok dan Readiness

Fungsi:

- Stok gerai/gudang.
- Restock request.
- Aging risk.
- Jadwal pickup sebagai draft operasional.
- Export supplier/manifest.

Data source:

- App schema: `stock_items`.
- Shared schema: `produk_koperasi`, `inventaris_produk`, `barang_masuk_produk`, `barang_keluar_produk`, `transaksi_penjualan`.

Design:

- Gunakan status visual:
  - Stok Aman: Hijau Sawah.
  - Terbatas: Emas Gabah.
  - Perlu Restok: Merah Amanah.
  - Menunggu Grade: Coklat Tanah.
  - Jadwal Pickup: Biru Layanan.
- Bedakan stok verified dan draft WA.

### 7.7 WA Intake

Fungsi:

- Mencatat pesan warga/operator.
- Intent routing.
- Formal reply.
- Auto-create operator queue.
- Webhook verification dan HMAC signature untuk produksi.
- Audio/image/document masuk sebagai placeholder bila media/STT belum aktif.

Data source:

- `wa_messages`
- `operator_queue`

Design:

- Tampilkan sebagai inbox operasional.
- Setiap message punya:
  - Sender.
  - Source.
  - Intent.
  - Module target.
  - Bot reply draft.
  - Queue ID.
  - Status env: draft/local/live configured.
- Jangan tulis "terkirim WhatsApp" kecuali live API benar-benar configured dan verified.

### 7.8 Agent Center

Fungsi:

- Tiga agent MVP:
  - Agen Unggulan Desa.
  - Agen Pasar dan Mitra.
  - Agen Laporan.
- Agent run tersimpan di `agent_runs`.
- Output rules/Postgres based.
- Semua hasil perlu approval manusia.

Design:

- Agent bukan avatar chat generik.
- Tampilkan sebagai audit run:
  - Input record ID.
  - Agent.
  - Checks.
  - Output.
  - Explanation.
  - Next action.
  - Created at.
- Gunakan label `rules + Postgres` atau `provider configured` sesuai mode.

### 7.9 Financing Readiness

Fungsi:

- Melihat permintaan pembiayaan.
- Menyiapkan agenda rapat komite.
- Menandai siap review.

Data source:

- App schema: `finance_requests`.
- Shared schema: `pengajuan_pembiayaan`, `modal_koperasi`, `akun_bank_koperasi`, `simpanan_anggota`.

Design:

- Jangan tampilkan sebagai credit scoring atau auto approval.
- Copy wajib: `Keputusan tetap di komite koperasi`.
- Badge: `Draft`, `Perlu dokumen`, `Siap rapat komite`, `Diputuskan pengurus`.

### 7.10 Laporan Aksi

Fungsi:

- Pilih section laporan.
- Lock/unlock periode.
- Export CSV.
- Ringkas evidence, rekomendasi, buyer action, stok, dan integrasi.

Data source:

- `report_sections`
- `report_periods`
- `agent_runs`
- `wa_messages`
- shared schema: `dokumen_koperasi`, `rat_koperasi`, transaksi, stok.

Design:

- Laporan harus terasa seperti paket rapat, bukan blog post.
- Struktur:
  - Executive summary.
  - Top opportunities.
  - Evidence.
  - Pending verification.
  - Buyer/action plan.
  - Risk.
  - Export/lock state.

### 7.11 Integrasi dan Health

Fungsi:

- Health check API.
- Database configured/reachable.
- Auth configured.
- WhatsApp env status.
- OpenAI env status.
- BPS/API/source connector readiness.
- SIMKOPDES readiness only.

Design:

- Gunakan matrix env.
- Jangan tampilkan credential value.
- Tampilkan hanya configured/not-configured/reachable/error.
- CTA: `Cek API health`, `Lihat source data`, `Download mapping`.

## 8. Authentication and Access UX

Auth sudah menjadi bagian MVP dan harus terlihat profesional.

Implemented:

- Admin login via env.
- PBKDF2-SHA256 password hash.
- HttpOnly `SameSite=Lax` session cookie.
- Session token hash disimpan di Postgres.
- Session TTL default 10 jam.
- Logout revoke session.
- Login protected route redirect ke `/login?next=/dashboard`.
- Profile edit dan notifications.

Design requirements:

- Login page harus sederhana, bukan landing page.
- Jangan tampilkan register publik.
- Dashboard state unauthenticated harus redirect login.
- Profile menu harus punya:
  - nama operator,
  - role/title,
  - profile edit,
  - notification,
  - theme toggle,
  - logout.

## 9. Database and Data Trust UX

Shared DB hackathon dan app DB harus dipahami sebagai dua layer berbeda.

### App Operational Tables

- `cooperatives`
- `users`
- `auth_sessions`
- `notifications`
- `operator_queue`
- `wa_messages`
- `agent_runs`
- `stock_items`
- `buyer_matches`
- `finance_requests`
- `report_sections`
- `report_periods`
- `villages`
- `village_commodities`
- `village_assets`
- `open_data_sources`
- `administrative_areas`
- `regional_commodity_profiles`
- `regional_commodity_signals`
- `admin_boundary_cache`
- `data_import_runs`

### Shared Hackathon Schema Mapping

- Wilayah dan desa:
  - `referensi_wilayah`
  - `referensi_profil_desa`
  - `referensi_komoditas_desa`

- Koperasi:
  - `referensi_koperasi_wilayah`
  - `profil_koperasi`
  - `anggota_koperasi`
  - `pengurus_koperasi`
  - `karyawan_koperasi`
  - `aset_koperasi`
  - `gerai_koperasi`
  - `rat_koperasi`

- Produk, stok, dan transaksi:
  - `produk_koperasi`
  - `inventaris_produk`
  - `barang_masuk_produk`
  - `barang_keluar_produk`
  - `transaksi_penjualan`

- Mitra dan pembiayaan:
  - `pengajuan_kemitraan`
  - `pengajuan_pembiayaan`
  - `modal_koperasi`
  - `akun_bank_koperasi`
  - `simpanan_anggota`

Design rule:

- Setiap angka harus diberi source label:
  - `Postgres operational`
  - `WA/operator verified`
  - `Official connector`
  - `Authorized upload`
  - `Demo/baseline`
  - `Shared DB read-only`

Jangan tampilkan NIK, nomor KTP, file KTP, email pribadi, nomor telepon, atau data PII anggota di dashboard demo.

## 10. Google Cloud Credit and Deployment UX

Hackathon mendapat Google Cloud credit. Desain harus menunjukkan kesiapan cloud tanpa boros dan tanpa overclaim.

Recommended architecture for pitch:

- Cloud Run untuk Next.js/API agar bisa scale to zero.
- Cloud SQL PostgreSQL kecil atau managed Postgres bila budget memungkinkan.
- Secret Manager untuk token dan password.
- Cloud Logging untuk audit API.
- Cloud Scheduler/Cloud Run Jobs untuk import data berkala.
- Cloud Storage untuk media bukti bila fitur upload diaktifkan.
- Budget alert di Billing, karena budget alert tidak otomatis menghentikan biaya.

Dashboard integration panel harus menampilkan:

- Project mode: local, staging, atau production.
- Database reachable.
- Auth configured.
- WhatsApp configured.
- AI provider configured.
- Source connector configured.
- Last health check.
- Cost discipline note: no always-on GPU, bounded AI calls, cached source checks.

## 11. Judge-Focused Design Notes

### Startup/VC

Tampilkan wedge bisnis:

- Dari data desa yang tersebar menjadi opportunity yang actionable.
- Buyer matching lite dengan approval.
- Readiness stok dan laporan aksi.
- Bisa dipakai koperasi tanpa mengganti semua sistem lama.

### Google Cloud/Public Sector

Tampilkan governance:

- Source-labeled data.
- Env-gated integrations.
- No secrets in UI.
- Audit trail.
- Cloud Run/Secret Manager/Billing budget readiness.

### AI Academic

Tampilkan explainability:

- AI tidak mengambil keputusan final.
- Ada source fields, confidence, checks, explanation, next action.
- Human approval state jelas.

### Economic/Cooperative Policy

Tampilkan dampak koperasi:

- Koperasi sebagai aggregator.
- Nilai tambah produk desa.
- Kesiapan gerai/gudang.
- Rapat pengurus dan komite tetap menjadi keputusan final.
- Laporan aksi siap untuk pendamping dan monitoring.

## 12. Layout Rules

- Dashboard density: 8/10. Padat, rapi, mudah discan.
- Public pages density: 5/10. Lebih longgar dan SEO-friendly.
- Jangan gunakan 3 equal cards generik untuk semua section.
- Gunakan grid asimetris: 60/40, 70/30, atau list + detail panel.
- Maksimum width desktop: 1440px untuk content dashboard.
- Sidebar fixed/collapsible.
- Mobile: semua multi-column collapse ke single column.
- Minimum tap target: 44px.
- Jangan ada horizontal overflow di mobile.
- Hindari cards di dalam cards.
- Setiap button harus punya action nyata, disabled reason, atau env-gated explanation.

## 13. Component Rules

### KPI

- Number besar, label singkat, source note kecil.
- Jangan pakai angka fake bulat jika tidak ada data.
- Warna hanya untuk status, bukan dekorasi.

### Table/List

- Row height 56-72px.
- Badge kecil 20-28px tinggi.
- Gunakan hover subtle.
- Action icon dengan tooltip.

### Cards

- Radius 12-16px untuk dashboard.
- Border `#E7DED1` di light mode, `rgba(255,255,255,0.10)` di dark mode.
- Shadow minimal, jangan glow.

### Buttons

- Primary: Merah Amanah `#C92A2A` atau Biru Layanan `#1D5D8F` sesuai konteks.
- Secondary: outline neutral.
- Destructive/critical: Merah Amanah.
- Active press: translateY(1px) atau scale 0.99.

### Forms

- Label di atas input.
- Helper text di bawah.
- Error inline.
- Jangan floating label.
- Required state jelas.

### Map

- Map harus punya legend.
- Layer toggles jelas.
- Detail panel tidak menutup seluruh peta.
- Loading boundary pakai skeleton, bukan spinner besar.

### Agent Run

- Jangan desain seperti chatbot kosong.
- Desain seperti evidence card:
  - input,
  - checks,
  - output,
  - explanation,
  - next action,
  - approval state.

## 14. Motion

Motion harus ringan dan operasional.

- Sidebar collapse: 160-220ms.
- Row hover: 120-160ms.
- Panel reveal: 180-240ms.
- Map marker pulse hanya untuk active selection.
- Skeleton shimmer boleh untuk loading data.
- Jangan gunakan parallax berat di dashboard.
- Animasi hanya transform dan opacity.

## 15. Copywriting Rules

Gunakan bahasa Indonesia yang lugas.

Gunakan:

- `Perlu dicek`
- `Menunggu verifikasi`
- `Siap rapat pengurus`
- `Draft follow-up`
- `Source: WA/operator`
- `Baseline, belum verified`
- `Keputusan tetap oleh pengurus`

Hindari:

- `AI otomatis memutuskan`
- `Data nasional lengkap`
- `Terintegrasi resmi SIMKOPDES`
- `WhatsApp sudah terkirim`
- `Marketplace end-to-end`
- `Kredit otomatis disetujui`

## 16. Anti-Patterns

Jangan lakukan:

- No fake metrics.
- No generic SaaS dashboard warna biru ungu.
- No neon glow.
- No gradient headline berlebihan.
- No AI mascot.
- No anonymous placeholder seperti John Doe atau Acme.
- No data PII di demo.
- No marketplace checkout/cart.
- No bank loan approval screen.
- No map tanpa source label.
- No button mati tanpa alasan.
- No hero marketing di dashboard.

## 17. Prompt Siap Tempel untuk Tim Design

```text
Create a high-fidelity MVP dashboard design for Lumbung Bersama, Tema 2: Optimalisasi Potensi Desa Melalui Koperasi.

Logo asset:
- Use the SVG logo from https://lumbungbersama.id/icon.svg?v=4 when available.
- Local fallback: http://localhost:3000/icon.svg?v=4 or source file src/app/icon.svg.

Brand colors:
- Merah Amanah #C92A2A
- Putih Padi #FFF8EA
- Hijau Sawah #2F7D32
- Emas Gabah #D79A2B
- Coklat Tanah #7A4E2D
- Arang Tinta #1F2933
- Abu Berkas #E7DED1
- Dashboard dark canvas #0F1519
- Dashboard surface #111A20
- Dashboard panel #172027

Do not design a generic marketplace. The dashboard must tell one operational flow:
1. Peta Potensi Desa
2. Rekomendasi Komoditas/Produk
3. Buyer Matching Lite
4. Stok/Readiness
5. Laporan Aksi

Primary screens:
- Ringkasan Operator
- Peta Potensi Desa
- Opportunity Score
- Rekomendasi Komoditas
- Buyer Matching Lite
- Stok dan Readiness
- WA Intake
- Agent Center
- Financing Readiness
- Laporan Aksi
- Integrasi dan Health

Every metric and insight must be source-labeled:
- WA/operator verified
- Postgres operational
- Official connector
- Authorized upload
- Shared DB read-only
- Demo/baseline

Every AI recommendation must show:
- input record
- source fields
- confidence
- checks
- explanation
- next action
- human approval state

Design tone:
- Serious cooperative command center.
- Warm Indonesian rural economy palette.
- Dense but readable dashboard.
- Dark mode first for dashboard.
- Light SEO-ready public pages.
- No fake metrics, no neon purple/blue, no AI mascot, no checkout/cart, no automatic loan approval.
```

## 18. Handoff Checklist

Before presenting:

- Logo visible in first viewport.
- Dashboard uses logo palette, not random colors.
- Source labels appear on all data cards.
- Demo/baseline data is labeled.
- No secrets or passwords are visible.
- No PII member data visible.
- Auth/login state included.
- Integration health state included.
- Human approval state visible for AI, buyer, and financing.
- Mobile layout has no horizontal scroll.
- Buttons have real intended actions.

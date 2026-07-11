# Demo Video, Slide, WA, dan Agent Runbook

Tanggal: 2026-07-11
Target live: https://lumbung-bersama.meetsin.id

## Prinsip Demo

Lumbung Bersama didemokan sebagai ruang kerja koperasi untuk mengubah potensi desa menjadi aksi yang bisa diverifikasi. Jangan menyebutnya marketplace checkout, live SIMKOPDES production, persetujuan pembiayaan otomatis, atau AI yang mengambil keputusan sendiri.

Alur utama:

1. Peta Potensi Desa
2. Rekomendasi Komoditas/Produk
3. Buyer Matching Lite
4. Stok/Readiness
5. Agent dan WA Intake
6. Laporan Aksi

## Rundown Video 3 Menit

1. Buka landing page
   - Narasi: masalah koperasi bukan hanya jualan, tetapi memilih produk yang siap dan bisa dipercaya.
   - Klik `Lihat Alur` atau buka `/peta-unggulan`.

2. Peta Unggulan
   - Cari atau klik provinsi/kabupaten.
   - Tunjukkan polygon, daftar wilayah, komoditas, sumber, dan panel evidence eksplorasi.
   - Klik `Jalankan skor peluang` setelah memilih wilayah/komoditas.
   - Narasi: skor memakai profil area, sumber komoditas, dan evidence agregat bila runtime aktif. Output tetap perlu review manusia.

3. Dashboard Operator
   - Login ke `/login?next=/dashboard`.
   - Tunjukkan onboarding singkat, sidebar, dan ringkasan operator.
   - Masuk `Rekomendasi Produk`.
   - Tambahkan input operasional dari form.
   - Narasi: data masuk menjadi case antrean, bukan angka palsu di UI.

4. Agent Center
   - Buka `AI Agent`.
   - Pilih case nyata dari antrean.
   - Jalankan agent.
   - Narasi: agent memberi ringkasan dan checklist, bukan keputusan final.

5. WA Intake
   - Buka `WA Agent`.
   - Jika personal bridge aktif, scan QR dan kirim pesan/file dari WhatsApp biasa.
   - Jika bridge belum aktif, tunjukkan status koneksi dan gunakan input operasional dashboard sebagai jalur intake yang sama.
   - Narasi: WA adalah kanal intake dan verifikasi, bukan klaim broadcast produksi bila belum connected.

6. Laporan Aksi
   - Buka `/laporan`.
   - Tunjukkan executive summary, opportunity, buyer readiness, stock/readiness gap, pending verification, dan decision status.
   - Export laporan jika diperlukan.

## Mapping ke 12 Slide

1. Slide masalah: koperasi punya data/potensi, tetapi sulit menentukan prioritas yang siap.
2. Slide user/stakeholder: pengurus, manager, admin gudang, logistik, kasir, dan juri viewer.
3. Slide solusi: peta -> rekomendasi -> buyer matching -> stok -> laporan.
4. Slide data: shared DB dipakai sebagai evidence agregat terbatas, bukan referensi utama SIMKOPDES.
5. Slide peta: polygon wilayah, komoditas, sumber, dan caveat.
6. Slide scoring: skor peluang terjelaskan, bisa memakai AI provider bila env aktif.
7. Slide buyer: tipe kebutuhan buyer dan readiness gate, tanpa buyer bernama palsu.
8. Slide readiness: stok, dokumen, media evidence, pembiayaan sebagai checklist kesiapan.
9. Slide arsitektur: Next.js, PostgreSQL-compatible app DB, shared DB read-only evidence, AI adapter, WA adapter, Secret Manager untuk produksi cloud.
10. Slide security: session HttpOnly, CSRF same-origin, role/scope gate, aggregate-only no PII.
11. Slide demo: jalankan flow di atas secara berurutan.
12. Slide submission: repo, README, live URL, akun juri, smoke test, dan runbook ini.

## Cara Pakai WA Real

WA real untuk testing WhatsApp biasa memakai personal bridge. Ini bukan WhatsApp Business Cloud API.

Syarat runtime:

1. App DB aktif dan user sudah login.
2. `WA_PERSONAL_ADAPTER_ENABLED=1` diset di runtime server.
3. Proses bridge berjalan dengan command:

```bash
npm run wa:personal
```

Flow pairing:

1. Login ke dashboard.
2. Buka menu `WA Agent`.
3. Lihat panel koneksi personal.
4. Jika status `QR tersedia`, scan QR dengan WhatsApp biasa di ponsel.
5. Setelah connected, kirim pesan teks atau file dari nomor yang terhubung.
6. Pesan masuk diproses sebagai WA intake dan dapat menjadi antrean verifikasi/operator.

Jika QR belum muncul:

1. Cek `/api/wa/personal/status` saat sudah login.
2. Pastikan bridge process masih hidup di server.
3. Pastikan folder state bridge dapat ditulis runtime.
4. Restart bridge bila status stale.

## Cara Menunjukkan Agent Terhubung

1. Buat case dari `Rekomendasi Produk -> Tambah input operasional`.
2. Buka `AI Agent`.
3. Pilih case dari antrean, bukan slug dummy.
4. Klik run.
5. Tunjukkan output:
   - sumber case,
   - ringkasan,
   - next action,
   - checklist,
   - evidence notes,
   - status human review.

Jika AI provider env aktif, output akan berlabel provider. Jika provider belum aktif atau gagal, sistem memakai aturan terjelaskan dan menampilkan fallback secara jujur.

## Kalimat Aman untuk Juri

Gunakan:

> Demo ini membaca data operasional aplikasi, profil wilayah, dan evidence agregat terbatas. AI membantu menyusun prioritas dan checklist, tetapi keputusan tetap di pengurus/operator.

Hindari:

> Sistem sudah terintegrasi penuh dengan SIMKOPDES produksi.

> AI otomatis menyetujui pembiayaan.

> Buyer sudah pasti membeli.

> WA production broadcast sudah live bila QR/Cloud API belum terhubung dan smoke-tested.

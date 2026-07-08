INSERT INTO cooperatives (id, name, village, district, regency, province)
VALUES (
  'kop-wanasari',
  'Koperasi Desa Maju Bersama',
  'Desa Wanasari',
  'Pangalengan',
  'Bandung',
  'Jawa Barat'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  village = EXCLUDED.village,
  district = EXCLUDED.district,
  regency = EXCLUDED.regency,
  province = EXCLUDED.province,
  updated_at = now();

INSERT INTO operator_queue (id, cooperative_id, sender, source, summary, status, module)
VALUES
  ('LB-1024', 'kop-wanasari', 'Pak Darto', 'Voice note', 'Kopi kering sekitar 120 kg, minta cek harga koperasi.', 'Perlu Foto Barang', 'Suara Warga'),
  ('LB-1025', 'kop-wanasari', 'Bu Sari', 'Text WhatsApp', 'Panen padi minggu depan sekitar 5 kuintal di Blok C.', 'Perlu Timbang', 'Lumbung Data'),
  ('LB-1026', 'kop-wanasari', 'Kelompok Tani Mekar', 'Assisted by operator', 'Singkong satu bak pickup, perlu jadwal ambil.', 'Menunggu Dicek', 'Stok dan Logistik'),
  ('LB-1027', 'kop-wanasari', 'Bu Rini', 'WhatsApp text', 'Ajukan pembiayaan pupuk Rp1.000.000 untuk musim tanam.', 'Perlu Komite', 'Simpan Pinjam Aman'),
  ('LB-1028', 'kop-wanasari', 'Petugas Gerai', 'Manual operator', 'Minyak goreng tersisa 12 dus dan perlu restock supplier.', 'Perlu Restock', 'Gerai Pintar')
ON CONFLICT (id) DO UPDATE SET
  sender = EXCLUDED.sender,
  source = EXCLUDED.source,
  summary = EXCLUDED.summary,
  status = EXCLUDED.status,
  module = EXCLUDED.module,
  updated_at = now();

INSERT INTO stock_items (id, cooperative_id, name, unit, state, location)
VALUES
  ('stock-beras-medium', 'kop-wanasari', 'Beras medium', '28 karung', 'Stok Aman', 'Gerai'),
  ('stock-minyak-goreng', 'kop-wanasari', 'Minyak goreng', '12 dus', 'Perlu Restok', 'Gerai'),
  ('stock-pupuk-npk', 'kop-wanasari', 'Pupuk NPK', '8 karung', 'Terbatas', 'Gudang'),
  ('stock-kopi-kering', 'kop-wanasari', 'Kopi kering', '120 kg', 'Menunggu Grade', 'Gudang komoditas'),
  ('stock-singkong', 'kop-wanasari', 'Singkong', '1 bak pickup', 'Jadwal Pickup', 'Kebun anggota')
ON CONFLICT (id) DO UPDATE SET
  unit = EXCLUDED.unit,
  state = EXCLUDED.state,
  location = EXCLUDED.location,
  updated_at = now();

INSERT INTO buyer_matches (id, cooperative_id, buyer, need, match_score, reason, status)
VALUES
  ('buyer-roastery', 'kop-wanasari', 'Nusantara Roastery', 'Kopi kering grade A', 82, 'Kebutuhan buyer cocok dengan stok kopi kering setelah verifikasi grade.', 'Perlu approval pengurus'),
  ('buyer-olahan', 'kop-wanasari', 'Dapur Olahan Desa', 'Singkong segar', 76, 'Cocok untuk peluang olahan singkong lokal, perlu cek jadwal pickup.', 'Perlu cek kapasitas'),
  ('buyer-warung', 'kop-wanasari', 'Warung Mitra Kecamatan', 'Beras medium', 69, 'Permintaan rutin kecil, cocok untuk suplai bertahap.', 'Siap kontak')
ON CONFLICT (id) DO UPDATE SET
  buyer = EXCLUDED.buyer,
  need = EXCLUDED.need,
  match_score = EXCLUDED.match_score,
  reason = EXCLUDED.reason,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO finance_requests (id, cooperative_id, member, purpose, amount, risk, status)
VALUES
  ('SP-204', 'kop-wanasari', 'Bu Rini', 'Pupuk dan bibit', 1000000, 'Perlu cek histori simpanan', 'Menunggu komite'),
  ('SP-205', 'kop-wanasari', 'Pak Hasan', 'Perbaikan alat pengering kopi', 2500000, 'Butuh rencana bayar dari hasil panen', 'Draft analisis')
ON CONFLICT (id) DO UPDATE SET
  member = EXCLUDED.member,
  purpose = EXCLUDED.purpose,
  amount = EXCLUDED.amount,
  risk = EXCLUDED.risk,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO report_sections (id, cooperative_id, title, included)
VALUES
  ('report-warga', 'kop-wanasari', 'Laporan warga', true),
  ('report-stok', 'kop-wanasari', 'Stok gerai dan gudang', true),
  ('report-komoditas', 'kop-wanasari', 'Komoditas masuk', true),
  ('report-buyer', 'kop-wanasari', 'Buyer dan mitra', true),
  ('report-pembiayaan', 'kop-wanasari', 'Simpan pinjam', true),
  ('report-integrasi', 'kop-wanasari', 'Kesiapan integrasi', true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  included = EXCLUDED.included,
  updated_at = now();

INSERT INTO report_periods (id, cooperative_id, label, locked)
VALUES ('period-current', 'kop-wanasari', 'Periode berjalan', false)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  locked = EXCLUDED.locked,
  updated_at = now();

INSERT INTO map_regions (id, label, status, color, village_code, keywords)
VALUES
  ('sumatera', 'Sumatera', 'Surplus kebun', '#2F7D32', '11.09.05.2012', ARRAY['aceh','sumatera','kopi','nilam','gayo']),
  ('jawa-barat', 'Jawa Barat', 'Olahan pangan', '#D79A2B', '32.04.12.2008', ARRAY['jawa barat','bandung','singkong','kopi','padi']),
  ('jawa-tengah', 'Jawa Tengah', 'Harga fluktuatif', '#C92A2A', '33.02.07.2011', ARRAY['jawa tengah','karanganyar','cabai','telur']),
  ('jawa-timur', 'Jawa Timur', 'Kopi naik', '#1D5D8F', '35.07.18.2004', ARRAY['jawa timur','malang','robusta','pisang']),
  ('kalimantan', 'Kalimantan', 'Perlu logistik', '#7A4E2D', '64.03.11.2006', ARRAY['kalimantan','kutai','lada','sawit','kakao']),
  ('sulawesi', 'Sulawesi', 'Perikanan dan kakao', '#2F7D32', '73.10.04.2009', ARRAY['sulawesi','bone','rumput laut','kakao','ikan']),
  ('papua-maluku', 'Papua dan Maluku', 'Pangan lokal', '#D79A2B', '91.03.02.2003', ARRAY['papua','maluku','sagu','ikan'])
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  status = EXCLUDED.status,
  color = EXCLUDED.color,
  village_code = EXCLUDED.village_code,
  keywords = EXCLUDED.keywords;

INSERT INTO villages (code, name, district, regency, province, lat, lng, summary, source_note)
VALUES
  ('32.04.12.2008', 'Desa Wanasari', 'Pangalengan', 'Bandung', 'Jawa Barat', -7.041, 107.592, 'Desa dengan pasokan singkong, kopi kering, sawah padi, gerai koperasi, dan UMKM pangan.', 'Data awal lokal, siap diganti pipeline sumber resmi.'),
  ('33.02.07.2011', 'Desa Tegalrejo', 'Ngargoyoso', 'Karanganyar', 'Jawa Tengah', -7.642, 111.072, 'Desa dataran tinggi dengan sayur, peternakan kecil, koperasi, dan potensi cold storage.', 'Data awal lokal, siap diganti pipeline sumber resmi.'),
  ('35.07.18.2004', 'Desa Sumbermulyo', 'Dampit', 'Malang', 'Jawa Timur', -8.215, 112.756, 'Desa dengan kopi, pisang, kandang kambing, dan peluang pengeringan kolektif.', 'Data awal lokal, siap diganti pipeline sumber resmi.'),
  ('11.09.05.2012', 'Desa Atu Lintang', 'Atu Lintang', 'Aceh Tengah', 'Aceh', 4.607, 96.789, 'Desa dataran tinggi dengan kopi arabika, nilam, gudang sortasi, dan kelompok pengeringan.', 'Data awal lokal, siap diganti pipeline sumber resmi.'),
  ('64.03.11.2006', 'Desa Muara Lestari', 'Muara Kaman', 'Kutai Kartanegara', 'Kalimantan Timur', -0.252, 117.008, 'Desa tepi sungai dengan lada, kakao, sawit rakyat, dan isu ongkos angkut.', 'Data awal lokal, siap diganti pipeline sumber resmi.'),
  ('73.10.04.2009', 'Desa Pesisir Baru', 'Tanete Riattang Timur', 'Bone', 'Sulawesi Selatan', -4.52, 120.362, 'Desa pesisir dengan rumput laut, ikan tangkap, kakao, dan kebutuhan cold storage.', 'Data awal lokal, siap diganti pipeline sumber resmi.'),
  ('91.03.02.2003', 'Kampung Sagu Mandiri', 'Sentani Timur', 'Jayapura', 'Papua', -2.623, 140.662, 'Kampung dengan sagu, ikan air tawar, UMKM pangan, dan aset yang tersebar.', 'Data awal lokal, siap diganti pipeline sumber resmi.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  regency = EXCLUDED.regency,
  province = EXCLUDED.province,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  summary = EXCLUDED.summary,
  source_note = EXCLUDED.source_note,
  updated_at = now();

INSERT INTO village_commodities (id, village_code, name, supply, demand, quantity, price_signal, opportunity, risk)
VALUES
  ('wanasari-singkong', '32.04.12.2008', 'Singkong', 'Surplus mulai berulang', 'Tinggi untuk olahan lokal', '1 bak pickup', 'Stabil naik', 'Keripik singkong koperasi', 'Pasokan harus rutin dan kualitas harus disortir.'),
  ('wanasari-kopi', '32.04.12.2008', 'Kopi kering', 'Menunggu grade', 'Tinggi dari roastery', '120 kg', 'Naik moderat', 'Pengeringan dan sortasi kolektif', 'Kadar air perlu dicek sebelum penawaran buyer.'),
  ('tegalrejo-cabai', '33.02.07.2011', 'Cabai', 'Surplus musiman', 'Fluktuatif', '320 kg', 'Turun cepat', 'Sambal dan pengeringan cabai', 'Harga mudah turun saat panen bersamaan.'),
  ('sumbermulyo-kopi', '35.07.18.2004', 'Kopi robusta', 'Naik bertahap', 'Tinggi', '260 kg', 'Naik', 'Rumah jemur kopi kolektif', 'Perlu standar kadar air dan sortasi.'),
  ('atulintang-kopi', '11.09.05.2012', 'Kopi arabika', 'Surplus kebun', 'Tinggi', '410 kg', 'Premium stabil', 'Sortasi dan roasting kecil koperasi', 'Traceability kebun harus rapi.'),
  ('muara-lada', '64.03.11.2006', 'Lada', 'Cukup', 'Menengah', '190 kg', 'Stabil', 'Unit pengering lada koperasi', 'Ongkos angkut tinggi.'),
  ('pesisir-rumput-laut', '73.10.04.2009', 'Rumput laut', 'Surplus pesisir', 'Tinggi', '1,2 ton', 'Naik', 'Pengeringan dan grading rumput laut', 'Cuaca dan penyimpanan memengaruhi kualitas.'),
  ('sagu-mandiri-sagu', '91.03.02.2003', 'Sagu', 'Cukup', 'Tinggi lokal', '700 kg', 'Stabil', 'Tepung sagu kemasan koperasi', 'Kelembapan gudang harus dikontrol.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  supply = EXCLUDED.supply,
  demand = EXCLUDED.demand,
  quantity = EXCLUDED.quantity,
  price_signal = EXCLUDED.price_signal,
  opportunity = EXCLUDED.opportunity,
  risk = EXCLUDED.risk;

INSERT INTO village_assets (id, village_code, type, name, lat, lng, note, confidence)
VALUES
  ('w-1', '32.04.12.2008', 'cooperative', 'Koperasi Desa Maju Bersama', -7.041, 107.592, 'Pusat operator dan gerai', 'Data awal lokal'),
  ('w-2', '32.04.12.2008', 'warehouse', 'Gudang Komoditas Blok C', -7.046, 107.598, 'Kapasitas terbatas', 'Data awal lokal'),
  ('w-3', '32.04.12.2008', 'umkm', 'UMKM Dapur Olahan Desa', -7.038, 107.601, 'Bisa pilot keripik', 'Data awal lokal'),
  ('t-1', '33.02.07.2011', 'warehouse', 'Gudang Sayur Utara', -7.636, 111.08, 'Butuh cold storage', 'Data awal lokal'),
  ('s-1', '35.07.18.2004', 'warehouse', 'Rumah Jemur Kopi', -8.221, 112.762, 'Perlu standar kadar air', 'Data awal lokal'),
  ('a-1', '11.09.05.2012', 'cooperative', 'Koperasi Kopi Atu Lintang', 4.607, 96.789, 'Pusat pengumpulan kopi', 'Data awal lokal'),
  ('k-1', '64.03.11.2006', 'warehouse', 'Gudang Tepi Sungai', -0.247, 117.018, 'Ongkos angkut tinggi', 'Data awal lokal'),
  ('u-1', '73.10.04.2009', 'warehouse', 'Ruang Simpan Dingin', -4.516, 120.37, 'Kapasitas terbatas', 'Data awal lokal'),
  ('p-1', '91.03.02.2003', 'warehouse', 'Gudang Tepung Sagu', -2.629, 140.671, 'Perlu kontrol kelembapan', 'Data awal lokal')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  note = EXCLUDED.note,
  confidence = EXCLUDED.confidence;

INSERT INTO open_data_sources (id, name, category, url, license, coverage, refresh_strategy, status, notes)
VALUES
  (
    'cahyadsn-wilayah',
    'Kode Wilayah Administrasi Indonesia',
    'administrative-code',
    'https://github.com/cahyadsn/wilayah',
    'MIT',
    'Provinsi, kabupaten/kota, kecamatan, desa/kelurahan nasional berdasarkan Kepmendagri 2025.',
    'Import satu kali ke Postgres, lalu refresh manual saat repository sumber berubah.',
    'ready-to-import',
    'Sumber terbuka paling praktis untuk coverage kode desa nasional. Bukan sumber komoditas, koperasi, atau aset ekonomi.'
  ),
  (
    'cahyadsn-wilayah-boundaries',
    'Boundaries Wilayah Administrasi Indonesia',
    'boundary',
    'https://github.com/cahyadsn/wilayah_boundaries',
    'MIT',
    'Polygon provinsi, kabupaten/kota, kecamatan, dan sebagian besar desa/kelurahan; README sumber mencatat sebagian boundary desa/kelurahan belum lengkap.',
    'Import layer peta terpisah setelah memilih resolusi dan strategi simplification.',
    'pipeline-planned',
    'Untuk peta klikable nasional, gunakan sebagai layer geospasial; jangan klaim semua boundary desa lengkap tanpa import dan validasi.'
  ),
  (
    'bps-webapi',
    'BPS Web API',
    'statistics',
    'https://webapi.bps.go.id/documentation/',
    'Official API, subject to BPS key and terms',
    'Statistik resmi nasional sampai level yang tersedia pada tabel/variabel BPS.',
    'Env-gated connector memakai BPS_API_KEY, cache Postgres, dan mapping variabel per komoditas.',
    'env-required',
    'Cocok untuk baseline statistik wilayah, bukan pengganti input operasional harian koperasi.'
  ),
  (
    'national-commodity-baseline',
    'Baseline komoditas provinsi nasional',
    'commodity-baseline',
    'local://lumbung-bersama/national-commodity-baseline-v1',
    'Internal source-labeled baseline; replace with official datasets when connected',
    'Referensi provinsi saja. Tidak boleh diwariskan atau diklaim sebagai produksi kabupaten/kecamatan/desa.',
    'Diulang berkala setelah connector BPS, Satu Data Indonesia, dan portal daerah tersedia.',
    'reference-only',
    'Dipakai hanya untuk konteks provinsi. Area turunannya harus memakai sumber langsung resmi, operator, atau connector daerah.'
  ),
  (
    'data-go-id',
    'Portal Satu Data Indonesia',
    'catalog',
    'https://data.go.id/',
    'Government open data catalog, dataset-specific license',
    'Katalog dataset lintas K/L, provinsi, dan kabupaten/kota.',
    'Dataset discovery manual/API bila endpoint publik stabil, lalu cache metadata sumber.',
    'source-discovery',
    'Gunakan sebagai tempat mencari dataset koperasi, UMKM, pertanian, pangan, dan daerah; lisensi/perbaruan berbeda per dataset.'
  ),
  (
    'regional-open-data-portals',
    'Portal open data provinsi/kabupaten',
    'regional-catalog',
    'https://opendata.jabarprov.go.id/',
    'Dataset-specific license',
    'Portal daerah yang menyediakan resource API/CSV untuk komoditas dan indikator wilayah.',
    'Connector per provinsi/kabupaten, dimulai dari portal yang punya API stabil dan resource CSV.',
    'source-discovery',
    'Jalur data langsung wilayah saat BPS/API nasional belum menyediakan granularitas desa.'
  ),
  (
    'open-data-jabar-imk-komoditas-pertanian',
    'Open Data Jabar - IMK Komoditas Pertanian Desa/Kelurahan',
    'regional-commodity',
    'https://opendata.jabarprov.go.id/en/dataset/jumlah-industri-mikro-dan-kecil-komoditas-pertanian-berdasarkan-desakelurahan-di-jawa-barat',
    'Dataset-specific public portal license',
    'Contoh sumber granular desa/kelurahan untuk jumlah industri mikro dan kecil komoditas pertanian di Jawa Barat.',
    'Import dari resource CSV/API portal daerah bila endpoint JabarCloud mengizinkan akses; fallback manual upload operator jika 403.',
    'manual-import-or-connector',
    'Sumber ini menjadi pola connector provinsi: data daerah disimpan sebagai direct regional source, bukan warisan provinsi.'
  ),
  (
    'gdelt-doc-api',
    'GDELT Doc API',
    'commodity-news',
    'https://www.gdeltproject.org/',
    'Open news metadata API, source-specific article copyrights apply',
    'Sinyal berita web global/Indonesia untuk komoditas dan wilayah. Bukan statistik pasokan resmi.',
    'On-demand search dengan cache UI/API; batasi frekuensi karena endpoint rate-limited.',
    'ready-on-demand',
    'Dipakai untuk konteks berita komoditas daerah di panel peta. Semua artikel ditampilkan dengan link sumber.'
  ),
  (
    'osm-overpass',
    'OpenStreetMap Overpass',
    'physical-asset',
    'https://www.openstreetmap.org/copyright',
    'ODbL',
    'Aset fisik yang telah dipetakan komunitas: jalan, pasar, toko, gudang, fasilitas publik, dan POI lain.',
    'Env-gated atau scheduled pull per bounding box agar tidak membebani Overpass.',
    'rate-limited',
    'Bagus untuk sinyal awal aset, tetapi perlu confidence dan verifikasi operator karena coverage tidak merata.'
  ),
  (
    'simkopdes',
    'SIMKOPDES',
    'official-integration',
    'https://simkopdes.go.id/',
    'Official system, API access not public',
    'Aplikasi resmi koperasi desa jika akses API/credential diberikan penyelenggara atau Kemenkop.',
    'Env-gated integration only. Jangan scraping area login atau mengklaim API publik sebelum ada dokumen resmi.',
    'no-public-api-found',
    'Saat ini diperlakukan sebagai target integrasi resmi, bukan sumber open data.'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  coverage = EXCLUDED.coverage,
  refresh_strategy = EXCLUDED.refresh_strategy,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

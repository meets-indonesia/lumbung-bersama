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
  ('LB-1024', 'kop-wanasari', 'Anggota kopi terverifikasi', 'Voice note', 'Kopi kering sekitar 120 kg, minta cek harga koperasi.', 'Perlu Foto Barang', 'Suara Warga'),
  ('LB-1025', 'kop-wanasari', 'Anggota tani padi', 'Text WhatsApp', 'Panen padi minggu depan sekitar 5 kuintal di Blok C.', 'Perlu Timbang', 'Lumbung Data'),
  ('LB-1026', 'kop-wanasari', 'Kelompok tani demo', 'Assisted by operator', 'Singkong satu bak pickup, perlu jadwal ambil.', 'Menunggu Dicek', 'Stok dan Logistik'),
  ('LB-1027', 'kop-wanasari', 'Anggota pembiayaan pupuk', 'WhatsApp text', 'Ajukan pembiayaan pupuk Rp1.000.000 untuk musim tanam.', 'Perlu Komite', 'Simpan Pinjam Aman'),
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
  ('buyer-roastery', 'kop-wanasari', 'Archetype: roastery atau pengolah kopi', 'Kopi kering grade A', 82, 'Sinyal kebutuhan archetype cocok dengan stok kopi kering setelah verifikasi grade.', 'Perlu approval pengurus'),
  ('buyer-olahan', 'kop-wanasari', 'Archetype: UMKM pengolah pangan', 'Singkong segar', 76, 'Cocok untuk peluang olahan singkong lokal, perlu cek jadwal pickup.', 'Perlu cek kapasitas'),
  ('buyer-warung', 'kop-wanasari', 'Archetype: retail lokal atau warung', 'Beras medium', 69, 'Permintaan rutin kecil, cocok untuk suplai bertahap setelah verifikasi operator.', 'Perlu review operator')
ON CONFLICT (id) DO UPDATE SET
  buyer = EXCLUDED.buyer,
  need = EXCLUDED.need,
  match_score = EXCLUDED.match_score,
  reason = EXCLUDED.reason,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO anak_sarengklek_buyer_requirements (
  id,
  cooperative_id,
  buyer_archetype,
  product_name,
  required_quantity,
  unit_label,
  quality_spec,
  packaging_spec,
  target_window,
  verification_status,
  source_label,
  notes
)
VALUES
  (
    'asbr-kopi-grade-a',
    'kop-wanasari',
    'Archetype: roastery atau pengolah kopi',
    'Kopi kering grade A',
    120,
    'kg',
    'Kadar air dan grade harus diverifikasi pengurus sebelum outreach.',
    'Karung bersih berlabel batch koperasi',
    '7-14 hari setelah verifikasi grade',
    'Perlu foto barang dan cek kadar air',
    'anak_sarengklek_buyer_requirements; app DB; archetype only',
    'Requirement dibuat dari stok koperasi dan sinyal kebutuhan archetype, bukan komitmen buyer bernama.'
  ),
  (
    'asbr-singkong-segar',
    'kop-wanasari',
    'Archetype: UMKM pengolah pangan',
    'Singkong segar',
    1,
    'bak pickup',
    'Sortasi ukuran dan kondisi panen perlu dicek saat pickup.',
    'Pickup curah dengan jadwal gudang',
    'Jumat pagi atau jadwal operator',
    'Perlu cek kapasitas kendaraan',
    'anak_sarengklek_buyer_requirements; app DB; archetype only',
    'Requirement dipakai untuk readiness matching lite dan bukan PO/pembelian.'
  ),
  (
    'asbr-beras-medium',
    'kop-wanasari',
    'Archetype: retail lokal atau warung',
    'Beras medium',
    28,
    'karung',
    'Kualitas medium dan timbangan perlu diverifikasi.',
    'Karung eceran bertahap',
    'Mingguan setelah stok aman',
    'Perlu review operator',
    'anak_sarengklek_buyer_requirements; app DB; archetype only',
    'Requirement menunjukkan target kesiapan suplai, bukan jaminan demand.'
  )
ON CONFLICT (id) DO UPDATE SET
  buyer_archetype = EXCLUDED.buyer_archetype,
  product_name = EXCLUDED.product_name,
  required_quantity = EXCLUDED.required_quantity,
  unit_label = EXCLUDED.unit_label,
  quality_spec = EXCLUDED.quality_spec,
  packaging_spec = EXCLUDED.packaging_spec,
  target_window = EXCLUDED.target_window,
  verification_status = EXCLUDED.verification_status,
  source_label = EXCLUDED.source_label,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO anak_sarengklek_stock_ledger (
  id,
  cooperative_id,
  stock_item_id,
  movement_type,
  quantity,
  unit_label,
  reason,
  evidence_ref,
  readiness_status,
  recorded_by
)
VALUES
  ('assl-kopi-opening', 'kop-wanasari', 'stock-kopi-kering', 'opening-balance', 120, 'kg', 'Stok awal dari intake warga untuk cek harga koperasi.', 'LB-1024', 'Menunggu grade', 'operator-seed'),
  ('assl-singkong-pickup-plan', 'kop-wanasari', 'stock-singkong', 'planned-inbound', 1, 'bak pickup', 'Rencana pickup untuk pasokan singkong.', 'LB-1026', 'Jadwal pickup', 'operator-seed'),
  ('assl-minyak-restock-gap', 'kop-wanasari', 'stock-minyak-goreng', 'restock-gap', 12, 'dus', 'Stok gerai di bawah batas aman.', 'LB-1028', 'Perlu restock', 'operator-seed'),
  ('assl-beras-available', 'kop-wanasari', 'stock-beras-medium', 'available', 28, 'karung', 'Stok beras medium tersedia untuk suplai bertahap.', 'stock-beras-medium', 'Stok aman', 'operator-seed')
ON CONFLICT (id) DO UPDATE SET
  movement_type = EXCLUDED.movement_type,
  quantity = EXCLUDED.quantity,
  unit_label = EXCLUDED.unit_label,
  reason = EXCLUDED.reason,
  evidence_ref = EXCLUDED.evidence_ref,
  readiness_status = EXCLUDED.readiness_status,
  recorded_by = EXCLUDED.recorded_by;

INSERT INTO anak_sarengklek_media_evidence (
  id,
  cooperative_id,
  related_record_type,
  related_record_id,
  media_type,
  storage_uri,
  redacted_label,
  caption,
  verification_status,
  source_label,
  metadata
)
VALUES
  (
    'asme-lb-1024-photo-needed',
    'kop-wanasari',
    'operator_queue',
    'LB-1024',
    'photo-request',
    'evidence://anak_sarengklek/lb-1024/photo-request',
    'Foto barang diminta, belum menyimpan identitas personal',
    'Permintaan bukti visual kopi kering sebelum grade dan outreach.',
    'Menunggu foto barang',
    'anak_sarengklek_media_evidence; metadata only; no raw media in seed',
    '{"pii":"redacted","rawMediaStored":false}'::jsonb
  ),
  (
    'asme-stock-kopi-grade-check',
    'kop-wanasari',
    'stock_items',
    'stock-kopi-kering',
    'inspection-note',
    'evidence://anak_sarengklek/stock-kopi-kering/grade-check',
    'Catatan inspeksi batch kopi',
    'Checklist kadar air dan sortasi sebelum buyer matching lite.',
    'Perlu verifikasi operator',
    'anak_sarengklek_media_evidence; metadata only; no raw media in seed',
    '{"pii":"none","rawMediaStored":false}'::jsonb
  ),
  (
    'asme-buyer-requirement-kopi',
    'kop-wanasari',
    'buyer_requirement',
    'asbr-kopi-grade-a',
    'requirement-note',
    'evidence://anak_sarengklek/buyer-requirements/asbr-kopi-grade-a',
    'Requirement archetype kopi',
    'Syarat grade dan packaging untuk readiness, bukan komitmen buyer bernama.',
    'Siap review pengurus',
    'anak_sarengklek_media_evidence; metadata only; no raw media in seed',
    '{"buyerMode":"archetype","rawMediaStored":false}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  related_record_type = EXCLUDED.related_record_type,
  related_record_id = EXCLUDED.related_record_id,
  media_type = EXCLUDED.media_type,
  storage_uri = EXCLUDED.storage_uri,
  redacted_label = EXCLUDED.redacted_label,
  caption = EXCLUDED.caption,
  verification_status = EXCLUDED.verification_status,
  source_label = EXCLUDED.source_label,
  metadata = EXCLUDED.metadata;

INSERT INTO finance_requests (id, cooperative_id, member, purpose, amount, risk, status)
VALUES
  ('SP-204', 'kop-wanasari', 'Anggota pembiayaan pupuk', 'Pupuk dan bibit', 1000000, 'Perlu cek histori simpanan', 'Menunggu komite'),
  ('SP-205', 'kop-wanasari', 'Anggota alat pengering kopi', 'Perbaikan alat pengering kopi', 2500000, 'Butuh rencana bayar dari hasil panen', 'Draft analisis')
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
  ('w-3', '32.04.12.2008', 'umkm', 'UMKM Olahan Pangan Lokal', -7.038, 107.601, 'Bisa pilot keripik', 'Data awal lokal'),
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
    'big-keldesa-10k',
    'BIG Batas Desa/Kelurahan 10K',
    'official-spatial-boundary',
    'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_KelDesa_10K/MapServer',
    'Official BIG geospatial service, usage subject to BIG terms',
    'Polygon desa/kelurahan untuk boundary, map drilldown, and spatial join candidates.',
    'ArcGIS REST pull into a geometry cache after deciding simplification, tiling, and reconciliation rules.',
    'connector-planned',
    'Official boundary layer for reliability. Still needs import verification and code reconciliation before production claims.'
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
    'bps-master-file-desa',
    'BPS Master File Desa',
    'official-village-code',
    'https://www.bps.go.id/',
    'Official BPS publication, province/publication-specific terms',
    'Kode/nama desa, klasifikasi wilayah, and statistical map references from BPS publications.',
    'Province-by-province publication ingestion for code reconciliation where a national API is not available.',
    'manual-import-or-connector',
    'Use for wilayah normalization and reconciliation; not a commodity or cooperative operational source.'
  ),
  (
    'kemendesa-idm',
    'SID Kemendesa - IDM',
    'official-village-index',
    'https://sid.kemendesa.go.id/idm',
    'Official Kemendesa portal, access subject to portal terms',
    'Indeks Desa Membangun score/status by wilayah/desa where accessible.',
    'Start as source registry and manual evidence; automate only if public download/API access is verified.',
    'source-discovery',
    'Good for desa readiness and baseline prioritization. Do not scrape restricted BNBA/detail pages.'
  ),
  (
    'kemendesa-sdgs',
    'SID Kemendesa - SDGs Desa',
    'official-village-index',
    'https://sid.kemendesa.go.id/sdgs',
    'Official Kemendesa portal, access subject to portal terms',
    'SDGs Desa scores, goals, and program-recommendation context where accessible.',
    'Keep as source-labeled context until a permitted dataset/API path is verified.',
    'source-discovery',
    'Supports social, economic, and environmental profile context; some detail access can be restricted.'
  ),
  (
    'satudata-kemendesa-idm-2024',
    'Satu Data Kemendesa - IDM 2024',
    'official-village-index',
    'https://satudata.kemendesa.go.id/dataset/data-indeks-desa-membangun-tahun-2024/resource/2076c47d-5bf0-491e-a673-6e4dd5a63431',
    'Dataset-specific government open-data terms',
    'IDM 2024 XLSX/PDF source for audit and reconciliation.',
    'Download/import after confirming current resource format, data year, and kode_wilayah mapping.',
    'manual-import-or-connector',
    'Useful official ingest file, with caveat that dataset server year and data year can differ.'
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
    'bapanas-panel-harga',
    'Bapanas Panel Harga Pangan',
    'official-market-price',
    'https://dev-panelharga.badanpangan.go.id/',
    'Official Bapanas portal, usage subject to portal terms',
    'Producer, wholesale, and retail food price benchmarks by commodity and area where available.',
    'Connector planned after confirming stable download/API access and market-level interpretation rules.',
    'source-discovery',
    'Use as price benchmark and anomaly signal, not as transaction volume or buyer commitment.'
  ),
  (
    'bapanas-open-data',
    'Open Data Bapanas',
    'official-market-availability',
    'https://data.go.id/instantion/badan-pangan-nasional',
    'Dataset-specific data.go.id terms',
    'Food availability, stock, reserve, and deficit-risk datasets where published.',
    'Discover datasets through Satu Data Indonesia, then cache selected metadata and downloads.',
    'source-discovery',
    'Strengthens stock/availability proxy, but dataset availability and freshness must be checked per resource.'
  ),
  (
    'pihps-bi',
    'PIHPS Nasional',
    'official-market-price',
    'https://www.bi.go.id/hargapangan',
    'Official Bank Indonesia/PIHPS portal terms',
    'Strategic food prices by market type and region where available.',
    'Connector planned after confirming public access path and mapping market types to MVP price signals.',
    'source-discovery',
    'Use for retail/wholesale spread and price anomaly checks; market-type differences require clear labels.'
  ),
  (
    'kemendag-satu-data',
    'Satu Data Perdagangan',
    'official-trade-signal',
    'https://satudata.kemendag.go.id/',
    'Official Kemendag portal, dataset-specific terms',
    'Trade, export/import, inflation, PDB, and dashboard datasets where available.',
    'Source discovery first, then dataset-specific import after format and license checks.',
    'source-discovery',
    'Use as demand-pull and trade-flow proxy. Aggregate trade data is not a named offtaker commitment.'
  ),
  (
    'kemendag-sisp',
    'SISP Kemendag',
    'official-market-node',
    'https://sisp.kemendag.go.id/',
    'Official Kemendag portal, access subject to portal terms',
    'Market facilities and price/distribution context where public.',
    'Keep as source registry until public endpoints or permitted downloads are confirmed.',
    'source-discovery',
    'Useful for market access/logistics proxy, not proof of offtaker demand.'
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
    'bpk-uu-koperasi-1992',
    'UU No. 25 Tahun 1992 tentang Perkoperasian',
    'official-regulation',
    'https://peraturan.bpk.go.id/Details/46650/uu-no-25-tahun-1992',
    'Official regulation reference',
    'Legal framing for cooperative governance.',
    'Manual legal-reference review; no operational data import.',
    'reference-only',
    'Use for governance language and cooperative approval framing; not a data connector.'
  ),
  (
    'bpk-pp-7-2021',
    'PP No. 7 Tahun 2021',
    'official-regulation',
    'https://peraturan.bpk.go.id/Details/161837/pp-no-7-tahun-2021',
    'Official regulation reference',
    'Policy context for protection and empowerment of cooperatives and UMKM.',
    'Manual legal-reference review; no operational data import.',
    'reference-only',
    'Use for empowerment context in pitch and reporting; not proof of program participation.'
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

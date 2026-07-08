export type OpenDataSource = {
  id: string;
  name: string;
  category: string;
  url: string;
  license: string;
  coverage: string;
  refreshStrategy: string;
  status: string;
  notes: string;
};

export const openDataSources: OpenDataSource[] = [
  {
    id: "cahyadsn-wilayah",
    name: "Kode Wilayah Administrasi Indonesia",
    category: "administrative-code",
    url: "https://github.com/cahyadsn/wilayah",
    license: "MIT",
    coverage:
      "Provinsi, kabupaten/kota, kecamatan, desa/kelurahan nasional berdasarkan Kepmendagri 2025.",
    refreshStrategy:
      "Import satu kali ke Postgres, lalu refresh manual saat repository sumber berubah.",
    status: "ready-to-import",
    notes:
      "Sumber terbuka paling praktis untuk coverage kode desa nasional. Bukan sumber komoditas, koperasi, atau aset ekonomi.",
  },
  {
    id: "cahyadsn-wilayah-boundaries",
    name: "Boundaries Wilayah Administrasi Indonesia",
    category: "boundary",
    url: "https://github.com/cahyadsn/wilayah_boundaries",
    license: "MIT",
    coverage:
      "Polygon provinsi, kabupaten/kota, kecamatan, dan sebagian besar desa/kelurahan; sebagian boundary desa/kelurahan belum lengkap menurut README sumber.",
    refreshStrategy:
      "Import layer peta terpisah setelah memilih resolusi, storage, dan simplification.",
    status: "pipeline-planned",
    notes:
      "Dipakai untuk peta klikable nasional, dengan label coverage boundary yang jujur.",
  },
  {
    id: "bps-webapi",
    name: "BPS Web API",
    category: "statistics",
    url: "https://webapi.bps.go.id/documentation/",
    license: "Official API, subject to BPS key and terms",
    coverage: "Statistik resmi nasional sampai level yang tersedia pada tabel/variabel BPS.",
    refreshStrategy:
      "Env-gated connector memakai BPS_API_KEY, cache Postgres, dan mapping variabel per komoditas.",
    status: "env-required",
    notes:
      "Cocok untuk baseline statistik wilayah, bukan pengganti input operasional harian koperasi.",
  },
  {
    id: "national-commodity-baseline",
    name: "Baseline komoditas provinsi nasional",
    category: "commodity-baseline",
    url: "local://lumbung-bersama/national-commodity-baseline-v1",
    license: "Internal source-labeled baseline; replace with official datasets when connected",
    coverage:
      "Referensi provinsi saja. Tidak boleh diwariskan atau diklaim sebagai produksi kabupaten/kecamatan/desa.",
    refreshStrategy:
      "Diulang berkala setelah connector BPS, Satu Data Indonesia, dan portal daerah tersedia.",
    status: "reference-only",
    notes:
      "Dipakai hanya untuk konteks provinsi. Area turunannya harus memakai sumber langsung resmi, operator, atau connector daerah.",
  },
  {
    id: "open-data-jabar-imk-komoditas-pertanian",
    name: "Open Data Jabar - IMK Komoditas Pertanian Desa/Kelurahan",
    category: "regional-commodity",
    url:
      "https://opendata.jabarprov.go.id/en/dataset/jumlah-industri-mikro-dan-kecil-komoditas-pertanian-berdasarkan-desakelurahan-di-jawa-barat",
    license: "Dataset-specific public portal license",
    coverage:
      "Contoh sumber granular desa/kelurahan untuk jumlah industri mikro dan kecil komoditas pertanian di Jawa Barat.",
    refreshStrategy:
      "Import dari resource CSV/API portal daerah bila endpoint JabarCloud mengizinkan akses; fallback manual upload operator jika 403.",
    status: "manual-import-or-connector",
    notes:
      "Sumber ini menjadi pola connector provinsi: data daerah disimpan sebagai direct regional source, bukan warisan provinsi.",
  },
  {
    id: "gdelt-doc-api",
    name: "GDELT Doc API",
    category: "commodity-news",
    url: "https://www.gdeltproject.org/",
    license: "Open news metadata API, source-specific article copyrights apply",
    coverage:
      "Sinyal berita web global/Indonesia untuk komoditas dan wilayah. Bukan statistik pasokan resmi.",
    refreshStrategy:
      "On-demand search dengan cache UI/API; batasi frekuensi karena endpoint rate-limited.",
    status: "ready-on-demand",
    notes:
      "Dipakai untuk konteks berita komoditas daerah di panel peta. Semua artikel ditampilkan dengan link sumber.",
  },
  {
    id: "data-go-id",
    name: "Portal Satu Data Indonesia",
    category: "catalog",
    url: "https://data.go.id/",
    license: "Government open data catalog, dataset-specific license",
    coverage: "Katalog dataset lintas K/L, provinsi, dan kabupaten/kota.",
    refreshStrategy:
      "Dataset discovery manual/API bila endpoint publik stabil, lalu cache metadata sumber.",
    status: "source-discovery",
    notes:
      "Gunakan untuk mencari dataset koperasi, UMKM, pertanian, pangan, dan daerah; lisensi/perbaruan berbeda per dataset.",
  },
  {
    id: "regional-open-data-portals",
    name: "Portal open data provinsi/kabupaten",
    category: "regional-catalog",
    url: "https://opendata.jabarprov.go.id/",
    license: "Dataset-specific license",
    coverage:
      "Portal daerah yang menyediakan resource API/CSV untuk komoditas dan indikator wilayah.",
    refreshStrategy:
      "Connector per provinsi/kabupaten, dimulai dari portal yang punya API stabil dan resource CSV.",
    status: "source-discovery",
    notes:
      "Jalur data langsung wilayah saat BPS/API nasional belum menyediakan granularitas desa.",
  },
  {
    id: "osm-overpass",
    name: "OpenStreetMap Overpass",
    category: "physical-asset",
    url: "https://www.openstreetmap.org/copyright",
    license: "ODbL",
    coverage:
      "Aset fisik yang telah dipetakan komunitas: jalan, pasar, toko, gudang, fasilitas publik, dan POI lain.",
    refreshStrategy:
      "Scheduled pull per bounding box agar tidak membebani Overpass; semua hasil perlu confidence dan verifikasi operator.",
    status: "rate-limited",
    notes:
      "Bagus untuk sinyal awal aset, tetapi coverage tidak merata dan wajib atribusi OSM.",
  },
  {
    id: "simkopdes",
    name: "SIMKOPDES",
    category: "official-integration",
    url: "https://simkopdes.go.id/",
    license: "Official system, API access not public",
    coverage:
      "Aplikasi resmi koperasi desa jika akses API/credential diberikan penyelenggara atau Kemenkop.",
    refreshStrategy:
      "Env-gated integration only. Jangan scraping area login atau mengklaim API publik sebelum ada dokumen resmi.",
    status: "no-public-api-found",
    notes:
      "Diperlakukan sebagai target integrasi resmi, bukan sumber open data.",
  },
];

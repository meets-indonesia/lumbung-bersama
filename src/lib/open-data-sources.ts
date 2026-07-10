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

export const openDataSourceLabels = [
  "Sumber eksplorasi",
  "Official spatial boundary",
  "Official village index",
  "Official statistics",
  "Official market price",
  "Official trade signal",
  "Official regulation",
  "Regional open data",
  "Operator verified",
  "Demo baseline",
] as const;

export const openDataP0Roadmap = [
  {
    id: "boundary-code-reconciliation",
    title: "Boundary and code reconciliation",
    sources: ["big-keldesa-10k", "bps-master-file-desa", "referensi_wilayah"],
    output:
      "Normalized kode_wilayah, village/regency/province labels, map-ready geometry cache, source label, and confidence.",
    caveat:
      "Do not claim full national village geometry until official imports and code reconciliation are verified.",
  },
  {
    id: "village-readiness-enrichment",
    title: "Village readiness enrichment",
    sources: ["kemendesa-idm", "kemendesa-sdgs", "satudata-kemendesa-idm-2024"],
    output:
      "Village readiness status, social/economic/ecology indicators, recommendation context, and portal-only caveats.",
    caveat: "Portal-only or restricted data must stay labeled as discovery until an allowed download/API is verified.",
  },
  {
    id: "commodity-market-signal",
    title: "Commodity market signal",
    sources: ["bapanas-panel-harga", "pihps-bi", "bps-webapi"],
    output: "Price trend, market spread, anomaly flag, and supply/demand proxy.",
    caveat: "Market signals are not named buyer commitments.",
  },
  {
    id: "governance-guardrail",
    title: "Governance guardrail",
    sources: ["bpk-uu-koperasi-1992", "bpk-pp-7-2021", "kemenkop-jdih-regulations", "simkopdes"],
    output:
      "Pitch-safe governance language, role approval rules, no-auto-financing guardrail, and no-live-SIMKOPDES claim.",
    caveat: "Regulation context supports workflow design; it does not prove production SIMKOPDES integration.",
  },
] as const;

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
      "Import satu kali ke data operasional aplikasi, lalu refresh manual saat repository sumber berubah.",
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
    status: "connector-planned",
    notes:
      "Dipakai untuk peta klikable nasional, dengan label coverage boundary yang jujur.",
  },
  {
    id: "big-keldesa-10k",
    name: "BIG Batas Desa/Kelurahan 10K",
    category: "official-spatial-boundary",
    url: "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_KelDesa_10K/MapServer",
    license: "Official BIG geospatial service, usage subject to BIG terms",
    coverage:
      "Polygon desa/kelurahan untuk boundary, map drilldown, and spatial join candidates.",
    refreshStrategy:
      "ArcGIS REST pull into a geometry cache after deciding simplification, tiling, and reconciliation rules.",
    status: "connector-planned",
    notes:
      "Official boundary layer for reliability. Still needs import verification and code reconciliation before production claims.",
  },
  {
    id: "bps-webapi",
    name: "BPS Web API",
    category: "statistics",
    url: "https://webapi.bps.go.id/documentation/",
    license: "Official API, subject to BPS key and terms",
    coverage: "Statistik resmi nasional sampai level yang tersedia pada tabel/variabel BPS.",
    refreshStrategy:
      "Connector aktif setelah API key resmi, cache aplikasi, dan mapping variabel per komoditas siap.",
    status: "env-required",
    notes:
      "Cocok untuk baseline statistik wilayah, bukan pengganti input operasional harian koperasi.",
  },
  {
    id: "bps-master-file-desa",
    name: "BPS Master File Desa",
    category: "official-village-code",
    url: "https://www.bps.go.id/",
    license: "Official BPS publication, province/publication-specific terms",
    coverage:
      "Kode/nama desa, klasifikasi wilayah, and statistical map references from BPS publications.",
    refreshStrategy:
      "Province-by-province publication ingestion for code reconciliation where a national API is not available.",
    status: "manual-import-or-connector",
    notes:
      "Use for wilayah normalization and reconciliation; not a commodity or cooperative operational source.",
  },
  {
    id: "kemendesa-idm",
    name: "SID Kemendesa - IDM",
    category: "official-village-index",
    url: "https://sid.kemendesa.go.id/idm",
    license: "Official Kemendesa portal, access subject to portal terms",
    coverage: "Indeks Desa Membangun score/status by wilayah/desa where accessible.",
    refreshStrategy:
      "Start as source registry and manual evidence; automate only if public download/API access is verified.",
    status: "source-discovery",
    notes:
      "Good for desa readiness and baseline prioritization. Do not scrape restricted BNBA/detail pages.",
  },
  {
    id: "kemendesa-sdgs",
    name: "SID Kemendesa - SDGs Desa",
    category: "official-village-index",
    url: "https://sid.kemendesa.go.id/sdgs",
    license: "Official Kemendesa portal, access subject to portal terms",
    coverage: "SDGs Desa scores, goals, and program-recommendation context where accessible.",
    refreshStrategy:
      "Keep as source-labeled context until a permitted dataset/API path is verified.",
    status: "source-discovery",
    notes:
      "Supports social, economic, and environmental profile context; some detail access can be restricted.",
  },
  {
    id: "satudata-kemendesa-idm-2024",
    name: "Satu Data Kemendesa - IDM 2024",
    category: "official-village-index",
    url: "https://satudata.kemendesa.go.id/dataset/data-indeks-desa-membangun-tahun-2024/resource/2076c47d-5bf0-491e-a673-6e4dd5a63431",
    license: "Dataset-specific government open-data terms",
    coverage: "IDM 2024 XLSX/PDF source for audit and reconciliation.",
    refreshStrategy:
      "Download/import after confirming current resource format, data year, and kode_wilayah mapping.",
    status: "manual-import-or-connector",
    notes:
      "Useful official ingest file, with caveat that dataset server year and data year can differ.",
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
    id: "bapanas-panel-harga",
    name: "Bapanas Panel Harga Pangan",
    category: "official-market-price",
    url: "https://dev-panelharga.badanpangan.go.id/",
    license: "Official Bapanas portal, usage subject to portal terms",
    coverage: "Producer, wholesale, and retail food price benchmarks by commodity and area where available.",
    refreshStrategy:
      "Connector planned after confirming stable download/API access and market-level interpretation rules.",
    status: "source-discovery",
    notes:
      "Use as price benchmark and anomaly signal, not as transaction volume or buyer commitment.",
  },
  {
    id: "bapanas-open-data",
    name: "Open Data Bapanas",
    category: "official-market-availability",
    url: "https://data.go.id/instantion/badan-pangan-nasional",
    license: "Dataset-specific data.go.id terms",
    coverage: "Food availability, stock, reserve, and deficit-risk datasets where published.",
    refreshStrategy:
      "Discover datasets through Satu Data Indonesia, then cache selected metadata and downloads.",
    status: "source-discovery",
    notes:
      "Strengthens stock/availability proxy, but dataset availability and freshness must be checked per resource.",
  },
  {
    id: "pihps-bi",
    name: "PIHPS Nasional",
    category: "official-market-price",
    url: "https://www.bi.go.id/hargapangan",
    license: "Official Bank Indonesia/PIHPS portal terms",
    coverage: "Strategic food prices by market type and region where available.",
    refreshStrategy:
      "Connector planned after confirming public access path and mapping market types to MVP price signals.",
    status: "source-discovery",
    notes:
      "Use for retail/wholesale spread and price anomaly checks; market-type differences require clear labels.",
  },
  {
    id: "kemendag-satu-data",
    name: "Satu Data Perdagangan",
    category: "official-trade-signal",
    url: "https://satudata.kemendag.go.id/",
    license: "Official Kemendag portal, dataset-specific terms",
    coverage: "Trade, export/import, inflation, PDB, and dashboard datasets where available.",
    refreshStrategy:
      "Source discovery first, then dataset-specific import after format and license checks.",
    status: "source-discovery",
    notes:
      "Use as demand-pull and trade-flow proxy. Aggregate trade data is not a named offtaker commitment.",
  },
  {
    id: "kemendag-sisp",
    name: "SISP Kemendag",
    category: "official-market-node",
    url: "https://sisp.kemendag.go.id/",
    license: "Official Kemendag portal, access subject to portal terms",
    coverage: "Market facilities and price/distribution context where public.",
    refreshStrategy:
      "Keep as source registry until public endpoints or permitted downloads are confirmed.",
    status: "source-discovery",
    notes:
      "Useful for market access/logistics proxy, not proof of offtaker demand.",
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
    id: "bpk-uu-koperasi-1992",
    name: "UU No. 25 Tahun 1992 tentang Perkoperasian",
    category: "official-regulation",
    url: "https://peraturan.bpk.go.id/Details/46650/uu-no-25-tahun-1992",
    license: "Official regulation reference",
    coverage: "Legal framing for cooperative governance.",
    refreshStrategy: "Manual legal-reference review; no operational data import.",
    status: "reference-only",
    notes:
      "Use for governance language and cooperative approval framing; not a data connector.",
  },
  {
    id: "bpk-pp-7-2021",
    name: "PP No. 7 Tahun 2021",
    category: "official-regulation",
    url: "https://peraturan.bpk.go.id/Details/161837/pp-no-7-tahun-2021",
    license: "Official regulation reference",
    coverage: "Policy context for protection and empowerment of cooperatives and UMKM.",
    refreshStrategy: "Manual legal-reference review; no operational data import.",
    status: "reference-only",
    notes:
      "Use for empowerment context in pitch and reporting; not proof of program participation.",
  },
  {
    id: "kemenkop-jdih-regulations",
    name: "Permenkop/JDIH Kemenkop governance regulations",
    category: "official-regulation",
    url: "https://peraturan.bpk.go.id/",
    license: "Official regulation reference",
    coverage:
      "Cooperative accounting, savings/loan governance, and related Kemenkop policy references used as guardrails.",
    refreshStrategy:
      "Manual legal-reference review before adding new automated policy checks.",
    status: "reference-only",
    notes:
      "Registry grouping for governance guardrails. It is not an operational Kemenkop or SIMKOPDES connector.",
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
      "Integrasi hanya aktif setelah akses resmi tersedia. Jangan scraping area login atau mengklaim API publik sebelum ada dokumen resmi.",
    status: "no-public-api-found",
    notes:
      "Diperlakukan sebagai target integrasi resmi, bukan sumber open data.",
  },
];

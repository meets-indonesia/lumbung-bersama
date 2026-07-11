export const brand = {
  name: "Lumbung Bersama",
  descriptor: "Asisten operasional untuk Koperasi Desa/Kelurahan Merah Putih.",
  tagline: "Dari laporan warga menjadi kekuatan ekonomi desa.",
  domain: "lumbungbersama.id",
};

export const pilotCooperative = {
  name: "Koperasi Desa Maju Bersama",
  village: "Desa Wanasari",
  district: "Kecamatan Sukamaju",
  label: "Data operasional awal",
};

export const pilotVoiceNote =
  "Saya punya kopi kering sekitar 120 kilo, baru selesai dijemur kemarin. Kalau bisa dibantu cek harga koperasi.";

export const extractedSubmission = {
  recordId: "LB-1024",
  source: "WhatsApp voice note",
  commodity: "Kopi kering",
  quantity: "120 kg",
  condition: "Baru selesai dijemur",
  missing: ["Lokasi kebun", "Foto barang", "Grade manual"],
  status: "Menunggu dicek petugas",
  confidence: "Sedang",
};

export const pilotMetrics = [
  { label: "Laporan warga hari ini", value: "18", note: "Operasional awal" },
  { label: "Draft perlu dicek", value: "7", note: "Operasional awal" },
  { label: "Stok gerai kritis", value: "3", note: "Operasional awal" },
  { label: "Siap laporan", value: "5", note: "Operasional awal" },
];

export const demoCooperative = pilotCooperative;
export const demoVoiceNote = pilotVoiceNote;
export const demoMetrics = pilotMetrics;

export const featureModules = [
  {
    slug: "peta-unggulan",
    title: "Peta Unggulan Desa",
    short: "Peta potensi desa, komoditas prioritas, aset koperasi, dan sinyal peluang.",
    waCommand: "apa komoditas unggulan desa minggu ini",
    owner: "Pengurus, desa",
    status: "Core MVP",
  },
  {
    slug: "rekomendasi-komoditas",
    title: "Rekomendasi Komoditas",
    short: "Opportunity score, confidence, evidence, risk, dan next action yang human-reviewed.",
    waCommand: "apa prioritas komoditas koperasi minggu ini",
    owner: "Operator, pengurus",
    status: "Core MVP",
  },
  {
    slug: "pasar-mitra",
    title: "Buyer Matching Lite",
    short: "Buyer directory, match reason, outreach script, approval pengurus.",
    waCommand: "carikan pembeli kopi grade A",
    owner: "Pengurus, tim niaga",
    status: "Core MVP",
  },
  {
    slug: "stok-logistik",
    title: "Stok dan Readiness",
    short: "Gudang, cold storage, pickup schedule, aging risk, dan kesiapan suplai.",
    waCommand: "jadwalkan pickup singkong hari Jumat",
    owner: "Operator gudang",
    status: "Core MVP",
  },
  {
    slug: "lapor-siap",
    title: "Laporan Aksi",
    short: "Ringkasan rekomendasi, evidence, CSV export, dan readiness tindak lanjut.",
    waCommand: "buat ringkasan laporan minggu ini",
    owner: "Pengurus koperasi",
    status: "Core MVP",
  },
  {
    slug: "lumbung-data",
    title: "Lumbung Data",
    short: "Queue verifikasi, transcript, field extraction, dan audit trail operator.",
    waCommand: "cek catatan LB-1024",
    owner: "Operator koperasi",
    status: "Pendukung MVP",
  },
  {
    slug: "suara-warga",
    title: "WA Intake",
    short: "WhatsApp text, voice note, photo, dan assisted input sebagai sumber data.",
    waCommand: "lapor panen kopi 120 kilo",
    owner: "Petani, anggota, operator",
    status: "Pendukung MVP",
  },
  {
    slug: "agen-ai",
    title: "Agen Rekomendasi",
    short: "Tiga agent fokus: unggulan desa, pasar dan mitra, laporan.",
    waCommand: "apa hasil cek AI untuk kopi saya",
    owner: "Operator, pengurus",
    status: "Pendukung MVP",
  },
  {
    slug: "gerai-pintar",
    title: "Gerai Readiness",
    short: "Gerai, aset channel, stok kritis, dan restock sebagai kesiapan suplai.",
    waCommand: "stok minyak di gerai masih ada",
    owner: "Petugas gerai",
    status: "Pendukung MVP",
  },
  {
    slug: "simpan-pinjam",
    title: "Financing Readiness",
    short: "Catatan kebutuhan modal kerja, bukan credit scoring atau approval otomatis.",
    waCommand: "ajukan pinjaman pupuk 1 juta",
    owner: "Bendahara, komite",
    status: "Pendukung MVP",
  },
  {
    slug: "integrasi",
    title: "Integrasi",
    short: "WhatsApp Business, OpenAI, database, storage, SIMKOPDES mapping.",
    waCommand: "status integrasi sistem",
    owner: "Admin teknis",
    status: "Perlu konfigurasi",
  },
];

export const aiAgents = [
  {
    name: "Agen Unggulan Desa",
    job: "Menganalisis komoditas unggulan, aset desa, readiness koperasi, dan peluang usaha yang bisa diaudit.",
    checks: ["Layer peta", "Supply signal", "Demand signal", "Aset pengolah", "Risiko logistik"],
    output: "Komoditas prioritas dan rekomendasi aksi awal",
    status: "Core MVP",
  },
  {
    name: "Agen Pasar dan Mitra",
    job: "Menyusun buyer shortlist dengan alasan match, syarat kualitas, dan status approval manusia.",
    checks: ["Kebutuhan buyer", "Kesiapan stok", "Jarak", "Syarat kualitas", "Approval pengurus"],
    output: "Buyer shortlist dengan alasan match",
    status: "Core MVP",
  },
  {
    name: "Agen Stok dan Gudang",
    job: "Membaca laporan stok, panen, gudang, barang masuk/keluar, dan readiness sebelum buyer outreach.",
    checks: ["Volume", "Satuan", "Lokasi gudang", "Bukti timbang", "Readiness status"],
    output: "Checklist stok dan kesiapan gudang",
    status: "Operasional",
  },
  {
    name: "Agen Harga dan Negosiasi",
    job: "Menyiapkan bahan cek harga, floor price, caveat sumber, dan script negosiasi yang tetap direview operator.",
    checks: ["Sinyal harga", "Freshness sumber", "Margin minimum", "Risiko fluktuasi", "Approval pengurus"],
    output: "Draft harga dan arah negosiasi",
    status: "Operasional",
  },
  {
    name: "Agen Pembiayaan Readiness",
    job: "Mengubah chat pembiayaan menjadi checklist readiness, dokumen kurang, tujuan pinjaman, dan catatan komite.",
    checks: ["Tujuan pinjaman", "Nominal", "Dokumen", "Rencana bayar", "Manual committee review"],
    output: "Checklist pembiayaan siap review",
    status: "Guarded",
  },
  {
    name: "Agen Bukti dan Dokumen",
    job: "Membaca bukti foto/PDF/nota dari WA, menyusun ringkasan, dan menandai data yang masih perlu validasi.",
    checks: ["OCR/foto", "PDF text", "Nomor catatan", "Kelengkapan field", "PII redaction"],
    output: "Ringkasan bukti dan data kurang",
    status: "Operasional",
  },
  {
    name: "Agen Risiko dan Fraud",
    job: "Memberi risk flag berbasis bukti, inkonsistensi data, dan missing evidence tanpa memberi keputusan otomatis.",
    checks: ["Inkonsistensi", "Missing evidence", "Nominal anomali", "Traceability", "Human review"],
    output: "Risk flag dan tindakan verifikasi",
    status: "Guarded",
  },
  {
    name: "Agen Integrasi dan Sistem",
    job: "Meringkas health DB, WA, AI provider, source readiness, dan batas klaim integrasi untuk operator teknis.",
    checks: ["Health API", "WA bridge", "AI provider", "Shared DB", "Source caveat"],
    output: "Ringkasan kesiapan sistem",
    status: "Support",
  },
  {
    name: "Agen Laporan",
    job: "Merangkum insight, evidence, buyer action, readiness stok, dan tindak lanjut pengurus.",
    checks: ["Data lengkap", "Evidence", "Rekomendasi", "Field mapping", "Human review"],
    output: "Laporan aksi siap review pengurus",
    status: "Core MVP",
  },
];

export const waIntents = [
  {
    id: "lapor-panen",
    label: "Lapor panen",
    sample: "Saya panen padi minggu depan sekitar 5 kuintal di Blok C.",
    bot: "Baik, saya catat rencana panen padi sekitar 5 kuintal di Blok C. Petugas koperasi akan bantu cek tanggal, berat, dan kualitas.",
    module: "Suara Warga",
  },
  {
    id: "cek-harga",
    label: "Cek harga koperasi",
    sample: "Saya punya kopi kering 120 kilo, bisa dicek harga koperasi?",
    bot: "Saya catat kopi kering sekitar 120 kg. Untuk estimasi harga, mohon kirim foto barang dan lokasi kebun. Harga final tetap dicek pengurus.",
    module: "Agen Unggulan Desa",
  },
  {
    id: "cek-status",
    label: "Cek status catatan",
    sample: "Apakah catatan LB-1024 sudah masuk stok koperasi?",
    bot: "Catatan LB-1024 masih menunggu foto barang dan verifikasi petugas. Status saat ini: Perlu Foto Barang.",
    module: "Lumbung Data",
  },
  {
    id: "stok-gerai",
    label: "Cek stok gerai",
    sample: "Minyak goreng di gerai masih ada?",
    bot: "Catatan stok terakhir menunjukkan minyak goreng perlu dicek ulang. Petugas gerai akan mengonfirmasi stok fisik.",
    module: "Gerai Pintar",
  },
  {
    id: "jadwal-pickup",
    label: "Jadwal pickup",
    sample: "Singkong saya bisa diambil Jumat pagi?",
    bot: "Saya buat draft jadwal pickup Jumat pagi. Operator logistik perlu cek kendaraan dan kapasitas gudang.",
    module: "Stok dan Logistik",
  },
  {
    id: "cari-pembeli",
    label: "Cari pembeli",
    sample: "Carikan pembeli kopi grade A.",
    bot: "Ada archetype buyer: roastery atau pengolah kopi. Match harus disetujui pengurus sebelum nama counterparty dan outreach diverifikasi.",
    module: "Pasar dan Mitra",
  },
  {
    id: "pinjaman",
    label: "Ajukan simpan pinjam",
    sample: "Saya mau ajukan pinjaman pupuk 1 juta.",
    bot: "Saya catat permintaan pembiayaan pupuk Rp1.000.000. Komite koperasi tetap yang memutuskan setelah verifikasi.",
    module: "Simpan Pinjam Aman",
  },
  {
    id: "peluang-desa",
    label: "Peluang desa",
    sample: "Apa komoditas unggulan desa minggu ini?",
    bot: "Peluang minggu ini: olahan singkong dan pengeringan kopi kolektif. Perlu cek pasokan rutin dan mitra pembeli.",
    module: "Peta Unggulan Desa",
  },
  {
    id: "laporan",
    label: "Buat laporan",
    sample: "Buat ringkasan laporan minggu ini.",
    bot: "Ringkasan siap: laporan warga, stok gerai, komoditas masuk, buyer match, dan catatan verifikasi.",
    module: "Lapor Siap",
  },
];

export const operatorQueue = [
  {
    id: "LB-1024",
    sender: "Anggota kopi terverifikasi",
    source: "Voice note",
    summary: "Kopi kering sekitar 120 kg, minta cek harga koperasi.",
    status: "Perlu Foto Barang",
    module: "Suara Warga",
  },
  {
    id: "LB-1025",
    sender: "Anggota tani padi",
    source: "Text WhatsApp",
    summary: "Panen padi minggu depan sekitar 5 kuintal di Blok C.",
    status: "Perlu Timbang",
    module: "Lumbung Data",
  },
  {
    id: "LB-1026",
    sender: "Kelompok tani binaan",
    source: "Assisted by operator",
    summary: "Singkong satu bak pickup, perlu jadwal ambil.",
    status: "Menunggu Dicek",
    module: "Stok dan Logistik",
  },
  {
    id: "LB-1027",
    sender: "Anggota pembiayaan pupuk",
    source: "WhatsApp text",
    summary: "Ajukan pembiayaan pupuk Rp1.000.000 untuk musim tanam.",
    status: "Perlu Komite",
    module: "Simpan Pinjam Aman",
  },
  {
    id: "LB-1028",
    sender: "Petugas Gerai",
    source: "Manual operator",
    summary: "Minyak goreng tersisa 12 dus dan perlu restock supplier.",
    status: "Perlu Restock",
    module: "Gerai Pintar",
  },
];

export const stockItems = [
  { name: "Beras medium", unit: "28 karung", state: "Stok Aman", location: "Gerai" },
  { name: "Minyak goreng", unit: "12 dus", state: "Perlu Restok", location: "Gerai" },
  { name: "Pupuk NPK", unit: "8 karung", state: "Terbatas", location: "Gudang" },
  { name: "Kopi kering", unit: "120 kg", state: "Menunggu Grade", location: "Gudang komoditas" },
  { name: "Singkong", unit: "1 bak pickup", state: "Jadwal Pickup", location: "Kebun anggota" },
];

export const buyerMatches = [
  {
    buyer: "Archetype: roastery atau pengolah kopi",
    need: "Kopi kering grade A",
    match: "82",
    reason: "Sinyal kebutuhan archetype cocok dengan stok kopi kering setelah verifikasi grade.",
    status: "Perlu approval pengurus",
  },
  {
    buyer: "Archetype: UMKM pengolah pangan",
    need: "Singkong segar",
    match: "76",
    reason: "Cocok untuk peluang olahan singkong lokal, perlu cek jadwal pickup.",
    status: "Perlu cek kapasitas",
  },
  {
    buyer: "Archetype: retail lokal atau warung",
    need: "Beras medium",
    match: "69",
    reason: "Permintaan rutin kecil, cocok untuk suplai bertahap setelah verifikasi operator.",
    status: "Perlu review operator",
  },
];

export const financeRequests = [
  {
    id: "SP-204",
    member: "Anggota pembiayaan pupuk",
    purpose: "Pupuk dan bibit",
    amount: "Rp1.000.000",
    risk: "Perlu cek histori simpanan",
    status: "Menunggu komite",
  },
  {
    id: "SP-205",
    member: "Anggota alat pengering kopi",
    purpose: "Perbaikan alat pengering kopi",
    amount: "Rp2.500.000",
    risk: "Butuh rencana bayar dari hasil panen",
    status: "Draft analisis",
  },
];

export const villageInsights = [
  {
    title: "Pengeringan kopi kolektif",
    signal: "3 laporan kopi kering dalam 7 hari terakhir",
    action: "Cek alat pengering bersama dan buyer roastery.",
  },
  {
    title: "Olahan singkong",
    signal: "Supply singkong mulai berulang",
    action: "Buat rencana keripik atau gaplek dengan kelompok UMKM.",
  },
  {
    title: "Restock gerai terjadwal",
    signal: "Minyak dan pupuk mendekati batas minimum",
    action: "Gabungkan pesanan supplier agar ongkos logistik turun.",
  },
];

export const petaLayers = [
  { id: "commodity", label: "Komoditas", color: "#2F7D32" },
  { id: "warehouse", label: "Gudang", color: "#1D5D8F" },
  { id: "cooperative", label: "Koperasi", color: "#C92A2A" },
  { id: "umkm", label: "UMKM", color: "#D79A2B" },
  { id: "field", label: "Sawah", color: "#4F8A3D" },
  { id: "livestock", label: "Peternakan", color: "#7A4E2D" },
] as const;

export const indonesiaOpportunityRegions = [
  {
    id: "sumatera",
    label: "Sumatera",
    status: "Surplus kebun",
    color: "#2F7D32",
    villageCode: "11.09.05.2012",
    keywords: ["aceh", "sumatera", "kopi", "nilam", "gayo"],
  },
  {
    id: "jawa-barat",
    label: "Jawa Barat",
    status: "Olahan pangan",
    color: "#D79A2B",
    villageCode: "32.04.12.2008",
    keywords: ["jawa barat", "bandung", "singkong", "kopi", "padi"],
  },
  {
    id: "jawa-tengah",
    label: "Jawa Tengah",
    status: "Harga fluktuatif",
    color: "#C92A2A",
    villageCode: "33.02.07.2011",
    keywords: ["jawa tengah", "karanganyar", "cabai", "telur"],
  },
  {
    id: "jawa-timur",
    label: "Jawa Timur",
    status: "Kopi naik",
    color: "#1D5D8F",
    villageCode: "35.07.18.2004",
    keywords: ["jawa timur", "malang", "robusta", "pisang"],
  },
  {
    id: "kalimantan",
    label: "Kalimantan",
    status: "Perlu logistik",
    color: "#7A4E2D",
    villageCode: "64.03.11.2006",
    keywords: ["kalimantan", "kutai", "lada", "sawit", "kakao"],
  },
  {
    id: "sulawesi",
    label: "Sulawesi",
    status: "Perikanan dan kakao",
    color: "#2F7D32",
    villageCode: "73.10.04.2009",
    keywords: ["sulawesi", "bone", "rumput laut", "kakao", "ikan"],
  },
  {
    id: "papua-maluku",
    label: "Papua dan Maluku",
    status: "Aset terpencar",
    color: "#1D5D8F",
    villageCode: "91.03.02.2015",
    keywords: ["papua", "maluku", "sagu", "pala", "ikan"],
  },
] as const;

export const petaVillages = [
  {
    code: "32.04.12.2008",
    name: "Desa Wanasari",
    district: "Sukamaju",
    regency: "Bandung",
    province: "Jawa Barat",
    center: { lat: -7.042, lng: 107.593 },
    summary: "Desa dengan pasokan singkong, kopi kering, sawah padi, gerai koperasi, dan UMKM pangan.",
    sourceNote: "Gabungan data awal koperasi, WA warga, dan rencana pipeline sumber resmi.",
    commodities: [
      {
        name: "Singkong",
        supply: "Surplus",
        demand: "Menengah",
        quantity: "5 bak pickup per minggu",
        priceSignal: "Stabil",
        opportunity: "Keripik singkong koperasi",
        risk: "Kualitas potongan, minyak, dan kemasan belum standar.",
      },
      {
        name: "Kopi kering",
        supply: "Naik",
        demand: "Tinggi",
        quantity: "120-360 kg per minggu",
        priceSignal: "Butuh cek grade",
        opportunity: "Pengeringan kolektif dan buyer roastery",
        risk: "Kadar air dan foto barang belum lengkap.",
      },
      {
        name: "Padi",
        supply: "Normal",
        demand: "Tinggi lokal",
        quantity: "5-12 kuintal per siklus",
        priceSignal: "Perlu cek pasar",
        opportunity: "Agregasi gabah dan beras medium koperasi",
        risk: "Timbang dan jadwal panen belum rapi.",
      },
    ],
    assets: [
      { id: "w-1", type: "cooperative", name: "Koperasi Desa Maju Bersama", lat: -7.041, lng: 107.592, note: "Pusat operator dan gerai", confidence: "Pilot" },
      { id: "w-2", type: "warehouse", name: "Gudang Komoditas Blok C", lat: -7.046, lng: 107.598, note: "Kapasitas terbatas", confidence: "Pilot" },
      { id: "w-3", type: "umkm", name: "UMKM Olahan Pangan Lokal", lat: -7.038, lng: 107.601, note: "Bisa rencana keripik", confidence: "Data awal" },
      { id: "w-4", type: "field", name: "Sawah Blok C", lat: -7.05, lng: 107.588, note: "Panen padi minggu depan", confidence: "WA warga" },
      { id: "w-5", type: "commodity", name: "Kebun Singkong Selatan", lat: -7.055, lng: 107.604, note: "Pasokan mulai berulang", confidence: "WA warga" },
      { id: "w-6", type: "livestock", name: "Kelompok Ternak Mekar", lat: -7.035, lng: 107.586, note: "Butuh pakan dan pasar telur", confidence: "Input operator" },
    ],
  },
  {
    code: "33.02.07.2011",
    name: "Desa Tegalrejo",
    district: "Matesih",
    regency: "Karanganyar",
    province: "Jawa Tengah",
    center: { lat: -7.642, lng: 111.072 },
    summary: "Desa dataran tinggi dengan sayur, peternakan kecil, koperasi, dan potensi cold storage.",
    sourceNote: "Data awal untuk lintas komoditas dan kebutuhan gudang dingin.",
    commodities: [
      {
        name: "Cabai",
        supply: "Surplus musiman",
        demand: "Tinggi",
        quantity: "800 kg per minggu",
        priceSignal: "Fluktuatif",
        opportunity: "Sortasi, pengeringan, dan kontrak warung mitra",
        risk: "Harga cepat berubah dan komoditas mudah rusak.",
      },
      {
        name: "Telur ayam",
        supply: "Normal",
        demand: "Tinggi lokal",
        quantity: "320 kg per minggu",
        priceSignal: "Stabil",
        opportunity: "Paket sembako gerai koperasi",
        risk: "Butuh pencatatan stok harian.",
      },
    ],
    assets: [
      { id: "t-1", type: "cooperative", name: "Koperasi Tani Tegalrejo", lat: -7.642, lng: 111.072, note: "Pusat data dan gerai", confidence: "Pilot" },
      { id: "t-2", type: "warehouse", name: "Gudang Sayur Utara", lat: -7.636, lng: 111.08, note: "Butuh cold storage", confidence: "Pilot" },
      { id: "t-3", type: "commodity", name: "Lahan Cabai Lereng", lat: -7.648, lng: 111.083, note: "Surplus musiman", confidence: "Pilot" },
      { id: "t-4", type: "livestock", name: "Kandang Ayam Kelompok Sari", lat: -7.634, lng: 111.066, note: "Pasokan telur rutin", confidence: "Input operator" },
      { id: "t-5", type: "umkm", name: "Dapur Sambal Lokal", lat: -7.645, lng: 111.064, note: "Potensi olahan cabai", confidence: "Pilot" },
    ],
  },
  {
    code: "35.07.18.2004",
    name: "Desa Sumbermulyo",
    district: "Dampit",
    regency: "Malang",
    province: "Jawa Timur",
    center: { lat: -8.215, lng: 112.756 },
    summary: "Desa dengan kopi, pisang, kandang kambing, dan peluang pengeringan kolektif.",
    sourceNote: "Sample untuk peluang komoditas kebun dan logistik pickup.",
    commodities: [
      {
        name: "Kopi robusta",
        supply: "Naik",
        demand: "Tinggi",
        quantity: "500 kg per minggu",
        priceSignal: "Butuh grading",
        opportunity: "Grade bersama dan buyer roastery",
        risk: "Kadar air dan sortasi belum seragam.",
      },
      {
        name: "Pisang",
        supply: "Surplus",
        demand: "Menengah",
        quantity: "1,5 ton per minggu",
        priceSignal: "Rentan turun",
        opportunity: "Keripik pisang koperasi",
        risk: "Shelf life pendek bila tidak segera diolah.",
      },
    ],
    assets: [
      { id: "s-1", type: "cooperative", name: "Koperasi Kebun Sumbermulyo", lat: -8.215, lng: 112.756, note: "Pusat agregasi kebun", confidence: "Pilot" },
      { id: "s-2", type: "warehouse", name: "Rumah Jemur Kopi", lat: -8.221, lng: 112.762, note: "Perlu standar kadar air", confidence: "Pilot" },
      { id: "s-3", type: "commodity", name: "Kebun Pisang Timur", lat: -8.225, lng: 112.751, note: "Surplus mingguan", confidence: "WA warga" },
      { id: "s-4", type: "umkm", name: "UMKM Keripik Sumber Rasa", lat: -8.209, lng: 112.764, note: "Butuh kemasan", confidence: "Input operator" },
      { id: "s-5", type: "livestock", name: "Kelompok Kambing Makmur", lat: -8.207, lng: 112.748, note: "Potensi pupuk organik", confidence: "Pilot" },
    ],
  },
  {
    code: "11.09.05.2012",
    name: "Desa Atu Lintang",
    district: "Atu Lintang",
    regency: "Aceh Tengah",
    province: "Aceh",
    center: { lat: 4.607, lng: 96.789 },
    summary: "Desa dataran tinggi dengan kopi arabika, nilam, gudang sortasi, dan kelompok pengeringan.",
    sourceNote: "Sample Sumatera untuk sinyal kopi, minyak atsiri, dan agregasi kebun.",
    commodities: [
      {
        name: "Kopi arabika",
        supply: "Surplus kebun",
        demand: "Tinggi",
        quantity: "650 kg per minggu",
        priceSignal: "Butuh grading",
        opportunity: "Sortasi kopi koperasi dan kontrak roastery",
        risk: "Kadar air, traceability kebun, dan standar sortasi belum seragam.",
      },
      {
        name: "Nilam",
        supply: "Naik",
        demand: "Menengah",
        quantity: "90 kg daun kering per minggu",
        priceSignal: "Perlu cek penyuling",
        opportunity: "Kemitraan penyulingan minyak atsiri",
        risk: "Butuh kualitas bahan baku dan akses alat penyuling.",
      },
    ],
    assets: [
      { id: "a-1", type: "cooperative", name: "Koperasi Kopi Atu Lintang", lat: 4.607, lng: 96.789, note: "Pusat pengumpulan kopi", confidence: "Pilot" },
      { id: "a-2", type: "warehouse", name: "Gudang Sortasi Gayo", lat: 4.612, lng: 96.795, note: "Butuh pencatatan grade", confidence: "Pilot" },
      { id: "a-3", type: "commodity", name: "Kebun Kopi Barat", lat: 4.618, lng: 96.781, note: "Pasokan mingguan stabil", confidence: "WA warga" },
      { id: "a-4", type: "field", name: "Lahan Nilam Bukit", lat: 4.6, lng: 96.776, note: "Perlu mitra penyulingan", confidence: "Input operator" },
      { id: "a-5", type: "umkm", name: "Rumah Sangrai Koperasi", lat: 4.603, lng: 96.798, note: "Pilot roasting kecil", confidence: "Pilot" },
    ],
  },
  {
    code: "64.03.11.2006",
    name: "Desa Muara Lestari",
    district: "Sebulu",
    regency: "Kutai Kartanegara",
    province: "Kalimantan Timur",
    center: { lat: -0.252, lng: 117.008 },
    summary: "Desa tepi sungai dengan lada, kakao, sawit rakyat, dan isu ongkos angkut.",
    sourceNote: "Sample Kalimantan untuk logistik sungai, gudang, dan biaya distribusi.",
    commodities: [
      {
        name: "Lada",
        supply: "Naik",
        demand: "Tinggi",
        quantity: "410 kg per minggu",
        priceSignal: "Stabil naik",
        opportunity: "Pengeringan dan sortasi lada koperasi",
        risk: "Perlu kontrol kadar air dan rute angkut.",
      },
      {
        name: "Kakao",
        supply: "Normal",
        demand: "Menengah",
        quantity: "260 kg per minggu",
        priceSignal: "Butuh fermentasi",
        opportunity: "Fermentasi kakao kelompok tani",
        risk: "Mutu fermentasi belum konsisten.",
      },
    ],
    assets: [
      { id: "k-1", type: "cooperative", name: "Koperasi Muara Lestari", lat: -0.252, lng: 117.008, note: "Pusat catatan warga", confidence: "Pilot" },
      { id: "k-2", type: "warehouse", name: "Gudang Tepi Sungai", lat: -0.247, lng: 117.018, note: "Ongkos angkut tinggi", confidence: "Pilot" },
      { id: "k-3", type: "commodity", name: "Kebun Lada Utara", lat: -0.238, lng: 117.002, note: "Pasokan naik", confidence: "WA warga" },
      { id: "k-4", type: "field", name: "Kebun Kakao Selatan", lat: -0.263, lng: 117.014, note: "Perlu fermentasi", confidence: "Input operator" },
      { id: "k-5", type: "umkm", name: "Unit Pengering Lada", lat: -0.257, lng: 117.023, note: "Butuh jadwal pemakaian", confidence: "Pilot" },
    ],
  },
  {
    code: "73.10.04.2009",
    name: "Desa Pesisir Baru",
    district: "Tanete Riattang Timur",
    regency: "Bone",
    province: "Sulawesi Selatan",
    center: { lat: -4.52, lng: 120.362 },
    summary: "Desa pesisir dengan rumput laut, ikan tangkap, kakao, dan kebutuhan cold storage.",
    sourceNote: "Sample Sulawesi untuk komoditas pesisir dan kakao rakyat.",
    commodities: [
      {
        name: "Rumput laut",
        supply: "Surplus musiman",
        demand: "Tinggi",
        quantity: "1,2 ton per minggu",
        priceSignal: "Perlu cek kadar kering",
        opportunity: "Pengeringan kolektif rumput laut",
        risk: "Cuaca, kadar air, dan ruang jemur belum standar.",
      },
      {
        name: "Ikan tongkol",
        supply: "Naik",
        demand: "Tinggi lokal",
        quantity: "700 kg per minggu",
        priceSignal: "Rentan turun",
        opportunity: "Cold chain koperasi dan kontrak warung",
        risk: "Shelf life pendek tanpa cold storage.",
      },
    ],
    assets: [
      { id: "u-1", type: "cooperative", name: "Koperasi Pesisir Baru", lat: -4.52, lng: 120.362, note: "Pusat nelayan dan petani rumput laut", confidence: "Pilot" },
      { id: "u-2", type: "warehouse", name: "Ruang Simpan Dingin", lat: -4.516, lng: 120.37, note: "Kapasitas terbatas", confidence: "Pilot" },
      { id: "u-3", type: "commodity", name: "Tambak Rumput Laut", lat: -4.511, lng: 120.355, note: "Surplus musiman", confidence: "WA warga" },
      { id: "u-4", type: "livestock", name: "Kelompok Perikanan Mina", lat: -4.526, lng: 120.374, note: "Butuh rantai dingin", confidence: "Input operator" },
      { id: "u-5", type: "umkm", name: "Dapur Abon Ikan", lat: -4.532, lng: 120.358, note: "Potensi olahan ikan", confidence: "Pilot" },
    ],
  },
  {
    code: "91.03.02.2015",
    name: "Kampung Sagu Mandiri",
    district: "Sentani Timur",
    regency: "Jayapura",
    province: "Papua",
    center: { lat: -2.623, lng: 140.662 },
    summary: "Kampung dengan sagu, ikan air tawar, UMKM pangan, dan aset yang tersebar.",
    sourceNote: "Sample Papua dan Maluku untuk akses lokasi, pangan lokal, dan pemetaan aset.",
    commodities: [
      {
        name: "Sagu",
        supply: "Surplus lokal",
        demand: "Menengah",
        quantity: "900 kg per minggu",
        priceSignal: "Perlu pasar olahan",
        opportunity: "Tepung sagu kemasan koperasi",
        risk: "Standar pengeringan, kemasan, dan akses pasar belum matang.",
      },
      {
        name: "Ikan air tawar",
        supply: "Normal",
        demand: "Tinggi lokal",
        quantity: "360 kg per minggu",
        priceSignal: "Stabil",
        opportunity: "Paket pangan lokal gerai koperasi",
        risk: "Butuh cold storage kecil dan jadwal distribusi.",
      },
    ],
    assets: [
      { id: "p-1", type: "cooperative", name: "Koperasi Sagu Mandiri", lat: -2.623, lng: 140.662, note: "Pusat pangan lokal", confidence: "Pilot" },
      { id: "p-2", type: "warehouse", name: "Gudang Tepung Sagu", lat: -2.629, lng: 140.671, note: "Perlu kontrol kelembapan", confidence: "Pilot" },
      { id: "p-3", type: "commodity", name: "Dusun Sagu Timur", lat: -2.615, lng: 140.674, note: "Pasokan lokal besar", confidence: "WA warga" },
      { id: "p-4", type: "livestock", name: "Kolam Ikan Kampung", lat: -2.635, lng: 140.655, note: "Pangan lokal harian", confidence: "Input operator" },
      { id: "p-5", type: "umkm", name: "UMKM Kue Sagu", lat: -2.619, lng: 140.651, note: "Butuh kemasan dan pasar", confidence: "Pilot" },
    ],
  },
] as const;

export const nationalDataSources = [
  {
    id: "big-village-boundary",
    name: "BIG Ina-Geoportal",
    coverage: "Batas desa dan layer geospasial nasional",
    access: "Download, ArcGIS REST, WMS/WFS bila tersedia",
    use: "Geometry desa, sawah, dan layer dasar peta",
    url: "https://tanahair.indonesia.go.id/portal-web/unduh",
    status: "Perlu ETL geospasial",
  },
  {
    id: "bps-webapi",
    name: "BPS Web API",
    coverage: "Statistik resmi nasional sampai level domain BPS",
    access: "API key",
    use: "Baseline produksi, luas panen, populasi, dan indikator daerah",
    url: "https://webapi.bps.go.id/developer/",
    status: "Perlu API key",
  },
  {
    id: "satudata-pertanian",
    name: "Satu Data Pertanian",
    coverage: "Dataset pertanian nasional",
    access: "Portal dan dataset publik",
    use: "Komoditas, produksi, dan referensi sektor pertanian",
    url: "https://satudata.pertanian.go.id/",
    status: "Perlu catalog connector",
  },
  {
    id: "harga-pangan",
    name: "Panel Harga Pangan, PIHPS, SP2KP",
    coverage: "Harga pangan dan pasar daerah",
    access: "Portal, API, atau download sesuai sumber",
    use: "Harga, risiko, dan sinyal permintaan",
    url: "https://panelharga.badanpangan.go.id/",
    status: "Perlu connector per sumber",
  },
  {
    id: "kumkm",
    name: "KUMKM",
    coverage: "Koperasi dan UMKM",
    access: "Akses publik terbatas dan integrasi berizin",
    use: "Koperasi, UMKM pengolah, dan unit usaha",
    url: "https://sidt.kemenkopukm.go.id/",
    status: "Authorization required",
  },
] as const;

export const reportSections = [
  "Partisipasi anggota",
  "Laporan warga masuk",
  "Stok gerai dan gudang",
  "Komoditas diverifikasi",
  "Buyer dan mitra potensial",
  "Pembiayaan menunggu komite",
  "Risiko dan tindak lanjut",
  "Field mapping SIMKOPDES ready",
];

export const integrationChecks = [
  {
    name: "WhatsApp Business API",
    env: "WHATSAPP_BUSINESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET",
    status: "Belum aktif",
    fallback: "Pencatatan WhatsApp lokal terkontrol",
  },
  {
    name: "Live AI Extraction",
    env: "OPENAI_API_KEY",
    status: "Belum aktif",
    fallback: "Aturan ekstraksi lokal",
  },
  {
    name: "Database",
    env: "DATABASE_URL",
    status: "Belum aktif",
    fallback: "Database aplikasi wajib dikonfigurasi",
  },
  {
    name: "Media Storage",
    env: "S3_OR_R2_BUCKET, S3_OR_R2_ACCESS_KEY_ID, S3_OR_R2_SECRET_ACCESS_KEY",
    status: "Belum aktif",
    fallback: "Upload media belum aktif",
  },
  {
    name: "SIMKOPDES Mapping",
    env: "SIMKOPDES_API_BASE, SIMKOPDES_CLIENT_ID, SIMKOPDES_CLIENT_SECRET",
    status: "Readiness only",
    fallback: "CSV export and field map",
  },
  {
    name: "Peta Unggulan Nasional",
    env: "BPS_API_KEY, GEOSPATIAL_DB_URL, DATA_PIPELINE_SECRET",
    status: "Butuh pipeline data",
    fallback: "Data awal aplikasi dan source-check API",
  },
];

export const featureDetails: Record<
  string,
  {
    title: string;
    intro: string;
    waFlows: string[];
    agentChecks: string[];
    operatorActions: string[];
    operationalOutputs: string[];
  }
> = {
  "suara-warga": {
    title: "Suara Warga",
    intro: "Semua warga bisa mulai dari WhatsApp tanpa aplikasi baru.",
    waFlows: ["Voice note panen", "Foto barang", "Cek harga", "Cek status catatan"],
    agentChecks: ["Intent warga", "Transcript", "Satuan lokal", "Data minimum"],
    operatorActions: ["Tanya ulang", "Setujui draft", "Minta foto", "Ubah satuan"],
    operationalOutputs: ["Draft catatan", "Nomor LB", "Receipt WhatsApp", "Queue operator"],
  },
  "lumbung-data": {
    title: "Lumbung Data",
    intro: "Pusat data operasional yang menjaga original wording, field terstruktur, dan audit.",
    waFlows: ["Cek catatan", "Koreksi data", "Kirim bukti timbang"],
    agentChecks: ["Field kosong", "Duplikasi", "Sumber data", "Audit trail"],
    operatorActions: ["Gabungkan catatan", "Validasi data", "Lock record", "Export"],
    operationalOutputs: ["Record verified", "Audit log", "CSV queue", "Field mapping"],
  },
  "agen-ai": {
    title: "Agen Rekomendasi",
    intro: "Agent-agent membantu cek, tapi keputusan tetap manusia.",
    waFlows: ["Tanya hasil AI", "Minta penjelasan", "Minta verifikasi manusia"],
    agentChecks: ["Kualitas", "Harga", "Pasar", "Stok", "Risiko", "Laporan"],
    operatorActions: ["Override rekomendasi", "Set confidence", "Catat alasan", "Approve"],
    operationalOutputs: ["Recommendation card", "Risk flag", "Human checklist", "Agent trace"],
  },
  "rekomendasi-komoditas": {
    title: "Rekomendasi Komoditas",
    intro: "Prioritas komoditas/produk dibuat dari evidence, confidence, risk, dan next action yang tetap direview pengurus.",
    waFlows: ["Tanya prioritas komoditas", "Minta alasan rekomendasi", "Cek confidence", "Minta next action"],
    agentChecks: ["Potensi komoditas", "Readiness koperasi", "Produk/stok", "Sinyal pasar", "Risiko data"],
    operatorActions: ["Review evidence", "Setujui prioritas", "Tandai gap data", "Kirim ke buyer matching"],
    operationalOutputs: ["Opportunity score", "Evidence list", "Risk note", "Action card"],
  },
  "gerai-pintar": {
    title: "Gerai Pintar",
    intro: "Stok gerai, sembako, pupuk, LPG, dan restock dibuat mudah dicek lewat WA.",
    waFlows: ["Cek stok", "Pesan barang", "Lapor stok habis", "Tanya harga"],
    agentChecks: ["Minimum stok", "Restock need", "Supplier", "Permintaan warga"],
    operatorActions: ["Tambah stok", "Buat restock", "Tutup harian", "Export gerai"],
    operationalOutputs: ["Stok kritis", "Saran restock", "Ringkasan gerai", "Supplier note"],
  },
  "stok-logistik": {
    title: "Stok dan Logistik",
    intro: "Komoditas, gudang, cold storage, pickup, dan aging risk terlihat dalam satu alur.",
    waFlows: ["Jadwal pickup", "Cek gudang", "Lapor barang masuk", "Cek barang keluar"],
    agentChecks: ["Kapasitas", "Aging risk", "Rute", "Ketersediaan kendaraan"],
    operatorActions: ["Buat jadwal", "Update lokasi", "Catat keluar", "Tandai risiko"],
    operationalOutputs: ["Pickup schedule", "Warehouse state", "Aging warning", "Movement log"],
  },
  "pasar-mitra": {
    title: "Pasar dan Mitra",
    intro: "Buyer matching dengan alasan jelas dan approval sebelum kontak.",
    waFlows: ["Cari pembeli", "Cek match", "Minta script kontak", "Update deal"],
    agentChecks: ["Buyer need", "Match score", "Jarak", "Syarat kualitas"],
    operatorActions: ["Approve outreach", "Tolak match", "Edit script", "Catat hasil"],
    operationalOutputs: ["Buyer card", "Match reason", "Outreach script", "Deal note"],
  },
  "simpan-pinjam": {
    title: "Simpan Pinjam Aman",
    intro: "Pembiayaan anggota dibantu AI sebagai catatan komite, bukan auto-approve.",
    waFlows: ["Ajukan pinjaman", "Cek status", "Kirim tujuan", "Kirim rencana bayar"],
    agentChecks: ["Tujuan", "Risiko", "Histori simpanan", "Non-predatory guard"],
    operatorActions: ["Minta dokumen", "Kirim komite", "Catat keputusan", "Buat jadwal"],
    operationalOutputs: ["Risk note", "Committee packet", "Repayment draft", "Status receipt"],
  },
  "peta-unggulan": {
    title: "Peta Unggulan Desa",
    intro: "Komoditas unggulan dan aset desa menjadi rekomendasi peluang ekonomi koperasi.",
    waFlows: ["Tanya komoditas unggulan", "Kirim data komoditas", "Usulkan UMKM", "Cek risiko"],
    agentChecks: ["Supply signal", "Demand signal", "Processing opportunity", "Risk"],
    operatorActions: ["Tandai prioritas", "Buat rencana", "Assign pengurus", "Export"],
    operationalOutputs: ["Insight card", "First action", "Risk note", "Stakeholder map"],
  },
  "lapor-siap": {
    title: "Lapor Siap",
    intro: "Ringkasan siap ekspor untuk monitoring dan pelaporan, tanpa klaim integrasi resmi.",
    waFlows: ["Buat laporan", "Cek data belum lengkap", "Kirim ringkasan", "Export CSV"],
    agentChecks: ["Completeness", "Evidence", "Field mapping", "Missing data"],
    operatorActions: ["Review laporan", "Export CSV", "Print summary", "Lock period"],
    operationalOutputs: ["Report packet", "CSV", "Evidence list", "SIMKOPDES ready note"],
  },
  integrasi: {
    title: "Integrasi",
    intro: "Semua koneksi produksi dikunci konfigurasi dan diberi status jujur.",
    waFlows: ["Cek status integrasi", "Kirim pesan uji", "Cek API", "Cek mode produksi bertahap"],
    agentChecks: ["Konfigurasi belum aktif", "API health", "Webhook status", "Export readiness"],
    operatorActions: ["Aktifkan konfigurasi", "Test webhook", "Download mapping", "Switch mode produksi bertahap"],
    operationalOutputs: ["Checklist konfigurasi", "Integration status", "Fallback reason", "API map"],
  },
};

export const sourceGroundingPolicy = {
  label: "sample/aggregate/no PII",
  freshness: "Runtime aggregate fields are generated when the API is requested; external feeds keep their own freshness labels.",
  caveat:
    "Lumbung Bersama MVP uses sample, aggregate, and connector-planned evidence. It must not be presented as official SIMKOPDES production data.",
  humanReview:
    "Operator or committee review is required before outreach, procurement, financing, or public reporting action.",
  noClaims: [
    "no automatic buyer outreach",
    "no automatic financing approval",
    "no real-time price claim unless a tested official connector returns it",
    "no named buyer/offtaker claim unless verified counterparty data exists",
    "no borrower fraud label; use risk flag and needs verification",
  ],
} as const;

export const commodityMarketSignalPolicy = {
  sourceId: "gdelt-doc-api-context",
  sourceLabel: "GDELT Doc API news context",
  sourceUrl: "https://www.gdeltproject.org/",
  role: "market context only",
  freshnessWindow: "GDELT seen-date plus 10 minute API cache in this endpoint.",
  caveat:
    "News results are market context and issue signals only. They are not official price, demand, stock, production, or supply truth.",
  scoreUse:
    "Opportunity score may use the presence and recency of market context as a weak signal, but pricing and procurement still require official price checks and human review.",
} as const;

export const priceCheckNegotiationPlaybook = {
  status: "source-discovery-and-operator-check",
  caveat:
    "No endpoint should invent real-time prices. If official price data is unavailable, return a checklist and caveat instead of a numeric price.",
  officialSourceCandidates: [
    {
      id: "bapanas-panel-harga",
      name: "Panel Harga Pangan Bapanas",
      url: "https://panelharga.badanpangan.go.id/",
      use: "Reference food price band by region where connector is available.",
      status: "connector-planned",
    },
    {
      id: "pihps",
      name: "PIHPS",
      url: "https://www.bi.go.id/hargapangan",
      use: "Regional market price reference where public access is available.",
      status: "source-discovery",
    },
    {
      id: "sp2kp-kemendag",
      name: "SP2KP Kemendag",
      url: "https://ews.kemendag.go.id/",
      use: "Market price and trade monitoring reference where connector is available.",
      status: "source-discovery",
    },
    {
      id: "operator-field-check",
      name: "Operator field check",
      url: "internal-operator-workflow",
      use: "Physical stock, grade, moisture, packaging, logistics, and buyer terms verification.",
      status: "required-before-negotiation",
    },
  ],
  negotiationChecklist: [
    "Verify commodity grade, moisture/quality, packaging, and minimum order quantity.",
    "Check official regional price reference or record source unavailable.",
    "Compare buyer archetype requirements against stock readiness and logistics.",
    "Draft price band as a human-reviewed note, not an automated offer.",
    "Record caveat, confidence, source label, and next action in the operator queue.",
  ],
} as const;

export const borrowerRiskGuardrailPolicy = {
  label: "Borrower Risk & Fraud Analysis guardrails",
  role: "committee support, not automated credit decisioning",
  prohibitedOutputs: [
    "fraudster labels",
    "automatic approve/reject decisions",
    "PII exposure",
    "bank account details",
    "document URLs or file paths",
    "blacklist claims without verified governance process",
  ],
  allowedOutputs: [
    "aggregate readiness status",
    "risk flag",
    "needs verification",
    "missing document checklist",
    "repayment plan draft",
    "committee review packet",
  ],
  riskFlags: [
    {
      id: "missing-status",
      label: "Status belum lengkap",
      nextAction: "Minta operator melengkapi status workflow sebelum naik ke komite.",
    },
    {
      id: "missing-channel-or-purpose",
      label: "Tujuan/channel belum jelas",
      nextAction: "Klasifikasikan tujuan modal kerja dan hubungkan ke stok, produk, atau transaksi.",
    },
    {
      id: "missing-amount",
      label: "Nilai pengajuan belum valid",
      nextAction: "Validasi nominal dan satuan pembiayaan dari dokumen internal.",
    },
    {
      id: "low-verification-rate",
      label: "Bottleneck verifikasi",
      nextAction: "Prioritaskan requested backlog yang punya evidence usaha, stok, dan rencana bayar.",
    },
  ],
  caveat:
    "Risk flags are operational review cues. They must be phrased as needs verification and decided by authorized cooperative governance.",
} as const;

export const businessAnalystPlaybook = {
  label: "Financing and business analyst aggregate",
  role: "turn aggregate evidence into committee and operator next actions",
  dimensions: [
    {
      id: "financing-funnel",
      label: "Financing funnel",
      source: "pengajuan_pembiayaan aggregate",
      analystQuestion: "Where do draft/requested/verified records bottleneck?",
    },
    {
      id: "market-readiness",
      label: "Market readiness",
      source: "produk_koperasi, inventaris_produk, transaksi_penjualan aggregate",
      analystQuestion: "Which cooperative records have product, stock, and transaction signal before buyer outreach?",
    },
    {
      id: "partnership-demand",
      label: "Partnership demand",
      source: "pengajuan_kemitraan aggregate",
      analystQuestion: "Which requests can become human-reviewed buyer matching experiments?",
    },
    {
      id: "data-quality",
      label: "Data quality",
      source: "data-quality aggregate checks",
      analystQuestion: "Which missing fields or outliers block confident recommendations?",
    },
  ],
  caveat:
    "Analyst output is aggregate prioritization. It does not expose row-level borrower data and does not approve financing or buyer outreach.",
} as const;

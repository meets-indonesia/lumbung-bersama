import type { QueryResultRow } from "pg";

export type WaAgentModule =
  | "WA Intake / Suara Warga"
  | "Data Verification"
  | "Agent Center"
  | "Opportunity Score"
  | "Peta Unggulan / Komoditas Unggulan"
  | "Gerai / Stock Readiness"
  | "Stock Logistics / Pickup"
  | "Buyer Matching Lite"
  | "Market Price Check & Negotiation Agent"
  | "Simpan Pinjam / Financing Readiness"
  | "Borrower Risk & Fraud Analysis"
  | "UMKM/Potensi Lokal intake"
  | "Laporan Aksi"
  | "Integrasi / System Health";

export type WaPayloadType = "text" | "image" | "audio" | "document" | "unknown";

export type WaAgentIntent = {
  id: string;
  label: string;
  sample: string;
  bot: string;
  module: WaAgentModule;
  moduleRoute: string;
  keywords: string[];
  nextSteps: string[];
};

export type WaAgentDraft = {
  intentId: string;
  intentLabel: string;
  module: WaAgentModule;
  moduleRoute: string;
  source: string;
  confidence: "medium" | "needs-review";
  caveat: string;
  humanReviewStatus: string;
  mediaStatus: string;
  queueStatus: string;
  nextSteps: string[];
};

type OperatorQueueRow = QueryResultRow & {
  id: string;
  cooperativeId: string;
  sender: string;
  source: string;
  summary: string;
  status: string;
  module: string;
  createdAt?: string;
  updatedAt?: string;
};

type QueryOne = (sql: string, params?: unknown[]) => Promise<QueryResultRow | null>;

type WaQueueInput = {
  queryOne: QueryOne;
  waMessageId: string;
  providerMessageId?: string | null;
  cooperativeId: string;
  sender: string;
  source: string;
  message: string;
  module: string;
  status?: string;
};

const DEFAULT_QUEUE_STATUS = "Menunggu Dicek";
const SUMMARY_LIMIT = 180;

export const WA_AGENT_MODULES: Array<{ title: WaAgentModule; route: string; coverage: string }> = [
  {
    title: "WA Intake / Suara Warga",
    route: "/wa",
    coverage: "Laporan warga, nomor LB, dan tindak lanjut operator.",
  },
  {
    title: "Data Verification",
    route: "/dashboard",
    coverage: "Cek status catatan, koreksi data, bukti foto, dan data kurang.",
  },
  {
    title: "Agent Center",
    route: "/agents",
    coverage: "Ringkasan hasil AI, confidence, source, dan caveat.",
  },
  {
    title: "Opportunity Score",
    route: "/dashboard",
    coverage: "Penjelasan score, risk/caveat, dan next action berbasis sumber.",
  },
  {
    title: "Peta Unggulan / Komoditas Unggulan",
    route: "/peta-unggulan",
    coverage: "Prioritas komoditas desa dan alasan opportunity.",
  },
  {
    title: "Gerai / Stock Readiness",
    route: "/dashboard",
    coverage: "Cek stok gerai, alert habis, dan restock draft.",
  },
  {
    title: "Stock Logistics / Pickup",
    route: "/dashboard",
    coverage: "Pickup, gudang, barang masuk, dan barang keluar.",
  },
  {
    title: "Buyer Matching Lite",
    route: "/dashboard",
    coverage: "Buyer archetype, script outreach, dan approval manusia.",
  },
  {
    title: "Market Price Check & Negotiation Agent",
    route: "/dashboard",
    coverage: "Cek harga, negosiasi, floor price, dan caveat sumber.",
  },
  {
    title: "Simpan Pinjam / Financing Readiness",
    route: "/dashboard",
    coverage: "Draft pinjaman, status pembiayaan, dan checklist dokumen.",
  },
  {
    title: "Borrower Risk & Fraud Analysis",
    route: "/dashboard",
    coverage: "Risk flag, rencana bayar, dan verifikasi dokumen.",
  },
  {
    title: "UMKM/Potensi Lokal intake",
    route: "/peta-unggulan",
    coverage: "Usulan UMKM dan kelengkapan profil potensi lokal.",
  },
  {
    title: "Laporan Aksi",
    route: "/laporan",
    coverage: "Draft laporan, data kurang, dan permintaan export.",
  },
  {
    title: "Integrasi / System Health",
    route: "/integrasi",
    coverage: "Health check, readiness env, dan pesan uji WA.",
  },
];

function moduleRoute(module: WaAgentModule) {
  return WA_AGENT_MODULES.find((item) => item.title === module)?.route ?? "/modules";
}

function intent(
  id: string,
  label: string,
  sample: string,
  bot: string,
  module: WaAgentModule,
  keywords: string[],
  nextSteps: string[],
): WaAgentIntent {
  return {
    id,
    label,
    sample,
    bot,
    module,
    moduleRoute: moduleRoute(module),
    keywords,
    nextSteps,
  };
}

export const WA_AGENT_INTENTS: WaAgentIntent[] = [
  intent(
    "citizen-report",
    "Laporan warga",
    "lapor panen kopi 120 kilo",
    "Draft catatan warga dibuat dengan nomor LB dan masuk antrean operator untuk validasi volume, lokasi, dan bukti.",
    "WA Intake / Suara Warga",
    ["lapor", "panen", "suara warga", "hasil panen", "produksi"],
    ["Cek komoditas, volume, satuan, dan lokasi.", "Minta bukti timbang atau foto bila data belum lengkap.", "Hubungkan catatan valid ke Peta Unggulan."],
  ),
  intent(
    "note-status",
    "Cek status catatan",
    "apakah catatan LB-1024 sudah masuk?",
    "Status catatan disiapkan sebagai draft jawaban; operator perlu mencocokkan nomor LB sebelum membalas warga.",
    "Data Verification",
    ["status catatan", "catatan lb", "sudah masuk", "nomor lb", "lb-"],
    ["Cari nomor LB di antrean operator.", "Tandai data yang kurang.", "Balas hanya setelah status catatan terkonfirmasi."],
  ),
  intent(
    "data-correction",
    "Koreksi data",
    "berat kopi kemarin 80 kg bukan 60 kg",
    "Draft koreksi data dibuat dan diberi flag review agar perubahan tidak langsung menimpa catatan lama.",
    "Data Verification",
    ["koreksi", "bukan", "salah", "ubah", "revisi", "kemarin"],
    ["Bandingkan dengan catatan sebelumnya.", "Minta bukti pendukung bila nominal berubah besar.", "Operator menyetujui koreksi sebelum data dashboard berubah."],
  ),
  intent(
    "media-evidence",
    "Kirim bukti timbang/foto",
    "ini foto barang dan timbangan",
    "Media diterima sebagai bukti pendukung. OCR dan pembacaan dokumen belum otomatis, sehingga perlu review manual operator.",
    "Data Verification",
    ["foto", "gambar", "timbangan", "bukti", "dokumen", "nota", "upload"],
    ["Ambil media dari WhatsApp Cloud API saat env produksi aktif.", "Verifikasi isi foto atau dokumen secara manual.", "Hubungkan bukti ke catatan LB terkait."],
  ),
  intent(
    "ai-result",
    "Tanya hasil AI",
    "apa hasil cek AI untuk kopi saya?",
    "Ringkasan hasil AI disiapkan dengan confidence, sumber, dan caveat. Jawaban ini bukan keputusan otomatis.",
    "Agent Center",
    ["hasil ai", "cek ai", "analisis ai", "nilai ai"],
    ["Tampilkan score hanya jika sumber tersedia.", "Cantumkan confidence dan caveat.", "Operator memastikan tidak ada keputusan otomatis."],
  ),
  intent(
    "recommendation-explanation",
    "Penjelasan rekomendasi",
    "kenapa kopi jadi prioritas?",
    "Penjelasan rekomendasi disusun dari sumber data, sinyal stok, kesiapan, dan caveat yang perlu diverifikasi.",
    "Opportunity Score",
    ["kenapa", "mengapa", "prioritas", "alasan", "rekomendasi"],
    ["Tautkan ke breakdown opportunity score.", "Jelaskan komponen sumber data.", "Tandai asumsi yang masih perlu verifikasi."],
  ),
  intent(
    "weekly-commodity",
    "Komoditas unggulan",
    "apa komoditas unggulan desa minggu ini?",
    "Prioritas komoditas disiapkan sebagai ringkasan Peta Unggulan dengan alasan dan batasan sumber.",
    "Peta Unggulan / Komoditas Unggulan",
    ["komoditas unggulan", "unggulan desa", "potensi desa", "minggu ini"],
    ["Buka Peta Unggulan.", "Pilih wilayah dan komoditas.", "Validasi apakah data masih sample atau sudah diverifikasi."],
  ),
  intent(
    "store-stock-check",
    "Cek stok gerai",
    "stok minyak di gerai masih ada?",
    "Permintaan cek stok masuk antrean gerai. Sistem tidak mengarang stok jika sumber inventaris belum tersedia.",
    "Gerai / Stock Readiness",
    ["stok", "gerai", "masih ada", "persediaan"],
    ["Cek inventaris aggregate.", "Tandai stok kurang, negatif, atau belum terdata.", "Operator gerai mengonfirmasi stok sebelum warga dibalas."],
  ),
  intent(
    "stock-out-alert",
    "Lapor stok habis",
    "beras SPHP habis",
    "Alert stok habis dibuat sebagai draft restock dan masuk antrean operator gerai.",
    "Gerai / Stock Readiness",
    ["habis", "kosong", "restock", "sp hp", "sphp"],
    ["Cek stok terakhir.", "Buat draft kebutuhan restock.", "Operator menentukan tindak lanjut gudang atau pemasok."],
  ),
  intent(
    "price-check",
    "Tanya harga",
    "harga cabai sekarang berapa?",
    "Cek harga dibuat sebagai draft. Jika sumber harga tidak tersedia, operator wajib memasukkan rujukan harga lokal.",
    "Market Price Check & Negotiation Agent",
    ["harga", "berapa", "price", "cabai", "tawar"],
    ["Cek sumber harga resmi atau terkurasi.", "Jika kosong, minta input operator.", "Cantumkan freshness, confidence, dan caveat."],
  ),
  intent(
    "pickup-schedule",
    "Jadwal pickup",
    "jadwalkan pickup singkong hari Jumat",
    "Draft pickup dibuat untuk dicek terhadap ketersediaan kendaraan, gudang, dan operator logistik.",
    "Stock Logistics / Pickup",
    ["pickup", "jemput", "jadwal", "hari jumat", "ambil"],
    ["Cek tanggal dan lokasi pickup.", "Cek kendaraan atau kapasitas gudang.", "Konfirmasi jadwal sebelum dikirim ke warga."],
  ),
  intent(
    "warehouse-capacity",
    "Cek gudang",
    "gudang masih muat untuk jagung?",
    "Permintaan cek kapasitas gudang masuk antrean logistik; jawaban perlu konfirmasi operator.",
    "Stock Logistics / Pickup",
    ["gudang", "muat", "kapasitas", "penyimpanan"],
    ["Cek kapasitas dan lokasi gudang.", "Tandai risiko kualitas atau penyimpanan.", "Operator logistik memberi keputusan final."],
  ),
  intent(
    "stock-movement",
    "Barang masuk/keluar",
    "kopi masuk 10 karung",
    "Draft pergerakan stok dibuat dan perlu dicocokkan dengan satuan, lokasi, dan bukti barang.",
    "Stock Logistics / Pickup",
    ["barang masuk", "barang keluar", "masuk", "keluar", "karung"],
    ["Validasi satuan dan jumlah.", "Cek lokasi penyimpanan.", "Operator gudang menyetujui movement."],
  ),
  intent(
    "buyer-search",
    "Cari pembeli",
    "carikan pembeli kopi grade A",
    "Buyer matching dibuat sebagai archetype atau market proxy. Sistem tidak membuat nama buyer palsu.",
    "Buyer Matching Lite",
    ["pembeli", "buyer", "offtaker", "carikan", "grade"],
    ["Tentukan buyer archetype.", "Cek readiness volume, kualitas, dan packaging.", "Outreach hanya setelah approval operator."],
  ),
  intent(
    "buyer-script",
    "Script kontak buyer",
    "buatkan pesan untuk buyer",
    "Draft script outreach buyer dibuat untuk diedit dan disetujui manusia sebelum dikirim.",
    "Buyer Matching Lite",
    ["script", "pesan untuk buyer", "kontak buyer", "outreach"],
    ["Buat script sopan berbasis data.", "Cantumkan caveat volume dan kualitas.", "Minta approval operator sebelum pengiriman."],
  ),
  intent(
    "deal-update",
    "Update deal",
    "buyer minta harga lebih rendah",
    "Catatan negosiasi dibuat dengan next action cek harga, margin minimum, dan persetujuan pengurus.",
    "Market Price Check & Negotiation Agent",
    ["deal", "buyer minta", "harga lebih rendah", "negosiasi", "tawar"],
    ["Cek harga referensi.", "Hitung floor price bila data biaya tersedia.", "Operator menentukan respons negosiasi."],
  ),
  intent(
    "loan-request",
    "Ajukan pinjaman",
    "ajukan pinjaman pupuk 1 juta",
    "Draft pengajuan pembiayaan dibuat. AI tidak menyetujui atau menolak pinjaman otomatis.",
    "Simpan Pinjam / Financing Readiness",
    ["pinjaman", "ajukan", "pupuk", "modal", "pembiayaan"],
    ["Kumpulkan tujuan pinjaman dan nominal.", "Cek dokumen yang kurang.", "Pengurus memberi keputusan setelah review."],
  ),
  intent(
    "loan-status",
    "Cek status pinjaman",
    "status pinjaman saya bagaimana?",
    "Draft status pinjaman disiapkan hanya untuk pengguna berwenang; output publik tetap aggregate dan tanpa PII.",
    "Simpan Pinjam / Financing Readiness",
    ["status pinjaman", "pinjaman saya", "pembiayaan saya"],
    ["Pastikan otorisasi pemohon.", "Jangan tampilkan data personal di demo publik.", "Operator mengonfirmasi status resmi."],
  ),
  intent(
    "loan-purpose",
    "Tujuan pinjaman",
    "pinjaman untuk pupuk dan benih",
    "Tujuan pinjaman diklasifikasi sebagai draft dan masuk risk review queue.",
    "Borrower Risk & Fraud Analysis",
    ["tujuan pinjaman", "untuk pupuk", "untuk benih", "kebutuhan pinjaman"],
    ["Klasifikasi tujuan usaha.", "Cek keselarasan nominal dengan skala usaha.", "Gunakan risk flag, bukan tuduhan."],
  ),
  intent(
    "repayment-plan",
    "Rencana bayar",
    "saya bayar setelah panen",
    "Rencana bayar dibuat sebagai draft repayment plan dan perlu verifikasi musim panen serta cashflow.",
    "Borrower Risk & Fraud Analysis",
    ["bayar setelah panen", "rencana bayar", "repayment", "cicil"],
    ["Cek jadwal panen.", "Tandai bukti yang kurang.", "Pengurus menilai kelayakan secara manual."],
  ),
  intent(
    "umkm-candidate",
    "Usulkan UMKM",
    "UMKM keripik singkong mau ikut",
    "Kandidat UMKM masuk intake potensi lokal dan perlu cek kelengkapan profil, produk, serta legalitas dasar.",
    "UMKM/Potensi Lokal intake",
    ["umkm", "keripik", "mau ikut", "potensi lokal"],
    ["Cek nama usaha, produk, kapasitas, dan lokasi.", "Minta bukti produk bila perlu.", "Hubungkan ke Peta Unggulan setelah valid."],
  ),
  intent(
    "risk-check",
    "Cek risiko",
    "apakah komoditas ini berisiko?",
    "Risk/caveat disiapkan sebagai decision support. Hasilnya perlu sumber dan verifikasi manusia.",
    "Borrower Risk & Fraud Analysis",
    ["risiko", "risk", "berisiko", "flag"],
    ["Cari sumber risiko yang jelas.", "Gunakan istilah risk flag atau needs verification.", "Jangan memberi keputusan final otomatis."],
  ),
  intent(
    "weekly-report",
    "Buat laporan",
    "buat ringkasan laporan minggu ini",
    "Draft laporan aksi dibuat untuk rapat koperasi, lengkap dengan source, confidence, caveat, dan next action.",
    "Laporan Aksi",
    ["laporan", "ringkasan", "minggu ini", "rapat"],
    ["Kumpulkan opportunity, buyer, stok, dan pembiayaan.", "Cantumkan caveat sumber.", "Operator meninjau sebelum dibagikan."],
  ),
  intent(
    "missing-data",
    "Data belum lengkap",
    "data apa yang kurang?",
    "Checklist data kurang dibuat untuk membantu operator meminta bukti lanjutan tanpa membuka PII.",
    "Laporan Aksi",
    ["data kurang", "belum lengkap", "apa yang kurang", "missing"],
    ["Cek field wajib.", "Pisahkan data sample dan verified.", "Minta data tambahan lewat operator."],
  ),
  intent(
    "export-request",
    "Export ringkasan",
    "export laporan",
    "Permintaan export masuk antrean laporan. CSV publik harus aggregate-only dan tanpa PII.",
    "Laporan Aksi",
    ["export", "csv", "unduh", "download"],
    ["Pastikan kolom PII tidak ikut.", "Tambahkan source/caveat columns.", "Operator menjalankan export yang sesuai."],
  ),
  intent(
    "integration-status",
    "Status integrasi",
    "status integrasi sistem",
    "Health summary integrasi disiapkan untuk operator, termasuk database, WA env, dan caveat koneksi.",
    "Integrasi / System Health",
    ["integrasi", "sistem", "health", "status sistem"],
    ["Cek halaman Integrasi.", "Bedakan available dan unavailable.", "Jangan klaim integrasi produksi jika env belum lengkap."],
  ),
  intent(
    "wa-test-send",
    "Pesan uji WA",
    "kirim pesan uji WA",
    "Pesan uji hanya boleh dikirim jika token, phone number id, app secret, dan approval operator sudah siap.",
    "Integrasi / System Health",
    ["pesan uji", "test send", "kirim pesan uji", "uji wa"],
    ["Cek env WhatsApp.", "Gunakan /api/wa/send hanya saat live send diizinkan.", "Catat hasil sebagai sent hanya jika Graph API sukses."],
  ),
];

function normalizeIntentText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordScore(intent: WaAgentIntent, normalizedMessage: string) {
  return intent.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeIntentText(keyword);
    return normalizedKeyword && normalizedMessage.includes(normalizedKeyword)
      ? score + Math.max(1, normalizedKeyword.split(" ").length)
      : score;
  }, 0);
}

export function selectWaAgentIntent(message: string, requestedIntentId?: string | null) {
  const requested = WA_AGENT_INTENTS.find((item) => item.id === requestedIntentId);
  if (requested) return requested;

  const normalized = normalizeIntentText(message);
  if (!normalized) return WA_AGENT_INTENTS[0];

  const [best] = WA_AGENT_INTENTS
    .map((item) => ({ item, score: keywordScore(item, normalized) }))
    .sort((left, right) => right.score - left.score);

  return best?.score ? best.item : WA_AGENT_INTENTS[0];
}

export function fallbackIntentForPayload(payloadType: WaPayloadType) {
  if (payloadType === "image" || payloadType === "document") {
    return WA_AGENT_INTENTS.find((item) => item.id === "media-evidence") ?? WA_AGENT_INTENTS[0];
  }
  if (payloadType === "audio") {
    return WA_AGENT_INTENTS.find((item) => item.id === "citizen-report") ?? WA_AGENT_INTENTS[0];
  }
  return WA_AGENT_INTENTS[0];
}

export function normalizeWaPayloadType(value: string | null | undefined): WaPayloadType {
  if (value === "text" || value === "image" || value === "audio" || value === "document") return value;
  return value ? "unknown" : "text";
}

export function mediaStatusForPayload(payloadType: WaPayloadType) {
  if (payloadType === "image") {
    return "Media image diterima sebagai bukti; OCR belum otomatis dan perlu review operator.";
  }
  if (payloadType === "audio") {
    return "Voice note diterima; transkripsi otomatis belum aktif dan perlu review operator.";
  }
  if (payloadType === "document") {
    return "Dokumen diterima sebagai lampiran; parsing dokumen belum otomatis dan perlu review operator.";
  }
  if (payloadType === "unknown") {
    return "Payload non-teks diterima; tipe belum dikenali dan perlu review operator.";
  }
  return "Pesan teks disimpan sebagai draft follow-up.";
}

export function displayTextForPayload(payloadType: WaPayloadType, message: string) {
  const trimmed = message.replace(/\s+/g, " ").trim();
  if (trimmed) return trimmed;
  if (payloadType === "image") return "[media image WhatsApp - perlu review operator]";
  if (payloadType === "audio") return "[voice note WhatsApp - perlu transkripsi operator]";
  if (payloadType === "document") return "[dokumen WhatsApp - perlu review operator]";
  if (payloadType === "unknown") return "[payload WhatsApp belum dikenali - perlu review operator]";
  return "";
}

export function queueStatusForPayload(payloadType: WaPayloadType) {
  return payloadType === "text" ? DEFAULT_QUEUE_STATUS : "Perlu Operator: Media Belum Diproses";
}

export function queueSourceForPayload(payloadType: WaPayloadType, sourcePrefix = "Local WA") {
  if (payloadType === "image") return `${sourcePrefix} image`;
  if (payloadType === "audio") return `${sourcePrefix} voice note`;
  if (payloadType === "document") return `${sourcePrefix} document`;
  if (payloadType === "unknown") return `${sourcePrefix} payload`;
  return `${sourcePrefix} text`;
}

export function buildWaAgentDraft(input: {
  intent: WaAgentIntent;
  payloadType?: WaPayloadType;
  source?: string;
}): WaAgentDraft {
  const payloadType = input.payloadType ?? "text";
  const hasMedia = payloadType !== "text";

  return {
    intentId: input.intent.id,
    intentLabel: input.intent.label,
    module: input.intent.module,
    moduleRoute: input.intent.moduleRoute,
    source: input.source ?? "WA local draft",
    confidence: hasMedia ? "needs-review" : "medium",
    caveat:
      "Data dari WhatsApp adalah input operasional awal. Harga, stok, buyer, dokumen, dan pembiayaan wajib diverifikasi operator sebelum menjadi keputusan.",
    humanReviewStatus:
      "Human review required: AI hanya membuat draft, queue, script, summary, checklist, dan next action.",
    mediaStatus: mediaStatusForPayload(payloadType),
    queueStatus: queueStatusForPayload(payloadType),
    nextSteps: input.intent.nextSteps,
  };
}

function stableHexDigest(value: string) {
  let first = 0x811c9dc5;
  let second = 0x85ebca6b;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second ^= code + index;
    second = Math.imul(second, 0x27d4eb2d);
  }

  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`.toUpperCase();
}

export function queueIdForWaIntake(waMessageId: string, providerMessageId?: string | null) {
  const providerKey = providerMessageId?.trim();
  const identity = providerKey ? `provider:${providerKey}` : `wa:${waMessageId}`;
  const digest = stableHexDigest(identity);
  return `LB-WA-${digest}`;
}

export function summarizeWaIntake(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "Pesan WhatsApp masuk tanpa isi teks.";
  if (normalized.length <= SUMMARY_LIMIT) return normalized;
  return `${normalized.slice(0, SUMMARY_LIMIT - 3)}...`;
}

export async function ensureOperatorQueueForWaMessage(input: WaQueueInput) {
  const queueId = queueIdForWaIntake(input.waMessageId, input.providerMessageId);
  const status = input.status ?? DEFAULT_QUEUE_STATUS;
  const summary = summarizeWaIntake(input.message);
  const runQuery = input.queryOne;

  const inserted = (await runQuery(
    `INSERT INTO operator_queue (id, cooperative_id, sender, source, summary, status, module)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING
     RETURNING id,
       cooperative_id AS "cooperativeId",
       sender,
       source,
       summary,
       status,
       module,
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [
      queueId,
      input.cooperativeId,
      input.sender,
      input.source,
      summary,
      status,
      input.module,
    ],
  )) as OperatorQueueRow | null;

  if (inserted) return inserted;

  return (await runQuery(
    `SELECT id,
       cooperative_id AS "cooperativeId",
       sender,
       source,
       summary,
       status,
       module,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM operator_queue
     WHERE id = $1`,
    [queueId],
  )) as OperatorQueueRow | null;
}

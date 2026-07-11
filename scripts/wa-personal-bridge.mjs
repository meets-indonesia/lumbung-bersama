#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { PDFParse } from "pdf-parse";
import qrcode from "qrcode-terminal";
import { loadLocalEnv } from "./load-local-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadLocalEnv(root);

const { Pool } = pg;

if (process.env.WA_PERSONAL_ADAPTER_ENABLED !== "1") {
  console.error("WA personal bridge belum aktif. Set WA_PERSONAL_ADAPTER_ENABLED=1 untuk mode testing QR.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Bridge perlu database aplikasi untuk mencatat pesan dan queue.");
  process.exit(1);
}

const authDir = path.resolve(root, process.env.WA_PERSONAL_AUTH_DIR || ".wa-personal-auth");
const mediaDir = path.resolve(root, process.env.WA_PERSONAL_MEDIA_DIR || "tmp/wa-media");
const stateDir = path.resolve(root, process.env.WA_PERSONAL_STATE_DIR || ".wa-personal-state");
const stateFile = path.join(stateDir, "status.json");
const cooperativeId =
  process.env.WA_PERSONAL_COOPERATIVE_ID?.trim() ||
  process.env.WEBHOOK_COOPERATIVE_ID?.trim() ||
  process.env.DEFAULT_COOPERATIVE_ID?.trim() ||
  "kop-wanasari";
const ocrEnabled = process.env.WA_PERSONAL_OCR_ENABLED === "1";
const ocrLang = process.env.WA_PERSONAL_OCR_LANG || "ind+eng";
const welcomeTriggers = new Set(["halo", "hai", "hi", "hello", "menu", "bantuan", "help", "start", "mulai", "kembali", "back"]);
const closeTriggers = new Set(["puas", "tidak", "tidak puas", "terima kasih", "terimakasih", "makasih", "thanks", "thank you"]);

function getSharedDatabaseUrl() {
  if (process.env.HACKATHON_SHARED_DATABASE_URL) return process.env.HACKATHON_SHARED_DATABASE_URL;
  if (!process.env.DB_HOST || !process.env.DB_DATABASE || !process.env.DB_USERNAME || !process.env.DB_PASSWORD) return "";
  const port = process.env.DB_PORT || "5432";
  return `postgresql://${encodeURIComponent(process.env.DB_USERNAME)}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${port}/${encodeURIComponent(process.env.DB_DATABASE)}`;
}

const agentRouter = [
  {
    id: "1",
    name: "Agen Peta Potensi Desa",
    module: "Peta Unggulan / Komoditas Unggulan",
    keywords: ["peta", "potensi", "desa", "wilayah", "komoditas unggulan", "unggulan desa", "umkm"],
    prompt: "Tanyakan potensi wilayah, komoditas unggulan, atau UMKM lokal.",
    bot: "Agen Peta Potensi Desa siap menyusun ringkasan potensi, komoditas, sumber, dan data yang perlu diverifikasi.",
  },
  {
    id: "2",
    name: "Agen Stok dan Gudang",
    module: "Gerai / Stock Readiness",
    keywords: ["stok", "gerai", "gudang", "habis", "restock", "barang masuk", "barang keluar", "panen", "kg", "kilo", "ton", "karung"],
    prompt: "Tanyakan stok, panen, barang masuk, barang keluar, restock, atau kapasitas gudang.",
    bot: "Agen Stok dan Gudang siap mencatat volume, satuan, bukti, dan kesiapan stok.",
  },
  {
    id: "3",
    name: "Agen Buyer Matching",
    module: "Buyer Matching Lite",
    keywords: ["buyer", "pembeli", "mitra", "offtaker", "order", "pesanan", "carikan", "kontak", "outreach", "negosiasi", "jual", "menjual", "mau jual", "ingin jual"],
    prompt: "Tanyakan calon pembeli, script outreach, atau kesiapan produk untuk buyer.",
    bot: "Agen Buyer Matching siap membuat buyer archetype, draft kebutuhan, dan next action tanpa membuat nama buyer palsu.",
  },
  {
    id: "4",
    name: "Agen Harga dan Negosiasi",
    module: "Market Price Check & Negotiation Agent",
    keywords: ["harga", "berapa", "price", "nego", "tawar", "margin", "floor price", "cabai", "beras", "kopi", "sawit", "tbs", "cpo"],
    prompt: "Tanyakan harga, risiko harga, atau bahan negosiasi.",
    bot: "Agen Harga dan Negosiasi siap memberi jawaban dengan caveat sumber dan tidak mengarang angka bila feed harga belum lengkap.",
  },
  {
    id: "5",
    name: "Agen Pembiayaan Readiness",
    module: "Simpan Pinjam / Financing Readiness",
    keywords: ["pinjam", "pinjaman", "pembiayaan", "modal", "angsuran", "kredit", "komite", "bayar", "cicil", "pupuk", "benih"],
    prompt: "Tanyakan draft pinjaman, tujuan pembiayaan, dokumen, atau kesiapan review komite.",
    bot: "Agen Pembiayaan Readiness siap membuat checklist kesiapan; ini bukan persetujuan otomatis.",
  },
  {
    id: "6",
    name: "Agen Bukti dan Dokumen",
    module: "Data Verification",
    keywords: [
      "foto",
      "gambar",
      "ocr",
      "pdf",
      "dokumen",
      "nota",
      "timbangan",
      "bukti",
      "ktp",
      "surat",
      "lampiran",
      "file",
      "status",
      "catatan",
      "lb",
      "koreksi",
      "salah",
      "revisi",
    ],
    prompt: "Kirim foto, PDF, nota, bukti timbang, atau koreksi data untuk diverifikasi.",
    bot: "Agen Bukti dan Dokumen siap membaca file bila memungkinkan dan mencatat hasil awal untuk review operator.",
  },
  {
    id: "7",
    name: "Agen Laporan Aksi",
    module: "Laporan Aksi",
    keywords: ["laporan", "ringkasan", "rapat", "export", "csv", "aksi", "keputusan", "rekomendasi"],
    prompt: "Tanyakan ringkasan laporan, data kurang, atau keputusan aksi koperasi.",
    bot: "Agen Laporan Aksi siap menyusun executive summary, bukti, gap, dan keputusan yang masih pending.",
  },
];

function normalizeRouterText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function menuText() {
  const items = agentRouter.map((agent) => `${agent.id}. ${agent.name}`).join("\n");
  return [
    "Selamat datang di Kopdes Lumbung Bersama.",
    "Saya asisten WA untuk menjawab pertanyaan operasional, membaca bukti, dan mencatat kebutuhan yang perlu tindak lanjut.",
    "",
    "Pilih agent dengan angka, atau langsung tulis kebutuhan Anda.",
    items,
    "",
    "Contoh: harga sawit di Banyuasin, mau jual kopi 1 ton, baca nota PDF ini, ajukan pinjaman pupuk 1 juta.",
    "Pertanyaan informatif dijawab otomatis. Pembiayaan, negosiasi final, buyer outreach, koreksi data, dan bukti media masuk tindak lanjut operator.",
  ].join("\n");
}

function scoreAgent(agent, normalizedMessage) {
  return agent.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeRouterText(keyword);
    return normalizedKeyword && normalizedMessage.includes(normalizedKeyword)
      ? score + Math.max(1, normalizedKeyword.split(" ").length)
      : score;
  }, 0);
}

function routeAgent(text, payloadType) {
  if (payloadType !== "text") return agentRouter.find((agent) => agent.id === "6") ?? agentRouter[0];

  const normalized = normalizeRouterText(text);
  const exactChoice = normalized.match(/^(?:pilih\s*)?([1-7])$/)?.[1];
  if (exactChoice) return agentRouter.find((agent) => agent.id === exactChoice) ?? agentRouter[0];
  if (!normalized || welcomeTriggers.has(normalized)) return null;

  const [best] = agentRouter
    .map((agent) => ({ agent, score: scoreAgent(agent, normalized) }))
    .sort((left, right) => right.score - left.score);

  return best?.score ? best.agent : null;
}

function isOutOfScopeMessage(text, payloadType) {
  if (payloadType !== "text") return false;
  const normalized = normalizeRouterText(text);
  if (!normalized || welcomeTriggers.has(normalized) || closeTriggers.has(normalized) || normalized === "operator" || normalized === "panggil operator") {
    return false;
  }
  return !/\b(koperasi|kopdes|lumbung|desa|warga|komoditas|produk|panen|beras|padi|gabah|sawit|tbs|cpo|kopi|cabai|singkong|jagung|kakao|lada|sagu|rumput laut|harga|jual|buyer|pembeli|offtaker|stok|stock|gerai|gudang|restock|pickup|barang|pinjam|pinjaman|pembiayaan|modal|simpan|keuangan|angsuran|pupuk|benih|nota|bukti|dokumen|pdf|foto|gambar|ocr|laporan|aksi|integrasi|wa|catatan|status|kemitraan|transaksi|umkm)\b/i.test(
    normalized,
  );
}

function shouldShowMenu(text, payloadType) {
  if (payloadType !== "text") return false;
  const normalized = normalizeRouterText(text);
  return !normalized || welcomeTriggers.has(normalized);
}

function quickActions() {
  return [
    "",
    "Gunakan tombol cepat bila muncul. Jika tidak muncul, balas: menu, operator, puas, atau tidak.",
  ].join("\n");
}

function aiConfig() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || "https://xai.hashmicro.co/v1").replace(/\/+$/, ""),
    model: process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-5.5-medium",
    wireApi: process.env.OPENAI_WIRE_API || process.env.AI_WIRE_API || "responses",
    timeoutMs: Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 12000),
  };
}

function extractJsonObject(raw) {
  const trimmed = String(raw ?? "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;
  return JSON.parse(candidate);
}

function responseOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload?.output) ? payload.output : [];
  const parts = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const contentItem of content) {
      if (typeof contentItem?.text === "string") parts.push(contentItem.text);
    }
  }
  return parts.join("\n");
}

function chatOutputText(payload) {
  return typeof payload?.choices?.[0]?.message?.content === "string" ? payload.choices[0].message.content : "";
}

function sanitizeAiReply(reply) {
  return String(reply ?? "")
    .replace(/\r/g, "")
    .replace(/\b(?:DATABASE_URL|DB_PASSWORD|OPENAI_API_KEY|AI_API_KEY|WHATSAPP_[A-Z0-9_]+|WA_PERSONAL_[A-Z0-9_]+)\b/gi, "[secret-redacted]")
    .replace(/\b\d{10,16}@s\.whatsapp\.net\b/gi, "[wa-redacted]")
    .replace(/\b(?:\+?62|0)\d{8,13}\b/g, "[nomor-redacted]")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1700);
}

async function finalizeReplyWithAi({ agent, messageText, payloadType, reviewMode, queueId, fallbackReply }) {
  const config = aiConfig();
  if (!config) return fallbackReply;

  const prompt = [
    "Anda adalah WA agent Lumbung Bersama untuk koperasi desa.",
    "Tulis ulang jawaban agar natural dan adaptif, tetapi hanya memakai fakta dari fallback.",
    "Scope hanya potensi desa/komoditas, harga/negosiasi koperasi, stok/gudang, buyer readiness, pembiayaan readiness, dokumen/OCR, laporan aksi, dan integrasi WA/dashboard.",
    "Jika fallback menyebut data tidak tersedia, jangan mengarang angka.",
    "Jangan tampilkan nomor WA, credential, raw media path, buyer bernama tidak terverifikasi, atau data pribadi.",
    "Jangan menyetujui pinjaman, deal final, floor price final, atau buyer outreach otomatis.",
    "Format WA rapi dengan spasi antar bagian. Maksimal 1700 karakter.",
    "",
    `Agent: ${agent?.name ?? "WA Intake"}`,
    `Modul: ${agent?.module ?? "WA Intake / Suara Warga"}`,
    `Payload: ${payloadType}`,
    `Review mode: ${reviewMode}`,
    `Queue ID: ${queueId ?? "tidak ada"}`,
    `Pesan user: ${messageText}`,
    "",
    "Fallback/data evidence:",
    fallbackReply,
    "",
    'Kembalikan JSON saja: {"reply":"..."}',
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(config.timeoutMs) ? config.timeoutMs : 12000);
  try {
    const response = await fetch(
      config.wireApi === "chat-completions" ? `${config.baseUrl}/chat/completions` : `${config.baseUrl}/responses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          config.wireApi === "chat-completions"
            ? {
                model: config.model,
                messages: [
                  { role: "system", content: "Return valid JSON only. Keep answer evidence-backed and scope-limited." },
                  { role: "user", content: prompt },
                ],
                temperature: 0.2,
                max_tokens: 700,
              }
            : {
                model: config.model,
                input: [
                  {
                    role: "system",
                    content: [{ type: "input_text", text: "Return valid JSON only. Keep answer evidence-backed and scope-limited." }],
                  },
                  { role: "user", content: [{ type: "input_text", text: prompt }] },
                ],
                max_output_tokens: 700,
              },
        ),
        signal: controller.signal,
      },
    );
    if (!response.ok) return fallbackReply;
    const payload = await response.json().catch(() => null);
    const raw = config.wireApi === "chat-completions" ? chatOutputText(payload) : responseOutputText(payload);
    const parsed = extractJsonObject(raw);
    const reply = sanitizeAiReply(parsed.reply);
    return reply || fallbackReply;
  } catch {
    return fallbackReply;
  } finally {
    clearTimeout(timeout);
  }
}

function extractCommodityName(text) {
  const normalized = normalizeRouterText(text);
  const known = [
    "sawit",
    "tbs",
    "cpo",
    "kopi",
    "beras",
    "padi",
    "cabai",
    "singkong",
    "jagung",
    "rumput laut",
    "kakao",
    "lada",
    "sagu",
  ];
  const found = known.find((item) => normalized.includes(item));
  if (found === "tbs" || found === "cpo") return "sawit/TBS";
  return found ?? "komoditas ini";
}

function extractAreaHint(text) {
  const match = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .match(/\b(?:di|daerah|kabupaten|kecamatan|desa)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s.-]{3,40})/i);
  return match?.[1]?.trim().replace(/[?.!,;:].*$/, "") || "";
}

function hasManualKeyword(text) {
  const normalized = normalizeRouterText(text);
  return /\b(pinjam|pinjaman|pembiayaan|modal|komite|jual|menjual|mau jual|buyer|pembeli|offtaker|outreach|nego|negosiasi|tawar|deal|approval|setuju|koreksi|ubah|revisi|salah|hapus|restock|habis|kosong|pickup|jemput|jadwal|barang masuk|barang keluar|export|csv|operator)\b/i.test(normalized);
}

function reviewPolicy(agent, payloadType, messageText) {
  const normalized = normalizeRouterText(messageText);
  if (closeTriggers.has(normalized) || welcomeTriggers.has(normalized)) {
    return { shouldQueue: false, queueStatus: "Dijawab otomatis", mode: "auto-answer" };
  }
  if (normalized === "operator" || normalized === "panggil operator") {
    return {
      shouldQueue: true,
      queueStatus: "Menunggu operator 24 jam",
      mode: "manual-review",
      slaText: "Operator akan menindaklanjuti maksimal 24 jam kerja.",
    };
  }
  if (payloadType !== "text") {
    return {
      shouldQueue: true,
      queueStatus: "Perlu review dokumen/media 24 jam",
      mode: "manual-review",
      slaText: "Operator akan mengecek bukti dan menindaklanjuti maksimal 24 jam kerja.",
    };
  }
  if (hasManualKeyword(messageText) || ["3", "5", "6", "7"].includes(agent.id)) {
    const queueStatus =
      agent.id === "5"
        ? "Menunggu review pembiayaan 24 jam"
        : agent.id === "3" || agent.id === "4"
          ? "Menunggu approval komersial 24 jam"
          : "Menunggu tindak lanjut operator 24 jam";
    return {
      shouldQueue: true,
      queueStatus,
      mode: "manual-review",
      slaText: "Operator akan menindaklanjuti maksimal 24 jam kerja.",
    };
  }
  return { shouldQueue: false, queueStatus: "Dijawab otomatis", mode: "auto-answer" };
}

function queueLine(queueId, policy) {
  if (policy.shouldQueue) return queueId ? `Nomor antrean: ${queueId}` : "Nomor antrean sedang dibuat.";
  return "Riwayat chat tersimpan di WA Inbox. Tidak dibuat antrean operator karena skenario ini dijawab otomatis.";
}

function formatSections(sections) {
  return sections
    .map((section) => {
      const lines = section.lines.map((line) => String(line ?? "").trim()).filter(Boolean);
      if (!lines.length) return "";
      return [section.title, ...lines].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function closingLine(closed = false) {
  return closed
    ? "Terima kasih. Percakapan saya tutup sebagai selesai. Ketik menu bila nanti membutuhkan bantuan lagi."
    : "Ada lagi yang bisa saya bantu?";
}

function financeReadinessLines(messageText) {
  const normalized = normalizeRouterText(messageText);
  const hasAmount = /\b(?:rp|rupiah)\s*\d|(?:\d+(?:[.,]\d+)?)\s*(?:juta|ribu|jt)\b/i.test(messageText);
  const productivePurpose = /\b(pupuk|benih|bibit|panen|musim tanam|modal usaha|usaha|produksi|stok|alat tani|komoditas|kopi|padi|beras|sawit|cabai|jagung)\b/i.test(
    normalized,
  );
  const repayment = /\b(bayar|cicil|angsuran|setelah panen|panen|mingguan|bulanan|tenor|rencana bayar)\b/i.test(normalized);
  const riskyPurpose = /\b(konsumtif|pribadi|gadget|hp|liburan|judi|tidak tahu|belum tahu|tanpa usaha|tidak ada usaha)\b/i.test(normalized);

  if (riskyPurpose || (!productivePurpose && hasAmount)) {
    return [
      "Status awal: Perlu revisi sebelum review komite.",
      "Alasan: tujuan pembiayaan belum terkait usaha/komoditas produktif atau rencana bayar belum jelas.",
      "Lengkapi tujuan produktif, nominal wajar, rencana bayar, sumber pembayaran, dan bukti usaha/panen.",
    ];
  }

  if (hasAmount && productivePurpose && repayment) {
    return [
      "Status awal: Siap masuk review komite.",
      "Alasan: nominal, tujuan produktif, dan rencana bayar sudah terbaca dari pesan.",
      "Data yang tetap diminta: bukti usaha/panen, status anggota terverifikasi, dan catatan pengurus.",
    ];
  }

  return [
    "Status awal: Data belum lengkap.",
    "Kirim nominal, tujuan penggunaan, rencana bayar, sumber pembayaran, dan bukti usaha/panen.",
  ];
}

function priceGuidance(commodityName, areaHint) {
  return dataBackedPriceGuidance(commodityName, areaHint);
}

async function buildOperationalAnswer({ agent, queueId, mediaNote, payloadType = "text", messageText }) {
  const normalized = normalizeRouterText(messageText);
  const commodityName = extractCommodityName(messageText);
  const areaHint = extractAreaHint(messageText);
  const policy = reviewPolicy(agent, payloadType, messageText);

  if (closeTriggers.has(normalized)) {
    return closingLine(true);
  }

  if (normalized === "operator" || normalized === "panggil operator") {
    return formatSections([
      { title: "Operator", lines: ["Saya buat antrean operator untuk percakapan ini.", queueLine(queueId, policy), policy.slaText] },
      { title: "Ringkasan masuk", lines: [summarize(messageText)] },
      { title: "Catatan", lines: [closingLine(false), quickActions()] },
    ]);
  }

  const answerLines = [];
  if (agent.id === "4") {
    answerLines.push(...(await priceGuidance(commodityName, areaHint)));
    if (policy.shouldQueue) answerLines.push("Karena pesan ini mengarah ke negosiasi/jual-beli, saya buat antrean approval komersial.");
    return formatSections([
      { title: "Cek harga", lines: answerLines },
      { title: "Status", lines: [queueLine(queueId, policy), `Modul dashboard: ${agent.module}`, policy.slaText] },
      { title: "Ringkasan masuk", lines: [summarize(messageText)] },
      { title: "Catatan", lines: [closingLine(false), quickActions()] },
    ]);
  }

  if (agent.id === "1") {
    answerLines.push(`Potensi ${commodityName} dinilai dari pasokan, aset koperasi/gudang, sinyal buyer, dan risiko harga.`);
    answerLines.push("Kirim desa/kecamatan, volume, musim panen, grade/kualitas, dan bukti pasokan agar analisis wilayah lebih tajam.");
  }

  if (agent.id === "2") {
    answerLines.push("Saya cek konteks stok dari pesan ini.");
    answerLines.push("Jika hanya pertanyaan stok, riwayatnya disimpan. Jika stok habis, restock, barang masuk/keluar, atau pickup, kasus masuk tindak lanjut operator.");
    answerLines.push("Data minimal: komoditas, jumlah, satuan, lokasi gerai/gudang, tanggal siap, dan bukti bila ada.");
  }

  if (agent.id === "3") {
    answerLines.push(`Untuk menjual ${commodityName}, alur aman adalah cek harga dulu, lalu buyer matching setelah volume dan kualitas jelas.`);
    answerLines.push("Saya tidak membuat nama buyer palsu. Buyer tetap berupa tipe kebutuhan/archetype sampai pengurus menyetujui outreach.");
    answerLines.push("Kirim volume, grade, lokasi pickup, foto barang, dan harga indikatif agar case bisa dinilai.");
  }

  if (agent.id === "5") {
    answerLines.push("Pembiayaan masuk sebagai readiness, bukan persetujuan otomatis.");
    answerLines.push(...financeReadinessLines(messageText));
    answerLines.push("Keputusan tetap menunggu review pengurus/komite.");
  }

  if (agent.id === "6") {
    answerLines.push("File/bukti diterima dan saya baca otomatis bila format mendukung.");
    answerLines.push(mediaNote ? `Hasil baca awal: ${mediaNote}` : "Untuk foto, OCR aktif; untuk PDF text-based, teks akan diekstrak.");
    answerLines.push("Hasil baca otomatis dipisahkan dari keputusan operasional agar tidak tercampur dengan rekomendasi agent.");
  }

  if (agent.id === "7") {
    answerLines.push("Saya siapkan kebutuhan ini sebagai bahan laporan aksi.");
    answerLines.push("Isi laporan: ringkasan, evidence/source, gap verifikasi, buyer action, stock/readiness gap, dan status keputusan.");
  }

  if (!answerLines.length) answerLines.push(agent.bot);

  return formatSections([
    { title: agent.name, lines: answerLines },
    { title: "Status", lines: [queueLine(queueId, policy), `Modul dashboard: ${agent.module}`, policy.slaText] },
    { title: "Ringkasan masuk", lines: [summarize(messageText)] },
    { title: "Catatan", lines: [closingLine(false), quickActions()] },
  ]);
}

async function buildAgentReply({ agent, queueId, mediaNote, payloadType, messageText }) {
  const lines = [
    await buildOperationalAnswer({ agent, queueId, mediaNote, payloadType, messageText }),
  ];

  return lines.join("\n");
}

await mkdir(mediaDir, { recursive: true });
await mkdir(stateDir, { recursive: true });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.WA_PERSONAL_POOL_MAX ?? 2),
});

const sharedDatabaseUrl = getSharedDatabaseUrl();
const sharedPool = sharedDatabaseUrl
  ? new Pool({
      connectionString: sharedDatabaseUrl,
      ssl: (process.env.HACKATHON_SHARED_DB_SSL ?? process.env.PGSSLMODE) === "require" ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.HACKATHON_SHARED_DB_POOL_MAX ?? 1),
      connectionTimeoutMillis: Number(process.env.HACKATHON_SHARED_DB_CONNECT_TIMEOUT_MS ?? 5000),
    })
  : null;

function digest(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16).toUpperCase();
}

function newId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function queueIdForWaIntake(waMessageId, providerMessageId) {
  const identity = providerMessageId ? `provider:${providerMessageId}` : `wa:${waMessageId}`;
  return `LB-WA-${digest(identity)}`;
}

function maskJid(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "WA Personal";
  if (digits.length <= 4) return `WA Personal ****${digits}`;
  const prefix = digits.length > 8 ? digits.slice(0, 2) : "";
  return `WA Personal ${prefix}****${digits.slice(-4)}`;
}

async function writeBridgeState(state) {
  const payload = {
    status: state.status,
    qr: typeof state.qr === "string" ? state.qr : null,
    updatedAt: new Date().toISOString(),
    connectedAt: state.connectedAt ?? null,
    lastDisconnect: state.lastDisconnect ?? null,
    capabilities: {
      qrPairing: true,
      mediaDownload: true,
      pdfTextExtraction: true,
      imageOcr: ocrEnabled,
    },
  };
  await writeFile(stateFile, JSON.stringify(payload, null, 2), "utf8");
}

function summarize(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Pesan WA personal masuk tanpa isi teks.";
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function classifyIntent(text, payloadType) {
  const normalized = normalizeRouterText(text);
  if (closeTriggers.has(normalized)) {
    return {
      intent: "Feedback layanan",
      module: "WA Intake / Suara Warga",
      bot: "Feedback layanan dicatat.",
      agent: agentRouter[0],
      responseType: "agent",
    };
  }

  if (normalized === "operator" || normalized === "panggil operator") {
    return {
      intent: "Panggil operator",
      module: "WA Intake / Suara Warga",
      bot: "Percakapan diteruskan ke operator.",
      agent: agentRouter[0],
      responseType: "agent",
    };
  }

  if (isOutOfScopeMessage(text, payloadType)) {
    return {
      intent: "Di luar scope koperasi",
      module: "WA Intake / Suara Warga",
      bot: "Pertanyaan di luar scope Lumbung Bersama ditolak otomatis.",
      agent: null,
      responseType: "out-of-scope",
    };
  }

  const routedAgent = routeAgent(text, payloadType);
  if (routedAgent) {
    return {
      intent: routedAgent.name,
      module: routedAgent.module,
      bot: routedAgent.bot,
      agent: routedAgent,
      responseType: "agent",
    };
  }

  if (shouldShowMenu(text, payloadType)) {
    return {
      intent: "Menu agent koperasi",
      module: "WA Intake / Suara Warga",
      bot: "Menu agent dikirim ke warga.",
      agent: null,
      responseType: "menu",
    };
  }

  return {
    intent: "Perlu klasifikasi operator",
    module: "WA Intake / Suara Warga",
    bot: "Pesan belum cukup jelas dan masuk antrean operator untuk klasifikasi.",
    agent: null,
    responseType: "unknown",
  };
}

function mediaKind(message) {
  if (message.imageMessage) return { type: "image", payload: message.imageMessage };
  if (message.documentMessage) return { type: "document", payload: message.documentMessage };
  if (message.audioMessage) return { type: "audio", payload: message.audioMessage };
  if (message.videoMessage) return { type: "video", payload: message.videoMessage };
  return null;
}

function extensionFor(mimeType, payloadType) {
  const mime = String(mimeType ?? "").toLowerCase();
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("mpeg")) return ".mp3";
  if (mime.includes("ogg")) return ".ogg";
  return payloadType === "image" ? ".jpg" : payloadType === "document" ? ".bin" : ".media";
}

async function bufferFromStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function extractPdfText(buffer) {
  let parser = null;
  try {
    parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = parsed.text.replace(/\s+/g, " ").trim();
    return {
      text: text ? text.slice(0, 2400) : "",
      note: text ? `PDF text extracted (${text.length} chars).` : "PDF berhasil dibaca tetapi teks kosong.",
    };
  } catch (error) {
    return {
      text: "",
      note: `PDF belum bisa diekstrak otomatis: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  } finally {
    if (parser) await parser.destroy().catch(() => undefined);
  }
}

async function extractImageOcr(buffer) {
  if (!ocrEnabled) {
    return {
      text: "",
      note: "OCR image belum aktif. Set WA_PERSONAL_OCR_ENABLED=1 untuk membaca teks foto.",
    };
  }
  let worker = null;
  try {
    const { createWorker } = await import("tesseract.js");
    worker = await createWorker(ocrLang);
    const result = await worker.recognize(buffer);
    const text = result.data.text.replace(/\s+/g, " ").trim();
    return {
      text: text ? text.slice(0, 1800) : "",
      note: text ? `OCR image extracted (${text.length} chars).` : "OCR image selesai tetapi teks kosong.",
    };
  } catch (error) {
    return {
      text: "",
      note: `OCR image gagal: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  } finally {
    if (worker) await worker.terminate().catch(() => undefined);
  }
}

async function extractMessage(message, downloadContentFromMessage, providerMessageId) {
  const buttonText =
    message.buttonsResponseMessage?.selectedButtonId ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.templateButtonReplyMessage?.selectedId ||
    message.templateButtonReplyMessage?.selectedDisplayText ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    message.listResponseMessage?.title ||
    "";
  const text =
    buttonText ||
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.documentMessage?.caption ||
    "";
  const media = mediaKind(message);
  if (!media) {
    return {
      payloadType: "text",
      messageText: text,
      mediaPath: null,
      mediaMime: null,
      mediaNote: "text-only",
      mediaSize: 0,
    };
  }

  const mimeType = media.payload.mimetype || media.payload.mimetype?.toString() || "";
  const stream = await downloadContentFromMessage(media.payload, media.type);
  const buffer = await bufferFromStream(stream);
  const ext = extensionFor(mimeType, media.type);
  const safeName = `${digest(providerMessageId || randomUUID())}${ext}`;
  const mediaPath = path.join(mediaDir, safeName);
  await writeFile(mediaPath, buffer);

  let extracted = { text: "", note: "Media tersimpan; review operator tetap diperlukan." };
  if (media.type === "document" && String(mimeType).toLowerCase().includes("pdf")) {
    extracted = await extractPdfText(buffer);
  } else if (media.type === "image") {
    extracted = await extractImageOcr(buffer);
  }

  const parts = [
    text,
    extracted.text ? `Isi terbaca: ${extracted.text}` : "",
    extracted.note ? `Catatan media: ${extracted.note}` : "",
  ].filter(Boolean);

  return {
    payloadType: media.type === "video" ? "image" : media.type,
    messageText: parts.join("\n"),
    mediaPath,
    mediaMime: mimeType,
    mediaNote: extracted.note,
    mediaSize: buffer.length,
  };
}

async function queryOne(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] ?? null;
}

async function queryRows(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

function safeAmount(value) {
  const numeric = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatRupiah(value) {
  return `Rp${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;
}

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("INVALID_COLUMN_IDENTIFIER");
  }
  return `"${identifier}"`;
}

function sqlTextLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'::text`;
}

function pickColumn(columns, candidates) {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

function textExpression(column, fallback) {
  return column ? `${quoteIdentifier(column)}::text` : sqlTextLiteral(fallback);
}

function numericExpression(column) {
  if (!column) return "0::numeric";
  const expression = quoteIdentifier(column);
  return `COALESCE(NULLIF(REGEXP_REPLACE(${expression}::text, '[^0-9.-]', '', 'g'), '')::numeric, 0)`;
}

function commodityPattern(commodityName) {
  const normalized = normalizeRouterText(commodityName);
  if (/(beras|padi|gabah)/i.test(normalized)) return "(beras|padi|gabah|rice)";
  if (/(sawit|tbs|cpo)/i.test(normalized)) return "(sawit|tbs|cpo|kelapa sawit)";
  if (/kopi/i.test(normalized)) return "(kopi|robusta|arabika)";
  if (/cabai/i.test(normalized)) return "(cabai|cabe|chili)";
  if (/jagung/i.test(normalized)) return "(jagung)";
  if (/singkong/i.test(normalized)) return "(singkong|ubi kayu)";
  if (/kakao/i.test(normalized)) return "(kakao|cokelat)";
  if (/lada/i.test(normalized)) return "(lada|merica)";
  if (/sagu/i.test(normalized)) return "(sagu)";
  if (/rumput laut/i.test(normalized)) return "(rumput laut)";
  return normalized.replace(/[^\p{Letter}\p{Number}\s]/gu, " ").trim().replace(/\s+/g, "|") || ".+";
}

async function sharedQueryRows(sql, params = []) {
  if (!sharedPool) return [];
  const client = await sharedPool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query(`SET LOCAL statement_timeout = ${Number(process.env.HACKATHON_SHARED_DB_STATEMENT_TIMEOUT_MS ?? 8000)}`);
    const result = await client.query(sql, params);
    await client.query("COMMIT");
    return result.rows;
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    return [];
  } finally {
    client.release();
  }
}

async function sharedColumns(tableName) {
  const rows = await sharedQueryRows(
    `SELECT column_name AS "columnName"
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1`,
    [tableName],
  );
  return new Set(rows.map((row) => row.columnName));
}

async function localPriceEvidence(commodityName, areaHint) {
  const rows = await queryRows(
    `SELECT villages.name AS "villageName",
            villages.regency,
            villages.province,
            village_commodities.name AS commodity,
            village_commodities.quantity,
            village_commodities.price_signal AS "priceSignal",
            village_commodities.supply,
            village_commodities.demand,
            village_commodities.risk
     FROM village_commodities
     JOIN villages ON villages.code = village_commodities.village_code
     WHERE ($1::text = '' OR LOWER(village_commodities.name) ~* $2)
       AND (
         $3::text = ''
         OR villages.name ILIKE $4
         OR villages.district ILIKE $4
         OR villages.regency ILIKE $4
         OR villages.province ILIKE $4
       )
     ORDER BY villages.updated_at DESC
     LIMIT 5`,
    [commodityName === "komoditas ini" ? "" : commodityName, commodityPattern(commodityName), areaHint, `%${areaHint}%`],
  ).catch(() => []);

  return rows.map(
    (row) =>
      `Peta/local: ${row.commodity} di ${row.villageName}, ${row.regency}, ${row.province}; volume ${row.quantity}; sinyal harga "${row.priceSignal}"; supply ${row.supply}; demand ${row.demand}; risiko ${row.risk}`,
  );
}

async function sharedInventoryPriceEvidence(commodityName, areaHint) {
  const columns = await sharedColumns("inventaris_produk");
  const productColumn = pickColumn(columns, ["nama_produk", "produk", "nama_barang", "nama_item", "komoditas", "nama_komoditas"]);
  const priceColumn = pickColumn(columns, ["harga", "harga_jual", "harga_beli", "harga_satuan", "harga_produk", "price", "unit_price", "nilai_produk"]);
  const stockColumn = pickColumn(columns, ["stok", "stock", "jumlah_stok", "quantity", "qty", "jumlah"]);
  const unitColumn = pickColumn(columns, ["satuan", "unit", "unit_label", "uom"]);
  const cooperativeColumn = columns.has("koperasi_ref") ? "koperasi_ref" : null;
  if (!productColumn || !priceColumn) return [];

  const productExpr = textExpression(productColumn, "Produk tanpa nama");
  const priceExpr = numericExpression(priceColumn);
  const stockExpr = numericExpression(stockColumn);
  const unitExpr = textExpression(unitColumn, "unit");
  const areaFilter = cooperativeColumn
    ? `AND (
         $2::text = ''
         OR EXISTS (
           SELECT 1
           FROM referensi_koperasi_wilayah rkw
           JOIN referensi_wilayah rw ON rw.kode_wilayah = rkw.kode_wilayah
           WHERE rkw.koperasi_ref = inventaris_produk.${quoteIdentifier(cooperativeColumn)}
             AND (rw.provinsi ILIKE $3 OR rw.kab_kota ILIKE $3 OR rw.kecamatan ILIKE $3)
         )
       )`
    : "";

  const rows = await sharedQueryRows(
    `SELECT COALESCE(NULLIF(BTRIM(${productExpr}), ''), 'Produk tanpa nama') AS "productName",
            COALESCE(NULLIF(BTRIM(${unitExpr}), ''), 'unit') AS "unitLabel",
            COUNT(*)::int AS rows,
            AVG(NULLIF(${priceExpr}, 0))::text AS "avgPrice",
            MIN(NULLIF(${priceExpr}, 0))::text AS "minPrice",
            MAX(NULLIF(${priceExpr}, 0))::text AS "maxPrice",
            COALESCE(SUM(${stockExpr}), 0)::text AS "stockTotal"
     FROM inventaris_produk
     WHERE LOWER(${productExpr}) ~* $1
       AND ${priceExpr} > 0
       ${areaFilter}
     GROUP BY 1, 2
     ORDER BY COUNT(*) DESC, AVG(NULLIF(${priceExpr}, 0)) DESC
     LIMIT 4`,
    [commodityPattern(commodityName), areaHint, `%${areaHint}%`],
  );

  return rows.map((row) => {
    const avg = safeAmount(row.avgPrice);
    const min = safeAmount(row.minPrice);
    const max = safeAmount(row.maxPrice);
    const range = min && max && min !== max ? `${formatRupiah(min)}-${formatRupiah(max)}` : formatRupiah(avg || min || max);
    return `Shared DB inventaris: ${row.productName}; harga data ${range}/${row.unitLabel}; rata-rata ${formatRupiah(avg)}; stok agregat ${safeAmount(row.stockTotal).toLocaleString("id-ID")} ${row.unitLabel}; ${row.rows} baris.`;
  });
}

async function sharedProductAvailabilityEvidence(commodityName, areaHint) {
  const columns = await sharedColumns("inventaris_produk");
  const productColumn = pickColumn(columns, ["nama_produk", "produk", "nama_barang", "nama_item", "komoditas", "nama_komoditas"]);
  const stockColumn = pickColumn(columns, ["stok", "stock", "jumlah_stok", "quantity", "qty", "jumlah"]);
  const cooperativeColumn = columns.has("koperasi_ref") ? "koperasi_ref" : null;
  if (!productColumn) return [];

  const productExpr = textExpression(productColumn, "Produk tanpa nama");
  const stockExpr = numericExpression(stockColumn);
  const areaFilter = cooperativeColumn
    ? `AND (
         $2::text = ''
         OR EXISTS (
           SELECT 1
           FROM referensi_koperasi_wilayah rkw
           JOIN referensi_wilayah rw ON rw.kode_wilayah = rkw.kode_wilayah
           WHERE rkw.koperasi_ref = inventaris_produk.${quoteIdentifier(cooperativeColumn)}
             AND (rw.provinsi ILIKE $3 OR rw.kab_kota ILIKE $3 OR rw.kecamatan ILIKE $3)
         )
       )`
    : "";

  const rows = await sharedQueryRows(
    `SELECT COALESCE(NULLIF(BTRIM(${productExpr}), ''), 'Produk tanpa nama') AS "productName",
            COUNT(*)::int AS rows,
            COALESCE(SUM(${stockExpr}), 0)::text AS "stockTotal"
     FROM inventaris_produk
     WHERE LOWER(${productExpr}) ~* $1
       ${areaFilter}
     GROUP BY 1
     ORDER BY COUNT(*) DESC, COALESCE(SUM(${stockExpr}), 0) DESC
     LIMIT 4`,
    [commodityPattern(commodityName), areaHint, `%${areaHint}%`],
  );

  return rows.map((row) => {
    const stockTotal = safeAmount(row.stockTotal);
    const stockText = stockTotal > 0 ? `stok agregat ${stockTotal.toLocaleString("id-ID")}` : "stok agregat belum terisi";
    return `Shared DB inventaris: ${row.productName}; ${row.rows} baris cocok; ${stockText}; kolom harga satuan tidak tersedia pada skema ini.`;
  });
}

async function sharedTransactionPriceEvidence(commodityName, areaHint) {
  const columns = await sharedColumns("transaksi_penjualan");
  const productColumn = pickColumn(columns, ["nama_produk", "produk", "nama_barang", "nama_item", "komoditas", "nama_komoditas"]);
  const amountColumn = pickColumn(columns, ["total_pembayaran", "total_payment", "total_penjualan", "nilai_transaksi", "jumlah_pembayaran", "nominal", "amount", "total"]);
  const quantityColumn = pickColumn(columns, ["jumlah_produk", "jumlah_barang", "kuantitas", "quantity", "qty", "volume", "jumlah"]);
  const unitColumn = pickColumn(columns, ["satuan", "unit", "unit_label", "uom"]);
  const cooperativeColumn = columns.has("koperasi_ref") ? "koperasi_ref" : null;
  if (!productColumn || !amountColumn) return [];

  const productExpr = textExpression(productColumn, "Produk tanpa nama");
  const amountExpr = numericExpression(amountColumn);
  const quantityExpr = numericExpression(quantityColumn);
  const unitExpr = textExpression(unitColumn, "unit");
  const unitPriceExpr = quantityColumn ? `SUM(${amountExpr}) / NULLIF(SUM(${quantityExpr}), 0)` : "NULL::numeric";
  const areaFilter = cooperativeColumn
    ? `AND (
         $2::text = ''
         OR EXISTS (
           SELECT 1
           FROM referensi_koperasi_wilayah rkw
           JOIN referensi_wilayah rw ON rw.kode_wilayah = rkw.kode_wilayah
           WHERE rkw.koperasi_ref = transaksi_penjualan.${quoteIdentifier(cooperativeColumn)}
             AND (rw.provinsi ILIKE $3 OR rw.kab_kota ILIKE $3 OR rw.kecamatan ILIKE $3)
         )
       )`
    : "";

  const rows = await sharedQueryRows(
    `SELECT COALESCE(NULLIF(BTRIM(${productExpr}), ''), 'Produk tanpa nama') AS "productName",
            COALESCE(NULLIF(BTRIM(${unitExpr}), ''), 'unit') AS "unitLabel",
            COUNT(*)::int AS transactions,
            COALESCE(SUM(${amountExpr}), 0)::text AS "amountTotal",
            COALESCE(SUM(${quantityExpr}), 0)::text AS "quantityTotal",
            (${unitPriceExpr})::text AS "unitPrice",
            AVG(NULLIF(${amountExpr}, 0))::text AS "averageTransactionValue"
     FROM transaksi_penjualan
     WHERE LOWER(${productExpr}) ~* $1
       AND ${amountExpr} > 0
       ${areaFilter}
     GROUP BY 1, 2
     ORDER BY COUNT(*) DESC, COALESCE(SUM(${amountExpr}), 0) DESC
     LIMIT 4`,
    [commodityPattern(commodityName), areaHint, `%${areaHint}%`],
  );

  return rows.map((row) => {
    const unitPrice = safeAmount(row.unitPrice);
    const averageTransactionValue = safeAmount(row.averageTransactionValue);
    const amountTotal = safeAmount(row.amountTotal);
    const quantityTotal = safeAmount(row.quantityTotal);
    const pricePart =
      unitPrice > 0
        ? `harga satuan terhitung ${formatRupiah(unitPrice)}/${row.unitLabel} dari total nilai/kuantitas`
        : `rata-rata nilai transaksi ${formatRupiah(averageTransactionValue)}; kuantitas tidak cukup untuk harga per unit`;
    return `Shared DB transaksi: ${row.productName}; ${pricePart}; total nilai ${formatRupiah(amountTotal)}; total kuantitas ${quantityTotal.toLocaleString("id-ID")} ${row.unitLabel}; ${row.transactions} transaksi.`;
  });
}

async function dataBackedPriceGuidance(commodityName, areaHint) {
  const [localEvidence, inventoryEvidence, productEvidence, transactionEvidence] = await Promise.all([
    localPriceEvidence(commodityName, areaHint),
    sharedInventoryPriceEvidence(commodityName, areaHint).catch(() => []),
    sharedProductAvailabilityEvidence(commodityName, areaHint).catch(() => []),
    sharedTransactionPriceEvidence(commodityName, areaHint).catch(() => []),
  ]);
  const evidence = [...transactionEvidence, ...inventoryEvidence, ...productEvidence, ...localEvidence].slice(0, 6);

  if (!evidence.length) {
    return [
      "Saya cek data operasional, shared DB, dan sinyal peta, tetapi belum menemukan produk/wilayah yang cocok.",
      "Kirim wilayah lebih spesifik, grade/kualitas, volume, satuan, dan lokasi pickup agar saya cek ulang dari data koperasi.",
      "Saya tidak membuat ticket operator untuk pertanyaan harga informasional.",
    ];
  }

  const hasNumericPrice = evidence.some((line) => /Rp\d/i.test(line));
  return [
    `Saya cek ${commodityName}${areaHint ? ` untuk area ${areaHint}` : ""} dari data transaksi, inventaris, dan sinyal peta yang tersedia.`,
    ...evidence,
    hasNumericPrice
      ? "Angka di atas berasal dari field harga/nilai/kuantitas yang tersedia di data. Harga final tetap perlu grade, volume, lokasi pickup, ongkos angkut, dan sumber hari ini."
      : "Data yang tersedia belum memuat harga satuan eksplisit, jadi saya tidak mengeluarkan angka harga/kg. Pertanyaan ini dijawab otomatis tanpa membuat ticket operator.",
  ];
}

async function ensureCooperative() {
  const cooperative = await queryOne("SELECT id FROM cooperatives WHERE id = $1 LIMIT 1", [cooperativeId]);
  if (!cooperative) {
    throw new Error("WA_PERSONAL_COOPERATIVE_ID belum cocok dengan data koperasi. Jalankan db:setup atau isi env yang benar.");
  }
  return cooperative;
}

async function insertInbound({ providerMessageId, sender, messageText, payloadType, mediaPath, mediaMime, mediaNote, mediaSize }) {
  await ensureCooperative();
  const classified = classifyIntent(messageText, payloadType);
  const policy =
    classified.responseType === "unknown"
      ? {
          shouldQueue: true,
          queueStatus: "Perlu klasifikasi operator 24 jam",
          mode: "manual-review",
          slaText: "Operator akan menindaklanjuti maksimal 24 jam kerja.",
        }
      : classified.responseType === "out-of-scope"
        ? { shouldQueue: false, queueStatus: "Dijawab otomatis", mode: "auto-answer" }
      : classified.agent
        ? reviewPolicy(classified.agent, payloadType, messageText)
        : { shouldQueue: false, queueStatus: "Dijawab otomatis", mode: "auto-answer" };
  const status =
    policy.shouldQueue
      ? "Masuk bridge personal; menunggu tindak lanjut operator"
      : "Dijawab otomatis; riwayat tersimpan di WA Inbox";
  const source = payloadType === "text" ? "WA personal bridge" : `WA personal bridge ${payloadType}`;
  const botReply = [
    classified.bot,
    `Modul tujuan: ${classified.module}.`,
    `Source: ${source}. Confidence: needs-review.`,
    policy.shouldQueue ? "Operator/pengurus wajib review sebelum data dikunci." : "Dijawab otomatis dan tetap tercatat di riwayat WA.",
    mediaNote ? `Media: ${mediaNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const row = await queryOne(
    `INSERT INTO wa_messages (id, cooperative_id, provider_message_id, sender, message, intent, module, bot_reply, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (provider_message_id) WHERE provider_message_id IS NOT NULL DO UPDATE
       SET message = EXCLUDED.message,
           intent = EXCLUDED.intent,
           module = EXCLUDED.module,
           bot_reply = EXCLUDED.bot_reply,
           status = EXCLUDED.status
     RETURNING id, cooperative_id AS "cooperativeId", provider_message_id AS "providerMessageId", sender, message, module`,
    [
      newId("wa"),
      cooperativeId,
      providerMessageId,
      sender,
      messageText || `[${payloadType}] Pesan media tanpa caption.`,
      classified.intent,
      classified.module,
      botReply,
      status,
    ],
  );

  const queueId = policy.shouldQueue ? queueIdForWaIntake(row.id, row.providerMessageId) : null;
  if (policy.shouldQueue) {
    await queryOne(
      `INSERT INTO operator_queue (id, cooperative_id, sender, source, summary, status, module)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE
         SET summary = EXCLUDED.summary,
             status = EXCLUDED.status,
             module = EXCLUDED.module,
             updated_at = now()
       RETURNING id`,
      [
        queueId,
        row.cooperativeId,
        row.sender,
        source,
        summarize(row.message),
        policy.queueStatus,
        row.module,
      ],
    );
  }

  if (mediaPath) {
    await queryOne(
      `INSERT INTO anak_sarengklek_media_evidence
       (id, cooperative_id, related_record_type, related_record_id, media_type, storage_uri, redacted_label, caption, verification_status, source_label, metadata)
       VALUES ($1, $2, 'wa_messages', $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [
        `media-${digest(`${providerMessageId}:${mediaPath}`).slice(0, 8).toLowerCase()}`,
        row.cooperativeId,
        row.id,
        payloadType,
        mediaPath,
        `${payloadType.toUpperCase()} ${digest(providerMessageId || row.id).slice(0, 6)}`,
        summarize(messageText || mediaNote),
        "Menunggu review operator",
        source,
        JSON.stringify({
          providerMessageId,
          mimeType: mediaMime,
          mediaSize,
          mediaNote,
          personalBridge: true,
          ocrEnabled,
        }),
      ],
    );
  }

  const fallbackReply =
    classified.responseType === "menu"
      ? menuText()
      : classified.responseType === "out-of-scope"
        ? formatSections([
            {
              title: "Di Luar Scope",
              lines: [
                "Mohon maaf, saya hanya bisa membantu topik Lumbung Bersama/koperasi desa: potensi komoditas, harga koperasi, stok, buyer readiness, pembiayaan readiness, dokumen, laporan, dan integrasi.",
                "Balas menu untuk memilih agent koperasi.",
              ],
            },
          ])
      : classified.responseType === "unknown"
        ? formatSections([
            { title: "Klasifikasi", lines: ["Mohon maaf, saya belum yakin kebutuhan ini masuk ke agent mana.", "Saya buat antrean operator agar pesan ini tidak hilang.", queueLine(queueId, policy), policy.slaText] },
            { title: "Arahkan ulang", lines: ["Anda juga bisa balas menu lalu pilih agent, atau tulis kebutuhan dengan komoditas, wilayah, volume, dan tujuan."] },
            { title: "Catatan", lines: [closingLine(false), quickActions()] },
          ])
        : await buildAgentReply({
            agent: classified.agent ?? agentRouter[0],
            queueId,
            mediaNote,
            payloadType,
            messageText: row.message,
          });
  const reply =
    classified.responseType === "agent"
      ? await finalizeReplyWithAi({
          agent: classified.agent ?? agentRouter[0],
          messageText: row.message,
          payloadType,
          reviewMode: policy.mode,
          queueId,
          fallbackReply,
        })
      : fallbackReply;

  await queryOne("UPDATE wa_messages SET bot_reply = $1 WHERE id = $2 RETURNING id", [reply, row.id]);

  return { waMessageId: row.id, queueId, module: row.module, reply };
}

function quickReplyButtons() {
  return [
    { buttonId: "menu", buttonText: { displayText: "Menu agent" }, type: 1 },
    { buttonId: "puas", buttonText: { displayText: "Selesai" }, type: 1 },
    { buttonId: "operator", buttonText: { displayText: "Panggil operator" }, type: 1 },
  ];
}

async function sendReply(sock, remoteJid, reply, quoted) {
  try {
    await sock.sendMessage(
      remoteJid,
      {
        text: reply,
        footer: "Kopdes Lumbung Bersama",
        buttons: quickReplyButtons(),
        headerType: 1,
      },
      { quoted },
    );
  } catch (error) {
    console.warn(`Tombol WA tidak tersedia, fallback teks: ${error instanceof Error ? error.message : "unknown error"}`);
    await sock.sendMessage(remoteJid, { text: reply }, { quoted });
  }
}

async function main() {
  const baileys = await import("@whiskeysockets/baileys");
  const makeWASocket = baileys.default;
  const { DisconnectReason, downloadContentFromMessage, useMultiFileAuthState: getMultiFileAuthState } = baileys;
  const { state, saveCreds } = await getMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    browser: ["Lumbung Bersama", "Chrome", "1.0"],
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    if (update.qr) {
      void writeBridgeState({ status: "qr", qr: update.qr });
      console.log("\nScan QR ini dari WhatsApp biasa: Perangkat tertaut > Tautkan perangkat.\n");
      qrcode.generate(update.qr, { small: true });
    }
    if (update.connection === "open") {
      void writeBridgeState({ status: "connected", connectedAt: new Date().toISOString() });
      console.log("WA personal bridge terhubung. Pesan masuk akan dicatat ke queue.");
    }
    if (update.connection === "close") {
      const statusCode = update.lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      void writeBridgeState({
        status: shouldReconnect ? "disconnected" : "logged-out",
        lastDisconnect: `status-${statusCode ?? "unknown"}`,
      });
      console.log(`WA personal bridge terputus. reconnect=${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => {
          main().catch((error) => {
            console.error(error instanceof Error ? error.message : error);
            process.exit(1);
          });
        }, 2500);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const item of messages) {
      try {
        if (item.key?.fromMe || !item.message) continue;
        const providerMessageId = item.key?.id ? `personal:${item.key.id}` : `personal:${randomUUID()}`;
        const remoteJid = item.key?.remoteJid || item.key?.participant || "";
        const sender = maskJid(remoteJid);
        const extracted = await extractMessage(item.message, downloadContentFromMessage, providerMessageId);
        const result = await insertInbound({
          providerMessageId,
          sender,
          messageText: extracted.messageText,
          payloadType: extracted.payloadType,
          mediaPath: extracted.mediaPath,
          mediaMime: extracted.mediaMime,
          mediaNote: extracted.mediaNote,
          mediaSize: extracted.mediaSize,
        });
        if (remoteJid && result.reply) {
          await sendReply(sock, remoteJid, result.reply, item);
        }
        console.log(`Pesan masuk dicatat: ${result.queueId} -> ${result.module}`);
      } catch (error) {
        console.error(`Gagal memproses pesan WA personal: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
  });
}

process.on("SIGINT", async () => {
  console.log("Menutup WA personal bridge.");
  await pool.end().catch(() => undefined);
  await sharedPool?.end().catch(() => undefined);
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end().catch(() => undefined);
  await sharedPool?.end().catch(() => undefined);
  process.exit(0);
});

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});

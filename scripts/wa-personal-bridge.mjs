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
  if (normalized === "puas" || normalized === "tidak" || normalized === "tidak puas" || welcomeTriggers.has(normalized)) {
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

function priceGuidance(commodityName, areaHint) {
  const normalized = normalizeRouterText(commodityName);
  const unit =
    normalized.includes("sawit") || normalized.includes("tbs")
      ? "Rp/kg TBS"
      : normalized.includes("beras") || normalized.includes("padi")
        ? "Rp/kg atau Rp/karung sesuai jenis beras/gabah"
        : normalized.includes("cabai")
          ? "Rp/kg sesuai varietas dan pasar"
          : normalized.includes("kopi")
            ? "Rp/kg sesuai green bean/cherry/grade"
            : "satuan lokal sesuai komoditas";
  return [
    `Harga ${commodityName} tidak punya satu angka nasional; ${areaHint ? `untuk area ${areaHint}` : "area belum disebut"}, harga dibaca per wilayah, grade, volume, dan ongkos angkut.`,
    `Format cek koperasi: ${unit}; rujukan harus berasal dari harga resmi/kurasi lokal hari ini atau input operator lapangan.`,
    "Untuk negosiasi awal, jangan kunci harga sebelum ada kabupaten/kecamatan, grade/kualitas, volume, satuan, lokasi pickup, dan biaya angkut.",
  ];
}

function buildOperationalAnswer({ agent, queueId, mediaNote, payloadType = "text", messageText }) {
  const normalized = normalizeRouterText(messageText);
  const commodityName = extractCommodityName(messageText);
  const areaHint = extractAreaHint(messageText);
  const policy = reviewPolicy(agent, payloadType, messageText);

  if (normalized === "puas") {
    return closingLine(true);
  }

  if (normalized === "tidak" || normalized === "tidak puas") {
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
    answerLines.push(...priceGuidance(commodityName, areaHint));
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
    answerLines.push("Yang harus dilengkapi: nominal, tujuan, rencana bayar, sumber pembayaran, bukti usaha/panen, dan status anggota terverifikasi.");
    answerLines.push("Jika data tidak lengkap atau tidak masuk akal, sistem menandai belum layak masuk review komite sampai data diperbaiki.");
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

function buildAgentReply({ agent, queueId, mediaNote, payloadType, messageText }) {
  const lines = [
    buildOperationalAnswer({ agent, queueId, mediaNote, payloadType, messageText }),
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
  if (normalized === "puas" || normalized === "tidak" || normalized === "tidak puas") {
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

  const reply =
    classified.responseType === "menu"
      ? menuText()
      : classified.responseType === "unknown"
        ? formatSections([
            { title: "Klasifikasi", lines: ["Mohon maaf, saya belum yakin kebutuhan ini masuk ke agent mana.", "Saya buat antrean operator agar pesan ini tidak hilang.", queueLine(queueId, policy), policy.slaText] },
            { title: "Arahkan ulang", lines: ["Anda juga bisa balas menu lalu pilih agent, atau tulis kebutuhan dengan komoditas, wilayah, volume, dan tujuan."] },
            { title: "Catatan", lines: [closingLine(false), quickActions()] },
          ])
        : buildAgentReply({
            agent: classified.agent ?? agentRouter[0],
            queueId,
            mediaNote,
            payloadType,
            messageText: row.message,
          });

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
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end().catch(() => undefined);
  process.exit(0);
});

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});

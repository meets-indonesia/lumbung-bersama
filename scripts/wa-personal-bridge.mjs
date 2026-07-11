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
const welcomeTriggers = new Set(["halo", "hai", "hi", "hello", "menu", "bantuan", "help", "start", "mulai"]);

const agentRouter = [
  {
    id: "1",
    name: "Agen Peta Potensi Desa",
    module: "Peta Unggulan / Komoditas Unggulan",
    keywords: ["peta", "potensi", "desa", "wilayah", "komoditas unggulan", "unggulan desa", "umkm"],
    prompt: "Tanyakan potensi wilayah, komoditas unggulan, atau UMKM lokal.",
    bot: "Saya arahkan ke Agen Peta Potensi Desa. Saya akan bantu susun ringkasan potensi, komoditas, sumber, dan data yang perlu diverifikasi.",
  },
  {
    id: "2",
    name: "Agen Stok dan Gudang",
    module: "Gerai / Stock Readiness",
    keywords: ["stok", "gerai", "gudang", "habis", "restock", "barang masuk", "barang keluar", "panen", "kg", "kilo", "ton", "karung"],
    prompt: "Tanyakan stok, panen, barang masuk, barang keluar, restock, atau kapasitas gudang.",
    bot: "Saya arahkan ke Agen Stok dan Gudang. Data akan masuk antrean operator untuk cek volume, satuan, bukti, dan kesiapan stok.",
  },
  {
    id: "3",
    name: "Agen Buyer Matching",
    module: "Buyer Matching Lite",
    keywords: ["buyer", "pembeli", "mitra", "offtaker", "order", "pesanan", "carikan", "kontak", "outreach", "negosiasi"],
    prompt: "Tanyakan calon pembeli, script outreach, atau kesiapan produk untuk buyer.",
    bot: "Saya arahkan ke Agen Buyer Matching. Saya bantu buat draft kebutuhan buyer dan next action; kontak buyer tetap harus disetujui operator.",
  },
  {
    id: "4",
    name: "Agen Harga dan Negosiasi",
    module: "Market Price Check & Negotiation Agent",
    keywords: ["harga", "berapa", "price", "nego", "tawar", "margin", "floor price", "cabai", "beras", "kopi"],
    prompt: "Tanyakan harga, risiko harga, atau bahan negosiasi.",
    bot: "Saya arahkan ke Agen Harga dan Negosiasi. Jawaban akan memakai sinyal yang tersedia dan menandai caveat bila sumber harga belum lengkap.",
  },
  {
    id: "5",
    name: "Agen Pembiayaan Readiness",
    module: "Simpan Pinjam / Financing Readiness",
    keywords: ["pinjam", "pinjaman", "pembiayaan", "modal", "angsuran", "kredit", "komite", "bayar", "cicil", "pupuk", "benih"],
    prompt: "Tanyakan draft pinjaman, tujuan pembiayaan, dokumen, atau kesiapan review komite.",
    bot: "Saya arahkan ke Agen Pembiayaan Readiness. Ini hanya readiness dan checklist, bukan persetujuan otomatis.",
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
    bot: "Saya arahkan ke Agen Bukti dan Dokumen. File akan dibaca otomatis jika memungkinkan dan tetap masuk review operator.",
  },
  {
    id: "7",
    name: "Agen Laporan Aksi",
    module: "Laporan Aksi",
    keywords: ["laporan", "ringkasan", "rapat", "export", "csv", "aksi", "keputusan", "rekomendasi"],
    prompt: "Tanyakan ringkasan laporan, data kurang, atau keputusan aksi koperasi.",
    bot: "Saya arahkan ke Agen Laporan Aksi. Saya bantu susun executive summary, bukti, gap, dan keputusan yang masih pending.",
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
  const items = agentRouter.map((agent) => `${agent.id}. ${agent.name} - ${agent.prompt}`).join("\n");
  return [
    "Selamat datang di Kopdes Lumbung Bersama.",
    "Saya asisten WA untuk mencatat kebutuhan warga, membaca bukti, dan mengarahkan ke agent koperasi.",
    "",
    "Pilih agent dengan angka, atau langsung tulis kebutuhan Anda:",
    items,
    "",
    "Contoh: stok beras habis, carikan pembeli kopi 1 ton, baca nota PDF ini, ajukan pinjaman pupuk 1 juta.",
    "Catatan: semua jawaban adalah draft operasional dan tetap perlu verifikasi operator.",
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

function buildUnknownReply() {
  return [
    "Mohon maaf, saya belum yakin kebutuhan ini masuk ke agent mana.",
    "Silakan pilih angka agent atau tulis dengan lebih spesifik.",
    "",
    menuText(),
  ].join("\n");
}

function buildAgentReply({ agent, queueId, mediaNote, payloadType, messageText }) {
  const lines = [
    agent.bot,
    "",
    `Nomor antrean: ${queueId}`,
    `Modul dashboard: ${agent.module}`,
  ];

  if (payloadType !== "text") {
    lines.push(`Analisis file: ${mediaNote || "File diterima dan menunggu review operator."}`);
  }

  if (messageText) {
    lines.push(`Ringkasan masuk: ${summarize(messageText)}`);
  }

  lines.push(
    "",
    "Data ini sudah masuk dashboard operator. Operator/pengurus tetap memverifikasi sebelum data dikunci atau ditindaklanjuti.",
    "Ketik menu untuk melihat pilihan agent lain.",
  );

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
  const text =
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
  const status =
    payloadType === "text"
      ? "Masuk bridge personal; menunggu verifikasi operator"
      : "Masuk bridge personal; media dibaca otomatis terbatas dan perlu review operator";
  const source = payloadType === "text" ? "WA personal bridge" : `WA personal bridge ${payloadType}`;
  const botReply = [
    classified.bot,
    `Modul tujuan: ${classified.module}.`,
    `Source: ${source}. Confidence: needs-review.`,
    "Operator/pengurus wajib review sebelum data dikunci.",
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

  const queueId = queueIdForWaIntake(row.id, row.providerMessageId);
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
      "Menunggu Dicek",
      row.module,
    ],
  );

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
        ? buildUnknownReply()
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
          await sock.sendMessage(remoteJid, { text: result.reply }, { quoted: item });
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

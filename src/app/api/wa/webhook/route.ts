import { createHmac, timingSafeEqual } from "node:crypto";
import { waIntents } from "@/lib/demo-data";
import {
  describeCommodityProfiles,
  findCommodityProfilesForMessage,
} from "@/lib/commodity-intelligence";
import { formatFormalWaReply } from "@/lib/formal-replies";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";
import { ensureOperatorQueueForWaMessage } from "@/lib/wa-operator-queue";
import { getWaSetupStatus, maskPhoneForDisplay, normalizeWaDisplayName } from "../status";

export const runtime = "nodejs";

type WhatsAppMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  audio?: { id?: string; mime_type?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: WhatsAppMessage[];
      };
    }>;
  }>;
};

type WaMessageRow = {
  id: string;
  cooperativeId: string;
  providerMessageId: string | null;
  sender: string;
  message: string;
  intent: string;
  module: string;
  status: string;
};

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function verifySignature(rawBody: string, request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return {
      ok: false,
      response: Response.json(
        {
          error: "WHATSAPP_APP_SECRET_REQUIRED",
          message: "Webhook produksi wajib mengisi WHATSAPP_APP_SECRET.",
          status: "setup-required",
          setup: getWaSetupStatus(),
        },
        { status: 503 },
      ),
    };
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) {
    return {
      ok: false,
      response: Response.json({ error: "SIGNATURE_REQUIRED" }, { status: 401 }),
    };
  }

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  if (!safeEqual(signature, expected)) {
    return {
      ok: false,
      response: Response.json({ error: "INVALID_SIGNATURE" }, { status: 401 }),
    };
  }

  return { ok: true, response: null };
}

function selectIntent(message: string) {
  const normalized = message.toLowerCase();
  return (
    waIntents.find((intent) => normalized.includes(intent.sample.split(" ")[0].toLowerCase())) ??
    waIntents[0]
  );
}

function extractMessages(payload: WhatsAppWebhookPayload) {
  const messages: Array<WhatsAppMessage & { contactName?: string; waId?: string }> = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const contacts = change.value?.contacts ?? [];
      const contactByWaId = new Map(contacts.map((contact) => [contact.wa_id, contact]));

      for (const message of change.value?.messages ?? []) {
        const contact = contactByWaId.get(message.from);
        messages.push({
          ...message,
          contactName: contact?.profile?.name,
          waId: contact?.wa_id,
        });
      }
    }
  }

  return messages;
}

function messageText(message: WhatsAppMessage) {
  if (message.type === "text" && message.text?.body) return message.text.body;
  if (message.type === "image") return message.image?.caption || "[gambar dari WhatsApp]";
  if (message.type === "document") return message.document?.caption || "[dokumen dari WhatsApp]";
  if (message.type === "audio") return "[voice-note dari WhatsApp]";
  return `[pesan:${message.type ?? "unknown"}]`;
}

function senderLabel(message: WhatsAppMessage & { contactName?: string; waId?: string }) {
  const name = normalizeWaDisplayName(message.contactName);
  if (name) return name;

  const waId = message.waId || message.from;
  return waId ? `Warga WhatsApp ${maskPhoneForDisplay(waId)}` : "Warga WhatsApp";
}

function queueSource(message: WhatsAppMessage) {
  if (message.type === "audio") return "WhatsApp voice note";
  if (message.type === "image") return "WhatsApp image";
  if (message.type === "document") return "WhatsApp document";
  if (message.type === "text") return "WhatsApp text";
  return "WhatsApp webhook";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const setup = getWaSetupStatus();

  if (!expectedToken) {
    return Response.json(
      {
        error: "WHATSAPP_VERIFY_TOKEN_REQUIRED",
        message: "Isi WHATSAPP_VERIFY_TOKEN sebelum mendaftarkan webhook.",
        status: "setup-required",
        setup,
      },
      { status: 503 },
    );
  }

  if (mode === "subscribe" && verifyToken && safeEqual(verifyToken, expectedToken) && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return Response.json({ error: "WEBHOOK_VERIFICATION_FAILED", status: "ready", setup }, { status: 403 });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const rawBody = await request.text();
  const signature = verifySignature(rawBody, request);
  if (!signature.ok) return signature.response!;
  const setup = getWaSetupStatus();

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return Response.json(
      { error: "INVALID_WEBHOOK_JSON", message: "Payload webhook bukan JSON valid.", setup },
      { status: 400 },
    );
  }
  const inboundMessages = extractMessages(payload);

  if (!inboundMessages.length) {
    return Response.json({ received: true, stored: 0, queued: 0, setup });
  }

  const cooperativeId =
    process.env.WEBHOOK_COOPERATIVE_ID?.trim() ||
    process.env.DEFAULT_COOPERATIVE_ID?.trim() ||
    "kop-wanasari";
  const cooperative = await queryOne<{ id: string; province: string }>(
    "SELECT id, province FROM cooperatives WHERE id = $1 LIMIT 1",
    [cooperativeId],
  );

  if (!cooperative) {
    return Response.json(
      {
        error: "COOPERATIVE_NOT_FOUND",
        message: "WEBHOOK_COOPERATIVE_ID atau DEFAULT_COOPERATIVE_ID belum cocok dengan data koperasi.",
        status: "setup-required",
        setup,
      },
      { status: 404 },
    );
  }

  let stored = 0;
  let queued = 0;
  for (const inbound of inboundMessages) {
    const text = messageText(inbound);
    const intent = selectIntent(text);
    const needsTranscription = inbound.type === "audio";
    const commodityProfiles = await findCommodityProfilesForMessage(text, cooperative.province).catch(() => []);
    const commodityDetails = describeCommodityProfiles(commodityProfiles);
    const reply = needsTranscription
      ? formatFormalWaReply({
        summary:
          "Voice note sudah diterima. Transkripsi live membutuhkan koneksi media WhatsApp dan speech-to-text sebelum isi pesan dapat dibaca otomatis.",
        details: ["Status: menunggu transkripsi dan cek operator.", "Modul tujuan: Suara Warga."],
        nextSteps: [
          "Operator mengambil media WhatsApp setelah env produksi aktif.",
          "Hasil transkripsi dicek ulang sebelum masuk data koperasi.",
        ],
      })
      : formatFormalWaReply({
        summary: intent.bot,
        details: commodityDetails.length
          ? [`Modul tujuan: ${intent.module}.`, ...commodityDetails]
          : [`Modul tujuan: ${intent.module}.`],
        nextSteps: [
          "Operator koperasi mengecek data dan bukti pendukung.",
          "Jika ada data kurang, warga akan menerima pertanyaan lanjutan.",
        ],
      });

    const inserted = await queryOne<WaMessageRow>(
      `INSERT INTO wa_messages (id, cooperative_id, provider_message_id, sender, message, intent, module, bot_reply, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (provider_message_id) WHERE provider_message_id IS NOT NULL DO NOTHING
       RETURNING id,
         cooperative_id AS "cooperativeId",
         provider_message_id AS "providerMessageId",
         sender,
         message,
         intent,
         module,
         status`,
      [
        newId("wa"),
        cooperative.id,
        inbound.id || null,
        senderLabel(inbound),
        text,
        needsTranscription ? "voice-note" : intent.label,
        needsTranscription ? "Suara Warga" : intent.module,
        reply,
        needsTranscription
          ? "Masuk webhook, menunggu transkripsi"
          : "Masuk webhook, menunggu verifikasi operator",
      ],
    );
    if (inserted) {
      stored += 1;
      const queue = await ensureOperatorQueueForWaMessage({
        waMessageId: inserted.id,
        providerMessageId: inserted.providerMessageId,
        cooperativeId: inserted.cooperativeId,
        sender: inserted.sender,
        source: queueSource(inbound),
        message: inserted.message,
        module: inserted.module,
      });
      if (queue) queued += 1;
    }
  }

  return Response.json({ received: true, stored, queued, setup });
}

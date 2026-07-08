import { createHmac, timingSafeEqual } from "node:crypto";
import { waIntents } from "@/lib/demo-data";
import {
  describeCommodityProfiles,
  findCommodityProfilesForMessage,
} from "@/lib/commodity-intelligence";
import { formatFormalWaReply } from "@/lib/formal-replies";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";

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
  if (message.type === "document") return message.document?.caption || `[dokumen: ${message.document?.filename ?? "tanpa nama"}]`;
  if (message.type === "audio") return `[voice-note:${message.audio?.id ?? "tanpa-id"}]`;
  return `[pesan:${message.type ?? "unknown"}]`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!expectedToken) {
    return Response.json(
      {
        error: "WHATSAPP_VERIFY_TOKEN_REQUIRED",
        message: "Isi WHATSAPP_VERIFY_TOKEN sebelum mendaftarkan webhook.",
      },
      { status: 503 },
    );
  }

  if (mode === "subscribe" && verifyToken && safeEqual(verifyToken, expectedToken) && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return Response.json({ error: "WEBHOOK_VERIFICATION_FAILED" }, { status: 403 });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const rawBody = await request.text();
  const signature = verifySignature(rawBody, request);
  if (!signature.ok) return signature.response!;

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  const inboundMessages = extractMessages(payload);

  if (!inboundMessages.length) {
    return Response.json({ received: true, stored: 0 });
  }

  const cooperative = await queryOne<{ id: string; province: string }>(
    "SELECT id, province FROM cooperatives ORDER BY created_at ASC LIMIT 1",
  );

  if (!cooperative) {
    return Response.json({ error: "COOPERATIVE_NOT_FOUND" }, { status: 404 });
  }

  let stored = 0;
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

    await queryOne(
      `INSERT INTO wa_messages (id, cooperative_id, sender, message, intent, module, bot_reply, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newId("wa"),
        cooperative.id,
        inbound.contactName || inbound.waId || inbound.from || "Warga WhatsApp",
        text,
        needsTranscription ? "voice-note" : intent.label,
        needsTranscription ? "Suara Warga" : intent.module,
        reply,
        needsTranscription
          ? "Masuk webhook, menunggu transkripsi"
          : "Masuk webhook, menunggu verifikasi operator",
      ],
    );
    stored += 1;
  }

  return Response.json({ received: true, stored });
}

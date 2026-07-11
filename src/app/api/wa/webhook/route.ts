import { createHmac, timingSafeEqual } from "node:crypto";
import {
  describeCommodityProfiles,
  findCommodityProfilesForMessage,
} from "@/lib/commodity-intelligence";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";
import {
  buildWaOperationalReply,
  buildWaAgentDraft,
  displayTextForPayload,
  ensureOperatorQueueForWaMessage,
  fallbackIntentForPayload,
  getWaReviewPolicy,
  normalizeWaPayloadType,
  queueSourceForPayload,
  selectWaAgentIntent,
  type WaPayloadType,
} from "@/lib/wa-operator-queue";
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

function payloadTypeForMessage(message: WhatsAppMessage): WaPayloadType {
  return normalizeWaPayloadType(message.type);
}

function rawTextForMessage(message: WhatsAppMessage) {
  if (message.type === "text") return message.text?.body;
  if (message.type === "image") return message.image?.caption;
  if (message.type === "document") return message.document?.caption;
  return undefined;
}

function messageText(message: WhatsAppMessage) {
  return displayTextForPayload(payloadTypeForMessage(message), rawTextForMessage(message) ?? "");
}

function senderLabel(message: WhatsAppMessage & { contactName?: string; waId?: string }) {
  const name = normalizeWaDisplayName(message.contactName);
  if (name) return name;

  const waId = message.waId || message.from;
  return waId ? `Warga WhatsApp ${maskPhoneForDisplay(waId)}` : "Warga WhatsApp";
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
  const setup = getWaSetupStatus();
  if (setup.webhook.status !== "ready") {
    return Response.json(
      {
        error: "WHATSAPP_WEBHOOK_NOT_CONFIGURED",
        message: "Webhook produksi wajib mengisi WHATSAPP_VERIFY_TOKEN dan WHATSAPP_APP_SECRET.",
        status: "setup-required",
        setup,
      },
      { status: 503 },
    );
  }

  const signature = verifySignature(rawBody, request);
  if (!signature.ok) return signature.response!;

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
  let mediaQueued = 0;
  for (const inbound of inboundMessages) {
    const payloadType = payloadTypeForMessage(inbound);
    const rawText = rawTextForMessage(inbound);
    const text = messageText(inbound);
    const intent = rawText?.trim()
      ? selectWaAgentIntent(text)
      : fallbackIntentForPayload(payloadType);
    const draft = buildWaAgentDraft({
      intent,
      payloadType,
      source: queueSourceForPayload(payloadType, "WhatsApp webhook"),
      message: text,
    });
    const reviewPolicy = getWaReviewPolicy(intent, payloadType, text);
    const commodityProfiles = await findCommodityProfilesForMessage(text, cooperative.province).catch(() => []);
    const commodityDetails = describeCommodityProfiles(commodityProfiles);
    const preliminaryReply = buildWaOperationalReply({
      intent,
      draft,
      message: text,
      payloadType,
      commodityDetails,
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
        intent.label,
        draft.module,
        preliminaryReply,
        reviewPolicy.shouldQueue
          ? "Masuk webhook; menunggu tindak lanjut operator"
          : "Dijawab otomatis; riwayat tersimpan di WA Inbox",
      ],
    );
    if (inserted) {
      stored += 1;
      const queue = reviewPolicy.shouldQueue
        ? await ensureOperatorQueueForWaMessage({
            queryOne,
            waMessageId: inserted.id,
            providerMessageId: inserted.providerMessageId,
            cooperativeId: inserted.cooperativeId,
            sender: inserted.sender,
            source: draft.source,
            message: inserted.message,
            module: inserted.module,
            status: draft.queueStatus,
          })
        : null;
      const reply = buildWaOperationalReply({
        intent,
        draft,
        message: inserted.message,
        payloadType,
        queueId: queue?.id ?? null,
        commodityDetails,
      });
      await queryOne("UPDATE wa_messages SET bot_reply = $1 WHERE id = $2 RETURNING id", [reply, inserted.id]);
      if (queue) queued += 1;
      if (payloadType !== "text") mediaQueued += 1;
    }
  }

  return Response.json({ received: true, stored, queued, mediaQueued, setup });
}

import { requireAuthenticatedRequest, requireOperationalMutationRole } from "@/lib/auth";
import { checkRateLimit, fetchWithTimeout } from "@/lib/external-fetch";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";
import {
  getWaSetupStatus,
  maskPhoneForDisplay,
  providerErrorMeta,
  providerMessageIdFromPayload,
} from "../status";

export const runtime = "nodejs";

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;
  const roleResponse = requireOperationalMutationRole(auth.user);
  if (roleResponse) return roleResponse;
  const cooperativeId = auth.user.cooperativeId;
  if (!cooperativeId) {
    return Response.json(
      {
        error: "COOPERATIVE_SCOPE_REQUIRED",
        message: "Akun operator belum tersambung ke workspace koperasi untuk mengirim pesan.",
      },
      { status: 409 },
    );
  }

  const rateLimit = checkRateLimit(request, "wa-send", { limit: 10, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
  const setup = getWaSetupStatus();

  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
    message?: string;
    type?: string;
  };
  const outboundType = body.type ?? "text";

  if (outboundType !== "text") {
    return Response.json(
      {
        error: "WHATSAPP_MEDIA_SEND_NOT_IMPLEMENTED",
        message:
          "Outbound media belum dikirim otomatis. Simpan sebagai draft follow-up dan minta operator memakai kanal resmi.",
        status: "draft-only",
        delivery: {
          status: "draft-only",
          caveat: "Image, audio, dan document send memerlukan implementasi payload media Graph API terpisah.",
        },
        setup,
      },
      { status: 501 },
    );
  }

  if (setup.send.status !== "ready" || !token || !phoneNumberId) {
    return Response.json(
      {
        error: "WHATSAPP_SEND_NOT_CONFIGURED",
        message:
          "Pengiriman live menunggu env WhatsApp. Draft outbound belum diklaim terkirim.",
        status: "setup-required",
        delivery: {
          status: "setup-required",
          caveat: "WHATSAPP_BUSINESS_TOKEN dan WHATSAPP_PHONE_NUMBER_ID wajib sebelum Graph API dipanggil.",
        },
        setup,
      },
      { status: 503 },
    );
  }

  const to = normalizePhone(body.to ?? "");
  const message = body.message?.trim();

  if (to.length < 8 || to.length > 15 || !message) {
    return Response.json(
      { error: "INVALID_MESSAGE", message: "Nomor tujuan dan isi pesan wajib valid." },
      { status: 400 },
    );
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      },
      { timeoutMs: 8000, label: "WhatsApp Graph API" },
    );
  } catch {
    return Response.json(
      {
        error: "WHATSAPP_SEND_UNAVAILABLE",
        message: "WhatsApp Graph API tidak merespons sebelum batas waktu.",
        status: "ready",
        delivery: {
          status: "not-sent",
          caveat: "Tidak ada klaim terkirim karena Graph API timeout.",
        },
        setup,
      },
      { status: 504 },
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return Response.json(
      {
        error: "WHATSAPP_SEND_FAILED",
        message: "WhatsApp Graph API menolak pengiriman.",
        status: "ready",
        delivery: {
          status: "not-sent",
          caveat: "Tidak ada klaim terkirim karena provider menolak payload.",
        },
        provider: providerErrorMeta(payload),
        setup,
      },
      { status: 502 },
    );
  }

  const providerMessageId = providerMessageIdFromPayload(payload);
  await queryOne(
    `INSERT INTO wa_messages (id, cooperative_id, provider_message_id, sender, message, intent, module, bot_reply, status)
     VALUES ($1, $2, $3, $4, $5, 'outbound', 'WA Center', $6, 'Dikirim lewat WhatsApp Graph API')
     ON CONFLICT (provider_message_id) WHERE provider_message_id IS NOT NULL DO NOTHING`,
    [
      newId("wa"),
      cooperativeId,
      providerMessageId,
      auth.user.fullName,
      message,
      `Terkirim ke ${maskPhoneForDisplay(to)}.`,
    ],
  );

  return Response.json({
    ok: true,
    status: "ready",
    message: "WhatsApp terkirim lewat Graph API.",
    delivery: {
      status: "sent",
      caveat: "Status terkirim hanya diberikan setelah Graph API mengembalikan response sukses.",
    },
    provider: {
      messageId: providerMessageId,
    },
    setup,
  });
}

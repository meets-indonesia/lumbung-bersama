import { requireAuthenticatedRequest } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";

  if (!token || !phoneNumberId) {
    return Response.json(
      {
        error: "WHATSAPP_SEND_NOT_CONFIGURED",
        message:
          "Isi WHATSAPP_BUSINESS_TOKEN dan WHATSAPP_PHONE_NUMBER_ID untuk mengirim pesan.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
    message?: string;
  };
  const to = normalizePhone(body.to ?? "");
  const message = body.message?.trim();

  if (to.length < 8 || to.length > 15 || !message) {
    return Response.json(
      { error: "INVALID_MESSAGE", message: "Nomor tujuan dan isi pesan wajib valid." },
      { status: 400 },
    );
  }

  const response = await fetch(
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
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return Response.json(
      {
        error: "WHATSAPP_SEND_FAILED",
        message: "WhatsApp Graph API menolak pengiriman.",
        details: payload,
      },
      { status: 502 },
    );
  }

  const cooperative = await queryOne<{ id: string }>(
    "SELECT id FROM cooperatives ORDER BY created_at ASC LIMIT 1",
  );

  if (cooperative) {
    await queryOne(
      `INSERT INTO wa_messages (id, cooperative_id, sender, message, intent, module, bot_reply, status)
       VALUES ($1, $2, $3, $4, 'outbound', 'WA Center', $5, 'Dikirim lewat WhatsApp Graph API')`,
      [
        newId("wa"),
        cooperative.id,
        auth.user!.fullName,
        message,
        `Terkirim ke ${to}.`,
      ],
    );
  }

  return Response.json({ ok: true, provider: payload });
}

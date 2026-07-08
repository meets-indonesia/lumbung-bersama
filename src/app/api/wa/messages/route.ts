import { waIntents } from "@/lib/demo-data";
import { requireAuthenticatedRequest } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";
import {
  describeCommodityProfiles,
  findCommodityProfilesForMessage,
} from "@/lib/commodity-intelligence";
import { formatFormalWaReply } from "@/lib/formal-replies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    sender?: string;
    message?: string;
    intentId?: string;
  };
  const message = body.message?.trim();

  if (!message) {
    return Response.json({ error: "MESSAGE_REQUIRED" }, { status: 400 });
  }

  const cooperative = await queryOne<{ id: string; province: string }>(
    "SELECT id, province FROM cooperatives ORDER BY created_at ASC LIMIT 1",
  );

  if (!cooperative) {
    return Response.json({ error: "COOPERATIVE_NOT_FOUND" }, { status: 404 });
  }

  const selected =
    waIntents.find((intent) => intent.id === body.intentId) ??
    waIntents.find((intent) =>
      message.toLowerCase().includes(intent.sample.split(" ")[0].toLowerCase()),
    ) ??
    waIntents[0];

  const status = process.env.WHATSAPP_BUSINESS_TOKEN
    ? "Siap dikirim lewat WhatsApp"
    : "Tersimpan, menunggu env WhatsApp";
  const commodityProfiles = await findCommodityProfilesForMessage(message, cooperative.province).catch(() => []);
  const commodityDetails = describeCommodityProfiles(commodityProfiles);
  const botReply = formatFormalWaReply({
    summary: selected.bot,
    details: commodityDetails.length
      ? [
        `Modul tujuan: ${selected.module}.`,
        ...commodityDetails,
      ]
      : [`Modul tujuan: ${selected.module}.`],
    nextSteps: [
      "Operator koperasi mengecek kelengkapan data.",
      "Bila perlu, sistem mengirim pertanyaan lanjutan lewat WhatsApp.",
      "Data yang sudah valid masuk ke dashboard untuk tindak lanjut.",
    ],
  });

  const row = await queryOne(
    `INSERT INTO wa_messages (id, cooperative_id, sender, message, intent, module, bot_reply, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, sender, message, intent, module, bot_reply AS "botReply", status, created_at AS "createdAt"`,
    [
      newId("wa"),
      cooperative.id,
      body.sender || "Warga",
      message,
      selected.label,
      selected.module,
      botReply,
      status,
    ],
  );

  return Response.json({ message: row });
}

import { waIntents } from "@/lib/demo-data";
import { requireAuthenticatedRequest, requireOperationalMutationRole } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";
import {
  describeCommodityProfiles,
  findCommodityProfilesForMessage,
} from "@/lib/commodity-intelligence";
import { formatFormalWaReply } from "@/lib/formal-replies";
import { ensureOperatorQueueForWaMessage } from "@/lib/wa-operator-queue";
import { getWaSetupStatus, normalizeWaDisplayName } from "../status";

export const runtime = "nodejs";

type WaMessageRow = {
  id: string;
  cooperativeId: string;
  providerMessageId: string | null;
  sender: string;
  message: string;
  intent: string;
  module: string;
  botReply: string;
  status: string;
  createdAt: string;
};

function normalizeExternalMessageId(body: {
  providerMessageId?: string;
  messageId?: string;
  localMessageId?: string;
  clientMessageId?: string;
}) {
  const providerMessageId = (body.providerMessageId ?? body.messageId)?.trim();
  if (providerMessageId) return providerMessageId;

  const localMessageId = (body.localMessageId ?? body.clientMessageId)?.trim();
  return localMessageId ? `local:${localMessageId}` : null;
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;
  const roleResponse = requireOperationalMutationRole(auth.user);
  if (roleResponse) return roleResponse;
  const cooperativeId = auth.user.cooperativeId;

  if (!cooperativeId) {
    return Response.json({ error: "COOPERATIVE_SCOPE_REQUIRED" }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    sender?: string;
    message?: string;
    intentId?: string;
    providerMessageId?: string;
    messageId?: string;
    localMessageId?: string;
    clientMessageId?: string;
  };
  const message = body.message?.trim();

  if (!message) {
    return Response.json({ error: "MESSAGE_REQUIRED" }, { status: 400 });
  }

  const cooperative = await queryOne<{ id: string; province: string }>(
    "SELECT id, province FROM cooperatives WHERE id = $1 LIMIT 1",
    [cooperativeId],
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

  const setup = getWaSetupStatus();
  const status = setup.send.status === "ready"
    ? "Draft tersimpan; env WhatsApp tersedia untuk pengiriman terpisah"
    : "Draft tersimpan; pengiriman live menunggu env WhatsApp";
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

  const sender = normalizeWaDisplayName(body.sender) ?? "Warga";
  const providerMessageId = normalizeExternalMessageId(body);
  const row = await queryOne<WaMessageRow>(
    `INSERT INTO wa_messages (id, cooperative_id, provider_message_id, sender, message, intent, module, bot_reply, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (provider_message_id) WHERE provider_message_id IS NOT NULL DO UPDATE
       SET provider_message_id = EXCLUDED.provider_message_id
     RETURNING id,
       cooperative_id AS "cooperativeId",
       provider_message_id AS "providerMessageId",
       sender,
       message,
       intent,
       module,
       bot_reply AS "botReply",
       status,
       created_at AS "createdAt"`,
    [
      newId("wa"),
      cooperative.id,
      providerMessageId,
      sender,
      message,
      selected.label,
      selected.module,
      botReply,
      status,
    ],
  );

  if (!row) {
    return Response.json({ error: "WA_MESSAGE_NOT_SAVED" }, { status: 500 });
  }

  const queue = await ensureOperatorQueueForWaMessage({
    waMessageId: row.id,
    providerMessageId: row.providerMessageId,
    cooperativeId: row.cooperativeId,
    sender: row.sender,
    source: "Local WA message",
    message: row.message,
    module: row.module,
  });

  return Response.json({ message: row, queue, setup });
}

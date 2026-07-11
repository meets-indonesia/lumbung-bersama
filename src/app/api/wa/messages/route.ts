import { requireAuthenticatedRequest, requireOperationalMutationRole } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";
import {
  describeCommodityProfiles,
  findCommodityProfilesForMessage,
} from "@/lib/commodity-intelligence";
import { buildOrchestratedWaReply, isWaMessageOutOfScope } from "@/lib/wa-agent-orchestrator";
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
} from "@/lib/wa-operator-queue";
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
    return Response.json(
      {
        error: "COOPERATIVE_SCOPE_REQUIRED",
        message: "Akun operator belum tersambung ke workspace koperasi untuk mencatat pesan WA.",
      },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    sender?: string;
    message?: string;
    intentId?: string;
    providerMessageId?: string;
    messageId?: string;
    localMessageId?: string;
    clientMessageId?: string;
    payloadType?: string;
    mediaType?: string;
    caption?: string;
  };
  const payloadType = normalizeWaPayloadType(body.payloadType ?? body.mediaType);
  const rawMessage = payloadType === "text" ? body.message : body.message ?? body.caption;
  const message = displayTextForPayload(payloadType, rawMessage ?? "");

  if (!message) {
    return Response.json({ error: "MESSAGE_REQUIRED" }, { status: 400 });
  }

  const cooperative = await queryOne<{ id: string; province: string; regency: string }>(
    "SELECT id, province, regency FROM cooperatives WHERE id = $1 LIMIT 1",
    [cooperativeId],
  );

  if (!cooperative) {
    return Response.json({ error: "COOPERATIVE_NOT_FOUND" }, { status: 404 });
  }

  const hasHumanText = Boolean(rawMessage?.trim());
  const selected = body.intentId
    ? selectWaAgentIntent(message, body.intentId)
    : hasHumanText
      ? selectWaAgentIntent(message)
      : fallbackIntentForPayload(payloadType);

  const setup = getWaSetupStatus();
  const draft = buildWaAgentDraft({
    intent: selected,
    payloadType,
    source: "WA local draft",
    message,
  });
  const outOfScope = isWaMessageOutOfScope(message, payloadType);
  const reviewPolicy = outOfScope
    ? { shouldQueue: false, queueStatus: "Dijawab otomatis", mode: "auto-answer" as const }
    : getWaReviewPolicy(selected, payloadType, message);
  const status = reviewPolicy.shouldQueue
    ? setup.send.status === "ready"
      ? "Butuh tindak lanjut operator; pengiriman live belum dilakukan"
      : "Butuh tindak lanjut operator; pengiriman live menunggu kanal resmi"
    : "Dijawab otomatis; riwayat tersimpan di WA Inbox";
  const commodityProfiles = await findCommodityProfilesForMessage(message, cooperative.province).catch(() => []);
  const commodityDetails = describeCommodityProfiles(commodityProfiles);
  const preliminaryBotReply = buildWaOperationalReply({
    intent: selected,
    draft,
    message,
    payloadType,
    commodityDetails,
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
       draft.module,
      preliminaryBotReply,
       status,
     ],
   );

  if (!row) {
    return Response.json({ error: "WA_MESSAGE_NOT_SAVED" }, { status: 500 });
  }

  const queue = reviewPolicy.shouldQueue
    ? await ensureOperatorQueueForWaMessage({
        queryOne,
        waMessageId: row.id,
        providerMessageId: row.providerMessageId,
        cooperativeId: row.cooperativeId,
        sender: row.sender,
        source: queueSourceForPayload(payloadType),
        message: row.message,
        module: row.module,
        status: draft.queueStatus,
      })
    : null;

  const orchestrated = await buildOrchestratedWaReply({
    cooperativeId: cooperative.id,
    cooperativeProvince: cooperative.province,
    cooperativeRegency: cooperative.regency,
    intent: selected,
    draft,
    message,
    payloadType,
    queueId: queue?.id ?? null,
    commodityDetails,
  }).catch(() => null);
  const botReply =
    orchestrated?.reply ??
    buildWaOperationalReply({
      intent: selected,
      draft,
      message,
      payloadType,
      queueId: queue?.id ?? null,
      commodityDetails,
    });
  const finalRow = await queryOne<WaMessageRow>(
    `UPDATE wa_messages
     SET bot_reply = $1
     WHERE id = $2
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
    [botReply, row.id],
  );

  return Response.json({
    message: finalRow ?? { ...row, botReply },
    queue,
    setup,
    agent: {
      ...draft,
      lbQueueId: queue?.id ?? null,
      deliveryStatus: status,
      reviewMode: reviewPolicy.mode,
      toolScope: orchestrated?.toolSummary.scope ?? null,
      aiReplyMode: orchestrated?.provider.mode ?? "fallback",
    },
  });
}

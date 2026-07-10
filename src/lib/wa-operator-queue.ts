import { createHash } from "node:crypto";
import { queryOne } from "@/lib/postgres";

type OperatorQueueRow = {
  id: string;
  cooperativeId: string;
  sender: string;
  source: string;
  summary: string;
  status: string;
  module: string;
  createdAt?: string;
  updatedAt?: string;
};

type WaQueueInput = {
  waMessageId: string;
  providerMessageId?: string | null;
  cooperativeId: string;
  sender: string;
  source: string;
  message: string;
  module: string;
  status?: string;
};

const DEFAULT_QUEUE_STATUS = "Menunggu Dicek";
const SUMMARY_LIMIT = 180;

export function queueIdForWaIntake(waMessageId: string, providerMessageId?: string | null) {
  const providerKey = providerMessageId?.trim();
  const identity = providerKey ? `provider:${providerKey}` : `wa:${waMessageId}`;
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 16).toUpperCase();
  return `LB-WA-${digest}`;
}

export function summarizeWaIntake(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "Pesan WhatsApp masuk tanpa isi teks.";
  if (normalized.length <= SUMMARY_LIMIT) return normalized;
  return `${normalized.slice(0, SUMMARY_LIMIT - 3)}...`;
}

export async function ensureOperatorQueueForWaMessage(input: WaQueueInput) {
  const queueId = queueIdForWaIntake(input.waMessageId, input.providerMessageId);
  const status = input.status ?? DEFAULT_QUEUE_STATUS;
  const summary = summarizeWaIntake(input.message);

  const inserted = await queryOne<OperatorQueueRow>(
    `INSERT INTO operator_queue (id, cooperative_id, sender, source, summary, status, module)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING
     RETURNING id,
       cooperative_id AS "cooperativeId",
       sender,
       source,
       summary,
       status,
       module,
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [
      queueId,
      input.cooperativeId,
      input.sender,
      input.source,
      summary,
      status,
      input.module,
    ],
  );

  if (inserted) return inserted;

  return queryOne<OperatorQueueRow>(
    `SELECT id,
       cooperative_id AS "cooperativeId",
       sender,
       source,
       summary,
       status,
       module,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM operator_queue
     WHERE id = $1`,
    [queueId],
  );
}

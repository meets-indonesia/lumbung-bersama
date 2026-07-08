import { requireAuthenticatedRequest } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const status = body.status || "Sudah Disetujui";

  const row = await queryOne(
    `UPDATE operator_queue
     SET status = $2, updated_at = now()
     WHERE id = $1
     RETURNING id, sender, source, summary, status, module, updated_at AS "updatedAt"`,
    [id, status],
  );

  if (!row) {
    return Response.json({ error: "QUEUE_NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ queue: row });
}

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const queue = await queryOne<{
    id: string;
    cooperative_id: string;
    sender: string;
    summary: string;
    module: string;
  }>(
    "SELECT id, cooperative_id, sender, summary, module FROM operator_queue WHERE id = $1",
    [id],
  );

  if (!queue) {
    return Response.json({ error: "QUEUE_NOT_FOUND" }, { status: 404 });
  }

  const reply =
    body.action === "follow-up"
      ? `Pak/Bu ${queue.sender}, koperasi perlu melengkapi data untuk catatan ${queue.id}: foto barang, lokasi, dan waktu yang bisa dicek petugas.`
      : `Catatan ${queue.id} sudah diterima koperasi dan sedang diproses pengurus.`;

  const message = await queryOne(
    `INSERT INTO wa_messages (id, cooperative_id, sender, message, intent, module, bot_reply, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, sender, message, intent, module, bot_reply AS "botReply", status, created_at AS "createdAt"`,
    [
      newId("wa"),
      queue.cooperative_id,
      queue.sender,
      queue.summary,
      "follow-up",
      queue.module,
      reply,
      process.env.WHATSAPP_BUSINESS_TOKEN ? "Siap dikirim" : "Menunggu env WhatsApp",
    ],
  );

  return Response.json({ message });
}

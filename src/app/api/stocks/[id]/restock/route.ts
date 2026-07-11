import { requireAuthenticatedRequest, requireRole } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;
  const roleResponse = requireRole(auth.user, ["admin", "manager", "operator", "gerai"]);
  if (roleResponse) return roleResponse;
  const cooperativeId = auth.user.cooperativeId;

  if (!cooperativeId) {
    return Response.json(
      {
        error: "COOPERATIVE_SCOPE_REQUIRED",
        message: "Akun operator belum tersambung ke workspace koperasi untuk mutasi stok.",
      },
      { status: 409 },
    );
  }

  const { id } = await context.params;
  const stock = await queryOne(
    `WITH updated AS (
       UPDATE stock_items
       SET restock_requested = true, state = 'Restock diajukan', updated_at = now()
       WHERE id = $1
         AND cooperative_id = $2
       RETURNING id, cooperative_id, name, unit, state, location, restock_requested, updated_at
     ),
     inserted AS (
       INSERT INTO anak_sarengklek_stock_ledger (
         id,
         cooperative_id,
         stock_item_id,
         movement_type,
         quantity,
         unit_label,
         reason,
         evidence_ref,
         readiness_status,
         recorded_by
       )
       SELECT
         'assl-restock-' || id || '-' || floor(extract(epoch from clock_timestamp()) * 1000)::text || '-' || substring(md5(random()::text), 1, 8),
         cooperative_id,
         id,
         'restock-request',
         1,
         'request',
         'Restock request created from dashboard action. Current stock snapshot: ' || unit || '.',
         id,
         state,
         $3
       FROM updated
       ON CONFLICT (id) DO NOTHING
       RETURNING id
     )
     SELECT
       id,
       name,
       unit,
       state,
       location,
       restock_requested AS "restockRequested",
       updated_at AS "updatedAt",
       (SELECT COUNT(*)::int FROM inserted) AS "ledgerEntriesCreated"
     FROM updated`,
    [id, cooperativeId, auth.user.email],
  );

  if (!stock) {
    return Response.json({ error: "STOCK_NOT_FOUND" }, { status: 404 });
  }

  await queryOne(
    `INSERT INTO agent_runs (id, cooperative_id, agent_name, record_id, status, output, checks, explanation, next_action)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     RETURNING id`,
    [
      newId("agent"),
      cooperativeId,
      "Agen Stok dan Gudang",
      id,
      "restock-request-created",
      `${id}: restock diajukan dan ledger stok diperbarui dari aksi gerai.`,
      JSON.stringify(["Minimum stok", "Supplier atau gudang asal", "Kuantitas restock", "Jadwal pickup", "Bukti penerimaan"]),
      "Restock dicatat dari tombol Gerai Pintar dan disimpan sebagai jejak Agent Center.",
      "Petugas gerai mengisi jumlah restock, supplier/gudang asal, dan jadwal penerimaan sebelum stok dikunci.",
    ],
  ).catch(() => null);

  return Response.json({ stock });
}

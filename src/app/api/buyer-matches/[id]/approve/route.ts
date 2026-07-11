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
  const roleResponse = requireRole(auth.user, ["admin", "manager"]);
  if (roleResponse) return roleResponse;
  const cooperativeId = auth.user.cooperativeId;

  if (!cooperativeId) {
    return Response.json(
      {
        error: "COOPERATIVE_SCOPE_REQUIRED",
        message: "Akun operator belum tersambung ke workspace koperasi untuk review buyer awal.",
      },
      { status: 409 },
    );
  }

  const { id } = await context.params;
  const buyer = await queryOne(
    `WITH updated AS (
       UPDATE buyer_matches
       SET status = 'Disetujui pengurus', approved_at = now(), updated_at = now()
       WHERE id = $1
         AND cooperative_id = $2
       RETURNING id, cooperative_id, buyer, need, match_score, reason, status, approved_at, updated_at
     ),
     requirement_update AS (
       UPDATE anak_sarengklek_buyer_requirements requirement
       SET verification_status = 'Disetujui untuk review outreach',
           updated_at = now()
       FROM updated
       WHERE requirement.cooperative_id = updated.cooperative_id
         AND lower(requirement.product_name) = lower(updated.need)
       RETURNING requirement.id
     )
     SELECT
       id,
       buyer,
       need,
       match_score AS "matchScore",
       reason,
       status,
       approved_at AS "approvedAt",
       updated_at AS "updatedAt",
       (SELECT COUNT(*)::int FROM requirement_update) AS "requirementsUpdated"
     FROM updated`,
    [id, cooperativeId],
  );

  if (!buyer) {
    return Response.json({ error: "BUYER_MATCH_NOT_FOUND" }, { status: 404 });
  }

  await queryOne(
    `INSERT INTO agent_runs (id, cooperative_id, agent_name, record_id, status, output, checks, explanation, next_action)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     RETURNING id`,
    [
      newId("agent"),
      cooperativeId,
      "Agen Pasar dan Mitra",
      id,
      "buyer-readiness-approved",
      `${id}: kesiapan tipe buyer disetujui untuk review outreach. Ini bukan komitmen penjualan dan bukan buyer bernama.`,
      JSON.stringify(["Readiness stok", "Grade/kualitas", "Packaging", "Harga indikatif", "Approval pengurus"]),
      "Approval buyer readiness dicatat dari aksi dashboard dan disimpan sebagai jejak Agent Center.",
      "Siapkan draft outreach dan cek ulang volume, kualitas, lokasi pickup, serta batas harga sebelum kontak pihak luar.",
    ],
  ).catch(() => null);

  return Response.json({ buyer });
}

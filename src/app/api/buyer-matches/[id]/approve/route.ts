import { requireAuthenticatedRequest } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const buyer = await queryOne(
    `UPDATE buyer_matches
     SET status = 'Disetujui pengurus', approved_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING id, buyer, need, match_score AS "matchScore", reason, status, approved_at AS "approvedAt", updated_at AS "updatedAt"`,
    [id],
  );

  if (!buyer) {
    return Response.json({ error: "BUYER_MATCH_NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ buyer });
}

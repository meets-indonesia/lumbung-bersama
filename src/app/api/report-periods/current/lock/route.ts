import { requireAuthenticatedRequest, requireRole } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;
  const roleResponse = requireRole(auth.user, ["admin", "manager"]);
  if (roleResponse) return roleResponse;
  const cooperativeId = auth.user.cooperativeId;

  if (!cooperativeId) {
    return Response.json({ error: "COOPERATIVE_SCOPE_REQUIRED" }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as { locked?: boolean };
  const locked = body.locked ?? true;

  const period = await queryOne(
    `UPDATE report_periods
     SET locked = $1, locked_at = CASE WHEN $1 THEN now() ELSE NULL END, updated_at = now()
     WHERE id = 'period-current'
       AND cooperative_id = $2
     RETURNING id, label, locked, locked_at AS "lockedAt", updated_at AS "updatedAt"`,
    [locked, cooperativeId],
  );

  if (!period) {
    return Response.json({ error: "REPORT_PERIOD_NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ period });
}

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
  const financeRequest = await queryOne(
    `UPDATE finance_requests
     SET status = 'Siap rapat komite', reviewed_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING id, member, purpose, amount::text AS amount, risk, status, reviewed_at AS "reviewedAt", updated_at AS "updatedAt"`,
    [id],
  );

  if (!financeRequest) {
    return Response.json({ error: "FINANCE_REQUEST_NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ request: financeRequest });
}

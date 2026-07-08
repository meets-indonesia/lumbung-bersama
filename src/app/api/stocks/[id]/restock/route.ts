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
  const stock = await queryOne(
    `UPDATE stock_items
     SET restock_requested = true, state = 'Restock diajukan', updated_at = now()
     WHERE id = $1
     RETURNING id, name, unit, state, location, restock_requested AS "restockRequested", updated_at AS "updatedAt"`,
    [id],
  );

  if (!stock) {
    return Response.json({ error: "STOCK_NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ stock });
}

import { requireAuthenticatedRequest } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { included?: boolean };

  const section = await queryOne(
    `UPDATE report_sections
     SET included = COALESCE($2, NOT included), updated_at = now()
     WHERE id = $1
     RETURNING id, title, included, updated_at AS "updatedAt"`,
    [id, body.included],
  );

  if (!section) {
    return Response.json({ error: "REPORT_SECTION_NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ section });
}

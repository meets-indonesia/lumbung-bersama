import { buildClearSessionCookie, requireSameOriginMutation, revokeCurrentSession } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured } from "@/lib/postgres";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfResponse = requireSameOriginMutation(request);
  if (csrfResponse) return csrfResponse;

  if (!isDatabaseConfigured()) return dbRequiredResponse();

  await revokeCurrentSession(request);
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", buildClearSessionCookie());
  return response;
}

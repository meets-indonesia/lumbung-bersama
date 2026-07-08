import { requireAuthenticatedRequest } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const notifications = await queryRows<NotificationRow>(
    `SELECT id,
            title,
            body,
            type,
            action_href AS "actionHref",
            read_at AS "readAt",
            created_at AS "createdAt"
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 30`,
    [auth.user!.id],
  );

  return Response.json({
    notifications,
    unread: notifications.filter((notification) => !notification.readAt).length,
  });
}

export async function PATCH(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const body = (await request.json().catch(() => ({}))) as { id?: string; read?: boolean };

  if (body.id) {
    await queryRows(
      `UPDATE notifications
       SET read_at = CASE WHEN $3 THEN COALESCE(read_at, now()) ELSE NULL END
       WHERE id = $1 AND user_id = $2`,
      [body.id, auth.user!.id, body.read ?? true],
    );
  } else {
    await queryRows(
      "UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE user_id = $1",
      [auth.user!.id],
    );
  }

  return Response.json({ ok: true });
}

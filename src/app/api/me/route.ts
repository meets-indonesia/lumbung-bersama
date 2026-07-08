import { initialsFromName, requireAuthenticatedRequest } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  title: string;
  phone: string | null;
  avatarInitials: string;
};

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  return Response.json({ user: auth.user });
}

export async function PATCH(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    fullName?: string;
    title?: string;
    phone?: string;
  };

  const fullName = body.fullName?.trim();
  const title = body.title?.trim();
  const phone = body.phone?.trim() || null;

  if (!fullName || fullName.length < 3) {
    return Response.json(
      { error: "FULL_NAME_REQUIRED", message: "Nama profil minimal 3 karakter." },
      { status: 400 },
    );
  }

  if (!title || title.length < 3) {
    return Response.json(
      { error: "TITLE_REQUIRED", message: "Jabatan minimal 3 karakter." },
      { status: 400 },
    );
  }

  const user = await queryOne<UserRow>(
    `UPDATE users
     SET full_name = $2,
         title = $3,
         phone = $4,
         avatar_initials = $5,
         updated_at = now()
     WHERE id = $1
     RETURNING id,
               email,
               full_name AS "fullName",
               role,
               title,
               phone,
               avatar_initials AS "avatarInitials"`,
    [auth.user!.id, fullName, title, phone, initialsFromName(fullName)],
  );

  return Response.json({ user });
}

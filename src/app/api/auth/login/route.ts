import {
  buildSessionCookie,
  createSession,
  ensureInitialNotifications,
  initialsFromName,
  verifyPassword,
} from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

type LoginUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  title: string;
  phone: string | null;
  avatarInitials: string;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const adminName = process.env.ADMIN_NAME?.trim() || "Admin Lumbung";

  if (!adminEmail || !adminPasswordHash) {
    return Response.json(
      {
        error: "ADMIN_AUTH_NOT_CONFIGURED",
        message:
          "Login operator belum dikonfigurasi. Isi ADMIN_EMAIL dan ADMIN_PASSWORD_HASH.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return Response.json(
      { error: "LOGIN_REQUIRED", message: "Email dan password wajib diisi." },
      { status: 400 },
    );
  }

  if (email !== adminEmail || !verifyPassword(password, adminPasswordHash)) {
    return Response.json(
      { error: "INVALID_LOGIN", message: "Email atau password tidak cocok." },
      { status: 401 },
    );
  }

  const user = await queryOne<LoginUser>(
    `INSERT INTO users (id, email, password_hash, full_name, role, title, avatar_initials, last_login_at)
     VALUES ('admin-primary', $1, $2, $3, 'admin', 'Operator utama', $4, now())
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         role = 'admin',
         last_login_at = now(),
         updated_at = now()
     RETURNING id,
               email,
               full_name AS "fullName",
               role,
               title,
               phone,
               avatar_initials AS "avatarInitials"`,
    [adminEmail, adminPasswordHash, adminName, initialsFromName(adminName)],
  );

  if (!user) {
    return Response.json({ error: "USER_NOT_CREATED" }, { status: 500 });
  }

  await ensureInitialNotifications(user.id);
  const session = await createSession(user.id, request);
  const response = Response.json({ user });
  response.headers.append("Set-Cookie", buildSessionCookie(session.token, session.expiresAt));
  return response;
}

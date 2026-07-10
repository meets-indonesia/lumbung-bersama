import {
  buildSessionCookie,
  createSession,
  ensureInitialNotifications,
  getRequestIp,
  initialsFromName,
  requireSameOriginMutation,
  verifyPassword,
} from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

type LoginUser = {
  id: string;
  cooperativeId: string | null;
  email: string;
  fullName: string;
  role: string;
  title: string;
  phone: string | null;
  avatarInitials: string;
};

type LoginAttempt = {
  count: number;
  resetAt: number;
};

type GlobalWithLoginThrottle = typeof globalThis & {
  lumbungLoginAttempts?: Map<string, LoginAttempt>;
};

const globalWithLoginThrottle = globalThis as GlobalWithLoginThrottle;
const LOGIN_THROTTLE_WINDOW_MS = Number(process.env.LOGIN_THROTTLE_WINDOW_MS ?? 5 * 60 * 1000);
const LOGIN_THROTTLE_MAX_ATTEMPTS = Number(process.env.LOGIN_THROTTLE_MAX_ATTEMPTS ?? 5);

function loginAttempts() {
  if (!globalWithLoginThrottle.lumbungLoginAttempts) {
    globalWithLoginThrottle.lumbungLoginAttempts = new Map();
  }
  return globalWithLoginThrottle.lumbungLoginAttempts;
}

function loginThrottleKey(request: Request, email: string) {
  return `${getRequestIp(request) ?? "unknown"}:${email || "unknown"}`;
}

function checkLoginThrottle(request: Request, email: string) {
  const attempts = loginAttempts();
  const key = loginThrottleKey(request, email);
  const now = Date.now();
  const attempt = attempts.get(key);

  if (!attempt || attempt.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + LOGIN_THROTTLE_WINDOW_MS });
    return null;
  }

  if (attempt.count >= LOGIN_THROTTLE_MAX_ATTEMPTS) {
    return {
      key,
      response: Response.json(
        {
          error: "LOGIN_THROTTLED",
          message: "Terlalu banyak percobaan login. Coba lagi beberapa menit.",
          retryAfterSeconds: Math.ceil((attempt.resetAt - now) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((attempt.resetAt - now) / 1000)),
          },
        },
      ),
    };
  }

  return { key, response: null };
}

function recordFailedLogin(key: string) {
  const attempts = loginAttempts();
  const now = Date.now();
  const attempt = attempts.get(key) ?? { count: 0, resetAt: now + LOGIN_THROTTLE_WINDOW_MS };
  attempts.set(key, {
    count: attempt.count + 1,
    resetAt: attempt.resetAt > now ? attempt.resetAt : now + LOGIN_THROTTLE_WINDOW_MS,
  });
}

function clearLoginThrottle(key: string) {
  loginAttempts().delete(key);
}

export async function POST(request: Request) {
  const csrfResponse = requireSameOriginMutation(request);
  if (csrfResponse) return csrfResponse;

  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const adminName = process.env.ADMIN_NAME?.trim() || "Admin Lumbung";
  const adminCooperativeId = process.env.ADMIN_COOPERATIVE_ID?.trim() || "kop-wanasari";

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

  const throttle = checkLoginThrottle(request, email);
  if (throttle?.response) return throttle.response;

  if (email !== adminEmail || !verifyPassword(password, adminPasswordHash)) {
    if (throttle?.key) recordFailedLogin(throttle.key);
    return Response.json(
      { error: "INVALID_LOGIN", message: "Email atau password tidak cocok." },
      { status: 401 },
    );
  }

  const user = await queryOne<LoginUser>(
    `INSERT INTO users (id, cooperative_id, email, password_hash, full_name, role, title, avatar_initials, last_login_at)
     VALUES ('admin-primary', $1, $2, $3, $4, 'admin', 'Operator utama', $5, now())
     ON CONFLICT (id) DO UPDATE
     SET cooperative_id = EXCLUDED.cooperative_id,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         role = 'admin',
         title = EXCLUDED.title,
         avatar_initials = EXCLUDED.avatar_initials,
         last_login_at = now(),
         updated_at = now()
     RETURNING id,
               cooperative_id AS "cooperativeId",
               email,
               full_name AS "fullName",
               role,
               title,
               phone,
               avatar_initials AS "avatarInitials"`,
    [adminCooperativeId, adminEmail, adminPasswordHash, adminName, initialsFromName(adminName)],
  );

  if (!user) {
    return Response.json({ error: "USER_NOT_CREATED" }, { status: 500 });
  }

  if (throttle?.key) clearLoginThrottle(throttle.key);
  await ensureInitialNotifications(user.id);
  const session = await createSession(user.id, request);
  const response = Response.json({ user });
  response.headers.append("Set-Cookie", buildSessionCookie(session.token, session.expiresAt));
  return response;
}

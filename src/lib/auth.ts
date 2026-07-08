import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isDatabaseConfigured, newId, queryOne, queryRows } from "@/lib/postgres";

export const SESSION_COOKIE = "lb_session";
const PASSWORD_ALGORITHM = "pbkdf2_sha256";
const PASSWORD_ITERATIONS = 210_000;
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? 10);

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  title: string;
  phone: string | null;
  avatarInitials: string;
};

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  title: string;
  phone: string | null;
  avatarInitials: string;
};

function toUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    title: row.title,
    phone: row.phone,
    avatarInitials: row.avatarInitials,
  };
}

function parseCookieHeader(header: string | null) {
  const cookiesMap = new Map<string, string>();
  if (!header) return cookiesMap;

  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookiesMap.set(rawName, decodeURIComponent(rawValue.join("=")));
  }

  return cookiesMap;
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 32, "sha256");
  return [
    PASSWORD_ALGORITHM,
    String(PASSWORD_ITERATIONS),
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join(":");
}

export function verifyPassword(password: string, storedHash: string) {
  const separator = storedHash.includes(":") ? ":" : "$";
  const [algorithm, iterationsRaw, saltRaw, hashRaw] = storedHash.split(separator);
  if (algorithm !== PASSWORD_ALGORITHM || !iterationsRaw || !saltRaw || !hashRaw) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 100_000) return false;

  const salt = Buffer.from(saltRaw, "base64url");
  const expected = Buffer.from(hashRaw, "base64url");
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, "sha256");

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildSessionCookie(token: string, expiresAt: Date) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === "production" ? "Secure" : "";
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
    `Max-Age=${maxAge}`,
    secure.trim(),
  ]
    .filter(Boolean)
    .join("; ");
}

export function buildClearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "Secure" : "";
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    secure.trim(),
  ]
    .filter(Boolean)
    .join("; ");
}

export async function createSession(userId: string, request: Request) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await queryOne(
    `INSERT INTO auth_sessions (id, user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      newId("session"),
      userId,
      hashSessionToken(token),
      request.headers.get("user-agent"),
      getRequestIp(request),
      expiresAt.toISOString(),
    ],
  );

  return { token, expiresAt };
}

async function getUserBySessionToken(token: string | undefined) {
  if (!token) return null;
  const tokenHash = hashSessionToken(token);

  const row = await queryOne<UserRow>(
    `SELECT users.id,
            users.email,
            users.full_name AS "fullName",
            users.role,
            users.title,
            users.phone,
            users.avatar_initials AS "avatarInitials"
     FROM auth_sessions
     JOIN users ON users.id = auth_sessions.user_id
     WHERE auth_sessions.token_hash = $1
       AND auth_sessions.revoked_at IS NULL
       AND auth_sessions.expires_at > now()
     LIMIT 1`,
    [tokenHash],
  );

  return row ? toUser(row) : null;
}

export async function getCurrentUserFromRequest(request: Request) {
  if (!isDatabaseConfigured()) return null;
  const cookieMap = parseCookieHeader(request.headers.get("cookie"));
  return getUserBySessionToken(cookieMap.get(SESSION_COOKIE));
}

export async function getCurrentUserFromCookies() {
  if (!isDatabaseConfigured()) return null;
  const cookieStore = await cookies();
  return getUserBySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function revokeCurrentSession(request: Request) {
  const cookieMap = parseCookieHeader(request.headers.get("cookie"));
  const token = cookieMap.get(SESSION_COOKIE);
  if (!token) return;

  await queryOne(
    "UPDATE auth_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
    [hashSessionToken(token)],
  );
}

export function authRequiredResponse() {
  return Response.json(
    {
      error: "AUTH_REQUIRED",
      message: "Akses operator memerlukan login.",
    },
    { status: 401 },
  );
}

export async function requireAuthenticatedRequest(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return { user: null, response: authRequiredResponse() };
  return { user, response: null };
}

export async function ensureInitialNotifications(userId: string) {
  const existing = await queryOne<{ count: string }>(
    "SELECT count(*)::text AS count FROM notifications WHERE user_id = $1",
    [userId],
  );

  if (Number(existing?.count ?? 0) > 0) return;

  await queryRows(
    `INSERT INTO notifications (id, user_id, title, body, type, action_href)
     VALUES
       ($1, $4, 'Akses operator aktif', 'Dashboard sudah dilindungi login dan session httpOnly.', 'success', '/dashboard'),
       ($2, $4, 'WhatsApp Business belum tersambung', 'Isi token, phone number id, verify token, dan app secret untuk mengaktifkan webhook produksi.', 'warning', '/integrasi'),
       ($3, $4, 'Data nasional wilayah tersedia', 'Kode administrasi Indonesia sudah siap sebagai fondasi coverage desa nasional.', 'info', '/peta-unggulan')`,
    [newId("notif"), newId("notif"), newId("notif"), userId],
  );
}

export function initialsFromName(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return (words.map((word) => word[0]?.toUpperCase()).join("") || "AD").slice(0, 3);
}

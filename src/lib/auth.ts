import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isDatabaseConfigured, newId, queryOne, queryRows } from "@/lib/postgres";

export const SESSION_COOKIE = "lb_session";
const PASSWORD_ALGORITHM = "pbkdf2_sha256";
const PASSWORD_ITERATIONS = 210_000;
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? 10);
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const OPERATIONAL_MUTATION_ROLES = ["admin", "operator", "manager", "pengurus", "bendahara", "petugas"];
const DEFAULT_ADMIN_COOPERATIVE_ID = "kop-wanasari";

export type AuthUser = {
  id: string;
  cooperativeId: string | null;
  email: string;
  fullName: string;
  role: string;
  title: string;
  phone: string | null;
  avatarInitials: string;
};

export type AuthRole = "admin" | "manager" | "operator" | "gerai" | "finance_committee" | "viewer";

type UserRow = {
  id: string;
  cooperativeId: string | null;
  email: string;
  fullName: string;
  role: string;
  title: string;
  phone: string | null;
  avatarInitials: string;
};

type CooperativeIdRow = {
  id: string;
};

type UserCooperativePatchRow = {
  cooperativeId: string | null;
};

function toUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    cooperativeId: row.cooperativeId,
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

function configuredAdminCooperativeId() {
  return process.env.ADMIN_COOPERATIVE_ID?.trim() || DEFAULT_ADMIN_COOPERATIVE_ID;
}

function canSelfHealCooperativeScope(row: UserRow) {
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return row.id === "admin-primary" || (Boolean(configuredAdminEmail) && row.email.toLowerCase() === configuredAdminEmail);
}

async function findSelfHealCooperativeId() {
  const configuredId = configuredAdminCooperativeId();
  const candidateIds =
    configuredId === DEFAULT_ADMIN_COOPERATIVE_ID
      ? [configuredId]
      : [configuredId, DEFAULT_ADMIN_COOPERATIVE_ID];

  const row = await queryOne<CooperativeIdRow>(
    `SELECT id
     FROM cooperatives
     WHERE id = ANY($1::text[])
     ORDER BY
       CASE
         WHEN id = $2 THEN 0
         WHEN id = $3 THEN 1
         ELSE 2
       END
     LIMIT 1`,
    [candidateIds, configuredId, DEFAULT_ADMIN_COOPERATIVE_ID],
  );

  return row?.id ?? null;
}

async function selfHealUserCooperativeId(row: UserRow) {
  if (!canSelfHealCooperativeScope(row)) return null;

  try {
    const cooperativeId = await findSelfHealCooperativeId();
    if (!cooperativeId) return null;

    const patchRow = await queryOne<UserCooperativePatchRow>(
      `UPDATE users
       SET cooperative_id = $2,
           updated_at = now()
       WHERE id = $1
         AND cooperative_id IS NULL
       RETURNING cooperative_id AS "cooperativeId"`,
      [row.id, cooperativeId],
    );

    return patchRow?.cooperativeId ?? null;
  } catch {
    return null;
  }
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

function requestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return normalizeOrigin(origin);

  const referer = request.headers.get("referer");
  if (!referer) return null;

  return normalizeOrigin(referer);
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function publicRequestOrigins(request: Request) {
  const origins = new Set<string>();
  const requestUrlOrigin = normalizeOrigin(request.url);
  if (requestUrlOrigin) origins.add(requestUrlOrigin);

  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host")) ?? request.headers.get("host");
  const forwardedProto =
    firstForwardedValue(request.headers.get("x-forwarded-proto")) ??
    (request.headers.get("x-forwarded-ssl") === "on" ? "https" : null);

  if (forwardedHost) {
    const host = forwardedHost.trim();
    const protocols = forwardedProto ? [forwardedProto] : ["https", "http"];
    for (const proto of protocols) {
      const forwardedOrigin = normalizeOrigin(`${proto}://${host}`);
      if (forwardedOrigin) origins.add(forwardedOrigin);
    }
  }

  for (const configuredUrl of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
  ]) {
    const configuredOrigin = normalizeOrigin(configuredUrl);
    if (configuredOrigin) origins.add(configuredOrigin);
  }

  return origins;
}

export function csrfRequiredResponse() {
  return Response.json(
    {
      error: "CSRF_REJECTED",
      message: "Sesi keamanan tidak valid. Muat ulang halaman login lalu coba lagi.",
    },
    { status: 403 },
  );
}

export function isSameOriginMutation(request: Request) {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return false;
  }
  if (fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none") return true;

  const origin = requestOrigin(request);
  if (!origin) return true;

  try {
    return publicRequestOrigins(request).has(origin);
  } catch {
    return false;
  }
}

export function requireSameOriginMutation(request: Request) {
  if (isSameOriginMutation(request)) return null;
  return csrfRequiredResponse();
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
            users.cooperative_id AS "cooperativeId",
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

  if (!row) return null;

  if (!row.cooperativeId) {
    const cooperativeId = await selfHealUserCooperativeId(row);
    return toUser({ ...row, cooperativeId: cooperativeId ?? row.cooperativeId });
  }

  return toUser(row);
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

export function roleRequiredResponse(allowedRoles: string[]) {
  void allowedRoles;
  return Response.json(
    {
      error: "ROLE_REQUIRED",
      message: "Akun ini belum punya akses untuk aksi ini.",
    },
    { status: 403 },
  );
}

export function requireRole(user: AuthUser | null | undefined, allowedRoles: string[]) {
  if (!user) return authRequiredResponse();
  const allowed = new Set(allowedRoles.map((role) => role.toLowerCase()));
  if (allowed.has(user.role.toLowerCase())) return null;
  return roleRequiredResponse(allowedRoles);
}

export function requireOperationalMutationRole(user: AuthUser | null | undefined) {
  return requireRole(user, OPERATIONAL_MUTATION_ROLES);
}

export async function requireAuthenticatedRequest(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return { user: null, response: authRequiredResponse() };
  const csrfResponse = requireSameOriginMutation(request);
  if (csrfResponse) return { user: null, response: csrfResponse };
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

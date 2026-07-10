import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./load-local-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadLocalEnv(root);

const port = Number(process.env.QA_AUTH_PORT ?? 3108);
const baseUrl = `http://127.0.0.1:${port}`;
const isWindows = process.platform === "win32";
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.QA_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
const sharedHackathonDbPattern = /34\.101\.155\.200|hackathon_2026|hackathon_participant_2026/i;

let serverProcess = null;

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function requireEnv(name, value, hint) {
  if (value) return;
  fail(`${name} belum tersedia. ${hint}`);
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(pathname, init = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...init,
    headers: {
      ...(init.headers ?? {}),
    },
  });
}

async function authedRequest(cookie, pathname, init = {}) {
  return request(pathname, {
    ...init,
    headers: {
      Cookie: cookie,
      ...(init.headers ?? {}),
    },
  });
}

async function json(response, label) {
  const payload = await response.json().catch(() => null);
  if (!payload) fail(`${label} did not return JSON`);
  return payload;
}

function cookieHeaderFrom(response) {
  const getSetCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  const setCookies = getSetCookie.length
    ? getSetCookie
    : [response.headers.get("set-cookie")].filter(Boolean);
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function serverIsReady() {
  try {
    const response = await request("/api/health");
    return response.status === 200;
  } catch {
    return false;
  }
}

async function startServerIfNeeded() {
  if (await serverIsReady()) {
    pass(`server already ready at ${baseUrl}`);
    return;
  }

  const command = isWindows ? `npm run start -- -p ${port}` : "npm";
  const args = isWindows ? [] : ["run", "start", "--", "-p", String(port)];

  const serverEnv = { ...process.env };
  delete serverEnv.QA_ADMIN_PASSWORD;
  delete serverEnv.ADMIN_PASSWORD;

  serverProcess = spawn(command, args, {
    cwd: root,
    env: serverEnv,
    shell: isWindows,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
  serverProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await serverIsReady()) {
      pass(`server started at ${baseUrl}`);
      return;
    }
    await wait(500);
  }

  fail(`server did not become ready at ${baseUrl}`);
}

async function stopServerIfStarted() {
  if (!serverProcess) return;
  if (serverProcess.exitCode !== null) return;

  if (isWindows) {
    const killer = spawn("taskkill", ["/F", "/T", "/PID", String(serverProcess.pid)], {
      stdio: "ignore",
    });
    await new Promise((resolve) => killer.once("exit", resolve));
    return;
  }

  serverProcess.kill("SIGTERM");
  await wait(500);
  if (serverProcess.exitCode === null) serverProcess.kill("SIGKILL");
}

function expectStatus(response, expected, label) {
  if (response.status !== expected) {
    fail(`${label} returned ${response.status}, expected ${expected}`);
  }
  pass(`${label} -> ${expected}`);
}

function expectOneOf(response, expected, label) {
  if (!expected.includes(response.status)) {
    fail(`${label} returned ${response.status}, expected one of ${expected.join(", ")}`);
  }
  pass(`${label} -> ${response.status}`);
}

async function run() {
  requireEnv(
    "DATABASE_URL",
    process.env.DATABASE_URL,
    "Start the application database and set DATABASE_URL before running qa:auth-smoke.",
  );
  if (sharedHackathonDbPattern.test(process.env.DATABASE_URL ?? "")) {
    fail("qa:auth-smoke harus berjalan di DB aplikasi/disposable, bukan shared hackathon DB read-only.");
  }
  requireEnv("ADMIN_EMAIL", adminEmail, "Set ADMIN_EMAIL for the admin login.");
  requireEnv(
    "ADMIN_PASSWORD_HASH",
    process.env.ADMIN_PASSWORD_HASH,
    'Generate it with: npm run auth:hash-password -- "local-long-password"',
  );
  requireEnv(
    "QA_ADMIN_PASSWORD",
    adminPassword,
    "Set QA_ADMIN_PASSWORD to the plaintext local admin password used to generate ADMIN_PASSWORD_HASH.",
  );

  await startServerIfNeeded();

  const health = await request("/api/health");
  expectStatus(health, 200, "/api/health");
  const healthPayload = await json(health, "/api/health");
  if (healthPayload.mode !== "operator-ready") {
    fail(`/api/health mode ${healthPayload.mode}, expected operator-ready`);
  }
  pass("/api/health mode operator-ready");

  const dashboardBeforeLogin = await request("/dashboard");
  expectOneOf(dashboardBeforeLogin, [302, 303, 307, 308], "/dashboard before login");
  const redirectLocation = dashboardBeforeLogin.headers.get("location") ?? "";
  if (!redirectLocation.includes("/login?next=/dashboard")) {
    fail(`/dashboard redirected to ${redirectLocation}, expected /login?next=/dashboard`);
  }
  pass("/dashboard redirects unauthenticated users to login");

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  expectStatus(login, 200, "/api/auth/login");
  const loginPayload = await json(login, "/api/auth/login");
  if (loginPayload.user?.role !== "admin") fail("login did not return admin user");
  const cookie = cookieHeaderFrom(login);
  if (!cookie.includes("lb_session=")) fail("login did not set lb_session cookie");
  pass("/api/auth/login set lb_session");

  const me = await authedRequest(cookie, "/api/me");
  expectStatus(me, 200, "/api/me");
  const mePayload = await json(me, "/api/me");
  if (mePayload.user?.role !== "admin") fail("/api/me did not return admin role");
  pass("/api/me returns authenticated admin");

  for (const page of ["/dashboard", "/wa", "/agents", "/laporan", "/integrasi"]) {
    const pageResponse = await authedRequest(cookie, page);
    expectStatus(pageResponse, 200, page);
  }
  pass("authenticated app pages render with session cookie");

  const dashboard = await authedRequest(cookie, "/api/dashboard");
  expectStatus(dashboard, 200, "/api/dashboard");
  const dashboardPayload = await json(dashboard, "/api/dashboard");
  if (dashboardPayload.cooperative?.id !== "kop-wanasari") fail("/api/dashboard seed cooperative mismatch");
  if (!Array.isArray(dashboardPayload.queue) || dashboardPayload.queue.length < 5) {
    fail("/api/dashboard did not return seeded queue");
  }
  if (!Array.isArray(dashboardPayload.buyerRequirements) || dashboardPayload.buyerRequirements.length < 3) {
    fail("/api/dashboard did not return prefixed buyer requirements");
  }
  if (!Array.isArray(dashboardPayload.stockLedger) || dashboardPayload.stockLedger.length < 4) {
    fail("/api/dashboard did not return prefixed stock ledger");
  }
  if (!Array.isArray(dashboardPayload.mediaEvidence) || dashboardPayload.mediaEvidence.length < 3) {
    fail("/api/dashboard did not return prefixed media evidence");
  }
  if (dashboardPayload.teamTablePrefix !== "anak_sarengklek_") {
    fail("/api/dashboard team table prefix mismatch");
  }
  if (dashboardPayload.prefixedDbStatus?.status !== "ready") {
    fail("/api/dashboard prefixed DB status is not ready");
  }
  const prefixedTables = dashboardPayload.prefixedDbStatus?.tables ?? [];
  for (const tableName of [
    "anak_sarengklek_buyer_requirements",
    "anak_sarengklek_stock_ledger",
    "anak_sarengklek_media_evidence",
  ]) {
    const tableStatus = prefixedTables.find((table) => table.tableName === tableName);
    if (!tableStatus || tableStatus.status !== "ready") {
      fail(`/api/dashboard prefixed table ${tableName} is not ready`);
    }
  }
  if (dashboardPayload.mediaEvidence.some((item) => "storageUri" in item || String(item.storageKey ?? "").startsWith("evidence://"))) {
    fail("/api/dashboard exposes raw media storage URI instead of redacted evidence metadata");
  }
  pass("/api/dashboard returns seeded cooperative workspace");

  const buyer = await authedRequest(cookie, "/api/buyer-matches/buyer-roastery/approve", {
    method: "POST",
  });
  expectStatus(buyer, 200, "buyer approve");
  const buyerPayload = await json(buyer, "buyer approve");
  if (buyerPayload.buyer?.status !== "Disetujui pengurus") fail("buyer approve status mismatch");
  if (Number(buyerPayload.buyer?.requirementsUpdated ?? 0) < 1) {
    fail("buyer approve did not update prefixed buyer requirement readiness");
  }
  pass("buyer approval mutation works");

  const stock = await authedRequest(cookie, "/api/stocks/stock-minyak-goreng/restock", {
    method: "POST",
  });
  expectStatus(stock, 200, "stock restock");
  const stockPayload = await json(stock, "stock restock");
  if (!stockPayload.stock?.restockRequested) fail("stock restock flag mismatch");
  if (Number(stockPayload.stock?.ledgerEntriesCreated ?? 0) < 1) {
    fail("stock restock did not create a prefixed stock ledger entry");
  }
  pass("stock restock mutation works");

  const finance = await authedRequest(cookie, "/api/finance-requests/SP-204/review", {
    method: "POST",
  });
  expectStatus(finance, 200, "finance review");
  const financePayload = await json(finance, "finance review");
  if (financePayload.request?.status !== "Siap rapat komite") fail("finance review status mismatch");
  pass("finance review mutation works");

  const queuePatch = await authedRequest(cookie, "/api/operator-queue/LB-1024", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Sudah Disetujui" }),
  });
  expectStatus(queuePatch, 200, "operator queue patch");
  const queuePayload = await json(queuePatch, "operator queue patch");
  if (queuePayload.queue?.status !== "Sudah Disetujui") fail("queue status mismatch");
  pass("operator queue patch works");

  const queueFollowUp = await authedRequest(cookie, "/api/operator-queue/LB-1024", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "follow-up" }),
  });
  expectStatus(queueFollowUp, 200, "operator queue follow-up");
  const followUpPayload = await json(queueFollowUp, "operator queue follow-up");
  if (!String(followUpPayload.message?.status ?? "").includes("Draft follow-up")) {
    fail("operator queue follow-up did not create a draft");
  }
  pass("operator queue follow-up draft works");

  const reportSection = await authedRequest(cookie, "/api/report-sections/report-buyer", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ included: false }),
  });
  expectStatus(reportSection, 200, "report section patch");
  const sectionPayload = await json(reportSection, "report section patch");
  if (sectionPayload.section?.included !== false) fail("report section included mismatch");
  pass("report section mutation works");

  const reportLock = await authedRequest(cookie, "/api/report-periods/current/lock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked: true }),
  });
  expectStatus(reportLock, 200, "report period lock");
  const lockPayload = await json(reportLock, "report period lock");
  if (lockPayload.period?.locked !== true) fail("report lock mismatch");
  pass("report lock mutation works");

  const qaMessageId = `qa-${Date.now()}`;
  const wa = await authedRequest(cookie, "/api/wa/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: "QA Auth Smoke",
      message: "Kopi kering 40 kg siap dicek buyer",
      clientMessageId: qaMessageId,
    }),
  });
  expectStatus(wa, 200, "WA intake");
  const waPayload = await json(wa, "WA intake");
  if (!waPayload.message?.id || !waPayload.queue?.id) fail("WA intake did not create message and queue");
  if (!String(waPayload.message.status ?? "").includes("Draft tersimpan")) {
    fail("WA intake did not keep draft/live-delivery split");
  }
  pass("WA intake creates message and operator queue");

  const agentSeedCase = await authedRequest(cookie, "/api/agents/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentName: "Agen Unggulan Desa", recordId: "LB-1024" }),
  });
  expectStatus(agentSeedCase, 200, "agent run seeded case");
  const agentSeedPayload = await json(agentSeedCase, "agent run seeded case");
  if (!String(agentSeedPayload.status ?? "").includes("case-backed")) {
    fail("agent seeded case was not case-backed");
  }
  if (!JSON.stringify(agentSeedPayload.checks ?? []).includes("Case source")) {
    fail("agent seeded case checks did not include Case source");
  }
  pass("agent run is case-backed for seeded queue");

  const agentWaCase = await authedRequest(cookie, "/api/agents/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentName: "Agen Pasar dan Mitra", recordId: waPayload.message.id }),
  });
  expectStatus(agentWaCase, 200, "agent run WA case");
  const agentWaPayload = await json(agentWaCase, "agent run WA case");
  if (!String(agentWaPayload.status ?? "").includes("case-backed")) {
    fail("agent WA case was not case-backed");
  }
  pass("agent run is case-backed for WA intake");

  const notifications = await authedRequest(cookie, "/api/notifications");
  expectStatus(notifications, 200, "/api/notifications");
  const notificationsPayload = await json(notifications, "/api/notifications");
  if (!Array.isArray(notificationsPayload.notifications)) fail("notifications response mismatch");
  pass("/api/notifications returns notification list");

  const notificationsPatch = await authedRequest(cookie, "/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
  expectStatus(notificationsPatch, 200, "notifications mark read");
  pass("notifications mark-read works");

  const profile = await authedRequest(cookie, "/api/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: process.env.ADMIN_NAME || "Admin Lumbung",
      title: "Operator utama",
      phone: "",
    }),
  });
  expectStatus(profile, 200, "profile patch");
  const profilePayload = await json(profile, "profile patch");
  if (!profilePayload.user?.fullName) fail("profile patch did not return user");
  pass("profile patch works");

  const logout = await authedRequest(cookie, "/api/auth/logout", { method: "POST" });
  expectStatus(logout, 200, "/api/auth/logout");
  pass("/api/auth/logout works");

  const meAfterLogout = await authedRequest(cookie, "/api/me");
  expectStatus(meAfterLogout, 401, "/api/me after logout");
  pass("revoked session is rejected");
}

try {
  await run();
} finally {
  await stopServerIfStarted();
}

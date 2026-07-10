import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.QA_HACKATHON_PORT ?? 3112);
const baseUrl = (process.env.QA_HACKATHON_BASE_URL ?? `http://127.0.0.1:${port}`).replace(/\/$/, "");
const liveBaseUrl = process.env.QA_LIVE_BASE_URL?.replace(/\/$/, "");
const shouldStartServer = !process.env.QA_HACKATHON_BASE_URL;
const isWindows = process.platform === "win32";

let serverProcess = null;

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  throw new Error(message);
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function urlFor(pathname, targetBase = baseUrl) {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return `${targetBase}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

async function request(pathname, init = {}, targetBase = baseUrl) {
  return fetch(urlFor(pathname, targetBase), {
    redirect: "manual",
    ...init,
  });
}

async function json(response, label) {
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    fail(`${label} did not return a JSON object`);
  }
  assertNoSecretValues(payload, label);
  return payload;
}

function expectArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} is not an array`);
}

function expectPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} is not an object`);
  }
}

function expectRedirectStatus(response, label) {
  if (![301, 302, 303, 307, 308].includes(response.status)) {
    fail(`${label} returned ${response.status}, expected redirect`);
  }
}

function assertNoSecretValues(value, label, trail = []) {
  const secretValuePatterns = [
    /postgres(?:ql)?:\/\/[^/\s:]+:[^@\s]+@/i,
    /mysql:\/\/[^/\s:]+:[^@\s]+@/i,
    /mongodb(?:\+srv)?:\/\/[^/\s:]+:[^@\s]+@/i,
    /Bearer\s+[A-Za-z0-9._-]{16,}/i,
    /sk-[A-Za-z0-9_-]{20,}/i,
    /xox[baprs]-[A-Za-z0-9-]{10,}/i,
  ];

  if (typeof value === "string") {
    for (const pattern of secretValuePatterns) {
      if (pattern.test(value)) {
        fail(`${label} exposes a secret-like value at ${trail.join(".") || "<root>"}`);
      }
    }
    return;
  }

  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretValues(item, label, [...trail, String(index)]));
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    assertNoSecretValues(item, label, [...trail, key]);
  }
}

function assertNoUnsafeIntegrationClaim(value, label, trail = []) {
  const unsafePatterns = [
    /terintegrasi resmi SIMKOPDES/i,
    /SIMKOPDES produksi/i,
    /live SIMKOPDES/i,
    /production SIMKOPDES integration/i,
    /official SIMKOPDES integration/i,
    /dev API integration/i,
    /official API contract/i,
    /kontrak API resmi/i,
  ];

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    const guardrailContext = [
      "does not",
      "do not",
      "must not",
      "not ",
      "no official",
      "not an official",
      "without official",
      "future",
      "readiness",
      "missing",
      "blocked",
      "observed",
      "sample",
      "simulated",
      "tidak",
      "jangan",
      "bukan",
    ].some((marker) => normalized.includes(marker));

    for (const pattern of unsafePatterns) {
      if (pattern.test(value) && !guardrailContext) {
        fail(`${label} overclaims official integration at ${trail.join(".") || "<root>"}`);
      }
    }
    return;
  }

  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeIntegrationClaim(item, label, [...trail, String(index)]));
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    assertNoUnsafeIntegrationClaim(item, label, [...trail, key]);
  }
}

function assertSignalSpinePayload(payload) {
  const label = "/api/hackathon/signal-spine";
  expectArray(payload.signalFamilies, `${label} signalFamilies`);
  expectArray(payload.provenanceLedger, `${label} provenanceLedger`);
  expectPlainObject(payload.readinessGate, `${label} readinessGate`);
  expectPlainObject(payload.offerPackDraft, `${label} offerPackDraft`);
  expectArray(payload.managerActionQueue, `${label} managerActionQueue`);
  expectArray(payload.remediationPlanner, `${label} remediationPlanner`);
  expectArray(payload.connectorScorecard, `${label} connectorScorecard`);
  assertNoUnsafeIntegrationClaim(payload, label);
  pass(`${label} exposes signal spine JSON without official-integration overclaim`);
}

async function expectStatusOneOf(pathname, expectedStatuses, init = {}) {
  const response = await request(pathname, init);
  if (!expectedStatuses.includes(response.status)) {
    fail(`${pathname} returned ${response.status}, expected one of ${expectedStatuses.join(", ")}`);
  }
  pass(`${pathname} -> ${response.status}`);
  return response;
}

async function expectJsonStatusOneOf(pathname, expectedStatuses, init = {}) {
  const response = await expectStatusOneOf(pathname, expectedStatuses, init);
  const payload = await json(response, pathname);
  pass(`${pathname} returns JSON`);
  return { response, payload };
}

async function expectText(pathname, expected) {
  const response = await expectStatusOneOf(pathname, [200]);
  const html = await response.text();
  if (!html.includes(expected)) {
    fail(`${pathname} did not include expected text: ${expected}`);
  }
  pass(`${pathname} contains "${expected}"`);
}

async function expectRedirect(pathname, expectedLocationPart) {
  const response = await request(pathname);
  expectRedirectStatus(response, pathname);
  const location = response.headers.get("location") ?? "";
  if (!location.includes(expectedLocationPart)) {
    fail(`${pathname} redirected to ${location}, expected ${expectedLocationPart}`);
  }
  pass(`${pathname} redirects to ${expectedLocationPart}`);
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
    pass(`server ready at ${baseUrl}`);
    return;
  }

  if (!shouldStartServer) {
    fail(`QA_HACKATHON_BASE_URL is set, but ${baseUrl} is not ready`);
  }

  const command = isWindows ? `npm run start -- -p ${port}` : "npm";
  const args = isWindows ? [] : ["run", "start", "--", "-p", String(port)];
  const serverEnv = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    WHATSAPP_BUSINESS_TOKEN: process.env.QA_ALLOW_LIVE_INTEGRATIONS === "1" ? process.env.WHATSAPP_BUSINESS_TOKEN : "",
    WHATSAPP_PHONE_NUMBER_ID: process.env.QA_ALLOW_LIVE_INTEGRATIONS === "1" ? process.env.WHATSAPP_PHONE_NUMBER_ID : "",
    OPENAI_API_KEY: process.env.QA_ALLOW_LIVE_INTEGRATIONS === "1" ? process.env.OPENAI_API_KEY : "",
  };

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
  if (!serverProcess || serverProcess.exitCode !== null) return;

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

function assertProtectedGate(label, response, payload, allowedSetupErrors = ["DATABASE_URL_REQUIRED"]) {
  if (response.status === 401 && payload.error !== "AUTH_REQUIRED") {
    fail(`${label} 401 did not report AUTH_REQUIRED`);
  }
  if (response.status === 403 && !["CSRF_REJECTED", "ROLE_REQUIRED", "WEBHOOK_VERIFICATION_FAILED"].includes(payload.error)) {
    fail(`${label} 403 did not report an expected gate`);
  }
  if (response.status === 503 && !allowedSetupErrors.includes(payload.error)) {
    fail(`${label} 503 reported ${payload.error}, expected one of ${allowedSetupErrors.join(", ")}`);
  }
  pass(`${label} protected by setup/auth gate`);
}

async function assertPublicPages() {
  await expectText("/", "Koperasi Opportunity");
  await expectText("/login", "Login operator");
  await expectText("/peta-unggulan", "Peta Unggulan");
  await expectRedirect("/peta-potensi", "/peta-unggulan");
  await expectRedirect("/demo", "/login?next=/dashboard");
  await expectRedirect("/demo/suara-warga", "/login?next=/wa");
}

async function assertProtectedPages() {
  const protectedPages = [
    ["/dashboard", "/login?next=/dashboard"],
    ["/agents", "/login?next=/agents"],
    ["/wa", "/login?next=/wa"],
    ["/laporan", "/login?next=/laporan"],
    ["/integrasi", "/login?next=/integrasi"],
    ["/modules", "/login?next=/modules"],
    ["/modules/peta-unggulan", "/login?next=/modules"],
  ];

  for (const [pathname, redirectTarget] of protectedPages) {
    await expectRedirect(pathname, redirectTarget);
  }
}

async function assertPublicApiBacklog() {
  const health = await expectJsonStatusOneOf("/api/health", [200]);
  if (health.payload.app !== "Lumbung Bersama") fail("/api/health app mismatch");
  if (health.payload.auth?.sessionCookie !== "httpOnly") {
    fail("/api/health does not report HttpOnly session cookie posture");
  }
  if (!health.payload.whatsapp || !health.payload.ai) {
    fail("/api/health missing integration readiness payloads");
  }
  pass(`/api/health mode ${health.payload.mode}`);

  const sourceRegistry = await expectJsonStatusOneOf("/api/open-data/sources", [200]);
  expectArray(sourceRegistry.payload.sources, "/api/open-data/sources sources");
  if (!sourceRegistry.payload.registryPolicy?.privacy || !sourceRegistry.payload.docsReference) {
    fail("/api/open-data/sources missing privacy policy metadata");
  }

  const sourceCheck = await expectJsonStatusOneOf("/api/peta-unggulan/source-check", [200]);
  expectArray(sourceCheck.payload.sources, "/api/peta-unggulan/source-check sources");
  if (!sourceCheck.payload.note || !sourceCheck.payload.coverage) {
    fail("/api/peta-unggulan/source-check missing caveat or coverage metadata");
  }

  const areaSearch = await expectJsonStatusOneOf("/api/admin-areas/search?q=Jawa&limit=3", [200]);
  expectArray(areaSearch.payload.areas, "/api/admin-areas/search areas");

  const drilldown = await expectJsonStatusOneOf("/api/admin-areas/drilldown?limit=3", [200]);
  expectArray(drilldown.payload.children, "/api/admin-areas/drilldown children");

  const boundary = await expectJsonStatusOneOf("/api/admin-areas/boundaries?level=4", [200]);
  if (boundary.payload.featureCollection?.type !== "FeatureCollection") {
    fail("/api/admin-areas/boundaries did not return a FeatureCollection");
  }

  const petaData = await expectJsonStatusOneOf("/api/peta-unggulan/data", [200, 503]);
  if (petaData.response.status === 503 && petaData.payload.error !== "DATABASE_URL_REQUIRED") {
    fail("/api/peta-unggulan/data setup gate mismatch");
  }
  if (petaData.response.status === 200) {
    expectArray(petaData.payload.villages, "/api/peta-unggulan/data villages");
    if (!petaData.payload.coverage) fail("/api/peta-unggulan/data missing coverage metadata");
  }

  const analyze = await expectJsonStatusOneOf(
    "/api/peta-unggulan/analyze",
    [200, 404, 503],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  if (analyze.response.status === 503 && analyze.payload.error !== "DATABASE_URL_REQUIRED") {
    fail("/api/peta-unggulan/analyze setup gate mismatch");
  }
  if (analyze.response.status === 404 && !["VILLAGE_NOT_FOUND", "COMMODITY_NOT_FOUND"].includes(analyze.payload.error)) {
    fail("/api/peta-unggulan/analyze empty-data gate mismatch");
  }
  if (analyze.response.status === 200 && !analyze.payload.opportunity) {
    fail("/api/peta-unggulan/analyze missing opportunity payload");
  }

  const commodityNews = await expectJsonStatusOneOf("/api/commodity-news", [400]);
  if (commodityNews.payload.error !== "COMMODITY_REQUIRED") {
    fail("/api/commodity-news did not validate missing commodity");
  }

  const signalSpine = await expectJsonStatusOneOf("/api/hackathon/signal-spine", [200]);
  assertSignalSpinePayload(signalSpine.payload);
}

async function assertHackathonApiGates() {
  const endpoints = [
    "/api/hackathon/mvp-summary",
    "/api/hackathon/data-quality",
    "/api/hackathon/opportunity-scores",
    "/api/hackathon/buyer-matching",
    "/api/hackathon/financing-readiness",
  ];

  for (const endpoint of endpoints) {
    const { response, payload } = await expectJsonStatusOneOf(endpoint, [401, 503]);
    assertProtectedGate(endpoint, response, payload, ["HACKATHON_SHARED_DATABASE_URL_REQUIRED"]);
  }
}

async function assertAuthAndWaGates() {
  const loginCsrf = await expectJsonStatusOneOf(
    "/api/auth/login",
    [403],
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
      },
      body: JSON.stringify({
        email: "jury@example.invalid",
        password: "not-a-secret",
      }),
    },
  );
  if (loginCsrf.payload.error !== "CSRF_REJECTED") fail("/api/auth/login CSRF gate mismatch");

  const logoutCsrf = await expectJsonStatusOneOf(
    "/api/auth/logout",
    [403],
    {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    },
  );
  if (logoutCsrf.payload.error !== "CSRF_REJECTED") fail("/api/auth/logout CSRF gate mismatch");

  const waMessages = await expectJsonStatusOneOf(
    "/api/wa/messages",
    [401, 503],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: "QA",
        message: "lapor panen kopi 120 kilo",
        clientMessageId: "qa-hackathon-demo",
      }),
    },
  );
  assertProtectedGate("POST /api/wa/messages", waMessages.response, waMessages.payload);

  const waSend = await expectJsonStatusOneOf(
    "/api/wa/send",
    [401, 503],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "6280000000000", message: "QA dry run" }),
    },
  );
  assertProtectedGate("POST /api/wa/send", waSend.response, waSend.payload);

  const webhookVerify = await expectJsonStatusOneOf(
    "/api/wa/webhook?hub.mode=subscribe&hub.verify_token=qa-hackathon-demo&hub.challenge=qa",
    [403, 503],
  );
  assertProtectedGate("GET /api/wa/webhook", webhookVerify.response, webhookVerify.payload, [
    "WHATSAPP_VERIFY_TOKEN_REQUIRED",
  ]);
}

async function maybeAssertLiveRoutes() {
  if (!liveBaseUrl) {
    pass("live route check skipped; set QA_LIVE_BASE_URL to verify deployed demo routes");
    return;
  }

  for (const pathname of ["/", "/peta-unggulan", "/api/health"]) {
    const response = await request(pathname, {}, liveBaseUrl);
    if (response.status !== 200) {
      fail(`${liveBaseUrl}${pathname} returned ${response.status}, expected 200`);
    }
    pass(`${liveBaseUrl}${pathname} -> 200`);
  }
}

async function run() {
  await startServerIfNeeded();
  await assertPublicPages();
  await assertProtectedPages();
  await assertPublicApiBacklog();
  await assertHackathonApiGates();
  await assertAuthAndWaGates();
  await maybeAssertLiveRoutes();
}

try {
  await run();
} finally {
  await stopServerIfStarted();
}

import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.QA_HACKATHON_PORT ?? 3112);
const baseUrl = (process.env.QA_HACKATHON_BASE_URL ?? `http://127.0.0.1:${port}`).replace(/\/$/, "");
const liveBaseUrl = process.env.QA_LIVE_BASE_URL?.replace(/\/$/, "");
const shouldStartServer = !process.env.QA_HACKATHON_BASE_URL;
const isWindows = process.platform === "win32";
const nativeDialogNames = new Set(["alert", "prompt", "confirm"]);

const bannedUserFacingTextPatterns = [
  { label: "database engine name", pattern: /\bPostgres(?:QL)?\b/i },
  { label: "raw operational data error", pattern: /\b(?:DATABASE_URL_REQUIRED|OPERATIONAL_DATA_REQUIRED)\b/i },
  { label: "raw env name", pattern: /\b(?:DATABASE_URL|HACKATHON_SHARED(?:_DATABASE_URL|_DB_[A-Z0-9_]+)?|DB_(?:HOST|PORT|PASSWORD|USERNAME|USER|DATABASE)|PGSSLMODE|ADMIN_(?:EMAIL|PASSWORD|PASSWORD_HASH|NAME|COOPERATIVE_ID)|QA_[A-Z0-9_]+|VISUAL_[A-Z0-9_]+|WHATSAPP_[A-Z0-9_]+|WA_PERSONAL_[A-Z0-9_]+|OPENAI_API_KEY|BPS_API_KEY|NEXT_PUBLIC_[A-Z0-9_]+)\b/i },
  { label: "operator-ready", pattern: /\boperator-ready\b/i },
  { label: "setup-required", pattern: /\bsetup-required\b/i },
  { label: "role:", pattern: /\brole\s*:/i },
  { label: "hackathon: N/N", pattern: /\bhackathon\s*:\s*\d+\s*\/\s*\d+\b/i },
];

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

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function isMainUiFile(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  if (!/\.(?:tsx|jsx)$/.test(rel)) return false;
  if (rel.startsWith("src/components/")) return true;
  if (rel.startsWith("src/app/api/")) return false;
  return /^src\/app\/(?:.*\/)?(?:page|layout|loading|error|not-found|template)\.(?:tsx|jsx)$/.test(rel);
}

function nativeDialogCallName(node, sourceFile) {
  if (ts.isIdentifier(node.expression) && nativeDialogNames.has(node.expression.text)) {
    return node.expression.text;
  }

  if (
    ts.isPropertyAccessExpression(node.expression) &&
    nativeDialogNames.has(node.expression.name.text) &&
    ["window", "globalThis"].includes(node.expression.expression.getText(sourceFile))
  ) {
    return node.expression.name.text;
  }

  return null;
}

async function assertNoNativeBrowserDialogsInMainUi() {
  const roots = [path.join(root, "src", "components"), path.join(root, "src", "app")];
  const files = (await Promise.all(roots.map((dir) => listFiles(dir)))).flat().filter(isMainUiFile);
  const violations = [];

  for (const filePath of files) {
    const sourceText = await readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function visit(node) {
      if (ts.isCallExpression(node)) {
        const callName = nativeDialogCallName(node, sourceFile);
        if (callName) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          violations.push(`${path.relative(root, filePath)}:${line + 1}:${character + 1} uses ${callName}()`);
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  if (violations.length) {
    fail(`Main UI components use native browser dialogs:\n${violations.join("\n")}`);
  }

  pass("main UI components avoid native browser dialogs");
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function visibleTextFromHtml(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function assertNoBannedUserFacingText(text, label) {
  const matched = bannedUserFacingTextPatterns.find(({ pattern }) => pattern.test(text));
  if (matched) {
    fail(`${label} contains banned user-facing copy: ${matched.label}`);
  }
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

function sessionCookieFrom(response, label) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0];
  if (!cookie.includes("=")) fail(`${label} did not return a session cookie`);
  if (!/;\s*HttpOnly\b/i.test(setCookie)) fail(`${label} session cookie is not HttpOnly`);
  return cookie;
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
  const visibleText = visibleTextFromHtml(html);
  assertNoBannedUserFacingText(visibleText, pathname);
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

function assertProtectedGate(label, response, payload, allowedSetupErrors = ["OPERATIONAL_DATA_REQUIRED"]) {
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
  await expectText("/", "Peta Potensi Desa");
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
  if (petaData.response.status === 503 && petaData.payload.error !== "OPERATIONAL_DATA_REQUIRED") {
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
  if (analyze.response.status === 503 && analyze.payload.error !== "OPERATIONAL_DATA_REQUIRED") {
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
    assertProtectedGate(endpoint, response, payload, ["EVIDENCE_SOURCE_REQUIRED"]);
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

  const sameOriginLoginValidation = await expectJsonStatusOneOf(
    "/api/auth/login",
    [400, 503],
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
      },
      body: JSON.stringify({}),
    },
  );
  if (sameOriginLoginValidation.response.status === 400 && sameOriginLoginValidation.payload.error !== "LOGIN_REQUIRED") {
    fail("/api/auth/login same-origin validation did not reach login validation");
  }
  if (
    sameOriginLoginValidation.response.status === 503 &&
    !["OPERATIONAL_DATA_REQUIRED", "ADMIN_AUTH_NOT_CONFIGURED"].includes(sameOriginLoginValidation.payload.error)
  ) {
    fail("/api/auth/login same-origin setup gate mismatch");
  }
  pass("/api/auth/login accepts same-origin mutation before validating credentials");

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

async function maybeAssertAuthenticatedDashboard() {
  const email = process.env.QA_AUTH_EMAIL;
  const password = process.env.QA_AUTH_PASSWORD;
  if (!email || !password) {
    pass("authenticated dashboard check skipped; set QA_AUTH_EMAIL and QA_AUTH_PASSWORD to enable it");
    return;
  }

  const loginResponse = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (loginResponse.status !== 200) {
    const payload = await loginResponse.json().catch(() => null);
    fail(`/api/auth/login returned ${loginResponse.status}: ${payload?.error ?? "LOGIN_FAILED"}`);
  }
  const cookie = sessionCookieFrom(loginResponse, "/api/auth/login");
  pass("/api/auth/login created an HttpOnly session cookie");

  const dashboardResponse = await request("/api/dashboard", {
    headers: { Cookie: cookie },
  });
  if (dashboardResponse.status !== 200) {
    const payload = await dashboardResponse.json().catch(() => null);
    fail(`/api/dashboard authenticated returned ${dashboardResponse.status}: ${payload?.error ?? "DASHBOARD_FAILED"}`);
  }

  const dashboard = await json(dashboardResponse, "/api/dashboard authenticated");
  expectPlainObject(dashboard.cooperative, "/api/dashboard cooperative");
  expectArray(dashboard.queue, "/api/dashboard queue");
  expectArray(dashboard.stocks, "/api/dashboard stocks");
  expectArray(dashboard.buyerRequirements, "/api/dashboard buyerRequirements");
  expectArray(dashboard.stockLedger, "/api/dashboard stockLedger");
  expectArray(dashboard.mediaEvidence, "/api/dashboard mediaEvidence");
  expectPlainObject(dashboard.prefixedDbStatus, "/api/dashboard prefixedDbStatus");
  expectPlainObject(dashboard.hackathonSharedDb, "/api/dashboard hackathonSharedDb");

  const sharedDb = dashboard.hackathonSharedDb;
  if (!["setup-required", "ready", "query-error"].includes(sharedDb.status)) {
    fail(`/api/dashboard hackathonSharedDb returned unexpected status ${sharedDb.status}`);
  }
  if (!sharedDb.tables || typeof sharedDb.tables !== "object") {
    fail("/api/dashboard hackathonSharedDb missing tables object");
  }
  for (const key of ["productRows", "areaRows", "financingRows", "transactionRows"]) {
    expectArray(sharedDb.tables[key], `/api/dashboard hackathonSharedDb.tables.${key}`);
  }

  if (process.env.QA_EXPECT_SHARED_DB_READY === "1" && sharedDb.status === "setup-required") {
    fail("/api/dashboard hackathonSharedDb is setup-required, expected configured shared DB");
  }
  if (process.env.QA_EXPECT_SHARED_DB_ROWS === "1") {
    const rowCount =
      sharedDb.tables.productRows.length +
      sharedDb.tables.areaRows.length +
      sharedDb.tables.financingRows.length +
      sharedDb.tables.transactionRows.length;
    if (rowCount <= 0) {
      fail("/api/dashboard hackathonSharedDb returned zero aggregate rows");
    }
  }

  pass(`/api/dashboard authenticated exposes hackathonSharedDb status ${sharedDb.status}`);
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
    if (!pathname.startsWith("/api/")) {
      const html = await response.text();
      assertNoBannedUserFacingText(visibleTextFromHtml(html), `${liveBaseUrl}${pathname}`);
    }
    pass(`${liveBaseUrl}${pathname} -> 200`);
  }
}

async function run() {
  await assertNoNativeBrowserDialogsInMainUi();
  await startServerIfNeeded();
  await assertPublicPages();
  await assertProtectedPages();
  await assertPublicApiBacklog();
  await assertHackathonApiGates();
  await assertAuthAndWaGates();
  await maybeAssertAuthenticatedDashboard();
  await maybeAssertLiveRoutes();
}

try {
  await run();
} finally {
  await stopServerIfStarted();
}

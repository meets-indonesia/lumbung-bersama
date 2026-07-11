import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.QA_PORT ?? 3107);
const baseUrl = `http://127.0.0.1:${port}`;
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

async function request(pathname, init = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...init,
  });
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

  serverProcess = spawn(command, args, {
    cwd: root,
    env: process.env,
    shell: isWindows,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
  serverProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let attempt = 0; attempt < 40; attempt += 1) {
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

async function expectStatus(pathname, expectedStatus) {
  const response = await request(pathname);
  if (response.status !== expectedStatus) {
    fail(`${pathname} returned ${response.status}, expected ${expectedStatus}`);
  }
  pass(`${pathname} -> ${expectedStatus}`);
  return response;
}

async function expectStatusOneOf(pathname, expectedStatuses, init = {}) {
  const response = await request(pathname, init);
  if (!expectedStatuses.includes(response.status)) {
    fail(`${pathname} returned ${response.status}, expected one of ${expectedStatuses.join(", ")}`);
  }
  pass(`${pathname} -> ${response.status}`);
  return response;
}

async function expectJsonStatus(pathname, expectedStatus, init = {}) {
  const response = await expectStatusOneOf(pathname, [expectedStatus], init);
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    fail(`${pathname} did not return a JSON object`);
  }
  pass(`${pathname} returns JSON`);
  return payload;
}

async function expectJsonStatusOneOf(pathname, expectedStatuses, init = {}) {
  const response = await expectStatusOneOf(pathname, expectedStatuses, init);
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    fail(`${pathname} did not return a JSON object`);
  }
  pass(`${pathname} returns JSON`);
  return { response, payload };
}

function expectArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} is not an array`);
}

function expectPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} is not an object`);
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
  assertNoSecretValues(payload, label);
  assertNoUnsafeIntegrationClaim(payload, label);
  pass(`${label} exposes signal spine JSON without secrets or official-integration overclaim`);
}

async function expectText(pathname, expected) {
  const response = await expectStatus(pathname, 200);
  const html = await response.text();
  if (!html.includes(expected)) {
    fail(`${pathname} did not include expected text: ${expected}`);
  }
  pass(`${pathname} contains "${expected}"`);
}

async function expectLoginRedirect(pathname) {
  const response = await request(pathname);
  if (![302, 303, 307, 308].includes(response.status)) {
    fail(`${pathname} returned ${response.status}, expected login redirect`);
  }
  const location = response.headers.get("location") ?? "";
  if (!location.includes(`/login?next=${pathname}`)) {
    fail(`${pathname} redirect location was ${location}`);
  }
  pass(`${pathname} redirects to login`);
}

async function expectRedirect(pathname, expectedLocationPart) {
  const response = await request(pathname);
  if (![301, 302, 303, 307, 308].includes(response.status)) {
    fail(`${pathname} returned ${response.status}, expected redirect`);
  }
  const location = response.headers.get("location") ?? "";
  if (!location.includes(expectedLocationPart)) {
    fail(`${pathname} redirect location was ${location}, expected ${expectedLocationPart}`);
  }
  pass(`${pathname} redirects to ${expectedLocationPart}`);
}

function assertDatabaseOrAuthGate(pathname, response, payload) {
  if (response.status === 503 && payload.error !== "OPERATIONAL_DATA_REQUIRED") {
    fail(`${pathname} 503 did not report OPERATIONAL_DATA_REQUIRED`);
  }
  if (response.status === 401 && payload.error !== "AUTH_REQUIRED") {
    fail(`${pathname} 401 did not report AUTH_REQUIRED`);
  }
  if (response.status === 403 && !["CSRF_REJECTED", "ROLE_REQUIRED"].includes(payload.error)) {
    fail(`${pathname} 403 did not report an expected auth/CSRF gate`);
  }
  pass(`${pathname} protected by ${response.status === 503 ? "operational-data gate" : "auth gate"}`);
}

async function assertPublicBackendEndpoints() {
  const registry = await expectJsonStatus("/api/open-data/sources", 200);
  expectArray(registry.sources, "/api/open-data/sources sources");
  if (!registry.registryPolicy?.privacy || !registry.docsReference) {
    fail("/api/open-data/sources did not expose safe registry policy metadata");
  }
  pass("/api/open-data/sources exposes source registry metadata without secrets");

  const drilldown = await expectJsonStatus("/api/admin-areas/drilldown?limit=3", 200);
  expectArray(drilldown.children, "/api/admin-areas/drilldown children");
  if (!drilldown.selected || !drilldown.query) {
    fail("/api/admin-areas/drilldown missing selected area or query metadata");
  }
  pass("/api/admin-areas/drilldown returns map drilldown payload");

  const areaSearch = await expectJsonStatus("/api/admin-areas/search?q=Jawa&limit=3", 200);
  expectArray(areaSearch.areas, "/api/admin-areas/search areas");
  if (!areaSearch.query) fail("/api/admin-areas/search missing query metadata");
  pass("/api/admin-areas/search returns searchable area payload");

  const commoditySearch = await expectJsonStatus("/api/commodity-profiles/search?q=kopi&limit=3", 200);
  expectArray(commoditySearch.profiles, "/api/commodity-profiles/search profiles");
  if (!commoditySearch.query) fail("/api/commodity-profiles/search missing query metadata");
  pass("/api/commodity-profiles/search returns commodity profile payload");

  const boundary = await expectJsonStatus("/api/admin-areas/boundaries?level=4", 200);
  if (boundary.featureCollection?.type !== "FeatureCollection") {
    fail("/api/admin-areas/boundaries did not return a FeatureCollection");
  }
  pass("/api/admin-areas/boundaries validates level-4 parent guard without external fetch");

  const newsValidation = await expectJsonStatus("/api/commodity-news", 400);
  if (newsValidation.error !== "COMMODITY_REQUIRED") {
    fail("/api/commodity-news missing required commodity validation");
  }
  pass("/api/commodity-news validates required commodity without external fetch");

  const petaData = await expectJsonStatusOneOf("/api/peta-unggulan/data", [200, 503]);
  if (petaData.response.status === 503 && petaData.payload.error !== "OPERATIONAL_DATA_REQUIRED") {
    fail("/api/peta-unggulan/data 503 did not report OPERATIONAL_DATA_REQUIRED");
  }
  if (petaData.response.status === 200) {
    expectArray(petaData.payload.villages, "/api/peta-unggulan/data villages");
    if (!petaData.payload.coverage) fail("/api/peta-unggulan/data missing coverage metadata");
  }
  pass(`/api/peta-unggulan/data covered by ${petaData.response.status === 503 ? "operational-data gate" : "payload check"}`);

  const coverage = await expectJsonStatusOneOf("/api/commodity-profiles/coverage", [200, 503]);
  if (coverage.response.status === 503 && coverage.payload.error !== "OPERATIONAL_DATA_REQUIRED") {
    fail("/api/commodity-profiles/coverage 503 did not report OPERATIONAL_DATA_REQUIRED");
  }
  if (coverage.response.status === 200 && !coverage.payload.totals) {
    fail("/api/commodity-profiles/coverage missing totals");
  }
  pass(`/api/commodity-profiles/coverage covered by ${coverage.response.status === 503 ? "operational-data gate" : "coverage payload"}`);

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
    fail("/api/peta-unggulan/analyze 503 did not report OPERATIONAL_DATA_REQUIRED");
  }
  if (analyze.response.status === 404 && !["VILLAGE_NOT_FOUND", "COMMODITY_NOT_FOUND"].includes(analyze.payload.error)) {
    fail("/api/peta-unggulan/analyze 404 did not report a known empty-data condition");
  }
  if (analyze.response.status === 200 && !analyze.payload.opportunity) {
    fail("/api/peta-unggulan/analyze missing opportunity payload");
  }
  pass(`/api/peta-unggulan/analyze covered by ${analyze.response.status === 200 ? "rules payload" : "setup/data gate"}`);

  const webhook = await expectJsonStatusOneOf(
    "/api/wa/webhook?hub.mode=subscribe&hub.verify_token=qa-smoke&hub.challenge=qa-smoke",
    [403, 503],
  );
  if (webhook.response.status === 503 && webhook.payload.error !== "WHATSAPP_VERIFY_TOKEN_REQUIRED") {
    fail("/api/wa/webhook 503 did not report WHATSAPP_VERIFY_TOKEN_REQUIRED");
  }
  if (webhook.response.status === 403 && webhook.payload.error !== "WEBHOOK_VERIFICATION_FAILED") {
    fail("/api/wa/webhook 403 did not report WEBHOOK_VERIFICATION_FAILED");
  }
  pass("/api/wa/webhook verification gate is covered without real tokens");
}

async function assertProtectedBackendEndpoints() {
  for (const endpoint of ["/api/dashboard", "/api/me", "/api/notifications"]) {
    const { response, payload } = await expectJsonStatusOneOf(endpoint, [401, 503]);
    assertDatabaseOrAuthGate(endpoint, response, payload);
  }

  const protectedMutations = [
    [
      "/api/wa/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "QA",
          message: "Kopi kering siap dicek buyer",
        }),
      },
    ],
    [
      "/api/wa/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "6281200000000", message: "QA smoke" }),
      },
    ],
    [
      "/api/agents/run",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: "Agen Unggulan Desa", recordId: "LB-1024" }),
      },
    ],
    ["/api/buyer-matches/buyer-roastery/approve", { method: "POST" }],
    ["/api/stocks/stock-minyak-goreng/restock", { method: "POST" }],
    ["/api/finance-requests/SP-204/review", { method: "POST" }],
    [
      "/api/operator-queue/LB-1024",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Sudah Disetujui" }),
      },
    ],
    [
      "/api/operator-queue/LB-1024",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "follow-up" }),
      },
    ],
    [
      "/api/report-sections/report-buyer",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ included: false }),
      },
    ],
    [
      "/api/report-periods/current/lock",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: true }),
      },
    ],
    [
      "/api/notifications",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      },
    ],
    [
      "/api/me",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: "QA Smoke", title: "Operator", phone: "" }),
      },
    ],
  ];

  for (const [endpoint, init] of protectedMutations) {
    const { response, payload } = await expectJsonStatusOneOf(endpoint, [401, 403, 503], init);
    assertDatabaseOrAuthGate(`${init.method} ${endpoint}`, response, payload);
  }

  const logoutCsrf = await expectJsonStatus(
    "/api/auth/logout",
    403,
    {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    },
  );
  if (logoutCsrf.error !== "CSRF_REJECTED") {
    fail("/api/auth/logout cross-origin did not report CSRF_REJECTED");
  }
  pass("/api/auth/logout rejects cross-origin mutation");
}

async function assertHackathonEndpoints() {
  const signalSpine = await expectJsonStatus("/api/hackathon/signal-spine", 200);
  assertSignalSpinePayload(signalSpine);

  for (const endpoint of [
    "/api/hackathon/mvp-summary",
    "/api/hackathon/data-quality",
    "/api/hackathon/opportunity-scores",
    "/api/hackathon/buyer-matching",
    "/api/hackathon/financing-readiness",
  ]) {
    const { response, payload } = await expectJsonStatusOneOf(endpoint, [401, 503]);
    if (response.status === 401 && payload.error !== "AUTH_REQUIRED") {
      fail(`${endpoint} 401 did not report AUTH_REQUIRED`);
    }
    if (response.status === 503 && payload.error !== "EVIDENCE_SOURCE_REQUIRED") {
      fail(`${endpoint} 503 did not report EVIDENCE_SOURCE_REQUIRED`);
    }
    pass(`${endpoint} protected by ${response.status === 503 ? "evidence-source gate" : "auth gate"}`);
  }
}

async function readSourceFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await readSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|mjs|sql|md)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function isGuardrailContext(content, index) {
  const context = content
    .slice(Math.max(0, index - 180), Math.min(content.length, index + 180))
    .toLowerCase();

  return [
    "jangan mengklaim",
    "tidak mengklaim",
    "do not claim",
    "must not claim",
    "must not expose",
    "not a named buyer",
    "bukan klaim",
    "bukan referensi utama",
    "tidak menjadi klaim",
  ].some((marker) => context.includes(marker));
}

function firstDisallowedPatternMatch(content, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);

  for (const match of content.matchAll(matcher)) {
    if (!isGuardrailContext(content, match.index ?? 0)) {
      return match[0];
    }
  }

  return null;
}

async function assertNoOverclaimText() {
  const files = await readSourceFiles(path.join(root, "src"));
  files.push(path.join(root, "db", "schema.sql"));
  files.push(path.join(root, "db", "seed.sql"));
  const badPatterns = [
    { pattern: /ai-ready/i, label: "ai-ready", message: "rules-only endpoints must not claim ai-ready" },
    { pattern: /Siap dikirim/i, label: "Siap dikirim", message: "draft WA records must not claim live delivery" },
    { pattern: /Siap kontak/i, label: "Siap kontak", message: "buyer archetypes must not be marked ready to contact" },
    {
      pattern: /Nusantara Roastery|Dapur Olahan Desa|Warung Mitra Kecamatan/i,
      label: "named demo buyer",
      message: "demo buyer rows must use archetypes, not real-looking buyer names",
    },
    {
      pattern: /Terintegrasi resmi SIMKOPDES|SIMKOPDES produksi|live SIMKOPDES/i,
      label: "live SIMKOPDES claim",
      message: "app must not claim live or production SIMKOPDES integration",
    },
    {
      pattern: /AI otomatis memutuskan|keputusan otomatis oleh AI|autonomous AI decision/i,
      label: "autonomous AI claim",
      message: "app must not claim autonomous AI decisioning",
    },
    {
      pattern: /Kredit otomatis disetujui|Pembiayaan otomatis disetujui|pinjaman otomatis disetujui/i,
      label: "auto-financing approval claim",
      message: "app must not claim automatic financing approval",
    },
    {
      pattern: /Marketplace end-to-end|checkout marketplace|buyer pasti membeli/i,
      label: "marketplace or guaranteed buyer claim",
      message: "app must not claim marketplace checkout or guaranteed buyer demand",
    },
  ];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const item of badPatterns) {
      if (firstDisallowedPatternMatch(content, item.pattern)) {
        fail(`${item.message}: ${path.relative(root, file)} contains ${item.label}`);
      }
    }
  }

  pass("source scan has no MVP red-line overclaim text");

  const dashboardSource = await readFile(path.join(root, "src", "app", "api", "dashboard", "route.ts"), "utf8");
  if (!dashboardSource.includes("buyerSource") || !dashboardSource.includes("not a named buyer")) {
    fail("dashboard API does not label buyer rows as archetype-only evidence");
  }
  for (const marker of [
    "anak_sarengklek_buyer_requirements",
    "anak_sarengklek_stock_ledger",
    "anak_sarengklek_media_evidence",
    "prefixedDbStatus",
    "auth.user.cooperativeId",
  ]) {
    if (!dashboardSource.includes(marker)) {
      fail(`dashboard API does not consume prefixed app-owned table ${marker}`);
    }
  }

  const schemaSource = await readFile(path.join(root, "db", "schema.sql"), "utf8");
  for (const marker of [
    "CREATE TABLE IF NOT EXISTS anak_sarengklek_buyer_requirements",
    "CREATE TABLE IF NOT EXISTS anak_sarengklek_stock_ledger",
    "CREATE TABLE IF NOT EXISTS anak_sarengklek_media_evidence",
  ]) {
    if (!schemaSource.includes(marker)) {
      fail(`schema does not create required prefixed table: ${marker}`);
    }
  }

  const hackathonBuyerSource = await readFile(
    path.join(root, "src", "app", "api", "hackathon", "buyer-matching", "route.ts"),
    "utf8",
  );
  if (!hackathonBuyerSource.includes("not named buyers or live demand records")) {
    fail("hackathon buyer-matching endpoint does not expose the archetype-only caveat");
  }

  const hackathonFinancingSource = await readFile(
    path.join(root, "src", "app", "api", "hackathon", "financing-readiness", "route.ts"),
    "utf8",
  );
  if (!hackathonFinancingSource.includes("automatic financing approval")) {
    fail("hackathon financing-readiness endpoint does not expose the no-auto-approval caveat");
  }

  pass("source scan confirms archetype-only buyer evidence and prefixed app-owned table gates");

  const authSource = await readFile(path.join(root, "src", "lib", "auth.ts"), "utf8");
  if (!authSource.includes("CSRF_REJECTED") || !authSource.includes("requireSameOriginMutation")) {
    fail("auth.ts does not expose the same-origin mutation gate");
  }

  const loginSource = await readFile(
    path.join(root, "src", "app", "api", "auth", "login", "route.ts"),
    "utf8",
  );
  if (!loginSource.includes("LOGIN_THROTTLED") || !loginSource.includes("checkLoginThrottle")) {
    fail("login route does not expose the login throttle gate");
  }

  pass("source scan confirms CSRF and login throttle gates");

  const roleSensitiveRoutes = [
    ["buyer-matches/[id]/approve/route.ts", "requireRole"],
    ["finance-requests/[id]/review/route.ts", "requireRole"],
    ["stocks/[id]/restock/route.ts", "requireRole"],
    ["operator-queue/[id]/route.ts", "requireRole"],
    ["report-periods/current/lock/route.ts", "requireRole"],
    ["report-sections/[id]/route.ts", "requireRole"],
  ];

  for (const [routePath, marker] of roleSensitiveRoutes) {
    const content = await readFile(path.join(root, "src", "app", "api", ...routePath.split("/")), "utf8");
    if (!content.includes(marker) || !content.includes("cooperative_id")) {
      fail(`${routePath} does not include role and cooperative scope gates`);
    }
  }

  const externalRoutes = [
    ["commodity-news/route.ts", "checkRateLimit"],
    ["peta-potensi/source-check/route.ts", "checkRateLimit"],
    ["admin-areas/boundaries/route.ts", "checkRateLimit"],
    ["wa/send/route.ts", "checkRateLimit"],
  ];

  for (const [routePath, marker] of externalRoutes) {
    const content = await readFile(path.join(root, "src", "app", "api", ...routePath.split("/")), "utf8");
    if (!content.includes(marker) || !content.includes("fetchWithTimeout")) {
      fail(`${routePath} does not include timeout and rate-limit gates`);
    }
  }

  pass("source scan confirms role/scope and external fetch gates");
}

async function run() {
  await startServerIfNeeded();

  await expectText("/", "Transformasi Digital");
  await expectText("/login", "Login operator");
  await expectText("/peta-unggulan", "Peta Unggulan");
  await expectRedirect("/peta-potensi", "/peta-unggulan");
  await expectRedirect("/demo", "/login?next=/dashboard");
  await expectRedirect("/demo/suara-warga", "/login?next=/wa");

  for (const page of ["/dashboard", "/agents", "/wa", "/laporan", "/integrasi", "/modules"]) {
    await expectLoginRedirect(page);
  }
  await expectRedirect("/modules/peta-unggulan", "/login?next=/modules");

  const health = await expectStatus("/api/health", 200);
  const healthPayload = await health.json();
  if (healthPayload.app !== "Lumbung Bersama") fail("/api/health app mismatch");
  pass(`/api/health mode ${healthPayload.mode}`);

  await assertPublicBackendEndpoints();
  await assertProtectedBackendEndpoints();
  await assertHackathonEndpoints();

  const csrf = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({
      email: "admin@lumbung-bersama.local",
      password: "wrong-password",
    }),
  });

  if (csrf.status !== 403) {
    fail(`/api/auth/login cross-origin returned ${csrf.status}, expected 403`);
  }
  const csrfPayload = await csrf.json().catch(() => ({}));
  if (csrfPayload.error !== "CSRF_REJECTED") {
    fail(`/api/auth/login cross-origin did not report CSRF_REJECTED`);
  }
  pass("/api/auth/login rejects cross-origin mutation");

  await assertNoOverclaimText();
}

try {
  await run();
} finally {
  await stopServerIfStarted();
}

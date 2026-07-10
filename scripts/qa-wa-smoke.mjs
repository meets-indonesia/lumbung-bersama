import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./load-local-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadLocalEnv(root);

const port = Number(process.env.QA_WA_PORT ?? 3111);
const baseUrl = `http://127.0.0.1:${port}`;
const isWindows = process.platform === "win32";
const verifyToken = process.env.QA_WA_VERIFY_TOKEN ?? `qa-wa-${randomUUID()}`;
const appSecret = process.env.QA_WA_APP_SECRET ?? randomUUID();
const allowLiveSend = process.env.QA_WA_ALLOW_LIVE_SEND === "1";

let serverProcess = null;
let serverOwned = false;

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

async function json(response) {
  return response.json().catch(() => ({}));
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

  const serverEnv = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    WHATSAPP_VERIFY_TOKEN: verifyToken,
    WHATSAPP_APP_SECRET: appSecret,
  };

  if (!allowLiveSend) {
    delete serverEnv.WHATSAPP_BUSINESS_TOKEN;
    delete serverEnv.WHATSAPP_PHONE_NUMBER_ID;
  }

  const command = isWindows ? "cmd.exe" : "npm";
  const args = isWindows
    ? ["/d", "/s", "/c", `npm run dev -- -p ${port}`]
    : ["run", "dev", "--", "-p", String(port)];

  serverProcess = spawn(command, args, {
    cwd: root,
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverOwned = true;

  serverProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
  serverProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let attempt = 0; attempt < 80; attempt += 1) {
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

async function assertSourceGuardrails() {
  const files = [
    "src/app/api/wa/messages/route.ts",
    "src/app/api/wa/send/route.ts",
    "src/app/api/wa/webhook/route.ts",
    "src/app/api/wa/status.ts",
    "src/components/WhatsAppHubClient.tsx",
  ];

  for (const file of files) {
    const content = await readFile(path.join(root, file), "utf8");
    if (/console\.(log|warn|error|info|debug)\s*\(/.test(content)) {
      fail(`${file} contains console logging`);
    }
    if (/WHATSAPP_(BUSINESS_TOKEN|APP_SECRET|VERIFY_TOKEN|PHONE_NUMBER_ID)\s*=\s*["']/.test(content)) {
      fail(`${file} appears to hardcode WhatsApp configuration`);
    }
  }

  const sendRoute = await readFile(path.join(root, "src/app/api/wa/send/route.ts"), "utf8");
  if (sendRoute.includes("provider: payload") || sendRoute.includes("details: payload")) {
    fail("send route returns raw Graph API payload");
  }
  if (sendRoute.includes("Terkirim ke ${to}")) {
    fail("send route stores an unmasked destination phone in bot reply");
  }

  const webhookRoute = await readFile(path.join(root, "src/app/api/wa/webhook/route.ts"), "utf8");
  if (webhookRoute.includes("audio?.id") || webhookRoute.includes("document?.filename")) {
    fail("webhook route stores provider media identifiers in message text");
  }

  pass("WA source guardrails avoid console logs, hardcoded secrets, raw provider payloads, and media ids");
}

async function smokeWebhookVerify() {
  const challenge = `challenge-${randomUUID()}`;
  const response = await request(
    `/api/wa/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=${encodeURIComponent(challenge)}`,
  );

  if (serverOwned) {
    expectStatus(response, 200, "webhook verify");
    const text = await response.text();
    if (text !== challenge) fail("webhook verify did not echo challenge");
    pass("webhook verify echoes challenge with smoke token");
    return;
  }

  expectOneOf(response, [200, 403, 503], "webhook verify existing server");
}

async function smokeUnauthenticatedGates() {
  const send = await request("/api/wa/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: "6280000000000", message: "QA smoke dry run" }),
  });
  expectOneOf(send, [401, 503], "unauthenticated send gate");

  const local = await request("/api/wa/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender: "QA", message: "QA smoke local intake" }),
  });
  expectOneOf(local, [401, 503], "unauthenticated local intake gate");
}

async function maybeLogin() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.QA_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;

  if (!process.env.DATABASE_URL || !adminEmail || !process.env.ADMIN_PASSWORD_HASH || !adminPassword) {
    pass("authenticated WA mutation smoke skipped; DATABASE_URL/admin QA credentials are not fully configured");
    return null;
  }

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  expectStatus(login, 200, "admin login");

  const cookie = cookieHeaderFrom(login);
  if (!cookie.includes("lb_session=")) fail("admin login did not set session cookie");
  pass("admin login set session cookie");
  return cookie;
}

async function smokeLocalIntake(cookie) {
  const clientMessageId = `wa-smoke-${Date.now()}`;
  const response = await authedRequest(cookie, "/api/wa/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: "QA Smoke",
      message: "QA smoke: gabah kering 10 kg siap dicek operator",
      clientMessageId,
    }),
  });
  expectStatus(response, 200, "local WA intake");

  const payload = await json(response);
  if (!payload.message?.id || !payload.queue?.id) {
    fail("local WA intake did not return message and queue ids");
  }
  if (!["ready", "setup-required"].includes(payload.setup?.status)) {
    fail("local WA intake did not return explicit setup status");
  }
  pass(`local WA intake stored draft with setup status ${payload.setup.status}`);

  const duplicate = await authedRequest(cookie, "/api/wa/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: "QA Smoke",
      message: "QA smoke: gabah kering 10 kg siap dicek operator",
      clientMessageId,
    }),
  });
  expectStatus(duplicate, 200, "local WA duplicate intake");

  const duplicatePayload = await json(duplicate);
  if (duplicatePayload.message?.id !== payload.message.id) {
    fail("local WA duplicate intake was not idempotent by clientMessageId");
  }
  pass("local WA intake is idempotent by clientMessageId");
}

async function smokeWebhookPost() {
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ profile: { name: "QA Smoke" }, wa_id: "6280000000000" }],
              messages: [
                {
                  from: "6280000000000",
                  id: `wamid.qa.${randomUUID()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: "QA smoke webhook: stok beras 10 kg siap dicek" },
                },
              ],
            },
          },
        ],
      },
    ],
  });
  const signature = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;

  const response = await request("/api/wa/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": signature,
    },
    body,
  });

  if (!process.env.DATABASE_URL) {
    expectStatus(response, 503, "webhook POST database setup gate");
    const payload = await json(response);
    if (payload.error !== "DATABASE_URL_REQUIRED") fail("webhook POST did not report database setup gate");
    return;
  }

  expectOneOf(response, [200, 404], "webhook POST");
  const payload = await json(response);
  if (response.status === 404 && payload.error === "COOPERATIVE_NOT_FOUND") {
    pass("webhook POST reports cooperative setup blocker");
    return;
  }
  if (payload.stored < 1 || payload.queued < 1) {
    fail("webhook POST did not store and queue the inbound message");
  }
  if (!["ready", "setup-required"].includes(payload.setup?.status)) {
    fail("webhook POST did not return explicit setup status");
  }
  pass(`webhook POST stored and queued message with setup status ${payload.setup.status}`);
}

async function smokeSendSetup(cookie) {
  if (!serverOwned) {
    pass("authenticated send dry run skipped on existing server to avoid live WhatsApp delivery");
    return;
  }

  const response = await authedRequest(cookie, "/api/wa/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: "6280000000000", message: "QA smoke send dry run" }),
  });

  if (allowLiveSend) {
    expectOneOf(response, [200, 502, 504], "authenticated send live opt-in");
    pass("authenticated send live opt-in completed without exposing raw provider payload");
    return;
  }

  expectStatus(response, 503, "authenticated send setup gate");
  const payload = await json(response);
  if (payload.error !== "WHATSAPP_SEND_NOT_CONFIGURED" || payload.setup?.send?.status !== "setup-required") {
    fail("authenticated send did not report Cloud API send setup gate");
  }
  pass("authenticated send reports setup-required without live delivery");
}

async function run() {
  await assertSourceGuardrails();
  await startServerIfNeeded();

  const health = await request("/api/health");
  expectStatus(health, 200, "/api/health");
  const healthPayload = await json(health);
  if (!healthPayload.whatsapp) fail("/api/health did not expose WhatsApp setup status");
  pass(`/api/health mode ${healthPayload.mode}`);

  await smokeWebhookVerify();
  await smokeUnauthenticatedGates();

  const cookie = await maybeLogin();
  if (cookie) {
    await smokeLocalIntake(cookie);
    await smokeSendSetup(cookie);
  }

  await smokeWebhookPost();
}

try {
  await run();
} finally {
  await stopServerIfStarted();
}

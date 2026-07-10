import { integrationChecks } from "@/lib/demo-data";
import { getAiProviderStatus } from "@/lib/ai-provider";
import { isDatabaseConfigured, queryOne } from "@/lib/postgres";
import { getWaSetupStatus } from "@/app/api/wa/status";

export const runtime = "nodejs";

function getPublicWaStatus() {
  const setup = getWaSetupStatus();
  return {
    status: setup.status,
    cloudApi: {
      send: setup.send.status,
      webhook: setup.webhook.status,
      message:
        setup.status === "ready"
          ? "Kanal WhatsApp resmi siap untuk webhook dan outbound text."
          : "Kanal WhatsApp resmi perlu aktivasi sebelum live send/webhook.",
    },
    personalBridge: {
      status: setup.personalPairing.status,
      adapter: setup.personalPairing.adapter,
      command: setup.personalPairing.command,
      message: setup.personalPairing.message,
      capabilities: setup.personalPairing.capabilities,
      activationRequired: setup.personalPairing.status !== "available",
    },
  };
}

export async function GET() {
  const envStatus = integrationChecks.map((item) => {
    const required = item.env.split(",").map((envName) => envName.trim());
    const configured = required.every((envName) => Boolean(process.env[envName]));

    return {
      name: item.name,
      required: required.map((_, index) => `prasyarat ${index + 1}`),
      configured,
      status: configured ? "configured" : "not-configured",
      fallback: item.fallback,
    };
  });

  let database = {
    configured: isDatabaseConfigured(),
    reachable: false,
    message: isDatabaseConfigured()
      ? "Koneksi data operasional tersedia, koneksi belum dicek."
      : "Koneksi data operasional belum diaktifkan.",
  };

  if (isDatabaseConfigured()) {
    try {
      await queryOne("SELECT 1 AS ok");
      database = {
        configured: true,
        reachable: true,
        message: "Data operasional terhubung.",
      };
    } catch {
      database = {
        configured: true,
        reachable: false,
        message: "Data operasional tidak merespons.",
      };
    }
  }

  const auth = {
    configured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH),
    required: ["ADMIN_EMAIL", "ADMIN_PASSWORD_HASH"],
    juryConfigured: Boolean(process.env.JURY_EMAIL && process.env.JURY_PASSWORD_HASH),
    optional: ["JURY_EMAIL", "JURY_PASSWORD_HASH"],
    sessionCookie: "httpOnly",
  };

  const whatsapp = {
    webhookConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_APP_SECRET),
    sendConfigured: Boolean(process.env.WHATSAPP_BUSINESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    required: [
      "WhatsApp webhook verification",
      "WhatsApp app signature",
      "WhatsApp send token",
      "WhatsApp phone number",
    ],
    setup: getPublicWaStatus(),
  };
  const ai = getAiProviderStatus();

  return Response.json({
    app: "Lumbung Bersama",
    mode: database.reachable && auth.configured ? "operator-ready" : "setup-required",
    checkedAt: new Date().toISOString(),
    database,
    auth,
    ai,
    whatsapp,
    integrations: envStatus,
  });
}

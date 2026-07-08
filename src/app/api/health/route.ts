import { integrationChecks } from "@/lib/demo-data";
import { isDatabaseConfigured, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

export async function GET() {
  const envStatus = integrationChecks.map((item) => {
    const required = item.env.split(",").map((envName) => envName.trim());
    const configured = required.every((envName) => Boolean(process.env[envName]));

    return {
      name: item.name,
      required,
      configured,
      status: configured ? "configured" : "not-configured",
      fallback: item.fallback,
    };
  });

  let database = {
    configured: isDatabaseConfigured(),
    reachable: false,
    message: isDatabaseConfigured()
      ? "DATABASE_URL tersedia, koneksi belum dicek."
      : "DATABASE_URL belum diisi.",
  };

  if (isDatabaseConfigured()) {
    try {
      await queryOne("SELECT 1 AS ok");
      database = {
        configured: true,
        reachable: true,
        message: "Postgres terhubung.",
      };
    } catch (error) {
      database = {
        configured: true,
        reachable: false,
        message: error instanceof Error ? error.message : "Postgres tidak merespons.",
      };
    }
  }

  const auth = {
    configured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH),
    required: ["ADMIN_EMAIL", "ADMIN_PASSWORD_HASH"],
    sessionCookie: "httpOnly",
  };

  const whatsapp = {
    webhookConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_APP_SECRET),
    sendConfigured: Boolean(process.env.WHATSAPP_BUSINESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    required: [
      "WHATSAPP_VERIFY_TOKEN",
      "WHATSAPP_APP_SECRET",
      "WHATSAPP_BUSINESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
    ],
  };

  return Response.json({
    app: "Lumbung Bersama",
    mode: database.reachable && auth.configured ? "operator-ready" : "setup-required",
    checkedAt: new Date().toISOString(),
    database,
    auth,
    whatsapp,
    integrations: envStatus,
  });
}

type WaSurface = "send" | "webhook";

const WA_REQUIREMENTS: Array<{ key: string; surface: WaSurface }> = [
  { key: "WHATSAPP_BUSINESS_TOKEN", surface: "send" },
  { key: "WHATSAPP_PHONE_NUMBER_ID", surface: "send" },
  { key: "WHATSAPP_VERIFY_TOKEN", surface: "webhook" },
  { key: "WHATSAPP_APP_SECRET", surface: "webhook" },
];

function envReady(key: string) {
  return Boolean(process.env[key]?.trim());
}

function statusFor(keys: string[]) {
  const missing = keys.filter((key) => !envReady(key));
  return {
    status: missing.length ? "setup-required" : "ready",
    missing,
  };
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function valueAsString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

export function getWaSetupStatus() {
  const sendKeys = WA_REQUIREMENTS.filter((item) => item.surface === "send").map((item) => item.key);
  const webhookKeys = WA_REQUIREMENTS.filter((item) => item.surface === "webhook").map((item) => item.key);
  const send = statusFor(sendKeys);
  const webhook = statusFor(webhookKeys);
  const missing = [...send.missing, ...webhook.missing];

  return {
    status: missing.length ? "setup-required" : "ready",
    missing,
    send,
    webhook,
    requirements: WA_REQUIREMENTS.map((item) => ({
      key: item.key,
      surface: item.surface,
      configured: envReady(item.key),
    })),
    pairing: {
      status: "not-supported",
      adapter: "whatsapp-cloud-api",
      message:
        "WhatsApp Cloud API tidak mendukung QR pairing di aplikasi ini; gunakan Meta webhook, token, app secret, dan phone number id.",
    },
    personalPairing: {
      status: process.env.WA_PERSONAL_ADAPTER_ENABLED === "1" ? "available" : "setup-required",
      adapter: "wa-personal-bridge",
      command: "npm run wa:personal",
      message:
        "Untuk testing WA biasa, jalankan bridge personal terpisah di server/terminal, scan QR, lalu pesan masuk akan dicatat ke queue operasional. Jalur produksi tetap WhatsApp Cloud API.",
      capabilities: {
        qrPairing: true,
        mediaDownload: true,
        pdfTextExtraction: true,
        imageOcr: process.env.WA_PERSONAL_OCR_ENABLED === "1",
      },
      missing:
        process.env.WA_PERSONAL_ADAPTER_ENABLED === "1"
          ? []
          : ["WA_PERSONAL_ADAPTER_ENABLED=1"],
    },
  };
}

export function maskPhoneForDisplay(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "nomor tidak tersedia";
  if (digits.length <= 4) return `****${digits}`;
  const prefix = digits.length > 8 ? digits.slice(0, 2) : "";
  return `${prefix}****${digits.slice(-4)}`;
}

export function normalizeWaDisplayName(value: string | null | undefined) {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  if (/^\+?[\d\s().-]{8,}$/.test(trimmed)) {
    return `Warga WhatsApp ${maskPhoneForDisplay(trimmed)}`;
  }
  return trimmed.slice(0, 80);
}

export function providerMessageIdFromPayload(payload: unknown) {
  const root = asRecord(payload);
  const messages = Array.isArray(root?.messages) ? root.messages : [];
  const firstMessage = asRecord(messages[0]);
  return valueAsString(firstMessage?.id) ?? null;
}

export function providerErrorMeta(payload: unknown) {
  const root = asRecord(payload);
  const error = asRecord(root?.error);
  if (!error) return {};

  return {
    code: valueAsString(error.code),
    subcode: valueAsString(error.error_subcode),
    type: valueAsString(error.type),
  };
}

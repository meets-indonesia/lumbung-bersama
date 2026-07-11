import type { AgentToolRunSummary } from "@/lib/agent-tool-registry";

type WireApi = "responses" | "chat-completions";

export type AgentProviderSuggestion = {
  output: string;
  nextAction: string;
  checks: string[];
  confidence?: string;
  evidenceNotes?: string[];
};

export type AgentProviderResult = {
  configured: boolean;
  used: boolean;
  mode: string;
  providerLabel: string;
  model: string | null;
  errorCode?: string;
  suggestion?: AgentProviderSuggestion;
};

export type WaReplyProviderResult = {
  configured: boolean;
  used: boolean;
  mode: string;
  providerLabel: string;
  model: string | null;
  errorCode?: string;
  reply?: string;
};

type AgentProviderInput = {
  agentName: string;
  agentJob: string;
  recordId: string;
  caseSummary: string | null;
  caseSource: string | null;
  caseStatus: string | null;
  caseModule: string | null;
  commodityDetails: string[];
  coverageBasis: string;
};

type WaReplyProviderInput = {
  agentName: string;
  agentJob: string;
  module: string;
  message: string;
  payloadType: string;
  reviewMode: string;
  queueId?: string | null;
  fallbackReply: string;
  toolSummary: AgentToolRunSummary;
};

type ProviderConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  wireApi: WireApi;
  timeoutMs: number;
  providerLabel: string;
};

const DEFAULT_BASE_URL = "https://xai.hashmicro.co/v1";
const DEFAULT_MODEL = "gpt-5.2";
const MAX_OUTPUT_CHARS = 720;
const MAX_NEXT_ACTION_CHARS = 280;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function safeHostname(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "custom-provider";
  }
}

function readWireApi(value: string | undefined): WireApi {
  return value === "chat-completions" ? "chat-completions" : "responses";
}

function getProviderConfig(): ProviderConfig | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = normalizeBaseUrl(
    process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || DEFAULT_BASE_URL,
  );
  const model = process.env.OPENAI_MODEL || process.env.AI_MODEL || DEFAULT_MODEL;
  const wireApi = readWireApi(process.env.OPENAI_WIRE_API || process.env.AI_WIRE_API);
  const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 12_000);

  return {
    apiKey,
    baseUrl,
    model,
    wireApi,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 12_000,
    providerLabel: safeHostname(baseUrl),
  };
}

export function getAiProviderStatus() {
  const config = getProviderConfig();

  return {
    configured: Boolean(config),
    providerLabel: config?.providerLabel ?? "not-configured",
    model: config?.model ?? null,
    wireApi: config?.wireApi ?? readWireApi(process.env.OPENAI_WIRE_API || process.env.AI_WIRE_API),
    required: ["OPENAI_API_KEY"],
    optional: ["OPENAI_BASE_URL", "OPENAI_MODEL", "OPENAI_WIRE_API"],
  };
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMultilineText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function cleanChecks(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanText(item, 80))
    .filter(Boolean)
    .slice(0, 8);
}

function parseJsonObject(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;
  return JSON.parse(candidate) as Record<string, unknown>;
}

function normalizeSuggestion(raw: string): AgentProviderSuggestion | null {
  try {
    const parsed = parseJsonObject(raw);
    const output = cleanText(parsed.output, MAX_OUTPUT_CHARS);
    const nextAction = cleanText(parsed.nextAction, MAX_NEXT_ACTION_CHARS);
    const checks = cleanChecks(parsed.checks);

    if (!output || !nextAction) return null;

    return {
      output,
      nextAction,
      checks,
      confidence: cleanText(parsed.confidence, 40) || undefined,
      evidenceNotes: cleanChecks(parsed.evidenceNotes),
    };
  } catch {
    return null;
  }
}

function normalizeWaReply(raw: string) {
  try {
    const parsed = parseJsonObject(raw);
    return cleanMultilineText(parsed.reply, 1700) || null;
  } catch {
    return null;
  }
}

function buildPrompt(input: AgentProviderInput) {
  const caseBlock = input.caseSummary
    ? [
        `Record ID: ${input.recordId}`,
        `Sumber: ${input.caseSource ?? "tidak tersedia"}`,
        `Modul: ${input.caseModule ?? "tidak tersedia"}`,
        `Status: ${input.caseStatus ?? "tidak tersedia"}`,
        `Ringkasan case: ${input.caseSummary}`,
      ].join("\n")
    : `Record ID: ${input.recordId}\nCase operasional belum ditemukan. Gunakan coverage dan profil komoditas sebagai basis awal.`;

  const commodityBlock = input.commodityDetails.length
    ? input.commodityDetails.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "Belum ada profil komoditas yang cocok.";

  return [
    "Anda adalah agent Lumbung Bersama untuk koperasi desa. Jawab dalam Bahasa Indonesia formal dan ringkas.",
    "Keputusan final selalu oleh operator atau pengurus, bukan AI. Jangan mengklaim buyer nyata, marketplace checkout, live SIMKOPDES production, atau persetujuan pembiayaan otomatis.",
    "Jangan keluarkan nama/nomor pengirim, credential, atau data pribadi. Gunakan istilah pengirim disamarkan bila perlu.",
    "",
    `Agent: ${input.agentName}`,
    `Tugas agent: ${input.agentJob}`,
    "",
    caseBlock,
    "",
    `Coverage data: ${input.coverageBasis}`,
    "Sinyal komoditas:",
    commodityBlock,
    "",
    'Kembalikan JSON saja dengan field: {"output":"...","nextAction":"...","checks":["..."],"confidence":"rendah|sedang|tinggi","evidenceNotes":["..."]}.',
  ].join("\n");
}

function buildWaReplyPrompt(input: WaReplyProviderInput) {
  const evidence = input.toolSummary.evidenceLines.length
    ? input.toolSummary.evidenceLines.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "Tidak ada evidence tool yang siap. Gunakan fallback dan minta data minimum.";
  const restrictions = input.toolSummary.restrictions.length
    ? input.toolSummary.restrictions.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "Scope hanya Lumbung Bersama/koperasi desa. Jangan bocorkan PII, credential, raw media URI, atau buyer bernama tidak terverifikasi.";
  const handoff = input.toolSummary.handoffHints.length
    ? input.toolSummary.handoffHints.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "Tidak ada handoff tambahan.";

  return [
    "Anda adalah WA agent Lumbung Bersama untuk koperasi desa.",
    "Jawab adaptif dan natural, tetapi hanya memakai fakta dari tool evidence dan fallback aman.",
    "Scope yang boleh: potensi desa/komoditas, harga/negosiasi koperasi, stok/gudang, buyer matching readiness, pembiayaan readiness, bukti dokumen/OCR, laporan aksi, integrasi WA/dashboard.",
    "Jika pertanyaan keluar dari scope koperasi desa Lumbung Bersama, tolak singkat dan arahkan ke menu agent.",
    "Jangan mengarang angka. Angka hanya boleh diulang bila ada di tool evidence/fallback. Jangan klaim harga real-time bila evidence tidak menyebut feed live.",
    "Jangan tampilkan nomor WA, raw sender, credential, raw media path, storage URI, atau data pribadi.",
    "Jangan menyetujui pinjaman, floor price final, deal, atau outreach buyer otomatis.",
    "Format WA rapi: judul pendek, baris ringkas, spasi antar bagian, tanpa markdown tabel.",
    "",
    `Agent: ${input.agentName}`,
    `Tugas agent: ${input.agentJob}`,
    `Modul: ${input.module}`,
    `Payload: ${input.payloadType}`,
    `Review mode: ${input.reviewMode}`,
    `Queue ID: ${input.queueId ?? "tidak ada"}`,
    `Pesan user: ${input.message}`,
    "",
    "Tool evidence:",
    evidence,
    "",
    "Restrictions:",
    restrictions,
    "",
    "Handoff hints:",
    handoff,
    "",
    "Fallback aman:",
    input.fallbackReply,
    "",
    'Kembalikan JSON saja dengan field {"reply":"..."} berisi jawaban WA final. Maksimal 1700 karakter.',
  ].join("\n");
}

function responseOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;

  const output = Array.isArray(payload.output) ? payload.output : [];
  const parts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === "string") parts.push(text);
    }
  }

  return parts.join("\n");
}

function chatOutputText(payload: Record<string, unknown>) {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const first = choices[0] as { message?: { content?: unknown } } | undefined;
  return typeof first?.message?.content === "string" ? first.message.content : "";
}

async function fetchJson(url: string, config: ProviderConfig, body: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false as const, errorCode: `http-${response.status}`, payload: null };
    }

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) return { ok: false as const, errorCode: "invalid-json", payload: null };
    return { ok: true as const, errorCode: null, payload };
  } catch (error) {
    return {
      ok: false as const,
      errorCode: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "request-failed",
      payload: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callResponsesApi(config: ProviderConfig, prompt: string) {
  const payload = await fetchJson(`${config.baseUrl}/responses`, config, {
    model: config.model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "Return valid JSON only. Keep recommendations evidence-backed and human-reviewed.",
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
    max_output_tokens: 700,
  });

  if (!payload.ok) return payload;
  return { ...payload, text: responseOutputText(payload.payload) };
}

async function callChatCompletionsApi(config: ProviderConfig, prompt: string) {
  const payload = await fetchJson(`${config.baseUrl}/chat/completions`, config, {
    model: config.model,
    messages: [
      {
        role: "system",
        content: "Return valid JSON only. Keep recommendations evidence-backed and human-reviewed.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 700,
  });

  if (!payload.ok) return payload;
  return { ...payload, text: chatOutputText(payload.payload) };
}

export async function runAgentProvider(input: AgentProviderInput): Promise<AgentProviderResult> {
  const config = getProviderConfig();

  if (!config) {
    return {
      configured: false,
      used: false,
      mode: "rules-operational-data",
      providerLabel: "not-configured",
      model: null,
    };
  }

  const prompt = buildPrompt(input);
  const response =
    config.wireApi === "chat-completions"
      ? await callChatCompletionsApi(config, prompt)
      : await callResponsesApi(config, prompt);

  if (!response.ok) {
    return {
      configured: true,
      used: false,
      mode: `provider-fallback-${response.errorCode}`,
      providerLabel: config.providerLabel,
      model: config.model,
      errorCode: response.errorCode,
    };
  }

  const suggestion = normalizeSuggestion(response.text);

  if (!suggestion) {
    return {
      configured: true,
      used: false,
      mode: "provider-fallback-unparseable-output",
      providerLabel: config.providerLabel,
      model: config.model,
      errorCode: "unparseable-output",
    };
  }

  return {
    configured: true,
    used: true,
    mode: `provider-${config.wireApi}`,
    providerLabel: config.providerLabel,
    model: config.model,
    suggestion,
  };
}

export async function runWaReplyProvider(input: WaReplyProviderInput): Promise<WaReplyProviderResult> {
  const config = getProviderConfig();

  if (!config) {
    return {
      configured: false,
      used: false,
      mode: "rules-operational-data",
      providerLabel: "not-configured",
      model: null,
    };
  }

  const prompt = buildWaReplyPrompt(input);
  const response =
    config.wireApi === "chat-completions"
      ? await callChatCompletionsApi(config, prompt)
      : await callResponsesApi(config, prompt);

  if (!response.ok) {
    return {
      configured: true,
      used: false,
      mode: `provider-fallback-${response.errorCode}`,
      providerLabel: config.providerLabel,
      model: config.model,
      errorCode: response.errorCode,
    };
  }

  const reply = normalizeWaReply(response.text);

  if (!reply) {
    return {
      configured: true,
      used: false,
      mode: "provider-fallback-unparseable-output",
      providerLabel: config.providerLabel,
      model: config.model,
      errorCode: "unparseable-output",
    };
  }

  return {
    configured: true,
    used: true,
    mode: `provider-${config.wireApi}`,
    providerLabel: config.providerLabel,
    model: config.model,
    reply,
  };
}

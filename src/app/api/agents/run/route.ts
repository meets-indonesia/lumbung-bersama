import { aiAgents } from "@/lib/demo-data";
import { requireAuthenticatedRequest, requireOperationalMutationRole } from "@/lib/auth";
import {
  describeCommodityProfiles,
  findCommodityProfilesForMessage,
  getCommodityCoverageSummary,
} from "@/lib/commodity-intelligence";
import { runAgentProvider } from "@/lib/ai-provider";
import { formatAgentExplanation } from "@/lib/formal-replies";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

type AgentCaseContext = {
  id: string;
  source: string;
  sender: string;
  module: string;
  status: string;
  summary: string;
};

type OperatorQueueCaseRow = {
  id: string;
  sender: string;
  source: string;
  summary: string;
  status: string;
  module: string;
};

type WaMessageCaseRow = {
  id: string;
  providerMessageId: string | null;
  sender: string;
  message: string;
  status: string;
  module: string;
};

async function findCaseContext(recordId: string, cooperativeId: string): Promise<AgentCaseContext | null> {
  const queueCase = await queryOne<OperatorQueueCaseRow>(
    `SELECT id, sender, source, summary, status, module
     FROM operator_queue
     WHERE id = $1
       AND cooperative_id = $2
     LIMIT 1`,
    [recordId, cooperativeId],
  );

  if (queueCase) {
    return {
      id: queueCase.id,
      source: queueCase.source,
      sender: queueCase.sender,
      module: queueCase.module,
      status: queueCase.status,
      summary: queueCase.summary,
    };
  }

  const waCase = await queryOne<WaMessageCaseRow>(
    `SELECT id,
            provider_message_id AS "providerMessageId",
            sender,
            message,
            status,
            module
     FROM wa_messages
     WHERE (id = $1 OR provider_message_id = $1)
       AND cooperative_id = $2
     LIMIT 1`,
    [recordId, cooperativeId],
  );

  if (!waCase) return null;

  return {
    id: waCase.id,
    source: waCase.providerMessageId ? "WhatsApp provider message" : "Local WA message",
    sender: waCase.sender,
    module: waCase.module,
    status: waCase.status,
    summary: waCase.message,
  };
}

function buildCaseDataBasis(caseContext: AgentCaseContext | null, coverageBasis: string) {
  if (!caseContext) return coverageBasis;

  return [
    `case ${caseContext.id}`,
    `sumber ${caseContext.source}`,
    "pengirim disamarkan",
    `modul ${caseContext.module}`,
    `status ${caseContext.status}`,
    coverageBasis,
  ].join("; ");
}

function buildCaseBackedOutput({
  agentName,
  defaultOutput,
  caseContext,
  commodityDetails,
}: {
  agentName: string;
  defaultOutput: string;
  caseContext: AgentCaseContext | null;
  commodityDetails: string[];
}) {
  if (!caseContext) {
    return commodityDetails.length && agentName === "Agen Unggulan Desa"
      ? `Peluang komoditas: ${commodityDetails.slice(0, 3).join("; ")}`
      : defaultOutput;
  }

  const caseLead = `Case ${caseContext.id}: ${caseContext.summary}`;
  const commodityLead = commodityDetails.length
    ? ` Sinyal komoditas: ${commodityDetails.slice(0, 3).join("; ")}.`
    : "";

  if (agentName === "Agen Pasar dan Mitra") {
    return `${caseLead}. Buyer matching lite perlu memakai modul ${caseContext.module}, status ${caseContext.status}, dan approval pengurus.${commodityLead}`;
  }

  if (agentName === "Agen Laporan") {
    return `${caseLead}. Masukkan ke laporan aksi sebagai item ${caseContext.status} dengan sumber ${caseContext.source}.${commodityLead}`;
  }

  return `${caseLead}. Rekomendasi awal harus menjelaskan prioritas komoditas, readiness koperasi, dan bukti operator.${commodityLead}`;
}

function buildNextAction(agentName: string, caseContext: AgentCaseContext | null) {
  if (!caseContext) {
    return "Operator atau pengurus tetap harus menyetujui hasil sebelum data dikunci.";
  }

  if (agentName === "Agen Pasar dan Mitra") {
    return `Review case ${caseContext.id}, cek stok/readiness, lalu approve atau tolak outreach buyer.`;
  }

  if (agentName === "Agen Laporan") {
    return `Masukkan case ${caseContext.id} ke Laporan Aksi setelah bukti dan status operator valid.`;
  }

  return `Verifikasi case ${caseContext.id}, lengkapi bukti, lalu tetapkan komoditas atau produk prioritas.`;
}

function mergeChecks(fallbackChecks: string[], providerChecks: string[] | undefined) {
  const merged = new Set<string>();
  [...fallbackChecks, ...(providerChecks ?? [])].forEach((check) => {
    const normalized = check.trim();
    if (normalized) merged.add(normalized);
  });
  return Array.from(merged).slice(0, 12);
}

function buildRunStatus({
  caseContext,
  providerConfigured,
  providerUsed,
}: {
  caseContext: AgentCaseContext | null;
  providerConfigured: boolean;
  providerUsed: boolean;
}) {
  if (caseContext && providerUsed) return "provider-case-backed-complete";
  if (caseContext && providerConfigured) return "provider-fallback-case-backed-rules-complete";
  if (caseContext) return "case-backed-rules-complete";
  if (providerUsed) return "provider-complete";
  if (providerConfigured) return "provider-fallback-rules-complete";
  return "rules-complete";
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;
  const roleResponse = requireOperationalMutationRole(auth.user);
  if (roleResponse) return roleResponse;
  const cooperativeId = auth.user.cooperativeId;

  if (!cooperativeId) {
    return Response.json({ error: "COOPERATIVE_SCOPE_REQUIRED" }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    agentName?: string;
    recordId?: string;
  };

  const agent = aiAgents.find((item) => item.name === body.agentName) ?? aiAgents[0];
  const recordId = body.recordId || "LB-1024";
  const cooperative = await queryOne<{ id: string; province: string }>(
    "SELECT id, province FROM cooperatives WHERE id = $1 LIMIT 1",
    [cooperativeId],
  );

  if (!cooperative) {
    return Response.json({ error: "COOPERATIVE_NOT_FOUND" }, { status: 404 });
  }

  const caseContext = await findCaseContext(recordId, cooperative.id);
  const commodityProfiles = await findCommodityProfilesForMessage(
    `${agent.name} ${recordId} ${caseContext?.summary ?? ""}`,
    cooperative.province,
  ).catch(() => []);
  const commodityCoverage = await getCommodityCoverageSummary().catch(() => null);
  const commodityDetails = describeCommodityProfiles(commodityProfiles);
  const coverageBasis = commodityCoverage
    ? `${commodityCoverage.totalProfiles.toLocaleString("id-ID")} profil komoditas untuk ${commodityCoverage.totalAreas.toLocaleString("id-ID")} area; ${commodityCoverage.totalVillages.toLocaleString("id-ID")} desa/kelurahan memiliki baseline.`
    : "profil komoditas belum dihitung.";
  const dataBasis = buildCaseDataBasis(caseContext, coverageBasis);
  const fallbackNextAction = buildNextAction(agent.name, caseContext);
  const fallbackChecks = [
    ...agent.checks,
    ...(caseContext ? ["Case source", "Record status", "Human approval"] : ["Record lookup fallback"]),
    ...(commodityDetails.length ? ["Komoditas baseline", "Source level"] : []),
  ];
  const fallbackOutput = buildCaseBackedOutput({
    agentName: agent.name,
    defaultOutput: agent.output,
    caseContext,
    commodityDetails,
  });
  const provider = await runAgentProvider({
    agentName: agent.name,
    agentJob: agent.job,
    recordId,
    caseSummary: caseContext?.summary ?? null,
    caseSource: caseContext?.source ?? null,
    caseStatus: caseContext?.status ?? null,
    caseModule: caseContext?.module ?? null,
    commodityDetails,
    coverageBasis,
  });
  const status = buildRunStatus({
    caseContext,
    providerConfigured: provider.configured,
    providerUsed: provider.used,
  });
  const providerNote = provider.used
    ? `Provider ${provider.providerLabel} (${provider.model}) dipakai untuk menyusun rekomendasi.`
    : provider.configured
      ? `Provider ${provider.providerLabel} belum menghasilkan output valid (${provider.errorCode ?? "unavailable"}); fallback rules dipakai.`
      : "Provider AI belum dikonfigurasi; fallback rules dipakai.";
  const explanation = `${formatAgentExplanation({
    agentName: agent.name,
    mode: provider.used ? provider.mode : `${provider.mode}-rules-local-postgres`,
    dataBasis,
  })} ${providerNote}`;
  const output = provider.suggestion?.output ?? fallbackOutput;
  const nextAction = provider.suggestion?.nextAction ?? fallbackNextAction;
  const checks = mergeChecks(fallbackChecks, provider.suggestion?.checks);

  const run = await queryOne(
    `INSERT INTO agent_runs (id, cooperative_id, agent_name, record_id, status, output, checks, explanation, next_action)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     RETURNING id, agent_name AS agent, record_id AS "recordId", status, output, checks, explanation, next_action AS "nextAction", created_at AS "createdAt"`,
    [
      newId("agent"),
      cooperative.id,
      agent.name,
      recordId,
      status,
      output,
      JSON.stringify(checks),
      explanation,
      nextAction,
    ],
  );

  return Response.json({
    ...run,
    envMode: provider.mode,
    provider: {
      configured: provider.configured,
      used: provider.used,
      label: provider.providerLabel,
      model: provider.model,
      errorCode: provider.errorCode,
    },
  });
}

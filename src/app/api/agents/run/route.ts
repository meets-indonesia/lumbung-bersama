import { aiAgents } from "@/lib/demo-data";
import { requireAuthenticatedRequest } from "@/lib/auth";
import {
  describeCommodityProfiles,
  findCommodityProfilesForMessage,
  getCommodityCoverageSummary,
} from "@/lib/commodity-intelligence";
import { formatAgentExplanation } from "@/lib/formal-replies";
import { dbRequiredResponse, isDatabaseConfigured, newId, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    agentName?: string;
    recordId?: string;
  };

  const agent = aiAgents.find((item) => item.name === body.agentName) ?? aiAgents[0];
  const recordId = body.recordId || "LB-1024";
  const cooperative = await queryOne<{ id: string; province: string }>(
    "SELECT id, province FROM cooperatives ORDER BY created_at ASC LIMIT 1",
  );

  if (!cooperative) {
    return Response.json({ error: "COOPERATIVE_NOT_FOUND" }, { status: 404 });
  }

  const status = process.env.OPENAI_API_KEY ? "ai-ready" : "rules-complete";
  const commodityProfiles = await findCommodityProfilesForMessage(
    `${agent.name} ${recordId}`,
    cooperative.province,
  ).catch(() => []);
  const commodityCoverage = await getCommodityCoverageSummary().catch(() => null);
  const commodityDetails = describeCommodityProfiles(commodityProfiles);
  const dataBasis = commodityCoverage
    ? `${commodityCoverage.totalProfiles.toLocaleString("id-ID")} profil komoditas untuk ${commodityCoverage.totalAreas.toLocaleString("id-ID")} area; ${commodityCoverage.totalVillages.toLocaleString("id-ID")} desa/kelurahan memiliki baseline.`
    : "profil komoditas belum dihitung.";
  const explanation = formatAgentExplanation({
    agentName: agent.name,
    mode: process.env.OPENAI_API_KEY ? "ai-ready" : "rules-local-postgres",
    dataBasis,
  });
  const nextAction = "Operator atau pengurus tetap harus menyetujui hasil sebelum data dikunci.";
  const checks = [
    ...agent.checks,
    ...(commodityDetails.length ? ["Komoditas baseline", "Source level"] : []),
  ];
  const output =
    agent.name === "Agen Unggulan Desa" && commodityDetails.length
      ? `Peluang komoditas: ${commodityDetails.slice(0, 3).join("; ")}`
      : agent.output;

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

  return Response.json(run);
}

import { requireAuthenticatedRequest } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type CooperativeRow = {
  id: string;
  name: string;
  village: string;
  district: string;
  regency: string;
  province: string;
};

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const [
    cooperatives,
    queue,
    stocks,
    buyers,
    finance,
    reportSections,
    reportPeriods,
    recentWa,
    recentAgentRuns,
    commodityCoverage,
  ] = await Promise.all([
    queryRows<CooperativeRow>(
      "SELECT id, name, village, district, regency, province FROM cooperatives ORDER BY created_at ASC LIMIT 1",
    ),
    queryRows(
      "SELECT id, sender, source, summary, status, module, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM operator_queue ORDER BY created_at DESC",
    ),
    queryRows(
      "SELECT id, name, unit, state, location, restock_requested AS \"restockRequested\", updated_at AS \"updatedAt\" FROM stock_items ORDER BY name ASC",
    ),
    queryRows(
      "SELECT id, buyer, need, match_score AS \"matchScore\", reason, status, approved_at AS \"approvedAt\", updated_at AS \"updatedAt\" FROM buyer_matches ORDER BY match_score DESC",
    ),
    queryRows(
      "SELECT id, member, purpose, amount::text AS amount, risk, status, reviewed_at AS \"reviewedAt\", updated_at AS \"updatedAt\" FROM finance_requests ORDER BY updated_at DESC",
    ),
    queryRows(
      "SELECT id, title, included, updated_at AS \"updatedAt\" FROM report_sections ORDER BY id ASC",
    ),
    queryRows(
      "SELECT id, label, locked, locked_at AS \"lockedAt\", updated_at AS \"updatedAt\" FROM report_periods ORDER BY updated_at DESC LIMIT 1",
    ),
    queryRows(
      "SELECT id, sender, message, intent, module, bot_reply AS \"botReply\", status, created_at AS \"createdAt\" FROM wa_messages ORDER BY created_at DESC LIMIT 12",
    ),
    queryRows(
      "SELECT id, agent_name AS \"agentName\", record_id AS \"recordId\", status, output, checks, explanation, next_action AS \"nextAction\", created_at AS \"createdAt\" FROM agent_runs ORDER BY created_at DESC LIMIT 12",
    ),
    queryRows(
      `SELECT COUNT(DISTINCT area_code)::text AS "totalAreas",
              COUNT(*)::text AS "totalProfiles",
              COUNT(DISTINCT CASE WHEN area_level = 4 THEN area_code END)::text AS "totalVillages",
              COUNT(DISTINCT province_code)::text AS "totalProvinces",
              COUNT(CASE WHEN area_level = 4 AND source_level = 'direct-village' THEN 1 END)::text AS "directVillageProfiles"
       FROM regional_commodity_profiles`,
    ).catch(() => []),
  ]);

  const cooperative = cooperatives[0] ?? null;
  const commodityHighlights = cooperative
    ? await queryRows(
      `SELECT commodity, sector, rank, source_level AS "sourceLevel", confidence, basis
       FROM regional_commodity_profiles
       WHERE province_name ILIKE $1
         AND area_level = 1
       ORDER BY rank ASC
       LIMIT 4`,
      [`%${cooperative.province}%`],
    ).catch(() => [])
    : [];
  const queueNeedingAction = queue.filter((item) => item.status !== "Sudah Disetujui").length;
  const criticalStocks = stocks.filter((item) =>
    ["Perlu Restok", "Terbatas", "Menunggu Grade", "Jadwal Pickup"].includes(String(item.state)),
  ).length;
  const includedReports = reportSections.filter((item) => item.included).length;

  return Response.json({
    source: "postgres",
    cooperative,
    metrics: [
      { label: "Laporan warga hari ini", value: String(queue.length), note: "Postgres" },
      { label: "Draft perlu dicek", value: String(queueNeedingAction), note: "Postgres" },
      { label: "Stok gerai kritis", value: String(criticalStocks), note: "Postgres" },
      { label: "Siap laporan", value: String(includedReports), note: "Postgres" },
    ],
    queue,
    stocks,
    buyers,
    finance,
    reportSections,
    reportPeriod: reportPeriods[0] ?? null,
    recentWa,
    recentAgentRuns,
    commodityCoverage: commodityCoverage[0] ?? null,
    commodityHighlights,
  });
}

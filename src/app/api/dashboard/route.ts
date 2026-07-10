import type { QueryResultRow } from "pg";
import { requireAuthenticatedRequest } from "@/lib/auth";
import { dbRequiredResponse, isDatabaseConfigured, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";
const TEAM_TABLE_PREFIX = "anak_sarengklek_";

type CooperativeRow = {
  id: string;
  name: string;
  village: string;
  district: string;
  regency: string;
  province: string;
};

type BuyerRow = {
  id: string;
  buyer: string;
  need: string;
  matchScore: number;
  reason: string;
  status: string;
  approvedAt?: string | null;
  updatedAt?: string | null;
};

type BuyerRequirementRow = {
  id: string;
  buyerArchetype: string;
  productName: string;
  requiredQuantity: string;
  unitLabel: string;
  qualitySpec: string;
  packagingSpec: string;
  targetWindow: string;
  verificationStatus: string;
  sourceLabel: string;
  notes: string;
  updatedAt: string;
};

type StockLedgerRow = {
  id: string;
  stockItemId: string;
  stockName: string;
  movementType: string;
  quantity: string;
  unitLabel: string;
  reason: string;
  evidenceRef: string;
  readinessStatus: string;
  recordedBy: string;
  createdAt: string;
};

type MediaEvidenceRow = {
  id: string;
  relatedRecordType: string;
  relatedRecordId: string;
  mediaType: string;
  storageKey: string;
  redactedLabel: string;
  caption: string;
  verificationStatus: string;
  sourceLabel: string;
  createdAt: string;
};

type PrefixedDbTableStatus = {
  tableName: string;
  status: "ready" | "setup-required";
  rows: number;
  errorCode?: string;
};

function buyerArchetypeLabel(row: BuyerRow, index: number) {
  const idAndNeed = `${row.id} ${row.need}`.toLowerCase();
  if (idAndNeed.includes("kopi") || idAndNeed.includes("roastery")) {
    return "Archetype: roastery atau pengolah kopi";
  }
  if (idAndNeed.includes("singkong") || idAndNeed.includes("olahan")) {
    return "Archetype: UMKM pengolah pangan";
  }
  if (idAndNeed.includes("beras") || idAndNeed.includes("warung") || idAndNeed.includes("retail")) {
    return "Archetype: retail lokal atau warung";
  }
  return `Archetype buyer readiness ${index + 1}`;
}

function buyerReadinessStatus(status: string) {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("siap") && normalizedStatus.includes("kontak")) return "Perlu review operator";
  if (normalizedStatus.includes("disetujui")) return "Readiness disetujui pengurus";
  return status;
}

function toBuyerReadinessEvidence(row: BuyerRow, index: number) {
  return {
    ...row,
    buyer: buyerArchetypeLabel(row, index),
    status: buyerReadinessStatus(row.status),
    reason: `${row.reason} Catatan: baris ini dipakai sebagai archetype demo/baseline, bukan komitmen buyer bernama.`,
    buyerSource: "demo-baseline-archetype",
    sourceLabel: "Buyer archetype; not a named buyer, live demand record, atau komitmen offtaker.",
    verifiedBuyer: false,
  };
}

function prefixedQueryErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code?: unknown }).code ?? "QUERY_FAILED");
  }
  return "QUERY_FAILED";
}

async function queryPrefixedRows<T extends QueryResultRow>(tableName: string, sql: string, params: unknown[]) {
  try {
    const rows = await queryRows<T>(sql, params);
    return {
      rows,
      status: {
        tableName,
        status: "ready" as const,
        rows: rows.length,
      },
    };
  } catch (error) {
    return {
      rows: [],
      status: {
        tableName,
        status: "setup-required" as const,
        rows: 0,
        errorCode: prefixedQueryErrorCode(error),
      },
    };
  }
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;
  const cooperativeId = auth.user.cooperativeId;

  if (!cooperativeId) {
    return Response.json(
      {
        error: "COOPERATIVE_SCOPE_REQUIRED",
        message: "User belum memiliki cooperative_id untuk membatasi workspace.",
      },
      { status: 409 },
    );
  }

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
    buyerRequirementsResult,
    stockLedgerResult,
    mediaEvidenceResult,
  ] = await Promise.all([
    queryRows<CooperativeRow>(
      "SELECT id, name, village, district, regency, province FROM cooperatives WHERE id = $1 LIMIT 1",
      [cooperativeId],
    ),
    queryRows(
      "SELECT id, sender, source, summary, status, module, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM operator_queue WHERE cooperative_id = $1 ORDER BY created_at DESC",
      [cooperativeId],
    ),
    queryRows(
      "SELECT id, name, unit, state, location, restock_requested AS \"restockRequested\", updated_at AS \"updatedAt\" FROM stock_items WHERE cooperative_id = $1 ORDER BY name ASC",
      [cooperativeId],
    ),
    queryRows<BuyerRow>(
      "SELECT id, buyer, need, match_score AS \"matchScore\", reason, status, approved_at AS \"approvedAt\", updated_at AS \"updatedAt\" FROM buyer_matches WHERE cooperative_id = $1 ORDER BY match_score DESC",
      [cooperativeId],
    ),
    queryRows(
      "SELECT id, member, purpose, amount::text AS amount, risk, status, reviewed_at AS \"reviewedAt\", updated_at AS \"updatedAt\" FROM finance_requests WHERE cooperative_id = $1 ORDER BY updated_at DESC",
      [cooperativeId],
    ),
    queryRows(
      "SELECT id, title, included, updated_at AS \"updatedAt\" FROM report_sections WHERE cooperative_id = $1 ORDER BY id ASC",
      [cooperativeId],
    ),
    queryRows(
      "SELECT id, label, locked, locked_at AS \"lockedAt\", updated_at AS \"updatedAt\" FROM report_periods WHERE cooperative_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [cooperativeId],
    ),
    queryRows(
      "SELECT id, sender, message, intent, module, bot_reply AS \"botReply\", status, created_at AS \"createdAt\" FROM wa_messages WHERE cooperative_id = $1 ORDER BY created_at DESC LIMIT 12",
      [cooperativeId],
    ),
    queryRows(
      "SELECT id, agent_name AS \"agentName\", record_id AS \"recordId\", status, output, checks, explanation, next_action AS \"nextAction\", created_at AS \"createdAt\" FROM agent_runs WHERE cooperative_id = $1 ORDER BY created_at DESC LIMIT 12",
      [cooperativeId],
    ),
    queryRows(
      `SELECT COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalAreas",
              COUNT(CASE WHEN source_level <> 'inherited-province-baseline' THEN 1 END)::text AS "totalProfiles",
              COUNT(DISTINCT CASE WHEN area_level = 4 AND source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalVillages",
              COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN province_code END)::text AS "totalProvinces",
              COUNT(CASE WHEN source_level = 'inherited-province-baseline' THEN 1 END)::text AS "legacyInheritedProfiles",
              COUNT(CASE WHEN area_level = 4 AND source_level = 'direct-village' THEN 1 END)::text AS "directVillageProfiles"
       FROM regional_commodity_profiles`,
    ).catch(() => []),
    queryPrefixedRows<BuyerRequirementRow>(
      "anak_sarengklek_buyer_requirements",
      `SELECT id,
              buyer_archetype AS "buyerArchetype",
              product_name AS "productName",
              required_quantity::text AS "requiredQuantity",
              unit_label AS "unitLabel",
              quality_spec AS "qualitySpec",
              packaging_spec AS "packagingSpec",
              target_window AS "targetWindow",
              verification_status AS "verificationStatus",
              source_label AS "sourceLabel",
              notes,
              updated_at AS "updatedAt"
       FROM anak_sarengklek_buyer_requirements
       WHERE cooperative_id = $1
       ORDER BY updated_at DESC, product_name ASC`,
      [cooperativeId],
    ),
    queryPrefixedRows<StockLedgerRow>(
      "anak_sarengklek_stock_ledger",
      `SELECT ledger.id,
              ledger.stock_item_id AS "stockItemId",
              stock.name AS "stockName",
              ledger.movement_type AS "movementType",
              ledger.quantity::text AS quantity,
              ledger.unit_label AS "unitLabel",
              ledger.reason,
              ledger.evidence_ref AS "evidenceRef",
              ledger.readiness_status AS "readinessStatus",
              ledger.recorded_by AS "recordedBy",
              ledger.created_at AS "createdAt"
       FROM anak_sarengklek_stock_ledger ledger
       JOIN stock_items stock ON stock.id = ledger.stock_item_id
       WHERE ledger.cooperative_id = $1
       ORDER BY ledger.created_at DESC
       LIMIT 20`,
      [cooperativeId],
    ),
    queryPrefixedRows<MediaEvidenceRow>(
      "anak_sarengklek_media_evidence",
      `SELECT id,
              related_record_type AS "relatedRecordType",
              related_record_id AS "relatedRecordId",
              media_type AS "mediaType",
              md5(storage_uri) AS "storageKey",
              redacted_label AS "redactedLabel",
              caption,
              verification_status AS "verificationStatus",
              source_label AS "sourceLabel",
              created_at AS "createdAt"
       FROM anak_sarengklek_media_evidence
       WHERE cooperative_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [cooperativeId],
    ),
  ]);

  const cooperative = cooperatives[0] ?? null;
  const commodityHighlights = cooperative
    ? await queryRows(
      `SELECT commodity, sector, rank, source_level AS "sourceLevel", confidence, basis
       FROM regional_commodity_profiles
       WHERE province_name ILIKE $1
         AND area_level = 1
         AND source_level <> 'inherited-province-baseline'
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
  const buyerReadiness = buyers.map(toBuyerReadinessEvidence);
  const buyerRequirements = buyerRequirementsResult.rows;
  const stockLedger = stockLedgerResult.rows;
  const mediaEvidence = mediaEvidenceResult.rows;
  const prefixedTables: PrefixedDbTableStatus[] = [
    buyerRequirementsResult.status,
    stockLedgerResult.status,
    mediaEvidenceResult.status,
  ];
  const prefixedDbReady = prefixedTables.every((table) => table.status === "ready");

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
    buyers: buyerReadiness,
    finance,
    reportSections,
    reportPeriod: reportPeriods[0] ?? null,
    recentWa,
    recentAgentRuns,
    commodityCoverage: commodityCoverage[0] ?? null,
    commodityHighlights,
    buyerRequirements,
    stockLedger,
    mediaEvidence,
    teamTablePrefix: TEAM_TABLE_PREFIX,
    prefixedDbStatus: {
      prefix: TEAM_TABLE_PREFIX,
      status: prefixedDbReady ? "ready" : "setup-required",
      message: prefixedDbReady
        ? "Tabel app-owned prefixed siap dipakai untuk requirement, stock ledger, dan media evidence."
        : "Sebagian tabel app-owned prefixed belum siap. Jalankan migrasi aplikasi sebelum demo DB-backed.",
      tables: prefixedTables,
    },
  });
}

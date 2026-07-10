import { requireAuthenticatedRequest } from "@/lib/auth";
import {
  hackathonDbRequiredResponse,
  HACKATHON_SCHEMA_SCOPE,
  HACKATHON_TABLE_PREFIX,
  isHackathonSharedDbConfigured,
  queryHackathonRows,
} from "@/lib/hackathon-shared-db";
import {
  buildBorrowerRiskGuardrails,
  buildFinancingBusinessAnalystAggregate,
  buildSourceCaveatFields,
} from "@/lib/commodity-intelligence";

export const runtime = "nodejs";

type ColumnRow = {
  columnName: string;
};

type AggregateRow = {
  label: string;
  requests: number;
  amount: string;
};

type TotalsRow = {
  totalRequests: number;
  totalAmount: string;
  missingStatus: number;
  missingChannel: number;
  missingAmount: number;
};

type SummaryItem = {
  status?: string;
  statusKey?: string;
  channel?: string;
  requests: number;
  amount: string;
};

const STATUS_COLUMN_CANDIDATES = [
  "status_permohonan",
  "status_pengajuan",
  "status_pembiayaan",
  "status",
];

const AMOUNT_COLUMN_CANDIDATES = [
  "jumlah_pembiayaan",
  "nominal_pembiayaan",
  "nilai_pembiayaan",
  "nilai_pengajuan",
  "nominal_pengajuan",
  "total_pembiayaan",
  "jumlah",
  "nominal",
  "amount",
];

const CHANNEL_COLUMN_CANDIDATES = [
  "tujuan_pembiayaan",
  "tujuan_permohonan",
  "jenis_pembiayaan",
  "skema_pembiayaan",
  "program_pembiayaan",
  "lembaga_pembiayaan",
  "sumber_pembiayaan",
  "purpose",
  "tujuan",
];

function quoteIdentifier(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("INVALID_HACKATHON_COLUMN_IDENTIFIER");
  }
  return `"${identifier}"`;
}

function pickColumn(columns: Set<string>, candidates: string[]) {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

function textExpression(column: string | null, fallback: string) {
  if (!column) return `'${fallback}'::text`;
  return `${quoteIdentifier(column)}::text`;
}

function amountExpression(column: string | null) {
  if (!column) return "0::numeric";
  const expression = quoteIdentifier(column);
  return `COALESCE(NULLIF(REGEXP_REPLACE(${expression}::text, '[^0-9-]', '', 'g'), '')::numeric, 0)`;
}

function normalizeStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("verified") || normalized.includes("verifikasi")) return "verified";
  if (normalized.includes("request") || normalized.includes("submitted") || normalized.includes("diajukan")) {
    return "requested";
  }
  if (normalized.includes("draft")) return "draft";
  return normalized.replace(/[^a-z0-9]+/g, "-") || "unknown";
}

function mergeStatusSummary(rows: AggregateRow[]): SummaryItem[] {
  const summary = new Map<string, SummaryItem>();
  for (const row of rows) {
    const status = row.label || "Unknown";
    const statusKey = normalizeStatus(status);
    const existing = summary.get(statusKey) ?? {
      status,
      statusKey,
      requests: 0,
      amount: "0",
    };
    existing.requests += Number(row.requests ?? 0);
    existing.amount = String(Number(existing.amount) + Number(row.amount ?? 0));
    summary.set(statusKey, existing);
  }

  const order = new Map([
    ["draft", 0],
    ["requested", 1],
    ["verified", 2],
    ["unknown", 3],
  ]);

  return [...summary.values()].sort(
    (left, right) =>
      (order.get(left.statusKey ?? "") ?? 50) - (order.get(right.statusKey ?? "") ?? 50) ||
      right.requests - left.requests,
  );
}

function mergeChannelSummary(rows: AggregateRow[]): SummaryItem[] {
  return rows
    .map((row) => ({
      channel: row.label || "Unclassified",
      requests: Number(row.requests ?? 0),
      amount: String(row.amount ?? 0),
    }))
    .sort((left, right) => right.requests - left.requests || Number(right.amount) - Number(left.amount));
}

function findRequests(statusSummary: SummaryItem[], key: string) {
  return statusSummary.find((item) => item.statusKey === key)?.requests ?? 0;
}

async function getFinancingReadiness() {
  const columnRows = await queryHackathonRows<ColumnRow>(
    `SELECT column_name AS "columnName"
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'pengajuan_pembiayaan'`,
  );
  const columns = new Set(columnRows.map((row) => row.columnName));
  const statusColumn = pickColumn(columns, STATUS_COLUMN_CANDIDATES);
  const amountColumn = pickColumn(columns, AMOUNT_COLUMN_CANDIDATES);
  const channelColumn = pickColumn(columns, CHANNEL_COLUMN_CANDIDATES);

  const statusExpr = textExpression(statusColumn, "Unknown");
  const channelExpr = textExpression(channelColumn, "Unclassified");
  const amountExpr = amountExpression(amountColumn);

  const [statusRows, channelRows, totalsRows] = await Promise.all([
    queryHackathonRows<AggregateRow>(
      `SELECT
         COALESCE(NULLIF(BTRIM(${statusExpr}), ''), 'Unknown') AS label,
         COUNT(*)::int AS requests,
         COALESCE(SUM(${amountExpr}), 0)::text AS amount
       FROM pengajuan_pembiayaan
       GROUP BY 1
       ORDER BY
         CASE LOWER(COALESCE(NULLIF(BTRIM(${statusExpr}), ''), 'Unknown'))
           WHEN 'draft' THEN 1
           WHEN 'requested' THEN 2
           WHEN 'verified' THEN 3
           ELSE 4
         END,
         requests DESC`,
    ),
    queryHackathonRows<AggregateRow>(
      `SELECT
         COALESCE(NULLIF(BTRIM(${channelExpr}), ''), 'Unclassified') AS label,
         COUNT(*)::int AS requests,
         COALESCE(SUM(${amountExpr}), 0)::text AS amount
       FROM pengajuan_pembiayaan
       GROUP BY 1
       ORDER BY requests DESC, amount DESC
       LIMIT 10`,
    ),
    queryHackathonRows<TotalsRow>(
      `SELECT
         COUNT(*)::int AS "totalRequests",
         COALESCE(SUM(${amountExpr}), 0)::text AS "totalAmount",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(${statusExpr}), '') IS NULL)::int AS "missingStatus",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(${channelExpr}), '') IS NULL)::int AS "missingChannel",
         ${amountColumn ? `COUNT(*) FILTER (WHERE ${quoteIdentifier(amountColumn)} IS NULL)::int` : "COUNT(*)::int"} AS "missingAmount"
       FROM pengajuan_pembiayaan`,
    ),
  ]);

  const statusSummary = mergeStatusSummary(statusRows);
  const channelSummary = mergeChannelSummary(channelRows);
  const totals = totalsRows[0] ?? {
    totalRequests: 0,
    totalAmount: "0",
    missingStatus: 0,
    missingChannel: 0,
    missingAmount: 0,
  };
  const draftRequests = findRequests(statusSummary, "draft");
  const requestedRequests = findRequests(statusSummary, "requested");
  const verifiedRequests = findRequests(statusSummary, "verified");
  const totalRequests = Number(totals.totalRequests ?? 0);
  const verificationRate = totalRequests > 0 ? Number((verifiedRequests / totalRequests).toFixed(4)) : null;
  const analystInput = {
    totalRequests,
    totalAmount: totals.totalAmount,
    draftRequests,
    requestedRequests,
    verifiedRequests,
    unverifiedRequests: Math.max(totalRequests - verifiedRequests, 0),
    verificationRate,
    missingStatus: totals.missingStatus,
    missingChannel: totals.missingChannel,
    missingAmount: totals.missingAmount,
  };

  return {
    source: "hackathon-shared-db-read-only",
    mode: "aggregate-only-no-pii-financing-readiness",
    tablePrefix: HACKATHON_TABLE_PREFIX,
    schemaScope: HACKATHON_SCHEMA_SCOPE,
    freshness: {
      generatedAt: new Date().toISOString(),
      method: "live read-only aggregate query when endpoint is requested",
      caveat: "Freshness follows shared DB sample state and is not a SIMKOPDES production KPI.",
    },
    confidence: {
      level: statusColumn && amountColumn ? "medium" : "limited",
      basis: statusColumn
        ? "status workflow column found in shared sample table"
        : "status column not found; endpoint returns guarded unknown aggregates",
      caveat: "Aggregate readiness signal only; no row-level documents, borrowers, or approvals are returned.",
    },
    sourceCaveat: buildSourceCaveatFields(
      "pengajuan_pembiayaan aggregate",
      statusColumn && amountColumn ? "medium" : "limited",
      "shared-db-read-only-aggregate",
    ),
    detectedColumns: {
      status: statusColumn,
      amount: amountColumn,
      channel: channelColumn,
    },
    totals: {
      totalRequests,
      totalAmount: totals.totalAmount,
      draftRequests,
      requestedRequests,
      verifiedRequests,
      unverifiedRequests: Math.max(totalRequests - verifiedRequests, 0),
      verificationRate,
      missingStatus: totals.missingStatus,
      missingChannel: totals.missingChannel,
      missingAmount: totals.missingAmount,
    },
    statusSummary,
    channelSummary,
    businessAnalystAggregate: buildFinancingBusinessAnalystAggregate(analystInput),
    borrowerRiskGuardrails: buildBorrowerRiskGuardrails(analystInput),
    actionChecklist: [
      {
        id: "draft-to-requested",
        title: "Draft -> requested",
        status: draftRequests > 0 ? "needs-evidence-package" : "no-draft-backlog",
        nextAction:
          "Lengkapi tujuan modal kerja, bukti stok/produk, transaksi atau kemitraan, dan catatan pengurus sebelum status naik.",
        source: "pengajuan_pembiayaan.status_permohonan aggregate",
        caveat: "Tidak ada dokumen atau data personal yang ditampilkan di endpoint demo.",
      },
      {
        id: "requested-to-verified",
        title: "Requested -> verified",
        status: requestedRequests > 0 ? "needs-human-verification" : "no-requested-backlog",
        nextAction:
          "Cocokkan dengan opportunity score, readiness stok, buyer archetype, RAT/laporan, dan kelengkapan dokumen.",
        source: "pengajuan_pembiayaan + readiness signals",
        caveat: "Verification readiness bukan persetujuan kredit atau komitmen bank.",
      },
      {
        id: "verified-deal-room",
        title: "Verified deal room",
        status: verifiedRequests > 0 ? "ready-for-committee-review" : "no-verified-sample-yet",
        nextAction:
          "Masukkan verified aggregate ke laporan aksi sebagai contoh paket rapat, tetap membutuhkan keputusan komite/pengurus.",
        source: "aggregate verified requests",
        caveat: "Verified di sample bukan approval otomatis dan bukan bukti pencairan.",
      },
    ],
    guardrails: {
      enforcement: "authenticated read-only aggregate financing readiness only",
      excludes: [
        "NIK",
        "phone",
        "email",
        "borrower/member names",
        "addresses",
        "bank account numbers",
        "documents",
        "file paths",
      ],
      claimBoundary:
        "Deal room is readiness and action checklist only; it must not be pitched as automatic financing approval.",
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  if (!isHackathonSharedDbConfigured()) return hackathonDbRequiredResponse();

  try {
    return Response.json(await getFinancingReadiness());
  } catch (error) {
    return Response.json(
      {
        error: "HACKATHON_SHARED_DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Shared DB financing readiness query failed.",
        tablePrefix: HACKATHON_TABLE_PREFIX,
      },
      { status: 502 },
    );
  }
}

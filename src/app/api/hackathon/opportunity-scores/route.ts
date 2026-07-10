import { requireAuthenticatedRequest } from "@/lib/auth";
import {
  hackathonDbRequiredResponse,
  HACKATHON_SCHEMA_SCOPE,
  HACKATHON_TABLE_PREFIX,
  isHackathonSharedDbConfigured,
  queryHackathonRows,
} from "@/lib/hackathon-shared-db";
import { buildSourceCaveatFields } from "@/lib/commodity-intelligence";

export const runtime = "nodejs";

type OpportunityAreaRow = {
  kodeWilayah: string | null;
  province: string | null;
  regency: string | null;
  district: string | null;
  village: string | null;
  commodityRows: string;
  potentialValue: string | null;
  cooperatives: string;
  products: string;
  stockItems: string;
  stockTotal: string | null;
  transactions: string;
  partnershipRequests: string;
  cooperativeProfiles: string;
  registeredCooperatives: string;
};

type ScoreWeights = {
  commodityPotential: number;
  cooperativeReadiness: number;
  productStockReadiness: number;
  marketTransactionSignal: number;
  partnershipSignal: number;
  dataQualityCompleteness: number;
};

type OpportunityCandidate = {
  area: {
    kodeWilayah: string | null;
    province: string | null;
    regency: string | null;
    district: string | null;
    village: string | null;
  };
  rawSignals: {
    commodityRows: number;
    potentialValue: number;
    cooperatives: number;
    products: number;
    stockItems: number;
    stockTotal: number;
    transactions: number;
    partnershipRequests: number;
    cooperativeProfiles: number;
    registeredCooperatives: number;
  };
  componentScores: {
    commodityPotential: number;
    cooperativeReadiness: number;
    productStockReadiness: number;
    marketTransactionSignal: number;
    partnershipSignal: number;
    dataQualityCompleteness: number;
  };
  marketSignal: {
    status: "internal-transaction-signal" | "weak-or-missing-signal";
    componentScore: number;
    source: string;
    supportingRows: number;
    caveat: string;
    nextAction: string;
  };
  sourceCaveat: ReturnType<typeof buildSourceCaveatFields>;
  score: number;
};

const scoreWeights: ScoreWeights = {
  commodityPotential: 30,
  cooperativeReadiness: 20,
  productStockReadiness: 20,
  marketTransactionSignal: 15,
  partnershipSignal: 10,
  dataQualityCompleteness: 5,
};

function toNumber(value: string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeTo100(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.min((value / maxValue) * 100, 100);
}

function computeComponentScores(
  row: OpportunityAreaRow,
  maxima: {
    commodityRows: number;
    potentialValue: number;
    cooperatives: number;
    products: number;
    stockItems: number;
    stockTotal: number;
    transactions: number;
    partnershipRequests: number;
    cooperativeProfiles: number;
    registeredCooperatives: number;
  },
) {
  const commodityRows = toNumber(row.commodityRows);
  const potentialValue = toNumber(row.potentialValue);
  const cooperatives = toNumber(row.cooperatives);
  const products = toNumber(row.products);
  const stockItems = toNumber(row.stockItems);
  const stockTotal = toNumber(row.stockTotal);
  const transactions = toNumber(row.transactions);
  const partnershipRequests = toNumber(row.partnershipRequests);
  const cooperativeProfiles = toNumber(row.cooperativeProfiles);
  const registeredCooperatives = toNumber(row.registeredCooperatives);

  const areaCompletenessFields = [row.kodeWilayah, row.province, row.regency, row.district, row.village];
  const areaCompleteness =
    (areaCompletenessFields.filter((value) => value !== null && value !== "").length / areaCompletenessFields.length) *
    100;
  const signalCompleteness =
    [
      commodityRows > 0,
      cooperatives > 0,
      products > 0,
      transactions > 0,
      partnershipRequests > 0,
      cooperativeProfiles > 0,
    ].filter(Boolean).length /
      6 *
    100;

  const commodityPotential = clampScore(
    0.5 * normalizeTo100(commodityRows, maxima.commodityRows) +
      0.5 * normalizeTo100(potentialValue, maxima.potentialValue),
  );
  const cooperativeReadiness = clampScore(
    0.45 * normalizeTo100(cooperatives, maxima.cooperatives) +
      0.35 * normalizeTo100(cooperativeProfiles, maxima.cooperativeProfiles) +
      0.2 * normalizeTo100(registeredCooperatives, maxima.registeredCooperatives),
  );
  const productStockReadiness = clampScore(
    0.45 * normalizeTo100(products, maxima.products) +
      0.35 * normalizeTo100(stockItems, maxima.stockItems) +
      0.2 * normalizeTo100(stockTotal, maxima.stockTotal),
  );
  const marketTransactionSignal = clampScore(normalizeTo100(transactions, maxima.transactions));
  const partnershipSignal = clampScore(normalizeTo100(partnershipRequests, maxima.partnershipRequests));
  const dataQualityCompleteness = clampScore(0.7 * areaCompleteness + 0.3 * signalCompleteness);

  const score =
    (commodityPotential * scoreWeights.commodityPotential +
      cooperativeReadiness * scoreWeights.cooperativeReadiness +
      productStockReadiness * scoreWeights.productStockReadiness +
      marketTransactionSignal * scoreWeights.marketTransactionSignal +
      partnershipSignal * scoreWeights.partnershipSignal +
      dataQualityCompleteness * scoreWeights.dataQualityCompleteness) /
    100;

  return {
    rawSignals: {
      commodityRows,
      potentialValue,
      cooperatives,
      products,
      stockItems,
      stockTotal,
      transactions,
      partnershipRequests,
      cooperativeProfiles,
      registeredCooperatives,
    },
    componentScores: {
      commodityPotential,
      cooperativeReadiness,
      productStockReadiness,
      marketTransactionSignal,
      partnershipSignal,
      dataQualityCompleteness,
    },
    score: clampScore(score),
  };
}

async function getOpportunityScores() {
  const rows = await queryHackathonRows<OpportunityAreaRow>(
    `WITH product_counts AS (
       SELECT koperasi_ref, COUNT(*)::int AS products
       FROM produk_koperasi
       GROUP BY koperasi_ref
     ),
     stock_counts AS (
       SELECT koperasi_ref, COUNT(*)::int AS stock_items, COALESCE(SUM(stok), 0)::numeric AS stock_total
       FROM inventaris_produk
       GROUP BY koperasi_ref
     ),
     transaction_counts AS (
       SELECT koperasi_ref, COUNT(*)::int AS transactions
       FROM transaksi_penjualan
       GROUP BY koperasi_ref
     ),
     partnership_counts AS (
       SELECT koperasi_ref, COUNT(*)::int AS partnership_requests
       FROM pengajuan_kemitraan
       GROUP BY koperasi_ref
     ),
     commodity_by_area AS (
       SELECT
         kode_wilayah,
         COUNT(DISTINCT komoditas_ref)::int AS "commodityRows",
         COALESCE(SUM(nilai_potensi_desa), 0)::numeric AS "potentialValue"
       FROM referensi_komoditas_desa
       GROUP BY kode_wilayah
     ),
     cooperative_map AS (
       SELECT DISTINCT
         rkw.kode_wilayah,
         rkw.koperasi_ref,
         pk.koperasi_ref AS profile_ref,
         pk.status_registrasi
       FROM referensi_koperasi_wilayah rkw
       LEFT JOIN profil_koperasi pk ON pk.koperasi_ref = rkw.koperasi_ref
       WHERE rkw.kode_wilayah IS NOT NULL
         AND rkw.koperasi_ref IS NOT NULL
     ),
     cooperative_by_area AS (
       SELECT
         cm.kode_wilayah,
         COUNT(DISTINCT cm.koperasi_ref)::int AS cooperatives,
         COUNT(DISTINCT cm.profile_ref)::int AS "cooperativeProfiles",
         COUNT(DISTINCT cm.profile_ref) FILTER (
           WHERE NULLIF(BTRIM(cm.status_registrasi::text), '') IS NOT NULL
         )::int AS "registeredCooperatives",
         COALESCE(SUM(COALESCE(pc.products, 0)), 0)::int AS products,
         COALESCE(SUM(COALESCE(sc.stock_items, 0)), 0)::int AS "stockItems",
         COALESCE(SUM(COALESCE(sc.stock_total, 0)), 0)::numeric AS "stockTotal",
         COALESCE(SUM(COALESCE(tc.transactions, 0)), 0)::int AS transactions,
         COALESCE(SUM(COALESCE(kc.partnership_requests, 0)), 0)::int AS "partnershipRequests"
       FROM cooperative_map cm
       LEFT JOIN product_counts pc ON pc.koperasi_ref = cm.koperasi_ref
       LEFT JOIN stock_counts sc ON sc.koperasi_ref = cm.koperasi_ref
       LEFT JOIN transaction_counts tc ON tc.koperasi_ref = cm.koperasi_ref
       LEFT JOIN partnership_counts kc ON kc.koperasi_ref = cm.koperasi_ref
       GROUP BY cm.kode_wilayah
     )
     SELECT
       rw.kode_wilayah AS "kodeWilayah",
       rw.provinsi AS province,
       rw.kab_kota AS regency,
       rw.kecamatan AS district,
       rw.desa_kelurahan AS village,
       COALESCE(cba."commodityRows", 0)::text AS "commodityRows",
       COALESCE(cba."potentialValue", 0)::text AS "potentialValue",
       COALESCE(ca.cooperatives, 0)::text AS cooperatives,
       COALESCE(ca.products, 0)::text AS products,
       COALESCE(ca."stockItems", 0)::text AS "stockItems",
       COALESCE(ca."stockTotal", 0)::text AS "stockTotal",
       COALESCE(ca.transactions, 0)::text AS transactions,
       COALESCE(ca."partnershipRequests", 0)::text AS "partnershipRequests",
       COALESCE(ca."cooperativeProfiles", 0)::text AS "cooperativeProfiles",
       COALESCE(ca."registeredCooperatives", 0)::text AS "registeredCooperatives"
     FROM referensi_wilayah rw
     LEFT JOIN commodity_by_area cba ON cba.kode_wilayah = rw.kode_wilayah
     LEFT JOIN cooperative_by_area ca ON ca.kode_wilayah = rw.kode_wilayah
     WHERE rw.kode_wilayah IS NOT NULL
     ORDER BY COALESCE(cba."commodityRows", 0) DESC, COALESCE(cba."potentialValue", 0) DESC, COALESCE(ca.cooperatives, 0) DESC, COALESCE(ca.transactions, 0) DESC
     LIMIT 15`,
  );

  const maxima = rows.reduce(
    (acc, row) => {
      acc.commodityRows = Math.max(acc.commodityRows, toNumber(row.commodityRows));
      acc.potentialValue = Math.max(acc.potentialValue, toNumber(row.potentialValue));
      acc.cooperatives = Math.max(acc.cooperatives, toNumber(row.cooperatives));
      acc.products = Math.max(acc.products, toNumber(row.products));
      acc.stockItems = Math.max(acc.stockItems, toNumber(row.stockItems));
      acc.stockTotal = Math.max(acc.stockTotal, toNumber(row.stockTotal));
      acc.transactions = Math.max(acc.transactions, toNumber(row.transactions));
      acc.partnershipRequests = Math.max(acc.partnershipRequests, toNumber(row.partnershipRequests));
      acc.cooperativeProfiles = Math.max(acc.cooperativeProfiles, toNumber(row.cooperativeProfiles));
      acc.registeredCooperatives = Math.max(acc.registeredCooperatives, toNumber(row.registeredCooperatives));
      return acc;
    },
    {
      commodityRows: 0,
      potentialValue: 0,
      cooperatives: 0,
      products: 0,
      stockItems: 0,
      stockTotal: 0,
      transactions: 0,
      partnershipRequests: 0,
      cooperativeProfiles: 0,
      registeredCooperatives: 0,
    },
  );

  const topAreas: OpportunityCandidate[] = rows
    .map((row) => {
      const computed = computeComponentScores(row, maxima);
      const marketSignalStatus: OpportunityCandidate["marketSignal"]["status"] =
        computed.rawSignals.transactions > 0 ? "internal-transaction-signal" : "weak-or-missing-signal";
      return {
        area: {
          kodeWilayah: row.kodeWilayah,
          province: row.province,
          regency: row.regency,
          district: row.district,
          village: row.village,
        },
        rawSignals: computed.rawSignals,
        componentScores: computed.componentScores,
        marketSignal: {
          status: marketSignalStatus,
          componentScore: computed.componentScores.marketTransactionSignal,
          source: "transaksi_penjualan aggregate count in shared DB sample",
          supportingRows: computed.rawSignals.transactions,
          caveat:
            "Market signal is based on historical/sample transaction counts only. It is not a real-time price, live buyer demand, or guaranteed offtake signal.",
          nextAction:
            "Use /api/commodity-news for contextual news and official price-check workflow before buyer negotiation.",
        },
        sourceCaveat: buildSourceCaveatFields(
          "opportunity score aggregate tables",
          computed.score >= 60 ? "medium" : "limited",
          "shared-db-read-only-aggregate",
        ),
        score: computed.score,
      };
    })
    .sort((a, b) => b.score - a.score || b.componentScores.commodityPotential - a.componentScores.commodityPotential)
    .slice(0, 15);

  return {
    source: "hackathon-shared-db-read-only",
    mode: "aggregate-only-no-pii-opportunity-scoring",
    tablePrefix: HACKATHON_TABLE_PREFIX,
    schemaScope: HACKATHON_SCHEMA_SCOPE,
    scoreWeights,
    marketSignalPolicy: {
      weightedComponent: "marketTransactionSignal",
      weight: scoreWeights.marketTransactionSignal,
      source: "transaksi_penjualan aggregate count; external commodity news remains contextual only",
      caveat:
        "The 15% market component is a weak aggregate signal and must not be used as a real-time price or live demand claim.",
      sourceCaveat: buildSourceCaveatFields("market signal aggregate", "limited", "shared-db-read-only-aggregate"),
    },
    topAreas,
    guardrails: {
      enforcement: "authenticated read-only aggregate scoring only",
      excludes: [
        "NIK",
        "phone",
        "email",
        "full personal names",
        "addresses",
        "customer records",
        "member records",
        "file paths",
        "documents",
        "photos",
      ],
      tablesUsed: [
        "referensi_wilayah",
        "referensi_komoditas_desa",
        "referensi_koperasi_wilayah",
        "profil_koperasi",
        "produk_koperasi",
        "inventaris_produk",
        "transaksi_penjualan",
        "pengajuan_kemitraan",
      ],
      scoringMethod:
        "Each component is normalized to 0-100 against the best observed value in the current candidate set, then combined with fixed weights to yield a bounded 0-100 score.",
    },
    recommendations: [
      "Prioritize areas with strong commodity potential and weak transaction signal for the next buyer-matching experiments.",
      "Use cooperative readiness and stock readiness together before proposing a live pilot area.",
      "Treat partnership requests as follow-up demand signal, not as a substitute for commodity and inventory readiness.",
      "Keep the endpoint aggregate-only and route any row-level review through authenticated operator workflows.",
    ],
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  if (!isHackathonSharedDbConfigured()) return hackathonDbRequiredResponse();

  try {
    return Response.json(await getOpportunityScores());
  } catch (error) {
    return Response.json(
      {
        error: "HACKATHON_SHARED_DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Shared DB query failed.",
        tablePrefix: HACKATHON_TABLE_PREFIX,
      },
      { status: 502 },
    );
  }
}

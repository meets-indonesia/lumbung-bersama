import { requireAuthenticatedRequest } from "@/lib/auth";
import {
  hackathonDbRequiredResponse,
  HACKATHON_SCHEMA_SCOPE,
  HACKATHON_TABLE_PREFIX,
  isHackathonSharedDbConfigured,
  queryHackathonRows,
} from "@/lib/hackathon-shared-db";

export const runtime = "nodejs";

type CooperativeSummaryRow = {
  cooperativeRef: string;
  cooperativeName: string | null;
  province: string | null;
  regency: string | null;
  locationLinks: number;
  provinceLinks: number;
  regencyLinks: number;
  districtLinks: number;
  registrationStatus: string | null;
  hasCoordinates: boolean;
  productsTotal: number;
  namedProducts: number;
  retailPackagedProducts: number;
  bulkOfftakerProducts: number;
  horecaLocalProducts: number;
  institutionalProcurementProducts: number;
  stockItems: number;
  stockTotal: number | string | null;
  positiveStockItems: number;
  lowOrNegativeStockItems: number;
  transactions: number;
  partnershipRequests: number;
  productExamples: string[] | null;
};

type ArchetypeId =
  | "retail_packaged_goods"
  | "bulk_offtaker"
  | "horeca_local"
  | "institutional_procurement";

type BuyerArchetype = {
  id: ArchetypeId;
  label: string;
  description: string;
  bestSignals: string[];
};

type ComponentScores = {
  productFit: number;
  stockReadiness: number;
  supplyConsistency: number;
  locationLogistics: number;
  qualityReadinessProxy: number;
  transactionPartnershipSignal: number;
  governanceApprovalReadiness: number;
};

type MatchResult = {
  rank: number;
  buyerArchetype: ArchetypeId;
  buyerArchetypeLabel: string;
  score: number;
  readinessCluster: "pilot_ready" | "qualified" | "emerging" | "early_stage";
  cooperativeRef: string;
  cooperativeName: string | null;
  location: {
    province: string | null;
    regency: string | null;
    locationLinks: number;
  };
  productSnapshot: {
    productsTotal: number;
    namedProducts: number;
    productExamples: string[];
  };
  signals: {
    productKeywordHits: number;
    matchedKeywords: string[];
    stockItems: number;
    stockTotal: number;
    positiveStockItems: number;
    transactions: number;
    partnershipRequests: number;
    registrationStatus: string | null;
    hasCoordinates: boolean;
  };
  componentScores: ComponentScores;
};

const BUYER_ARCHETYPES: BuyerArchetype[] = [
  {
    id: "retail_packaged_goods",
    label: "Retail packaged goods",
    description: "Shelf-ready, packaged, repeatable products that can move through retail channels.",
    bestSignals: ["kemasan", "pack", "sachet", "botol", "cup", "box", "retail", "ecer", "ready"],
  },
  {
    id: "bulk_offtaker",
    label: "Bulk offtaker",
    description: "High-volume commodities suited for warehouse, trading, and aggregation channels.",
    bestSignals: ["curah", "bulk", "grosir", "kg", "kilogram", "ton", "gabah", "beras", "komoditas"],
  },
  {
    id: "horeca_local",
    label: "HORECA local",
    description: "Fresh, prepared, or service-friendly supply for hotel, restaurant, and catering demand.",
    bestSignals: ["fresh", "segar", "premium", "frozen", "ready", "catering", "resto", "restaurant", "hotel"],
  },
  {
    id: "institutional_procurement",
    label: "Institutional procurement",
    description: "Staple and compliance-friendly supply for schools, offices, and public procurement.",
    bestSignals: ["pengadaan", "procurement", "sembako", "beras", "minyak", "gula", "telur", "daging", "susu"],
  },
];

const MATCH_WEIGHTS = {
  productFit: 25,
  stockReadiness: 20,
  supplyConsistency: 15,
  locationLogistics: 15,
  qualityReadinessProxy: 10,
  transactionPartnershipSignal: 10,
  governanceApprovalReadiness: 5,
} as const;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function roundScore(value: number) {
  return Math.round(clamp(value));
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPattern(keywords: string[]) {
  return `(?:${keywords.map(escapeRegex).join("|")})`;
}

function normalizeCount(count: number, target: number) {
  if (target <= 0) return 0;
  return clamp((count / target) * 100);
}

function normalizeLogScale(value: number, cap: number) {
  if (value <= 0 || cap <= 0) return 0;
  const bounded = Math.log10(value + 1) / Math.log10(cap + 1);
  return clamp(bounded * 100);
}

function registrationScore(status: string | null) {
  if (!status) return 0;
  const normalized = status.toLowerCase();
  if (/(aktif|terdaftar|resmi|verified|valid|approved|disetujui|sah)/.test(normalized)) return 100;
  if (/(proses|pending|verif|verifikasi|review)/.test(normalized)) return 65;
  if (/(nonaktif|tidak aktif|inactive|ditolak|rejected)/.test(normalized)) return 20;
  return 55;
}

function readinessCluster(score: number): MatchResult["readinessCluster"] {
  if (score >= 80) return "pilot_ready";
  if (score >= 60) return "qualified";
  if (score >= 40) return "emerging";
  return "early_stage";
}

function computeComponentScores(row: CooperativeSummaryRow, archetype: BuyerArchetype, matchedKeywords: string[]): ComponentScores {
  const productsTotal = toNumber(row.productsTotal);
  const namedProducts = toNumber(row.namedProducts);
  const stockItems = toNumber(row.stockItems);
  const stockTotal = toNumber(row.stockTotal);
  const positiveStockItems = toNumber(row.positiveStockItems);
  const lowOrNegativeStockItems = toNumber(row.lowOrNegativeStockItems);
  const transactions = toNumber(row.transactions);
  const partnershipRequests = toNumber(row.partnershipRequests);
  const locationLinks = toNumber(row.locationLinks);
  const provinceLinks = toNumber(row.provinceLinks);
  const regencyLinks = toNumber(row.regencyLinks);
  const districtLinks = toNumber(row.districtLinks);
  const productKeywordHits = matchedKeywords.length;

  const keywordDensity = productsTotal > 0 ? (productKeywordHits / productsTotal) * 100 : 0;
  const catalogBreadth = normalizeCount(productsTotal, 12);
  const productFit = roundScore(keywordDensity * 0.75 + catalogBreadth * 0.25);

  const stockCoverage = productsTotal > 0 ? (positiveStockItems / productsTotal) * 100 : stockItems > 0 ? 100 : 0;
  const stockVolume = normalizeLogScale(stockTotal, 500);
  const stockReadiness = roundScore(stockCoverage * 0.5 + stockVolume * 0.3 + normalizeCount(stockItems, 15) * 0.2);

  const supplyConsistency = roundScore(
    normalizeCount(transactions, 20) * 0.55 +
      normalizeCount(partnershipRequests, 10) * 0.25 +
      normalizeCount(productsTotal, 15) * 0.2,
  );

  const locationLogistics = roundScore(
    (locationLinks > 0 ? 35 : 0) +
      normalizeCount(provinceLinks, 3) * 0.15 +
      normalizeCount(regencyLinks, 5) * 0.15 +
      normalizeCount(districtLinks, 10) * 0.15 +
      (row.hasCoordinates ? 25 : 0) +
      (row.province && row.regency ? 10 : 0),
  );

  const qualityReadinessProxy = roundScore(
    (productsTotal > 0 ? (namedProducts / productsTotal) * 45 : 0) +
      (row.hasCoordinates ? 20 : 0) +
      (lowOrNegativeStockItems === 0 ? 15 : 0) +
      (row.registrationStatus ? 20 : 0),
  );

  const transactionPartnershipSignal = roundScore(
    normalizeCount(transactions, 20) * 0.65 + normalizeCount(partnershipRequests, 10) * 0.35,
  );

  const governanceApprovalReadiness = roundScore(registrationScore(row.registrationStatus) * 0.7 + (row.hasCoordinates ? 30 : 0));

  return {
    productFit,
    stockReadiness,
    supplyConsistency,
    locationLogistics,
    qualityReadinessProxy,
    transactionPartnershipSignal,
    governanceApprovalReadiness,
  };
}

function computeMatch(row: CooperativeSummaryRow, archetype: BuyerArchetype): MatchResult {
  const productNames = (row.productExamples ?? []).map((name) => safeText(name)).filter((name): name is string => Boolean(name));
  const matchedKeywords = archetype.bestSignals.filter((keyword) =>
    productNames.some((name) => name.toLowerCase().includes(keyword.toLowerCase())),
  );
  const componentScores = computeComponentScores(row, archetype, matchedKeywords);
  const score = roundScore(
    (componentScores.productFit * MATCH_WEIGHTS.productFit) / 100 +
      (componentScores.stockReadiness * MATCH_WEIGHTS.stockReadiness) / 100 +
      (componentScores.supplyConsistency * MATCH_WEIGHTS.supplyConsistency) / 100 +
      (componentScores.locationLogistics * MATCH_WEIGHTS.locationLogistics) / 100 +
      (componentScores.qualityReadinessProxy * MATCH_WEIGHTS.qualityReadinessProxy) / 100 +
      (componentScores.transactionPartnershipSignal * MATCH_WEIGHTS.transactionPartnershipSignal) / 100 +
      (componentScores.governanceApprovalReadiness * MATCH_WEIGHTS.governanceApprovalReadiness) / 100,
  );

  return {
    rank: 0,
    buyerArchetype: archetype.id,
    buyerArchetypeLabel: archetype.label,
    score,
    readinessCluster: readinessCluster(score),
    cooperativeRef: row.cooperativeRef,
    cooperativeName: row.cooperativeName,
    location: {
      province: row.province,
      regency: row.regency,
      locationLinks: toNumber(row.locationLinks),
    },
    productSnapshot: {
      productsTotal: toNumber(row.productsTotal),
      namedProducts: toNumber(row.namedProducts),
      productExamples: productNames.slice(0, 5),
    },
    signals: {
      productKeywordHits: matchedKeywords.length,
      matchedKeywords,
      stockItems: toNumber(row.stockItems),
      stockTotal: toNumber(row.stockTotal),
      positiveStockItems: toNumber(row.positiveStockItems),
      transactions: toNumber(row.transactions),
      partnershipRequests: toNumber(row.partnershipRequests),
      registrationStatus: row.registrationStatus,
      hasCoordinates: row.hasCoordinates,
    },
    componentScores,
  };
}

async function getBuyerMatchingLite() {
  const retailPattern = buildPattern(BUYER_ARCHETYPES[0].bestSignals);
  const bulkPattern = buildPattern(BUYER_ARCHETYPES[1].bestSignals);
  const horecaPattern = buildPattern(BUYER_ARCHETYPES[2].bestSignals);
  const institutionalPattern = buildPattern(BUYER_ARCHETYPES[3].bestSignals);

  const cooperativeRows = await queryHackathonRows<CooperativeSummaryRow>(
    `WITH product_base AS (
       SELECT
         koperasi_ref,
         COUNT(*)::int AS "productsTotal",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(nama_produk::text), '') IS NOT NULL)::int AS "namedProducts",
         COUNT(*) FILTER (
           WHERE NULLIF(BTRIM(nama_produk::text), '') IS NOT NULL
             AND LOWER(nama_produk::text) ~* $1
         )::int AS "retailPackagedProducts",
         COUNT(*) FILTER (
           WHERE NULLIF(BTRIM(nama_produk::text), '') IS NOT NULL
             AND LOWER(nama_produk::text) ~* $2
         )::int AS "bulkOfftakerProducts",
         COUNT(*) FILTER (
           WHERE NULLIF(BTRIM(nama_produk::text), '') IS NOT NULL
             AND LOWER(nama_produk::text) ~* $3
         )::int AS "horecaLocalProducts",
         COUNT(*) FILTER (
           WHERE NULLIF(BTRIM(nama_produk::text), '') IS NOT NULL
             AND LOWER(nama_produk::text) ~* $4
         )::int AS "institutionalProcurementProducts",
         array_remove(array_agg(DISTINCT NULLIF(BTRIM(nama_produk::text), '')), NULL) AS "productExamples"
       FROM produk_koperasi
       GROUP BY koperasi_ref
     ),
     stock_base AS (
       SELECT
         koperasi_ref,
         COUNT(*)::int AS "stockItems",
         COALESCE(SUM(GREATEST(COALESCE(stok, 0), 0)), 0)::double precision AS "stockTotal",
         COUNT(*) FILTER (WHERE COALESCE(stok, 0) > 0)::int AS "positiveStockItems",
         COUNT(*) FILTER (WHERE COALESCE(stok, 0) <= 0)::int AS "lowOrNegativeStockItems"
       FROM inventaris_produk
       GROUP BY koperasi_ref
     ),
     transaction_base AS (
       SELECT koperasi_ref, COUNT(*)::int AS "transactions"
       FROM transaksi_penjualan
       GROUP BY koperasi_ref
     ),
     partnership_base AS (
       SELECT koperasi_ref, COUNT(*)::int AS "partnershipRequests"
       FROM pengajuan_kemitraan
       GROUP BY koperasi_ref
     ),
     location_base AS (
       SELECT
         rkw.koperasi_ref,
         MAX(NULLIF(BTRIM(rw.provinsi::text), '')) AS province,
         MAX(NULLIF(BTRIM(rw.kab_kota::text), '')) AS regency,
         COUNT(DISTINCT rw.kode_wilayah)::int AS "locationLinks",
         COUNT(DISTINCT rw.provinsi)::int AS "provinceLinks",
         COUNT(DISTINCT rw.kab_kota)::int AS "regencyLinks",
         COUNT(DISTINCT rw.kecamatan)::int AS "districtLinks"
       FROM referensi_koperasi_wilayah rkw
       LEFT JOIN referensi_wilayah rw ON rw.kode_wilayah = rkw.kode_wilayah
       GROUP BY rkw.koperasi_ref
     )
     SELECT
       pk.koperasi_ref AS "cooperativeRef",
       NULLIF(BTRIM(pk.nama_koperasi::text), '') AS "cooperativeName",
       lb.province,
       lb.regency,
       COALESCE(lb."locationLinks", 0)::int AS "locationLinks",
       COALESCE(lb."provinceLinks", 0)::int AS "provinceLinks",
       COALESCE(lb."regencyLinks", 0)::int AS "regencyLinks",
       COALESCE(lb."districtLinks", 0)::int AS "districtLinks",
       NULLIF(BTRIM(pk.status_registrasi::text), '') AS "registrationStatus",
       NULLIF(BTRIM(pk.koordinat_dibulatkan::text), '') IS NOT NULL AS "hasCoordinates",
       COALESCE(pb."productsTotal", 0)::int AS "productsTotal",
       COALESCE(pb."namedProducts", 0)::int AS "namedProducts",
       COALESCE(pb."retailPackagedProducts", 0)::int AS "retailPackagedProducts",
       COALESCE(pb."bulkOfftakerProducts", 0)::int AS "bulkOfftakerProducts",
       COALESCE(pb."horecaLocalProducts", 0)::int AS "horecaLocalProducts",
       COALESCE(pb."institutionalProcurementProducts", 0)::int AS "institutionalProcurementProducts",
       COALESCE(sb."stockItems", 0)::int AS "stockItems",
       COALESCE(sb."stockTotal", 0)::double precision AS "stockTotal",
       COALESCE(sb."positiveStockItems", 0)::int AS "positiveStockItems",
       COALESCE(sb."lowOrNegativeStockItems", 0)::int AS "lowOrNegativeStockItems",
       COALESCE(tb."transactions", 0)::int AS "transactions",
       COALESCE(kb."partnershipRequests", 0)::int AS "partnershipRequests",
       pb."productExamples"
     FROM profil_koperasi pk
     LEFT JOIN product_base pb ON pb.koperasi_ref = pk.koperasi_ref
     LEFT JOIN stock_base sb ON sb.koperasi_ref = pk.koperasi_ref
     LEFT JOIN transaction_base tb ON tb.koperasi_ref = pk.koperasi_ref
     LEFT JOIN partnership_base kb ON kb.koperasi_ref = pk.koperasi_ref
     LEFT JOIN location_base lb ON lb.koperasi_ref = pk.koperasi_ref
     WHERE COALESCE(pb."productsTotal", 0) > 0
        OR COALESCE(sb."stockItems", 0) > 0
        OR COALESCE(tb."transactions", 0) > 0
        OR COALESCE(kb."partnershipRequests", 0) > 0
     ORDER BY
       COALESCE(tb."transactions", 0) DESC,
       COALESCE(kb."partnershipRequests", 0) DESC,
       COALESCE(sb."stockTotal", 0) DESC,
       COALESCE(pb."productsTotal", 0) DESC,
       pk.koperasi_ref ASC`,
    [retailPattern, bulkPattern, horecaPattern, institutionalPattern],
  );

  const matches = cooperativeRows
    .flatMap((row) => BUYER_ARCHETYPES.map((archetype) => computeMatch(row, archetype)))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.componentScores.productFit !== left.componentScores.productFit) {
        return right.componentScores.productFit - left.componentScores.productFit;
      }
      if (right.componentScores.stockReadiness !== left.componentScores.stockReadiness) {
        return right.componentScores.stockReadiness - left.componentScores.stockReadiness;
      }
      return left.cooperativeRef.localeCompare(right.cooperativeRef);
    })
    .slice(0, 20)
    .map((match, index) => ({ ...match, rank: index + 1 }));

  return {
    source: "hackathon-shared-db-read-only",
    mode: "buyer-matching-lite-read-only",
    tablePrefix: HACKATHON_TABLE_PREFIX,
    schemaScope: HACKATHON_SCHEMA_SCOPE,
    buyerArchetypes: BUYER_ARCHETYPES,
    matchWeights: MATCH_WEIGHTS,
    matches,
    guardrails: [
      "Read-only aggregate ranking only; no INSERT, UPDATE, DELETE, or schema changes are performed.",
      "No NIK, phone, email, addresses, document paths, photos, or member/customer names are selected or returned.",
      "Archetypes are generic readiness lenses, not named buyers or live demand records.",
      "Scores are heuristic and should be validated by an operator before outreach or procurement action.",
    ],
    nextActions: [
      "Use the highest-scoring archetype clusters as a shortlist for manual operator review.",
      "Validate packaging, stock units, and product naming before presenting candidates to buyers.",
      "Add a verified buyer/offtaker table later if live counterpart data becomes available.",
      "Keep this endpoint read-only and refresh it after any shared DB data load or cleanup.",
    ],
  };
}

export async function GET(request: Request) {
  if (!isHackathonSharedDbConfigured()) return hackathonDbRequiredResponse();

  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  try {
    return Response.json(await getBuyerMatchingLite());
  } catch {
    return Response.json(
      {
        error: "HACKATHON_SHARED_DB_QUERY_FAILED",
        message: "Shared DB buyer-matching aggregate query failed.",
        tablePrefix: HACKATHON_TABLE_PREFIX,
      },
      { status: 502 },
    );
  }
}

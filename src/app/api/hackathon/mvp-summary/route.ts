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

type CountRow = {
  tableName: string;
  total: string;
};

type CoverageRow = {
  totalProvinces: string;
  totalRegencies: string;
  totalDistricts: string;
  totalVillages: string;
  commodityAreas: string;
  cooperatives: string;
  cooperativesWithProducts: string;
  cooperativesWithStock: string;
  cooperativesWithTransactions: string;
  cooperativesWithPartnerships: string;
};

type ProvinceOpportunityRow = {
  province: string;
  villages: string;
  commodityRows: string;
  potentialValue: string | null;
  cooperatives: string;
  products: string;
  stockItems: string;
  transactions: string;
  partnershipRequests: string;
};

type CooperativeCandidateRow = {
  cooperativeRef: string;
  cooperativeName: string | null;
  province: string | null;
  regency: string | null;
  village: string | null;
  products: string;
  stockItems: string;
  stockTotal: string | null;
  transactions: string;
  partnershipRequests: string;
};

const HEADLINE_EVIDENCE = {
  source: "hackathon shared DB aggregate verification",
  mode: "aggregate-only-no-pii",
  caveat:
    "Headline numbers are sample/exploration evidence from the hackathon shared DB scope, not production SIMKOPDES KPI.",
  metrics: [
    { id: "total_rows", label: "Total sample rows", value: 547_869, unit: "rows" },
    { id: "total_tables", label: "Tables inspected", value: 27, unit: "tables" },
    { id: "profiles", label: "Profil koperasi/desa/wilayah sample", value: 1_026, unit: "profiles" },
    { id: "commodity_rows", label: "Commodity rows", value: 8_191, unit: "rows" },
    { id: "product_inventory_rows", label: "Product/inventory rows", value: 13_974, unit: "rows" },
    { id: "partnership_requests", label: "Partnership requests", value: 3_254, unit: "requests" },
    { id: "paid_transactions", label: "Paid transactions", value: 1_000, unit: "transactions", amountIdr: 11_470_000_000 },
    { id: "financing_requests", label: "Financing requests", value: 118, unit: "requests", amountIdr: 105_390_000_000 },
    { id: "verified_financing", label: "Verified financing", value: 1, unit: "request" },
  ],
} as const;

function pseudonymousCooperativeRef(value: string | null | undefined, index: number) {
  const source = value || `row-${index}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return `sample-koperasi-${String((hash % 10_000) + 1).padStart(4, "0")}`;
}

async function getSharedMvpSummary() {
  const [tableCounts, coverage, provinceOpportunities, cooperativeCandidates] = await Promise.all([
    queryHackathonRows<CountRow>(
      `SELECT 'referensi_wilayah' AS "tableName", COUNT(*)::text AS total FROM referensi_wilayah
       UNION ALL SELECT 'referensi_komoditas_desa', COUNT(*)::text FROM referensi_komoditas_desa
       UNION ALL SELECT 'profil_koperasi', COUNT(*)::text FROM profil_koperasi
       UNION ALL SELECT 'produk_koperasi', COUNT(*)::text FROM produk_koperasi
       UNION ALL SELECT 'inventaris_produk', COUNT(*)::text FROM inventaris_produk
       UNION ALL SELECT 'transaksi_penjualan', COUNT(*)::text FROM transaksi_penjualan
       UNION ALL SELECT 'pengajuan_kemitraan', COUNT(*)::text FROM pengajuan_kemitraan
       UNION ALL SELECT 'pengajuan_pembiayaan', COUNT(*)::text FROM pengajuan_pembiayaan`,
    ),
    queryHackathonRows<CoverageRow>(
      `SELECT
         (SELECT COUNT(DISTINCT provinsi)::text FROM referensi_wilayah) AS "totalProvinces",
         (SELECT COUNT(DISTINCT kab_kota)::text FROM referensi_wilayah) AS "totalRegencies",
         (SELECT COUNT(DISTINCT kecamatan)::text FROM referensi_wilayah) AS "totalDistricts",
         (SELECT COUNT(DISTINCT kode_wilayah)::text FROM referensi_wilayah WHERE desa_kelurahan IS NOT NULL) AS "totalVillages",
         (SELECT COUNT(DISTINCT kode_wilayah)::text FROM referensi_komoditas_desa) AS "commodityAreas",
         (SELECT COUNT(DISTINCT koperasi_ref)::text FROM profil_koperasi) AS cooperatives,
         (SELECT COUNT(DISTINCT koperasi_ref)::text FROM produk_koperasi) AS "cooperativesWithProducts",
         (SELECT COUNT(DISTINCT koperasi_ref)::text FROM inventaris_produk) AS "cooperativesWithStock",
         (SELECT COUNT(DISTINCT koperasi_ref)::text FROM transaksi_penjualan) AS "cooperativesWithTransactions",
         (SELECT COUNT(DISTINCT koperasi_ref)::text FROM pengajuan_kemitraan) AS "cooperativesWithPartnerships"`,
    ),
    queryHackathonRows<ProvinceOpportunityRow>(
      `WITH product_counts AS (
         SELECT koperasi_ref, COUNT(*)::int AS products FROM produk_koperasi GROUP BY koperasi_ref
       ),
       stock_counts AS (
         SELECT koperasi_ref, COUNT(*)::int AS stock_items FROM inventaris_produk GROUP BY koperasi_ref
       ),
       transaction_counts AS (
         SELECT koperasi_ref, COUNT(*)::int AS transactions FROM transaksi_penjualan GROUP BY koperasi_ref
       ),
       partnership_counts AS (
         SELECT koperasi_ref, COUNT(*)::int AS partnership_requests FROM pengajuan_kemitraan GROUP BY koperasi_ref
       )
       SELECT
         rw.provinsi AS province,
         COUNT(DISTINCT rw.kode_wilayah)::text AS villages,
         COUNT(DISTINCT rkd.komoditas_ref)::text AS "commodityRows",
         SUM(rkd.nilai_potensi_desa)::text AS "potentialValue",
         COUNT(DISTINCT rkw.koperasi_ref)::text AS cooperatives,
         COALESCE(SUM(pc.products), 0)::text AS products,
         COALESCE(SUM(sc.stock_items), 0)::text AS "stockItems",
         COALESCE(SUM(tc.transactions), 0)::text AS transactions,
         COALESCE(SUM(kc.partnership_requests), 0)::text AS "partnershipRequests"
       FROM referensi_wilayah rw
       LEFT JOIN referensi_komoditas_desa rkd ON rkd.kode_wilayah = rw.kode_wilayah
       LEFT JOIN referensi_koperasi_wilayah rkw ON rkw.kode_wilayah = rw.kode_wilayah
       LEFT JOIN product_counts pc ON pc.koperasi_ref = rkw.koperasi_ref
       LEFT JOIN stock_counts sc ON sc.koperasi_ref = rkw.koperasi_ref
       LEFT JOIN transaction_counts tc ON tc.koperasi_ref = rkw.koperasi_ref
       LEFT JOIN partnership_counts kc ON kc.koperasi_ref = rkw.koperasi_ref
       WHERE rw.provinsi IS NOT NULL
       GROUP BY rw.provinsi
       ORDER BY COUNT(DISTINCT rkd.komoditas_ref) DESC, COUNT(DISTINCT rkw.koperasi_ref) DESC
       LIMIT 8`,
    ),
    queryHackathonRows<CooperativeCandidateRow>(
      `WITH product_counts AS (
         SELECT koperasi_ref, COUNT(*)::int AS products FROM produk_koperasi GROUP BY koperasi_ref
       ),
       stock_counts AS (
         SELECT koperasi_ref, COUNT(*)::int AS stock_items, SUM(stok)::numeric AS stock_total
         FROM inventaris_produk
         WHERE nama_produk IS NOT NULL
         GROUP BY koperasi_ref
       ),
       transaction_counts AS (
         SELECT koperasi_ref, COUNT(*)::int AS transactions FROM transaksi_penjualan GROUP BY koperasi_ref
       ),
       partnership_counts AS (
         SELECT koperasi_ref, COUNT(*)::int AS partnership_requests FROM pengajuan_kemitraan GROUP BY koperasi_ref
       )
       SELECT
         pk.koperasi_ref AS "cooperativeRef",
         pk.nama_koperasi AS "cooperativeName",
         rw.provinsi AS province,
         rw.kab_kota AS regency,
         rw.desa_kelurahan AS village,
         COALESCE(pc.products, 0)::text AS products,
         COALESCE(sc.stock_items, 0)::text AS "stockItems",
         sc.stock_total::text AS "stockTotal",
         COALESCE(tc.transactions, 0)::text AS transactions,
         COALESCE(kc.partnership_requests, 0)::text AS "partnershipRequests"
       FROM profil_koperasi pk
       LEFT JOIN referensi_koperasi_wilayah rkw ON rkw.koperasi_ref = pk.koperasi_ref
       LEFT JOIN referensi_wilayah rw ON rw.kode_wilayah = rkw.kode_wilayah
       LEFT JOIN product_counts pc ON pc.koperasi_ref = pk.koperasi_ref
       LEFT JOIN stock_counts sc ON sc.koperasi_ref = pk.koperasi_ref
       LEFT JOIN transaction_counts tc ON tc.koperasi_ref = pk.koperasi_ref
       LEFT JOIN partnership_counts kc ON kc.koperasi_ref = pk.koperasi_ref
       WHERE COALESCE(pc.products, 0) > 0
          OR COALESCE(sc.stock_items, 0) > 0
          OR COALESCE(tc.transactions, 0) > 0
          OR COALESCE(kc.partnership_requests, 0) > 0
       ORDER BY
         COALESCE(tc.transactions, 0) DESC,
         COALESCE(kc.partnership_requests, 0) DESC,
         COALESCE(pc.products, 0) DESC
       LIMIT 10`,
    ),
  ]);
  const countByTable = new Map(tableCounts.map((row) => [row.tableName, Number(row.total ?? 0)]));
  const businessAnalystAggregate = {
    label: "MVP business analyst aggregate",
    source: "hackathon-shared-db-read-only table counts and aggregate joins",
    sourceCaveat: buildSourceCaveatFields(
      "hackathon shared DB aggregate",
      tableCounts.length > 0 ? "medium" : "limited",
      "shared-db-read-only-aggregate",
    ),
    evidenceRows: {
      regions: countByTable.get("referensi_wilayah") ?? 0,
      commodityRows: countByTable.get("referensi_komoditas_desa") ?? 0,
      cooperativeProfiles: countByTable.get("profil_koperasi") ?? 0,
      productRows: countByTable.get("produk_koperasi") ?? 0,
      inventoryRows: countByTable.get("inventaris_produk") ?? 0,
      transactionRows: countByTable.get("transaksi_penjualan") ?? 0,
      partnershipRows: countByTable.get("pengajuan_kemitraan") ?? 0,
      financingRows: countByTable.get("pengajuan_pembiayaan") ?? 0,
    },
    decisionModules: [
      {
        id: "opportunity-score",
        sourceTables: ["referensi_wilayah", "referensi_komoditas_desa", "referensi_koperasi_wilayah"],
        nextAction: "Rank aggregate areas, then verify village and commodity details before action.",
      },
      {
        id: "buyer-matching-lite",
        sourceTables: ["produk_koperasi", "inventaris_produk", "transaksi_penjualan", "pengajuan_kemitraan"],
        nextAction: "Use buyer archetypes only until named buyer/offtaker records are verified.",
      },
      {
        id: "financing-readiness",
        sourceTables: ["pengajuan_pembiayaan"],
        nextAction: "Build committee packet from aggregate readiness; no automatic approval.",
      },
    ],
    caveat:
      "This is aggregate analyst context for prioritization. It does not expose row-level PII and is not a production SIMKOPDES KPI.",
  };

  return {
    source: "hackathon-shared-db-read-only",
    mode: "aggregate-only-no-pii",
    tablePrefix: HACKATHON_TABLE_PREFIX,
    schemaScope: HACKATHON_SCHEMA_SCOPE,
    mvpFlow: [
      "Peta Potensi Desa",
      "Opportunity Score",
      "Buyer Matching Lite",
      "Aggregation/Stock Readiness",
      "Financing Readiness",
      "Laporan Aksi",
    ],
    tableCounts,
    coverage: coverage[0] ?? null,
    provinceOpportunities,
    headlineEvidence: HEADLINE_EVIDENCE,
    cooperativeCandidates: cooperativeCandidates.map((candidate, index) => ({
      cooperativeRef: pseudonymousCooperativeRef(candidate.cooperativeRef, index),
      cooperativeName: null,
      province: candidate.province,
      regency: candidate.regency,
      village: candidate.village ? "redacted-village" : null,
      products: candidate.products,
      stockItems: candidate.stockItems,
      stockTotal: candidate.stockTotal,
      transactions: candidate.transactions,
      partnershipRequests: candidate.partnershipRequests,
      privacyScope: "pseudonymous-profile-no-real-name",
    })),
    businessAnalystAggregate,
    dataQualityFlags: [
      "shared DB adalah representasi terbatas/sample eksplorasi, bukan referensi utama SIMKOPDES",
      "volume dan luas_area perlu parsing unit karena bertipe text",
      "nilai_potensi_desa dan stok perlu outlier guard sebelum ranking",
      "shared DB dipakai sebagai source read-only sampai privilege table-prefix dibuka",
      "data personal anggota/pengurus/pelanggan tidak diekspos di endpoint MVP",
    ],
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  if (!isHackathonSharedDbConfigured()) return hackathonDbRequiredResponse();

  try {
    return Response.json(await getSharedMvpSummary());
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

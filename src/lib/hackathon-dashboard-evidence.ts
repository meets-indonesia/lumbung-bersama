import { buildSourceCaveatFields } from "@/lib/commodity-intelligence";
import {
  HACKATHON_SCHEMA_SCOPE,
  HACKATHON_TABLE_PREFIX,
  isHackathonSharedDbConfigured,
  queryHackathonRows,
} from "@/lib/hackathon-shared-db";

type HackathonDashboardStatus = "auth-required" | "setup-required" | "ready" | "query-error";

type ColumnRow = {
  columnName: string;
};

type ProductAggregateRow = {
  productCategory: string;
  rows: number;
  cooperatives: number;
  inventoryRows: number;
  stockTotal: string;
  genericLabels: number;
};

type AreaAggregateRow = {
  province: string;
  regencies: number;
  districts: number;
  villages: number;
  commodityRows: number;
  commodities: number;
  cooperatives: number;
  potentialValue: string;
};

type FinancingAggregateRow = {
  status: string;
  channel: string;
  requests: number;
  amount: string;
};

type TransactionAggregateRow = {
  status: string;
  channel: string;
  transactions: number;
  amount: string;
  cooperatives: number;
};

const EMPTY_TABLES = {
  productRows: [] as Array<ProductAggregateRow & SourceFields>,
  areaRows: [] as Array<AreaAggregateRow & SourceFields>,
  financingRows: [] as Array<FinancingAggregateRow & SourceFields>,
  transactionRows: [] as Array<TransactionAggregateRow & SourceFields>,
};

const PRODUCT_SOURCE = "produk_koperasi + inventaris_produk aggregate";
const AREA_SOURCE = "referensi_wilayah + referensi_komoditas_desa + referensi_koperasi_wilayah aggregate";
const FINANCING_SOURCE = "pengajuan_pembiayaan aggregate";
const TRANSACTION_SOURCE = "transaksi_penjualan aggregate";

type SourceFields = {
  source: string;
  caveat: string;
};

type AggregateGroupStatus = {
  id: "products" | "areas" | "financing" | "transactions";
  label: string;
  status: "ready" | "query-error";
  rows: number;
  errorCode?: string;
};

function withSource<T extends object>(rows: T[], source: string, caveat: string): Array<T & SourceFields> {
  return rows.map((row) => ({
    ...row,
    source,
    caveat,
  }));
}

function emptyEvidence(
  status: HackathonDashboardStatus,
  authState: "auth-required" | "authenticated",
  extra?: { errorCode?: string },
) {
  return {
    status,
    authState,
    source: "hackathon-shared-db-read-only",
    mode: "aggregate-only-no-pii-dashboard",
    tablePrefix: HACKATHON_TABLE_PREFIX,
    schemaScope: HACKATHON_SCHEMA_SCOPE,
    generatedAt: new Date().toISOString(),
    sourceCaveat: buildSourceCaveatFields("hackathon shared DB dashboard aggregate", "limited", "shared-db-read-only-aggregate"),
    setup: {
      required: status === "setup-required",
      message:
        status === "setup-required"
          ? "Shared DB hackathon belum dikonfigurasi untuk dashboard ini."
          : "Shared DB hackathon tidak menghalangi dashboard utama.",
    },
    error:
      status === "query-error"
        ? {
            code: extra?.errorCode ?? "QUERY_FAILED",
            message:
              "Hackathon shared DB aggregate query failed. Check DB availability, schema/table access, and read-only privileges.",
          }
        : null,
    detectedColumns: {
      financing: null,
      transactions: null,
    },
    tables: EMPTY_TABLES,
    guardrails: [
      "Dashboard shared-DB evidence is aggregate-only and authenticated.",
      "No NIK, phone, email, addresses, member/customer names, document paths, photos, or named buyers are selected or returned.",
      "Product labels are broad categories, not raw product names or buyer/offtaker claims.",
      "Shared DB sample evidence is not a production SIMKOPDES KPI.",
    ],
  };
}

function queryErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code?: unknown }).code ?? "QUERY_FAILED");
  }
  if (error instanceof Error && error.message === "HACKATHON_SHARED_DB_READ_ONLY") {
    return "HACKATHON_SHARED_DB_READ_ONLY";
  }
  return "QUERY_FAILED";
}

async function safeAggregate<T>(loader: () => Promise<T>, fallback: T) {
  try {
    return { value: await loader(), errorCode: null };
  } catch (error) {
    return { value: fallback, errorCode: queryErrorCode(error) };
  }
}

function quoteIdentifier(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("INVALID_HACKATHON_COLUMN_IDENTIFIER");
  }
  return `"${identifier}"`;
}

function sqlTextLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'::text`;
}

function pickColumn(columns: Set<string>, candidates: string[]) {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

function textExpression(column: string | null, fallback: string) {
  return column ? `${quoteIdentifier(column)}::text` : sqlTextLiteral(fallback);
}

function amountExpression(column: string | null) {
  if (!column) return "0::numeric";
  const expression = quoteIdentifier(column);
  return `COALESCE(NULLIF(REGEXP_REPLACE(${expression}::text, '[^0-9-]', '', 'g'), '')::numeric, 0)`;
}

async function listColumns(tableName: string) {
  const rows = await queryHackathonRows<ColumnRow>(
    `SELECT column_name AS "columnName"
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1`,
    [tableName],
  );
  return new Set(rows.map((row) => row.columnName));
}

async function getProductRows() {
  return queryHackathonRows<ProductAggregateRow>(
    `WITH product_union AS (
       SELECT koperasi_ref,
              NULLIF(BTRIM(nama_produk::text), '') AS product_name,
              NULL::numeric AS stock
       FROM produk_koperasi
       UNION ALL
       SELECT koperasi_ref,
              NULLIF(BTRIM(nama_produk::text), '') AS product_name,
              GREATEST(COALESCE(stok, 0), 0)::numeric AS stock
       FROM inventaris_produk
     ),
     categorized AS (
       SELECT
         CASE
           WHEN LOWER(product_name) ~ '(beras|padi|gabah|rice)' THEN 'Beras, padi, dan pangan pokok'
           WHEN LOWER(product_name) ~ '(minyak|gula|sembako|mie|indomie)' THEN 'Ritel sembako dan gerai'
           WHEN LOWER(product_name) ~ '(pupuk|urea|npk|phonska|benih|bibit)' THEN 'Input produksi pertanian'
           WHEN LOWER(product_name) ~ '(ayam|sapi|ikan|telur|daging|susu|fresh|frozen)' THEN 'Protein dan produk segar'
           WHEN LOWER(product_name) ~ '(kopi|kakao|kelapa|sawit|kopra|karet)' THEN 'Komoditas perkebunan'
           ELSE 'Lainnya / perlu klasifikasi'
         END AS "productCategory",
         koperasi_ref,
         product_name,
         stock
       FROM product_union
       WHERE product_name IS NOT NULL
     )
     SELECT "productCategory",
            COUNT(*)::int AS rows,
            COUNT(DISTINCT koperasi_ref)::int AS cooperatives,
            COUNT(*) FILTER (WHERE stock IS NOT NULL)::int AS "inventoryRows",
            COALESCE(SUM(stock), 0)::text AS "stockTotal",
            COUNT(*) FILTER (WHERE LOWER(product_name) ~ '(barang lainnya|barang lain|lainnya|other)')::int AS "genericLabels"
     FROM categorized
     GROUP BY "productCategory"
     ORDER BY rows DESC, cooperatives DESC
     LIMIT 8`,
  );
}

async function getAreaRows() {
  return queryHackathonRows<AreaAggregateRow>(
    `WITH commodity_area AS (
       SELECT kode_wilayah,
              COUNT(*)::int AS commodity_rows,
              COUNT(DISTINCT komoditas_ref)::int AS commodities,
              COALESCE(SUM(nilai_potensi_desa), 0)::numeric AS potential_value
       FROM referensi_komoditas_desa
       GROUP BY kode_wilayah
     ),
     cooperative_area AS (
       SELECT kode_wilayah,
              COUNT(DISTINCT koperasi_ref)::int AS cooperatives
       FROM referensi_koperasi_wilayah
       GROUP BY kode_wilayah
     )
     SELECT COALESCE(NULLIF(BTRIM(rw.provinsi::text), ''), 'Unknown') AS province,
            COUNT(DISTINCT rw.kab_kota)::int AS regencies,
            COUNT(DISTINCT rw.kecamatan)::int AS districts,
            COUNT(DISTINCT rw.kode_wilayah)::int AS villages,
            COALESCE(SUM(ca.commodity_rows), 0)::int AS "commodityRows",
            COALESCE(SUM(ca.commodities), 0)::int AS commodities,
            COALESCE(SUM(coa.cooperatives), 0)::int AS cooperatives,
            COALESCE(SUM(ca.potential_value), 0)::text AS "potentialValue"
     FROM referensi_wilayah rw
     LEFT JOIN commodity_area ca ON ca.kode_wilayah = rw.kode_wilayah
     LEFT JOIN cooperative_area coa ON coa.kode_wilayah = rw.kode_wilayah
     GROUP BY 1
     ORDER BY COALESCE(SUM(ca.commodity_rows), 0) DESC, COALESCE(SUM(coa.cooperatives), 0) DESC
     LIMIT 8`,
  );
}

async function getFinancingRows() {
  const columns = await listColumns("pengajuan_pembiayaan");
  const statusColumn = pickColumn(columns, ["status_permohonan", "status_pengajuan", "status_pembiayaan", "status"]);
  const channelColumn = pickColumn(columns, [
    "tujuan_pembiayaan",
    "tujuan_permohonan",
    "jenis_pembiayaan",
    "skema_pembiayaan",
    "program_pembiayaan",
    "lembaga_pembiayaan",
    "sumber_pembiayaan",
    "purpose",
    "tujuan",
  ]);
  const amountColumn = pickColumn(columns, [
    "jumlah_pembiayaan",
    "nominal_pembiayaan",
    "nilai_pembiayaan",
    "nilai_pengajuan",
    "nominal_pengajuan",
    "total_pembiayaan",
    "jumlah",
    "nominal",
    "amount",
  ]);
  const statusExpr = textExpression(statusColumn, "Unknown");
  const channelExpr = textExpression(channelColumn, "Unclassified");
  const amountExpr = amountExpression(amountColumn);

  const rows = await queryHackathonRows<FinancingAggregateRow>(
    `SELECT COALESCE(NULLIF(BTRIM(${statusExpr}), ''), 'Unknown') AS status,
            COALESCE(NULLIF(BTRIM(${channelExpr}), ''), 'Unclassified') AS channel,
            COUNT(*)::int AS requests,
            COALESCE(SUM(${amountExpr}), 0)::text AS amount
     FROM pengajuan_pembiayaan
     GROUP BY 1, 2
     ORDER BY COUNT(*) DESC, COALESCE(SUM(${amountExpr}), 0) DESC
     LIMIT 10`,
  );

  return {
    rows,
    detectedColumns: {
      status: statusColumn,
      channel: channelColumn,
      amount: amountColumn,
    },
  };
}

async function getTransactionRows() {
  const columns = await listColumns("transaksi_penjualan");
  const statusColumn = pickColumn(columns, [
    "status_pembayaran",
    "status_transaksi",
    "status_penjualan",
    "payment_status",
    "status",
  ]);
  const channelColumn = pickColumn(columns, [
    "metode_pembayaran",
    "payment_method",
    "kanal_pembayaran",
    "channel",
    "kanal",
    "metode",
  ]);
  const amountColumn = pickColumn(columns, [
    "total_pembayaran",
    "total_payment",
    "total_penjualan",
    "nilai_transaksi",
    "jumlah_pembayaran",
    "jumlah",
    "nominal",
    "amount",
    "total",
  ]);
  const cooperativeColumn = columns.has("koperasi_ref") ? "koperasi_ref" : null;
  const statusExpr = textExpression(statusColumn, "Unknown");
  const channelExpr = textExpression(channelColumn, "Unclassified");
  const amountExpr = amountExpression(amountColumn);
  const cooperativeExpr = cooperativeColumn ? quoteIdentifier(cooperativeColumn) : "NULL::text";

  const rows = await queryHackathonRows<TransactionAggregateRow>(
    `SELECT COALESCE(NULLIF(BTRIM(${statusExpr}), ''), 'Unknown') AS status,
            COALESCE(NULLIF(BTRIM(${channelExpr}), ''), 'Unclassified') AS channel,
            COUNT(*)::int AS transactions,
            COALESCE(SUM(${amountExpr}), 0)::text AS amount,
            COUNT(DISTINCT ${cooperativeExpr})::int AS cooperatives
     FROM transaksi_penjualan
     GROUP BY 1, 2
     ORDER BY COUNT(*) DESC, COALESCE(SUM(${amountExpr}), 0) DESC
     LIMIT 10`,
  );

  return {
    rows,
    detectedColumns: {
      status: statusColumn,
      channel: channelColumn,
      amount: amountColumn,
      cooperative: cooperativeColumn,
    },
  };
}

export async function getHackathonDashboardEvidence(authenticated: boolean) {
  if (!authenticated) return emptyEvidence("auth-required", "auth-required");
  if (!isHackathonSharedDbConfigured()) return emptyEvidence("setup-required", "authenticated");

  try {
    const [productResult, areaResult, financingResult, transactionResult] = await Promise.all([
      safeAggregate(getProductRows, [] as ProductAggregateRow[]),
      safeAggregate(getAreaRows, [] as AreaAggregateRow[]),
      safeAggregate(getFinancingRows, {
        rows: [] as FinancingAggregateRow[],
        detectedColumns: { status: null, channel: null, amount: null },
      }),
      safeAggregate(getTransactionRows, {
        rows: [] as TransactionAggregateRow[],
        detectedColumns: { status: null, channel: null, amount: null, cooperative: null },
      }),
    ]);
    const productRows = productResult.value;
    const areaRows = areaResult.value;
    const aggregateGroups: AggregateGroupStatus[] = [
      {
        id: "products",
        label: PRODUCT_SOURCE,
        status: productResult.errorCode ? "query-error" : "ready",
        rows: productRows.length,
        errorCode: productResult.errorCode ?? undefined,
      },
      {
        id: "areas",
        label: AREA_SOURCE,
        status: areaResult.errorCode ? "query-error" : "ready",
        rows: areaRows.length,
        errorCode: areaResult.errorCode ?? undefined,
      },
      {
        id: "financing",
        label: FINANCING_SOURCE,
        status: financingResult.errorCode ? "query-error" : "ready",
        rows: financingResult.value.rows.length,
        errorCode: financingResult.errorCode ?? undefined,
      },
      {
        id: "transactions",
        label: TRANSACTION_SOURCE,
        status: transactionResult.errorCode ? "query-error" : "ready",
        rows: transactionResult.value.rows.length,
        errorCode: transactionResult.errorCode ?? undefined,
      },
    ];
    const failedGroups = aggregateGroups.filter((group) => group.status === "query-error");
    const totalAggregateRows = aggregateGroups.reduce((total, group) => total + group.rows, 0);
    const status = failedGroups.length ? "query-error" : "ready";
    const uniqueErrorCodes = Array.from(new Set(failedGroups.map((group) => group.errorCode).filter(Boolean)));

    return {
      status,
      authState: "authenticated" as const,
      source: "hackathon-shared-db-read-only",
      mode: "aggregate-only-no-pii-dashboard",
      tablePrefix: HACKATHON_TABLE_PREFIX,
      schemaScope: HACKATHON_SCHEMA_SCOPE,
      generatedAt: new Date().toISOString(),
      sourceCaveat: buildSourceCaveatFields(
        "hackathon shared DB dashboard aggregate",
        totalAggregateRows ? "medium" : "limited",
        "shared-db-read-only-aggregate",
      ),
      setup: {
        required: false,
        message: failedGroups.length
          ? `Shared DB hackathon terhubung, tetapi ${failedGroups.length}/${aggregateGroups.length} aggregate group gagal. Payload tetap menampilkan group yang berhasil.`
          : totalAggregateRows
            ? "Shared DB hackathon dikonfigurasi dan dibaca sebagai aggregate read-only."
            : "Shared DB hackathon terhubung, tetapi aggregate query belum mengembalikan rows. Perlakukan sebagai gap verifikasi data.",
      },
      error: failedGroups.length
        ? {
            code: uniqueErrorCodes.join(",") || "QUERY_FAILED",
            message:
              "Sebagian aggregate shared DB gagal. Dashboard tetap menampilkan evidence group yang berhasil dan tidak memilih PII/raw records.",
          }
        : null,
      detectedColumns: {
        financing: financingResult.value.detectedColumns,
        transactions: transactionResult.value.detectedColumns,
      },
      evidenceSummary: {
        totalAggregateRows,
        aggregateGroups,
      },
      tables: {
        productRows: withSource(
          productRows,
          PRODUCT_SOURCE,
          "Raw product names are grouped into broad categories; this is not a named buyer/offtaker claim.",
        ),
        areaRows: withSource(
          areaRows,
          AREA_SOURCE,
          "Province-level aggregate only; no member, customer, or address-level records are returned.",
        ),
        financingRows: withSource(
          financingResult.value.rows,
          FINANCING_SOURCE,
          "Readiness aggregate only; not an approval, disbursement, credit score, or borrower identity.",
        ),
        transactionRows: withSource(
          transactionResult.value.rows,
          TRANSACTION_SOURCE,
          "Historical/sample transaction aggregate only; not live demand, named buyer data, or guaranteed offtake.",
        ),
      },
      guardrails: [
        "Dashboard shared-DB evidence is aggregate-only and authenticated.",
        "No NIK, phone, email, addresses, member/customer names, document paths, photos, or named buyers are selected or returned.",
        "Product labels are broad categories, not raw product names or buyer/offtaker claims.",
        "Shared DB sample evidence is not a production SIMKOPDES KPI.",
      ],
    };
  } catch (error) {
    return emptyEvidence("query-error", "authenticated", { errorCode: queryErrorCode(error) });
  }
}

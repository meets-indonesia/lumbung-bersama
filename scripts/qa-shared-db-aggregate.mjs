import { Pool } from "pg";
import { loadLocalEnv } from "./load-local-env.mjs";

const TABLES = [
  "produk_koperasi",
  "inventaris_produk",
  "referensi_wilayah",
  "referensi_komoditas_desa",
  "referensi_koperasi_wilayah",
  "pengajuan_pembiayaan",
  "transaksi_penjualan",
];

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function sharedDatabaseUrl() {
  if (process.env.HACKATHON_SHARED_DATABASE_URL) return process.env.HACKATHON_SHARED_DATABASE_URL;
  if (!process.env.DB_HOST || !process.env.DB_DATABASE || !process.env.DB_USERNAME || !process.env.DB_PASSWORD) {
    return "";
  }

  const port = process.env.DB_PORT ?? "5432";
  const user = encodeURIComponent(process.env.DB_USERNAME);
  const password = encodeURIComponent(process.env.DB_PASSWORD);
  const database = encodeURIComponent(process.env.DB_DATABASE);
  return `postgresql://${user}:${password}@${process.env.DB_HOST}:${port}/${database}`;
}

function errorCode(error) {
  if (typeof error === "object" && error && "code" in error) return String(error.code);
  return "QUERY_FAILED";
}

async function safeQuery(client, id, sql, params = []) {
  try {
    const result = await client.query(sql, params);
    return { id, status: "ready", rows: result.rows };
  } catch (error) {
    return { id, status: "query-error", errorCode: errorCode(error), rows: [] };
  }
}

async function run() {
  const loadedEnv = await loadLocalEnv(process.cwd());
  const connectionString = sharedDatabaseUrl();
  if (!connectionString) {
    const payload = {
      status: "setup-required",
      error: "EVIDENCE_SOURCE_REQUIRED",
      mode: "aggregate-only-no-pii",
      loadedEnv,
      requiredAnyOf: [
        ["HACKATHON_SHARED_DATABASE_URL"],
        ["DB_HOST", "DB_DATABASE", "DB_USERNAME", "DB_PASSWORD"],
      ],
      guardrails: [
        "No connection string or credential is printed.",
        "No member, customer, buyer name, NIK, phone, email, address, document, or media field is selected.",
      ],
    };
    console.log(JSON.stringify(payload, null, 2));
    if (process.env.QA_EXPECT_SHARED_DB_READY === "1") {
      process.exitCode = 1;
    }
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl:
      (process.env.HACKATHON_SHARED_DB_SSL ?? process.env.PGSSLMODE) === "require"
        ? { rejectUnauthorized: false }
        : undefined,
    max: 1,
    connectionTimeoutMillis: Number(process.env.HACKATHON_SHARED_DB_CONNECT_TIMEOUT_MS ?? 8000),
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query(
      `SET LOCAL statement_timeout = ${Number(process.env.HACKATHON_SHARED_DB_STATEMENT_TIMEOUT_MS ?? 8000)}`,
    );

    const tableCounts = [];
    for (const table of TABLES) {
      const result = await safeQuery(client, table, `SELECT COUNT(*)::int AS rows FROM ${quoteIdentifier(table)}`);
      tableCounts.push({
        table,
        status: result.status,
        rows: result.rows[0]?.rows ?? 0,
        ...(result.errorCode ? { errorCode: result.errorCode } : {}),
      });
    }

    const productCategories = await safeQuery(
      client,
      "productCategories",
      `WITH product_union AS (
         SELECT NULLIF(BTRIM(nama_produk::text), '') AS product_name
         FROM produk_koperasi
         UNION ALL
         SELECT NULLIF(BTRIM(nama_produk::text), '') AS product_name
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
           END AS category
         FROM product_union
         WHERE product_name IS NOT NULL
       )
       SELECT category, COUNT(*)::int AS rows
       FROM categorized
       GROUP BY category
       ORDER BY rows DESC
       LIMIT 8`,
    );

    const provinceCoverage = await safeQuery(
      client,
      "provinceCoverage",
      `SELECT COUNT(DISTINCT provinsi)::int AS provinces,
              COUNT(DISTINCT kab_kota)::int AS regencies,
              COUNT(DISTINCT kecamatan)::int AS districts,
              COUNT(DISTINCT kode_wilayah)::int AS villages
       FROM referensi_wilayah`,
    );

    await client.query("COMMIT");

    const payload = {
      status: tableCounts.some((item) => item.status === "ready" && item.rows > 0) ? "ready" : "empty-or-error",
      mode: "aggregate-only-no-pii",
      loadedEnv,
      tablePrefix: process.env.HACKATHON_TABLE_PREFIX ?? process.env.DB_TABLE_PREFIX ?? "anak_sarengklek_",
      tableCounts,
      productCategories: {
        status: productCategories.status,
        rows: productCategories.rows,
        ...(productCategories.errorCode ? { errorCode: productCategories.errorCode } : {}),
      },
      provinceCoverage: {
        status: provinceCoverage.status,
        coverage: provinceCoverage.rows[0] ?? null,
        ...(provinceCoverage.errorCode ? { errorCode: provinceCoverage.errorCode } : {}),
      },
      guardrails: [
        "No connection string or credential is printed.",
        "No member, customer, buyer name, NIK, phone, email, address, document, or media field is selected.",
        "Product names are grouped into broad categories before output.",
      ],
    };

    console.log(JSON.stringify(payload, null, 2));
    if (process.env.QA_EXPECT_SHARED_DB_READY === "1" && payload.status !== "ready") {
      process.exitCode = 1;
    }
    if (process.env.QA_EXPECT_SHARED_DB_ROWS === "1" && !tableCounts.some((item) => item.rows > 0)) {
      process.exitCode = 1;
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await run();

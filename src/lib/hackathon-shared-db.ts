import { Pool, type QueryResultRow } from "pg";

type GlobalWithHackathonPg = typeof globalThis & {
  lumbungHackathonPgPool?: Pool;
};

const globalWithHackathonPg = globalThis as GlobalWithHackathonPg;

export const HACKATHON_TABLE_PREFIX =
  process.env.HACKATHON_TABLE_PREFIX ?? process.env.DB_TABLE_PREFIX ?? "anak_sarengklek_";

export const HACKATHON_SCHEMA_SCOPE = {
  label: "Sample eksplorasi SIMKOPDES terbatas",
  notPrimaryReference: true,
  description:
    "Skema dan sample data shared DB dipakai untuk eksplorasi pola, masalah, dan ide inovasi MVP. Payload ini bukan referensi utama SIMKOPDES dan tidak menjadi klaim data operasional resmi.",
} as const;

function getSharedDatabaseUrl() {
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

export function isHackathonSharedDbConfigured() {
  return Boolean(getSharedDatabaseUrl());
}

export function getHackathonSharedPool() {
  const connectionString = getSharedDatabaseUrl();
  if (!connectionString) return null;

  if (!globalWithHackathonPg.lumbungHackathonPgPool) {
    globalWithHackathonPg.lumbungHackathonPgPool = new Pool({
      connectionString,
      ssl:
        (process.env.HACKATHON_SHARED_DB_SSL ?? process.env.PGSSLMODE) === "require"
          ? { rejectUnauthorized: false }
          : undefined,
      max: Number(process.env.HACKATHON_SHARED_DB_POOL_MAX ?? 2),
      connectionTimeoutMillis: Number(process.env.HACKATHON_SHARED_DB_CONNECT_TIMEOUT_MS ?? 5000),
    });
  }

  return globalWithHackathonPg.lumbungHackathonPgPool;
}

function assertReadOnlySql(sql: string) {
  const normalized = sql.trim().toLowerCase();
  if (!normalized.startsWith("select") && !normalized.startsWith("with")) {
    throw new Error("HACKATHON_SHARED_DB_READ_ONLY");
  }
}

export async function queryHackathonRows<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
) {
  assertReadOnlySql(sql);

  const pool = getHackathonSharedPool();
  if (!pool) {
    throw new Error("HACKATHON_SHARED_DATABASE_URL_REQUIRED");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query(
      `SET LOCAL statement_timeout = ${Number(process.env.HACKATHON_SHARED_DB_STATEMENT_TIMEOUT_MS ?? 8000)}`,
    );
    const result = await client.query<T>(sql, params);
    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function queryHackathonOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
) {
  const rows = await queryHackathonRows<T>(sql, params);
  return rows[0] ?? null;
}

export function hackathonDbRequiredResponse() {
  return Response.json(
    {
      error: "HACKATHON_SHARED_DATABASE_URL_REQUIRED",
      message:
        "Shared DB hackathon belum dikonfigurasi. Isi HACKATHON_SHARED_DATABASE_URL atau DB_HOST/DB_DATABASE/DB_USERNAME/DB_PASSWORD secara lokal.",
      tablePrefix: HACKATHON_TABLE_PREFIX,
    },
    { status: 503 },
  );
}

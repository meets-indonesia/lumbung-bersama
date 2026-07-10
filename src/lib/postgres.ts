import { randomUUID } from "node:crypto";
import { Pool, type QueryResultRow } from "pg";

type GlobalWithPg = typeof globalThis & {
  lumbungPgPool?: Pool;
};

const globalWithPg = globalThis as GlobalWithPg;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!process.env.DATABASE_URL) return null;

  if (!globalWithPg.lumbungPgPool) {
    globalWithPg.lumbungPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DATABASE_POOL_MAX ?? process.env.POSTGRES_POOL_MAX ?? 5),
    });
  }

  return globalWithPg.lumbungPgPool;
}

export async function queryRows<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
) {
  const pool = getPool();
  if (!pool) {
    throw new Error("DATABASE_URL_REQUIRED");
  }

  const result = await pool.query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
) {
  const rows = await queryRows<T>(sql, params);
  return rows[0] ?? null;
}

export function newId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function dbRequiredResponse() {
  return Response.json(
    {
      error: "DATABASE_URL_REQUIRED",
      message:
        "Data operasional aplikasi belum dikonfigurasi. Aktifkan koneksi data, lalu jalankan setup schema dan seed.",
    },
    { status: 503 },
  );
}

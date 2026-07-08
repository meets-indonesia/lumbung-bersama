import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Cleanup inherited commodity profiles dibatalkan.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
  max: 2,
});

try {
  const result = await pool.query(
    "DELETE FROM regional_commodity_profiles WHERE source_level = 'inherited-province-baseline'",
  );
  console.log(`Inherited commodity profiles removed: ${result.rowCount ?? 0}`);
} finally {
  await pool.end();
}

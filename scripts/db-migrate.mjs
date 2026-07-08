import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "db", "schema.sql");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Contoh: postgresql://user:password@localhost:5432/lumbung_bersama");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
try {
  const schema = await readFile(schemaPath, "utf8");
  await client.query(schema);
  console.log("Postgres schema siap.");
} finally {
  await client.end();
}

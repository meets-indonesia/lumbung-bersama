import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = path.join(root, "db", "seed.sql");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Jalankan migrasi dan seed setelah Postgres siap.");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
try {
  const seed = await readFile(seedPath, "utf8");
  await client.query(seed);
  console.log("Data awal Postgres siap.");
} finally {
  await client.end();
}

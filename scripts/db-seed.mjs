import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadLocalEnv } from "./load-local-env.mjs";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = path.join(root, "db", "seed.sql");

await loadLocalEnv(root);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Jalankan migrasi dan seed setelah database aplikasi siap.");
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
  console.log("Data awal database aplikasi siap.");
} finally {
  await client.end();
}

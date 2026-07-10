import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadLocalEnv } from "./load-local-env.mjs";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "db", "schema.sql");

await loadLocalEnv(root);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Contoh: gunakan connection string database aplikasi.");
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
  console.log("Schema database aplikasi siap.");
} finally {
  await client.end();
}

import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const SOURCE_ID = "cahyadsn-wilayah";
const SOURCE_URL =
  process.env.WILAYAH_SOURCE_URL ??
  "https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql";
const BATCH_SIZE = Number(process.env.WILAYAH_IMPORT_BATCH_SIZE ?? 500);
const IMPORT_LIMIT = Number(process.env.WILAYAH_IMPORT_LIMIT ?? 0);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Import kode wilayah nasional dibatalkan.");
  process.exit(1);
}

function decodeSqlString(value) {
  return value.replace(/''/g, "'");
}

function getLevel(code) {
  return code.split(".").length;
}

function getParentCode(code) {
  const parts = code.split(".");
  if (parts.length === 1) return null;
  return parts.slice(0, -1).join(".");
}

function getKind(code, name) {
  const level = getLevel(code);
  if (level === 1) return "provinsi";
  if (level === 2) return name.toLowerCase().startsWith("kota ") ? "kota" : "kabupaten";
  if (level === 3) return "kecamatan";
  const last = code.split(".").at(-1) ?? "";
  if (last.startsWith("1")) return "kelurahan";
  if (last.startsWith("2")) return "desa";
  return "desa-kelurahan";
}

function parseSourceVersion(sql) {
  const versionMatch = sql.match(/Kepmendagri\s+No\.?\s*([0-9.\-]+)\s*Tahun\s*(\d{4})/i);
  if (!versionMatch) return "Kepmendagri 2025 via cahyadsn/wilayah";
  return `Kepmendagri No ${versionMatch[1]} Tahun ${versionMatch[2]}`;
}

function parseWilayahRows(sql) {
  const rows = [];
  const tuplePattern = /\('([^']*(?:''[^']*)*)','([^']*(?:''[^']*)*)'\)/g;
  let match;

  while ((match = tuplePattern.exec(sql)) !== null) {
    const code = decodeSqlString(match[1]);
    const name = decodeSqlString(match[2]);
    const level = getLevel(code);
    if (level < 1 || level > 4) continue;

    rows.push({
      code,
      name,
      level,
      kind: getKind(code, name),
      parentCode: getParentCode(code),
    });

    if (IMPORT_LIMIT > 0 && rows.length >= IMPORT_LIMIT) break;
  }

  return rows;
}

async function upsertRows(client, rows, sourceVersion) {
  let imported = 0;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const values = [];
    const placeholders = batch
      .map((row, index) => {
        const base = index * 7;
        values.push(
          row.code,
          row.name,
          row.level,
          row.kind,
          row.parentCode,
          SOURCE_ID,
          sourceVersion,
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
      })
      .join(", ");

    await client.query(
      `INSERT INTO administrative_areas
        (code, name, level, kind, parent_code, source_id, source_version)
       VALUES ${placeholders}
       ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        level = EXCLUDED.level,
        kind = EXCLUDED.kind,
        parent_code = EXCLUDED.parent_code,
        source_id = EXCLUDED.source_id,
        source_version = EXCLUDED.source_version,
        imported_at = now()`,
      values,
    );

    imported += batch.length;
    process.stdout.write(`\rImported ${imported}/${rows.length} administrative areas`);
  }

  process.stdout.write("\n");
  return imported;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
    max: 2,
  });
  const client = await pool.connect();
  const runId = `wilayah-${randomUUID().slice(0, 8)}`;

  try {
    console.log(`Mengunduh kode wilayah nasional: ${SOURCE_URL}`);
    const response = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "LumbungBersamaWilayahImporter/0.1" },
    });
    if (!response.ok) {
      throw new Error(`Download gagal: HTTP ${response.status}`);
    }

    const sql = await response.text();
    const sourceVersion = parseSourceVersion(sql);
    const rows = parseWilayahRows(sql);

    if (!rows.length) {
      throw new Error("Tidak ada baris wilayah yang bisa diparse dari sumber.");
    }

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO open_data_sources
        (id, name, category, url, license, coverage, refresh_strategy, status, notes, last_checked_at)
       VALUES
        ($1, 'Kode Wilayah Administrasi Indonesia', 'administrative-code', $2, 'MIT',
         'Provinsi, kabupaten/kota, kecamatan, desa/kelurahan nasional berdasarkan Kepmendagri 2025.',
         'Import satu kali ke database aplikasi, lalu refresh manual saat repository sumber berubah.',
         'ready-to-import',
         'Sumber terbuka paling praktis untuk coverage kode desa nasional. Bukan sumber komoditas, koperasi, atau aset ekonomi.',
         now())
       ON CONFLICT (id) DO UPDATE SET
        url = EXCLUDED.url,
        status = EXCLUDED.status,
        last_checked_at = now()`,
      [SOURCE_ID, "https://github.com/cahyadsn/wilayah"],
    );
    await client.query(
      `INSERT INTO data_import_runs
        (id, source_id, status, imported_rows, source_version, source_url, message)
       VALUES ($1, $2, 'running', 0, $3, $4, $5)`,
      [runId, SOURCE_ID, sourceVersion, SOURCE_URL, `Parsed ${rows.length} rows`],
    );

    const imported = await upsertRows(client, rows, sourceVersion);
    await client.query(
      `UPDATE data_import_runs
       SET status = 'success',
           imported_rows = $2,
           message = $3,
           finished_at = now()
       WHERE id = $1`,
      [runId, imported, `Imported ${imported} kode wilayah nasional dari ${sourceVersion}`],
    );
    await client.query("COMMIT");

    console.log(`Import selesai: ${imported} area administratif (${sourceVersion}).`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    const message = error instanceof Error ? error.message : "Import gagal.";
    await client
      .query(
        `INSERT INTO data_import_runs
          (id, source_id, status, imported_rows, source_version, source_url, message, finished_at)
         VALUES ($1, $2, 'failed', 0, 'unknown', $3, $4, now())
         ON CONFLICT (id) DO UPDATE SET status = 'failed', message = EXCLUDED.message, finished_at = now()`,
        [runId, SOURCE_ID, SOURCE_URL, message],
      )
      .catch(() => undefined);
    console.error(message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();

import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const SOURCE_ID = "national-commodity-baseline";
const SOURCE_VERSION = "baseline-v1-2026-06-28";
const SOURCE_URL = "local://lumbung-bersama/national-commodity-baseline-v1";
const BATCH_SIZE = Number(process.env.COMMODITY_IMPORT_BATCH_SIZE ?? 320);
const IMPORT_LIMIT = Number(process.env.COMMODITY_IMPORT_AREA_LIMIT ?? 0);
const INCLUDE_INHERITED =
  process.env.COMMODITY_IMPORT_INCLUDE_INHERITED === "true" || process.argv.includes("--include-inherited");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Import baseline komoditas nasional dibatalkan.");
  process.exit(1);
}

const FALLBACK_BASELINE = [
  { commodity: "Padi", sector: "tanaman-pangan" },
  { commodity: "Jagung", sector: "tanaman-pangan" },
  { commodity: "Sayuran lokal", sector: "hortikultura" },
  { commodity: "Ikan konsumsi", sector: "perikanan" },
];

const PROVINCE_BASELINES = {
  "11": [
    { commodity: "Kopi arabika", sector: "perkebunan" },
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Nilam", sector: "perkebunan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
  ],
  "12": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Jagung", sector: "tanaman-pangan" },
    { commodity: "Kopi", sector: "perkebunan" },
    { commodity: "Kelapa sawit", sector: "perkebunan" },
  ],
  "13": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Cabai", sector: "hortikultura" },
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Gambir", sector: "perkebunan" },
  ],
  "14": [
    { commodity: "Kelapa sawit", sector: "perkebunan" },
    { commodity: "Karet", sector: "perkebunan" },
    { commodity: "Kelapa", sector: "perkebunan" },
    { commodity: "Ikan air tawar", sector: "perikanan" },
  ],
  "15": [
    { commodity: "Karet", sector: "perkebunan" },
    { commodity: "Kelapa sawit", sector: "perkebunan" },
    { commodity: "Kopi", sector: "perkebunan" },
    { commodity: "Padi", sector: "tanaman-pangan" },
  ],
  "16": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Karet", sector: "perkebunan" },
    { commodity: "Kopi robusta", sector: "perkebunan" },
    { commodity: "Kelapa sawit", sector: "perkebunan" },
  ],
  "17": [
    { commodity: "Kopi robusta", sector: "perkebunan" },
    { commodity: "Karet", sector: "perkebunan" },
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Kelapa sawit", sector: "perkebunan" },
  ],
  "18": [
    { commodity: "Singkong", sector: "tanaman-pangan" },
    { commodity: "Jagung", sector: "tanaman-pangan" },
    { commodity: "Kopi robusta", sector: "perkebunan" },
    { commodity: "Padi", sector: "tanaman-pangan" },
  ],
  "19": [
    { commodity: "Lada", sector: "perkebunan" },
    { commodity: "Kelapa sawit", sector: "perkebunan" },
    { commodity: "Karet", sector: "perkebunan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
  ],
  "21": [
    { commodity: "Ikan tangkap", sector: "perikanan" },
    { commodity: "Kelapa", sector: "perkebunan" },
    { commodity: "Hortikultura pulau", sector: "hortikultura" },
    { commodity: "Rumput laut", sector: "perikanan" },
  ],
  "31": [
    { commodity: "Sayuran urban", sector: "hortikultura" },
    { commodity: "Ikan olahan", sector: "perikanan" },
    { commodity: "Beras distribusi", sector: "perdagangan-pangan" },
    { commodity: "Produk pangan UMKM", sector: "umkm-pangan" },
  ],
  "32": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Sayuran dataran tinggi", sector: "hortikultura" },
    { commodity: "Kopi", sector: "perkebunan" },
    { commodity: "Singkong", sector: "tanaman-pangan" },
  ],
  "33": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Jagung", sector: "tanaman-pangan" },
    { commodity: "Cabai", sector: "hortikultura" },
    { commodity: "Tembakau", sector: "perkebunan" },
  ],
  "34": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Salak", sector: "hortikultura" },
    { commodity: "Singkong", sector: "tanaman-pangan" },
    { commodity: "Cabai", sector: "hortikultura" },
  ],
  "35": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Jagung", sector: "tanaman-pangan" },
    { commodity: "Tebu", sector: "perkebunan" },
    { commodity: "Kopi robusta", sector: "perkebunan" },
  ],
  "36": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
    { commodity: "Kelapa", sector: "perkebunan" },
    { commodity: "Unggas", sector: "peternakan" },
  ],
  "51": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Kopi", sector: "perkebunan" },
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Hortikultura", sector: "hortikultura" },
  ],
  "52": [
    { commodity: "Jagung", sector: "tanaman-pangan" },
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Sapi", sector: "peternakan" },
    { commodity: "Rumput laut", sector: "perikanan" },
  ],
  "53": [
    { commodity: "Jagung", sector: "tanaman-pangan" },
    { commodity: "Sapi", sector: "peternakan" },
    { commodity: "Rumput laut", sector: "perikanan" },
    { commodity: "Kopi", sector: "perkebunan" },
  ],
  "61": [
    { commodity: "Kelapa sawit", sector: "perkebunan" },
    { commodity: "Karet", sector: "perkebunan" },
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Perikanan sungai", sector: "perikanan" },
  ],
  "62": [
    { commodity: "Kelapa sawit", sector: "perkebunan" },
    { commodity: "Karet", sector: "perkebunan" },
    { commodity: "Rotan", sector: "hasil-hutan-bukan-kayu" },
    { commodity: "Ikan air tawar", sector: "perikanan" },
  ],
  "63": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Karet", sector: "perkebunan" },
    { commodity: "Kelapa sawit", sector: "perkebunan" },
    { commodity: "Perikanan rawa", sector: "perikanan" },
  ],
  "64": [
    { commodity: "Kelapa sawit", sector: "perkebunan" },
    { commodity: "Lada", sector: "perkebunan" },
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Ikan sungai", sector: "perikanan" },
  ],
  "65": [
    { commodity: "Rumput laut", sector: "perikanan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
    { commodity: "Kelapa sawit", sector: "perkebunan" },
    { commodity: "Kakao", sector: "perkebunan" },
  ],
  "71": [
    { commodity: "Kelapa", sector: "perkebunan" },
    { commodity: "Cengkeh", sector: "perkebunan" },
    { commodity: "Pala", sector: "perkebunan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
  ],
  "72": [
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Kelapa", sector: "perkebunan" },
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
  ],
  "73": [
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Rumput laut", sector: "perikanan" },
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Jagung", sector: "tanaman-pangan" },
  ],
  "74": [
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Jambu mete", sector: "perkebunan" },
    { commodity: "Rumput laut", sector: "perikanan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
  ],
  "75": [
    { commodity: "Jagung", sector: "tanaman-pangan" },
    { commodity: "Kelapa", sector: "perkebunan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
    { commodity: "Sapi", sector: "peternakan" },
  ],
  "76": [
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Kelapa sawit", sector: "perkebunan" },
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
  ],
  "81": [
    { commodity: "Ikan tangkap", sector: "perikanan" },
    { commodity: "Pala", sector: "perkebunan" },
    { commodity: "Cengkeh", sector: "perkebunan" },
    { commodity: "Rumput laut", sector: "perikanan" },
  ],
  "82": [
    { commodity: "Ikan tangkap", sector: "perikanan" },
    { commodity: "Pala", sector: "perkebunan" },
    { commodity: "Kelapa", sector: "perkebunan" },
    { commodity: "Kakao", sector: "perkebunan" },
  ],
  "91": [
    { commodity: "Ikan tangkap", sector: "perikanan" },
    { commodity: "Pala", sector: "perkebunan" },
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Sagu", sector: "tanaman-pangan-lokal" },
  ],
  "92": [
    { commodity: "Ikan tangkap", sector: "perikanan" },
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Pala", sector: "perkebunan" },
    { commodity: "Kelapa", sector: "perkebunan" },
  ],
  "93": [
    { commodity: "Sagu", sector: "tanaman-pangan-lokal" },
    { commodity: "Padi", sector: "tanaman-pangan" },
    { commodity: "Ikan tangkap", sector: "perikanan" },
    { commodity: "Kelapa", sector: "perkebunan" },
  ],
  "94": [
    { commodity: "Sagu", sector: "tanaman-pangan-lokal" },
    { commodity: "Kopi", sector: "perkebunan" },
    { commodity: "Ikan air tawar", sector: "perikanan" },
    { commodity: "Hortikultura pegunungan", sector: "hortikultura" },
  ],
  "95": [
    { commodity: "Kopi arabika", sector: "perkebunan" },
    { commodity: "Ubi jalar", sector: "tanaman-pangan-lokal" },
    { commodity: "Hortikultura pegunungan", sector: "hortikultura" },
    { commodity: "Ternak lokal", sector: "peternakan" },
  ],
  "96": [
    { commodity: "Kopi", sector: "perkebunan" },
    { commodity: "Kakao", sector: "perkebunan" },
    { commodity: "Ubi jalar", sector: "tanaman-pangan-lokal" },
    { commodity: "Ikan air tawar", sector: "perikanan" },
  ],
};

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 54);
}

function baselineForProvince(code) {
  return PROVINCE_BASELINES[code] ?? FALLBACK_BASELINE;
}

function sourceLevelFor(area) {
  return area.level === 1 ? "province-baseline" : "inherited-province-baseline";
}

function basisFor(area, provinceName) {
  if (area.level === 1) {
    return `Referensi komoditas umum provinsi ${provinceName}; dipakai sebagai konteks awal sebelum data BPS/API daerah terhubung.`;
  }
  return `Legacy audit only: warisan referensi provinsi ${provinceName} untuk ${area.kind} ${area.name}; tidak boleh dipakai sebagai data produksi langsung area ini.`;
}

function notesFor(area) {
  if (area.level === 4) {
    return "Legacy audit only. Operator wajib mengganti dengan data langsung warga, koperasi, atau dataset resmi saat tersedia.";
  }
  return area.level === 1
    ? "Referensi provinsi untuk prioritas connector, bukan angka produksi final."
    : "Legacy audit only. Gunakan sumber langsung resmi/operator untuk area ini.";
}

async function ensureSources(client) {
  await client.query(
    `INSERT INTO open_data_sources
      (id, name, category, url, license, coverage, refresh_strategy, status, notes, last_checked_at)
     VALUES
      (
        $1,
        'Baseline komoditas provinsi nasional',
        'commodity-baseline',
        $2,
        'Internal source-labeled baseline; replace with official datasets when connected',
        'Referensi provinsi saja. Tidak boleh diwariskan atau diklaim sebagai produksi kabupaten/kecamatan/desa.',
        'Diulang berkala setelah connector BPS, Satu Data Indonesia, dan portal daerah tersedia.',
        'reference-only',
        'Dipakai hanya untuk konteks provinsi. Area turunannya harus memakai sumber langsung resmi, operator, atau connector daerah.',
        now()
      ),
      (
        'bps-webapi',
        'BPS Web API',
        'statistics',
        'https://webapi.bps.go.id/documentation/',
        'Official API, subject to BPS key and terms',
        'Statistik resmi nasional sesuai domain/variabel BPS yang tersedia.',
        'Env-gated connector memakai BPS_API_KEY, cache Postgres, dan mapping variabel komoditas.',
        'env-required',
        'Sumber resmi utama untuk baseline statistik setelah key dan mapping variabel tersedia.',
        now()
      ),
      (
        'data-go-id-commodity-village',
        'Portal Satu Data Indonesia - dataset komoditas desa',
        'catalog',
        'https://data.go.id/',
        'Government open data catalog, dataset-specific license',
        'Katalog dataset lintas K/L/daerah; hasil riset menemukan dataset produksi padi/jagung menurut desa pada beberapa daerah.',
        'Connector berikutnya mencari metadata, mengunduh resource resmi, lalu mengikatnya ke administrative_areas.',
        'source-discovery',
        'Tidak semua dataset daerah memakai schema atau API yang sama. Perlu loop connector per portal.',
        now()
      ),
      (
        'regional-open-data-portals',
        'Portal open data provinsi/kabupaten',
        'regional-catalog',
        'https://opendata.jabarprov.go.id/',
        'Dataset-specific license',
        'Contoh portal daerah yang menyediakan resource API/CSV untuk komoditas dan indikator wilayah.',
        'Connector per provinsi/kabupaten, dimulai dari portal yang punya API stabil dan resource CSV.',
        'source-discovery',
        'Dipakai sebagai jalur data langsung wilayah saat BPS/API nasional belum menyediakan granularitas desa.',
        now()
      ),
      (
        'open-data-jabar-imk-komoditas-pertanian',
        'Open Data Jabar - IMK Komoditas Pertanian Desa/Kelurahan',
        'regional-commodity',
        'https://opendata.jabarprov.go.id/en/dataset/jumlah-industri-mikro-dan-kecil-komoditas-pertanian-berdasarkan-desakelurahan-di-jawa-barat',
        'Dataset-specific public portal license',
        'Contoh sumber granular desa/kelurahan untuk jumlah industri mikro dan kecil komoditas pertanian di Jawa Barat.',
        'Import dari resource CSV/API portal daerah bila endpoint JabarCloud mengizinkan akses; fallback manual upload operator jika 403.',
        'manual-import-or-connector',
        'Sumber ini menjadi pola connector provinsi: data daerah disimpan sebagai direct regional source, bukan warisan provinsi.',
        now()
      ),
      (
        'gdelt-doc-api',
        'GDELT Doc API',
        'commodity-news',
        'https://www.gdeltproject.org/',
        'Open news metadata API, source-specific article copyrights apply',
        'Sinyal berita web global/Indonesia untuk komoditas dan wilayah. Bukan statistik pasokan resmi.',
        'On-demand search dengan cache UI/API; batasi frekuensi karena endpoint rate-limited.',
        'ready-on-demand',
        'Dipakai untuk konteks berita komoditas daerah di panel peta. Semua artikel ditampilkan dengan link sumber.',
        now()
      )
     ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      url = EXCLUDED.url,
      license = EXCLUDED.license,
      coverage = EXCLUDED.coverage,
      refresh_strategy = EXCLUDED.refresh_strategy,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      last_checked_at = now()`,
    [SOURCE_ID, SOURCE_URL],
  );
}

async function loadAreas(client) {
  const result = await client.query(
    `SELECT area.code, area.name, area.level, area.kind,
            province.code AS province_code,
            province.name AS province_name
     FROM administrative_areas area
     JOIN administrative_areas province
       ON province.code = split_part(area.code, '.', 1)
      AND province.level = 1
     WHERE ${INCLUDE_INHERITED ? "TRUE" : "area.level = 1"}
     ORDER BY area.code ASC
     ${IMPORT_LIMIT > 0 ? "LIMIT $1" : ""}`,
    IMPORT_LIMIT > 0 ? [IMPORT_LIMIT] : [],
  );
  return result.rows;
}

async function upsertProfiles(client, areas) {
  let imported = 0;

  for (let offset = 0; offset < areas.length; offset += BATCH_SIZE) {
    const batchAreas = areas.slice(offset, offset + BATCH_SIZE);
    const profiles = batchAreas.flatMap((area) =>
      baselineForProvince(area.province_code).map((item, commodityIndex) => ({
        id: `commodity-${area.code.replaceAll(".", "-")}-${slugify(item.commodity)}`,
        areaCode: area.code,
        areaLevel: area.level,
        areaName: area.name,
        provinceCode: area.province_code,
        provinceName: area.province_name,
        commodity: item.commodity,
        sector: item.sector,
        rank: commodityIndex + 1,
        sourceLevel: sourceLevelFor(area),
        confidence: area.level === 1 ? "baseline-provinsi" : "warisan-provinsi-perlu-verifikasi",
        basis: basisFor(area, area.province_name),
        notes: notesFor(area),
      })),
    );

    const values = [];
    const placeholders = profiles
      .map((profile, index) => {
        const base = index * 14;
        values.push(
          profile.id,
          profile.areaCode,
          profile.areaLevel,
          profile.areaName,
          profile.provinceCode,
          profile.provinceName,
          profile.commodity,
          profile.sector,
          profile.rank,
          SOURCE_ID,
          profile.sourceLevel,
          profile.confidence,
          profile.basis,
          profile.notes,
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14})`;
      })
      .join(", ");

    await client.query(
      `INSERT INTO regional_commodity_profiles
        (id, area_code, area_level, area_name, province_code, province_name,
         commodity, sector, rank, source_id, source_level, confidence, basis, notes)
       VALUES ${placeholders}
       ON CONFLICT (id) DO UPDATE SET
        area_level = EXCLUDED.area_level,
        area_name = EXCLUDED.area_name,
        province_code = EXCLUDED.province_code,
        province_name = EXCLUDED.province_name,
        commodity = EXCLUDED.commodity,
        sector = EXCLUDED.sector,
        rank = EXCLUDED.rank,
        source_id = EXCLUDED.source_id,
        source_level = EXCLUDED.source_level,
        confidence = EXCLUDED.confidence,
        basis = EXCLUDED.basis,
        notes = EXCLUDED.notes,
        updated_at = now()`,
      values,
    );

    imported += profiles.length;
    process.stdout.write(`\rImported ${imported} commodity profiles for ${Math.min(offset + batchAreas.length, areas.length)}/${areas.length} areas`);
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
  const runId = `commodity-${randomUUID().slice(0, 8)}`;

  try {
    await client.query("BEGIN");
    await ensureSources(client);
    const areas = await loadAreas(client);

    if (!areas.length) {
      throw new Error("administrative_areas kosong. Jalankan npm run data:import-wilayah terlebih dahulu.");
    }

    await client.query(
      `INSERT INTO data_import_runs
        (id, source_id, status, imported_rows, source_version, source_url, message)
       VALUES ($1, $2, 'running', 0, $3, $4, $5)`,
      [runId, SOURCE_ID, SOURCE_VERSION, SOURCE_URL, `Preparing baseline for ${areas.length} administrative areas`],
    );

    const imported = await upsertProfiles(client, areas);
    await client.query(
      `UPDATE data_import_runs
       SET status = 'success',
           imported_rows = $2,
           message = $3,
           finished_at = now()
       WHERE id = $1`,
      [
        runId,
        imported,
        `Imported ${imported} source-labeled commodity profiles across ${areas.length} administrative areas`,
      ],
    );
    await client.query("COMMIT");
    console.log(`Import baseline komoditas selesai: ${imported} profile.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    const message = error instanceof Error ? error.message : "Import baseline komoditas gagal.";
    await client
      .query(
        `INSERT INTO data_import_runs
          (id, source_id, status, imported_rows, source_version, source_url, message, finished_at)
         VALUES ($1, $2, 'failed', 0, $3, $4, $5, now())
         ON CONFLICT (id) DO UPDATE SET status = 'failed', message = EXCLUDED.message, finished_at = now()`,
        [runId, SOURCE_ID, SOURCE_VERSION, SOURCE_URL, message],
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

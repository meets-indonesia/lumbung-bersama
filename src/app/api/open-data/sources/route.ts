import { openDataSources } from "@/lib/open-data-sources";
import { isDatabaseConfigured, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type SourceRow = {
  id: string;
  name: string;
  category: string;
  url: string;
  license: string;
  coverage: string;
  refreshStrategy: string;
  status: string;
  notes: string;
  lastCheckedAt: string | null;
};

type ImportRunRow = {
  sourceId: string;
  status: string;
  importedRows: number;
  sourceVersion: string;
  sourceUrl: string;
  message: string;
  startedAt: string;
  finishedAt: string | null;
};

type AreaCountRow = {
  level: number;
  total: string;
};

export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json({
      source: "static",
      sources: openDataSources,
      coverage: {
        administrativeAreasImported: {},
        message: "DATABASE_URL belum aktif, sehingga coverage nasional belum bisa dihitung.",
      },
      latestImportRuns: [],
    });
  }

  const [sources, counts, latestImportRuns] = await Promise.all([
    queryRows<SourceRow>(
      `SELECT id, name, category, url, license, coverage, refresh_strategy AS "refreshStrategy",
              status, notes, last_checked_at AS "lastCheckedAt"
       FROM open_data_sources
       ORDER BY category ASC, name ASC`,
    ),
    queryRows<AreaCountRow>(
      "SELECT level, COUNT(*)::text AS total FROM administrative_areas GROUP BY level ORDER BY level ASC",
    ),
    queryRows<ImportRunRow>(
      `SELECT source_id AS "sourceId", status, imported_rows AS "importedRows",
              source_version AS "sourceVersion", source_url AS "sourceUrl",
              message, started_at AS "startedAt", finished_at AS "finishedAt"
       FROM data_import_runs
       ORDER BY started_at DESC
       LIMIT 8`,
    ),
  ]);

  return Response.json({
    source: "postgres",
    sources,
    coverage: {
      administrativeAreasImported: counts.reduce<Record<string, number>>((acc, item) => {
        acc[`level${item.level}`] = Number(item.total);
        return acc;
      }, {}),
      levels: {
        level1: "provinsi",
        level2: "kabupaten/kota",
        level3: "kecamatan",
        level4: "desa/kelurahan",
      },
    },
    latestImportRuns,
  });
}

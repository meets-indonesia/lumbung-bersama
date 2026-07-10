import { openDataP0Roadmap, openDataSourceLabels, openDataSources } from "@/lib/open-data-sources";
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

const sourceLabelByCategory: Record<string, string> = {
  "administrative-code": "Official spatial boundary",
  boundary: "Official spatial boundary",
  "official-spatial-boundary": "Official spatial boundary",
  statistics: "Official statistics",
  "official-village-code": "Official statistics",
  "official-village-index": "Official village index",
  "commodity-baseline": "Demo baseline",
  "regional-commodity": "Regional open data",
  "commodity-news": "Regional open data",
  catalog: "Regional open data",
  "official-market-price": "Official market price",
  "official-market-availability": "Official market price",
  "official-trade-signal": "Official trade signal",
  "official-market-node": "Official trade signal",
  "regional-catalog": "Regional open data",
  "physical-asset": "Regional open data",
  "official-regulation": "Official regulation",
  "official-integration": "Official regulation",
};

function sourceLabelFor(category: string) {
  return sourceLabelByCategory[category] ?? "Regional open data";
}

function integrationClaimFor(status: string) {
  if (status === "ready-on-demand") return "implemented";
  if (status === "env-required") return "activation-required";
  if (status === "reference-only" || status === "manual-import-or-connector") return status;
  return status === "source-discovery" ? "source-discovery" : "connector-planned";
}

function redactUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value.split("?")[0].slice(0, 180);
  }
}

function safeImportMessage(value: string) {
  if (!value) return "";
  if (/(key|token|secret|password|credential|authorization)/i.test(value)) {
    return "Import status message redacted for safety.";
  }
  return value.slice(0, 220);
}

function toRegistrySources(sources: SourceRow[] | typeof openDataSources) {
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    category: source.category,
    url: redactUrl(source.url),
    license: source.license,
    coverage: source.coverage,
    refreshStrategy: source.refreshStrategy,
    status: source.status,
    notes: source.notes,
    lastCheckedAt: "lastCheckedAt" in source ? source.lastCheckedAt : null,
    sourceLabel: sourceLabelFor(source.category),
    integrationClaim: integrationClaimFor(source.status),
  }));
}

function toSafeImportRuns(rows: ImportRunRow[]) {
  return rows.map((row) => ({
    sourceId: row.sourceId,
    status: row.status,
    importedRows: Number(row.importedRows),
    sourceVersion: row.sourceVersion,
    sourceUrl: redactUrl(row.sourceUrl),
    message: safeImportMessage(row.message),
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  }));
}

function buildRegistryPayload({
  source,
  registryStatus,
  sources,
  coverage,
  latestImportRuns = [],
}: {
  source: "static" | "application-db";
  registryStatus: string;
  sources: SourceRow[] | typeof openDataSources;
  coverage: Record<string, unknown>;
  latestImportRuns?: ImportRunRow[];
}) {
  return {
    source,
    registryStatus,
    docsReference: "docs/37-external-data-source-map.md",
    sourceLabels: openDataSourceLabels,
    p0Roadmap: openDataP0Roadmap,
    registryPolicy: {
      externalClaims:
        "External integrations stay source-discovery or connector-planned unless an implemented connector is tested.",
      sharedDbScope:
        "Sumber eksplorasi hackathon adalah bahan terbatas, bukan referensi produksi SIMKOPDES.",
      privacy:
        "This registry exposes source metadata, labels, and aggregate import status only. It does not expose secret values or PII.",
    },
    sources: toRegistrySources(sources),
    coverage,
    latestImportRuns: toSafeImportRuns(latestImportRuns),
  };
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json(buildRegistryPayload({
      source: "static",
      registryStatus: "activation-required",
      sources: openDataSources,
      coverage: {
        administrativeAreasImported: {},
        message: "Koneksi data operasional belum aktif, sehingga coverage nasional belum bisa dihitung.",
      },
    }));
  }

  try {
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

    return Response.json(buildRegistryPayload({
      source: sources.length > 0 ? "application-db" : "static",
      registryStatus: sources.length > 0 ? "application-db-backed" : "static-empty-table-fallback",
      sources: sources.length > 0 ? sources : openDataSources,
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
    }));
  } catch {
    return Response.json(buildRegistryPayload({
      source: "static",
      registryStatus: "static-query-fallback",
      sources: openDataSources,
      coverage: {
        administrativeAreasImported: {},
        message: "Registry source map tersedia dari docs/37; live DB coverage belum bisa dibaca.",
      },
    }));
  }
}

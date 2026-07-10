import { NextResponse } from "next/server";
import { checkRateLimit, fetchWithTimeout } from "@/lib/external-fetch";
import { openDataSources } from "@/lib/open-data-sources";
import { isDatabaseConfigured, queryRows } from "@/lib/postgres";

type AreaCount = {
  level: number;
  total: string;
};

async function checkSource(target: (typeof openDataSources)[number]) {
  const started = Date.now();

  try {
    if (target.id === "bps-webapi") {
      if (!process.env.BPS_API_KEY) {
        return {
          ...target,
          status: "env-required",
          checkedMs: Date.now() - started,
          reason: "BPS_API_KEY belum tersedia di environment server.",
        };
      }

      const response = await fetchWithTimeout(`https://webapi.bps.go.id/v1/api/domain/type/all/key/${process.env.BPS_API_KEY}/`, {
        cache: "no-store",
        headers: {
          "User-Agent": "LumbungBersamaBPSConnectorCheck/0.1",
        },
      }, { timeoutMs: 6500, label: "BPS source check" });
      const payload = (await response.json().catch(() => null)) as { status?: string; message?: string } | null;

      return {
        ...target,
        status:
          response.ok && payload?.status === "OK"
            ? "reachable-with-key"
            : response.ok && payload?.status === "Error"
              ? "key-not-authorized"
              : `http-${response.status}`,
        checkedMs: Date.now() - started,
        endpoint: "https://webapi.bps.go.id/v1/api/domain/type/all/key/***/",
        reason: payload?.message,
      };
    }

    const response = await fetchWithTimeout(target.url, {
      cache: "no-store",
      headers: {
        "User-Agent": "LumbungBersamaSourceCheck/0.1",
      },
    }, { timeoutMs: 4500, label: `source check ${target.id}` });

    return {
      ...target,
      status: response.ok ? "reachable" : `http-${response.status}`,
      checkedMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ...target,
      status: "unreachable-from-server",
      checkedMs: Date.now() - started,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, "peta-source-check", { limit: 20, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const [results, areaCounts, commodityCoverage] = await Promise.all([
    Promise.all(openDataSources.map((target) => checkSource(target))),
    isDatabaseConfigured()
      ? queryRows<AreaCount>(
        "SELECT level, COUNT(*)::text AS total FROM administrative_areas GROUP BY level ORDER BY level ASC",
      ).catch(() => [])
      : Promise.resolve([]),
    isDatabaseConfigured()
      ? queryRows<{
        totalAreas: string;
        totalProfiles: string;
        totalVillages: string;
        totalProvinces: string;
        directReferenceAreas: string;
        directReferenceProfiles: string;
        legacyInheritedProfiles: string;
      }>(
        `SELECT COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalAreas",
                COUNT(CASE WHEN source_level <> 'inherited-province-baseline' THEN 1 END)::text AS "totalProfiles",
                COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "directReferenceAreas",
                COUNT(CASE WHEN source_level <> 'inherited-province-baseline' THEN 1 END)::text AS "directReferenceProfiles",
                COUNT(DISTINCT CASE WHEN area_level = 4 AND source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalVillages",
                COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN province_code END)::text AS "totalProvinces",
                COUNT(CASE WHEN source_level = 'inherited-province-baseline' THEN 1 END)::text AS "legacyInheritedProfiles"
         FROM regional_commodity_profiles`,
      ).catch(() => [])
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    note:
      "Reachability only. Production connector still needs source-specific auth, schema mapping, cache, data lineage, and human verification.",
    coverage: {
      administrativeAreasImported: areaCounts.reduce<Record<string, number>>((acc, item) => {
        acc[`level${item.level}`] = Number(item.total);
        return acc;
      }, {}),
      levels: {
        level1: "provinsi",
        level2: "kabupaten/kota",
        level3: "kecamatan",
        level4: "desa/kelurahan",
      },
      commodityBaseline: commodityCoverage[0] ?? null,
    },
    sources: results,
  });
}

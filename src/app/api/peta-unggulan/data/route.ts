import { dbRequiredResponse, isDatabaseConfigured, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type AreaCount = {
  level: number;
  total: string;
};

export async function GET() {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const [regions, villages, commodities, assets, areaCounts, commodityCoverage] = await Promise.all([
    queryRows(
      "SELECT id, label, status, color, village_code AS \"villageCode\", keywords FROM map_regions ORDER BY label ASC",
    ),
    queryRows(
      "SELECT code, name, district, regency, province, lat, lng, summary, source_note AS \"sourceNote\" FROM villages ORDER BY province ASC, name ASC",
    ),
    queryRows(
      `SELECT id, village_code AS "villageCode", name, supply, demand, quantity, price_signal AS "priceSignal", opportunity, risk
       FROM village_commodities
       ORDER BY name ASC`,
    ),
    queryRows(
      `SELECT id, village_code AS "villageCode", type, name, lat, lng, note, confidence
       FROM village_assets
       ORDER BY type ASC, name ASC`,
    ),
    queryRows<AreaCount>(
      "SELECT level, COUNT(*)::text AS total FROM administrative_areas GROUP BY level ORDER BY level ASC",
    ).catch(() => []),
    queryRows<{
      totalAreas: string;
      totalProfiles: string;
      totalVillages: string;
      totalProvinces: string;
      directReferenceAreas: string;
      directReferenceProfiles: string;
      legacyInheritedProfiles: string;
      directVillageProfiles: string;
    }>(
      `SELECT COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalAreas",
              COUNT(CASE WHEN source_level <> 'inherited-province-baseline' THEN 1 END)::text AS "totalProfiles",
              COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "directReferenceAreas",
              COUNT(CASE WHEN source_level <> 'inherited-province-baseline' THEN 1 END)::text AS "directReferenceProfiles",
              COUNT(DISTINCT CASE WHEN area_level = 4 AND source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalVillages",
              COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN province_code END)::text AS "totalProvinces",
              COUNT(CASE WHEN source_level = 'inherited-province-baseline' THEN 1 END)::text AS "legacyInheritedProfiles",
              COUNT(CASE WHEN area_level = 4 AND source_level = 'direct-village' THEN 1 END)::text AS "directVillageProfiles"
       FROM regional_commodity_profiles`,
    ).catch(() => []),
  ]);

  return Response.json({
    source: "postgres",
    coverage: {
      administrativeAreasImported: areaCounts.reduce<Record<string, number>>((acc, item) => {
        acc[`level${item.level}`] = Number(item.total);
        return acc;
      }, {}),
      operationalVillages: villages.length,
      commodityBaseline: commodityCoverage[0] ?? null,
      note:
        "Kode wilayah nasional tersedia sebagai fondasi. Komoditas peta mengecualikan inherited-province-baseline; data operasional tetap berasal dari WA/operator atau sumber resmi yang diimpor.",
    },
    regions,
    villages: villages.map((village) => ({
      ...village,
      commodities: commodities.filter((item) => item.villageCode === village.code),
      assets: assets.filter((item) => item.villageCode === village.code),
    })),
  });
}

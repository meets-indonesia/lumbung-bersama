import { dbRequiredResponse, isDatabaseConfigured, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type LevelCount = {
  level: number;
  totalAreas: string;
  totalProfiles: string;
};

type SourceCount = {
  sourceLevel: string;
  totalAreas: string;
  totalProfiles: string;
};

type ProvinceCount = {
  provinceCode: string;
  provinceName: string;
  totalAreas: string;
  totalProfiles: string;
};

const noInheritedWhere = "source_level <> 'inherited-province-baseline'";

export async function GET() {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const [levels, sources, provinces, totals] = await Promise.all([
    queryRows<LevelCount>(
      `SELECT area_level AS level,
              COUNT(DISTINCT area_code)::text AS "totalAreas",
              COUNT(*)::text AS "totalProfiles"
       FROM regional_commodity_profiles
       WHERE ${noInheritedWhere}
       GROUP BY area_level
       ORDER BY area_level ASC`,
    ),
    queryRows<SourceCount>(
      `SELECT source_level AS "sourceLevel",
              COUNT(DISTINCT area_code)::text AS "totalAreas",
              COUNT(*)::text AS "totalProfiles"
       FROM regional_commodity_profiles
       GROUP BY source_level
       ORDER BY source_level ASC`,
    ),
    queryRows<ProvinceCount>(
      `SELECT province_code AS "provinceCode",
              province_name AS "provinceName",
              COUNT(DISTINCT area_code)::text AS "totalAreas",
              COUNT(*)::text AS "totalProfiles"
       FROM regional_commodity_profiles
       WHERE area_level = 4
         AND ${noInheritedWhere}
       GROUP BY province_code, province_name
       ORDER BY province_name ASC`,
    ),
    queryRows<{
      totalAreas: string;
      totalProfiles: string;
      directReferenceAreas: string;
      directReferenceProfiles: string;
      totalVillages: string;
      totalProvinces: string;
      legacyInheritedProfiles: string;
      directVillageProfiles: string;
    }>(
      `SELECT COUNT(DISTINCT area_code)::text AS "totalAreas",
              COUNT(*)::text AS "totalProfiles",
              COUNT(DISTINCT CASE WHEN ${noInheritedWhere} THEN area_code END)::text AS "directReferenceAreas",
              COUNT(CASE WHEN ${noInheritedWhere} THEN 1 END)::text AS "directReferenceProfiles",
              COUNT(DISTINCT CASE WHEN area_level = 4 AND ${noInheritedWhere} THEN area_code END)::text AS "totalVillages",
              COUNT(DISTINCT CASE WHEN ${noInheritedWhere} THEN province_code END)::text AS "totalProvinces",
              COUNT(CASE WHEN source_level = 'inherited-province-baseline' THEN 1 END)::text AS "legacyInheritedProfiles",
              COUNT(CASE WHEN area_level = 4 AND source_level = 'direct-village' THEN 1 END)::text AS "directVillageProfiles"
       FROM regional_commodity_profiles`,
    ),
  ]);

  return Response.json({
    source: "application-db",
    totals: totals[0] ?? {
      totalAreas: "0",
      totalProfiles: "0",
      directReferenceAreas: "0",
      directReferenceProfiles: "0",
      totalVillages: "0",
      totalProvinces: "0",
      legacyInheritedProfiles: "0",
      directVillageProfiles: "0",
    },
    levels,
    sources,
    provinces,
    note:
      "Coverage utama mengecualikan inherited-province-baseline. Data area harus berasal dari sumber resmi langsung, operator/WA terverifikasi, atau connector daerah; inherited legacy hanya tersedia untuk audit.",
  });
}

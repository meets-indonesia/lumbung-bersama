import { queryRows } from "@/lib/postgres";

export type CommodityProfileSummary = {
  areaCode: string;
  areaLevel: number;
  areaName: string;
  provinceName: string;
  commodity: string;
  sector: string;
  rank: number;
  sourceLevel: string;
  confidence: string;
  basis: string;
};

export type CommodityCoverageSummary = {
  totalAreas: number;
  totalProfiles: number;
  totalVillages: number;
  totalProvinces: number;
  directVillageProfiles: number;
  legacyInheritedProfiles: number;
};

const COMMODITY_KEYWORDS = [
  "padi",
  "beras",
  "jagung",
  "singkong",
  "kopi",
  "cabai",
  "kakao",
  "kelapa",
  "sawit",
  "karet",
  "lada",
  "rumput laut",
  "ikan",
  "sagu",
  "tebu",
  "nilam",
  "pala",
  "cengkeh",
  "sapi",
];

function findCommodityKeyword(text: string) {
  const normalized = text.toLowerCase();
  return COMMODITY_KEYWORDS.find((keyword) => normalized.includes(keyword)) ?? "";
}

export async function getCommodityCoverageSummary(): Promise<CommodityCoverageSummary> {
  const rows = await queryRows<{
    totalAreas: string;
    totalProfiles: string;
    totalVillages: string;
    totalProvinces: string;
    directVillageProfiles: string;
    legacyInheritedProfiles: string;
  }>(
    `SELECT COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalAreas",
            COUNT(CASE WHEN source_level <> 'inherited-province-baseline' THEN 1 END)::text AS "totalProfiles",
            COUNT(DISTINCT CASE WHEN area_level = 4 AND source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalVillages",
            COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN province_code END)::text AS "totalProvinces",
            COUNT(CASE WHEN source_level = 'inherited-province-baseline' THEN 1 END)::text AS "legacyInheritedProfiles",
            COUNT(CASE WHEN area_level = 4 AND source_level = 'direct-village' THEN 1 END)::text AS "directVillageProfiles"
     FROM regional_commodity_profiles`,
  );
  const row = rows[0];

  return {
    totalAreas: Number(row?.totalAreas ?? 0),
    totalProfiles: Number(row?.totalProfiles ?? 0),
    totalVillages: Number(row?.totalVillages ?? 0),
    totalProvinces: Number(row?.totalProvinces ?? 0),
    directVillageProfiles: Number(row?.directVillageProfiles ?? 0),
    legacyInheritedProfiles: Number(row?.legacyInheritedProfiles ?? 0),
  };
}

export async function getProvinceCommodityProfiles(provinceName: string, limit = 4) {
  if (!provinceName) return [];

  return queryRows<CommodityProfileSummary>(
    `SELECT area_code AS "areaCode",
            area_level AS "areaLevel",
            area_name AS "areaName",
            province_name AS "provinceName",
            commodity,
            sector,
            rank,
            source_level AS "sourceLevel",
            confidence,
            basis
     FROM regional_commodity_profiles
     WHERE province_name ILIKE $1
       AND area_level = 1
       AND source_level <> 'inherited-province-baseline'
     ORDER BY rank ASC
     LIMIT $2`,
    [`%${provinceName}%`, limit],
  );
}

export async function findCommodityProfilesForMessage(message: string, provinceName: string, limit = 4) {
  const keyword = findCommodityKeyword(message);

  if (keyword) {
    const directRows = await queryRows<CommodityProfileSummary>(
      `SELECT area_code AS "areaCode",
              area_level AS "areaLevel",
              area_name AS "areaName",
              province_name AS "provinceName",
              commodity,
              sector,
              rank,
              source_level AS "sourceLevel",
              confidence,
              basis
       FROM regional_commodity_profiles
       WHERE commodity ILIKE $1
         AND source_level <> 'inherited-province-baseline'
       ORDER BY
         CASE WHEN province_name ILIKE $2 THEN 0 ELSE 1 END,
         CASE area_level WHEN 4 THEN 0 WHEN 3 THEN 1 WHEN 2 THEN 2 ELSE 3 END,
         rank ASC
       LIMIT $3`,
      [`%${keyword}%`, `%${provinceName}%`, limit],
    );

    if (directRows.length) return directRows;
  }

  return getProvinceCommodityProfiles(provinceName, limit);
}

export function describeCommodityProfiles(profiles: CommodityProfileSummary[]) {
  if (!profiles.length) return [];

  return profiles.map((profile) => {
    const sourceNote =
      profile.sourceLevel === "direct-village"
        ? "data langsung desa"
        : profile.sourceLevel === "province-baseline"
          ? "baseline provinsi"
          : "baseline provinsi yang diwariskan";

    return `${profile.commodity} (${profile.areaName}, ${sourceNote}; confidence: ${profile.confidence})`;
  });
}

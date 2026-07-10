import { getDemoCommoditySearch } from "@/lib/peta-demo-fallback";
import { isDatabaseConfigured, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type CommodityProfileRow = {
  id: string;
  areaCode: string;
  areaLevel: number;
  areaName: string;
  provinceCode: string;
  provinceName: string;
  commodity: string;
  sector: string;
  rank: number;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceLevel: string;
  confidence: string;
  basis: string;
  notes: string;
  updatedAt: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const areaCode = searchParams.get("areaCode")?.trim() ?? "";
  const provinceCode = searchParams.get("provinceCode")?.trim() ?? "";
  const levelParam = searchParams.get("level");
  const includeReference = searchParams.get("includeReference") === "true";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 60), 1), 200);
  const level = levelParam ? Number(levelParam) : null;

  if (!isDatabaseConfigured()) {
    return getDemoCommoditySearch({ q, areaCode, provinceCode, level, limit });
  }

  const where: string[] = [];
  const params: Array<string | number> = [];
  let qParamIndex: number | null = null;

  if (q) {
    params.push(`%${q}%`);
    qParamIndex = params.length;
    where.push(
      `(commodity ILIKE $${params.length} OR area_name ILIKE $${params.length} OR province_name ILIKE $${params.length} OR sector ILIKE $${params.length})`,
    );
  }

  if (areaCode) {
    params.push(areaCode);
    where.push(`area_code = $${params.length}`);
  }

  if (provinceCode) {
    params.push(provinceCode);
    where.push(`province_code = $${params.length}`);
  }

  if (level && level >= 1 && level <= 4) {
    params.push(level);
    where.push(`area_level = $${params.length}`);
  }

  if (!includeReference) {
    where.push("source_level <> 'inherited-province-baseline'");
  }

  params.push(limit);
  const rows = await queryRows<CommodityProfileRow>(
    `SELECT rcp.id,
            rcp.area_code AS "areaCode",
            rcp.area_level AS "areaLevel",
            rcp.area_name AS "areaName",
            rcp.province_code AS "provinceCode",
            rcp.province_name AS "provinceName",
            rcp.commodity,
            rcp.sector,
            rcp.rank,
            rcp.source_id AS "sourceId",
            ods.name AS "sourceName",
            ods.url AS "sourceUrl",
            rcp.source_level AS "sourceLevel",
            rcp.confidence,
            rcp.basis,
            rcp.notes,
            rcp.updated_at AS "updatedAt"
     FROM regional_commodity_profiles rcp
     JOIN open_data_sources ods ON ods.id = rcp.source_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY
       ${
         qParamIndex
           ? `CASE
                WHEN area_name ILIKE $${qParamIndex} THEN 0
                WHEN province_name ILIKE $${qParamIndex} AND area_level = 1 THEN 1
                WHEN commodity ILIKE $${qParamIndex} THEN 2
                WHEN province_name ILIKE $${qParamIndex} THEN 3
                ELSE 4
              END,`
           : ""
       }
       CASE area_level WHEN 1 THEN 0 WHEN 2 THEN 1 WHEN 3 THEN 2 ELSE 3 END,
       province_name ASC,
       area_name ASC,
       rank ASC
     LIMIT $${params.length}`,
    params,
  );

  return Response.json({
    source: "application-db",
    count: rows.length,
    query: { q, areaCode, provinceCode, level, limit, includeReference },
    profiles: rows,
    note:
      "Default pencarian mengecualikan inherited-province-baseline. Gunakan includeReference=true hanya untuk audit referensi lama, bukan klaim produksi area.",
  });
}

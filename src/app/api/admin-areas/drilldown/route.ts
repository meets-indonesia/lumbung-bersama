import { dbRequiredResponse, isDatabaseConfigured, queryOne, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type AreaRow = {
  code: string;
  name: string;
  level: number;
  kind: string;
  parentCode: string | null;
  sourceId: string;
  sourceVersion: string;
};

type CountRow = {
  level: number;
  total: string;
};

type ChildCountRow = {
  parentCode: string;
  total: string;
};

type VillageCountRow = {
  code: string;
  total: string;
};

type CommodityRow = {
  areaCode: string;
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
};

const directCommodityPredicate = "rcp.source_level <> 'inherited-province-baseline'";

function levelName(level: number) {
  if (level === 1) return "provinsi";
  if (level === 2) return "kabupaten/kota";
  if (level === 3) return "kecamatan";
  return "desa/kelurahan";
}

async function getBreadcrumb(area: AreaRow | null) {
  if (!area) return [];
  const chain: AreaRow[] = [];
  let current: AreaRow | null = area;

  while (current) {
    chain.unshift(current);
    if (!current.parentCode) break;
    current = await queryOne<AreaRow>(
      `SELECT code, name, level, kind, parent_code AS "parentCode",
              source_id AS "sourceId", source_version AS "sourceVersion"
       FROM administrative_areas
       WHERE code = $1
       LIMIT 1`,
      [current.parentCode],
    );
  }

  return chain;
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim() ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const commodity = searchParams.get("commodity")?.trim() ?? "";
  const sector = searchParams.get("sector")?.trim() ?? "";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 80), 1), 250);

  const selected = code
    ? await queryOne<AreaRow>(
        `SELECT code, name, level, kind, parent_code AS "parentCode",
                source_id AS "sourceId", source_version AS "sourceVersion"
         FROM administrative_areas
         WHERE code = $1
         LIMIT 1`,
        [code],
      )
    : null;

  if (code && !selected) {
    return Response.json(
      {
        error: "AREA_NOT_FOUND",
        message: "Kode wilayah tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  const childrenWhere: string[] = [];
  const childrenParams: Array<string | number> = [];

  if (selected) {
    childrenParams.push(selected.code);
    childrenWhere.push(`a.parent_code = $${childrenParams.length}`);
  } else {
    childrenWhere.push("a.level = 1");
  }

  if (q) {
    childrenParams.push(`%${q}%`);
    childrenWhere.push(`(a.name ILIKE $${childrenParams.length} OR a.code ILIKE $${childrenParams.length})`);
  }

  if (commodity) {
    childrenParams.push(`%${commodity}%`);
    childrenWhere.push(
      `EXISTS (
         SELECT 1
         FROM regional_commodity_profiles rcp
         WHERE rcp.area_code = a.code
           AND rcp.commodity ILIKE $${childrenParams.length}
           AND ${directCommodityPredicate}
       )`,
    );
  }

  if (sector) {
    childrenParams.push(sector);
    childrenWhere.push(
      `EXISTS (
         SELECT 1
         FROM regional_commodity_profiles rcp
         WHERE rcp.area_code = a.code
           AND rcp.sector = $${childrenParams.length}
           AND ${directCommodityPredicate}
       )`,
    );
  }

  childrenParams.push(limit);
  const children = await queryRows<AreaRow>(
    `SELECT a.code, a.name, a.level, a.kind, a.parent_code AS "parentCode",
            a.source_id AS "sourceId", a.source_version AS "sourceVersion"
     FROM administrative_areas a
     WHERE ${childrenWhere.join(" AND ")}
     ORDER BY a.name ASC
     LIMIT $${childrenParams.length}`,
    childrenParams,
  );

  const childCodes = children.map((child) => child.code);
  const childCounts = childCodes.length
    ? await queryRows<ChildCountRow>(
        `SELECT parent_code AS "parentCode", COUNT(*)::text AS total
         FROM administrative_areas
         WHERE parent_code = ANY($1)
         GROUP BY parent_code`,
        [childCodes],
      )
    : [];

  const villageCounts = childCodes.length
    ? await queryRows<VillageCountRow>(
        `SELECT child.code, COUNT(village.code)::text AS total
         FROM unnest($1::text[]) AS child(code)
         LEFT JOIN administrative_areas village
           ON village.level = 4
          AND (village.code = child.code OR village.code LIKE child.code || '.%')
         GROUP BY child.code`,
        [childCodes],
      )
    : [];

  const commodityRows = childCodes.length
    ? await queryRows<CommodityRow>(
        `SELECT area_code AS "areaCode",
                commodity,
                sector,
                rank,
                rcp.source_id AS "sourceId",
                ods.name AS "sourceName",
                ods.url AS "sourceUrl",
                source_level AS "sourceLevel",
                confidence,
                basis,
                rcp.notes
         FROM regional_commodity_profiles rcp
         JOIN open_data_sources ods ON ods.id = rcp.source_id
         WHERE area_code = ANY($1)
           AND rank <= 3
           AND ${directCommodityPredicate}
         ORDER BY area_code ASC, rank ASC`,
        [childCodes],
      ).catch(() => [])
    : [];

  const selectedProfiles = selected
    ? await queryRows<CommodityRow>(
        `SELECT area_code AS "areaCode",
                commodity,
                sector,
                rank,
                rcp.source_id AS "sourceId",
                ods.name AS "sourceName",
                ods.url AS "sourceUrl",
                source_level AS "sourceLevel",
                confidence,
                basis,
                rcp.notes
         FROM regional_commodity_profiles rcp
         JOIN open_data_sources ods ON ods.id = rcp.source_id
         WHERE area_code = $1
           AND ${directCommodityPredicate}
         ORDER BY rank ASC
         LIMIT 8`,
        [selected.code],
      ).catch(() => [])
    : [];

  const summaryParams: Array<string | number> = [];
  let summaryWhere = "";
  if (selected) {
    summaryParams.push(selected.code);
    summaryWhere = "WHERE code = $1 OR code LIKE $1 || '.%'";
  }

  const summaryRows = await queryRows<CountRow>(
    `SELECT level, COUNT(*)::text AS total
     FROM administrative_areas
     ${summaryWhere}
     GROUP BY level
     ORDER BY level ASC`,
    summaryParams,
  );

  const directCountMap = new Map(childCounts.map((item) => [item.parentCode, Number(item.total)]));
  const villageCountMap = new Map(villageCounts.map((item) => [item.code, Number(item.total)]));
  const commodityMap = new Map<string, CommodityRow[]>();
  for (const row of commodityRows) {
    const items = commodityMap.get(row.areaCode) ?? [];
    items.push(row);
    commodityMap.set(row.areaCode, items);
  }

  const breadcrumbs = await getBreadcrumb(selected);

  return Response.json({
    source: "postgres",
    selected: selected
      ? {
          ...selected,
          levelName: levelName(selected.level),
          profiles: selectedProfiles,
        }
      : {
          code: "",
          name: "Indonesia",
          level: 0,
          kind: "country",
          parentCode: null,
          sourceId: "national-root",
          sourceVersion: "generated",
          levelName: "nasional",
          profiles: [],
        },
    breadcrumbs: breadcrumbs.map((item) => ({
      code: item.code,
      name: item.name,
      level: item.level,
      levelName: levelName(item.level),
    })),
    summary: summaryRows.reduce<Record<string, number>>((acc, item) => {
      acc[`level${item.level}`] = Number(item.total);
      return acc;
    }, {}),
    children: children.map((child) => ({
      ...child,
      levelName: levelName(child.level),
      directChildren: directCountMap.get(child.code) ?? 0,
      villages: villageCountMap.get(child.code) ?? (child.level === 4 ? 1 : 0),
      commodities: commodityMap.get(child.code) ?? [],
    })),
    query: { code, q, commodity, sector, limit },
    note:
      "Drilldown memakai kode administrasi nasional dari Postgres. Komoditas yang ditampilkan mengecualikan inherited-province-baseline; setiap profil wajib membawa sumber. Geometri presisi penuh tetap membutuhkan import PostGIS/vector tile.",
  });
}

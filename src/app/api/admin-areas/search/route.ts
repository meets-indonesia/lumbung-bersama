import { dbRequiredResponse, isDatabaseConfigured, queryRows } from "@/lib/postgres";

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

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const levelParam = searchParams.get("level");
  const parentCode = searchParams.get("parentCode")?.trim() ?? "";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);
  const level = levelParam ? Number(levelParam) : null;

  const where: string[] = [];
  const params: Array<string | number> = [];

  if (q) {
    params.push(`%${q}%`);
    where.push(`(name ILIKE $${params.length} OR code ILIKE $${params.length})`);
  }

  if (level && level >= 1 && level <= 4) {
    params.push(level);
    where.push(`level = $${params.length}`);
  }

  if (parentCode) {
    params.push(parentCode);
    where.push(`parent_code = $${params.length}`);
  }

  params.push(limit);
  const rows = await queryRows<AreaRow>(
    `SELECT code, name, level, kind, parent_code AS "parentCode",
            source_id AS "sourceId", source_version AS "sourceVersion"
     FROM administrative_areas
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY level ASC, name ASC
     LIMIT $${params.length}`,
    params,
  );

  return Response.json({
    source: "postgres",
    count: rows.length,
    query: { q, level, parentCode, limit },
    areas: rows,
  });
}

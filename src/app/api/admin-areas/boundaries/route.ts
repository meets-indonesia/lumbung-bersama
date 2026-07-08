import { dbRequiredResponse, isDatabaseConfigured, queryOne, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type BoundaryFeature = {
  type: "Feature";
  properties: {
    code: string;
    name: string;
    level: number;
    lat: number;
    lng: number;
    source: string;
    sourceUrl: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
};

type BoundaryPayload = {
  source: string;
  sourceUrl: string;
  level: number;
  parentCode: string;
  count: number;
  featureCollection: {
    type: "FeatureCollection";
    features: BoundaryFeature[];
  };
  note: string;
  sources: Array<{
    id: string;
    url: string;
    role: string;
  }>;
  cached?: boolean;
  cachedAt?: string;
};

type BoundaryCacheRow = {
  payload: BoundaryPayload;
  updatedAt: string;
};

const RAW_BASE = "https://raw.githubusercontent.com/cahyadsn/wilayah_boundaries/main/db";
const SOURCE_ID = "cahyadsn/wilayah_boundaries";
const DMXSAN_SOURCE_ID = "dmxsan/indonesia-admin-boundaries";
const KALIMANTAN_SELATAN_FALLBACK_URL =
  "https://raw.githubusercontent.com/dmxsan/indonesia-admin-boundaries/main/processed-data/02-provinces/province-only/Kalimantan_Selatan.geojson";
const cache = new Map<string, { expiresAt: number; value: string }>();
const provinceSqlFiles = Array.from({ length: 8 }, (_, index) => `${RAW_BASE}/prov/wilayah_boundaries_prov_${index + 1}.sql`);

function getProvinceCode(code: string) {
  return code.split(".")[0] ?? code;
}

function getRegencyCode(code: string) {
  const [province, regency] = code.split(".");
  if (!province || !regency) return "";
  return `${province}.${regency}`;
}

function getLevel(code: string) {
  if (!code) return 0;
  return code.split(".").length;
}

function sqlFilesFor(level: number, parentCode: string) {
  if (level === 1) return provinceSqlFiles;
  const provinceCode = getProvinceCode(parentCode);
  if (!provinceCode) return [];
  if (level === 2) return [`${RAW_BASE}/kab/wilayah_boundaries_kab_${provinceCode}.sql`];
  if (level === 3) return [`${RAW_BASE}/kec/wilayah_boundaries_kec_${provinceCode}.sql`];
  if (level === 4) {
    const regencyCode = getRegencyCode(parentCode);
    if (!regencyCode) return [];
    return [`${RAW_BASE}/kel/${provinceCode}/wilayah_boundaries_kel_${regencyCode}.sql`];
  }
  return [];
}

function cacheKeyFor(level: number, parentCode: string) {
  return `boundary:v3:${level}:${parentCode || "root"}`;
}

async function readBoundaryCache(cacheKey: string) {
  try {
    const cached = await queryOne<BoundaryCacheRow>(
      `SELECT payload, updated_at AS "updatedAt"
       FROM admin_boundary_cache
       WHERE cache_key = $1
         AND updated_at > now() - interval '14 days'
       LIMIT 1`,
      [cacheKey],
    );
    if (!cached?.payload) return null;
    return {
      ...cached.payload,
      cached: true,
      cachedAt: cached.updatedAt,
    };
  } catch {
    return null;
  }
}

async function writeBoundaryCache(cacheKey: string, payload: BoundaryPayload) {
  try {
    await queryRows(
      `INSERT INTO admin_boundary_cache
         (cache_key, level, parent_code, source_id, source_url, feature_count, payload, note, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, now())
       ON CONFLICT (cache_key) DO UPDATE SET
         level = EXCLUDED.level,
         parent_code = EXCLUDED.parent_code,
         source_id = EXCLUDED.source_id,
         source_url = EXCLUDED.source_url,
         feature_count = EXCLUDED.feature_count,
         payload = EXCLUDED.payload,
         note = EXCLUDED.note,
         updated_at = now()`,
      [
        cacheKey,
        payload.level,
        payload.parentCode,
        payload.source,
        payload.sourceUrl,
        payload.count,
        JSON.stringify(payload),
        payload.note,
      ],
    );
  } catch {
    // Cache writes must not break map rendering.
  }
}

async function fetchTextCached(url: string) {
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const response = await fetch(url, {
    headers: { "User-Agent": "lumbung-bersama-map-boundary-loader" },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!response.ok) throw new Error(`Boundary source gagal dimuat: ${response.status}`);
  const value = await response.text();
  cache.set(url, { expiresAt: Date.now() + 1000 * 60 * 60 * 24, value });
  return value;
}

function simplifyRing<T>(ring: T[], maxPoints: number) {
  if (ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const simplified = ring.filter((_, index) => index === 0 || index === ring.length - 1 || index % step === 0);
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (JSON.stringify(first) !== JSON.stringify(last)) simplified.push(first);
  return simplified;
}

function ringAreaScore(ring: unknown) {
  if (!Array.isArray(ring)) return 0;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const point of ring) {
    if (!Array.isArray(point) || typeof point[0] !== "number" || typeof point[1] !== "number") continue;
    minLng = Math.min(minLng, point[0]);
    maxLng = Math.max(maxLng, point[0]);
    minLat = Math.min(minLat, point[1]);
    maxLat = Math.max(maxLat, point[1]);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(maxLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) return 0;
  return Math.abs((maxLng - minLng) * (maxLat - minLat));
}

function polygonAreaScore(polygon: unknown) {
  if (!Array.isArray(polygon)) return 0;
  return ringAreaScore(polygon[0]);
}

function limitMultiPolygonParts(coordinates: unknown, maxParts: number) {
  if (!Array.isArray(coordinates)) return coordinates;
  return [...coordinates].sort((a, b) => polygonAreaScore(b) - polygonAreaScore(a)).slice(0, maxParts);
}

function flipAndSimplify(value: unknown, maxPointsPerRing: number): unknown {
  if (!Array.isArray(value)) return value;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    return [value[1], value[0]];
  }
  if (Array.isArray(value[0]) && Array.isArray(value[0][0]) && typeof value[0][0][0] === "number") {
    return value.map((ring) => simplifyRing((ring as unknown[]).map((point) => flipAndSimplify(point, maxPointsPerRing)), maxPointsPerRing));
  }
  return value.map((item) => flipAndSimplify(item, maxPointsPerRing));
}

function simplifyGeoJsonCoordinates(value: unknown, maxPointsPerRing: number): unknown {
  if (!Array.isArray(value)) return value;
  if (typeof value[0] === "number" && typeof value[1] === "number") return value;
  if (Array.isArray(value[0]) && Array.isArray(value[0][0]) && typeof value[0][0][0] === "number") {
    return value.map((ring) => simplifyRing(ring as unknown[], maxPointsPerRing));
  }
  return value.map((item) => simplifyGeoJsonCoordinates(item, maxPointsPerRing));
}

function geometryFromPath(path: string, level: number): BoundaryFeature["geometry"] | null {
  try {
    const parsed = JSON.parse(path) as unknown[];
    const maxPoints = level === 1 ? 34 : level === 2 ? 170 : level === 3 ? 110 : 64;
    const rawCoordinates = flipAndSimplify(parsed, maxPoints);
    const isPolygon =
      Array.isArray(rawCoordinates) &&
      Array.isArray(rawCoordinates[0]) &&
      Array.isArray((rawCoordinates[0] as unknown[])[0]) &&
      typeof (((rawCoordinates[0] as unknown[])[0] as unknown[])[0]) === "number";
    const coordinates = isPolygon ? rawCoordinates : limitMultiPolygonParts(rawCoordinates, level === 1 ? 6 : level === 2 ? 18 : 12);
    return {
      type: isPolygon ? "Polygon" : "MultiPolygon",
      coordinates,
    };
  } catch {
    return null;
  }
}

function parseBoundarySql(sql: string, level: number, parentCode: string) {
  const features: BoundaryFeature[] = [];
  const rowPattern = /\('([^']*)','([^']*)',(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),'([^']*)'\)/g;
  let match: RegExpExecArray | null;

  while ((match = rowPattern.exec(sql))) {
    const [, code, name, latText, lngText, path] = match;
    if (parentCode && !(code === parentCode || code.startsWith(`${parentCode}.`))) continue;
    if (getLevel(code) !== level) continue;
    const geometry = geometryFromPath(path, level);
    if (!geometry) continue;
    features.push({
      type: "Feature",
      properties: {
        code,
        name,
        level,
        lat: Number(latText),
        lng: Number(lngText),
        source: SOURCE_ID,
        sourceUrl: "https://github.com/cahyadsn/wilayah_boundaries",
      },
      geometry,
    });
  }

  return features;
}

async function withProvinceFallbacks(features: BoundaryFeature[]): Promise<BoundaryFeature[]> {
  if (features.some((feature) => feature.properties.code === "63")) return features;

  const text = await fetchTextCached(KALIMANTAN_SELATAN_FALLBACK_URL);
  const payload = JSON.parse(text) as {
    features?: Array<{
      geometry?: {
        type?: "Polygon" | "MultiPolygon";
        coordinates?: unknown;
      };
    }>;
  };
  const fallbackGeometry = payload.features?.[0]?.geometry;
  if (!fallbackGeometry?.type || !fallbackGeometry.coordinates) return features;

  return [
    ...features,
    {
      type: "Feature" as const,
      properties: {
        code: "63",
        name: "Kalimantan Selatan",
        level: 1,
        lat: -3.05,
        lng: 115.25,
        source: DMXSAN_SOURCE_ID,
        sourceUrl: "https://github.com/dmxsan/indonesia-admin-boundaries",
      },
      geometry: {
        type: fallbackGeometry.type,
        coordinates:
          fallbackGeometry.type === "MultiPolygon"
            ? limitMultiPolygonParts(simplifyGeoJsonCoordinates(fallbackGeometry.coordinates, 34), 6)
            : simplifyGeoJsonCoordinates(fallbackGeometry.coordinates, 34),
      },
    },
  ];
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const { searchParams } = new URL(request.url);
  const selectedCode = searchParams.get("code")?.trim() ?? "";
  const parentCode = searchParams.get("parentCode")?.trim() ?? selectedCode;
  const levelParam = Number(searchParams.get("level") ?? (selectedCode ? getLevel(selectedCode) + 1 : 1));
  const level = Math.min(Math.max(levelParam, 1), 4);
  const bypassCache = searchParams.get("fresh") === "true";
  const cacheKey = cacheKeyFor(level, parentCode);

  if (!bypassCache) {
    const cached = await readBoundaryCache(cacheKey);
    if (cached) return Response.json(cached);
  }

  try {
    const files = sqlFilesFor(level, parentCode);
    if (!files.length) {
      return Response.json({
        source: SOURCE_ID,
        sourceUrl: "https://github.com/cahyadsn/wilayah_boundaries",
        level,
        parentCode,
        count: 0,
        featureCollection: { type: "FeatureCollection", features: [] },
        note:
          "Boundary level ini membutuhkan parentCode minimal sampai kabupaten/kota/kecamatan agar file sumber desa bisa dipilih dengan tepat.",
        sources: [{ id: SOURCE_ID, url: "https://github.com/cahyadsn/wilayah_boundaries", role: "boundary" }],
      });
    }

    const texts = await Promise.all(files.map((file) => fetchTextCached(file)));
    const parsedFeatures = texts.flatMap((sql) => parseBoundarySql(sql, level, level === 1 ? "" : parentCode));
    const features = level === 1 ? await withProvinceFallbacks(parsedFeatures) : parsedFeatures;
    const payload: BoundaryPayload = {
      source: SOURCE_ID,
      sourceUrl: "https://github.com/cahyadsn/wilayah_boundaries",
      level,
      parentCode,
      count: features.length,
      featureCollection: {
        type: "FeatureCollection",
        features,
      },
      note:
        level === 1
          ? "Boundary memakai simplified multipolygon cahyadsn/wilayah_boundaries dengan fallback Kalimantan Selatan dari dmxsan/indonesia-admin-boundaries karena file provinsi utama tidak memuat kode 63. Untuk produksi nasional berat, import ke PostGIS tetap disarankan."
          : level === 4
            ? "Boundary desa/kelurahan dimuat dari file per kabupaten/kota cahyadsn/wilayah_boundaries dan disederhanakan per request agar ringan. Untuk produksi presisi penuh, impor PostGIS/vector tile tetap disarankan."
            : "Boundary memakai data simplified multipolygon cahyadsn/wilayah_boundaries. Untuk produksi nasional berat, import ke PostGIS tetap disarankan.",
      sources: [
        { id: SOURCE_ID, url: "https://github.com/cahyadsn/wilayah_boundaries", role: "primary-boundary" },
        ...(level === 1
          ? [{ id: DMXSAN_SOURCE_ID, url: "https://github.com/dmxsan/indonesia-admin-boundaries", role: "fallback-boundary" }]
          : []),
      ],
    };

    await writeBoundaryCache(cacheKey, payload);
    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        error: "BOUNDARY_FETCH_FAILED",
        message: error instanceof Error ? error.message : "Boundary gagal dimuat.",
      },
      { status: 502 },
    );
  }
}

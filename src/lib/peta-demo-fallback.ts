import { petaVillages } from "./demo-data";

type DemoArea = {
  code: string;
  name: string;
  level: number;
  kind: string;
  parentCode: string | null;
  sourceId: string;
  sourceVersion: string;
};

type DemoCommodity = {
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

const source = {
  id: "lumbung-demo-mvp",
  name: "Data awal MVP Lumbung Bersama",
  url: "https://lumbungbersama.id",
  version: "demo-2026-07-10",
};

function levelName(level: number) {
  if (level === 1) return "provinsi";
  if (level === 2) return "kabupaten/kota";
  if (level === 3) return "kecamatan";
  if (level === 4) return "desa/kelurahan";
  return "nasional";
}

function sectorFor(commodity: string) {
  const normalized = commodity.toLowerCase();
  if (["ikan", "rumput laut", "tongkol"].some((item) => normalized.includes(item))) return "perikanan";
  if (["telur", "kambing"].some((item) => normalized.includes(item))) return "peternakan";
  if (["cabai", "pisang"].some((item) => normalized.includes(item))) return "hortikultura";
  if (["kopi", "kakao", "lada", "nilam", "pala"].some((item) => normalized.includes(item))) return "perkebunan";
  return "tanaman-pangan";
}

function uniqueByCode(areas: DemoArea[]) {
  return Array.from(new Map(areas.map((area) => [area.code, area])).values());
}

function areaParts(village: (typeof petaVillages)[number]) {
  const [provinceCode, regencyCode, districtCode] = village.code.split(".");
  const regencyFullCode = `${provinceCode}.${regencyCode}`;
  const districtFullCode = `${regencyFullCode}.${districtCode}`;

  return [
    {
      code: provinceCode,
      name: village.province,
      level: 1,
      kind: "province",
      parentCode: null,
      sourceId: source.id,
      sourceVersion: source.version,
    },
    {
      code: regencyFullCode,
      name: village.regency,
      level: 2,
      kind: "regency",
      parentCode: provinceCode,
      sourceId: source.id,
      sourceVersion: source.version,
    },
    {
      code: districtFullCode,
      name: village.district,
      level: 3,
      kind: "district",
      parentCode: regencyFullCode,
      sourceId: source.id,
      sourceVersion: source.version,
    },
    {
      code: village.code,
      name: village.name,
      level: 4,
      kind: "village",
      parentCode: districtFullCode,
      sourceId: source.id,
      sourceVersion: source.version,
    },
  ] satisfies DemoArea[];
}

const demoAreas = uniqueByCode(petaVillages.flatMap((village) => areaParts(village)));

const demoCommodities: DemoCommodity[] = petaVillages.flatMap((village) =>
  village.commodities.map((commodity, index) => ({
    areaCode: village.code,
    commodity: commodity.name,
    sector: sectorFor(commodity.name),
    rank: index + 1,
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    sourceLevel: "demo-village-sample",
    confidence: "Data awal",
    basis: `${commodity.supply}. ${commodity.quantity}. Peluang: ${commodity.opportunity}.`,
    notes: `${village.sourceNote} Risiko: ${commodity.risk}`,
  })),
);

function withLevelName(area: DemoArea) {
  return { ...area, levelName: levelName(area.level) };
}

function getChildren(code: string) {
  if (!code) return demoAreas.filter((area) => area.level === 1);
  return demoAreas.filter((area) => area.parentCode === code);
}

function countDescendants(area: DemoArea, level?: number) {
  return demoAreas.filter((candidate) => {
    const descendant = candidate.code === area.code || candidate.code.startsWith(`${area.code}.`);
    return descendant && (!level || candidate.level === level);
  }).length;
}

function summaryFor(selected: DemoArea | null) {
  const scoped = selected
    ? demoAreas.filter((area) => area.code === selected.code || area.code.startsWith(`${selected.code}.`))
    : demoAreas;

  return scoped.reduce<Record<string, number>>((acc, area) => {
    acc[`level${area.level}`] = (acc[`level${area.level}`] ?? 0) + 1;
    return acc;
  }, {});
}

function breadcrumbsFor(selected: DemoArea | null) {
  const chain: DemoArea[] = [];
  let current = selected;

  while (current) {
    chain.unshift(current);
    current = current.parentCode ? demoAreas.find((area) => area.code === current?.parentCode) ?? null : null;
  }

  return chain.map((area) => ({
    code: area.code,
    name: area.name,
    level: area.level,
    levelName: levelName(area.level),
  }));
}

function commoditiesForArea(areaCode: string) {
  return demoCommodities.filter((commodity) => commodity.areaCode === areaCode);
}

export function getDemoDrilldown({
  code,
  q,
  commodity,
  sector,
  limit,
}: {
  code: string;
  q: string;
  commodity: string;
  sector: string;
  limit: number;
}) {
  const selected = code ? demoAreas.find((area) => area.code === code) ?? null : null;
  if (code && !selected) {
    return Response.json(
      {
        error: "AREA_NOT_FOUND",
        message: "Kode wilayah demo tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  const normalizedQuery = q.toLowerCase();
  const normalizedCommodity = commodity.toLowerCase();
  const children = getChildren(code)
    .filter((area) => {
      if (normalizedQuery && !`${area.name} ${area.code}`.toLowerCase().includes(normalizedQuery)) return false;
      const descendantVillages = petaVillages.filter((village) => village.code === area.code || village.code.startsWith(`${area.code}.`));
      if (normalizedCommodity) {
        const hasCommodity = descendantVillages.some((village) =>
          village.commodities.some((item) => item.name.toLowerCase().includes(normalizedCommodity)),
        );
        if (!hasCommodity) return false;
      }
      if (sector) {
        const hasSector = descendantVillages.some((village) =>
          village.commodities.some((item) => sectorFor(item.name) === sector),
        );
        if (!hasSector) return false;
      }
      return true;
    })
    .slice(0, limit);

  return Response.json({
    source: "demo-fallback",
    selected: selected
      ? {
          ...withLevelName(selected),
          profiles: selected.level === 4 ? commoditiesForArea(selected.code) : [],
        }
      : {
          code: "",
          name: "Indonesia",
          level: 0,
          kind: "country",
          parentCode: null,
          sourceId: source.id,
          sourceVersion: source.version,
          levelName: "nasional",
          profiles: [],
        },
    breadcrumbs: breadcrumbsFor(selected),
    summary: summaryFor(selected),
    children: children.map((child) => ({
      ...withLevelName(child),
      directChildren: getChildren(child.code).length,
      villages: child.level === 4 ? 1 : countDescendants(child, 4),
      commodities:
        child.level === 4
          ? commoditiesForArea(child.code)
          : petaVillages
              .filter((village) => village.code.startsWith(`${child.code}.`))
              .flatMap((village) => commoditiesForArea(village.code))
              .slice(0, 3),
    })),
    query: { code, q, commodity, sector, limit },
    note:
      "Mode demo lokal aktif karena database aplikasi belum dikonfigurasi. Data ini hanya sample MVP untuk QA UI; gunakan import resmi untuk klaim operasional.",
  });
}

export function getDemoAreaSearch({
  q,
  level,
  parentCode,
  limit,
}: {
  q: string;
  level: number | null;
  parentCode: string;
  limit: number;
}) {
  const normalizedQuery = q.toLowerCase();
  const rows = demoAreas
    .filter((area) => {
      if (normalizedQuery && !`${area.name} ${area.code}`.toLowerCase().includes(normalizedQuery)) return false;
      if (level && area.level !== level) return false;
      if (parentCode && area.parentCode !== parentCode) return false;
      return true;
    })
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .slice(0, limit);

  return Response.json({
    source: "demo-fallback",
    count: rows.length,
    query: { q, level, parentCode, limit },
    areas: rows,
    note: "Mode demo lokal aktif karena data operasional belum tersambung.",
  });
}

export function getDemoCommoditySearch({
  q,
  areaCode,
  provinceCode,
  level,
  limit,
}: {
  q: string;
  areaCode: string;
  provinceCode: string;
  level: number | null;
  limit: number;
}) {
  const normalizedQuery = q.toLowerCase();
  const rows = demoCommodities
    .map((profile) => {
      const village = petaVillages.find((item) => item.code === profile.areaCode);
      return {
        ...profile,
        id: `${profile.areaCode}-${profile.rank}`,
        areaCode: profile.areaCode,
        areaLevel: 4,
        areaName: village?.name ?? profile.areaCode,
        provinceCode: profile.areaCode.split(".")[0] ?? "",
        provinceName: village?.province ?? "",
        updatedAt: "2026-07-10T00:00:00.000Z",
      };
    })
    .filter((profile) => {
      const haystack = `${profile.commodity} ${profile.areaName} ${profile.provinceName} ${profile.sector}`.toLowerCase();
      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      if (areaCode && profile.areaCode !== areaCode) return false;
      if (provinceCode && profile.provinceCode !== provinceCode) return false;
      if (level && profile.areaLevel !== level) return false;
      return true;
    })
    .sort((a, b) => a.areaName.localeCompare(b.areaName) || a.rank - b.rank)
    .slice(0, limit);

  return Response.json({
    source: "demo-fallback",
    count: rows.length,
    query: { q, areaCode, provinceCode, level, limit },
    profiles: rows,
    note:
      "Mode demo lokal aktif karena data operasional belum tersambung. Data ini untuk QA UI dan presentasi sample, bukan klaim produksi area.",
  });
}

const BASE_URL = (process.env.BOUNDARY_WARM_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const WARM_PROVINCES = process.env.BOUNDARY_WARM_PROVINCES ?? "all";
const DEEP_CODES = (process.env.BOUNDARY_WARM_DEEP_CODES ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "User-Agent": "lumbung-bersama-boundary-cache-warmer" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status}: ${payload.message ?? payload.error ?? "request failed"}`);
  }
  return payload;
}

function boundaryPath(level, parentCode = "") {
  const params = new URLSearchParams({ level: String(level), fresh: "true" });
  if (parentCode) params.set("parentCode", parentCode);
  return `/api/admin-areas/boundaries?${params.toString()}`;
}

async function main() {
  const root = await fetchJson(boundaryPath(1));
  console.log(`Warm boundary level 1: ${root.count ?? 0} features`);

  const provinces =
    WARM_PROVINCES === "all"
      ? (root.featureCollection?.features ?? []).map((feature) => feature.properties?.code).filter(Boolean)
      : WARM_PROVINCES.split(",").map((item) => item.trim()).filter(Boolean);

  for (const provinceCode of provinces) {
    const payload = await fetchJson(boundaryPath(2, provinceCode));
    console.log(`Warm boundary level 2 ${provinceCode}: ${payload.count ?? 0} features`);
  }

  for (const code of DEEP_CODES) {
    const level = code.split(".").length + 1;
    if (level < 3 || level > 4) continue;
    const payload = await fetchJson(boundaryPath(level, code));
    console.log(`Warm boundary level ${level} ${code}: ${payload.count ?? 0} features`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

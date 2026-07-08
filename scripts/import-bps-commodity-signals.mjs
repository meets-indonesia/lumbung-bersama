import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const SOURCE_ID = "bps-webapi";
const SOURCE_NAME = "BPS Web API";
const SOURCE_URL = "https://webapi.bps.go.id/documentation/";
const SOURCE_VERSION = "bps-webapi-dynamic-tables-v1";
const API_BASE = "https://webapi.bps.go.id/v1/api/list";
const API_TIMEOUT_MS = Number(process.env.BPS_API_TIMEOUT_MS ?? 45000);
const MAX_PROFILES_PER_AREA = Number(process.env.BPS_MAX_PROFILES_PER_AREA ?? 8);
const INCLUDE_KABKOTA_DISCOVERY = process.env.BPS_IMPORT_KABKOTA_DISCOVERY !== "false";
const KABKOTA_DOMAIN_LIMIT = Number(process.env.BPS_KABKOTA_DOMAIN_LIMIT ?? 0);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi. Import komoditas BPS dibatalkan.");
  process.exit(1);
}

if (!process.env.BPS_API_KEY) {
  console.error("BPS_API_KEY belum diisi. Import komoditas BPS dibatalkan.");
  process.exit(1);
}

const BPS_API_KEY = process.env.BPS_API_KEY;

const NATIONAL_PLANS = [
  {
    domain: "0000",
    varId: 2506,
    title: "Produksi Padi Menurut Provinsi (Bulanan)",
    commodity: "Padi",
    sector: "tanaman-pangan",
    metricName: "Produksi",
    unit: "Ton",
    priority: 10,
  },
  {
    domain: "0000",
    varId: 2507,
    title: "Produksi Jagung Pipilan Kering Kadar Air 14 Persen Menurut Provinsi (Bulanan)",
    commodity: "Jagung",
    sector: "tanaman-pangan",
    metricName: "Produksi",
    unit: "Ton",
    priority: 20,
  },
  {
    domain: "0000",
    varId: 2566,
    title: "Produksi Tanaman Perkebunan Menurut Provinsi dan Jenis Tanaman",
    commodity: "Tanaman Perkebunan",
    sector: "perkebunan",
    metricName: "Produksi",
    unit: "Ribu Ton",
    priority: 30,
    turvarCommodities: {
      2321: "Kelapa Sawit",
      2322: "Kelapa",
      2323: "Karet",
      2324: "Kopi",
      2325: "Kakao",
      2326: "Teh",
      2327: "Tebu",
    },
  },
  {
    domain: "0000",
    varId: 469,
    title: "Populasi Sapi Potong menurut Provinsi",
    commodity: "Sapi Potong",
    sector: "peternakan",
    metricName: "Populasi",
    unit: "Ekor",
    priority: 50,
  },
  {
    domain: "0000",
    varId: 480,
    title: "Produksi Daging Sapi menurut Provinsi",
    commodity: "Daging Sapi",
    sector: "peternakan",
    metricName: "Produksi",
    unit: "Ton",
    priority: 51,
  },
  {
    domain: "0000",
    varId: 1054,
    title: "Produksi perikanan tangkap menurut provinsi subsektor perikanan laut",
    commodity: "Perikanan Tangkap Laut",
    sector: "perikanan",
    metricName: "Produksi",
    unit: "Ton",
    priority: 60,
  },
  {
    domain: "0000",
    varId: 1055,
    title: "Produksi perikanan tangkap menurut provinsi subsektor perairan umum",
    commodity: "Perikanan Tangkap Perairan Umum",
    sector: "perikanan",
    metricName: "Produksi",
    unit: "Ton",
    priority: 61,
  },
  {
    domain: "0000",
    varId: 1513,
    title: "Produksi Perikanan Budidaya Menurut Komoditas Utama",
    commodity: "Perikanan Budidaya",
    sector: "perikanan",
    metricName: "Produksi",
    unit: "Ton",
    priority: 70,
    turvarCommodities: {
      1216: "Gurame",
      1217: "Patin",
      1218: "Lele",
      1219: "Nila",
      1220: "Ikan Mas",
      1221: "Kakap",
      1222: "Bandeng",
      1223: "Rumput Laut",
      1224: "Kerapu",
      1225: "Udang",
    },
  },
];

const KABKOTA_DISCOVERY_PLANS = [
  {
    keyword: "Produksi Padi",
    commodity: "Padi",
    sector: "tanaman-pangan",
    metricName: "Produksi",
    priority: 110,
    titleIncludes: ["produksi", "padi"],
    titleExcludes: ["setara beras", "luas panen", "produktivitas"],
    unitPattern: /ton/i,
    turvarAllowPattern: /padi|tidak ada/i,
  },
  {
    keyword: "Produksi Jagung",
    commodity: "Jagung",
    sector: "tanaman-pangan",
    metricName: "Produksi",
    priority: 120,
    titleIncludes: ["produksi", "jagung"],
    titleExcludes: ["luas panen", "produktivitas"],
    unitPattern: /ton/i,
    turvarAllowPattern: /jagung|tidak ada/i,
  },
  {
    keyword: "Produksi Kopi",
    commodity: "Kopi",
    sector: "perkebunan",
    metricName: "Produksi",
    priority: 130,
    titleIncludes: ["produksi", "kopi"],
    titleExcludes: ["luas", "jumlah perusahaan"],
    unitPattern: /ton/i,
    turvarAllowPattern: /kopi|tidak ada|arabika|robusta/i,
  },
];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b(provinsi|kabupaten|kab\.|kota|adm\.|administrasi)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanLabel(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text || text === "-" || text.toLowerCase() === "na") return null;
  const normalized = text.replace(/\s/g, "").replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatQuantity(value) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function bpsUrl(model, domain, segments = []) {
  const path = segments.map((part) => encodeURIComponent(String(part))).join("/");
  return `${API_BASE}/model/${model}/lang/ind/domain/${domain}${path ? `/${path}` : ""}/key/${BPS_API_KEY}/`;
}

function bpsPublicUrl(domain, varId) {
  return `${SOURCE_URL}#dynamic-table-domain-${domain}-var-${varId}`;
}

async function fetchBpsJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "LumbungBersama/1.0 official-data-import",
      },
    });

    if (!response.ok) {
      throw new Error(`${label} gagal: HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function extractRows(response) {
  if (Array.isArray(response?.data)) {
    const nested = response.data.find((item) => Array.isArray(item));
    if (nested) return nested;
    return response.data.filter((item) => item && typeof item === "object" && !Array.isArray(item));
  }

  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

async function fetchModelRows(model, domain, extraSegments = [], label = model) {
  const response = await fetchBpsJson(bpsUrl(model, domain, extraSegments), label);
  return extractRows(response);
}

async function fetchThRows(domain, varId) {
  const rows = await fetchModelRows("th", domain, ["var", varId], `th ${domain}/${varId}`);
  return rows
    .map((row) => ({
      val: Number(row.th_id ?? row.val),
      label: String(row.th ?? row.label ?? row.th_id ?? row.val),
    }))
    .filter((row) => Number.isFinite(row.val))
    .sort((a, b) => b.val - a.val);
}

async function fetchTurthRows(domain, varId) {
  const rows = await fetchModelRows("turth", domain, ["var", varId], `turth ${domain}/${varId}`).catch(() => []);
  return rows
    .map((row) => ({
      val: Number(row.turth_id ?? row.val),
      label: cleanLabel(row.turth ?? row.label ?? row.turth_id ?? row.val),
    }))
    .filter((row) => Number.isFinite(row.val));
}

async function fetchDataResponse(plan, th, turth = null) {
  const segments = ["var", plan.varId, "th", th.val];
  if (turth) segments.push("turth", turth.val);
  const response = await fetchBpsJson(bpsUrl("data", plan.domain, segments), `data ${plan.domain}/${plan.varId}/${th.val}`);
  if (response?.status !== "OK" || response?.["data-availability"] !== "available") return null;
  if (!response.datacontent || !Object.keys(response.datacontent).length) return null;
  return response;
}

async function loadBestData(plan) {
  const years = await fetchThRows(plan.domain, plan.varId);
  if (!years.length) return null;

  const turthRows = await fetchTurthRows(plan.domain, plan.varId);
  const annualRows = turthRows.filter((row) => /tahunan|tahun/i.test(row.label));
  const candidateTurthRows = annualRows.length ? annualRows : turthRows;

  for (const th of years) {
    for (const turth of candidateTurthRows) {
      const data = await fetchDataResponse(plan, th, turth).catch(() => null);
      if (data) return { data, th, turth };
    }

    const data = await fetchDataResponse(plan, th, null).catch(() => null);
    if (data) {
      const periods = data.turtahun ?? [];
      const hasSinglePeriod = periods.length <= 1;
      const hasAnnualPeriod = periods.some((item) => /tahunan|tahun/i.test(cleanLabel(item.label)));
      if (hasSinglePeriod || hasAnnualPeriod) return { data, th, turth: null };
    }
  }

  return null;
}

function buildKey(areaVal, varId, turvarVal, thVal, turthVal) {
  return `${areaVal}${varId}${turvarVal}${thVal}${turthVal}`;
}

function mapBpsArea(areaVal, areaLabel, areaByCode, areaByNormalizedName) {
  const raw = String(areaVal ?? "").replace(/\D/g, "");
  if (!raw || raw === "0" || raw === "9999" || raw === "999900") return null;

  let code = "";
  if (raw.length === 2) {
    code = raw;
  } else if (raw.length === 4 && raw.endsWith("00")) {
    code = raw.slice(0, 2);
  } else if (raw.length === 4) {
    code = `${raw.slice(0, 2)}.${raw.slice(2)}`;
  } else if (raw.length === 6) {
    code = `${raw.slice(0, 2)}.${raw.slice(2, 4)}.${raw.slice(4)}`;
  } else if (raw.length === 10) {
    code = `${raw.slice(0, 2)}.${raw.slice(2, 4)}.${raw.slice(4, 6)}.${raw.slice(6)}`;
  }

  const direct = areaByCode.get(code);
  if (direct) return direct;

  const expectedLevel = raw.length === 4 && raw.endsWith("00") ? 1 : raw.length === 4 ? 2 : null;
  if (expectedLevel) {
    const fallback = areaByNormalizedName.get(`${expectedLevel}:${normalizeName(areaLabel)}`);
    if (fallback) return fallback;
  }

  return null;
}

function commodityFor(plan, turvar) {
  const turvarLabel = cleanLabel(turvar?.label);
  const turvarId = String(turvar?.val ?? "0");

  if (plan.turvarCommodities) {
    return plan.turvarCommodities[turvarId] ?? plan.turvarCommodities[Number(turvarId)] ?? "";
  }

  if (plan.turvarAllowPattern && turvarLabel && turvarLabel !== "Tidak ada" && !plan.turvarAllowPattern.test(turvarLabel)) {
    return "";
  }

  return plan.commodity;
}

function periodLabel(period, th) {
  const periodText = cleanLabel(period?.label);
  const thText = cleanLabel(th?.label);
  if (!periodText || /tahun|tahunan/i.test(periodText)) return thText;
  return `${thText} ${periodText}`;
}

function signalIdFor(row) {
  return [
    "bps",
    row.domain,
    row.varId,
    row.areaCode.replaceAll(".", "-"),
    slugify(row.commodity),
    row.turvarVal,
    row.thVal,
    row.turthVal,
  ].join("-");
}

async function loadAreas(client) {
  const { rows } = await client.query(
    `SELECT code, name, level, kind, parent_code AS "parentCode"
     FROM administrative_areas
     WHERE level BETWEEN 1 AND 4
     ORDER BY level ASC, code ASC`,
  );

  const areaByCode = new Map();
  for (const row of rows) areaByCode.set(row.code, row);

  const areaByNormalizedName = new Map();
  for (const row of rows) {
    let cursor = row;
    while (cursor && cursor.level > 1) cursor = areaByCode.get(cursor.parentCode);
    const province = row.level === 1 ? row : cursor;
    row.provinceCode = province?.code ?? row.code.slice(0, 2);
    row.provinceName = province?.name ?? "";
    areaByNormalizedName.set(`${row.level}:${normalizeName(row.name)}`, row);
  }

  return { areas: rows, areaByCode, areaByNormalizedName };
}

function isSelectedTurvar(plan, turvar) {
  const label = cleanLabel(turvar?.label);
  if (plan.turvarCommodities) return Boolean(commodityFor(plan, turvar));
  if (plan.turvarAllowPattern && label && label !== "Tidak ada") return plan.turvarAllowPattern.test(label);
  return true;
}

function parseSignalsFromResponse(plan, variable, bestData, areaByCode, areaByNormalizedName) {
  const { data, th } = bestData;
  const datacontent = data.datacontent ?? {};
  const areas = data.vervar ?? [];
  const turvars = data.turvar?.length ? data.turvar : [{ val: "0", label: "Tidak ada" }];
  const periods = data.turtahun?.length ? data.turtahun : [{ val: "0", label: "Tahun" }];
  const variableTitle = cleanLabel(variable?.title ?? plan.title ?? `${plan.metricName} ${plan.commodity}`);
  const unit = cleanLabel(variable?.unit ?? data.unit ?? plan.unit ?? "");
  const rows = [];

  for (const areaItem of areas) {
    const area = mapBpsArea(areaItem.val, areaItem.label, areaByCode, areaByNormalizedName);
    if (!area || ![1, 2].includes(area.level)) continue;

    for (const turvar of turvars) {
      if (!isSelectedTurvar(plan, turvar)) continue;
      const commodity = commodityFor(plan, turvar);
      if (!commodity) continue;

      for (const period of periods) {
        const areaVal = String(areaItem.val);
        const turvarVal = String(turvar.val ?? "0");
        const thVal = String(th.val);
        const turthVal = String(period.val ?? "0");
        const key = buildKey(areaVal, plan.varId, turvarVal, thVal, turthVal);
        const quantity = parseNumber(datacontent[key]);
        if (quantity === null || quantity <= 0) continue;

        const rowPeriod = periodLabel(period, th);
        const publicUrl = bpsPublicUrl(plan.domain, plan.varId);
        rows.push({
          id: "",
          areaCode: area.code,
          areaLevel: area.level,
          areaName: area.name,
          provinceCode: area.provinceCode,
          provinceName: area.provinceName,
          commodity,
          sector: plan.sector,
          signalType: "official-statistic",
          metricName: plan.metricName,
          quantity,
          unit,
          period: rowPeriod,
          headline: variableTitle,
          summary: `${plan.metricName} ${commodity} di ${area.name}: ${formatQuantity(quantity)} ${unit} (${rowPeriod}) menurut BPS Web API.`,
          sourceId: SOURCE_ID,
          sourceName: SOURCE_NAME,
          sourceUrl: publicUrl,
          confidence: "official-bps",
          domain: plan.domain,
          varId: plan.varId,
          turvarVal,
          turvarLabel: cleanLabel(turvar.label),
          thVal,
          turthVal,
          priority: plan.priority,
          raw: {
            provider: SOURCE_NAME,
            domain: plan.domain,
            varId: plan.varId,
            variableTitle,
            vervar: { val: areaItem.val, label: areaItem.label },
            turvar: { val: turvar.val, label: turvar.label },
            tahun: th,
            turtahun: period,
            datacontentKey: key,
            sourceUrl: publicUrl,
          },
        });
      }
    }
  }

  return rows.map((row) => ({ ...row, id: signalIdFor(row) }));
}

function scoreVariable(row, plan) {
  const originalTitle = String(row.title ?? "").toLowerCase();
  const unit = String(row.unit ?? "");
  if (!/kabupaten\s*\/\s*kota|kabupaten kota/.test(originalTitle)) return -1;
  if (plan.titleIncludes.some((item) => !originalTitle.includes(item))) return -1;
  if (plan.titleExcludes.some((item) => originalTitle.includes(item))) return -1;
  if (plan.unitPattern && !plan.unitPattern.test(unit)) return -1;

  let score = 10;
  if (originalTitle.includes(`produksi ${plan.commodity.toLowerCase()}`)) score += 4;
  if (originalTitle.includes("menurut kabupaten/kota")) score += 3;
  if (originalTitle.includes("setara")) score -= 5;
  return score;
}

async function discoverKabkotaPlans(provinceAreas) {
  if (!INCLUDE_KABKOTA_DISCOVERY) return [];

  const selectedDomains = KABKOTA_DOMAIN_LIMIT > 0 ? provinceAreas.slice(0, KABKOTA_DOMAIN_LIMIT) : provinceAreas;
  const discovered = [];

  for (const province of selectedDomains) {
    const domain = `${province.code}00`;

    for (const plan of KABKOTA_DISCOVERY_PLANS) {
      const url = `${API_BASE}/model/var/lang/ind/domain/${domain}/key/${BPS_API_KEY}/keyword/${encodeURIComponent(plan.keyword)}/page/1`;
      const response = await fetchBpsJson(url, `var keyword ${domain}/${plan.keyword}`).catch(() => null);
      const rows = extractRows(response);
      const scored = rows
        .map((row) => ({ row, score: scoreVariable(row, plan) }))
        .filter((item) => item.score >= 0)
        .sort((a, b) => b.score - a.score);

      const selected = scored[0]?.row;
      if (!selected) continue;

      discovered.push({
        domain,
        varId: Number(selected.var_id),
        commodity: plan.commodity,
        sector: plan.sector,
        metricName: plan.metricName,
        priority: plan.priority,
        title: selected.title,
        unit: selected.unit,
        turvarAllowPattern: plan.turvarAllowPattern,
      });
    }
  }

  return discovered;
}

async function ensureSource(client) {
  await client.query(
    `INSERT INTO open_data_sources
      (id, name, category, url, license, coverage, refresh_strategy, status, notes, last_checked_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      url = EXCLUDED.url,
      license = EXCLUDED.license,
      coverage = EXCLUDED.coverage,
      refresh_strategy = EXCLUDED.refresh_strategy,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      last_checked_at = now()`,
    [
      SOURCE_ID,
      SOURCE_NAME,
      "official-statistics",
      SOURCE_URL,
      "BPS Web API terms; cite BPS as official source",
      "Indonesia; dynamic-table coverage follows each BPS variable/domain",
      "manual import, suitable for scheduled refresh",
      "reachable-with-key",
      "Official BPS dynamic-table connector for commodity production/population signals. API key is read from env and never stored in rows.",
    ],
  );
}

async function upsertSignals(client, signals) {
  if (!signals.length) return 0;

  const batchSize = 160;
  let imported = 0;
  for (let offset = 0; offset < signals.length; offset += batchSize) {
    const batch = signals.slice(offset, offset + batchSize);
    const values = [];
    const placeholders = batch
      .map((row, index) => {
        const base = index * 19;
        values.push(
          row.id,
          row.areaCode,
          row.areaLevel,
          row.areaName,
          row.provinceCode,
          row.provinceName,
          row.commodity,
          row.signalType,
          row.metricName,
          row.quantity,
          row.unit,
          row.period,
          row.headline,
          row.summary,
          row.sourceId,
          row.sourceName,
          row.sourceUrl,
          row.confidence,
          JSON.stringify(row.raw),
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19}::jsonb)`;
      })
      .join(", ");

    await client.query(
      `INSERT INTO regional_commodity_signals
        (id, area_code, area_level, area_name, province_code, province_name,
         commodity, signal_type, metric_name, quantity, unit, period, headline,
         summary, source_id, source_name, source_url, confidence, raw)
       VALUES ${placeholders}
       ON CONFLICT (id) DO UPDATE SET
        area_code = EXCLUDED.area_code,
        area_level = EXCLUDED.area_level,
        area_name = EXCLUDED.area_name,
        province_code = EXCLUDED.province_code,
        province_name = EXCLUDED.province_name,
        commodity = EXCLUDED.commodity,
        signal_type = EXCLUDED.signal_type,
        metric_name = EXCLUDED.metric_name,
        quantity = EXCLUDED.quantity,
        unit = EXCLUDED.unit,
        period = EXCLUDED.period,
        headline = EXCLUDED.headline,
        summary = EXCLUDED.summary,
        source_id = EXCLUDED.source_id,
        source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url,
        confidence = EXCLUDED.confidence,
        raw = EXCLUDED.raw,
        updated_at = now()`,
      values,
    );
    imported += batch.length;
  }

  return imported;
}

function profilesFromSignals(signals) {
  const byArea = new Map();
  const latestByCommodity = new Map();

  for (const signal of signals) {
    const key = `${signal.areaCode}:${signal.commodity}:${signal.metricName}`;
    const current = latestByCommodity.get(key);
    if (!current || signal.priority < current.priority || signal.period > current.period) latestByCommodity.set(key, signal);
  }

  for (const signal of latestByCommodity.values()) {
    const items = byArea.get(signal.areaCode) ?? [];
    items.push(signal);
    byArea.set(signal.areaCode, items);
  }

  const profiles = [];
  for (const items of byArea.values()) {
    const selected = items
      .sort((a, b) => a.priority - b.priority || a.commodity.localeCompare(b.commodity, "id"))
      .slice(0, MAX_PROFILES_PER_AREA);

    selected.forEach((signal, index) => {
      const sourceLevel =
        signal.areaLevel === 1 ? "bps-direct-province" : signal.areaLevel === 2 ? "bps-direct-kabkota" : "bps-direct-area";
      profiles.push({
        id: `bps-profile-${signal.areaCode.replaceAll(".", "-")}-${slugify(signal.metricName)}-${slugify(signal.commodity)}`,
        areaCode: signal.areaCode,
        areaLevel: signal.areaLevel,
        areaName: signal.areaName,
        provinceCode: signal.provinceCode,
        provinceName: signal.provinceName,
        commodity: signal.commodity,
        sector: signal.sector,
        rank: index + 1,
        sourceId: SOURCE_ID,
        sourceLevel,
        confidence: signal.confidence,
        basis: `${SOURCE_NAME}: ${signal.headline}; periode ${signal.period}; nilai ${formatQuantity(signal.quantity)} ${signal.unit}.`,
        notes: "Statistik resmi area dari BPS Web API. Ini bukan stok real-time desa/operator dan tidak diwariskan otomatis ke area anak.",
      });
    });
  }

  return profiles;
}

async function replaceBpsProfiles(client, profiles) {
  await client.query(
    `DELETE FROM regional_commodity_profiles
     WHERE source_id = $1
       AND source_level IN ('bps-direct-province', 'bps-direct-kabkota', 'bps-direct-area')`,
    [SOURCE_ID],
  );

  if (!profiles.length) return 0;

  const batchSize = 160;
  let imported = 0;
  for (let offset = 0; offset < profiles.length; offset += batchSize) {
    const batch = profiles.slice(offset, offset + batchSize);
    const values = [];
    const placeholders = batch
      .map((profile, index) => {
        const base = index * 14;
        values.push(
          profile.id,
          profile.areaCode,
          profile.areaLevel,
          profile.areaName,
          profile.provinceCode,
          profile.provinceName,
          profile.commodity,
          profile.sector,
          profile.rank,
          profile.sourceId,
          profile.sourceLevel,
          profile.confidence,
          profile.basis,
          profile.notes,
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14})`;
      })
      .join(", ");

    await client.query(
      `INSERT INTO regional_commodity_profiles
        (id, area_code, area_level, area_name, province_code, province_name,
         commodity, sector, rank, source_id, source_level, confidence, basis, notes)
       VALUES ${placeholders}
       ON CONFLICT (id) DO UPDATE SET
        area_level = EXCLUDED.area_level,
        area_name = EXCLUDED.area_name,
        province_code = EXCLUDED.province_code,
        province_name = EXCLUDED.province_name,
        commodity = EXCLUDED.commodity,
        sector = EXCLUDED.sector,
        rank = EXCLUDED.rank,
        source_id = EXCLUDED.source_id,
        source_level = EXCLUDED.source_level,
        confidence = EXCLUDED.confidence,
        basis = EXCLUDED.basis,
        notes = EXCLUDED.notes,
        updated_at = now()`,
      values,
    );
    imported += batch.length;
  }

  return imported;
}

async function importPlans(plans, areaByCode, areaByNormalizedName) {
  const allSignals = [];
  const planResults = [];

  for (const plan of plans) {
    const variable = {
      title: plan.title,
      unit: plan.unit,
    };
    const bestData = await loadBestData(plan).catch((error) => {
      planResults.push({
        domain: plan.domain,
        varId: plan.varId,
        title: plan.title ?? variable?.title ?? "",
        status: "error",
        message: error.message,
        rows: 0,
      });
      return null;
    });

    if (!bestData) {
      planResults.push({
        domain: plan.domain,
        varId: plan.varId,
        title: plan.title ?? variable?.title ?? "",
        status: "no-data",
        message: "BPS table unavailable for annual/latest period",
        rows: 0,
      });
      continue;
    }

    const rows = parseSignalsFromResponse(plan, variable, bestData, areaByCode, areaByNormalizedName);
    allSignals.push(...rows);
    planResults.push({
      domain: plan.domain,
      varId: plan.varId,
      title: cleanLabel(variable?.title ?? plan.title ?? ""),
      status: "importable",
      period: periodLabel(bestData.data.turtahun?.[0], bestData.th),
      rows: rows.length,
    });
    console.log(`BPS ${plan.domain}/${plan.varId}: ${rows.length} rows`);
  }

  return { signals: allSignals, planResults };
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
    max: 2,
  });
  const client = await pool.connect();
  const runId = `bps-commodity-${randomUUID().slice(0, 8)}`;

  try {
    await client.query("BEGIN");
    await ensureSource(client);
    const { areas, areaByCode, areaByNormalizedName } = await loadAreas(client);
    const provinceAreas = areas.filter((area) => area.level === 1);

    if (!provinceAreas.length) {
      throw new Error("administrative_areas belum berisi provinsi. Jalankan npm run data:import-wilayah terlebih dahulu.");
    }

    await client.query(
      `INSERT INTO data_import_runs
        (id, source_id, status, imported_rows, source_version, source_url, message)
       VALUES ($1, $2, 'running', 0, $3, $4, $5)`,
      [runId, SOURCE_ID, SOURCE_VERSION, SOURCE_URL, "Importing official BPS commodity signals"],
    );
    await client.query("COMMIT");

    const discoveredPlans = await discoverKabkotaPlans(provinceAreas);
    console.log(`BPS discovery: ${discoveredPlans.length} kab/kota tables selected`);

    const { signals, planResults } = await importPlans(
      [...NATIONAL_PLANS, ...discoveredPlans],
      areaByCode,
      areaByNormalizedName,
    );

    const dedupedSignals = Array.from(new Map(signals.map((row) => [row.id, row])).values());
    const profiles = profilesFromSignals(dedupedSignals);

    await client.query("BEGIN");
    const signalCount = await upsertSignals(client, dedupedSignals);
    const profileCount = await replaceBpsProfiles(client, profiles);
    await client.query(
      `UPDATE data_import_runs
       SET status = 'success',
           imported_rows = $2,
           message = $3,
           finished_at = now()
       WHERE id = $1`,
      [
        runId,
        signalCount,
        `Imported ${signalCount} BPS commodity signals and ${profileCount} direct BPS profiles. Plans: ${JSON.stringify(planResults.slice(0, 80))}`,
      ],
    );
    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          status: "success",
          signals: signalCount,
          profiles: profileCount,
          nationalPlans: NATIONAL_PLANS.length,
          discoveredKabkotaPlans: discoveredPlans.length,
          source: SOURCE_URL,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    await client.query(
      `UPDATE data_import_runs
       SET status = 'failed',
           message = $2,
           finished_at = now()
       WHERE id = $1`,
      [runId, error instanceof Error ? error.message : String(error)],
    ).catch(() => {});
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

import { buildPriceCheckNegotiationData, describeCommodityProfiles, findCommodityProfilesForMessage } from "@/lib/commodity-intelligence";
import { isHackathonSharedDbConfigured, queryHackathonRows } from "@/lib/hackathon-shared-db";
import { queryRows } from "@/lib/postgres";

export type AgentToolScope =
  | "peta"
  | "harga"
  | "stok"
  | "buyer"
  | "finance"
  | "document"
  | "report"
  | "integration"
  | "intake";

export type AgentToolResult = {
  tool: string;
  scope: AgentToolScope;
  status: "ready" | "restricted" | "empty" | "error";
  summary: string;
  evidence: string[];
  restriction?: string;
};

export type AgentToolRunSummary = {
  scope: AgentToolScope;
  tools: AgentToolResult[];
  evidenceLines: string[];
  restrictions: string[];
  handoffHints: string[];
};

type RunToolsInput = {
  cooperativeId: string;
  cooperativeProvince?: string | null;
  cooperativeRegency?: string | null;
  agentName?: string | null;
  module?: string | null;
  message: string;
};

const TOOL_SCOPES: Record<AgentToolScope, string[]> = {
  peta: ["commodity_profile.search", "village_commodity.search"],
  harga: ["commodity_profile.search", "price_check.context"],
  stok: ["stock_items.search", "stock_ledger.recent", "media_evidence.redacted"],
  buyer: ["buyer_match.archetype", "buyer_requirement.readiness", "stock_items.search"],
  finance: ["finance_readiness.aggregate"],
  document: ["media_evidence.redacted", "operator_queue.safe_summary"],
  report: ["operator_queue.safe_summary", "agent_runs.recent", "stock_ledger.recent", "buyer_requirement.readiness", "finance_readiness.aggregate"],
  integration: ["integration.safe_status"],
  intake: ["operator_queue.safe_summary", "wa_history.safe_recent"],
};

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function quoteIdentifier(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("INVALID_HACKATHON_COLUMN_IDENTIFIER");
  }
  return `"${identifier}"`;
}

function sqlTextLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'::text`;
}

function pickColumn(columns: Set<string>, candidates: string[]) {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

function textExpression(column: string | null, fallback: string) {
  return column ? `${quoteIdentifier(column)}::text` : sqlTextLiteral(fallback);
}

function numericExpression(column: string | null) {
  if (!column) return "0::numeric";
  const expression = quoteIdentifier(column);
  return `COALESCE(NULLIF(REGEXP_REPLACE(${expression}::text, '[^0-9.-]', '', 'g'), '')::numeric, 0)`;
}

function extractCommodityKeyword(message: string) {
  const normalized = normalize(message);
  const known = [
    "sawit",
    "tbs",
    "cpo",
    "kopi",
    "beras",
    "padi",
    "cabai",
    "singkong",
    "jagung",
    "kakao",
    "lada",
    "sagu",
    "rumput laut",
  ];
  return known.find((item) => normalized.includes(item)) ?? "";
}

function extractAreaHint(message: string, fallbackArea?: string | null) {
  const cleaned = String(message ?? "").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/\b(?:di|daerah|kabupaten|kecamatan|desa|provinsi)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s.-]{3,48})/i);
  const fromMessage = match?.[1]?.trim().replace(/[?.!,;:].*$/, "") ?? "";
  return fromMessage || fallbackArea || "";
}

function commodityPattern(commodity: string) {
  const normalized = normalize(commodity);
  if (/(beras|padi|gabah)/i.test(normalized)) return "(beras|padi|gabah|rice)";
  if (/(sawit|tbs|cpo)/i.test(normalized)) return "(sawit|tbs|cpo|kelapa sawit)";
  if (/kopi/i.test(normalized)) return "(kopi|robusta|arabika)";
  if (/cabai/i.test(normalized)) return "(cabai|cabe|chili)";
  if (/jagung/i.test(normalized)) return "(jagung)";
  if (/singkong/i.test(normalized)) return "(singkong|ubi kayu)";
  if (/kakao/i.test(normalized)) return "(kakao|cokelat)";
  if (/lada/i.test(normalized)) return "(lada|merica)";
  if (/sagu/i.test(normalized)) return "(sagu)";
  if (/rumput laut/i.test(normalized)) return "(rumput laut)";
  return normalized.replace(/[^\p{Letter}\p{Number}\s]/gu, " ").trim().replace(/\s+/g, "|") || ".+";
}

async function hackathonColumns(tableName: string) {
  const rows = await queryHackathonRows<{ columnName: string }>(
    `SELECT column_name AS "columnName"
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1`,
    [tableName],
  );
  return new Set(rows.map((row) => row.columnName));
}

export function scopeForAgent(agentName?: string | null, module?: string | null, message = ""): AgentToolScope {
  const combined = normalize(`${agentName ?? ""} ${module ?? ""} ${message}`);
  if (/(harga|nego|negosiasi|tawar|floor price|margin)/i.test(combined)) return "harga";
  if (/(buyer|pembeli|offtaker|outreach|jual|menjual|mau jual|mitra|pasar)/i.test(combined)) return "buyer";
  if (/(pinjam|pinjaman|pembiayaan|modal|komite|cicil|rencana bayar|finance)/i.test(combined)) return "finance";
  if (/(stok|gudang|restock|habis|pickup|barang masuk|barang keluar|panen|gerai)/i.test(combined)) return "stok";
  if (/(foto|gambar|dokumen|pdf|nota|bukti|ocr|koreksi|revisi)/i.test(combined)) return "document";
  if (/(laporan|ringkasan|export|csv|aksi)/i.test(combined)) return "report";
  if (/(integrasi|health|sistem|wa|bridge|koneksi)/i.test(combined)) return "integration";
  if (/(wa intake|suara warga|catatan|status)/i.test(combined)) return "intake";
  return "peta";
}

function safeAmount(value: string | number | null | undefined) {
  const numeric = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function result(tool: string, scope: AgentToolScope, status: AgentToolResult["status"], summary: string, evidence: string[], restriction?: string): AgentToolResult {
  return {
    tool,
    scope,
    status,
    summary,
    evidence: evidence.filter(Boolean).slice(0, 5),
    restriction,
  };
}

async function commodityProfileTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const profiles = await findCommodityProfilesForMessage(input.message, input.cooperativeProvince ?? "", 5).catch(() => []);
  const evidence = describeCommodityProfiles(profiles);
  if (!evidence.length) {
    return result("commodity_profile.search", scope, "empty", "Profil komoditas belum menemukan sinyal spesifik untuk pesan ini.", []);
  }
  return result("commodity_profile.search", scope, "ready", "Profil komoditas aman dipakai sebagai konteks wilayah/komoditas.", evidence);
}

async function villageCommodityTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const keyword = extractCommodityKeyword(input.message);
  const rows = await queryRows<{
    villageName: string;
    district: string;
    regency: string;
    commodity: string;
    supply: string;
    demand: string;
    quantity: string;
    priceSignal: string;
    risk: string;
  }>(
    `SELECT villages.name AS "villageName",
            villages.district,
            villages.regency,
            village_commodities.name AS commodity,
            village_commodities.supply,
            village_commodities.demand,
            village_commodities.quantity,
            village_commodities.price_signal AS "priceSignal",
            village_commodities.risk
     FROM village_commodities
     JOIN villages ON villages.code = village_commodities.village_code
     WHERE ($1::text = '' OR village_commodities.name ILIKE $2)
       AND ($3::text = '' OR villages.province ILIKE $4)
     ORDER BY villages.updated_at DESC
     LIMIT 5`,
    [keyword, `%${keyword}%`, input.cooperativeProvince ?? "", `%${input.cooperativeProvince ?? ""}%`],
  ).catch(() => []);
  const evidence = rows.map((row) => `${row.commodity} di ${row.villageName}, ${row.regency}: ${row.quantity}; supply ${row.supply}; demand ${row.demand}; risiko ${row.risk}`);
  return result(
    "village_commodity.search",
    scope,
    evidence.length ? "ready" : "empty",
    evidence.length ? "Komoditas desa ditemukan dari data aplikasi." : "Komoditas desa belum tersedia untuk keyword ini.",
    evidence,
  );
}

async function localPriceEvidence(input: RunToolsInput, commodity: string, areaHint: string) {
  const rows = await queryRows<{
    villageName: string;
    district: string;
    regency: string;
    province: string;
    commodity: string;
    quantity: string;
    priceSignal: string;
    supply: string;
    demand: string;
    risk: string;
  }>(
    `SELECT villages.name AS "villageName",
            villages.district,
            villages.regency,
            villages.province,
            village_commodities.name AS commodity,
            village_commodities.quantity,
            village_commodities.price_signal AS "priceSignal",
            village_commodities.supply,
            village_commodities.demand,
            village_commodities.risk
     FROM village_commodities
     JOIN villages ON villages.code = village_commodities.village_code
     WHERE ($1::text = '' OR village_commodities.name ILIKE $2)
       AND (
         $3::text = ''
         OR villages.name ILIKE $4
         OR villages.district ILIKE $4
         OR villages.regency ILIKE $4
         OR villages.province ILIKE $4
       )
     ORDER BY villages.updated_at DESC
     LIMIT 5`,
    [commodity, `%${commodity}%`, areaHint, `%${areaHint}%`],
  ).catch(() => []);

  return rows.map((row) =>
    `Peta/local: ${row.commodity} di ${row.villageName}, ${row.regency}, ${row.province}; volume ${row.quantity}; sinyal harga "${row.priceSignal}"; supply ${row.supply}; demand ${row.demand}; risiko ${row.risk}`,
  );
}

async function sharedInventoryPriceEvidence(commodity: string, areaHint: string) {
  if (!isHackathonSharedDbConfigured()) return [];

  const columns = await hackathonColumns("inventaris_produk");
  const productColumn = pickColumn(columns, ["nama_produk", "produk", "nama_barang", "nama_item", "komoditas", "nama_komoditas"]);
  const priceColumn = pickColumn(columns, [
    "harga",
    "harga_jual",
    "harga_beli",
    "harga_satuan",
    "harga_produk",
    "price",
    "unit_price",
    "nilai_produk",
  ]);
  const stockColumn = pickColumn(columns, ["stok", "stock", "jumlah_stok", "quantity", "qty", "jumlah"]);
  const unitColumn = pickColumn(columns, ["satuan", "unit", "unit_label", "uom"]);
  const cooperativeColumn = columns.has("koperasi_ref") ? "koperasi_ref" : null;

  if (!productColumn || !priceColumn) return [];

  const productExpr = textExpression(productColumn, "Produk tanpa nama");
  const priceExpr = numericExpression(priceColumn);
  const stockExpr = numericExpression(stockColumn);
  const unitExpr = textExpression(unitColumn, "unit");
  const areaFilter = cooperativeColumn
    ? `AND (
         $2::text = ''
         OR EXISTS (
           SELECT 1
           FROM referensi_koperasi_wilayah rkw
           JOIN referensi_wilayah rw ON rw.kode_wilayah = rkw.kode_wilayah
           WHERE rkw.koperasi_ref = inventaris_produk.${quoteIdentifier(cooperativeColumn)}
             AND (
               rw.provinsi ILIKE $3
               OR rw.kab_kota ILIKE $3
               OR rw.kecamatan ILIKE $3
             )
         )
       )`
    : "";

  const rows = await queryHackathonRows<{
    productName: string;
    unitLabel: string;
    rows: number;
    avgPrice: string;
    minPrice: string;
    maxPrice: string;
    stockTotal: string;
  }>(
    `SELECT COALESCE(NULLIF(BTRIM(${productExpr}), ''), 'Produk tanpa nama') AS "productName",
            COALESCE(NULLIF(BTRIM(${unitExpr}), ''), 'unit') AS "unitLabel",
            COUNT(*)::int AS rows,
            AVG(NULLIF(${priceExpr}, 0))::text AS "avgPrice",
            MIN(NULLIF(${priceExpr}, 0))::text AS "minPrice",
            MAX(NULLIF(${priceExpr}, 0))::text AS "maxPrice",
            COALESCE(SUM(${stockExpr}), 0)::text AS "stockTotal"
     FROM inventaris_produk
     WHERE LOWER(${productExpr}) ~* $1
       AND ${priceExpr} > 0
       ${areaFilter}
     GROUP BY 1, 2
     ORDER BY COUNT(*) DESC, AVG(NULLIF(${priceExpr}, 0)) DESC
     LIMIT 4`,
    [commodityPattern(commodity), areaHint, `%${areaHint}%`],
  ).catch(() => []);

  if (!rows.length) return [];

  const productTypes = new Set(rows.map((row) => String(row.productName ?? "").trim()).filter(Boolean)).size;
  const rowCount = rows.reduce((total, row) => total + Number(row.rows ?? 0), 0);
  const stockTotal = rows.reduce((total, row) => total + safeAmount(row.stockTotal), 0);
  const prices = rows.flatMap((row) => [safeAmount(row.minPrice), safeAmount(row.maxPrice), safeAmount(row.avgPrice)]).filter((value) => value > 0);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const range = min && max && min !== max ? `${formatRupiah(min)}-${formatRupiah(max)}` : min ? formatRupiah(min) : "";
  return [
    range
      ? `Data eksplorasi inventaris menemukan ${rowCount} baris terkait ${commodity} dari ${productTypes} tipe produk; rentang harga tercatat ${range}; stok agregat ${stockTotal.toLocaleString("id-ID")}.`
      : `Data eksplorasi inventaris menemukan ${rowCount} baris terkait ${commodity} dari ${productTypes} tipe produk; stok agregat ${stockTotal.toLocaleString("id-ID")}, tetapi harga satuan belum cukup bersih.`,
  ];
}

async function sharedProductAvailabilityEvidence(commodity: string, areaHint: string) {
  if (!isHackathonSharedDbConfigured()) return [];

  const columns = await hackathonColumns("inventaris_produk");
  const productColumn = pickColumn(columns, ["nama_produk", "produk", "nama_barang", "nama_item", "komoditas", "nama_komoditas"]);
  const stockColumn = pickColumn(columns, ["stok", "stock", "jumlah_stok", "quantity", "qty", "jumlah"]);
  const cooperativeColumn = columns.has("koperasi_ref") ? "koperasi_ref" : null;

  if (!productColumn) return [];

  const productExpr = textExpression(productColumn, "Produk tanpa nama");
  const stockExpr = numericExpression(stockColumn);
  const areaFilter = cooperativeColumn
    ? `AND (
         $2::text = ''
         OR EXISTS (
           SELECT 1
           FROM referensi_koperasi_wilayah rkw
           JOIN referensi_wilayah rw ON rw.kode_wilayah = rkw.kode_wilayah
           WHERE rkw.koperasi_ref = inventaris_produk.${quoteIdentifier(cooperativeColumn)}
             AND (
               rw.provinsi ILIKE $3
               OR rw.kab_kota ILIKE $3
               OR rw.kecamatan ILIKE $3
             )
         )
       )`
    : "";

  const rows = await queryHackathonRows<{
    productName: string;
    rows: number;
    stockTotal: string;
  }>(
    `SELECT COALESCE(NULLIF(BTRIM(${productExpr}), ''), 'Produk tanpa nama') AS "productName",
            COUNT(*)::int AS rows,
            COALESCE(SUM(${stockExpr}), 0)::text AS "stockTotal"
     FROM inventaris_produk
     WHERE LOWER(${productExpr}) ~* $1
       ${areaFilter}
     GROUP BY 1
     ORDER BY COUNT(*) DESC, COALESCE(SUM(${stockExpr}), 0) DESC
     LIMIT 4`,
    [commodityPattern(commodity), areaHint, `%${areaHint}%`],
  ).catch(() => []);

  if (!rows.length) return [];

  const rowCount = rows.reduce((total, row) => total + Number(row.rows ?? 0), 0);
  const productTypes = new Set(rows.map((row) => String(row.productName ?? "").trim()).filter(Boolean)).size;
  const stockTotal = rows.reduce((total, row) => total + safeAmount(row.stockTotal), 0);
  const stockText = stockTotal > 0 ? `stok agregat ${stockTotal.toLocaleString("id-ID")}` : "stok agregat belum terisi";
  return [`Data eksplorasi inventaris mencatat ${rowCount} baris terkait ${commodity} dari ${productTypes} tipe produk; ${stockText}; harga satuan belum cukup bersih.`];
}

async function sharedTransactionPriceEvidence(commodity: string, areaHint: string) {
  if (!isHackathonSharedDbConfigured()) return [];

  const columns = await hackathonColumns("transaksi_penjualan");
  const productColumn = pickColumn(columns, ["nama_produk", "produk", "nama_barang", "nama_item", "komoditas", "nama_komoditas"]);
  const amountColumn = pickColumn(columns, [
    "total_pembayaran",
    "total_payment",
    "total_penjualan",
    "nilai_transaksi",
    "jumlah_pembayaran",
    "nominal",
    "amount",
    "total",
  ]);
  const quantityColumn = pickColumn(columns, ["jumlah_produk", "jumlah_barang", "kuantitas", "quantity", "qty", "volume", "jumlah"]);
  const unitColumn = pickColumn(columns, ["satuan", "unit", "unit_label", "uom"]);
  const cooperativeColumn = columns.has("koperasi_ref") ? "koperasi_ref" : null;

  if (!productColumn || !amountColumn) return [];

  const productExpr = textExpression(productColumn, "Produk tanpa nama");
  const amountExpr = numericExpression(amountColumn);
  const quantityExpr = numericExpression(quantityColumn);
  const unitExpr = textExpression(unitColumn, "unit");
  const unitPriceExpr = quantityColumn ? `SUM(${amountExpr}) / NULLIF(SUM(${quantityExpr}), 0)` : "NULL::numeric";
  const areaFilter = cooperativeColumn
    ? `AND (
         $2::text = ''
         OR EXISTS (
           SELECT 1
           FROM referensi_koperasi_wilayah rkw
           JOIN referensi_wilayah rw ON rw.kode_wilayah = rkw.kode_wilayah
           WHERE rkw.koperasi_ref = transaksi_penjualan.${quoteIdentifier(cooperativeColumn)}
             AND (
               rw.provinsi ILIKE $3
               OR rw.kab_kota ILIKE $3
               OR rw.kecamatan ILIKE $3
             )
         )
       )`
    : "";

  const rows = await queryHackathonRows<{
    productName: string;
    unitLabel: string;
    transactions: number;
    amountTotal: string;
    quantityTotal: string;
    unitPrice: string | null;
    averageTransactionValue: string;
  }>(
    `SELECT COALESCE(NULLIF(BTRIM(${productExpr}), ''), 'Produk tanpa nama') AS "productName",
            COALESCE(NULLIF(BTRIM(${unitExpr}), ''), 'unit') AS "unitLabel",
            COUNT(*)::int AS transactions,
            COALESCE(SUM(${amountExpr}), 0)::text AS "amountTotal",
            COALESCE(SUM(${quantityExpr}), 0)::text AS "quantityTotal",
            (${unitPriceExpr})::text AS "unitPrice",
            AVG(NULLIF(${amountExpr}, 0))::text AS "averageTransactionValue"
     FROM transaksi_penjualan
     WHERE LOWER(${productExpr}) ~* $1
       AND ${amountExpr} > 0
       ${areaFilter}
     GROUP BY 1, 2
     ORDER BY COUNT(*) DESC, COALESCE(SUM(${amountExpr}), 0) DESC
     LIMIT 4`,
    [commodityPattern(commodity), areaHint, `%${areaHint}%`],
  ).catch(() => []);

  if (!rows.length) return [];

  const productTypes = new Set(rows.map((row) => String(row.productName ?? "").trim()).filter(Boolean)).size;
  const transactions = rows.reduce((total, row) => total + Number(row.transactions ?? 0), 0);
  const amountTotal = rows.reduce((total, row) => total + safeAmount(row.amountTotal), 0);
  const quantityTotal = rows.reduce((total, row) => total + safeAmount(row.quantityTotal), 0);
  const unitPrice = quantityTotal > 0 ? amountTotal / quantityTotal : 0;
  const pricePart =
    unitPrice > 0
      ? `estimasi nilai per unit dari total transaksi ${formatRupiah(unitPrice)}`
      : "kuantitas belum cukup bersih untuk estimasi harga per unit";
  return [
    `Data eksplorasi transaksi menemukan ${transactions} transaksi terkait ${commodity} dari ${productTypes} tipe produk; total nilai ${formatRupiah(amountTotal)}; ${pricePart}.`,
  ];
}

async function buildDataBackedPriceEvidence(input: RunToolsInput, commodity: string, areaHint: string) {
  const [localEvidence, inventoryEvidence, productEvidence, transactionEvidence] = await Promise.all([
    localPriceEvidence(input, commodity, areaHint),
    sharedInventoryPriceEvidence(commodity, areaHint).catch(() => []),
    sharedProductAvailabilityEvidence(commodity, areaHint).catch(() => []),
    sharedTransactionPriceEvidence(commodity, areaHint).catch(() => []),
  ]);

  return [...localEvidence, ...transactionEvidence, ...inventoryEvidence, ...productEvidence].slice(0, 6);
}

async function priceContextTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const commodity = extractCommodityKeyword(input.message) || "komoditas yang ditanya";
  const areaHint = extractAreaHint(input.message, input.cooperativeRegency);
  const priceContext = buildPriceCheckNegotiationData(commodity, areaHint);
  const dataEvidence = await buildDataBackedPriceEvidence(input, commodity, areaHint);
  const hasNumericPrice = dataEvidence.some((line) => /Rp\d/i.test(line));
  return result("price_check.context", scope, dataEvidence.length ? "ready" : "restricted", "Tool harga membaca data operasional/shared DB; angka hanya muncul bila tersedia di data.", [
    `Komoditas: ${priceContext.commodity}; area: ${priceContext.area || "belum disebut"}.`,
    ...dataEvidence,
    dataEvidence.length
      ? hasNumericPrice
        ? "Angka di atas berasal dari field harga/nilai/kuantitas yang tersedia di data."
        : "Data yang tersedia belum memuat harga satuan eksplisit, sehingga agent tidak mengeluarkan angka harga/kg."
      : "Belum ada produk/harga/price_signal yang cocok di data untuk komoditas dan wilayah ini.",
    `Input wajib: ${priceContext.requiredInputs.slice(0, 4).join(", ")}.`,
    `Caveat: ${priceContext.caveat}`,
  ], "Tidak boleh mengunci harga, floor price, atau negosiasi final tanpa sumber harga resmi/operator.");
}

async function stockTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const keyword = extractCommodityKeyword(input.message);
  const rows = await queryRows<{ id: string; name: string; unit: string; state: string; location: string; restockRequested: boolean }>(
    `SELECT id, name, unit, state, location, restock_requested AS "restockRequested"
     FROM stock_items
     WHERE cooperative_id = $1
       AND ($2::text = '' OR name ILIKE $3 OR location ILIKE $3 OR state ILIKE $3)
     ORDER BY updated_at DESC
     LIMIT 6`,
    [input.cooperativeId, keyword, `%${keyword}%`],
  ).catch(() => []);
  const evidence = rows.map((row) => `${row.name}: ${row.state}; unit ${row.unit}; lokasi ${row.location}${row.restockRequested ? "; restock diajukan" : ""}`);
  return result("stock_items.search", scope, evidence.length ? "ready" : "empty", evidence.length ? "Stok ditemukan dari data operasional." : "Stok spesifik belum ditemukan.", evidence);
}

async function stockLedgerTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const rows = await queryRows<{ stockName: string; movementType: string; quantity: string; unitLabel: string; readinessStatus: string }>(
    `SELECT stock.name AS "stockName",
            ledger.movement_type AS "movementType",
            ledger.quantity::text AS quantity,
            ledger.unit_label AS "unitLabel",
            ledger.readiness_status AS "readinessStatus"
     FROM anak_sarengklek_stock_ledger ledger
     JOIN stock_items stock ON stock.id = ledger.stock_item_id
     WHERE ledger.cooperative_id = $1
     ORDER BY ledger.created_at DESC
     LIMIT 5`,
    [input.cooperativeId],
  ).catch(() => []);
  const evidence = rows.map((row) => `${row.stockName}: ${row.movementType} ${row.quantity} ${row.unitLabel}; ${row.readinessStatus}`);
  return result("stock_ledger.recent", scope, evidence.length ? "ready" : "empty", "Riwayat stok terakhir tanpa data pribadi.", evidence);
}

async function buyerMatchTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const keyword = extractCommodityKeyword(input.message);
  const rows = await queryRows<{ buyer: string; need: string; matchScore: number; reason: string; status: string }>(
    `SELECT buyer, need, match_score AS "matchScore", reason, status
     FROM buyer_matches
     WHERE cooperative_id = $1
       AND ($2::text = '' OR buyer ILIKE $3 OR need ILIKE $3 OR reason ILIKE $3)
     ORDER BY match_score DESC
     LIMIT 5`,
    [input.cooperativeId, keyword, `%${keyword}%`],
  ).catch(() => []);
  const evidence = rows.map((row) => `${row.buyer}: kebutuhan ${row.need}; skor ${row.matchScore}/100; status ${row.status}; ${row.reason}`);
  return result("buyer_match.archetype", scope, evidence.length ? "ready" : "empty", "Buyer hanya archetype/readiness, bukan nama pihak atau komitmen offtake.", evidence, "Tidak boleh mengirim outreach buyer tanpa approval pengurus.");
}

async function buyerRequirementTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const keyword = extractCommodityKeyword(input.message);
  const rows = await queryRows<{ buyerArchetype: string; productName: string; requiredQuantity: string; unitLabel: string; qualitySpec: string; verificationStatus: string; notes: string }>(
    `SELECT buyer_archetype AS "buyerArchetype",
            product_name AS "productName",
            required_quantity::text AS "requiredQuantity",
            unit_label AS "unitLabel",
            quality_spec AS "qualitySpec",
            verification_status AS "verificationStatus",
            notes
     FROM anak_sarengklek_buyer_requirements
     WHERE cooperative_id = $1
       AND ($2::text = '' OR product_name ILIKE $3 OR buyer_archetype ILIKE $3 OR quality_spec ILIKE $3)
     ORDER BY updated_at DESC
     LIMIT 5`,
    [input.cooperativeId, keyword, `%${keyword}%`],
  ).catch(() => []);
  const evidence = rows.map((row) => `${row.productName}: ${row.requiredQuantity} ${row.unitLabel}; ${row.qualitySpec}; ${row.verificationStatus}; ${row.buyerArchetype}`);
  return result("buyer_requirement.readiness", scope, evidence.length ? "ready" : "empty", "Requirement buyer dibaca sebagai readiness internal.", evidence, "Tidak boleh menyebut requirement sebagai pesanan final.");
}

async function financeTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const rows = await queryRows<{ status: string; requests: string; totalAmount: string; risks: string }>(
    `SELECT status,
            COUNT(*)::text AS requests,
            COALESCE(SUM(amount), 0)::text AS "totalAmount",
            STRING_AGG(DISTINCT risk, '; ' ORDER BY risk) AS risks
     FROM finance_requests
     WHERE cooperative_id = $1
     GROUP BY status
     ORDER BY COUNT(*) DESC
     LIMIT 5`,
    [input.cooperativeId],
  ).catch(() => []);
  const totalRequests = rows.reduce((total, row) => total + Number(row.requests || 0), 0);
  const totalAmount = rows.reduce((total, row) => total + safeAmount(row.totalAmount), 0);
  const evidence = rows.map((row) => `${row.status}: ${row.requests} request; total ${safeAmount(row.totalAmount).toLocaleString("id-ID")}; risk flag ${row.risks || "belum ada"}`);
  return result("finance_readiness.aggregate", scope, evidence.length ? "restricted" : "empty", `Agregat pembiayaan: ${totalRequests} request, total ${totalAmount.toLocaleString("id-ID")}.`, evidence, "Tidak mengembalikan nama anggota, kontak, atau keputusan pembiayaan otomatis.");
}

async function mediaEvidenceTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const rows = await queryRows<{ relatedRecordType: string; relatedRecordId: string; mediaType: string; redactedLabel: string; caption: string; verificationStatus: string }>(
    `SELECT related_record_type AS "relatedRecordType",
            related_record_id AS "relatedRecordId",
            media_type AS "mediaType",
            redacted_label AS "redactedLabel",
            caption,
            verification_status AS "verificationStatus"
     FROM anak_sarengklek_media_evidence
     WHERE cooperative_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [input.cooperativeId],
  ).catch(() => []);
  const evidence = rows.map((row) => `${row.redactedLabel}: ${row.mediaType}; ${row.verificationStatus}; terkait ${row.relatedRecordType}/${row.relatedRecordId}; ${row.caption}`);
  return result("media_evidence.redacted", scope, evidence.length ? "ready" : "empty", "Bukti media hanya ditampilkan sebagai metadata tersaring.", evidence, "Tidak mengembalikan storage URI atau raw media.");
}

async function operatorQueueTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const rows = await queryRows<{ id: string; source: string; summary: string; status: string; module: string }>(
    `SELECT id, source, summary, status, module
     FROM operator_queue
     WHERE cooperative_id = $1
     ORDER BY created_at DESC
     LIMIT 6`,
    [input.cooperativeId],
  ).catch(() => []);
  const evidence = rows.map((row) => `${row.id}: ${row.module}; ${row.status}; ${row.summary}; sumber ${row.source}`);
  return result("operator_queue.safe_summary", scope, evidence.length ? "ready" : "empty", "Antrean operator dikembalikan sebagai ID dan ringkasan kerja.", evidence, "Sender/PII tidak digunakan untuk jawaban agent.");
}

async function waHistoryTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const rows = await queryRows<{ intent: string; module: string; status: string; message: string }>(
    `SELECT intent, module, status, message
     FROM wa_messages
     WHERE cooperative_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [input.cooperativeId],
  ).catch(() => []);
  const evidence = rows.map((row) => `${row.intent}: ${row.module}; ${row.status}; ${row.message.slice(0, 140)}`);
  return result("wa_history.safe_recent", scope, evidence.length ? "ready" : "empty", "Riwayat WA dibaca tanpa nomor telepon/raw JID.", evidence, "Tidak menampilkan sender asli, nomor telepon, atau provider payload.");
}

async function agentRunsTool(input: RunToolsInput, scope: AgentToolScope): Promise<AgentToolResult> {
  const rows = await queryRows<{ agentName: string; status: string; output: string; nextAction: string }>(
    `SELECT agent_name AS "agentName", status, output, next_action AS "nextAction"
     FROM agent_runs
     WHERE cooperative_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [input.cooperativeId],
  ).catch(() => []);
  const evidence = rows.map((row) => `${row.agentName}: ${row.status}; ${row.output.slice(0, 120)}; next ${row.nextAction.slice(0, 100)}`);
  return result("agent_runs.recent", scope, evidence.length ? "ready" : "empty", "Run agent terakhir dipakai sebagai konteks internal.", evidence);
}

function integrationTool(scope: AgentToolScope): AgentToolResult {
  return result("integration.safe_status", scope, "ready", "Status integrasi harus dibaca dari health runtime, bukan klaim manual.", [
    "WA personal bridge boleh dipakai untuk testing; Cloud API resmi tetap terpisah.",
    "AI provider hanya diklaim aktif jika env provider tersedia.",
    "Shared DB hackathon hanya evidence agregat/read-only.",
  ]);
}

async function runToolByName(tool: string, scope: AgentToolScope, input: RunToolsInput) {
  if (tool === "commodity_profile.search") return commodityProfileTool(input, scope);
  if (tool === "village_commodity.search") return villageCommodityTool(input, scope);
  if (tool === "price_check.context") return priceContextTool(input, scope);
  if (tool === "stock_items.search") return stockTool(input, scope);
  if (tool === "stock_ledger.recent") return stockLedgerTool(input, scope);
  if (tool === "buyer_match.archetype") return buyerMatchTool(input, scope);
  if (tool === "buyer_requirement.readiness") return buyerRequirementTool(input, scope);
  if (tool === "finance_readiness.aggregate") return financeTool(input, scope);
  if (tool === "media_evidence.redacted") return mediaEvidenceTool(input, scope);
  if (tool === "operator_queue.safe_summary") return operatorQueueTool(input, scope);
  if (tool === "wa_history.safe_recent") return waHistoryTool(input, scope);
  if (tool === "agent_runs.recent") return agentRunsTool(input, scope);
  if (tool === "integration.safe_status") return integrationTool(scope);
  return result(tool, scope, "error", "Tool belum terdaftar.", []);
}

function handoffHintsForScope(scope: AgentToolScope) {
  if (scope === "buyer") return ["Jika harga/grade belum jelas, handoff ke Agen Harga dan Negosiasi sebelum buyer outreach."];
  if (scope === "harga") return ["Jika user ingin menjual, handoff ke Buyer Matching setelah grade, volume, lokasi, dan harga indikatif lengkap."];
  if (scope === "finance") return ["Jika data pembiayaan kurang, minta nominal, tujuan, rencana bayar, dan bukti usaha sebelum review komite."];
  if (scope === "stok") return ["Jika stok siap dijual, handoff ke Harga lalu Buyer; jika stok habis, buat follow-up restock/operator."];
  if (scope === "document") return ["Hasil OCR/PDF dipakai sebagai bukti awal; keputusan tetap menunggu operator."];
  return ["Gunakan jawaban otomatis untuk informasi; buat antrean hanya jika perlu approval atau verifikasi manual."];
}

export async function runScopedAgentTools(input: RunToolsInput): Promise<AgentToolRunSummary> {
  const scope = scopeForAgent(input.agentName, input.module, input.message);
  const toolNames = TOOL_SCOPES[scope];
  const tools = await Promise.all(
    toolNames.map((toolName) =>
      runToolByName(toolName, scope, input).catch((error) =>
        result(toolName, scope, "error", error instanceof Error ? error.message : "Tool gagal dijalankan.", []),
      ),
    ),
  );
  const evidenceLines = tools.flatMap((tool) => tool.evidence.map((line) => `${tool.tool}: ${line}`)).slice(0, 8);
  const restrictions = Array.from(new Set(tools.map((tool) => tool.restriction).filter(Boolean) as string[]));
  return {
    scope,
    tools,
    evidenceLines,
    restrictions,
    handoffHints: handoffHintsForScope(scope),
  };
}

export function agentToolRegistrySummary() {
  return Object.entries(TOOL_SCOPES).map(([scope, tools]) => ({
    scope,
    tools,
    restrictions:
      scope === "finance"
        ? ["aggregate-only", "no automatic approval", "no member identity"]
        : scope === "buyer"
          ? ["archetype-only", "approval before outreach"]
          : scope === "document"
            ? ["metadata-only", "no raw storage uri"]
            : ["scope-limited"],
  }));
}

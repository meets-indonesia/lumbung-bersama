import { NextResponse } from "next/server";
import { petaLayers } from "@/lib/demo-data";
import { dbRequiredResponse, isDatabaseConfigured, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type AnalyzeRequest = {
  villageCode?: string;
  commodity?: string;
  selectedLayers?: string[];
};

const layerIds = new Set<string>(petaLayers.map((layer) => layer.id));

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const body = (await request.json().catch(() => ({}))) as AnalyzeRequest;
  const villages = await queryRows<{
    code: string;
    name: string;
    district: string;
    regency: string;
    province: string;
  }>(
    `SELECT code, name, district, regency, province
     FROM villages
     WHERE code = COALESCE($1, code)
     ORDER BY updated_at DESC
     LIMIT 1`,
    [body.villageCode || null],
  );
  const village = villages[0];

  if (!village) {
    return NextResponse.json({ error: "VILLAGE_NOT_FOUND" }, { status: 404 });
  }

  const commodities = await queryRows<{
    name: string;
    supply: string;
    demand: string;
    quantity: string;
    priceSignal: string;
    opportunity: string;
    risk: string;
  }>(
    `SELECT name, supply, demand, quantity, price_signal AS "priceSignal", opportunity, risk
     FROM village_commodities
     WHERE village_code = $1
     ORDER BY CASE WHEN name = $2 THEN 0 ELSE 1 END, name ASC
     LIMIT 1`,
    [village.code, body.commodity || null],
  );
  const commodity = commodities[0];

  if (!commodity) {
    return NextResponse.json({ error: "COMMODITY_NOT_FOUND" }, { status: 404 });
  }

  const selectedLayers =
    body.selectedLayers?.filter((layer) => layerIds.has(layer)) ??
    petaLayers.map((layer) => layer.id);

  const assets = await queryRows<{ type: string }>(
    "SELECT type FROM village_assets WHERE village_code = $1",
    [village.code],
  );
  const visibleAssets = assets.filter((asset) => selectedLayers.includes(asset.type));
  const hasUmkm = assets.some((asset) => asset.type === "umkm");
  const hasWarehouse = assets.some((asset) => asset.type === "warehouse");
  const hasCooperative = assets.some((asset) => asset.type === "cooperative");
  const isSurplus = commodity.supply.toLowerCase().includes("surplus");
  const isHighDemand = commodity.demand.toLowerCase().includes("tinggi");

  const score =
    35 +
    (isSurplus ? 20 : 8) +
    (isHighDemand ? 15 : 7) +
    (hasUmkm ? 12 : 0) +
    (hasWarehouse ? 8 : 0) +
    (hasCooperative ? 10 : 0);

  const firstActions = [
    `Validasi pasokan ${commodity.name.toLowerCase()} dari minimal 5 warga melalui WhatsApp.`,
    hasUmkm
      ? "Undang UMKM pengolah lokal untuk produksi awal skala kecil."
      : "Cari UMKM pengolah atau bentuk unit produksi koperasi.",
    hasWarehouse
      ? "Cek kapasitas gudang dan jadwal pickup agar barang tidak menumpuk."
      : "Petakan kebutuhan gudang sementara sebelum produksi dinaikkan.",
    "Siapkan buyer atau warung mitra sebelum produksi diperbesar.",
  ];

  const waScript = `Halo, koperasi melihat peluang ${commodity.opportunity.toLowerCase()} dari ${commodity.name.toLowerCase()} di ${village.name}. Mohon kirim info pasokan minggu ini, lokasi, dan foto barang bila ada.`;

  return NextResponse.json({
    mode: process.env.OPENAI_API_KEY ? "provider-configured-rules-postgres" : "rules-postgres",
    village: {
      code: village.code,
      name: village.name,
      district: village.district,
      regency: village.regency,
      province: village.province,
    },
    commodity,
    selectedLayers,
    visibleAssets: visibleAssets.length,
    score: Math.min(score, 95),
    confidence: "Postgres, source-labeled",
    opportunity: {
      title: commodity.opportunity,
      whyNow: `${commodity.supply} dengan demand ${commodity.demand}. Sinyal harga: ${commodity.priceSignal}.`,
      firstActions,
      risk: commodity.risk,
      waScript,
    },
  });
}

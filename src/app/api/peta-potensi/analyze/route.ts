import { NextResponse } from "next/server";
import { petaLayers } from "@/lib/demo-data";
import { runAgentProvider } from "@/lib/ai-provider";
import { getHackathonDashboardEvidence } from "@/lib/hackathon-dashboard-evidence";
import { dbRequiredResponse, isDatabaseConfigured, queryRows } from "@/lib/postgres";

export const runtime = "nodejs";

type AnalyzeRequest = {
  villageCode?: string;
  areaCode?: string;
  areaLevel?: number;
  areaName?: string;
  commodity?: string;
  selectedLayers?: string[];
};

const layerIds = new Set<string>(petaLayers.map((layer) => layer.id));

function compactText(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function buildAnalysisCards(input: {
  areaName: string;
  commodityName: string;
  sourceLabel: string;
  supply: string;
  demand: string;
  quantity: string;
  priceSignal: string;
  risk: string;
  score: number;
  firstActions: string[];
}) {
  return [
    {
      label: "Peluang inti",
      value: `${input.commodityName} layak masuk prioritas awal di ${input.areaName}.`,
      detail: `Skor ${input.score}/100 dibaca dari potensi komoditas, kesiapan sumber, dan sinyal operasional yang tersedia.`,
    },
    {
      label: "Bukti sumber",
      value: input.sourceLabel,
      detail: `${compactText(input.supply, "Pasokan belum lengkap")} | ${compactText(input.demand, "Demand belum lengkap")} | ${compactText(input.quantity, "Volume perlu validasi")}.`,
    },
    {
      label: "Harga dan nego",
      value: compactText(input.priceSignal, "Harga perlu rujukan lokal hari ini"),
      detail: "Jangan pakai angka nego sebelum ada lokasi, grade, satuan, volume, dan ongkos angkut.",
    },
    {
      label: "Readiness stok",
      value: compactText(input.quantity, "Volume belum terkunci"),
      detail: "Kunci stok hanya bila ada bukti timbang/foto, tanggal siap, lokasi pickup, dan penanggung jawab operator.",
    },
    {
      label: "Buyer readiness",
      value: "Cek buyer setelah stok dan grade jelas",
      detail: "Buyer matching memakai tipe kebutuhan/archetype. Nama pihak, kontak, dan outreach tetap menunggu approval pengurus.",
    },
    {
      label: "Skor breakdown",
      value: `Sumber + ranking + confidence = ${input.score}/100`,
      detail: "Skor naik bila profil area spesifik, confidence baik, evidence eksplorasi terbaca, dan ada sinyal logistik/koperasi.",
    },
    {
      label: "Risiko lapangan",
      value: compactText(input.risk, "Risiko belum cukup data"),
      detail: "Risiko diperlakukan sebagai caveat verifikasi, bukan label gagal.",
    },
    {
      label: "Gap verifikasi",
      value: "Wilayah, grade, volume, harga, dan bukti lapangan",
      detail: "Tanpa lima data ini, hasil tetap rekomendasi awal dan belum boleh menjadi janji buyer, stok final, atau keputusan pembiayaan.",
    },
    {
      label: "Handoff agent",
      value: "Peta -> Harga -> Buyer/Stok -> Laporan",
      detail: "Jika warga mau jual, cek harga dan kualitas lebih dulu; jika layak, lanjut buyer matching atau kesiapan stok.",
    },
    {
      label: "Langkah terdekat",
      value: input.firstActions[0] ?? "Minta data bukti dari warga/operator.",
      detail: input.firstActions.slice(1, 4).join(" "),
    },
  ];
}

function buildValidationQuestions(commodityName: string, areaName: string) {
  return [
    `Di desa/kecamatan mana stok ${commodityName.toLowerCase()} siap dikumpulkan?`,
    "Berapa volume, satuan lokal, grade/kualitas, dan tanggal siap pickup?",
    "Ada foto barang, bukti timbang, nota, atau kontak petugas lapangan?",
    `Apakah ${areaName} punya gudang, titik kumpul, atau rute pickup yang sudah disetujui?`,
    "Harga rujukan hari ini berasal dari sumber mana dan berlaku untuk grade apa?",
    "Jika mau dijual, berapa batas harga bawah setelah ongkos angkut, sortasi, dan kemasan?",
    "Jika butuh pembiayaan, nominal, tujuan, dan rencana bayar sudah masuk akal terhadap volume panen?",
  ];
}

async function getSharedEvidenceContext() {
  const sharedEvidence = await getHackathonDashboardEvidence(true).catch(() => null);
  const sharedProductRows = sharedEvidence?.tables.productRows ?? [];
  const sharedAreaRows = sharedEvidence?.tables.areaRows ?? [];
  const sharedEvidenceSummary = sharedEvidence && "evidenceSummary" in sharedEvidence ? sharedEvidence.evidenceSummary : null;
  const totalSharedRows = sharedEvidenceSummary?.totalAggregateRows ?? 0;
  const sharedProductSummary = sharedProductRows
    .slice(0, 3)
    .map((row) => `${row.productCategory} (${row.rows} baris)`)
    .join(", ");
  const sharedAreaSummary = sharedAreaRows
    .slice(0, 3)
    .map((row) => `${row.province} (${row.commodityRows} baris komoditas)`)
    .join(", ");
  const sharedEvidenceBasis =
    sharedEvidence && sharedEvidence.status !== "setup-required"
      ? `Sumber eksplorasi agregat ${sharedEvidence.status}: ${totalSharedRows} baris agregat; kategori produk: ${sharedProductSummary || "belum ada"}; area: ${sharedAreaSummary || "belum ada"}.`
      : "Sumber eksplorasi agregat belum aktif untuk analisis ini.";
  const fallbackEvidenceNotes = [
    sharedEvidence?.status === "ready"
      ? `Evidence eksplorasi terbaca sebagai agregat tanpa PII: ${totalSharedRows} baris.`
      : "Evidence eksplorasi belum aktif atau parsial; gunakan hasil sebagai prioritas awal.",
    "Shared DB hackathon dipakai sebagai bahan eksplorasi terbatas, bukan referensi utama SIMKOPDES.",
  ];

  return {
    sharedEvidence,
    sharedEvidenceBasis,
    fallbackEvidenceNotes,
    responsePayload: sharedEvidence
      ? {
          status: sharedEvidence.status,
          mode: sharedEvidence.mode,
          tablePrefix: sharedEvidence.tablePrefix,
          totalAggregateRows: totalSharedRows,
          topProductCategories: sharedProductRows.slice(0, 3).map((row) => ({
            category: row.productCategory,
            rows: row.rows,
            inventoryRows: row.inventoryRows,
          })),
          topAreas: sharedAreaRows.slice(0, 3).map((row) => ({
            province: row.province,
            villages: row.villages,
            commodityRows: row.commodityRows,
            cooperatives: row.cooperatives,
          })),
          caveat:
            "Agregat eksplorasi membantu konteks peluang, tetapi tidak menjadi klaim operasional resmi atau komitmen buyer.",
        }
      : null,
  };
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return dbRequiredResponse();

  const body = (await request.json().catch(() => ({}))) as AnalyzeRequest;
  const selectedLayers =
    body.selectedLayers?.filter((layer) => layerIds.has(layer)) ??
    petaLayers.map((layer) => layer.id);

  if (body.areaCode) {
    const areaRows = await queryRows<{
      code: string;
      name: string;
      level: number;
      kind: string;
      sourceId: string;
      sourceVersion: string;
    }>(
      `SELECT code, name, level, kind, source_id AS "sourceId", source_version AS "sourceVersion"
       FROM administrative_areas
       WHERE code = $1
       LIMIT 1`,
      [body.areaCode],
    ).catch(() => []);
    const area = areaRows[0];

    if (!area && !body.villageCode) {
      return NextResponse.json({ error: "VILLAGE_NOT_FOUND" }, { status: 404 });
    }

    const areaProfiles = area
      ? await queryRows<{
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
        }>(
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
             AND source_level <> 'inherited-province-baseline'
           ORDER BY CASE WHEN $2::text IS NOT NULL AND LOWER(commodity) = LOWER($2::text) THEN 0 ELSE 1 END,
                    rank ASC,
                    commodity ASC
           LIMIT 1`,
          [area.code, body.commodity || null],
        ).catch(() => [])
      : [];
    const areaProfile = areaProfiles[0];

    if (area && areaProfile) {
      const sharedEvidenceContext = await getSharedEvidenceContext();
      const confidenceText = areaProfile.confidence.toLowerCase();
      const rankScore = areaProfile.rank <= 1 ? 22 : areaProfile.rank <= 3 ? 15 : 8;
      const confidenceScore = confidenceText.includes("high") || confidenceText.includes("tinggi")
        ? 18
        : confidenceText.includes("medium") || confidenceText.includes("sedang")
          ? 12
          : 7;
      const score = Math.min(92, 44 + rankScore + confidenceScore + (sharedEvidenceContext.sharedEvidence?.status === "ready" ? 6 : 0));
      const commodity = {
        name: areaProfile.commodity,
        supply: `Profil area ${area.name}`,
        demand: `Rank #${areaProfile.rank} sektor ${areaProfile.sector}`,
        quantity: "Perlu validasi stok operator",
        priceSignal: areaProfile.confidence || "source-labeled",
        opportunity: `Prioritaskan ${areaProfile.commodity} di ${area.name}`,
        risk: areaProfile.notes || "Stok, grade, harga, dan buyer masih perlu validasi operator.",
      };
      const firstActions = [
        `Validasi stok riil ${areaProfile.commodity.toLowerCase()} di ${area.name} melalui WA/operator.`,
        "Cek grade, kemasan, foto bukti, dan kesiapan pickup sebelum outreach buyer.",
        "Cocokkan produk dengan tipe kebutuhan buyer dan syarat volume minimum.",
        "Masukkan hasil validasi ke laporan aksi untuk persetujuan pengurus.",
      ];
      const waScript = `Halo, koperasi sedang memvalidasi peluang ${areaProfile.commodity.toLowerCase()} untuk ${area.name}. Mohon kirim stok minggu ini, grade/kualitas, lokasi pickup, dan foto bukti barang.`;
      const coverageBasis = [
        `Area aktif ${area.name} (${area.code}) level ${area.level}`,
        `Profil komoditas ${areaProfile.commodity}; rank ${areaProfile.rank}; sektor ${areaProfile.sector}; confidence ${areaProfile.confidence}`,
        `Sumber ${areaProfile.sourceName || areaProfile.sourceId}; ${areaProfile.sourceLevel}`,
        areaProfile.basis,
        areaProfile.notes,
        sharedEvidenceContext.sharedEvidenceBasis,
      ].filter(Boolean).join("; ");
      const provider = await runAgentProvider({
        agentName: "Agen Peta Potensi",
        agentJob:
          "Menyusun analisis peluang komoditas dari profil area peta, sumber komoditas, evidence eksplorasi agregat, dan kesiapan operator. Output harus human-reviewed.",
        recordId: `${area.code}:${areaProfile.commodity}`,
        caseSummary: `${area.name}: ${areaProfile.commodity}. Basis: ${areaProfile.basis}. Risiko/catatan: ${areaProfile.notes || "perlu validasi operator"}.`,
        caseSource: `Peta Unggulan ${areaProfile.sourceName || areaProfile.sourceId}`,
        caseStatus: "analisis awal peta",
        caseModule: "Peta Potensi Desa",
        commodityDetails: [
          `${areaProfile.commodity}: sektor ${areaProfile.sector}; rank ${areaProfile.rank}; confidence ${areaProfile.confidence}; source level ${areaProfile.sourceLevel}`,
          `Basis: ${areaProfile.basis}`,
          areaProfile.notes ? `Catatan: ${areaProfile.notes}` : "",
        ].filter(Boolean),
        coverageBasis,
      });
      const providerNotes = provider.suggestion?.evidenceNotes ?? [];
      const evidenceNotes = [...providerNotes, ...sharedEvidenceContext.fallbackEvidenceNotes].filter(Boolean).slice(0, 4);
      const providerActions = provider.suggestion
        ? [provider.suggestion.nextAction, ...provider.suggestion.checks.map((check) => `Cek ${check}`), ...firstActions]
            .filter(Boolean)
            .slice(0, 4)
        : firstActions;
      const analysisCards = buildAnalysisCards({
        areaName: area.name,
        commodityName: areaProfile.commodity,
        sourceLabel: areaProfile.sourceName || areaProfile.sourceId,
        supply: areaProfile.basis,
        demand: `Rank #${areaProfile.rank} sektor ${areaProfile.sector}`,
        quantity: "Volume belum terkunci; butuh stok WA/operator.",
        priceSignal: areaProfile.confidence,
        risk: commodity.risk,
        score,
        firstActions: providerActions,
      });
      const validationQuestions = buildValidationQuestions(areaProfile.commodity, area.name);

      return NextResponse.json({
        mode: provider.used ? provider.mode : `${provider.mode}-peta-area-profile`,
        provider: {
          configured: provider.configured,
          used: provider.used,
          label: provider.providerLabel,
          model: provider.model,
          errorCode: provider.errorCode ?? null,
        },
        area: {
          code: area.code,
          name: area.name,
          level: area.level,
          kind: area.kind,
          sourceId: area.sourceId,
          sourceVersion: area.sourceVersion,
        },
        commodity,
        selectedLayers,
        visibleAssets: 0,
        score,
        confidence: provider.used ? `AI provider ${provider.providerLabel} + profil area peta` : "source-labeled area profile",
        opportunity: {
          title: commodity.opportunity,
          whyNow: provider.suggestion?.output ?? `${areaProfile.basis} Sumber: ${areaProfile.sourceName || areaProfile.sourceId}.`,
          firstActions: providerActions,
          risk: commodity.risk,
          waScript,
          evidenceNotes,
          analysisCards,
          validationQuestions,
        },
        sharedEvidence: sharedEvidenceContext.responsePayload,
      });
    }

    if (area && !body.villageCode) {
      return NextResponse.json({ error: "COMMODITY_NOT_FOUND" }, { status: 404 });
    }
  }

  const villages = await queryRows<{
    code: string;
    name: string;
    district: string;
    regency: string;
    province: string;
  }>(
    `SELECT code, name, district, regency, province
     FROM villages
     WHERE code = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [body.villageCode || ""],
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
  const sharedEvidenceContext = await getSharedEvidenceContext();
  const coverageBasis = [
    `${visibleAssets.length} aset terlihat dari layer aktif`,
    hasCooperative ? "ada aset koperasi" : "aset koperasi belum terlihat",
    hasWarehouse ? "ada gudang/logistik" : "gudang/logistik perlu dipetakan",
    hasUmkm ? "ada UMKM pengolah" : "UMKM pengolah perlu dipetakan",
    `${commodity.supply}; demand ${commodity.demand}; sinyal harga ${commodity.priceSignal}`,
    sharedEvidenceContext.sharedEvidenceBasis,
  ].join("; ");
  const provider = await runAgentProvider({
    agentName: "Agen Peta Potensi",
    agentJob:
      "Menyusun analisis peluang komoditas desa dari data peta, aset, stok, risiko harga, dan kesiapan operator. Output harus human-reviewed.",
    recordId: `${village.code}:${commodity.name}`,
    caseSummary: `${village.name}, ${village.district}, ${village.regency}: ${commodity.name}. ${commodity.opportunity}. Risiko: ${commodity.risk}.`,
    caseSource: "Peta Unggulan operational map data",
    caseStatus: "analisis awal peta",
    caseModule: "Peta Potensi Desa",
    commodityDetails: [
      `${commodity.name}: ${commodity.supply}; ${commodity.quantity}; demand ${commodity.demand}; harga ${commodity.priceSignal}; peluang ${commodity.opportunity}; risiko ${commodity.risk}`,
      ...visibleAssets.slice(0, 6).map((asset) => `Aset ${asset.type}`),
    ],
    coverageBasis,
  });
  const providerNotes = provider.suggestion?.evidenceNotes ?? [];
  const evidenceNotes = [...providerNotes, ...sharedEvidenceContext.fallbackEvidenceNotes].filter(Boolean).slice(0, 4);
  const providerActions = provider.suggestion
    ? [provider.suggestion.nextAction, ...provider.suggestion.checks.map((check) => `Cek ${check}`), ...firstActions]
        .filter(Boolean)
        .slice(0, 4)
    : firstActions;
  const finalScore = Math.min(score, 95);
  const analysisCards = buildAnalysisCards({
    areaName: village.name,
    commodityName: commodity.name,
    sourceLabel: "Peta Unggulan operational map data",
    supply: commodity.supply,
    demand: commodity.demand,
    quantity: commodity.quantity,
    priceSignal: commodity.priceSignal,
    risk: commodity.risk,
    score: finalScore,
    firstActions: providerActions,
  });
  const validationQuestions = buildValidationQuestions(commodity.name, village.name);

  return NextResponse.json({
    mode: provider.used ? provider.mode : `${provider.mode}-peta-rules`,
    provider: {
      configured: provider.configured,
      used: provider.used,
      label: provider.providerLabel,
      model: provider.model,
      errorCode: provider.errorCode ?? null,
    },
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
    score: finalScore,
    confidence: provider.used ? `AI provider ${provider.providerLabel} + data peta` : "source-labeled operational data",
    opportunity: {
      title: commodity.opportunity,
      whyNow: provider.suggestion?.output ?? `${commodity.supply} dengan demand ${commodity.demand}. Sinyal harga: ${commodity.priceSignal}.`,
      firstActions: providerActions,
      risk: commodity.risk,
      waScript,
      evidenceNotes,
      analysisCards,
      validationQuestions,
    },
    sharedEvidence: sharedEvidenceContext.responsePayload,
  });
}

import { queryRows } from "@/lib/postgres";
import {
  borrowerRiskGuardrailPolicy,
  businessAnalystPlaybook,
  commodityMarketSignalPolicy,
  priceCheckNegotiationPlaybook,
  sourceGroundingPolicy,
} from "@/lib/demo-data";

export type CommodityProfileSummary = {
  areaCode: string;
  areaLevel: number;
  areaName: string;
  provinceName: string;
  commodity: string;
  sector: string;
  rank: number;
  sourceLevel: string;
  confidence: string;
  basis: string;
};

export type CommodityCoverageSummary = {
  totalAreas: number;
  totalProfiles: number;
  totalVillages: number;
  totalProvinces: number;
  directVillageProfiles: number;
  legacyInheritedProfiles: number;
};

const COMMODITY_KEYWORDS = [
  "padi",
  "beras",
  "jagung",
  "singkong",
  "kopi",
  "cabai",
  "kakao",
  "kelapa",
  "sawit",
  "karet",
  "lada",
  "rumput laut",
  "ikan",
  "sagu",
  "tebu",
  "nilam",
  "pala",
  "cengkeh",
  "sapi",
];

function findCommodityKeyword(text: string) {
  const normalized = text.toLowerCase();
  return COMMODITY_KEYWORDS.find((keyword) => normalized.includes(keyword)) ?? "";
}

export async function getCommodityCoverageSummary(): Promise<CommodityCoverageSummary> {
  const rows = await queryRows<{
    totalAreas: string;
    totalProfiles: string;
    totalVillages: string;
    totalProvinces: string;
    directVillageProfiles: string;
    legacyInheritedProfiles: string;
  }>(
    `SELECT COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalAreas",
            COUNT(CASE WHEN source_level <> 'inherited-province-baseline' THEN 1 END)::text AS "totalProfiles",
            COUNT(DISTINCT CASE WHEN area_level = 4 AND source_level <> 'inherited-province-baseline' THEN area_code END)::text AS "totalVillages",
            COUNT(DISTINCT CASE WHEN source_level <> 'inherited-province-baseline' THEN province_code END)::text AS "totalProvinces",
            COUNT(CASE WHEN source_level = 'inherited-province-baseline' THEN 1 END)::text AS "legacyInheritedProfiles",
            COUNT(CASE WHEN area_level = 4 AND source_level = 'direct-village' THEN 1 END)::text AS "directVillageProfiles"
     FROM regional_commodity_profiles`,
  );
  const row = rows[0];

  return {
    totalAreas: Number(row?.totalAreas ?? 0),
    totalProfiles: Number(row?.totalProfiles ?? 0),
    totalVillages: Number(row?.totalVillages ?? 0),
    totalProvinces: Number(row?.totalProvinces ?? 0),
    directVillageProfiles: Number(row?.directVillageProfiles ?? 0),
    legacyInheritedProfiles: Number(row?.legacyInheritedProfiles ?? 0),
  };
}

export async function getProvinceCommodityProfiles(provinceName: string, limit = 4) {
  if (!provinceName) return [];

  return queryRows<CommodityProfileSummary>(
    `SELECT area_code AS "areaCode",
            area_level AS "areaLevel",
            area_name AS "areaName",
            province_name AS "provinceName",
            commodity,
            sector,
            rank,
            source_level AS "sourceLevel",
            confidence,
            basis
     FROM regional_commodity_profiles
     WHERE province_name ILIKE $1
       AND area_level = 1
       AND source_level <> 'inherited-province-baseline'
     ORDER BY rank ASC
     LIMIT $2`,
    [`%${provinceName}%`, limit],
  );
}

export async function findCommodityProfilesForMessage(message: string, provinceName: string, limit = 4) {
  const keyword = findCommodityKeyword(message);

  if (keyword) {
    const directRows = await queryRows<CommodityProfileSummary>(
      `SELECT area_code AS "areaCode",
              area_level AS "areaLevel",
              area_name AS "areaName",
              province_name AS "provinceName",
              commodity,
              sector,
              rank,
              source_level AS "sourceLevel",
              confidence,
              basis
       FROM regional_commodity_profiles
       WHERE commodity ILIKE $1
         AND source_level <> 'inherited-province-baseline'
       ORDER BY
         CASE WHEN province_name ILIKE $2 THEN 0 ELSE 1 END,
         CASE area_level WHEN 4 THEN 0 WHEN 3 THEN 1 WHEN 2 THEN 2 ELSE 3 END,
         rank ASC
       LIMIT $3`,
      [`%${keyword}%`, `%${provinceName}%`, limit],
    );

    if (directRows.length) return directRows;
  }

  return getProvinceCommodityProfiles(provinceName, limit);
}

export function describeCommodityProfiles(profiles: CommodityProfileSummary[]) {
  if (!profiles.length) return [];

  return profiles.map((profile) => {
    const sourceNote =
      profile.sourceLevel === "direct-village"
        ? "data langsung desa"
        : profile.sourceLevel === "province-baseline"
          ? "baseline provinsi"
          : "baseline provinsi yang diwariskan";

    return `${profile.commodity} (${profile.areaName}, ${sourceNote}; confidence: ${profile.confidence})`;
  });
}

export type SourceCaveatFields = {
  sourceLabel: string;
  sourceType: string;
  freshness: string;
  confidence: string;
  caveat: string;
  humanReview: string;
};

export type MarketSignalStatus = "available" | "rate-limited" | "unavailable";

export type MarketSignalInput = {
  commodity: string;
  area?: string;
  itemCount: number;
  status: MarketSignalStatus;
  latestSeenDate?: string;
  errorMessage?: string;
};

export type FinancingAnalystInput = {
  totalRequests: number;
  totalAmount: string;
  draftRequests: number;
  requestedRequests: number;
  verifiedRequests: number;
  unverifiedRequests: number;
  verificationRate: number | null;
  missingStatus: number;
  missingChannel: number;
  missingAmount: number;
};

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Number((numerator / denominator).toFixed(4));
}

function sourceConfidence(level: "limited" | "medium" | "high", basis: string) {
  return {
    level,
    basis,
    caveat: sourceGroundingPolicy.caveat,
  };
}

export function buildSourceCaveatFields(
  sourceLabel: string,
  confidence: "limited" | "medium" | "high" = "limited",
  sourceType = "aggregate-or-context",
): SourceCaveatFields {
  return {
    sourceLabel,
    sourceType,
    freshness: sourceGroundingPolicy.freshness,
    confidence,
    caveat: sourceGroundingPolicy.caveat,
    humanReview: sourceGroundingPolicy.humanReview,
  };
}

export function buildCommodityMarketSignal(input: MarketSignalInput) {
  const itemCount = Math.max(0, input.itemCount);
  const confidenceLevel = input.status === "available" && itemCount >= 3 ? "medium" : "limited";
  const statusNote =
    input.status === "available"
      ? itemCount > 0
        ? "news-context-available"
        : "no-news-context-returned"
      : input.status === "rate-limited"
        ? "source-rate-limited"
        : "source-unavailable";

  return {
    status: statusNote,
    commodity: input.commodity,
    area: input.area ?? "",
    sourceId: commodityMarketSignalPolicy.sourceId,
    sourceLabel: commodityMarketSignalPolicy.sourceLabel,
    sourceUrl: commodityMarketSignalPolicy.sourceUrl,
    role: commodityMarketSignalPolicy.role,
    itemCount,
    latestSeenDate: input.latestSeenDate ?? null,
    freshness: {
      generatedAt: new Date().toISOString(),
      window: commodityMarketSignalPolicy.freshnessWindow,
    },
    confidence: sourceConfidence(
      confidenceLevel,
      itemCount > 0
        ? `${itemCount} GDELT article context item(s) returned for the query.`
        : "No external article context was returned; use only as an unavailable-source caveat.",
    ),
    scoreUse: commodityMarketSignalPolicy.scoreUse,
    caveat: commodityMarketSignalPolicy.caveat,
    errorMessage: input.errorMessage ?? null,
  };
}

export function buildPriceCheckNegotiationData(commodity: string, area = "") {
  return {
    status: priceCheckNegotiationPlaybook.status,
    commodity,
    area,
    price: null,
    priceUnit: null,
    sourceLabel: "official price connector not returned",
    confidence: "limited",
    caveat: priceCheckNegotiationPlaybook.caveat,
    officialSourceCandidates: priceCheckNegotiationPlaybook.officialSourceCandidates,
    requiredInputs: [
      "commodity grade or quality class",
      "stock volume and unit",
      "packaging format",
      "pickup or delivery location",
      "target buyer archetype",
      "official regional price reference when available",
    ],
    negotiationChecklist: priceCheckNegotiationPlaybook.negotiationChecklist,
    nextAction:
      "Run an official price/source check or record source unavailable before drafting any buyer negotiation note.",
    humanReview: sourceGroundingPolicy.humanReview,
  };
}

export function buildBorrowerRiskGuardrails(input?: Partial<FinancingAnalystInput>) {
  const totalRequests = input?.totalRequests ?? 0;
  const verificationRate = input?.verificationRate ?? null;
  const flags = borrowerRiskGuardrailPolicy.riskFlags
    .map((flag) => {
      const affectedRows =
        flag.id === "missing-status"
          ? input?.missingStatus ?? 0
          : flag.id === "missing-channel-or-purpose"
            ? input?.missingChannel ?? 0
            : flag.id === "missing-amount"
              ? input?.missingAmount ?? 0
              : flag.id === "low-verification-rate" && verificationRate !== null && verificationRate < 0.1
                ? totalRequests
                : 0;

      return {
        ...flag,
        affectedRows,
        affectedRate: ratio(affectedRows, totalRequests),
        source: "pengajuan_pembiayaan aggregate",
      };
    })
    .filter((flag) => flag.affectedRows > 0);

  return {
    ...borrowerRiskGuardrailPolicy,
    source: "pengajuan_pembiayaan aggregate",
    confidence: totalRequests > 0 ? "medium" : "limited",
    triggeredFlags: flags,
    defaultDisposition: "needs verification",
    humanReview: sourceGroundingPolicy.humanReview,
  };
}

export function buildFinancingBusinessAnalystAggregate(input: FinancingAnalystInput) {
  const totalRequests = Math.max(input.totalRequests, 0);
  const requestedBacklog = Math.max(input.requestedRequests - input.verifiedRequests, 0);
  const verifiedShare = ratio(input.verifiedRequests, totalRequests);
  const draftShare = ratio(input.draftRequests, totalRequests);
  const requestedShare = ratio(input.requestedRequests, totalRequests);

  return {
    label: businessAnalystPlaybook.label,
    role: businessAnalystPlaybook.role,
    source: "pengajuan_pembiayaan aggregate",
    sourceCaveat: buildSourceCaveatFields("hackathon-shared-db-read-only", totalRequests > 0 ? "medium" : "limited"),
    totals: {
      requests: totalRequests,
      amount: input.totalAmount,
      draftRequests: input.draftRequests,
      requestedRequests: input.requestedRequests,
      verifiedRequests: input.verifiedRequests,
      unverifiedRequests: input.unverifiedRequests,
      requestedBacklog,
      verificationRate: input.verificationRate,
    },
    funnel: [
      {
        stage: "draft",
        requests: input.draftRequests,
        share: draftShare,
        nextAction: "Complete purpose, amount, stock/product evidence, and repayment plan draft.",
      },
      {
        stage: "requested",
        requests: input.requestedRequests,
        share: requestedShare,
        nextAction: "Prepare committee packet and check business evidence against stock and transaction signals.",
      },
      {
        stage: "verified",
        requests: input.verifiedRequests,
        share: verifiedShare,
        nextAction: "Route verified aggregate examples into the action report without claiming approval or disbursement.",
      },
    ],
    bottlenecks: [
      input.missingStatus > 0 ? `${input.missingStatus} request(s) missing status.` : "",
      input.missingChannel > 0 ? `${input.missingChannel} request(s) missing purpose/channel classification.` : "",
      input.missingAmount > 0 ? `${input.missingAmount} request(s) missing amount.` : "",
      requestedBacklog > 0 ? `${requestedBacklog} requested request(s) still need human verification.` : "",
    ].filter(Boolean),
    analystDimensions: businessAnalystPlaybook.dimensions,
    caveat: businessAnalystPlaybook.caveat,
    humanReview: sourceGroundingPolicy.humanReview,
  };
}

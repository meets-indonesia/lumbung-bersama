import { checkRateLimit, fetchWithTimeout } from "@/lib/external-fetch";
import {
  buildCommodityMarketSignal,
  buildPriceCheckNegotiationData,
  type MarketSignalStatus,
} from "@/lib/commodity-intelligence";

export const runtime = "nodejs";

type GdeltArticle = {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  sourceCountry?: string;
  language?: string;
};

type NewsItem = {
  title: string;
  url: string;
  domain: string;
  seenDate: string;
  source: string;
};

type CommodityNewsPayload = {
  source: string;
  sourceUrl: string;
  sourceStatus: MarketSignalStatus;
  query: {
    commodity: string;
    area: string;
    limit: number;
  };
  count: number;
  items: NewsItem[];
  freshness: {
    generatedAt: string;
    cacheTtlSeconds: number;
    caveat: string;
  };
  confidence: {
    level: "limited" | "medium";
    basis: string;
    caveat: string;
  };
  marketSignal: ReturnType<typeof buildCommodityMarketSignal>;
  priceCheck: ReturnType<typeof buildPriceCheckNegotiationData>;
  note: string;
  error?: string;
  message?: string;
};

type CachedNews = {
  expiresAt: number;
  payload: CommodityNewsPayload;
};

const cache = new Map<string, CachedNews>();

function sanitizeQueryPart(value: string) {
  return value.replace(/[^\p{L}\p{N}\s.-]/gu, " ").replace(/\s+/g, " ").trim();
}

function getCacheKey(commodity: string, area: string, limit: number) {
  return `${commodity.toLowerCase()}::${area.toLowerCase()}::${limit}`;
}

function buildCommodityNewsPayload(input: {
  commodity: string;
  area: string;
  limit: number;
  items: NewsItem[];
  sourceStatus: MarketSignalStatus;
  note: string;
  error?: string;
  message?: string;
}): CommodityNewsPayload {
  const latestSeenDate = input.items.find((item) => item.seenDate)?.seenDate;
  const marketSignal = buildCommodityMarketSignal({
    commodity: input.commodity,
    area: input.area,
    itemCount: input.items.length,
    status: input.sourceStatus,
    latestSeenDate,
    errorMessage: input.message,
  });

  return {
    source: "gdelt-doc-api",
    sourceUrl: "https://www.gdeltproject.org/",
    sourceStatus: input.sourceStatus,
    query: { commodity: input.commodity, area: input.area, limit: input.limit },
    count: input.items.length,
    items: input.items,
    freshness: {
      generatedAt: new Date().toISOString(),
      cacheTtlSeconds: 600,
      caveat: "Freshness follows the GDELT seen-date returned by the source and this endpoint cache window.",
    },
    confidence: {
      level: input.items.length >= 3 && input.sourceStatus === "available" ? "medium" : "limited",
      basis:
        input.items.length > 0
          ? `${input.items.length} contextual article(s) returned by GDELT for this query.`
          : "No article context was returned, so the endpoint exposes a guarded unavailable-source caveat.",
      caveat: "This is not an official price, demand, supply, stock, or production dataset.",
    },
    marketSignal,
    priceCheck: buildPriceCheckNegotiationData(input.commodity, input.area),
    note: input.note,
    error: input.error,
    message: input.message,
  };
}

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, "commodity-news", { limit: 30, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const { searchParams } = new URL(request.url);
  const commodity = sanitizeQueryPart(searchParams.get("commodity") ?? "");
  const area = sanitizeQueryPart(searchParams.get("area") ?? "");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 5), 1), 10);

  if (!commodity) {
    return Response.json(
      {
        error: "COMMODITY_REQUIRED",
        message: "Parameter commodity wajib diisi.",
      },
      { status: 400 },
    );
  }

  const cacheKey = getCacheKey(commodity, area, limit);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({ ...cached.payload, cached: true });
  }

  const searchText = [commodity, area, "Indonesia"].filter(Boolean).join(" ");
  const gdeltUrl = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  gdeltUrl.searchParams.set("query", searchText);
  gdeltUrl.searchParams.set("mode", "artlist");
  gdeltUrl.searchParams.set("format", "json");
  gdeltUrl.searchParams.set("maxrecords", String(limit));
  gdeltUrl.searchParams.set("sort", "hybridrel");

  try {
    const response = await fetchWithTimeout(gdeltUrl, {
      headers: { "User-Agent": "lumbung-bersama-commodity-news" },
      next: { revalidate: 60 * 10 },
    }, { timeoutMs: 6500, label: "GDELT commodity news" });

    if (response.status === 429) {
      return Response.json(
        buildCommodityNewsPayload({
          commodity,
          area,
          limit,
          items: [],
          sourceStatus: "rate-limited",
          note: "GDELT membatasi frekuensi request. Endpoint tetap mengembalikan caveat dan price-check checklist.",
          error: "COMMODITY_NEWS_RATE_LIMITED",
          message: "GDELT membatasi frekuensi request. Coba lagi beberapa detik lagi.",
        }),
      );
    }

    if (!response.ok) throw new Error(`GDELT gagal dimuat: ${response.status}`);

    const payload = (await response.json()) as { articles?: GdeltArticle[] };
    const items = (payload.articles ?? [])
      .filter((item): item is Required<Pick<GdeltArticle, "url" | "title">> & GdeltArticle => Boolean(item.url && item.title))
      .map((item) => ({
        title: item.title ?? "Artikel komoditas",
        url: item.url ?? "",
        domain: item.domain ?? new URL(item.url ?? "https://www.gdeltproject.org/").hostname,
        seenDate: item.seendate ?? "",
        source: "GDELT Doc API",
      }));

    const apiPayload = buildCommodityNewsPayload({
      commodity,
      area,
      limit,
      items,
      sourceStatus: "available",
      note: "Sinyal berita adalah konteks pasar/isu daerah, bukan data pasokan resmi.",
    });

    cache.set(cacheKey, { expiresAt: Date.now() + 1000 * 60 * 10, payload: apiPayload });
    return Response.json(apiPayload);
  } catch (error) {
    return Response.json(
      buildCommodityNewsPayload({
        commodity,
        area,
        limit,
        items: [],
        sourceStatus: "unavailable",
        error: "COMMODITY_NEWS_FAILED",
        message: error instanceof Error ? error.message : "Sinyal berita komoditas gagal dimuat.",
        note: "Sinyal berita tidak tersedia; gunakan caveat ini dan jangan menggantikan data produksi/pasokan resmi.",
      }),
    );
  }
}

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

type CachedNews = {
  expiresAt: number;
  payload: {
    source: string;
    sourceUrl: string;
    query: {
      commodity: string;
      area: string;
      limit: number;
    };
    count: number;
    items: NewsItem[];
    note: string;
  };
};

const cache = new Map<string, CachedNews>();

function sanitizeQueryPart(value: string) {
  return value.replace(/[^\p{L}\p{N}\s.-]/gu, " ").replace(/\s+/g, " ").trim();
}

function getCacheKey(commodity: string, area: string, limit: number) {
  return `${commodity.toLowerCase()}::${area.toLowerCase()}::${limit}`;
}

export async function GET(request: Request) {
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
    const response = await fetch(gdeltUrl, {
      headers: { "User-Agent": "lumbung-bersama-commodity-news" },
      next: { revalidate: 60 * 10 },
    });

    if (response.status === 429) {
      return Response.json({
        source: "gdelt-doc-api",
        sourceUrl: "https://www.gdeltproject.org/",
        query: { commodity, area, limit },
        count: 0,
        items: [],
        note: "GDELT membatasi frekuensi request. Coba lagi beberapa detik lagi.",
      });
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

    const apiPayload = {
      source: "gdelt-doc-api",
      sourceUrl: "https://www.gdeltproject.org/",
      query: { commodity, area, limit },
      count: items.length,
      items,
      note: "Sinyal berita adalah konteks pasar/isu daerah, bukan data pasokan resmi.",
    };

    cache.set(cacheKey, { expiresAt: Date.now() + 1000 * 60 * 10, payload: apiPayload });
    return Response.json(apiPayload);
  } catch (error) {
    return Response.json(
      {
        source: "gdelt-doc-api",
        sourceUrl: "https://www.gdeltproject.org/",
        error: "COMMODITY_NEWS_FAILED",
        message: error instanceof Error ? error.message : "Sinyal berita komoditas gagal dimuat.",
        query: { commodity, area, limit },
        count: 0,
        items: [],
        note: "Sinyal berita tidak boleh menggantikan data produksi/pasokan resmi.",
      },
      { status: 502 },
    );
  }
}

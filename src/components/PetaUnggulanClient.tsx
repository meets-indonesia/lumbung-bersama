"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSON as LeafletGeoJSON, Layer as LeafletLayer, Map as LeafletMap, PathOptions } from "leaflet";
import {
  ChevronRight,
  Database,
  ExternalLink,
  Filter,
  Layers3,
  Loader2,
  LocateFixed,
  Newspaper,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type CommodityProfile = {
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

type CommoditySearchResult = CommodityProfile & {
  id: string;
  areaLevel: number;
  areaName: string;
  provinceCode: string;
  provinceName: string;
  updatedAt: string;
};

type CommodityNewsItem = {
  title: string;
  url: string;
  domain: string;
  seenDate: string;
  source: string;
};

type DrillArea = {
  code: string;
  name: string;
  level: number;
  kind: string;
  parentCode: string | null;
  sourceId: string;
  sourceVersion: string;
  levelName: string;
  directChildren?: number;
  villages?: number;
  commodities?: CommodityProfile[];
  profiles?: CommodityProfile[];
};

type DrillData = {
  source: "postgres";
  selected: DrillArea;
  breadcrumbs: Array<{
    code: string;
    name: string;
    level: number;
    levelName: string;
  }>;
  summary: Record<string, number>;
  children: DrillArea[];
  note: string;
};

type AreaSearchResult = {
  code: string;
  name: string;
  level: number;
  kind: string;
  parentCode: string | null;
  sourceId: string;
  sourceVersion: string;
};

type BoundaryProperties = {
  code: string;
  name: string;
  level: number;
  lat: number;
  lng: number;
  source: string;
  sourceUrl: string;
};

type BoundaryPayload = {
  source: string;
  sourceUrl: string;
  level: number;
  parentCode: string;
  count: number;
  featureCollection: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: BoundaryProperties;
      geometry: unknown;
    }>;
  };
  note: string;
  error?: string;
  message?: string;
};

type Viewport = {
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
};

type FilterOverride = {
  commodity?: string;
  sector?: string;
};

const indonesiaViewport: Viewport = {
  center: [-2.6, 118.2],
  zoom: 5,
  bounds: [[-11.2, 94.5], [6.4, 141.3]],
};

const provinceViewports: Record<string, Viewport> = {
  "11": { center: [4.38, 96.9], zoom: 7, bounds: [[2.0, 94.7], [6.2, 98.4]] },
  "12": { center: [2.25, 99.2], zoom: 7, bounds: [[-0.1, 97.0], [4.4, 101.8]] },
  "13": { center: [-0.9, 100.45], zoom: 7, bounds: [[-3.2, 98.5], [0.9, 102.7]] },
  "14": { center: [0.45, 101.7], zoom: 7, bounds: [[-1.2, 100.0], [2.3, 103.9]] },
  "15": { center: [-1.6, 102.7], zoom: 7, bounds: [[-3.0, 101.0], [0.2, 104.6]] },
  "16": { center: [-3.15, 104.2], zoom: 7, bounds: [[-5.2, 102.0], [-1.2, 106.2]] },
  "17": { center: [-3.7, 102.35], zoom: 8, bounds: [[-5.5, 101.0], [-2.2, 103.8]] },
  "18": { center: [-4.85, 105.05], zoom: 8, bounds: [[-6.2, 103.6], [-3.4, 106.4]] },
  "19": { center: [-2.35, 106.25], zoom: 8, bounds: [[-3.5, 105.0], [-1.1, 108.3]] },
  "21": { center: [0.95, 104.55], zoom: 7, bounds: [[-1.1, 103.0], [3.3, 109.2]] },
  "31": { center: [-6.2, 106.82], zoom: 10, bounds: [[-6.4, 106.65], [-6.05, 107.05]] },
  "32": { center: [-6.9, 107.55], zoom: 8, bounds: [[-7.9, 105.1], [-5.8, 108.9]] },
  "33": { center: [-7.15, 110.25], zoom: 8, bounds: [[-8.2, 108.4], [-5.7, 111.8]] },
  "34": { center: [-7.85, 110.4], zoom: 9, bounds: [[-8.25, 110.0], [-7.5, 110.85]] },
  "35": { center: [-7.65, 112.7], zoom: 8, bounds: [[-8.8, 110.9], [-6.4, 114.7]] },
  "36": { center: [-6.35, 106.1], zoom: 8, bounds: [[-7.2, 105.1], [-5.8, 106.9]] },
  "51": { center: [-8.42, 115.15], zoom: 9, bounds: [[-8.9, 114.4], [-8.0, 115.8]] },
  "52": { center: [-8.65, 117.3], zoom: 8, bounds: [[-9.2, 115.7], [-8.0, 119.4]] },
  "53": { center: [-8.75, 121.1], zoom: 7, bounds: [[-10.6, 118.0], [-8.0, 125.2]] },
  "61": { center: [-0.15, 111.1], zoom: 7, bounds: [[-3.2, 108.6], [2.2, 114.3]] },
  "62": { center: [-1.55, 113.25], zoom: 7, bounds: [[-3.6, 111.0], [0.7, 116.0]] },
  "63": { center: [-3.05, 115.25], zoom: 8, bounds: [[-4.5, 114.0], [-1.9, 116.8]] },
  "64": { center: [0.5, 116.5], zoom: 7, bounds: [[-1.9, 113.8], [2.5, 119.4]] },
  "65": { center: [3.2, 116.4], zoom: 7, bounds: [[1.2, 114.3], [4.5, 118.2]] },
  "71": { center: [1.1, 124.6], zoom: 7, bounds: [[0.1, 122.0], [2.7, 126.9]] },
  "72": { center: [-1.1, 121.4], zoom: 7, bounds: [[-3.8, 119.4], [1.3, 123.6]] },
  "73": { center: [-3.7, 120.1], zoom: 7, bounds: [[-6.2, 118.6], [-1.7, 122.3]] },
  "74": { center: [-4.0, 122.1], zoom: 7, bounds: [[-6.4, 120.5], [-2.6, 124.7]] },
  "75": { center: [0.7, 122.45], zoom: 8, bounds: [[0.0, 121.2], [1.2, 123.6]] },
  "76": { center: [-2.6, 119.25], zoom: 8, bounds: [[-3.6, 118.2], [-1.3, 120.5]] },
  "81": { center: [-3.3, 129.4], zoom: 7, bounds: [[-8.4, 125.0], [0.3, 134.9]] },
  "82": { center: [0.8, 127.9], zoom: 7, bounds: [[-2.1, 124.8], [2.5, 130.9]] },
  "91": { center: [-1.3, 132.6], zoom: 7, bounds: [[-4.2, 129.8], [1.0, 135.4]] },
  "92": { center: [-1.0, 131.2], zoom: 7, bounds: [[-2.9, 129.0], [0.4, 133.5]] },
  "94": { center: [-3.8, 138.2], zoom: 6, bounds: [[-8.4, 134.5], [0.8, 141.2]] },
  "95": { center: [-6.2, 139.4], zoom: 7, bounds: [[-8.8, 137.0], [-4.0, 141.2]] },
  "96": { center: [-3.7, 136.5], zoom: 7, bounds: [[-5.2, 134.1], [-2.0, 138.5]] },
  "97": { center: [-4.1, 139.2], zoom: 7, bounds: [[-5.4, 137.2], [-2.8, 141.0]] },
};

const sectorOptions = [
  { value: "", label: "Semua sektor" },
  { value: "tanaman-pangan", label: "Pangan" },
  { value: "perkebunan", label: "Perkebunan" },
  { value: "hortikultura", label: "Hortikultura" },
  { value: "perikanan", label: "Perikanan" },
  { value: "peternakan", label: "Peternakan" },
];

function getProvinceCode(code: string) {
  return code.split(".")[0] ?? code;
}

function getAreaViewport(area: Pick<DrillArea, "code" | "level"> | Pick<AreaSearchResult, "code" | "level"> | null, fallback = indonesiaViewport) {
  if (!area?.code) return indonesiaViewport;
  if (area.level === 1 && provinceViewports[area.code]) return provinceViewports[area.code];
  const province = provinceViewports[getProvinceCode(area.code)];
  if (!province) return fallback;
  const zoom = area.level === 2 ? 9 : area.level === 3 ? 11 : 13;
  return { ...province, zoom };
}

function getLevelNextLabel(level: number) {
  if (level === 0) return "provinsi";
  if (level === 1) return "kabupaten/kota";
  if (level === 2) return "kecamatan";
  if (level === 3) return "desa/kelurahan";
  return "detail desa";
}

function getBoundaryTargetLevel(level: number) {
  if (level <= 0) return 1;
  return Math.min(level + 1, 4);
}

function formatNumber(value: number | undefined) {
  return Number(value ?? 0).toLocaleString("id-ID");
}

function canStyle(layer: LeafletLayer): layer is LeafletLayer & { setStyle: (style: PathOptions) => void } {
  return "setStyle" in layer;
}

function boundaryStyle(isHover: boolean, selectedLevel: number): PathOptions {
  const selectedFill = selectedLevel > 0 ? 0.16 : 0.08;
  return {
    color: isHover ? "#D79A2B" : "rgba(244,240,232,0.74)",
    dashArray: isHover ? "" : "3 6",
    fillColor: isHover ? "#D79A2B" : selectedLevel > 0 ? "#D79A2B" : "#101315",
    fillOpacity: isHover ? 0.42 : selectedFill,
    opacity: isHover ? 1 : 0.84,
    weight: isHover ? 2.4 : selectedLevel > 0 ? 1.45 : 1.05,
  };
}

function clearSearchState(
  setSearchQuery: (value: string) => void,
  setSearchResults: (value: AreaSearchResult[]) => void,
  setCommodityResults: (value: CommoditySearchResult[]) => void,
  setSearchState: (value: "idle" | "loading" | "error") => void,
) {
  setSearchQuery("");
  setSearchResults([]);
  setCommodityResults([]);
  setSearchState("idle");
}

export function PetaUnggulanClient() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const boundaryLayerRef = useRef<LeafletGeoJSON | null>(null);
  const initialLoadStartedRef = useRef(false);

  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [drillData, setDrillData] = useState<DrillData | null>(null);
  const [drillState, setDrillState] = useState<"loading" | "ready" | "error">("loading");
  const [drillError, setDrillError] = useState("");
  const [currentViewport, setCurrentViewport] = useState<Viewport>(indonesiaViewport);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AreaSearchResult[]>([]);
  const [commodityResults, setCommodityResults] = useState<CommoditySearchResult[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityProfile | null>(null);
  const [commodityFilter, setCommodityFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [boundaryState, setBoundaryState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [boundaryNote, setBoundaryNote] = useState("");
  const [boundaryCount, setBoundaryCount] = useState(0);
  const [boundarySource, setBoundarySource] = useState<{ id: string; url: string } | null>(null);
  const [hoveredArea, setHoveredArea] = useState<BoundaryProperties | null>(null);
  const [commodityNews, setCommodityNews] = useState<CommodityNewsItem[]>([]);
  const [newsState, setNewsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [newsNote, setNewsNote] = useState("");
  const [message, setMessage] = useState("Pilih provinsi di peta untuk mulai drill-down.");

  const loadDrill = useCallback(
    async (code = "", viewport = indonesiaViewport, focusMap = true, overrideFilters?: FilterOverride) => {
      const activeCommodity = overrideFilters?.commodity ?? commodityFilter;
      const activeSector = overrideFilters?.sector ?? sectorFilter;
      const params = new URLSearchParams({ code, limit: "160" });
      if (activeCommodity) params.set("commodity", activeCommodity);
      if (activeSector) params.set("sector", activeSector);

      setDrillState((current) => (current === "ready" ? "ready" : "loading"));
      setDrillError("");
      try {
        const response = await fetch(`/api/admin-areas/drilldown?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Data wilayah gagal dimuat.");
        const nextData = payload as DrillData;
        setDrillData(nextData);
        setCurrentViewport(viewport);
        setSelectedCommodity(nextData.selected.profiles?.[0] ?? null);
        setDrillState("ready");
        setMessage(
          nextData.selected.level === 4
            ? `${nextData.selected.name} dipilih. Panel kanan menampilkan profil komoditas dan data wilayah.`
            : `${nextData.selected.name} dipilih. Klik bentuk ${getLevelNextLabel(nextData.selected.level)} di peta atau daftar kanan untuk masuk lebih detail.`,
        );
        if (focusMap) {
          mapInstance?.flyTo(viewport.center, viewport.zoom, { duration: 0.72, easeLinearity: 0.25 });
        }
      } catch (error) {
        setDrillState("error");
        setDrillError(error instanceof Error ? error.message : "Data wilayah gagal dimuat.");
      }
    },
    [commodityFilter, mapInstance, sectorFilter],
  );

  useEffect(() => {
    if (drillData) return;
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void loadDrill("", indonesiaViewport, false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [drillData, loadDrill]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    async function createMap() {
      const L = await import("leaflet");
      if (cancelled || !mapContainerRef.current) return;
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        minZoom: 4,
        maxZoom: 15,
        zoomSnap: 0.25,
        worldCopyJump: true,
      }).setView(indonesiaViewport.center, indonesiaViewport.zoom);

      L.control.zoom({ position: "bottomleft" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setMapInstance(map);
      window.setTimeout(() => map.invalidateSize(), 180);
    }

    void createMap();

    return () => {
      cancelled = true;
      boundaryLayerRef.current?.remove();
      boundaryLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setMapInstance(null);
    };
  }, []);

  useEffect(() => {
    if (!mapInstance || !leafletRef.current || !drillData) return;
    let cancelled = false;
    const activeDrillData = drillData;
    const activeMap = mapInstance;

    async function loadBoundaries() {
      const selected = activeDrillData.selected;
      const boundaryLevel = getBoundaryTargetLevel(selected.level);
      const parentCode = selected.level === 0 ? "" : selected.code;
      setBoundaryState("loading");
      setBoundaryNote("");
      setBoundaryCount(0);
      setBoundarySource(null);
      setHoveredArea(null);
      boundaryLayerRef.current?.remove();
      boundaryLayerRef.current = null;

      try {
        const params = new URLSearchParams({ level: String(boundaryLevel) });
        if (parentCode) params.set("parentCode", parentCode);
        const response = await fetch(`/api/admin-areas/boundaries?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json()) as BoundaryPayload;
        if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Boundary gagal dimuat.");
        if (cancelled) return;

        const L = leafletRef.current;
        if (!L) return;
        const featureCollection = payload.featureCollection as Parameters<typeof L.geoJSON>[0];
        const layer = L.geoJSON(featureCollection, {
          style: () => boundaryStyle(false, selected.level),
          onEachFeature: (feature, layerItem) => {
            const properties = (feature.properties ?? {}) as BoundaryProperties;
            layerItem.bindTooltip(properties.name, {
              className: "lb-area-tooltip",
              direction: "top",
              sticky: true,
            });
            layerItem.on({
              mouseover: () => {
                setHoveredArea(properties);
                if (canStyle(layerItem)) layerItem.setStyle(boundaryStyle(true, selected.level));
              },
              mouseout: () => {
                setHoveredArea(null);
                if (canStyle(layerItem)) layerItem.setStyle(boundaryStyle(false, selected.level));
              },
              click: () => {
                const viewport = getAreaViewport({ code: properties.code, level: properties.level }, currentViewport);
                void loadDrill(properties.code, viewport, true);
              },
            });
          },
        }).addTo(activeMap);

        boundaryLayerRef.current = layer;
        setBoundaryState("ready");
        setBoundaryNote(payload.note);
        setBoundaryCount(payload.count);
        setBoundarySource({ id: payload.source, url: payload.sourceUrl });

        if (payload.count > 0) {
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            activeMap.fitBounds(bounds.pad(0.08), {
              animate: true,
              duration: 0.65,
              maxZoom: boundaryLevel === 1 ? 6.8 : boundaryLevel === 2 ? 9.4 : 11.6,
            });
          }
        } else {
          activeMap.flyTo(currentViewport.center, currentViewport.zoom, { duration: 0.6 });
        }
      } catch (error) {
        if (cancelled) return;
        setBoundaryState("error");
        setBoundaryNote(error instanceof Error ? error.message : "Boundary gagal dimuat.");
        setBoundarySource(null);
      }
    }

    void loadBoundaries();

    return () => {
      cancelled = true;
      boundaryLayerRef.current?.remove();
      boundaryLayerRef.current = null;
    };
  }, [currentViewport, drillData, loadDrill, mapInstance]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      const resetTimer = window.setTimeout(() => {
        setSearchResults([]);
        setCommodityResults([]);
        setSearchState("idle");
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchState("loading");
      try {
        const [areaResponse, commodityResponse] = await Promise.all([
          fetch(`/api/admin-areas/search?q=${encodeURIComponent(q)}&limit=18`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(`/api/commodity-profiles/search?q=${encodeURIComponent(q)}&limit=18`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        if (!areaResponse.ok) throw new Error("Pencarian wilayah gagal.");
        if (!commodityResponse.ok) throw new Error("Pencarian komoditas gagal.");
        const areaPayload = (await areaResponse.json()) as { areas: AreaSearchResult[] };
        const commodityPayload = (await commodityResponse.json()) as { profiles: CommoditySearchResult[] };
        setSearchResults(areaPayload.areas ?? []);
        setCommodityResults(commodityPayload.profiles ?? []);
        setSearchState("idle");
      } catch {
        if (controller.signal.aborted) return;
        setSearchResults([]);
        setCommodityResults([]);
        setSearchState("error");
      }
    }, 240);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    const commodity = selectedCommodity?.commodity?.trim();
    const areaName = drillData?.selected?.name?.trim() ?? "";
    if (!commodity || !areaName) {
      const resetTimer = window.setTimeout(() => {
        setCommodityNews([]);
        setNewsNote("");
        setNewsState("idle");
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setNewsState("loading");
      setNewsNote("");
      try {
        const params = new URLSearchParams({ commodity, area: areaName, limit: "4" });
        const response = await fetch(`/api/commodity-news?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          items?: CommodityNewsItem[];
          note?: string;
          message?: string;
        };
        if (!response.ok) throw new Error(payload.message ?? "Sinyal berita gagal dimuat.");
        setCommodityNews(payload.items ?? []);
        setNewsNote(payload.note ?? "");
        setNewsState("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        setCommodityNews([]);
        setNewsNote(error instanceof Error ? error.message : "Sinyal berita gagal dimuat.");
        setNewsState("error");
      }
    }, 420);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [drillData?.selected?.name, selectedCommodity?.commodity]);

  const selected = drillData?.selected;
  const children = drillData?.children ?? [];
  const profileList = selected?.profiles ?? [];
  const breadcrumbItems = selected?.level ? drillData?.breadcrumbs ?? [] : [];
  const hasSearchPanel = searchQuery.trim().length >= 2 && (searchResults.length > 0 || commodityResults.length > 0 || searchState === "error");
  const activeFilterLabel = [commodityFilter, sectorOptions.find((item) => item.value === sectorFilter)?.label].filter(Boolean).join(" / ");

  function chooseSearchArea(area: AreaSearchResult) {
    const viewport = getAreaViewport(area, getAreaViewport({ code: getProvinceCode(area.code), level: 1 }));
    clearSearchState(setSearchQuery, setSearchResults, setCommodityResults, setSearchState);
    void loadDrill(area.code, viewport, true);
  }

  function chooseCommodity(profile: CommoditySearchResult) {
    const nextFilters = { commodity: profile.commodity, sector: profile.sector };
    const viewport = getAreaViewport({ code: profile.areaCode, level: profile.areaLevel }, getAreaViewport({ code: profile.provinceCode, level: 1 }));
    setCommodityFilter(profile.commodity);
    setSectorFilter(profile.sector);
    setSelectedCommodity(profile);
    clearSearchState(setSearchQuery, setSearchResults, setCommodityResults, setSearchState);
    void loadDrill(profile.areaCode, viewport, true, nextFilters);
  }

  function applySector(nextSector: string) {
    setSectorFilter(nextSector);
    void loadDrill(selected?.code ?? "", currentViewport, false, { commodity: commodityFilter, sector: nextSector });
  }

  function clearAllFilters() {
    setCommodityFilter("");
    setSectorFilter("");
    void loadDrill(selected?.code ?? "", currentViewport, false, { commodity: "", sector: "" });
  }

  return (
    <section className="lb-peta-shell lb-leaflet-dark relative h-[100dvh] min-h-[680px] overflow-hidden bg-[#080A0B] text-[#F4F0E8]">
      <div ref={mapContainerRef} className="absolute inset-0" aria-label="Peta drill-down wilayah Indonesia" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,11,0.9)_0%,rgba(8,10,11,0.22)_27%,rgba(8,10,11,0.1)_57%,rgba(8,10,11,0.9)_100%)]" />

      <header className="absolute left-3 right-3 top-3 z-30 grid gap-2 lg:grid-cols-[minmax(300px,520px)_minmax(260px,1fr)_auto]">
        <div className="rounded-[14px] border border-white/10 bg-[#101315]/94 p-2.5 shadow-2xl">
          <div className="flex items-center gap-2 rounded-[11px] border border-white/10 bg-black/30 px-3 py-2">
            <Search size={17} strokeWidth={2.1} className="text-[#D79A2B]" aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari wilayah atau komoditas: Sumsel, Banyuasin, karet, padi..."
              className="min-w-0 flex-1 bg-transparent text-sm font-normal text-[#F4F0E8] outline-none placeholder:text-[#858B8D]"
            />
            {searchState === "loading" ? (
              <Loader2 size={16} strokeWidth={2.1} className="animate-spin text-[#D79A2B]" aria-hidden="true" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => clearSearchState(setSearchQuery, setSearchResults, setCommodityResults, setSearchState)}
                className="rounded-[8px] p-1 text-[#AEB4B5] hover:text-white focus-visible:lb-focus"
                aria-label="Kosongkan pencarian"
              >
                <X size={15} strokeWidth={2.1} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {sectorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => applySector(option.value)}
                className={`rounded-[10px] border px-2.5 py-1.5 text-xs transition focus-visible:lb-focus ${
                  sectorFilter === option.value
                    ? "border-[#D79A2B] bg-[#D79A2B]/15 text-[#F4D7A2]"
                    : "border-white/10 bg-white/[0.045] text-[#AEB4B5] hover:border-[#D79A2B]"
                }`}
              >
                {option.label}
              </button>
            ))}
            {commodityFilter ? (
              <button
                type="button"
                onClick={() => {
                  setCommodityFilter("");
                  void loadDrill(selected?.code ?? "", currentViewport, false, { commodity: "", sector: sectorFilter });
                }}
                className="inline-flex items-center gap-1 rounded-[10px] border border-[#D79A2B]/40 bg-[#D79A2B]/12 px-2.5 py-1.5 text-xs text-[#F4D7A2] focus-visible:lb-focus"
              >
                {commodityFilter}
                <X size={12} strokeWidth={2.1} aria-hidden="true" />
              </button>
            ) : null}
            {commodityFilter || sectorFilter ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-[10px] border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-[#AEB4B5] hover:border-[#D79A2B] focus-visible:lb-focus"
              >
                Reset
              </button>
            ) : null}
          </div>

          {hasSearchPanel ? (
            <div className="mt-2 max-h-[320px] overflow-y-auto pr-1 lb-map-scroll">
              {searchState === "error" ? (
                <p className="rounded-[12px] border border-[#C92A2A]/40 bg-[#C92A2A]/12 p-3 text-sm text-[#F0B0B0]">
                  Pencarian gagal. Coba ulang.
                </p>
              ) : (
                <div className="grid gap-3">
                  {searchResults.length ? (
                    <section>
                      <p className="px-1 pb-1 text-[11px] font-medium text-[#858B8D]">Wilayah</p>
                      <div className="grid gap-2">
                        {searchResults.map((area) => (
                          <button
                            key={area.code}
                            type="button"
                            onClick={() => chooseSearchArea(area)}
                            className="rounded-[12px] border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-[#D79A2B] hover:bg-white/[0.07] focus-visible:lb-focus"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium">{area.name}</p>
                              <span className="font-mono text-[11px] text-[#D79A2B]">{area.code}</span>
                            </div>
                            <p className="mt-1 text-xs text-[#AEB4B5]">
                              Level {area.level} - {area.kind}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {commodityResults.length ? (
                    <section>
                      <p className="px-1 pb-1 text-[11px] font-medium text-[#858B8D]">Komoditas</p>
                      <div className="grid gap-2">
                        {commodityResults.map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => chooseCommodity(profile)}
                            className="rounded-[12px] border border-white/10 bg-[#151A1C]/92 p-3 text-left transition hover:border-[#D79A2B] hover:bg-white/[0.07] focus-visible:lb-focus"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium">{profile.commodity}</p>
                              <span className="font-mono text-[11px] text-[#D79A2B]">#{profile.rank}</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-[#AEB4B5]">
                              {profile.areaName} - {profile.provinceName} - {profile.sourceLevel}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="hidden rounded-[14px] border border-white/10 bg-[#101315]/86 p-2.5 shadow-2xl lg:block">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#AEB4B5]">
            <button
              type="button"
              onClick={() => void loadDrill("", indonesiaViewport, true)}
              className="rounded-[10px] border border-white/10 bg-white/[0.045] px-3 py-2 text-[#F4F0E8] hover:border-[#D79A2B] focus-visible:lb-focus"
            >
              Indonesia
            </button>
            {breadcrumbItems.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => void loadDrill(item.code, getAreaViewport(item), true)}
                className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.045] px-3 py-2 hover:border-[#D79A2B] focus-visible:lb-focus"
              >
                <ChevronRight size={13} strokeWidth={2.1} aria-hidden="true" />
                {item.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-[#D2D6D6]">{message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#858B8D]">
            <span className="inline-flex items-center gap-1 rounded-[9px] border border-white/10 bg-black/20 px-2 py-1">
              <Layers3 size={12} strokeWidth={2.1} aria-hidden="true" />
              {boundaryState === "loading" ? "Memuat polygon" : `${formatNumber(boundaryCount)} polygon`}
            </span>
            {activeFilterLabel ? (
              <span className="inline-flex items-center gap-1 rounded-[9px] border border-[#D79A2B]/30 bg-[#D79A2B]/10 px-2 py-1 text-[#F4D7A2]">
                <Filter size={12} strokeWidth={2.1} aria-hidden="true" />
                {activeFilterLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 rounded-[14px] border border-white/10 bg-[#101315]/94 p-2.5 shadow-2xl">
          <button
            type="button"
            onClick={() => mapInstance?.zoomIn()}
            className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.06] hover:bg-white/[0.1] focus-visible:lb-focus"
            aria-label="Zoom in"
          >
            <ZoomIn size={17} strokeWidth={2.1} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => mapInstance?.zoomOut()}
            className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.06] hover:bg-white/[0.1] focus-visible:lb-focus"
            aria-label="Zoom out"
          >
            <ZoomOut size={17} strokeWidth={2.1} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => mapInstance?.flyTo(currentViewport.center, currentViewport.zoom, { duration: 0.7 })}
            className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#D79A2B] text-[#080A0B] focus-visible:lb-focus"
            aria-label="Fokus area"
          >
            <LocateFixed size={17} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </header>

      <aside className="absolute bottom-3 left-3 z-20 w-[min(500px,calc(100%-24px))] rounded-[14px] border border-white/10 bg-[#101315]/94 p-3 shadow-2xl lg:w-[420px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers3 size={17} strokeWidth={2.1} className="text-[#D79A2B]" aria-hidden="true" />
            <p className="text-sm font-medium">Layer administratif</p>
          </div>
          <span className="rounded-[8px] border border-white/10 bg-black/20 px-2 py-1 font-mono text-[11px] text-[#AEB4B5]">
            {boundaryState}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#AEB4B5] sm:grid-cols-4">
          {[
            ["1", "Provinsi", drillData?.summary.level1],
            ["2", "Kab/kota", drillData?.summary.level2],
            ["3", "Kecamatan", drillData?.summary.level3],
            ["4", "Desa", drillData?.summary.level4],
          ].map(([level, label, total]) => (
            <div key={level} className="rounded-[10px] border border-white/10 bg-white/[0.045] px-3 py-2">
              <p className="font-mono text-[11px] text-[#D79A2B]">L{level}</p>
              <p className="mt-1 font-medium text-[#F4F0E8]">{label}</p>
              <p className="mt-1 font-mono">{formatNumber(Number(total ?? 0))}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#AEB4B5]">
          {hoveredArea ? `${hoveredArea.name} - klik untuk masuk level berikutnya.` : boundaryNote || "Polygon wilayah akan tampil sesuai level aktif."}
        </p>
        {boundarySource ? (
          <a
            href={boundarySource.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[#F4D7A2] hover:text-white focus-visible:lb-focus"
          >
            {boundarySource.id}
            <ExternalLink size={12} strokeWidth={2.1} aria-hidden="true" />
          </a>
        ) : null}
      </aside>

      <aside className="absolute bottom-3 right-3 top-[228px] z-20 w-[min(430px,calc(100%-24px))] overflow-y-auto rounded-[16px] border border-white/10 bg-[#101315]/96 p-4 shadow-2xl lb-map-scroll lg:top-[164px] xl:top-[158px]">
        {drillState === "loading" ? (
          <div className="grid min-h-80 place-items-center text-center">
            <div>
              <Loader2 size={24} strokeWidth={2.1} className="mx-auto animate-spin text-[#D79A2B]" aria-hidden="true" />
              <p className="mt-3 text-sm text-[#AEB4B5]">Memuat wilayah...</p>
            </div>
          </div>
        ) : drillState === "error" ? (
          <div className="rounded-[14px] border border-[#C92A2A]/40 bg-[#C92A2A]/12 p-4 text-sm text-[#F0B0B0]">
            {drillError}
          </div>
        ) : selected ? (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#D79A2B]">{selected.levelName}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal">{selected.name}</h1>
                <p className="mt-2 font-mono text-xs text-[#AEB4B5]">{selected.code || "ID"}</p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-[#D79A2B]/35 bg-[#D79A2B]/12 px-3 py-1 text-xs font-medium text-[#F4D7A2]">
                {selected.level === 0 ? "Nasional" : `Level ${selected.level}`}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Subwilayah", children.length],
                ["Provinsi", drillData?.summary.level1],
                ["Kab/kota", drillData?.summary.level2],
                ["Kecamatan", drillData?.summary.level3],
                ["Desa", drillData?.summary.level4],
                ["Komoditas", profileList.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] border border-white/10 bg-white/[0.045] p-3">
                  <p className="text-xs text-[#858B8D]">{label}</p>
                  <p className="mt-1 font-mono text-xl font-semibold">{formatNumber(Number(value ?? 0))}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[14px] border border-[#D79A2B]/28 bg-[#D79A2B]/10 p-4 text-sm leading-6 text-[#F4D7A2]">
              {selected.level < 4
                ? `Klik bentuk wilayah di peta atau daftar ${getLevelNextLabel(selected.level)}. Highlight mengikuti polygon administratif, bukan marker buatan.`
                : "Ini level desa/kelurahan. Komoditas di bawah adalah profil sumber; data operasional tetap perlu WA/operator/import resmi."}
            </div>

            {(commodityFilter || sectorFilter) && (
              <div className="mt-3 rounded-[14px] border border-white/10 bg-black/25 p-3 text-sm text-[#D2D6D6]">
                <p className="font-medium text-[#F4F0E8]">Filter aktif</p>
                <p className="mt-1 text-xs leading-5 text-[#AEB4B5]">
                  {commodityFilter ? `Komoditas: ${commodityFilter}. ` : ""}
                  {sectorFilter ? `Sektor: ${sectorOptions.find((item) => item.value === sectorFilter)?.label ?? sectorFilter}.` : ""}
                </p>
              </div>
            )}

            <section className="mt-5">
              <div className="flex items-center gap-2">
                <Database size={17} strokeWidth={2.1} className="text-[#D79A2B]" aria-hidden="true" />
                <h2 className="text-sm font-medium">Komoditas area</h2>
              </div>
              <div className="mt-3 grid gap-2">
                {profileList.length ? (
                  profileList.map((profile) => (
                    <button
                      key={`${profile.areaCode}-${profile.commodity}-${profile.rank}`}
                      type="button"
                      onClick={() => setSelectedCommodity(profile)}
                      className={`rounded-[12px] border p-3 text-left transition focus-visible:lb-focus ${
                        selectedCommodity?.commodity === profile.commodity
                          ? "border-[#D79A2B] bg-[#D79A2B]/12"
                          : "border-white/10 bg-white/[0.045] hover:border-[#D79A2B]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{profile.commodity}</p>
                        <span className="font-mono text-xs text-[#D79A2B]">#{profile.rank}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#AEB4B5]">
                        {profile.sourceLevel} - {profile.confidence}
                        {profile.sourceName ? ` - ${profile.sourceName}` : ""}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-[12px] border border-white/10 bg-white/[0.045] p-3 text-sm text-[#AEB4B5]">
                    Belum ada profil komoditas langsung untuk area ini. Data warisan provinsi tidak ditampilkan agar operator tidak membaca angka sebagai fakta daerah.
                  </p>
                )}
              </div>
              {selectedCommodity ? (
                <div className="mt-3 rounded-[12px] border border-white/10 bg-black/30 p-3 text-sm leading-6 text-[#D2D6D6]">
                  <p>{selectedCommodity.basis}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#AEB4B5]">
                    <span className="rounded-[8px] border border-white/10 bg-white/[0.045] px-2 py-1">
                      {selectedCommodity.sourceName || selectedCommodity.sourceId}
                    </span>
                    {selectedCommodity.sourceUrl ? (
                      <a
                        href={selectedCommodity.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-[8px] border border-[#D79A2B]/30 bg-[#D79A2B]/10 px-2 py-1 text-[#F4D7A2] hover:border-[#D79A2B] focus-visible:lb-focus"
                      >
                        Sumber
                        <ExternalLink size={12} strokeWidth={2.1} aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                  {selectedCommodity.notes ? <p className="mt-2 text-xs leading-5 text-[#858B8D]">{selectedCommodity.notes}</p> : null}
                </div>
              ) : null}
            </section>

            <section className="mt-5">
              <div className="flex items-center gap-2">
                <Newspaper size={17} strokeWidth={2.1} className="text-[#D79A2B]" aria-hidden="true" />
                <h2 className="text-sm font-medium">Berita dan sinyal komoditas</h2>
              </div>
              <div className="mt-3 grid gap-2">
                {!selectedCommodity ? (
                  <p className="rounded-[12px] border border-white/10 bg-white/[0.045] p-3 text-sm text-[#AEB4B5]">
                    Pilih komoditas untuk memuat berita terkait wilayah.
                  </p>
                ) : newsState === "loading" ? (
                  <div className="flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.045] p-3 text-sm text-[#AEB4B5]">
                    <Loader2 size={15} strokeWidth={2.1} className="animate-spin text-[#D79A2B]" aria-hidden="true" />
                    Memuat sinyal berita...
                  </div>
                ) : commodityNews.length ? (
                  commodityNews.map((item) => (
                    <a
                      key={item.url}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[12px] border border-white/10 bg-white/[0.045] p-3 transition hover:border-[#D79A2B] hover:bg-white/[0.07] focus-visible:lb-focus"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium leading-5">{item.title}</p>
                        <ExternalLink size={13} strokeWidth={2.1} className="mt-1 shrink-0 text-[#D79A2B]" aria-hidden="true" />
                      </div>
                      <p className="mt-2 text-xs text-[#858B8D]">{item.domain || item.source}</p>
                    </a>
                  ))
                ) : (
                  <p className="rounded-[12px] border border-white/10 bg-white/[0.045] p-3 text-sm leading-5 text-[#AEB4B5]">
                    {newsNote || "Belum ada sinyal berita yang relevan untuk kombinasi wilayah dan komoditas ini."}
                  </p>
                )}
              </div>
              {newsNote ? <p className="mt-2 text-xs leading-5 text-[#858B8D]">{newsNote}</p> : null}
            </section>

            <section className="mt-5">
              <h2 className="text-sm font-medium">Daftar {getLevelNextLabel(selected.level)}</h2>
              <div className="mt-3 grid gap-2">
                {children.length ? (
                  children.slice(0, 140).map((child, index) => {
                    const mainCommodity = child.commodities?.[0]?.commodity;
                    return (
                      <button
                        key={child.code}
                        type="button"
                        onClick={() => void loadDrill(child.code, getAreaViewport(child, currentViewport), true)}
                        className="rounded-[12px] border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-[#D79A2B] focus-visible:lb-focus"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium">{child.name}</p>
                          <span className="font-mono text-[11px] text-[#D79A2B]">{String(index + 1).padStart(2, "0")}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#AEB4B5]">
                          {child.levelName} - {formatNumber(child.directChildren)} subwilayah - {formatNumber(child.villages)} desa
                          {mainCommodity ? ` - ${mainCommodity}` : ""}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <p className="rounded-[12px] border border-white/10 bg-white/[0.045] p-3 text-sm text-[#AEB4B5]">
                    Tidak ada subwilayah lagi pada level ini atau filter terlalu sempit.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </aside>
    </section>
  );
}

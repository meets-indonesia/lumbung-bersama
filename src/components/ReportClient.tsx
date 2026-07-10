"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileCheck2, Lock, RefreshCcw } from "lucide-react";

type DashboardReportPayload = {
  source: "application-db";
  cooperative: {
    id: string;
    name: string;
    village: string;
    district: string;
    regency: string;
    province: string;
  } | null;
  metrics: Array<{ label: string; value: string; note: string }>;
  queue: Array<{ id: string; summary: string; status: string; module: string }>;
  stocks: Array<{ id: string; name: string; unit: string; state: string; location: string; restockRequested?: boolean }>;
  buyers: Array<{
    id: string;
    buyer: string;
    need: string;
    matchScore: number;
    reason: string;
    status: string;
    sourceLabel?: string;
    buyerSource?: string;
    verifiedBuyer?: boolean;
  }>;
  finance: Array<{ id: string; purpose: string; amount: string; risk: string; status: string }>;
  reportSections: Array<{ id: string; title: string; included: boolean }>;
  reportPeriod: { id: string; label: string; locked: boolean; lockedAt?: string | null } | null;
  buyerRequirements?: Array<{
    id: string;
    buyerArchetype: string;
    productName: string;
    requiredQuantity: string;
    unitLabel: string;
    verificationStatus: string;
    sourceLabel: string;
    notes: string;
  }>;
  stockLedger?: Array<{
    id: string;
    stockName: string;
    movementType: string;
    quantity: string;
    unitLabel: string;
    evidenceRef: string;
    readinessStatus: string;
  }>;
  mediaEvidence?: Array<{
    id: string;
    redactedLabel: string;
    caption: string;
    verificationStatus: string;
    sourceLabel: string;
  }>;
  teamTablePrefix?: string;
  prefixedDbStatus?: {
    prefix: string;
    status: "ready" | "setup-required";
    message: string;
    tables: Array<{
      tableName: string;
      status: "ready" | "setup-required";
      rows: number;
      errorCode?: string;
    }>;
  };
  commodityHighlights?: Array<{
    commodity: string;
    sector: string;
    rank: number;
    sourceLevel: string;
    confidence: string;
    basis: string;
  }>;
};

type HackathonSummaryPayload = {
  source: string;
  mode: string;
  schemaScope?: { description: string };
  headlineEvidence?: {
    metrics: Array<{ id: string; label: string; value: number; unit: string; amountIdr?: number }>;
    caveat: string;
  };
  tableCounts: Array<{ tableName: string; total: string }>;
  provinceOpportunities: Array<{
    province: string;
    villages: string;
    commodityRows: string;
    potentialValue: string | null;
    cooperatives: string;
    products: string;
    stockItems: string;
    transactions: string;
    partnershipRequests: string;
  }>;
  dataQualityFlags: string[];
};

type HackathonDataQualityPayload = {
  source?: string;
  mode?: string;
  checks: Array<{
    table: string;
    totalRows: number;
    missingKeyRefs: Array<{ field: string; missingRows: number; presentRows: number; completenessRate: number | null }>;
    completeness: Array<{ field: string; missingRows: number; presentRows: number; completenessRate: number | null }>;
    quality: Array<{ field: string; risk: string; affectedRows: number; affectedRate: number | null }>;
  }>;
  recommendations: string[];
};

type HackathonOpportunityPayload = {
  source?: string;
  mode?: string;
  topAreas: Array<{
    area: {
      kodeWilayah: string | null;
      province: string | null;
      regency: string | null;
      district: string | null;
      village: string | null;
    };
    rawSignals: Record<string, number>;
    componentScores: Record<string, number>;
    score: number;
    sourceCaveat?: {
      confidence: string;
      caveat: string;
      humanReview: string;
    };
  }>;
  recommendations: string[];
};

type HackathonBuyerPayload = {
  source?: string;
  mode?: string;
  matches: Array<{
    rank: number;
    buyerArchetypeLabel: string;
    score: number;
    readinessCluster: string;
    cooperativeRef: string;
    cooperativeName: string | null;
    location: {
      province: string | null;
      regency: string | null;
    };
    productSnapshot: {
      productsTotal: number;
      namedProducts: number;
      productExamples: string[];
    };
    signals: {
      stockItems: number;
      transactions: number;
      partnershipRequests: number;
    };
    readinessGaps?: string[];
  }>;
  nextActions: string[];
};

type HackathonFinancingPayload = {
  source: string;
  mode: string;
  freshness?: {
    generatedAt: string;
    method: string;
    caveat: string;
  };
  confidence?: {
    level: string;
    basis: string;
    caveat: string;
  };
  totals: {
    totalRequests: number;
    totalAmount: string;
    draftRequests: number;
    requestedRequests: number;
    verifiedRequests: number;
    unverifiedRequests: number;
    verificationRate: number | null;
  };
  statusSummary: Array<{
    status: string;
    statusKey: string;
    requests: number;
    amount: string;
  }>;
  channelSummary: Array<{
    channel: string;
    requests: number;
    amount: string;
  }>;
  actionChecklist: Array<{
    id: string;
    title: string;
    status: string;
    nextAction: string;
    source: string;
    caveat: string;
  }>;
};

type OpenDataRegistryPayload = {
  source: "static" | "application-db";
  registryStatus: string;
  docsReference: string;
  sourceLabels: string[];
  p0Roadmap: Array<{
    id: string;
    title: string;
    sources: string[];
    output: string;
    caveat: string;
  }>;
  registryPolicy?: {
    externalClaims: string;
    sharedDbScope: string;
    privacy: string;
  };
  sources: Array<{
    id: string;
    name: string;
    category: string;
    url: string;
    license: string;
    coverage: string;
    refreshStrategy: string;
    status: string;
    notes: string;
    lastCheckedAt: string | null;
    sourceLabel: string;
    integrationClaim: string;
  }>;
  coverage: {
    administrativeAreasImported?: Record<string, number>;
    levels?: Record<string, string>;
    message?: string;
  };
  latestImportRuns: Array<{
    sourceId: string;
    status: string;
    importedRows: number;
    sourceVersion: string;
    sourceUrl: string;
    message: string;
    startedAt: string;
    finishedAt: string | null;
  }>;
};

type SignalSpineItem = {
  id?: string;
  label?: string;
  title?: string;
  name?: string;
  status?: string;
  state?: string;
  verdict?: string;
  note?: string;
  detail?: string;
  description?: string;
  source?: string;
  sourceLabel?: string;
  evidenceRef?: string;
  nextAction?: string;
  action?: string;
  role?: string;
  surface?: string;
  permission?: string;
  allowed?: boolean;
  score?: string | number | null;
  value?: string | number | null;
  count?: string | number | null;
  caveat?: string;
  blockers?: string[];
  items?: SignalSpineItem[];
  [key: string]: unknown;
};

type SignalSpinePayload = {
  signalFamilies?: SignalSpineItem[];
  provenanceLedger?: SignalSpineItem[];
  readinessGate?: SignalSpineItem | null;
  offerPackDraft?: SignalSpineItem | null;
  managerActionQueue?: SignalSpineItem[];
  remediationPlanner?: SignalSpineItem[];
  connectorScorecard?: SignalSpineItem[];
  workingCapitalScenario?: SignalSpineItem | null;
  cooperativeHealthGate?: SignalSpineItem | null;
  rolePermissionMatrix?: SignalSpineItem[];
  demoFixture?: SignalSpineItem | Record<string, unknown> | null;
  boundarySentence?: string;
};

type LoadStatus = "loading" | "ready" | "setup" | "error";

function formatInteger(value: string | number | null | undefined) {
  const numberValue = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return String(value ?? "0");
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(numberValue);
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const raw = String(value ?? "");
  const formulaSafe = /^[=+\-@\t\r]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return `"${formulaSafe.replaceAll("\"", "\"\"")}"`;
}

function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function buyerEvidenceLabel(item: DashboardReportPayload["buyers"][number]) {
  return item.sourceLabel ?? "Tipe kebutuhan buyer; bukan buyer bernama atau komitmen permintaan live.";
}

function publicSetupMessage(message: unknown, fallback: string) {
  const raw = typeof message === "string" ? message.trim() : "";
  if (!raw) return fallback;
  if (
    /DATABASE_URL|HACKATHON_SHARED_DATABASE_URL|DB_HOST|DB_PORT|DB_DATABASE|DB_USERNAME|DB_PASSWORD|POSTGRES|Postgres|postgres|env\b|environment|prefixed db|shared[-_\s]?db|db-read|database/i.test(
      raw,
    )
  ) {
    return fallback;
  }
  return publicProductText(raw, fallback);
}

function publicProductText(value: unknown, fallback = "Belum tersedia") {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  return raw
    .replace(/setup[-_\s]?required/gi, "perlu aktivasi")
    .replace(/operator[-_\s]?ready/gi, "siap dipakai")
    .replace(/operator/gi, "tim koperasi")
    .replace(/shared[-_\s]?db/gi, "sumber eksplorasi")
    .replace(/prefixed[-_\s]?db/gi, "tabel data tim")
    .replace(/Postgres|postgres|database/gi, "data operasional")
    .replace(/\bDB\b|\bdb\b/gi, "data")
    .replace(/\benv(?:ironment)?\b/gi, "aktivasi")
    .replace(/\bendpoint\b/gi, "layanan")
    .replace(/\bconnector\b/gi, "konektor")
    .replace(/smoke test/gi, "uji koneksi")
    .replace(/aggregate-only/gi, "bukti agregat")
    .replace(/aggregate/gi, "agregat")
    .replace(/\braw\b/gi, "mentah");
}

function publicRegistryStatusLabel(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "Belum dicek";
  if (/unconfigured|not[-_\s]?configured|not[-_\s]?ready/i.test(raw)) return "Perlu aktivasi";
  if (/operator[-_\s]?ready|implemented|ready|application/i.test(raw)) return "Siap dipakai";
  if (/loading/i.test(raw)) return "Memuat";
  if (/unverified|belum[-_\s]?terverifikasi/i.test(raw)) return "Belum terverifikasi";
  if (/verified|terverifikasi/i.test(raw)) return "Terverifikasi";
  if (/requested|diajukan/i.test(raw)) return "Diajukan";
  if (/draft/i.test(raw)) return "Draft";
  if (/limited|needs[-_\s]?verification/i.test(raw)) return "Terbatas";
  if (/medium/i.test(raw)) return "Cukup";
  if (/aggregate/i.test(raw)) return "Bukti agregat";
  if (/env|setup|required|activation|static|fallback|pilot/i.test(raw)) return "Perlu aktivasi";
  if (/source-discovery|discovery/i.test(raw)) return "Discovery";
  if (/planned|connector/i.test(raw)) return "Direncanakan";
  if (/manual|reference/i.test(raw)) return "Referensi";
  return publicProductText(raw, "Belum dicek").replace(/[-_]/g, " ");
}

function publicSourceLabel(value: string) {
  return publicProductText(value, "Sumber bukti").replace(/source-discovery/gi, "discovery").replace(/connector-planned/gi, "direncanakan");
}

function teamTableLabel(tableName: string) {
  if (/buyer[_-]?requirements/i.test(tableName)) return "Syarat buyer";
  if (/stock[_-]?ledger/i.test(tableName)) return "Riwayat stok";
  if (/media[_-]?evidence/i.test(tableName)) return "Bukti media";
  if (/finance/i.test(tableName)) return "Kesiapan pembiayaan";
  if (/stock/i.test(tableName)) return "Data stok";
  if (/buyer/i.test(tableName)) return "Kesiapan buyer";
  return "Data tim";
}

function redactSensitiveText(value: unknown) {
  return String(value ?? "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:\+?62|0)8\d{7,12}\b/g, "[redacted-phone]")
    .replace(/\b(?:sk|pk|pat|ghp|glpat|xox[baprs]?)-[A-Za-z0-9_-]{10,}\b/gi, "[redacted-secret]")
    .replace(/\b[A-Za-z0-9_/-]{32,}\b/g, "[redacted-token]");
}

function signalScalar(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.map(signalScalar).filter(Boolean).join("; ");
  if (typeof value === "object") return "";
  return redactSensitiveText(value);
}

function signalField(item: SignalSpineItem | Record<string, unknown> | null | undefined, keys: string[]) {
  if (!item) return "";
  for (const key of keys) {
    const formatted = signalScalar(item[key]);
    if (formatted) return publicSetupMessage(formatted, "Sumber eksplorasi terbatas");
  }
  return "";
}

function signalItemLabel(item: SignalSpineItem | Record<string, unknown> | null | undefined, fallback: string) {
  return signalField(item, ["label", "title", "name", "role", "surface", "permission"]) || fallback;
}

function signalItemStatus(item: SignalSpineItem | Record<string, unknown> | null | undefined) {
  const explicit = signalField(item, ["status", "state", "verdict"]);
  if (explicit) return publicRegistryStatusLabel(explicit);
  return typeof item?.allowed === "boolean" ? (item.allowed ? "Diizinkan" : "Perlu persetujuan") : "Perlu verifikasi";
}

function signalItemSource(item: SignalSpineItem | Record<string, unknown> | null | undefined, fallback = "Bukti agregat") {
  return signalField(item, ["sourceLabel", "source", "evidenceRef"]) || fallback;
}

function signalItemSummary(item: SignalSpineItem | Record<string, unknown> | null | undefined, fallback = "Baris bukti agregat belum tersedia.") {
  if (!item) return fallback;
  const metricParts = [
    signalField(item, ["score"]) ? `skor ${signalField(item, ["score"])}` : "",
    signalField(item, ["value"]) ? `nilai ${signalField(item, ["value"])}` : "",
    signalField(item, ["count"]) ? `jumlah ${signalField(item, ["count"])}` : "",
  ].filter(Boolean);
  const detail = signalField(item, ["detail", "description", "note"]);
  const nextAction = signalField(item, ["nextAction", "action"]);
  const caveat = signalField(item, ["caveat"]);
  const blockers = signalScalar(item.blockers);
  const nestedCount = Array.isArray(item.items) && item.items.length > 0 ? `${formatInteger(item.items.length)} bukti agregat turunan` : "";
  return [signalItemStatus(item), metricParts.join("; "), detail, nextAction ? `lanjut: ${nextAction}` : "", caveat, blockers, nestedCount]
    .filter(Boolean)
    .join(" | ") || fallback;
}

const reportDemoFlowSteps = [
  ["Dashboard", "Ringkasan operasional, antrean bukti, dan tindak lanjut."],
  ["Peta", "Wilayah dan komoditas dengan catatan sumber."],
  ["Skor", "Prioritas peluang yang bisa dijelaskan."],
  ["Buyer", "Profil kebutuhan, cek pasar, dan persetujuan pengurus."],
  ["Laporan", "Ekspor rapat koperasi tanpa data pribadi."],
] as const;

const reportRoleRows = [
  ["Pengurus", "/dashboard, /laporan", "Menyetujui kontak buyer, pembiayaan, dan laporan rapat."],
  ["Manager Koperasi", "/dashboard, /peta-unggulan, /laporan", "Memantau penjualan, stok, pengiriman, buyer, pembiayaan, dan peringatan."],
  ["Staff/Admin Gudang", "Kesiapan stok", "Memeriksa produk, satuan, inventori, lokasi, dan bukti."],
  ["Staff/Admin Logistik", "Pemenuhan pesanan", "Mengatur pickup, kurir, status pengiriman, dan bukti serah terima."],
  ["Kasir", "Sinyal POS", "Menampilkan agregat transaksi saja, tanpa detail pelanggan."],
  ["Kurir", "Pengiriman", "Memperbarui tahap pengiriman tanpa data penerima publik."],
  ["Pembaca laporan", "Akses baca", "Melihat contoh agregat tanpa data pribadi."],
] as const;

const reportApprovalStages = [
  ["Rekomendasi", "Sistem memberi saran berbasis sumber dan aturan."],
  ["Perlu verifikasi", "Tim koperasi memeriksa stok, dokumen, harga, syarat buyer, dan catatan batas."],
  ["Disetujui", "Manager/pengurus menyetujui tindak lanjut; AI tidak menyetujui otomatis."],
] as const;

const reportSimkopdesChecklist = [
  "Produk punya satuan, kategori, potensi desa, pemasok/sumber, dan status bukan draft.",
  "Kesiapan inventori mengecek stok negatif, label umum, grade, kemasan, dan dokumentasi.",
  "Sinyal POS adalah agregat permintaan dan arus kas, bukan detail pelanggan atau struk.",
  "Kesiapan logistik mencakup gudang, kurir, status pengiriman, dan bukti serah terima.",
  "Keselarasan simpanan anggota memakai agregat likuiditas, bukan detail anggota publik.",
] as const;

const reportAiGuardrails = [
  "Analisis AI adalah peringatan awal berbasis agregat, bukan audit formal.",
  "Risiko pembiayaan memakai flag dan bukti kurang lengkap, bukan penolakan otomatis atau label fraud.",
  "Negosiasi pasar butuh sumber harga resmi/kurasi atau input tim koperasi sebelum harga ditawarkan.",
  "Naskah kontak buyer tetap bisa diedit dan perlu persetujuan pengurus sebelum kontak buyer.",
] as const;

export function ReportClient() {
  const [dashboardData, setDashboardData] = useState<DashboardReportPayload | null>(null);
  const [hackathonSummary, setHackathonSummary] = useState<HackathonSummaryPayload | null>(null);
  const [hackathonDataQuality, setHackathonDataQuality] = useState<HackathonDataQualityPayload | null>(null);
  const [hackathonOpportunityScores, setHackathonOpportunityScores] = useState<HackathonOpportunityPayload | null>(null);
  const [hackathonBuyerMatching, setHackathonBuyerMatching] = useState<HackathonBuyerPayload | null>(null);
  const [financingReadiness, setFinancingReadiness] = useState<HackathonFinancingPayload | null>(null);
  const [sourceRegistry, setSourceRegistry] = useState<OpenDataRegistryPayload | null>(null);
  const [signalSpine, setSignalSpine] = useState<SignalSpinePayload | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [hackathonStatus, setHackathonStatus] = useState<LoadStatus>("loading");
  const [registryStatus, setRegistryStatus] = useState<LoadStatus>("loading");
  const [signalSpineStatus, setSignalSpineStatus] = useState<LoadStatus>("loading");
  const [message, setMessage] = useState("Memuat laporan aksi dari layanan.");
  const [locked, setLocked] = useState(false);
  const [working, setWorking] = useState("");

  async function loadReport() {
    setStatus((current) => (current === "ready" ? "ready" : "loading"));
    setHackathonStatus((current) => (current === "ready" ? "ready" : "loading"));
    setRegistryStatus((current) => (current === "ready" ? "ready" : "loading"));
    setSignalSpineStatus((current) => (current === "ready" ? "ready" : "loading"));
    setMessage("Memuat laporan aksi dari layanan.");

    try {
      const dashboardResponse = await fetch("/api/dashboard", { cache: "no-store" });
      const dashboardPayload = await dashboardResponse.json().catch(() => null);
      if (dashboardResponse.status === 401) {
        window.location.href = "/login?next=/laporan";
        return;
      }
      if (!dashboardResponse.ok) {
        setDashboardData(null);
        setStatus(dashboardResponse.status === 503 ? "setup" : "error");
        setMessage(publicSetupMessage(dashboardPayload?.message ?? dashboardPayload?.error, "Data operasional belum tersedia."));
      } else {
        const payload = dashboardPayload as DashboardReportPayload;
        setDashboardData(payload);
        setLocked(Boolean(payload.reportPeriod?.locked));
        setStatus("ready");
        setMessage("Laporan aksi memakai data operasional aplikasi.");
      }
    } catch (error) {
      setDashboardData(null);
      setStatus("error");
      setMessage(publicSetupMessage(error instanceof Error ? error.message : "", "Gagal memuat data operasional."));
    }

    try {
      const [
        sharedResponse,
        dataQualityResponse,
        opportunityResponse,
        buyerResponse,
        financingResponse,
        signalSpineResponse,
      ] = await Promise.all([
        fetch("/api/hackathon/mvp-summary", { cache: "no-store" }),
        fetch("/api/hackathon/data-quality", { cache: "no-store" }),
        fetch("/api/hackathon/opportunity-scores", { cache: "no-store" }),
        fetch("/api/hackathon/buyer-matching", { cache: "no-store" }),
        fetch("/api/hackathon/financing-readiness", { cache: "no-store" }),
        fetch("/api/hackathon/signal-spine", { cache: "no-store" }),
      ]);
      const [sharedPayload, dataQualityPayload, opportunityPayload, buyerPayload, financingPayload, signalSpinePayload] = await Promise.all([
        sharedResponse.json().catch(() => null),
        dataQualityResponse.json().catch(() => null),
        opportunityResponse.json().catch(() => null),
        buyerResponse.json().catch(() => null),
        financingResponse.json().catch(() => null),
        signalSpineResponse.json().catch(() => null),
      ]);
      const responses = [sharedResponse, dataQualityResponse, opportunityResponse, buyerResponse, financingResponse];
      if ([...responses, signalSpineResponse].some((response) => response.status === 401)) return;

      setHackathonSummary(sharedResponse.ok ? (sharedPayload as HackathonSummaryPayload) : null);
      setHackathonDataQuality(dataQualityResponse.ok ? (dataQualityPayload as HackathonDataQualityPayload) : null);
      setHackathonOpportunityScores(opportunityResponse.ok ? (opportunityPayload as HackathonOpportunityPayload) : null);
      setHackathonBuyerMatching(buyerResponse.ok ? (buyerPayload as HackathonBuyerPayload) : null);
      setFinancingReadiness(financingResponse.ok ? (financingPayload as HackathonFinancingPayload) : null);
      setSignalSpine(signalSpineResponse.ok ? ((signalSpinePayload ?? {}) as SignalSpinePayload) : null);
      setSignalSpineStatus(
        signalSpineResponse.ok
          ? "ready"
          : signalSpineResponse.status === 404 || signalSpineResponse.status === 503
            ? "setup"
            : "error",
      );
      setHackathonStatus(
        responses.every((response) => response.ok)
          ? "ready"
          : responses.some((response) => response.status === 503)
            ? "setup"
            : "error",
      );
    } catch {
      setHackathonSummary(null);
      setHackathonDataQuality(null);
      setHackathonOpportunityScores(null);
      setHackathonBuyerMatching(null);
      setFinancingReadiness(null);
      setSignalSpine(null);
      setSignalSpineStatus("error");
      setHackathonStatus("error");
    }

    try {
      const registryResponse = await fetch("/api/open-data/sources", { cache: "no-store" });
      const registryPayload = await registryResponse.json().catch(() => null);
      if (registryResponse.status === 401) return;
      if (!registryResponse.ok) {
        setSourceRegistry(null);
        setRegistryStatus(registryResponse.status === 503 ? "setup" : "error");
        return;
      }
      setSourceRegistry(registryPayload as OpenDataRegistryPayload);
      setRegistryStatus("ready");
    } catch {
      setSourceRegistry(null);
      setRegistryStatus("error");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReport();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const queue = dashboardData?.queue ?? [];
  const stocks = dashboardData?.stocks ?? [];
  const buyers = dashboardData?.buyers ?? [];
  const finance = dashboardData?.finance ?? [];
  const buyerRequirements = dashboardData?.buyerRequirements ?? [];
  const stockLedger = dashboardData?.stockLedger ?? [];
  const mediaEvidence = dashboardData?.mediaEvidence ?? [];
  const reportSections = dashboardData?.reportSections ?? [];
  const commodityHighlights = dashboardData?.commodityHighlights ?? [];
  const criticalStocks = stocks.filter((item) =>
    ["Perlu Restok", "Terbatas", "Menunggu Grade", "Jadwal Pickup"].includes(item.state),
  );
  const pendingQueue = queue.filter((item) => item.status !== "Sudah Disetujui");
  const approvedBuyers = buyers.filter((item) => item.status.toLowerCase().includes("setuju"));
  const includedSections = reportSections.filter((item) => item.included);
  const topHackathonOpportunity = hackathonSummary?.provinceOpportunities[0] ?? null;
  const financingStatuses = financingReadiness?.statusSummary ?? [];
  const financingChecklist = financingReadiness?.actionChecklist ?? [];
  const financingChannels = financingReadiness?.channelSummary.slice(0, 3) ?? [];
  const registrySources = sourceRegistry?.sources ?? [];
  const headlineMetrics = hackathonSummary?.headlineEvidence?.metrics ?? [];
  const qualityChecks = hackathonDataQuality?.checks ?? [];
  const qualityIssueTotal = qualityChecks.reduce(
    (total, check) =>
      total +
      check.missingKeyRefs.reduce((sum, item) => sum + item.missingRows, 0) +
      check.completeness.reduce((sum, item) => sum + item.missingRows, 0) +
      check.quality.reduce((sum, item) => sum + item.affectedRows, 0),
    0,
  );
  const directOpportunityAreas = hackathonOpportunityScores?.topAreas ?? [];
  const directBuyerMatches = hackathonBuyerMatching?.matches ?? [];
  const signalFamilies = signalSpine?.signalFamilies ?? [];
  const provenanceLedger = signalSpine?.provenanceLedger ?? [];
  const managerActionQueue = signalSpine?.managerActionQueue ?? [];
  const remediationPlanner = signalSpine?.remediationPlanner ?? [];
  const connectorScorecard = signalSpine?.connectorScorecard ?? [];
  const rolePermissionMatrix = signalSpine?.rolePermissionMatrix ?? [];
  const signalBoundarySentence = signalSpine?.boundarySentence
    ? redactSensitiveText(signalSpine.boundarySentence)
    : "Batas klaim bukti agregat belum tersedia dari layanan.";
  const signalSpineSummary =
    signalSpineStatus === "ready"
      ? `${formatInteger(signalFamilies.length)} kelompok sinyal; ${formatInteger(provenanceLedger.length)} baris bukti; ${formatInteger(managerActionQueue.length)} tindak lanjut`
      : signalSpineStatus === "loading"
        ? "Memuat bukti agregat"
        : "Bukti agregat perlu aktivasi atau belum tersedia";
  const signalOverviewRows = [
    ["Kelompok sinyal", `${formatInteger(signalFamilies.length)} grup agregat`, signalFamilies[0] ? signalItemSummary(signalFamilies[0]) : "Belum ada kelompok sinyal dari layanan."],
    ["Jejak bukti", `${formatInteger(provenanceLedger.length)} baris sumber`, provenanceLedger[0] ? signalItemSummary(provenanceLedger[0]) : "Belum ada jejak bukti dari layanan."],
    ["Tindak lanjut", `${formatInteger(managerActionQueue.length)} antrean aksi`, managerActionQueue[0] ? signalItemSummary(managerActionQueue[0]) : "Belum ada antrean aksi dari layanan."],
    ["Konektor", `${formatInteger(connectorScorecard.length)} baris kesiapan`, connectorScorecard[0] ? signalItemSummary(connectorScorecard[0]) : "Kesiapan konektor belum tersedia."],
  ] as const;
  const signalGateCards: Array<{
    label: string;
    item: SignalSpineItem | Record<string, unknown> | null | undefined;
    empty: string;
  }> = [
    { label: "Gerbang kesiapan", item: signalSpine?.readinessGate, empty: "Gerbang kesiapan belum tersedia." },
    { label: "Draft penawaran", item: signalSpine?.offerPackDraft, empty: "Draft penawaran belum tersedia." },
    { label: "Skenario modal kerja", item: signalSpine?.workingCapitalScenario, empty: "Skenario modal kerja belum tersedia." },
    { label: "Kesehatan koperasi", item: signalSpine?.cooperativeHealthGate, empty: "Indikator kesehatan koperasi belum tersedia." },
    { label: "Data contoh", item: signalSpine?.demoFixture, empty: "Data contoh belum tersedia." },
  ];
  const signalActionGroups: Array<{ label: string; rows: SignalSpineItem[]; empty: string }> = [
    { label: "Antrean tindak lanjut", rows: managerActionQueue, empty: "Belum ada tindak lanjut dari layanan." },
    { label: "Rencana perbaikan", rows: remediationPlanner, empty: "Belum ada rencana perbaikan dari layanan." },
    { label: "Kesiapan konektor", rows: connectorScorecard, empty: "Belum ada kesiapan konektor dari layanan." },
  ];
  const sourceLabels = sourceRegistry?.sourceLabels ?? [];
  const p0Roadmap = sourceRegistry?.p0Roadmap ?? [];
  const registryCoverage = sourceRegistry?.coverage.administrativeAreasImported ?? {};
  const importedAreaTotal = Object.values(registryCoverage).reduce((total, value) => total + Number(value ?? 0), 0);
  const implementedConnectors = registrySources.filter((item) => item.integrationClaim === "implemented").length;
  const activationRequiredConnectors = registrySources.filter((item) =>
    ["env-gated", "activation-required"].includes(item.integrationClaim),
  ).length;
  const discoveryOrPlannedSources = registrySources.filter((item) =>
    ["source-discovery", "connector-planned"].includes(item.integrationClaim),
  ).length;
  const sourceRegistrySummary =
    registryStatus === "ready"
      ? `${formatInteger(registrySources.length)} sumber; ${formatInteger(sourceLabels.length)} label; ${formatInteger(p0Roadmap.length)} rencana aktivasi`
      : registryStatus === "loading"
        ? "Memuat registry sumber"
        : "Registry sumber belum tersedia";
  const buyerNeedsReview = buyers.filter((item) => !item.status.toLowerCase().includes("setuju")).length;
  const approvalSummary = [
    ["Rekomendasi", buyers.length + buyerRequirements.length],
    ["Perlu verifikasi", pendingQueue.length + buyerNeedsReview + criticalStocks.length],
    ["Disetujui", approvedBuyers.length],
  ] as const;
  const managerCommandRows = [
    ["Sinyal POS", topHackathonOpportunity ? formatInteger(topHackathonOpportunity.transactions) : "Perlu aktivasi", "Sinyal transaksi agregat saja, tanpa detail pelanggan."],
    ["Kesiapan inventori", `${formatInteger(criticalStocks.length)} celah`, "Verifikasi stok, grade, satuan, kemasan, dan dokumentasi."],
    ["Gudang/logistik", `${formatInteger(stockLedger.length)} catatan`, "Cek pickup, kurir, lokasi penyimpanan, dan bukti serah terima."],
    ["Outreach buyer", `${formatInteger(buyerNeedsReview)} perlu review`, "Setujui naskah setelah harga, grade, volume, dan kemasan dicek."],
    ["Kesiapan pembiayaan", financingReadiness ? `${formatInteger(financingReadiness.totals.verifiedRequests)} terverifikasi` : "Perlu aktivasi", "Hanya kesiapan dokumen, bukan persetujuan pinjaman."],
    ["Kualitas data", `${formatInteger(qualityIssueTotal || hackathonSummary?.dataQualityFlags.length || 0)} catatan`, "Data bermasalah masuk antrean verifikasi."],
  ] as const;
  const simkopdesChecklistRows = reportSimkopdesChecklist.map((item, index) => {
    const status =
      index === 0
        ? stocks.length > 0
          ? `${formatInteger(stocks.length)} catatan stok`
          : "Checklist"
        : index === 1
          ? criticalStocks.length > 0
            ? `${formatInteger(criticalStocks.length)} celah`
            : "Tanpa celah kritis"
          : index === 2
            ? topHackathonOpportunity
              ? `${formatInteger(topHackathonOpportunity.transactions)} transaksi`
              : "Perlu aktivasi"
            : index === 3
              ? stockLedger.length > 0
                ? `${formatInteger(stockLedger.length)} catatan`
                : "Alur kerja"
              : "Agregat/rencana";
    return { item, status };
  });
  const businessAnalystRows = [
    [
      "Skor kesehatan koperasi",
      financingReadiness
        ? financingReadiness.totals.verificationRate && financingReadiness.totals.verificationRate > 0.25
          ? "Sehat terbatas"
          : "Perlu perhatian"
        : "Perlu verifikasi",
      financingReadiness
        ? `${formatInteger(financingReadiness.totals.totalRequests)} permintaan agregat; ${formatInteger(financingReadiness.totals.verifiedRequests)} terverifikasi.`
        : "Kesiapan pembiayaan belum aktif.",
    ],
    ["Sinyal likuiditas dan arus kas", topHackathonOpportunity ? `${formatInteger(topHackathonOpportunity.transactions)} sinyal POS` : "Perlu sumber resmi", "Sampel POS membantu membaca permintaan, bukan audit keuangan."],
    ["Agregat simpanan", `${formatInteger(reportSimkopdesChecklist.length)} item checklist`, "Detail simpanan anggota tidak ditampilkan di laporan publik."],
  ] as const;
  const borrowerRiskRows = [
    ["Permintaan ganda/tidak konsisten", finance.length > 1 ? "Cek antrean" : "Pantau", "Gunakan flag risiko dan bukti kurang lengkap, bukan label fraud."],
    ["Nominal vs skala usaha", criticalStocks.length > 0 ? "Perlu verifikasi" : "Siap direview", "Bandingkan tujuan dengan inventori, stok, dan rencana bayar."],
    ["Kelengkapan dokumen", pendingQueue.length > 0 ? "Bukti mungkin kurang" : "Antrean bersih", "Komite perlu review sebelum status berubah."],
  ] as const;
  const negotiationRows = [
    ["Harga referensi pasar", "Perlu sumber resmi", "Gunakan sumber resmi/kurasi atau input tim koperasi; jangan mengarang harga live."],
    ["Harga penawaran/minimum/target", buyerRequirements.length > 0 ? "Draft setelah review syarat" : "Menunggu syarat", "Butuh grade, kemasan, logistik, dan batas margin minimum."],
    ["Naskah kontak buyer", buyers.length > 0 ? "Perlu persetujuan pengurus" : "Belum ada profil buyer", "Naskah bisa diedit, bukan kontak buyer otomatis."],
  ] as const;

  const executiveRows = [
    ["Koperasi", dashboardData?.cooperative?.name ?? "Belum tersedia"],
    ["Lokasi", dashboardData?.cooperative ? `${dashboardData.cooperative.village}, ${dashboardData.cooperative.regency}` : "Belum tersedia"],
    ["Sumber operasional", status === "ready" ? "Data operasional aplikasi" : "Perlu aktivasi"],
    ["Bukti eksplorasi", hackathonStatus === "ready" ? "Bukti agregat terbatas" : "Perlu aktivasi"],
    ["Bukti ringkas", headlineMetrics.length ? `${formatInteger(headlineMetrics.length)} metrik agregat` : "Perlu aktivasi"],
    ["Skor peluang", directOpportunityAreas.length ? `${formatInteger(directOpportunityAreas.length)} area prioritas` : "Perlu aktivasi"],
    ["Kecocokan buyer", directBuyerMatches.length ? `${formatInteger(directBuyerMatches.length)} profil kebutuhan` : "Perlu aktivasi"],
    ["Kualitas data", qualityChecks.length ? `${formatInteger(qualityChecks.length)} pemeriksaan` : "Perlu aktivasi"],
    ["Bukti agregat", signalSpineSummary],
    ["Daftar sumber eksternal", sourceRegistrySummary],
    ["Alur MVP", reportDemoFlowSteps.map(([label]) => label).join(" -> ")],
    ["Kewenangan akses", `${formatInteger(reportRoleRows.length)} peran SIMKOPDES dipetakan`],
    ["Tindak lanjut", `${formatInteger(managerCommandRows.length)} baris aksi`],
    ["Checklist SIMKOPDES", `${formatInteger(simkopdesChecklistRows.length)} baris checklist`],
    ["Alur persetujuan", approvalSummary.map(([label, value]) => `${label}: ${formatInteger(value)}`).join("; ")],
    ["Analisis AI", String(businessAnalystRows[0]?.[1] ?? "Perlu verifikasi")],
    ["Batas risiko pembiayaan", String(borrowerRiskRows[0]?.[1] ?? "Pantau")],
    ["Negosiasi pasar", String(negotiationRows[0]?.[1] ?? "Perlu sumber resmi")],
    ["Draft perlu verifikasi", formatInteger(pendingQueue.length)],
    ["Celah stok/kesiapan", formatInteger(criticalStocks.length)],
    ["Aksi buyer disetujui", formatInteger(approvedBuyers.length)],
    ["Baris syarat buyer", formatInteger(buyerRequirements.length)],
    ["Permintaan pembiayaan agregat", financingReadiness ? formatInteger(financingReadiness.totals.totalRequests) : "Perlu aktivasi"],
    ["Pembiayaan terverifikasi", financingReadiness ? formatInteger(financingReadiness.totals.verifiedRequests) : "Perlu aktivasi"],
    ["Catatan stok", formatInteger(stockLedger.length)],
    ["Bukti media", formatInteger(mediaEvidence.length)],
    ["Sumber tabel tim", dashboardData?.prefixedDbStatus ? "Data operasional tim" : "Belum tersedia"],
    ["Status tabel data tim", dashboardData?.prefixedDbStatus?.status === "ready" ? "Siap dipakai" : "Perlu aktivasi"],
    ["Section laporan aktif", `${formatInteger(includedSections.length)} dari ${formatInteger(reportSections.length)}`],
    ["Status keputusan", locked ? "Dikunci untuk rapat pengurus" : "Draft laporan aksi"],
  ];

  async function toggleReportLock() {
    if (!dashboardData?.reportPeriod) {
      setMessage("Periode laporan belum tersedia dari data operasional.");
      return;
    }
    setWorking("lock");
    try {
      const response = await fetch("/api/report-periods/current/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !locked }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.message ?? payload.error ?? "Lock laporan gagal diperbarui.");
        return;
      }
      await loadReport();
      setMessage(!locked ? "Laporan dikunci untuk rapat pengurus." : "Laporan kembali menjadi draft.");
    } finally {
      setWorking("");
    }
  }

  function exportReport() {
    const generatedAt = new Date().toISOString();
    const reportRow = (
      section: string,
      field: string,
      value: string | number | boolean | null | undefined,
      sourceLabel: string,
      {
        freshness = generatedAt,
        confidence = "medium",
        nextAction = "Review pengurus sebelum tindakan.",
        privacyScope = "aggregate-no-pii",
        caveat = "Tidak ada secret atau data pribadi di baris laporan ini.",
      }: {
        freshness?: string;
        confidence?: string;
        nextAction?: string;
        privacyScope?: string;
        caveat?: string;
      } = {},
    ) => [
      section,
      redactSensitiveText(field),
      redactSensitiveText(value),
      publicSetupMessage(sourceLabel, "Sumber eksplorasi terbatas"),
      redactSensitiveText(freshness),
      redactSensitiveText(confidence),
      redactSensitiveText(nextAction),
      redactSensitiveText(privacyScope),
      publicSetupMessage(caveat, "Caveat sumber eksplorasi terbatas."),
    ];

    const signalExportRows = (
      section: string,
      items: Array<SignalSpineItem | Record<string, unknown>>,
      fallbackField: string,
      fallbackValue: string,
    ) =>
      (items.length ? items : [null]).map((item, index) =>
        reportRow(
          section,
          item ? signalItemLabel(item, `${fallbackField}-${index + 1}`) : fallbackField,
          item ? signalItemSummary(item) : fallbackValue,
          item ? signalItemSource(item) : "Bukti agregat",
          {
            confidence: signalSpineStatus === "ready" ? "aggregate" : "perlu aktivasi",
            nextAction: item
              ? signalField(item, ["nextAction", "action"]) || "Review manager/pengurus sebelum aksi bisnis."
              : "Tunggu bukti agregat tersedia sebelum memakai bagian ini.",
            privacyScope: "aggregate-no-pii-no-secrets",
            caveat: "CSV hanya mengekspor label/status agregat; tidak ada PII, secret, atau klaim konektor resmi.",
          },
        ),
      );

    const rows = [
      [
        "bagian",
        "field",
        "nilai",
        "label_sumber",
        "kemutakhiran",
        "keyakinan",
        "aksi_lanjutan",
        "ruang_lingkup_privasi",
        "caveat",
      ],
      ...executiveRows.map(([field, value]) => reportRow(
        "executive-summary",
        field,
        value,
        "Data operasional aplikasi + bukti agregat terbatas + daftar sumber",
        {
          confidence: status === "ready" ? "medium" : "limited",
          nextAction: "Gunakan sebagai pembuka rapat, lalu cek bagian detail sebelum kontak buyer atau pembiayaan.",
          caveat: "Ringkasan menggabungkan layanan operasional dan bukti agregat; bukan klaim produksi SIMKOPDES.",
        },
      )),
      ...signalExportRows(
        "bukti-agregat-sinyal",
        signalFamilies,
        "kelompok sinyal",
        "Tidak ada kelompok sinyal agregat dari layanan.",
      ),
      ...signalExportRows(
        "bukti-agregat-jejak",
        provenanceLedger,
        "jejak bukti",
        "Tidak ada jejak bukti agregat dari layanan.",
      ),
      reportRow(
        "bukti-agregat-gerbang-kesiapan",
        "gerbang kesiapan",
        signalSpine?.readinessGate ? signalItemSummary(signalSpine.readinessGate) : "Gerbang kesiapan belum tersedia.",
        signalItemSource(signalSpine?.readinessGate, "Bukti agregat"),
        {
          confidence: signalSpineStatus === "ready" ? "aggregate" : "perlu aktivasi",
          nextAction: signalField(signalSpine?.readinessGate, ["nextAction", "action"]) || "Manager memverifikasi kesiapan sebelum kontak buyer atau pembiayaan.",
          privacyScope: "aggregate-no-pii-no-secrets",
          caveat: "Gerbang kesiapan bersifat pendukung keputusan; tidak ada persetujuan otomatis atau klaim integrasi resmi.",
        },
      ),
      reportRow(
        "bukti-agregat-draft-penawaran",
        "draft penawaran",
        signalSpine?.offerPackDraft ? signalItemSummary(signalSpine.offerPackDraft) : "Draft penawaran belum tersedia.",
        signalItemSource(signalSpine?.offerPackDraft, "Bukti agregat"),
        {
          confidence: signalSpineStatus === "ready" ? "draft" : "perlu aktivasi",
          nextAction: signalField(signalSpine?.offerPackDraft, ["nextAction", "action"]) || "Validasi grade, stok, harga, margin, dan logistik sebelum offer dipakai.",
          privacyScope: "aggregate-no-pii-no-named-buyer",
          caveat: "Draft penawaran adalah bahan internal; bukan komitmen buyer atau kontak otomatis.",
        },
      ),
      ...signalExportRows(
        "bukti-agregat-tindak-lanjut",
        managerActionQueue,
        "antrean tindak lanjut",
        "Tidak ada tindak lanjut agregat dari layanan.",
      ),
      ...signalExportRows(
        "bukti-agregat-rencana-perbaikan",
        remediationPlanner,
        "rencana perbaikan",
        "Tidak ada rencana perbaikan agregat dari layanan.",
      ),
      ...signalExportRows(
        "bukti-agregat-kesiapan-konektor",
        connectorScorecard,
        "kesiapan konektor",
        "Tidak ada kesiapan konektor agregat dari layanan.",
      ),
      reportRow(
        "bukti-agregat-modal-kerja",
        "skenario modal kerja",
        signalSpine?.workingCapitalScenario ? signalItemSummary(signalSpine.workingCapitalScenario) : "Skenario modal kerja belum tersedia.",
        signalItemSource(signalSpine?.workingCapitalScenario, "Bukti agregat"),
        {
          confidence: signalSpineStatus === "ready" ? "scenario" : "perlu aktivasi",
          nextAction: signalField(signalSpine?.workingCapitalScenario, ["nextAction", "action"]) || "Gunakan sebagai skenario kerja, bukan persetujuan pembiayaan.",
          privacyScope: "aggregate-no-pii-no-auto-approval-claim",
          caveat: "Skenario modal kerja bukan keputusan kredit, audit, atau penilaian resmi.",
        },
      ),
      reportRow(
        "bukti-agregat-kesehatan-koperasi",
        "kesehatan koperasi",
        signalSpine?.cooperativeHealthGate ? signalItemSummary(signalSpine.cooperativeHealthGate) : "Indikator kesehatan koperasi belum tersedia.",
        signalItemSource(signalSpine?.cooperativeHealthGate, "Bukti agregat"),
        {
          confidence: signalSpineStatus === "ready" ? "aggregate" : "perlu aktivasi",
          nextAction: signalField(signalSpine?.cooperativeHealthGate, ["nextAction", "action"]) || "Pengurus mengecek indikator agregat sebelum keputusan rapat.",
          privacyScope: "aggregate-no-member-pii",
          caveat: "Indikator kesehatan adalah sinyal awal, bukan audit formal koperasi.",
        },
      ),
      ...signalExportRows(
        "bukti-agregat-kewenangan",
        rolePermissionMatrix,
        "kewenangan akses",
        "Tidak ada kewenangan akses dari layanan.",
      ),
      reportRow(
        "bukti-agregat-data-awal",
        "data awal",
        signalSpine?.demoFixture ? signalItemSummary(signalSpine.demoFixture) : "Data contoh belum tersedia.",
        signalItemSource(signalSpine?.demoFixture, "Bukti agregat"),
        {
          confidence: signalSpineStatus === "ready" ? "sampel awal" : "perlu aktivasi",
          nextAction: "Label data awal secara eksplisit saat presentasi.",
          privacyScope: "aggregate-no-pii",
          caveat: "Data awal tidak membuktikan integrasi produksi atau endorsement resmi.",
        },
      ),
      reportRow(
        "bukti-agregat-batas-klaim",
        "batas klaim",
        signalBoundarySentence,
        "Bukti agregat",
        {
          confidence: signalSpineStatus === "ready" ? "policy" : "perlu aktivasi",
          nextAction: "Gunakan kalimat batas ini di narasi dan laporan rapat.",
          privacyScope: "policy-no-pii",
          caveat: "Batas klaim menjaga narasi tetap berbasis bukti agregat dan direview manusia.",
        },
      ),
      ...reportDemoFlowSteps.map(([label, detail], index) => reportRow(
        "guided-mvp-flow",
        `step-${index + 1}-${label}`,
        detail,
        "MVP backlog",
        {
          confidence: "medium",
          nextAction: "Presenter mengikuti urutan alur dari dashboard ke laporan aksi.",
          privacyScope: "navigation-only",
          caveat: "Alur ini memandu penggunaan; bukan bukti integrasi produksi.",
        },
      )),
      ...reportRoleRows.map(([role, surface, workflow]) => reportRow(
        "kewenangan-akses",
        role,
        `${surface}; ${workflow}`,
        "Checklist kewenangan SIMKOPDES",
        {
          confidence: "workflow-design",
          nextAction: "Gunakan peran sesuai kewenangan saat aksi bisnis direview.",
          privacyScope: "peran-no-employee-pii",
          caveat: "Pemetaan peran adalah penyelarasan operasional presentasi; konektor resmi SIMKOPDES perlu aktivasi.",
        },
      )),
      ...reportApprovalStages.map(([stage, detail]) => reportRow(
        "alur-persetujuan",
        stage,
        detail,
        "human-in-the-loop policy",
        {
          confidence: "medium",
          nextAction: "Pastikan kontak buyer, pembiayaan, dan penguncian laporan tetap perlu persetujuan pengurus/manager.",
          privacyScope: "workflow-only",
          caveat: "AI tidak melakukan persetujuan otomatis.",
        },
      )),
      ...reportAiGuardrails.map((guardrail, index) => reportRow(
        "ai-business-risk-guardrail",
        `guardrail-${index + 1}`,
        guardrail,
        "MVP safety guardrail",
        {
          confidence: "policy",
          nextAction: "Tampilkan batas ini saat membahas analisis AI, risiko pembiayaan, dan negosiasi pasar.",
          privacyScope: "policy-no-pii",
          caveat: "Guardrail membatasi output AI agar tetap decision-support.",
        },
      )),
      reportRow(
        "sumber-bukti",
        "daftar sumber",
        `${sourceRegistrySummary}; status ${publicRegistryStatusLabel(sourceRegistry?.registryStatus ?? registryStatus)}`,
        publicSourceLabel(sourceRegistry?.source ?? "layanan sumber terbuka"),
        {
          confidence: registryStatus === "ready" ? "medium" : "limited",
          nextAction: "Aktifkan konektor hanya setelah akses resmi dan uji koneksi tersedia.",
          privacyScope: "registry-only-no-secrets",
          caveat: sourceRegistry?.registryPolicy?.externalClaims ?? "Integrasi eksternal tetap direncanakan sampai diuji.",
        },
      ),
      ...headlineMetrics.map((item) => reportRow(
        "bukti-agregat-ringkas",
        item.label,
        item.amountIdr ? `${formatInteger(item.value)} ${item.unit}; Rp${formatInteger(item.amountIdr)}` : `${formatInteger(item.value)} ${item.unit}`,
        hackathonSummary?.headlineEvidence?.caveat ?? "verifikasi bukti agregat",
        {
          confidence: "sampel-agregat",
          nextAction: "Gunakan sebagai bukti konteks eksplorasi, lalu cek detail sebelum keputusan.",
          privacyScope: "aggregate-no-pii",
          caveat: hackathonSummary?.headlineEvidence?.caveat ?? "Sampel eksplorasi, bukan KPI produksi.",
        },
      )),
      ...qualityChecks.map((check) => reportRow(
        "kualitas-data",
        check.table,
        `${formatInteger(check.totalRows)} baris; ${formatInteger(
          check.quality.reduce((total, item) => total + item.affectedRows, 0),
        )} catatan kualitas`,
        publicSourceLabel(hackathonDataQuality?.source ?? "layanan kualitas data"),
        {
          confidence: hackathonDataQuality ? "medium" : "limited",
          nextAction: "Ubah catatan kualitas menjadi tugas verifikasi sebelum rekomendasi dijalankan.",
          privacyScope: "aggregate-no-pii",
          caveat: "Catatan agregat tidak membuka baris pribadi atau dokumen mentah.",
        },
      )),
      ...directOpportunityAreas.slice(0, 5).map((item, index) => reportRow(
        "skor-peluang",
        `rank-${index + 1}`,
        `${[item.area.village, item.area.district, item.area.regency, item.area.province].filter(Boolean).join(", ") || "Area agregat"}; skor ${item.score}`,
        publicSourceLabel(hackathonOpportunityScores?.source ?? "layanan skor peluang"),
        {
          confidence: item.sourceCaveat?.confidence ?? "limited",
          nextAction: "Validasi stok, kualitas, kebutuhan buyer, dan sumber data sebelum tindak lanjut.",
          privacyScope: "area-aggregate-no-pii",
          caveat: item.sourceCaveat?.caveat ?? "Skor yang bisa dijelaskan adalah prioritas awal, bukan keputusan otomatis.",
        },
      )),
      ...directBuyerMatches.slice(0, 5).map((item) => reportRow(
        "kecocokan-buyer",
        `rank-${item.rank}-${item.buyerArchetypeLabel}`,
        `${item.cooperativeRef}; skor ${item.score}; ${publicRegistryStatusLabel(item.readinessCluster)}`,
        publicSourceLabel(hackathonBuyerMatching?.source ?? "layanan kecocokan buyer"),
        {
          confidence: item.score >= 60 ? "medium" : "limited",
          nextAction: item.readinessGaps?.[0] ?? hackathonBuyerMatching?.nextActions?.[0] ?? "Review manusia sebelum kontak buyer.",
          privacyScope: "tipe-buyer-tanpa-pii",
          caveat: "Kecocokan buyer memakai tipe kebutuhan dan profil tersamarkan, bukan buyer/koperasi bernama.",
        },
      )),
      ...p0Roadmap.map((item) => reportRow(
        "sumber-bukti",
        item.title,
        `${item.sources.join(" | ")}; ${item.output}`,
        "Rencana aktivasi sumber",
        {
          confidence: "planned-source",
          nextAction: "Jalankan cek sumber sebelum memakai data sebagai bukti operasional.",
          privacyScope: "registry-only-no-secrets",
          caveat: item.caveat,
        },
      )),
      ...reportDemoFlowSteps.map(([label, detail], index) => reportRow(
        "alur-mvp-terpandu",
        `step-${index + 1}-${label}`,
        detail,
        "dashboard/report UI",
        {
          nextAction: "Ikuti alur MVP tanpa melompat ke klaim marketplace penuh.",
          privacyScope: "alur-presentasi-tanpa-pii",
          caveat: "Mode panduan presenter bukan bukti integrasi eksternal.",
        },
      )),
      ...reportRoleRows.map(([role, surfaces, workflow]) => reportRow(
        "kewenangan-akses",
        role,
        `${surfaces}; ${workflow}`,
        "Checklist kewenangan SIMKOPDES",
        {
          confidence: "workflow-alignment",
          nextAction: "Pastikan aksi bisnis direview peran yang sesuai.",
          privacyScope: "peran-no-employee-pii",
          caveat: "Model peran mengikuti pola operasional, bukan daftar karyawan asli.",
        },
      )),
      ...managerCommandRows.map(([label, value, note]) => reportRow(
        "manager-command-center",
        label,
        value,
        "Baris tindak lanjut agregat",
        {
          nextAction: note,
          caveat: "Pusat tindak lanjut memberi daftar aksi, bukan keputusan otomatis.",
        },
      )),
      ...simkopdesChecklistRows.map((row) => reportRow(
        "checklist-kesiapan-simkopdes",
        row.item,
        row.status,
        "Penyelarasan gudang/POS/logistik/simpanan SIMKOPDES",
        {
          confidence: row.status === "Checklist" || row.status === "Alur kerja" ? "alur-kerja" : "medium",
          nextAction: "Lengkapi kesiapan sebelum kontak buyer agresif.",
          caveat: "Checklist operasional; stok resmi SIMKOPDES belum disinkronkan.",
        },
      )),
      ...approvalSummary.map(([label, value]) => reportRow(
        "alur-persetujuan",
        label,
        value,
        "antrean verifikasi + ringkasan kesiapan buyer",
        {
          nextAction: "Pindahkan rekomendasi melalui verifikasi sebelum persetujuan.",
          privacyScope: "aggregate-count-no-pii",
          caveat: "Disetujui berarti kesiapan internal, bukan kontak buyer atau pembiayaan otomatis.",
        },
      )),
      ...businessAnalystRows.map(([label, value, note]) => reportRow(
        "ai-business-analyst",
        label,
        value,
        "Kesiapan pembiayaan + sinyal POS agregat",
        {
          confidence: financingReadiness ? "limited-aggregate" : "needs-verification",
          nextAction: note,
          privacyScope: "aggregate-no-member-pii",
          caveat: "Peringatan awal saja, bukan audit formal atau opini akuntansi.",
        },
      )),
      ...borrowerRiskRows.map(([label, value, note]) => reportRow(
        "risiko-pembiayaan",
        label,
        value,
        "Antrean pembiayaan + sinyal stok/kesiapan",
        {
          confidence: "risk-flag",
          nextAction: note,
          privacyScope: "tersamarkan-tanpa-identitas-anggota",
          caveat: "Tidak ada persetujuan/penolakan otomatis dan tidak ada label fraud.",
        },
      )),
      ...negotiationRows.map(([label, value, note]) => reportRow(
        "negosiasi-pasar",
        label,
        value,
        "Syarat buyer + kesiapan sumber pasar",
        {
          confidence: value === "Perlu sumber resmi" ? "source-required" : "draft",
          nextAction: note,
          privacyScope: "tipe-buyer-tanpa-buyer-bernama",
          caveat: "Tidak ada harga real-time palsu dan tidak ada kontak buyer otomatis.",
        },
      )),
      ...commodityHighlights.slice(0, 5).map((item) => reportRow(
        "peluang-utama",
        `rank-${item.rank}`,
        `${item.commodity}; ${item.sector}; peringkat ${item.rank}; keyakinan ${item.confidence}`,
        item.sourceLevel,
        {
          confidence: item.confidence,
          nextAction: item.basis,
          privacyScope: "commodity-label-no-member-pii",
          caveat: "Sorotan peluang perlu validasi tim koperasi sebelum kontak buyer.",
        },
      )),
      reportRow("verifikasi-tertunda", "total item tertunda", pendingQueue.length, "Data operasional aplikasi", {
        nextAction: "Tim koperasi menutup draft atau minta bukti tambahan.",
        caveat: "Menampilkan jumlah, bukan isi pesan atau kontak warga.",
      }),
      reportRow("aksi-buyer", "total aksi tipe buyer", buyers.length, "Data operasional aplikasi", {
        nextAction: "Review tipe buyer dan syarat kualitas sebelum kontak buyer.",
        privacyScope: "tipe-buyer-tanpa-buyer-bernama",
        caveat: "Buyer matching lite bukan komitmen buyer bernama.",
      }),
      reportRow("aksi-buyer", "aksi buyer disetujui", approvedBuyers.length, "Data operasional aplikasi", {
        nextAction: "Gunakan persetujuan sebagai izin internal untuk draft kontak buyer, bukan klaim penjualan.",
        privacyScope: "tipe-buyer-tanpa-buyer-bernama",
        caveat: "Persetujuan pengurus tidak membuktikan buyer siap membeli.",
      }),
      reportRow("syarat-buyer", "baris syarat buyer", buyerRequirements.length, "Syarat buyer", {
        nextAction: "Cek grade, kemasan, target waktu, dan label sumber.",
        privacyScope: "tipe-buyer-tanpa-buyer-bernama",
        caveat: "Syarat buyer adalah proxy kesiapan sampai catatan buyer terverifikasi tersedia.",
      }),
      ...financingStatuses.map((item) => reportRow(
        "financing-readiness",
        item.status,
        `${formatInteger(item.requests)} permintaan; ${formatInteger(item.amount)} nominal agregat`,
        publicSourceLabel(financingReadiness?.source ?? "layanan kesiapan pembiayaan"),
        {
          freshness: financingReadiness?.freshness?.generatedAt ?? "perlu aktivasi",
          confidence: financingReadiness?.confidence?.level ?? "limited",
          nextAction: `Deal room: lanjutkan checklist untuk status ${item.status}.`,
          privacyScope: "aggregate-no-pii-no-auto-approval-claim",
          caveat: financingReadiness?.confidence?.caveat ?? "Kesiapan pembiayaan bukan persetujuan otomatis.",
        },
      )),
      ...financingChecklist.map((item) => reportRow(
        "financing-checklist",
        item.title,
        item.status,
        publicSourceLabel(item.source),
        {
          freshness: financingReadiness?.freshness?.generatedAt ?? "perlu aktivasi",
          confidence: financingReadiness?.confidence?.level ?? "limited",
          nextAction: item.nextAction,
          privacyScope: "aggregate-no-pii-no-auto-approval-claim",
          caveat: item.caveat,
        },
      )),
      reportRow("stock-readiness-gap", "baris stok/kesiapan kritis", criticalStocks.length, "Data operasional aplikasi", {
        nextAction: "Verifikasi stok, grade, dan jadwal pickup sebelum buyer action.",
        caveat: "Jumlah stok kritis berasal dari state operasional app, bukan stok nasional.",
      }),
      reportRow("stock-readiness-gap", "total baris stok", stocks.length, "Data operasional aplikasi", {
        nextAction: "Pisahkan stok aman, terbatas, restock, dan menunggu grade.",
        caveat: "Stock row bukan bukti volume siap kirim tanpa verifikasi.",
      }),
      reportRow("stock-ledger", "baris riwayat stok", stockLedger.length, "Riwayat stok", {
        nextAction: "Cek referensi bukti untuk pergerakan stok yang masuk laporan.",
        caveat: "Metadata riwayat tidak menyertakan media mentah atau dokumen.",
      }),
      reportRow("media-evidence", "baris bukti media", mediaEvidence.length, "Bukti media", {
        nextAction: "Gunakan label redacted dan status verifikasi, bukan file mentah.",
        privacyScope: "metadata-no-media-mentah",
        caveat: "Media mentah/storage URI tidak diekspor ke CSV.",
      }),
      reportRow(
        "team-table-status",
        publicSetupMessage(dashboardData?.prefixedDbStatus?.message, "Status tabel data tim perlu dicek di server."),
        dashboardData?.prefixedDbStatus?.tables.length ?? 0,
        "Data operasional tim",
        {
          confidence: dashboardData?.prefixedDbStatus?.status ?? "unknown",
          nextAction: "Jalankan aktivasi data tim bila status belum siap.",
          caveat: "Tabel tim milik aplikasi; sumber eksplorasi tetap agregat terbatas.",
        },
      ),
      ...(topHackathonOpportunity
        ? [reportRow(
            "bukti-agregat-peluang",
            topHackathonOpportunity.province,
            `${topHackathonOpportunity.commodityRows} baris komoditas; ${topHackathonOpportunity.cooperatives} koperasi`,
            "Bukti agregat terbatas",
            {
              freshness: hackathonStatus === "ready" ? generatedAt : "perlu aktivasi",
              confidence: "sampel-eksplorasi",
              nextAction: "Kirim area teratas ke review skor peluang dan kecocokan buyer.",
              caveat: hackathonSummary?.schemaScope?.description ?? "Sampel eksplorasi, bukan KPI produksi.",
            },
          )]
        : []),
    ];
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "lumbung-bersama-laporan-aksi.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("CSV laporan aksi dibuat tanpa secret dan tanpa data pribadi anggota.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#C92A2A]">Laporan Aksi</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Paket keputusan koperasi.
            </h1>
          </div>
          <FileCheck2 size={28} strokeWidth={2.2} className="text-[#2F7D32]" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-semibold leading-7 text-[#53606A]">
          Laporan ini menutup alur MVP: ringkasan keputusan, peluang teratas, bukti agregat,
          antrean verifikasi, aksi buyer, celah stok, dan status keputusan.
        </p>

        <div className="mt-5 grid gap-3">
          {executiveRows.map(([label, value]) => (
            <div key={label} className="grid gap-2 rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4 sm:grid-cols-[0.45fr_0.55fr]">
              <p className="text-sm font-black text-[#7A4E2D]">{label}</p>
              <p className="text-sm font-bold text-[#1F2933]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={exportReport}
            disabled={status !== "ready"}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-5 py-3 text-sm font-extrabold text-[#FFF8EA] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:lb-focus"
          >
            <Download size={17} strokeWidth={2.2} aria-hidden="true" />
            Ekspor CSV
          </button>
          <button
            type="button"
            onClick={toggleReportLock}
            disabled={status !== "ready" || working === "lock"}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] px-5 py-3 text-sm font-extrabold text-[#1F2933] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:lb-focus"
          >
            <Lock size={17} strokeWidth={2.2} aria-hidden="true" />
            {locked ? "Buka Draft" : "Kunci Rapat"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void loadReport()}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E7DED1] bg-[#FFFCF5] px-5 py-3 text-sm font-extrabold text-[#1F2933] focus-visible:lb-focus"
        >
          <RefreshCcw size={17} strokeWidth={2.2} aria-hidden="true" />
          Refresh data
        </button>
      </section>

      <section className="grid gap-5">
        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Alur laporan</p>
              <h2 className="mt-2 text-2xl font-black">Urutan MVP dan kewenangan SIMKOPDES</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              bukti agregat
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {reportDemoFlowSteps.map(([label, detail], index) => (
              <div key={label} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                <p className="font-mono text-xs font-black text-[#D79A2B]">0{index + 1}</p>
                <p className="mt-2 text-sm font-black">{label}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E7DED1]">
                  {["Peran", "Area", "Alur kerja"].map((heading) => (
                    <th key={heading} className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#7A4E2D]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7DED1]">
                {reportRoleRows.map(([role, surface, workflow]) => (
                  <tr key={role}>
                    <td className="px-3 py-3 text-sm font-black">{role}</td>
                    <td className="px-3 py-3 text-xs font-bold text-[#53606A]">{surface}</td>
                    <td className="px-3 py-3 text-xs font-semibold leading-5 text-[#53606A]">{workflow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Bukti agregat</p>
              <h2 className="mt-2 text-2xl font-black">Sinyal kesiapan, jejak bukti, dan tindak lanjut</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">
                Section ini membaca sumber bukti agregat untuk ringkasan audit; tidak menampilkan PII, secret, atau klaim konektor resmi.
              </p>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              {signalSpineStatus === "ready" ? "agregat siap" : signalSpineStatus === "loading" ? "memuat" : "perlu aktivasi"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {signalOverviewRows.map(([label, value, detail]) => (
              <div key={label} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                <p className="text-xs font-black uppercase text-[#C92A2A]">{label}</p>
                <p className="mt-2 text-xl font-black text-[#1F2933]">{value}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-black uppercase text-[#C92A2A]">Kelompok sinyal</p>
              <div className="mt-3 space-y-2">
                {signalFamilies.length > 0 ? (
                  signalFamilies.slice(0, 4).map((item, index) => (
                    <div key={`${signalItemLabel(item, "signal")}-${index}`} className="rounded-[12px] bg-[#FFFCF5] p-3">
                      <p className="font-black">{signalItemLabel(item, `Sinyal ${index + 1}`)}</p>
                      <p className="mt-1 text-xs font-bold text-[#7A4E2D]">{signalItemStatus(item)}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#53606A]">{signalItemSummary(item)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-[#53606A]">Kelompok sinyal belum tersedia dari layanan.</p>
                )}
              </div>
            </div>

            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-black uppercase text-[#C92A2A]">Jejak bukti</p>
              <div className="mt-3 space-y-2">
                {provenanceLedger.length > 0 ? (
                  provenanceLedger.slice(0, 4).map((item, index) => (
                    <div key={`${signalItemLabel(item, "provenance")}-${index}`} className="rounded-[12px] bg-[#FFFCF5] p-3">
                      <p className="font-black">{signalItemLabel(item, `Jejak ${index + 1}`)}</p>
                      <p className="mt-1 text-xs font-bold text-[#7A4E2D]">{signalItemSource(item)}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#53606A]">{signalItemSummary(item)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-[#53606A]">Jejak bukti belum tersedia dari layanan.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {signalGateCards.map((card) => (
              <div key={card.label} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                <p className="text-xs font-black uppercase text-[#C92A2A]">{card.label}</p>
                {card.item ? (
                  <>
                    <p className="mt-2 text-sm font-black">{signalItemLabel(card.item, card.label)}</p>
                    <p className="mt-1 text-xs font-bold text-[#7A4E2D]">{signalItemStatus(card.item)}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{signalItemSummary(card.item)}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">{card.empty}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {signalActionGroups.map((group) => (
              <div key={group.label} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                <p className="text-xs font-black uppercase text-[#C92A2A]">{group.label}</p>
                <div className="mt-3 space-y-2">
                  {group.rows.length > 0 ? (
                    group.rows.slice(0, 4).map((item, index) => (
                      <div key={`${signalItemLabel(item, group.label)}-${index}`} className="rounded-[12px] bg-[#FFFCF5] p-3">
                        <p className="font-black">{signalItemLabel(item, `${group.label} ${index + 1}`)}</p>
                        <p className="mt-1 text-xs font-bold text-[#7A4E2D]">{signalItemStatus(item)}</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-[#53606A]">{signalItemSummary(item)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[#53606A]">{group.empty}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-black uppercase text-[#C92A2A]">Kewenangan akses</p>
              <div className="mt-3 space-y-2">
                {rolePermissionMatrix.length > 0 ? (
                  rolePermissionMatrix.slice(0, 5).map((item, index) => (
                    <div key={`${signalItemLabel(item, "role")}-${index}`} className="rounded-[12px] bg-[#FFFCF5] p-3">
                      <p className="font-black">{signalItemLabel(item, `Peran ${index + 1}`)}</p>
                      <p className="mt-1 text-xs font-bold text-[#7A4E2D]">{signalItemStatus(item)}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#53606A]">{signalItemSummary(item)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-[#53606A]">Kewenangan akses belum tersedia dari layanan.</p>
                )}
              </div>
            </div>

            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-black uppercase text-[#C92A2A]">Batas klaim</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#53606A]">{signalBoundarySentence}</p>
              <p className="mt-4 text-xs font-bold leading-5 text-[#7A4E2D]">
                Kesiapan konektor tetap discovery sampai akses resmi, implementasi, dan uji koneksi terverifikasi.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Pusat tindak lanjut</p>
              <h2 className="mt-2 text-2xl font-black">Aksi operasional dan kesiapan SIMKOPDES</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">
                Laporan menunjukkan tindak lanjut tim koperasi untuk POS, inventori, logistik, buyer, pembiayaan, dan kualitas data.
              </p>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              perlu aktivasi resmi
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {managerCommandRows.map(([label, value, note]) => (
              <div key={label} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-black">{label}</p>
                  <span className="font-mono text-xs font-black text-[#D79A2B]">{value}</span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{note}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {simkopdesChecklistRows.map((row) => (
              <div key={row.item} className="rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] p-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={17} strokeWidth={2.2} className="mt-0.5 text-[#2F7D32]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-black">{row.item}</p>
                    <p className="mt-1 text-xs font-bold text-[#53606A]">Status: {row.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Batas penggunaan AI</p>
              <h2 className="mt-2 text-2xl font-black">Analisis, risiko pembiayaan, dan negosiasi</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              perlu persetujuan
            </span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">Analisis AI</p>
              <div className="mt-3 space-y-2">
                {businessAnalystRows.map(([label, value, note]) => (
                  <div key={label} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{label}</p>
                    <p className="mt-1 text-xs font-bold text-[#7A4E2D]">{value}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#53606A]">{note}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">Risiko pembiayaan</p>
              <div className="mt-3 space-y-2">
                {borrowerRiskRows.map(([label, value, note]) => (
                  <div key={label} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{label}</p>
                    <p className="mt-1 text-xs font-bold text-[#C92A2A]">{value}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#53606A]">{note}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">Negosiasi pasar</p>
              <div className="mt-3 space-y-2">
                {negotiationRows.map(([label, value, note]) => (
                  <div key={label} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{label}</p>
                    <p className="mt-1 text-xs font-bold text-[#1D5D8F]">{value}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#53606A]">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {reportAiGuardrails.map((item) => (
              <div key={item} className="rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] p-3 text-xs font-bold leading-5 text-[#7A4E2D]">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Bukti dan sumber</p>
              <h2 className="mt-2 text-2xl font-black">Peluang teratas dan data pendukung</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              {hackathonStatus === "ready" ? "Bukti agregat" : "Perlu aktivasi"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-sm font-black text-[#D79A2B]">Highlight peluang</p>
              <div className="mt-3 space-y-3">
                {commodityHighlights.length > 0 ? (
                  commodityHighlights.slice(0, 4).map((item) => (
                    <div key={`${item.commodity}-${item.rank}`} className="rounded-[12px] bg-black/5 p-3">
                      <p className="font-black">{item.commodity}</p>
                      <p className="mt-1 text-xs font-semibold text-[#53606A]">
                        {item.sector} - sumber {publicSourceLabel(item.sourceLevel)} - keyakinan {publicRegistryStatusLabel(item.confidence)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-[#53606A]">Belum ada highlight komoditas dari data operasional.</p>
                )}
              </div>
            </div>

            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-sm font-black text-[#D79A2B]">Agregat eksplorasi</p>
              {topHackathonOpportunity ? (
                <div className="mt-3 rounded-[12px] bg-black/5 p-3">
                  <p className="font-black">{topHackathonOpportunity.province}</p>
                  <p className="mt-1 text-xs font-semibold text-[#53606A]">
                    {formatInteger(topHackathonOpportunity.villages)} wilayah, {formatInteger(topHackathonOpportunity.commodityRows)} komoditas, {formatInteger(topHackathonOpportunity.cooperatives)} koperasi.
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#7A4E2D]">
                    {publicProductText(hackathonSummary?.schemaScope?.description, "Sampel eksplorasi, bukan referensi utama SIMKOPDES.")}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-[#53606A]">
                  Sumber eksplorasi belum aktif atau butuh login. Laporan tetap tidak membuat angka palsu.
                </p>
              )}
            </div>

            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-sm font-black text-[#D79A2B]">Daftar sumber eksternal</p>
              {registryStatus === "ready" ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-[12px] bg-black/5 p-3">
                    <p className="font-black">{sourceRegistrySummary}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">
                      {publicRegistryStatusLabel(sourceRegistry?.registryStatus ?? "static registry")} - {formatInteger(importedAreaTotal)} wilayah terhitung.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <p className="text-xs font-black uppercase text-[#7A4E2D]">Klaim konektor</p>
                    <p className="text-xs font-semibold text-[#53606A]">
                      {formatInteger(discoveryOrPlannedSources)} discovery/direncanakan, {formatInteger(activationRequiredConnectors)} perlu aktivasi, {formatInteger(implementedConnectors)} siap dipakai.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sourceLabels.slice(0, 5).map((label) => (
                      <span key={label} className="rounded-full border border-[#E7DED1] bg-[#FFFCF5] px-3 py-1 text-[11px] font-black text-[#7A4E2D]">
                        {publicSourceLabel(label)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-[#53606A]">
                  Daftar sumber belum terbaca. Klaim integrasi tetap discovery/direncanakan.
                </p>
              )}
            </div>
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Keselarasan SIMKOPDES</p>
              <h2 className="mt-2 text-2xl font-black">Peran, persetujuan, dan batas AI</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">
                Laporan ini memosisikan Lumbung Bersama sebagai lapisan operasional koperasi: sesuai kewenangan, direview manusia, dan berbasis bukti agregat.
              </p>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              no PII
            </span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-black uppercase text-[#C92A2A]">Kewenangan peran</p>
              <div className="mt-3 space-y-2">
                {reportRoleRows.slice(0, 4).map(([role, surface, workflow]) => (
                  <div key={role} className="rounded-[12px] bg-[#FFFCF5] p-3">
                    <p className="font-black">{role}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">{surface}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">{workflow}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-black uppercase text-[#C92A2A]">Alur persetujuan</p>
              <div className="mt-3 space-y-2">
                {reportApprovalStages.map(([stage, detail], index) => (
                  <div key={stage} className="rounded-[12px] bg-[#FFFCF5] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{stage}</p>
                      <span className="font-mono text-xs font-black text-[#D79A2B]">0{index + 1}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-black uppercase text-[#C92A2A]">Batas AI</p>
              <div className="mt-3 space-y-2">
                {reportAiGuardrails.map((guardrail) => (
                  <div key={guardrail} className="rounded-[12px] bg-[#FFFCF5] p-3 text-xs font-bold leading-5 text-[#53606A]">
                    {guardrail}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Rencana sumber bukti</p>
              <h2 className="mt-2 text-2xl font-black">Label bukti dan rencana aktivasi</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              rencana sumber
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {p0Roadmap.length > 0 ? (
              p0Roadmap.map((item) => (
                <div key={item.id} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                  <p className="font-black text-[#1F2933]">{publicProductText(item.title, "Sumber bukti")}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{publicProductText(item.output, "Output sumber belum tersedia.")}</p>
                  <p className="mt-3 text-xs font-black text-[#7A4E2D]">
                    {item.sources.map((source) => publicSourceLabel(source)).join(" / ")}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{publicProductText(item.caveat, "Catatan sumber belum tersedia.")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-[#53606A]">
                Rencana sumber belum tersedia dari layanan.
              </p>
            )}
          </div>
          <p className="mt-4 text-xs font-bold leading-5 text-[#7A4E2D]">
            {publicSetupMessage(
              sourceRegistry?.registryPolicy?.externalClaims,
              "Integrasi eksternal tetap berstatus discovery atau direncanakan sampai konektor diuji.",
            )}
          </p>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-sm font-black text-[#C92A2A]">Perlu verifikasi</p>
              <div className="mt-3 space-y-2">
                {pendingQueue.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.id}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">{publicProductText(item.module, "Modul operasional")} - {publicRegistryStatusLabel(item.status)}</p>
                  </div>
                ))}
                {pendingQueue.length === 0 ? <p className="text-sm font-semibold text-[#53606A]">Tidak ada draft tertunda dari layanan.</p> : null}
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-[#C92A2A]">Kesiapan buyer</p>
              <div className="mt-3 space-y-2">
                {buyers.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.buyer}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">{item.matchScore}% - {publicRegistryStatusLabel(item.status)}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">{buyerEvidenceLabel(item)}</p>
                  </div>
                ))}
                {buyers.length === 0 ? <p className="text-sm font-semibold text-[#53606A]">Belum ada kesiapan buyer dari layanan.</p> : null}
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-[#C92A2A]">Celah stok/kesiapan</p>
              <div className="mt-3 space-y-2">
                {criticalStocks.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">{publicRegistryStatusLabel(item.state)} - {item.location}</p>
                  </div>
                ))}
                {criticalStocks.length === 0 ? <p className="text-sm font-semibold text-[#53606A]">Tidak ada celah stok kritis dari layanan.</p> : null}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Kesiapan pembiayaan</p>
              <h2 className="mt-2 text-2xl font-black">Ruang keputusan berbasis agregat</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">
                Status draft, diajukan, dan terverifikasi ditampilkan sebagai kesiapan dokumen dan komite, bukan persetujuan otomatis.
              </p>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              {financingReadiness ? "Bukti agregat" : "Perlu aktivasi"}
            </span>
          </div>
          {financingReadiness ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {financingStatuses.map((item) => (
                  <div key={item.statusKey} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                    <p className="text-sm font-black text-[#D79A2B]">{publicRegistryStatusLabel(item.status)}</p>
                    <p className="mt-2 text-3xl font-black">{formatInteger(item.requests)}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">{formatInteger(item.amount)} nominal agregat</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                  <p className="text-xs font-black uppercase text-[#C92A2A]">Kanal pembiayaan</p>
                  <div className="mt-3 space-y-2">
                    {financingChannels.length > 0 ? (
                      financingChannels.map((item) => (
                        <div key={item.channel} className="flex items-center justify-between gap-3 text-xs font-bold text-[#53606A]">
                          <span>{item.channel}</span>
                          <span>{formatInteger(item.requests)} / {formatInteger(item.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-[#53606A]">Kanal pembiayaan belum terdeteksi.</p>
                    )}
                  </div>
                  <p className="mt-4 text-xs font-bold leading-5 text-[#7A4E2D]">
                    Diperbarui: {financingReadiness.freshness?.generatedAt ?? "permintaan saat ini"}.
                    Keyakinan: {publicRegistryStatusLabel(financingReadiness.confidence?.level ?? "limited")}.
                  </p>
                </div>
                <div className="grid gap-3">
                  {financingChecklist.map((item) => (
                    <div key={item.id} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black">{publicProductText(item.title, "Checklist pembiayaan")}</p>
                        <span className="rounded-[8px] bg-[#FFFCF5] px-2.5 py-1 text-[11px] font-black text-[#7A4E2D]">
                          {publicRegistryStatusLabel(item.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{publicProductText(item.nextAction, "Lanjutkan review komite.")}</p>
                      <p className="mt-2 text-xs font-bold leading-5 text-[#7A4E2D]">{publicProductText(item.caveat, "Bukti agregat perlu direview sebelum keputusan.")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4 text-sm font-semibold text-[#53606A]">
              Sumber eksplorasi belum aktif atau butuh login. Laporan tidak membuat angka pembiayaan palsu.
            </p>
          )}
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Tabel data tim</p>
              <h2 className="mt-2 text-2xl font-black">Syarat buyer, riwayat stok, dan bukti</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              {dashboardData?.prefixedDbStatus?.status === "ready" ? "data siap" : "perlu aktivasi"}
            </span>
          </div>
          {dashboardData?.prefixedDbStatus ? (
            <div className="mt-4 rounded-[12px] bg-[#FFF8EA] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black">
                  {publicSetupMessage(dashboardData.prefixedDbStatus.message, "Status tabel data tim perlu dicek di server.")}
                </p>
                <span className="w-fit rounded-[8px] bg-white px-2.5 py-1 text-xs font-black text-[#7A4E2D]">
                  {dashboardData.prefixedDbStatus.status === "ready" ? "Siap dipakai" : "Perlu aktivasi"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {dashboardData.prefixedDbStatus.tables.map((table) => (
                  <div key={table.tableName} className="rounded-[10px] bg-white p-2 text-xs font-bold text-[#53606A]">
                    <p className="truncate text-[#172027]">{teamTableLabel(table.tableName)}</p>
                    <p className="mt-1">
                      {table.status === "ready" ? `${formatInteger(table.rows)} catatan` : "perlu aktivasi"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">Syarat buyer</p>
              <div className="mt-3 space-y-2">
                {buyerRequirements.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.productName}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">
                      {formatInteger(item.requiredQuantity)} {item.unitLabel} - {publicRegistryStatusLabel(item.verificationStatus)}
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">{publicSourceLabel(item.sourceLabel)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">Riwayat stok</p>
              <div className="mt-3 space-y-2">
                {stockLedger.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.stockName}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">
                      {publicProductText(item.movementType, "Pergerakan stok")} - {formatInteger(item.quantity)} {item.unitLabel}
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">Bukti: {publicSourceLabel(item.evidenceRef)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">Bukti media</p>
              <div className="mt-3 space-y-2">
                {mediaEvidence.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.redactedLabel}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#53606A]">{item.caption}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">{publicRegistryStatusLabel(item.verificationStatus)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex items-start gap-3">
            {status === "ready" ? (
              <CheckCircle2 size={20} strokeWidth={2.2} className="mt-0.5 text-[#2F7D32]" aria-hidden="true" />
            ) : (
              <AlertTriangle size={20} strokeWidth={2.2} className="mt-0.5 text-[#D79A2B]" aria-hidden="true" />
            )}
            <div>
              <p className="font-black">Status keputusan</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#53606A]">{message}</p>
              <p className="mt-2 text-xs font-bold text-[#7A4E2D]">
                Pembiayaan ditampilkan sebagai kesiapan saja. Keputusan tetap oleh komite/pengurus koperasi.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

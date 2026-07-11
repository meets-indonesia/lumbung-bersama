"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Database,
  Download,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  MapPinned,
  Menu,
  MessageCircle,
  Moon,
  PackageCheck,
  Play,
  RefreshCcw,
  Save,
  Search,
  Send,
  Settings,
  CircleDollarSign,
  Sun,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import {
  aiAgents,
  featureDetails,
  featureModules,
  integrationChecks,
  villageInsights,
  waIntents,
} from "@/lib/demo-data";
import { stitchAssets } from "@/lib/stitch-assets";
import { StatusBadge } from "./StatusBadge";

const navGroups = [
  {
    label: "Alur Kerja",
    items: [
      { label: "Ringkasan", view: "overview", icon: LayoutDashboard },
      { label: "Peta Potensi", view: "peta-unggulan", icon: MapPinned },
      { label: "Rekomendasi Produk", view: "lumbung-data", icon: Database },
      { label: "Buyer Awal", view: "pasar-mitra", icon: Building2 },
      { label: "Kesiapan Stok", view: "stok-logistik", icon: Warehouse },
      { label: "Laporan Aksi", view: "laporan", icon: FileText },
    ],
  },
  {
    label: "Intake & kesiapan",
    items: [
      { label: "WA Inbox", view: "wa", icon: MessageCircle },
      { label: "AI Agent", view: "agents", icon: Bot },
      { label: "Gerai Pintar", view: "gerai-pintar", icon: Store },
      { label: "Simpan Pinjam", view: "simpan-pinjam", icon: CircleDollarSign },
      { label: "Kesiapan Sistem", view: "integrasi", icon: Settings },
    ],
  },
];

const TOUR_STORAGE_KEY = "lumbung-bersama-dashboard-tour-v3";
const WELCOME_STORAGE_KEY = "lumbung-bersama-dashboard-welcome-v2";

type TourStep = {
  id: string;
  title: string;
  body: string;
  selector: string;
  view?: string;
};

const dashboardTourSteps: TourStep[] = [
  {
    id: "sidebar",
    title: "Navigasi kerja",
    body: "Sidebar sekarang mengikuti flow MVP: peta, rekomendasi, buyer, kesiapan stok, dan laporan aksi.",
    selector: "[data-tour='sidebar']",
  },
  {
    id: "search",
    title: "Cari cepat",
    body: "Cari nomor LB, nama warga, modul, atau status. Ini membantu operator menemukan catatan tanpa membuka menu satu per satu.",
    selector: "[data-tour='global-search']",
  },
  {
    id: "queue",
    title: "Antrean verifikasi",
    body: "Data warga dari WhatsApp masuk sebagai draft pendukung. Operator bisa tanya ulang, setujui, atau membuka modul tujuan.",
    selector: "[data-tour='work-queue']",
    view: "overview",
  },
  {
    id: "lumbung-data",
    title: "Rekomendasi produk",
    body: "Langkah ini membaca bukti, peluang, dan catatan verifikasi sebelum produk dipilih untuk buyer atau stok.",
    selector: "[data-tour='lumbung-data']",
    view: "lumbung-data",
  },
  {
    id: "peta",
    title: "Peta Unggulan",
    body: "Peta dibuka sebagai halaman penuh agar operator bisa drill-down wilayah, komoditas, dan sumber.",
    selector: "[data-testid='dashboard-nav-peta-unggulan']",
  },
  {
    id: "profile",
    title: "Profil dan keamanan",
    body: "Profil operator, update data kerja, notifikasi, mode terang/gelap, dan logout ada di kanan atas.",
    selector: "[data-tour='operator-profile']",
  },
];

const operatorFlowSteps = [
  {
    id: "peta",
    label: "Peta",
    actionLabel: "Buka peta",
    href: "/peta-unggulan",
    detail: "Pilih wilayah atau komoditas tanpa klaim coverage nasional penuh.",
  },
  {
    id: "recommendation",
    label: "Rekomendasi",
    actionLabel: "Rekomendasi",
    targetView: "lumbung-data",
    detail: "Lihat produk/komoditas yang diprioritaskan, alasan skor, dan catatan verifikasi data.",
  },
  {
    id: "buyer",
    label: "Buyer",
    actionLabel: "Buyer",
    targetView: "pasar-mitra",
    detail: "Cocokkan kebutuhan pembeli dengan kesiapan koperasi.",
  },
  {
    id: "stok",
    label: "Stok",
    actionLabel: "Stok",
    targetView: "stok-logistik",
    detail: "Cek kesiapan stok, riwayat, dan bukti sebelum aksi buyer.",
  },
  {
    id: "laporan",
    label: "Laporan",
    actionLabel: "Laporan",
    href: "/laporan",
    detail: "Tutup alur dengan keputusan dan daftar aksi berikutnya.",
  },
] as const;

const simkopdesRoleAccessMatrix = [
  {
    role: "Pengurus",
    surfaces: "/dashboard, /laporan",
    workflow: "Kebijakan, penguncian laporan, keputusan pembiayaan, dan kontak buyer.",
    review: "Persetujuan akhir",
  },
  {
    role: "Manager Koperasi",
    surfaces: "/dashboard, /peta-unggulan, /laporan",
    workflow: "Memantau transaksi, gudang, pengiriman, peluang, dan buyer.",
    review: "Ruang kendali",
  },
  {
    role: "Staff/Admin Gudang",
    surfaces: "Kesiapan stok",
    workflow: "Produk, barang masuk/keluar, inventaris, lokasi penyimpanan.",
    review: "Validasi stok dan bukti",
  },
  {
    role: "Staff/Admin Logistik",
    surfaces: "Logistik",
    workflow: "Pickup, pilih kurir, tahap persiapan pengiriman, bukti pengiriman.",
    review: "Validasi pengiriman",
  },
  {
    role: "Kasir",
    surfaces: "Sinyal POS",
    workflow: "Transaksi agregat, pickup/pengiriman, subsidi bila tersedia.",
    review: "Tanpa detail pelanggan",
  },
  {
    role: "Kurir",
    surfaces: "Pemenuhan",
    workflow: "Mulai pengiriman, tandai tiba, bukti foto bila sudah diatur.",
    review: "Tanpa data penerima publik",
  },
  {
    role: "Viewer audit",
    surfaces: "/dashboard, /peta-unggulan, /laporan",
    workflow: "Melihat alur sampel/agregat tanpa PII.",
    review: "Baca saja",
  },
] as const;

const approvalWorkflowSteps = [
  {
    label: "Direkomendasikan",
    detail: "AI atau aturan lokal membuat rekomendasi awal dengan sumber, keyakinan, dan catatan batas.",
  },
  {
    label: "Perlu verifikasi",
    detail: "Operator memeriksa stok, dokumen, harga, buyer requirement, dan bukti.",
  },
  {
    label: "Disetujui",
    detail: "Pengurus atau manager menyetujui tindak lanjut; bukan keputusan otomatis AI.",
  },
] as const;

const simkopdesReadinessChecklist = [
  "Produk punya satuan dan kategori jelas",
  "Potensi desa terhubung ke sumber skor peluang",
  "Pemasok lokal/UMKM/petani dicatat sebagai sumber, bukan data pribadi publik",
  "Barang masuk dan barang keluar punya alasan dan referensi bukti",
  "Inventaris tidak negatif, bukan label generik, dan tidak masih draft",
  "Harga beli/jual atau market input operator tersedia sebelum negosiasi",
  "Dokumentasi foto/status verifikasi tersedia tanpa media mentah publik",
  "Gudang, lokasi penyimpanan, kurir, dan bukti kirim menjadi tahap kesiapan",
] as const;

const memberSavingsAlignment = [
  "Simpanan Pokok",
  "Simpanan Wajib",
  "Simpanan Sukarela",
  "Periode tagihan dan status lunas agregat",
  "Bukti bayar dan export Excel sebagai roadmap terkendali",
  "Penarikan simpanan mengikuti aturan koperasi dan persetujuan pengurus",
] as const;

const analystGuardrails = [
  "Analisis memakai aggregate/pseudonymized signals, bukan NIK, phone, address, rekening, atau identitas anggota.",
  "Output adalah early warning kesehatan koperasi, bukan audit resmi atau keputusan hukum/akuntansi final.",
  "Pinjaman tidak otomatis disetujui atau ditolak; semua red flag butuh checklist verifikasi.",
  "Market price tidak dikarang; bila source harga tidak tersedia, operator harus mengisi referensi.",
] as const;

function dashboardViewForFeature(slug: string) {
  if (slug === "suara-warga") return "wa";
  if (slug === "agen-ai") return "agents";
  if (slug === "lapor-siap") return "laporan";
  return slug;
}

function isDashboardView(view: string) {
  if (view === "peta-unggulan") return false;
  if (["gerai-pintar", "simpan-pinjam"].includes(view)) return true;
  return navGroups.some((group) => group.items.some((item) => item.view === view)) || Boolean(featureDetails[view]);
}

function initialDashboardView() {
  if (typeof window === "undefined") return "overview";
  const requestedView = new URLSearchParams(window.location.search).get("view");
  return requestedView && isDashboardView(requestedView) ? requestedView : "overview";
}

function agentNameForModule(moduleTitle: string) {
  const normalized = moduleTitle.toLowerCase();
  if (normalized.includes("buyer") || normalized.includes("pasar") || normalized.includes("negotiation") || normalized.includes("harga")) return "Agen Pasar dan Mitra";
  if (normalized.includes("stock") || normalized.includes("stok") || normalized.includes("gerai") || normalized.includes("logistics")) return "Agen Stok dan Gudang";
  if (normalized.includes("finance") || normalized.includes("pinjam") || normalized.includes("risk")) return "Agen Pembiayaan Readiness";
  if (normalized.includes("laporan")) return "Agen Laporan";
  if (normalized.includes("peta") || normalized.includes("komoditas") || normalized.includes("opportunity")) return "Agen Unggulan Desa";
  if (normalized.includes("verification") || normalized.includes("dokumen")) return "Agen Bukti dan Dokumen";
  return "Agen Laporan";
}

function dashboardViewForModuleTitle(moduleTitle: string) {
  const normalized = moduleTitle.toLowerCase();
  if (normalized.includes("peta") || normalized.includes("komoditas") || normalized.includes("opportunity")) return "peta-unggulan";
  if (normalized.includes("buyer") || normalized.includes("pasar") || normalized.includes("negotiation") || normalized.includes("harga")) return "pasar-mitra";
  if (normalized.includes("logistics") || normalized.includes("pickup") || normalized.includes("gudang")) return "stok-logistik";
  if (normalized.includes("stock") || normalized.includes("stok") || normalized.includes("gerai")) return "gerai-pintar";
  if (normalized.includes("finance") || normalized.includes("pinjam") || normalized.includes("risk")) return "simpan-pinjam";
  if (normalized.includes("laporan")) return "laporan";
  if (normalized.includes("integrasi") || normalized.includes("system") || normalized.includes("health")) return "integrasi";
  if (normalized.includes("wa") || normalized.includes("whatsapp") || normalized.includes("verification") || normalized.includes("dokumen")) return "wa";
  if (normalized.includes("agent")) return "agents";
  return null;
}

function formatRupiah(value: string | number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return String(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function formatInteger(value: string | number | null | undefined) {
  const numberValue = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return String(value ?? "0");
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(numberValue);
}

function makeClientMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatPercentRatio(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function downloadTextFile(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buyerEvidenceLabel(match: BuyerMatch) {
  return match.sourceLabel ?? "Tipe kebutuhan buyer; bukan buyer bernama atau komitmen permintaan live.";
}

function publicSetupMessage(message: unknown, fallback: string) {
  const raw = typeof message === "string" ? message.trim() : "";
  if (!raw) return fallback;
  if (
    /DATABASE_URL|HACKATHON_SHARED_DATABASE_URL|OPERATIONAL_DATA_REQUIRED|EVIDENCE_SOURCE_REQUIRED|COOPERATIVE_SCOPE_REQUIRED|DB_HOST|DB_PORT|DB_DATABASE|DB_USERNAME|DB_PASSWORD|POSTGRES|Postgres|postgres|env\b|environment|shared[-_\s]?db|db-read|database|setup[-_\s]?required|operator-ready|credential|secret|schema|seed/i.test(
      raw,
    )
  ) {
    return fallback;
  }
  return raw.replace(/shared[-_\s]?db/gi, "sumber eksplorasi").replace(/Shared DB/g, "Sumber eksplorasi");
}

function publicStatusLabel(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "Belum dicek";
  if (/configured|implemented|ready|available|application/i.test(raw)) return "Aktif";
  if (/loading/i.test(raw)) return "Memuat";
  if (/env|setup|required|activation|static|not-configured/i.test(raw)) return "Perlu aktivasi";
  if (/source-discovery|discovery/i.test(raw)) return "Discovery";
  if (/planned|connector/i.test(raw)) return "Direncanakan";
  if (/manual|reference/i.test(raw)) return "Referensi";
  return raw.replace(/[-_]/g, " ");
}

function publicReadinessLabel(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (/ready|operator-ready|configured|available/i.test(raw)) return "Siap dipakai";
  if (/loading/i.test(raw)) return "Memuat";
  if (/query|error|failed/i.test(raw)) return "Perlu dicek";
  if (/setup|missing|not-configured|auth-required|required/i.test(raw)) return "Perlu aktivasi";
  return publicStatusLabel(raw);
}

function publicEvidenceLabel(value: unknown, fallback = "Sumber eksplorasi terbatas") {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  if (/hackathon|shared[-_\s]?db|db-read|read[-_\s]?only|schema|database|postgres|env\b|endpoint|api\//i.test(raw)) {
    return fallback;
  }
  return publicSetupMessage(raw, fallback)
    .replace(/read[-_\s]?only/gi, "agregat terbatas")
    .replace(/aggregate/gi, "agregat")
    .replace(/sample/gi, "sampel");
}

function publicTableGroupLabel(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "Kelompok data";
  return raw
    .replace(/^anak_sarengklek_/i, "")
    .replace(/_/g, " ")
    .replace(/\bdb\b/gi, "data")
    .replace(/\bhackathon\b/gi, "eksplorasi")
    .replace(/\s+/g, " ")
    .trim();
}

function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`)
        .join(","),
    )
    .join("\n");
}

type QueueItem = {
  id: string;
  sender: string;
  source: string;
  summary: string;
  status: string;
  module: string;
};

type MetricItem = {
  label: string;
  value: string;
  note: string;
};

type CommodityCoverage = {
  totalAreas: string;
  totalProfiles: string;
  totalVillages: string;
  totalProvinces: string;
  directVillageProfiles: string;
};

type CommodityHighlight = {
  commodity: string;
  sector: string;
  rank: number;
  sourceLevel: string;
  confidence: string;
  basis: string;
};

type CooperativeInfo = {
  id: string;
  name: string;
  village: string;
  district: string;
  regency: string;
  province: string;
};

type StockItem = {
  id: string;
  name: string;
  unit: string;
  state: string;
  location: string;
  restockRequested?: boolean;
};

type BuyerMatch = {
  id: string;
  buyer: string;
  need: string;
  matchScore: number;
  reason: string;
  status: string;
  approvedAt?: string | null;
  buyerSource?: string;
  sourceLabel?: string;
  verifiedBuyer?: boolean;
};

type BuyerRequirement = {
  id: string;
  buyerArchetype: string;
  productName: string;
  requiredQuantity: string;
  unitLabel: string;
  qualitySpec: string;
  packagingSpec: string;
  targetWindow: string;
  verificationStatus: string;
  sourceLabel: string;
  notes: string;
};

type StockLedgerEntry = {
  id: string;
  stockItemId: string;
  stockName: string;
  movementType: string;
  quantity: string;
  unitLabel: string;
  reason: string;
  evidenceRef: string;
  readinessStatus: string;
  recordedBy: string;
  createdAt: string;
};

type MediaEvidence = {
  id: string;
  relatedRecordType: string;
  relatedRecordId: string;
  mediaType: string;
  storageKey: string;
  redactedLabel: string;
  caption: string;
  verificationStatus: string;
  sourceLabel: string;
};

type PrefixedDbTableStatus = {
  tableName: string;
  status: "ready" | "setup-required";
  rows: number;
  errorCode?: string;
};

type PrefixedDbStatus = {
  prefix: string;
  status: "ready" | "setup-required";
  message: string;
  tables: PrefixedDbTableStatus[];
};

type FinanceRequest = {
  id: string;
  purpose: string;
  amount: string;
  risk: string;
  status: string;
  reviewedAt?: string | null;
};

type ReportSection = {
  id: string;
  title: string;
  included: boolean;
};

type ReportPeriod = {
  id: string;
  label: string;
  locked: boolean;
  lockedAt?: string | null;
};

type DashboardData = {
  source: "application-db";
  cooperative: CooperativeInfo | null;
  metrics: MetricItem[];
  queue: QueueItem[];
  stocks: StockItem[];
  buyers: BuyerMatch[];
  finance: FinanceRequest[];
  reportSections: ReportSection[];
  reportPeriod: ReportPeriod | null;
  commodityCoverage?: CommodityCoverage | null;
  commodityHighlights?: CommodityHighlight[];
  buyerRequirements?: BuyerRequirement[];
  stockLedger?: StockLedgerEntry[];
  mediaEvidence?: MediaEvidence[];
  recentWa?: RecentWaMessage[];
  recentAgentRuns?: RecentAgentRun[];
  teamTablePrefix?: string;
  prefixedDbStatus?: PrefixedDbStatus;
  hackathonSharedDb?: HackathonDashboardEvidence;
};

type RecentWaMessage = {
  id: string;
  sender: string;
  message: string;
  intent: string;
  module: string;
  botReply?: string;
  status: string;
  createdAt: string;
};

type RecentAgentRun = {
  id: string;
  agentName: string;
  recordId: string;
  status: string;
  output: string;
  nextAction: string;
  createdAt: string;
};

type HackathonTableCount = {
  tableName: string;
  total: string;
};

type HackathonCoverage = {
  totalProvinces: string;
  totalRegencies: string;
  totalDistricts: string;
  totalVillages: string;
  commodityAreas: string;
  cooperatives: string;
  cooperativesWithProducts: string;
  cooperativesWithStock: string;
  cooperativesWithTransactions: string;
  cooperativesWithPartnerships: string;
};

type HackathonProvinceOpportunity = {
  province: string;
  villages: string;
  commodityRows: string;
  potentialValue: string | null;
  cooperatives: string;
  products: string;
  stockItems: string;
  transactions: string;
  partnershipRequests: string;
};

type HackathonCooperativeCandidate = {
  cooperativeRef: string;
  cooperativeName: string | null;
  province: string | null;
  regency: string | null;
  village: string | null;
  products: string;
  stockItems: string;
  stockTotal: string | null;
  transactions: string;
  partnershipRequests: string;
};

type HackathonMvpSummary = {
  source: string;
  mode: string;
  tablePrefix: string;
  schemaScope?: {
    label: string;
    notPrimaryReference: boolean;
    description: string;
  };
  headlineEvidence?: {
    metrics: Array<{ id: string; label: string; value: number; unit: string; amountIdr?: number }>;
    caveat: string;
  };
  tableCounts: HackathonTableCount[];
  coverage: HackathonCoverage | null;
  provinceOpportunities: HackathonProvinceOpportunity[];
  cooperativeCandidates: HackathonCooperativeCandidate[];
  dataQualityFlags: string[];
};

type HackathonDataQuality = {
  source?: string;
  mode?: string;
  tablePrefix?: string;
  checks: Array<{
    table: string;
    totalRows: number;
    missingKeyRefs: Array<{ field: string; missingRows: number; presentRows: number; completenessRate: number | null }>;
    completeness: Array<{ field: string; missingRows: number; presentRows: number; completenessRate: number | null }>;
    quality: Array<{ field: string; risk: string; affectedRows: number; affectedRate: number | null }>;
  }>;
  recommendations: string[];
};

type HackathonOpportunityScores = {
  source?: string;
  mode?: string;
  tablePrefix?: string;
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
  }>;
  recommendations: string[];
};

type HackathonBuyerMatching = {
  source?: string;
  mode?: string;
  tablePrefix?: string;
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
      locationLinks: number;
    };
    productSnapshot: {
      productsTotal: number;
      namedProducts: number;
      productExamples: string[];
    };
    signals: {
      stockItems: number;
      stockTotal: number;
      positiveStockItems: number;
      transactions: number;
      partnershipRequests: number;
    };
  }>;
  nextActions: string[];
};

type HackathonFinancingReadiness = {
  source?: string;
  mode?: string;
  tablePrefix?: string;
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
    missingStatus: number;
    missingChannel: number;
    missingAmount: number;
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

type HackathonDashboardEvidenceStatus = "auth-required" | "setup-required" | "ready" | "query-error";
type HackathonEndpointStatus = "loading" | "ready" | "partial" | "unavailable" | "error";

type HackathonDashboardSourceRow = {
  source: string;
  caveat: string;
};

type HackathonDashboardProductRow = HackathonDashboardSourceRow & {
  productCategory: string;
  rows: number;
  cooperatives: number;
  inventoryRows: number;
  stockTotal: string;
  genericLabels: number;
};

type HackathonDashboardAreaRow = HackathonDashboardSourceRow & {
  province: string;
  regencies: number;
  districts: number;
  villages: number;
  commodityRows: number;
  commodities: number;
  cooperatives: number;
  potentialValue: string;
};

type HackathonDashboardFinancingRow = HackathonDashboardSourceRow & {
  status: string;
  channel: string;
  requests: number;
  amount: string;
};

type HackathonDashboardTransactionRow = HackathonDashboardSourceRow & {
  status: string;
  channel: string;
  transactions: number;
  amount: string;
  cooperatives: number;
};

type HackathonDashboardEvidence = {
  status: HackathonDashboardEvidenceStatus;
  authState: "auth-required" | "authenticated";
  source: string;
  mode: string;
  tablePrefix: string;
  generatedAt: string;
  schemaScope?: {
    label: string;
    notPrimaryReference: boolean;
    description: string;
  };
  setup: {
    required: boolean;
    message: string;
  };
  error: {
    code: string;
    message: string;
  } | null;
  evidenceSummary?: {
    totalAggregateRows: number;
    aggregateGroups: Array<{
      id: string;
      label: string;
      status: "ready" | "query-error";
      rows: number;
      errorCode?: string;
    }>;
  };
  tables: {
    productRows: HackathonDashboardProductRow[];
    areaRows: HackathonDashboardAreaRow[];
    financingRows: HackathonDashboardFinancingRow[];
    transactionRows: HackathonDashboardTransactionRow[];
  };
  guardrails: string[];
};

type SignalSpineStatus = "loading" | "ready" | "unavailable" | "error";

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

type DashboardUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  title: string;
  phone: string | null;
  avatarInitials: string;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
};

const EMPTY_METRICS: MetricItem[] = [];
const EMPTY_QUEUE: QueueItem[] = [];
const EMPTY_STOCKS: StockItem[] = [];
const EMPTY_BUYERS: BuyerMatch[] = [];
const EMPTY_BUYER_REQUIREMENTS: BuyerRequirement[] = [];
const EMPTY_STOCK_LEDGER: StockLedgerEntry[] = [];
const EMPTY_MEDIA_EVIDENCE: MediaEvidence[] = [];
const EMPTY_FINANCE: FinanceRequest[] = [];
const EMPTY_REPORTS: ReportSection[] = [];
const EMPTY_AGENT_RUNS: RecentAgentRun[] = [];
const EMPTY_RECENT_WA: RecentWaMessage[] = [];

type AgentRunResult = {
  agent: string;
  status: string;
  recordId: string;
  output: string;
  checks: string[];
  explanation: string;
  nextAction: string;
};

type HealthPayload = {
  app?: string;
  mode?: string;
  checkedAt?: string;
  integrations?: Array<{
    name: string;
    required: string[];
    configured: boolean;
    status: string;
    fallback: string;
  }>;
  whatsapp?: {
    setup?: {
      cloudApi?: {
        send: string;
        webhook: string;
        message: string;
      };
      personalBridge?: {
        status: string;
        command: string;
        message: string;
        activationRequired: boolean;
        capabilities?: {
          qrPairing: boolean;
          mediaDownload: boolean;
          pdfTextExtraction: boolean;
          imageOcr: boolean;
        };
      };
    };
  };
  message?: string;
};

type WaPersonalStatus = {
  status: "disabled" | "waiting-for-bridge" | "qr" | "connected" | "disconnected" | "logged-out";
  qrImage: string | null;
  updatedAt: string | null;
  connectedAt: string | null;
  lastDisconnect: string | null;
  command: string;
  message: string;
  capabilities: {
    qrPairing?: boolean;
    mediaDownload?: boolean;
    pdfTextExtraction?: boolean;
    imageOcr?: boolean;
  };
};

type ToastTone = "success" | "info" | "warning" | "error";

type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ConfirmConfig = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => Promise<void> | void;
};

export function DashboardClient({ initialUser }: { initialUser: DashboardUser }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeView, setActiveView] = useState(initialDashboardView);
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [hackathonSummary, setHackathonSummary] = useState<HackathonMvpSummary | null>(null);
  const [hackathonDataQuality, setHackathonDataQuality] = useState<HackathonDataQuality | null>(null);
  const [hackathonOpportunityScores, setHackathonOpportunityScores] = useState<HackathonOpportunityScores | null>(null);
  const [hackathonBuyerMatching, setHackathonBuyerMatching] = useState<HackathonBuyerMatching | null>(null);
  const [hackathonFinancingReadiness, setHackathonFinancingReadiness] = useState<HackathonFinancingReadiness | null>(null);
  const [hackathonStatus, setHackathonStatus] = useState<HackathonEndpointStatus>("loading");
  const [hackathonError, setHackathonError] = useState("");
  const [signalSpine, setSignalSpine] = useState<SignalSpinePayload | null>(null);
  const [signalSpineStatus, setSignalSpineStatus] = useState<SignalSpineStatus>("loading");
  const [signalSpineError, setSignalSpineError] = useState("");
  const [user, setUser] = useState(initialUser);
  const [profileForm, setProfileForm] = useState({
    fullName: initialUser.fullName,
    title: initialUser.title,
    phone: initialUser.phone ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "setup" | "scope" | "error">("loading");
  const [dataError, setDataError] = useState("");
  const [, setPanelMessage] = useState(
    "Memuat data operasional.",
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  function showToast(title: string, message?: string, tone: ToastTone = "success") {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, title, message, tone }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function announce(message: string, tone: ToastTone = "info") {
    setPanelMessage(message);
    showToast(
      tone === "success"
        ? "Berhasil"
        : tone === "error"
          ? "Gagal"
          : tone === "warning"
            ? "Perlu perhatian"
            : "Informasi",
      message,
      tone,
    );
  }

  function requestConfirm(config: ConfirmConfig) {
    setProfileOpen(false);
    setNotificationsOpen(false);
    setConfirmConfig(config);
  }

  function openTour() {
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMobileSidebarOpen(false);
    setWelcomeOpen(false);
    window.localStorage.setItem(WELCOME_STORAGE_KEY, "done");
    setTourIndex(0);
    if (dashboardTourSteps[0]?.view) {
      setActiveView(dashboardTourSteps[0].view);
    }
    setTourOpen(true);
  }

  function closeTour() {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "done");
    setTourOpen(false);
  }

  function dismissWelcome() {
    window.localStorage.setItem(WELCOME_STORAGE_KEY, "done");
    setWelcomeOpen(false);
  }

  function nextTourStep() {
    setTourIndex((current) => {
      if (current >= dashboardTourSteps.length - 1) {
        window.localStorage.setItem(TOUR_STORAGE_KEY, "done");
        setTourOpen(false);
        return current;
      }
      const nextIndex = current + 1;
      const step = dashboardTourSteps[nextIndex];
      if (step?.view) {
        setActiveView(step.view);
      }
      return nextIndex;
    });
  }

  function previousTourStep() {
    setTourIndex((current) => {
      const nextIndex = Math.max(0, current - 1);
      const step = dashboardTourSteps[nextIndex];
      if (step?.view) {
        setActiveView(step.view);
      }
      return nextIndex;
    });
  }

  async function runConfirmedAction() {
    if (!confirmConfig) return;
    setConfirmBusy(true);
    try {
      await confirmConfig.onConfirm();
      setConfirmConfig(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  async function loadDashboard() {
    try {
      setDataStatus((current) => (current === "ready" ? "ready" : "loading"));
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const payload = await response.json();
      if (response.status === 401) {
        window.location.href = "/login?next=/dashboard";
        return;
      }
      if (!response.ok) {
        const fallbackMessage =
          response.status === 503
            ? "Data operasional aplikasi belum aktif di server ini."
            : response.status === 409 && payload.error === "COOPERATIVE_SCOPE_REQUIRED"
              ? "Akun login belum terhubung ke workspace koperasi."
              : "Dashboard belum berhasil memuat data operasional.";
        const safeMessage = publicSetupMessage(payload.message ?? payload.error, fallbackMessage);
        setDashboardData(null);
        setDataStatus(
          response.status === 503
            ? "setup"
            : response.status === 409 && payload.error === "COOPERATIVE_SCOPE_REQUIRED"
              ? "scope"
              : "error",
        );
        setDataError(safeMessage);
        setPanelMessage(safeMessage);
        return;
      }
      setDashboardData(payload as DashboardData);
      setDataStatus("ready");
      setDataError("");
      setPanelMessage("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat data dashboard.";
      setDashboardData(null);
      setDataStatus("error");
      setDataError(message);
      setPanelMessage(message);
    }
  }

  async function loadHackathonSummary() {
    try {
      setHackathonStatus((current) => (current === "ready" ? "ready" : "loading"));
      const endpoints = [
        ["summary", "/api/hackathon/mvp-summary"],
        ["dataQuality", "/api/hackathon/data-quality"],
        ["opportunityScores", "/api/hackathon/opportunity-scores"],
        ["buyerMatching", "/api/hackathon/buyer-matching"],
        ["financingReadiness", "/api/hackathon/financing-readiness"],
      ] as const;
      const responses = await Promise.all(
        endpoints.map(async ([key, url]) => {
          const response = await fetch(url, { cache: "no-store" });
          const payload = await response.json().catch(() => null);
          return { key, response, payload };
        }),
      );
      if (responses.some((item) => item.response.status === 401)) {
        window.location.href = "/login?next=/dashboard";
        return;
      }
      const payloadByKey = Object.fromEntries(
        responses.filter((item) => item.response.ok).map((item) => [item.key, item.payload]),
      );
      const failed = responses.filter((item) => !item.response.ok);
      const readyCount = Object.keys(payloadByKey).length;
      if (readyCount === 0 && failed.length) {
        const firstFailed = failed[0];
        const safeMessage = publicSetupMessage(
          firstFailed.payload?.message ?? firstFailed.payload?.error,
          "Sumber eksplorasi belum aktif di server ini.",
        );
        setHackathonSummary(null);
        setHackathonDataQuality(null);
        setHackathonOpportunityScores(null);
        setHackathonBuyerMatching(null);
        setHackathonFinancingReadiness(null);
        setHackathonStatus(firstFailed.response.status === 503 ? "unavailable" : "error");
        setHackathonError(safeMessage);
        return;
      }
      setHackathonSummary((payloadByKey.summary as HackathonMvpSummary | undefined) ?? null);
      setHackathonDataQuality((payloadByKey.dataQuality as HackathonDataQuality | undefined) ?? null);
      setHackathonOpportunityScores((payloadByKey.opportunityScores as HackathonOpportunityScores | undefined) ?? null);
      setHackathonBuyerMatching((payloadByKey.buyerMatching as HackathonBuyerMatching | undefined) ?? null);
      setHackathonFinancingReadiness(
        (payloadByKey.financingReadiness as HackathonFinancingReadiness | undefined) ?? null,
      );
      setHackathonStatus(failed.length ? "partial" : "ready");
      setHackathonError(
        failed.length
        ? `Sebagian sumber bukti berhasil dibaca. ${publicSetupMessage(
              failed[0]?.payload?.message ?? failed[0]?.payload?.error,
              "Sebagian sumber belum tersedia.",
            )}`
          : "",
      );
    } catch (error) {
      setHackathonSummary(null);
      setHackathonDataQuality(null);
      setHackathonOpportunityScores(null);
      setHackathonBuyerMatching(null);
      setHackathonFinancingReadiness(null);
      setHackathonStatus("error");
      setHackathonError(publicSetupMessage(error instanceof Error ? error.message : "", "Gagal memuat sumber eksplorasi."));
    }
  }

  async function loadSignalSpine() {
    try {
      setSignalSpineStatus((current) => (current === "ready" ? "ready" : "loading"));
      const response = await fetch("/api/hackathon/signal-spine", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | (SignalSpinePayload & { message?: string; error?: string })
        | null;
      if (response.status === 401) {
        window.location.href = "/login?next=/dashboard";
        return;
      }
      if (!response.ok) {
        setSignalSpine(null);
        setSignalSpineStatus(response.status === 404 || response.status === 503 ? "unavailable" : "error");
        setSignalSpineError(payload?.message ?? payload?.error ?? "Signal spine belum tersedia.");
        return;
      }
      setSignalSpine(payload ?? {});
      setSignalSpineStatus("ready");
      setSignalSpineError("");
    } catch (error) {
      setSignalSpine(null);
      setSignalSpineStatus("error");
      setSignalSpineError(error instanceof Error ? error.message : "Gagal memuat signal spine.");
    }
  }

  async function loadHackathonEvidence() {
    await Promise.all([loadHackathonSummary(), loadSignalSpine()]);
  }

  async function loadNotifications() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/login?next=/dashboard";
      return;
    }
    if (!response.ok) return;
    const payload = (await response.json()) as {
      notifications: NotificationItem[];
      unread: number;
    };
    setNotifications(payload.notifications);
    setUnreadNotifications(payload.unread);
  }

  async function markNotificationsRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    await loadNotifications();
    announce("Semua notifikasi ditandai sudah dibaca.", "success");
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMessage("");
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    });
    const payload = await response.json().catch(() => ({}));
    setProfileSaving(false);

    if (!response.ok) {
      const profileError = publicSetupMessage(payload.message ?? payload.error, "Periksa kembali isian profil.");
      setProfileMessage(profileError);
      showToast("Profil gagal disimpan", profileError, "error");
      return;
    }

    setUser(payload.user as DashboardUser);
    setProfileMessage("Profil tersimpan.");
    announce("Profil operator diperbarui di data operasional.", "success");
  }

  async function performLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function confirmLogout() {
    requestConfirm({
      title: "Keluar dari dashboard?",
      message: "Sesi operator akan ditutup dan akses dashboard meminta login ulang.",
      confirmLabel: "Logout",
      tone: "danger",
      onConfirm: performLogout,
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
      void loadHackathonSummary();
      void loadSignalSpine();
      void loadNotifications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const welcomeSeen = window.localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!welcomeSeen) {
      const welcomeTimer = window.setTimeout(() => setWelcomeOpen(true), 0);
      return () => window.clearTimeout(welcomeTimer);
    }
    const seen = window.localStorage.getItem(TOUR_STORAGE_KEY);
    if (seen) return;
    const timer = window.setTimeout(() => setTourOpen(true), 850);
    return () => window.clearTimeout(timer);
  }, []);

  const cooperative = dashboardData?.cooperative ?? {
    id: "pending-activation",
    name: "Data operasional belum tersambung",
    village: "Menunggu aktivasi server",
    district: "Cek aktivasi aplikasi",
    regency: "Data awal",
    province: "Indonesia",
  };
  const metrics = dashboardData?.metrics ?? EMPTY_METRICS;
  const queue = dashboardData?.queue ?? EMPTY_QUEUE;
  const stocks = dashboardData?.stocks ?? EMPTY_STOCKS;
  const buyers = dashboardData?.buyers ?? EMPTY_BUYERS;
  const buyerRequirements = dashboardData?.buyerRequirements ?? EMPTY_BUYER_REQUIREMENTS;
  const stockLedger = dashboardData?.stockLedger ?? EMPTY_STOCK_LEDGER;
  const mediaEvidence = dashboardData?.mediaEvidence ?? EMPTY_MEDIA_EVIDENCE;
  const prefixedDbStatus = dashboardData?.prefixedDbStatus ?? null;
  const hackathonSharedDb = dashboardData?.hackathonSharedDb ?? null;
  const finance = dashboardData?.finance ?? EMPTY_FINANCE;
  const reports = dashboardData?.reportSections ?? EMPTY_REPORTS;
  const reportPeriod = dashboardData?.reportPeriod ?? null;
  const recentWa = dashboardData?.recentWa ?? EMPTY_RECENT_WA;
  const recentAgentRuns = dashboardData?.recentAgentRuns ?? EMPTY_AGENT_RUNS;

  const filteredQueue = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return queue;
    return queue.filter((item) =>
      [item.id, item.source, item.module, item.summary, item.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, queue]);

  function approveDraft(id: string) {
    requestConfirm({
      title: `Setujui ${id}?`,
      message: "Catatan akan ditandai sudah disetujui dan masuk ke riwayat operasional.",
      confirmLabel: "Setujui",
      onConfirm: async () => {
        const response = await fetch(`/api/operator-queue/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Sudah Disetujui" }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          announce(publicSetupMessage(payload.message ?? payload.error, `${id} gagal disetujui.`), "error");
          return;
        }
        const approvedCase = queue.find((item) => item.id === id);
        const agentName = agentNameForModule(approvedCase?.module ?? "");
        let agentNote = "";
        if (agentName) {
          const agentResponse = await fetch("/api/agents/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentName, recordId: id }),
          });
          const agentPayload = await agentResponse.json().catch(() => ({}));
          agentNote = agentResponse.ok ? ` Agent Center menjalankan ${agentPayload.agent ?? agentName}.` : "";
        }
        await loadDashboard();
        announce(`${id} disetujui dan masuk ke riwayat operasional.${agentNote}`, "success");
      },
    });
  }

  function askFarmer(id: string) {
    requestConfirm({
      title: `Buat draft balasan untuk ${id}?`,
      message: "Sistem akan menambahkan draft balasan di percakapan dashboard. Auto-reply live tetap berjalan dari bridge WA, sedangkan balasan manual live perlu kanal resmi atau pengiriman dari nomor bot.",
      confirmLabel: "Buat draft",
      onConfirm: async () => {
        const response = await fetch(`/api/operator-queue/${encodeURIComponent(id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "follow-up" }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          announce(publicSetupMessage(payload.message ?? payload.error, `${id} gagal dibuat follow-up.`), "error");
          return;
        }
        await loadDashboard();
        setActiveView("wa");
        setMobileSidebarOpen(false);
        announce(`${id}: draft balasan tersimpan dan dibuka di WA Inbox.`, "success");
      },
    });
  }

  function openModule(moduleTitle: string) {
    const matchedFeature = featureModules.find((item) => item.title === moduleTitle);
    const mappedView = dashboardViewForModuleTitle(moduleTitle) ?? (matchedFeature ? dashboardViewForFeature(matchedFeature.slug) : null);
    if (mappedView === "peta-unggulan") {
      window.location.href = "/peta-unggulan";
      return;
    }
    if (!mappedView || !isDashboardView(mappedView)) {
      announce(`Modul ${moduleTitle} belum punya halaman operasional langsung.`, "warning");
      return;
    }
    setActiveView(mappedView);
    setMobileSidebarOpen(false);
    announce(`Membuka modul ${moduleTitle}.`, "info");
  }

  const isDark = theme === "dark";
  const shellClass = isDark
    ? "bg-[#0B1013] text-[#F8F4EA]"
    : "bg-[#F5F0E7] text-[#172027]";
  const sidebarClass = isDark
    ? "border-[#26323B] bg-[#101820]"
    : "border-[#D9CFC0] bg-[#FFFCF5]";
  const panelClass = isDark
    ? "border-white/10 bg-[#172027] text-[#F8F4EA] shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
    : "border-[#D9CFC0] bg-[#FFFCF5] text-[#172027]";
  const innerClass = isDark
    ? "border-white/10 bg-[#101820]"
    : "border-[#E7DED1] bg-[#FFF8EA]";
  const mutedClass = isDark ? "text-[#CFC3B2]" : "text-[#5B6871]";
  const setupRequired = dataStatus === "setup" || dataStatus === "scope" || dataStatus === "error";
  const activeNavItem = navGroups.flatMap((group) => group.items).find((item) => item.view === activeView);
  const activeViewLabel =
    activeView === "overview"
      ? "Ringkasan Operator"
      : activeNavItem?.label ?? featureDetails[activeView]?.title ?? "Ruang Kerja";
  return (
    <main className={`lb-dashboard-type h-[100dvh] overflow-hidden ${shellClass}`}>
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup sidebar"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
        />
      ) : null}
      <div
        className={`lb-dashboard-grid grid h-[100dvh] min-w-0 grid-cols-[minmax(0,1fr)] ${
          sidebarCollapsed ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "lg:grid-cols-[292px_minmax(0,1fr)]"
        }`}
      >
        <aside
          data-collapsed={sidebarCollapsed ? "true" : "false"}
          data-tour="sidebar"
          className={`lb-sidebar-scroll fixed inset-y-0 left-0 z-40 w-[min(88vw,336px)] min-w-0 overflow-y-auto border-r py-5 transition-transform duration-200 lg:relative lg:inset-auto lg:z-auto lg:h-[100dvh] lg:w-auto lg:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lb-sidebar-panel ${sidebarClass}`}
        >
          <div
            className={`lb-sidebar-head flex items-center gap-3 px-4 ${
              sidebarCollapsed ? "lg:justify-center lg:gap-0" : "justify-between"
            }`}
          >
            <div className={`lb-sidebar-brand flex min-w-0 items-center gap-3 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[10px] bg-[#F8F0DE] p-2 shadow-[0_18px_34px_rgba(215,154,43,0.16)]">
                <img
                  alt="Lumbung Bersama"
                  src={stitchAssets.dashboardLogo}
                  className="h-full w-full object-contain"
                />
              </span>
              <div className={`lb-sidebar-copy min-w-0 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                <p className={isDark ? "truncate text-sm font-black text-[#FFF8EA]" : "truncate text-sm font-black text-[#172027]"}>Lumbung Bersama</p>
                <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D79A2B]">Ringkasan Operator</p>
              </div>
            </div>
            <div className={`flex items-center gap-1 ${sidebarCollapsed ? "lg:ml-0" : "ml-auto"}`}>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                data-testid="dashboard-sidebar-toggle"
                className={`lb-sidebar-toggle hidden h-10 w-10 items-center justify-center rounded-[10px] border focus-visible:lb-focus lg:inline-flex ${innerClass}`}
                aria-label={sidebarCollapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
              >
                <span className="lb-sidebar-toggle-icon inline-flex">
                  {sidebarCollapsed ? (
                    <ChevronsRight size={17} strokeWidth={2.2} aria-hidden="true" />
                  ) : (
                    <ChevronsLeft size={17} strokeWidth={2.2} aria-hidden="true" />
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className={`rounded-[10px] border p-2 focus-visible:lb-focus lg:hidden ${innerClass}`}
                aria-label="Tutup sidebar"
              >
                <X size={17} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className={`lb-sidebar-info mx-4 mt-5 rounded-[8px] border p-3 ${sidebarCollapsed ? "lg:hidden" : ""} ${innerClass}`}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#D79A2B]">Login aktif</p>
            <p className="mt-2 truncate text-sm font-semibold">{cooperative.name}</p>
            <p className={`mt-1 text-xs font-normal leading-5 ${mutedClass}`}>
              {cooperative.village}, {cooperative.district}
            </p>
          </div>

          <nav className="mt-5 block max-w-full min-w-0 space-y-5 pb-1">
            {navGroups.map((group) => (
              <div key={group.label} className="min-w-0">
                <p
                  className={`lb-sidebar-group-label px-4 text-[10px] font-black uppercase tracking-[0.18em] ${mutedClass} ${sidebarCollapsed ? "lg:sr-only" : ""}`}
                  aria-hidden={sidebarCollapsed}
                >
                  {group.label}
                </p>
                <div className="mt-2 space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeView === item.view;
                    return (
                      <button
                        key={item.view}
                        type="button"
                        data-testid={`dashboard-nav-${item.view}`}
                        onClick={() => {
                          if (item.view === "peta-unggulan") {
                            window.location.href = "/peta-unggulan";
                            return;
                          }
                          setActiveView(item.view);
                          setMobileSidebarOpen(false);
                        }}
                        title={item.label}
                        className={`flex min-h-10 w-full items-center justify-between gap-3 border-l-4 px-4 py-2.5 text-left text-sm font-medium transition focus-visible:lb-focus ${
                          sidebarCollapsed ? "lg:justify-center lg:px-2" : ""
                        } ${
                          active
                            ? isDark
                              ? "border-[#D79A2B] bg-[#42302E] text-[#FFE5E2]"
                              : "border-[#D79A2B] bg-[#FFF3D8] text-[#172027]"
                            : isDark
                              ? "border-transparent text-[#E4BEBA] hover:bg-[#2B1C1A] hover:text-white"
                              : "border-transparent text-[#4F5D66] hover:bg-[#F3E7D5] hover:text-[#172027]"
                        }`}
                      >
                        <span className="lb-sidebar-item-content flex min-w-0 items-center gap-3">
                          <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
                          <span className="lb-sidebar-copy truncate">{item.label}</span>
                        </span>
                        {active && !sidebarCollapsed ? (
                          <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="h-[100dvh] min-w-0 overflow-y-auto overscroll-contain">
          <header
            className={`sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8 ${
              isDark
                ? "border-[#26323B] bg-[#0B1013]/96"
                : "border-[#D9CFC0] bg-[#F5F0E7]/92"
            }`}
          >
            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  data-testid="dashboard-mobile-menu"
                  className={`mt-1 rounded-[10px] border p-2 focus-visible:lb-focus lg:hidden ${innerClass}`}
                  aria-label="Buka sidebar"
                >
                  <Menu size={18} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,max-content)_auto_minmax(0,1fr)] sm:items-center">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Ruang kerja operator</p>
                    <h1 className={isDark ? "mt-1 truncate text-lg font-black tracking-normal text-[#FFF8EA] sm:text-xl" : "mt-1 truncate text-lg font-black tracking-normal text-[#172027] sm:text-xl"}>
                      {activeViewLabel}
                    </h1>
                  </div>
                  <span className="hidden h-6 w-px bg-[#1F2933] sm:block" aria-hidden="true" />
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
                    <span className="min-w-0 border-b-2 border-[#D79A2B] pb-1 text-[#D79A2B]">
                      {cooperative.village}
                    </span>
                    <span className={`min-w-0 truncate ${mutedClass}`}>{cooperative.province}</span>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-nowrap items-center justify-end gap-2">
                <label
                  htmlFor="dashboard-search"
                  data-tour="global-search"
                  className={`hidden min-w-0 items-center gap-2 rounded-[12px] border px-3 py-2.5 md:flex md:w-[260px] 2xl:w-[340px] ${innerClass}`}
                >
                  <Search size={17} strokeWidth={2.1} className={mutedClass} aria-hidden="true" />
                  <input
                    id="dashboard-search"
                    aria-label="Cari antrean, warga, atau modul"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari antrean, warga, modul"
                    className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none placeholder:text-current/45"
                  />
                </label>

                <div className="flex shrink-0 flex-nowrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("lumbung-data");
                    }}
                    className="inline-flex items-center gap-2 rounded-[4px] bg-[#C92A2A] px-3 py-2 text-xs font-black text-[#FFE5E2] focus-visible:lb-focus"
                    aria-label="Buka verifikasi data"
                    title="Verifikasi data"
                  >
                    <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden="true" />
                    <span className="hidden sm:inline">Meja Verifikasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="inline-flex items-center justify-center rounded-[12px] bg-[#D79A2B] p-2.5 text-[#172027] transition active:scale-[0.98] focus-visible:lb-focus"
                    aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
                    title={isDark ? "Mode terang" : "Mode gelap"}
                  >
                    {isDark ? (
                      <Sun size={17} strokeWidth={2.2} aria-hidden="true" />
                    ) : (
                      <Moon size={17} strokeWidth={2.2} aria-hidden="true" />
                    )}
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen((current) => !current);
                        setProfileOpen(false);
                      }}
                      className={`relative rounded-[12px] border p-2.5 focus-visible:lb-focus ${innerClass}`}
                      aria-label="Lihat notifikasi"
                      aria-expanded={notificationsOpen}
                      aria-haspopup="menu"
                    >
                      <Bell size={18} strokeWidth={2.2} aria-hidden="true" />
                      {unreadNotifications > 0 ? (
                        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#C92A2A] px-1 text-[10px] font-bold text-[#FFF8EA]">
                          {unreadNotifications}
                        </span>
                      ) : null}
                    </button>
                    {notificationsOpen ? (
                      <div className={`fixed left-4 right-4 top-48 z-50 rounded-[16px] border p-3 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[360px] ${panelClass}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold">Notifikasi</p>
                          <button
                            type="button"
                            onClick={markNotificationsRead}
                            className={`rounded-[9px] border px-2.5 py-1.5 text-xs font-semibold focus-visible:lb-focus ${innerClass}`}
                          >
                            Tandai dibaca
                          </button>
                        </div>
                        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                          {notifications.length ? (
                            notifications.map((notification) => (
                              <a
                                key={notification.id}
                                href={notification.actionHref ?? "#"}
                                className={`block rounded-[12px] border p-3 text-sm transition hover:border-[#D79A2B] focus-visible:lb-focus ${innerClass}`}
                              >
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                      notification.readAt
                                        ? "bg-current/25"
                                        : notification.type === "warning"
                                          ? "bg-[#D79A2B]"
                                          : notification.type === "success"
                                            ? "bg-[#2F7D32]"
                                            : "bg-[#1D5D8F]"
                                    }`}
                                  />
                                  <div>
                                    <p className="font-semibold">{notification.title}</p>
                                    <p className={`mt-1 text-xs font-normal leading-5 ${mutedClass}`}>
                                      {notification.body}
                                    </p>
                                  </div>
                                </div>
                              </a>
                            ))
                          ) : (
                            <p className={`rounded-[12px] border p-3 text-sm font-normal ${innerClass} ${mutedClass}`}>
                              Belum ada notifikasi.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen((current) => !current);
                        setNotificationsOpen(false);
                      }}
                      data-tour="operator-profile"
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D79A2B] bg-[#42302E] focus-visible:lb-focus"
                      aria-label={`${user.fullName}, buka menu profil`}
                      aria-expanded={profileOpen}
                      aria-haspopup="menu"
                    >
                      <img alt="" src={stitchAssets.dashboardAvatar} className="h-full w-full object-cover" />
                    </button>
                    {profileOpen ? (
                      <div className={`fixed left-4 right-4 top-48 z-50 rounded-[16px] border p-4 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[360px] ${panelClass}`}>
                        <p className="font-bold">{user.fullName}</p>
                        <p className={`mt-1 text-sm font-normal ${mutedClass}`}>
                          {user.email}
                        </p>
                        <div className="mt-4 grid gap-3">
                          <label className="grid gap-1.5 text-sm">
                            <span className={`font-semibold ${mutedClass}`}>Nama</span>
                            <input
                              value={profileForm.fullName}
                              onChange={(event) =>
                                setProfileForm((current) => ({
                                  ...current,
                                  fullName: event.target.value,
                                }))
                              }
                              className={`rounded-[10px] border px-3 py-2 text-sm font-normal outline-none focus-visible:lb-focus ${innerClass}`}
                            />
                          </label>
                          <label className="grid gap-1.5 text-sm">
                            <span className={`font-semibold ${mutedClass}`}>Jabatan</span>
                            <input
                              value={profileForm.title}
                              onChange={(event) =>
                                setProfileForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              className={`rounded-[10px] border px-3 py-2 text-sm font-normal outline-none focus-visible:lb-focus ${innerClass}`}
                            />
                          </label>
                          <label className="grid gap-1.5 text-sm">
                            <span className={`font-semibold ${mutedClass}`}>Nomor WA kerja</span>
                            <input
                              value={profileForm.phone}
                              onChange={(event) =>
                                setProfileForm((current) => ({
                                  ...current,
                                  phone: event.target.value,
                                }))
                              }
                              placeholder="+62..."
                              className={`rounded-[10px] border px-3 py-2 text-sm font-normal outline-none focus-visible:lb-focus ${innerClass}`}
                            />
                          </label>
                          {profileMessage ? (
                            <p className={`rounded-[10px] border px-3 py-2 text-xs font-medium ${innerClass}`}>
                              {profileMessage}
                            </p>
                          ) : null}
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={saveProfile}
                              disabled={profileSaving}
                              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#2F7D32] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 focus-visible:lb-focus"
                            >
                              {profileSaving ? (
                                <Loader2 size={16} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
                              ) : (
                                <Save size={16} strokeWidth={2.2} aria-hidden="true" />
                              )}
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={confirmLogout}
                              className={`inline-flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-sm font-semibold focus-visible:lb-focus ${innerClass}`}
                            >
                              <LogOut size={16} strokeWidth={2.2} aria-hidden="true" />
                              Logout
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div data-testid="dashboard-content" className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
            {setupRequired ? (
              <SetupRequiredView
                panelClass={panelClass}
                innerClass={innerClass}
                mutedClass={mutedClass}
                kind={dataStatus === "scope" ? "scope" : dataStatus === "setup" ? "operational-data" : "error"}
                message={dataError}
                onRetry={loadDashboard}
              />
            ) : dataStatus === "loading" ? (
              <section className={`rounded-[16px] border p-5 ${panelClass}`}>
                <p className="text-xl font-black">Memuat data operasional</p>
                <p className={`mt-2 text-sm font-semibold ${mutedClass}`}>
                  Dashboard sedang menyiapkan ringkasan koperasi, antrean kerja, stok, buyer, dan laporan.
                </p>
              </section>
            ) : activeView === "overview" ? (
              <OverviewView
                panelClass={panelClass}
                innerClass={innerClass}
                mutedClass={mutedClass}
                metrics={metrics}
                filteredQueue={filteredQueue}
                stocks={stocks}
                buyers={buyers}
                buyerRequirements={buyerRequirements}
                stockLedger={stockLedger}
                mediaEvidence={mediaEvidence}
                prefixedDbStatus={prefixedDbStatus}
                hackathonSharedDb={hackathonSharedDb}
                finance={finance}
                reports={reports}
                hackathonSummary={hackathonSummary}
                hackathonDataQuality={hackathonDataQuality}
                hackathonOpportunityScores={hackathonOpportunityScores}
                hackathonBuyerMatching={hackathonBuyerMatching}
                hackathonFinancingReadiness={hackathonFinancingReadiness}
                hackathonStatus={hackathonStatus}
                hackathonError={hackathonError}
                signalSpine={signalSpine}
                signalSpineStatus={signalSpineStatus}
                signalSpineError={signalSpineError}
                approveDraft={approveDraft}
                askFarmer={askFarmer}
                openModule={openModule}
                setActiveView={setActiveView}
                setPanelMessage={announce}
                reload={loadDashboard}
                isDark={isDark}
                commodityHighlights={dashboardData?.commodityHighlights ?? []}
                welcomeOpen={welcomeOpen}
                onDismissWelcome={dismissWelcome}
                onStartTour={openTour}
              />
            ) : activeView === "wa" ? (
              <WhatsAppView
                panelClass={panelClass}
                innerClass={innerClass}
                mutedClass={mutedClass}
                recentWa={recentWa}
                queue={queue}
                reload={loadDashboard}
                setPanelMessage={announce}
                requestConfirm={requestConfirm}
              />
            ) : activeView === "agents" ? (
              <AgentsView panelClass={panelClass} innerClass={innerClass} mutedClass={mutedClass} queue={queue} recentAgentRuns={recentAgentRuns} setPanelMessage={announce} />
            ) : activeView === "laporan" ? (
              <ReportsView
                panelClass={panelClass}
                innerClass={innerClass}
                mutedClass={mutedClass}
                reports={reports}
                reportPeriod={reportPeriod}
                reload={loadDashboard}
                setPanelMessage={announce}
                requestConfirm={requestConfirm}
              />
            ) : activeView === "integrasi" ? (
              <IntegrationView panelClass={panelClass} innerClass={innerClass} mutedClass={mutedClass} setPanelMessage={announce} />
            ) : activeView === "lumbung-data" ? (
              <LumbungDataView
                panelClass={panelClass}
                innerClass={innerClass}
                mutedClass={mutedClass}
                isDark={isDark}
                filteredQueue={filteredQueue}
                hackathonSummary={hackathonSummary}
                hackathonDataQuality={hackathonDataQuality}
                hackathonOpportunityScores={hackathonOpportunityScores}
                hackathonBuyerMatching={hackathonBuyerMatching}
                hackathonFinancingReadiness={hackathonFinancingReadiness}
                hackathonStatus={hackathonStatus}
                hackathonError={hackathonError}
                signalSpine={signalSpine}
                signalSpineStatus={signalSpineStatus}
                signalSpineError={signalSpineError}
                hackathonSharedDb={hackathonSharedDb}
                reloadHackathon={loadHackathonEvidence}
                reload={loadDashboard}
                approveDraft={approveDraft}
                askFarmer={askFarmer}
                openModule={openModule}
                setPanelMessage={announce}
              />
            ) : activeView === "gerai-pintar" ? (
              <GeraiPintarView panelClass={panelClass} innerClass={innerClass} mutedClass={mutedClass} stocks={stocks} reload={loadDashboard} setPanelMessage={announce} requestConfirm={requestConfirm} />
            ) : activeView === "stok-logistik" ? (
              <StokLogistikView panelClass={panelClass} innerClass={innerClass} mutedClass={mutedClass} queue={queue} stocks={stocks} stockLedger={stockLedger} mediaEvidence={mediaEvidence} setPanelMessage={announce} />
            ) : activeView === "pasar-mitra" ? (
              <PasarMitraView panelClass={panelClass} innerClass={innerClass} mutedClass={mutedClass} buyers={buyers} buyerRequirements={buyerRequirements} mediaEvidence={mediaEvidence} reload={loadDashboard} setPanelMessage={announce} requestConfirm={requestConfirm} />
            ) : activeView === "simpan-pinjam" ? (
              <SimpanPinjamView panelClass={panelClass} innerClass={innerClass} mutedClass={mutedClass} finance={finance} reload={loadDashboard} setPanelMessage={announce} requestConfirm={requestConfirm} />
            ) : (
              <ModuleView
                view={activeView}
                panelClass={panelClass}
                innerClass={innerClass}
                mutedClass={mutedClass}
                setPanelMessage={announce}
              />
            )}

          </div>
        </section>
      </div>
      <DashboardOnboardingTour
        open={tourOpen}
        steps={dashboardTourSteps}
        index={tourIndex}
        onNext={nextTourStep}
        onBack={previousTourStep}
        onSkip={closeTour}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        config={confirmConfig}
        busy={confirmBusy}
        onCancel={() => setConfirmConfig(null)}
        onConfirm={runConfirmedAction}
      />
    </main>
  );
}

type ViewClassProps = {
  panelClass: string;
  innerClass: string;
  mutedClass: string;
};

type ManagedTableColumn<T> = {
  key: string;
  heading: string;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type ManagedTableFilter<T> = {
  value: string;
  label: string;
  predicate: (row: T) => boolean;
};

function normalizeListValue(value: string | number | boolean | null | undefined, fallback = "Unspecified") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function createValueFilters<T>(
  rows: T[],
  getValue: (row: T) => string | number | boolean | null | undefined,
): ManagedTableFilter<T>[] {
  const values = Array.from(new Set(rows.map((row) => normalizeListValue(getValue(row))))).sort((left, right) =>
    left.localeCompare(right, "id"),
  );
  return values.map((value) => ({
    value,
    label: value,
    predicate: (row) => normalizeListValue(getValue(row)) === value,
  }));
}

function ManagedTablePanel<T>({
  panelClass,
  innerClass,
  mutedClass,
  title,
  description,
  sourceLabel,
  rows,
  columns,
  rowKey,
  getSearchText,
  filters = [],
  filterLabel = "Filter",
  emptyTitle = "Belum ada data.",
  emptyBody = "Data untuk tabel ini belum tersedia.",
  pageSize = 6,
  tableMinWidth = 760,
  className = "",
  rowClassName,
}: ViewClassProps & {
  title: string;
  description?: string;
  sourceLabel?: string;
  rows: T[];
  columns: ManagedTableColumn<T>[];
  rowKey: (row: T) => string;
  getSearchText: (row: T) => string;
  filters?: ManagedTableFilter<T>[];
  filterLabel?: string;
  emptyTitle?: string;
  emptyBody?: string;
  pageSize?: number;
  tableMinWidth?: number;
  className?: string;
  rowClassName?: (row: T) => string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const selectedFilter = activeFilter === "all" ? null : filters.find((filter) => filter.value === activeFilter) ?? null;
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (selectedFilter && !selectedFilter.predicate(row)) return false;
      if (!normalizedSearch) return true;
      return getSearchText(row).toLowerCase().includes(normalizedSearch);
    });
  }, [getSearchText, normalizedSearch, rows, selectedFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const firstVisible = filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastVisible = Math.min(filteredRows.length, safePage * pageSize);

  function updateSearch(value: string) {
    setSearchTerm(value);
    setPage(1);
  }

  function updateFilter(value: string) {
    setActiveFilter(value);
    setPage(1);
  }

  return (
    <section className={`rounded-[16px] border p-5 ${panelClass} ${className}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black">{title}</h2>
            <span className="rounded-[8px] border border-current/10 px-2 py-1 font-mono text-[11px] font-black text-[#D79A2B]">
              {formatInteger(filteredRows.length)}/{formatInteger(rows.length)}
            </span>
          </div>
          {description ? (
            <p className={`mt-2 max-w-4xl text-sm font-semibold leading-6 ${mutedClass}`}>{description}</p>
          ) : null}
          {sourceLabel ? (
            <p className={`mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ${mutedClass}`}>{sourceLabel}</p>
          ) : null}
        </div>
        <div className="grid w-full min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_190px] xl:w-[520px]">
          <label className={`flex min-w-0 items-center gap-2 rounded-[12px] border px-3 py-2.5 ${innerClass}`}>
            <Search size={16} strokeWidth={2.1} className={mutedClass} aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Cari tabel"
              aria-label={`Cari ${title}`}
              className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none placeholder:text-current/45"
            />
          </label>
          <label className={`grid gap-1 rounded-[12px] border px-3 py-2 ${innerClass}`}>
            <span className={`font-mono text-[10px] font-black uppercase tracking-[0.12em] ${mutedClass}`}>
              {filterLabel}
            </span>
            <select
              value={activeFilter}
              onChange={(event) => updateFilter(event.target.value)}
              aria-label={`${filterLabel} ${title}`}
              className="bg-transparent text-sm font-black outline-none focus-visible:lb-focus"
            >
              <option value="all">Semua</option>
              {filters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        {rows.length === 0 ? (
          <div className={`rounded-[14px] border p-5 text-sm font-bold ${innerClass}`}>
            <p>{emptyTitle}</p>
            <p className={`mt-2 font-semibold leading-6 ${mutedClass}`}>{emptyBody}</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className={`rounded-[14px] border p-5 text-sm font-bold ${innerClass}`}>
            <p>Tidak ada hasil yang cocok.</p>
            <p className={`mt-2 font-semibold leading-6 ${mutedClass}`}>Ubah pencarian atau filter tabel.</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left" style={{ minWidth: tableMinWidth }}>
            <thead>
              <tr className="border-b border-current/10">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${mutedClass} ${column.headerClassName ?? ""}`}
                  >
                    {column.heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-current/10">
              {pageRows.map((row) => (
                <tr key={rowKey(row)} className={`transition-colors hover:bg-black/5 ${rowClassName?.(row) ?? ""}`}>
                  {columns.map((column) => (
                    <td key={column.key} className={`px-3 py-3 align-top text-sm ${column.className ?? ""}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-current/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-xs font-bold ${mutedClass}`}>
          Menampilkan {formatInteger(firstVisible)}-{formatInteger(lastVisible)} dari {formatInteger(filteredRows.length)} baris
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border disabled:cursor-not-allowed disabled:opacity-40 focus-visible:lb-focus ${innerClass}`}
            aria-label="Halaman sebelumnya"
          >
            <ChevronsLeft size={15} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <span className="rounded-[10px] border border-current/10 px-3 py-2 font-mono text-xs font-black">
            {formatInteger(safePage)} / {formatInteger(pageCount)}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(pageCount, safePage + 1))}
            disabled={safePage === pageCount}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border disabled:cursor-not-allowed disabled:opacity-40 focus-visible:lb-focus ${innerClass}`}
            aria-label="Halaman berikutnya"
          >
            <ChevronsRight size={15} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

type MiniChartDatum = {
  label: string;
  value: number;
  note?: string;
  color?: string;
};

function MiniBarChart({
  title,
  data,
  mutedClass,
  innerClass,
  valueFormatter = formatInteger,
}: {
  title: string;
  data: MiniChartDatum[];
  mutedClass: string;
  innerClass: string;
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <section className={`rounded-[14px] border p-4 ${innerClass}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black">{title}</h3>
        <BarChart3 size={16} strokeWidth={2.2} className="text-[#D79A2B]" aria-hidden="true" />
      </div>
      <div className="mt-4 space-y-3">
        {data.length ? (
          data.map((item) => {
            const pct = Math.max(4, Math.round((item.value / max) * 100));
            return (
              <div key={item.label} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="font-mono">{valueFormatter(item.value)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${pct}%`, backgroundColor: item.color ?? "#D79A2B" }}
                  />
                </div>
                {item.note ? <p className={`text-[11px] font-semibold ${mutedClass}`}>{item.note}</p> : null}
              </div>
            );
          })
        ) : (
          <p className={`text-sm font-semibold ${mutedClass}`}>Grafik belum tersedia.</p>
        )}
      </div>
    </section>
  );
}

function RingMetric({
  label,
  value,
  max,
  note,
  mutedClass,
}: {
  label: string;
  value: number;
  max: number;
  note: string;
  mutedClass: string;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 88 88" className="h-20 w-20 shrink-0" aria-hidden="true">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(215,154,43,0.18)" strokeWidth="9" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="#D79A2B"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="48" textAnchor="middle" className="fill-current font-mono text-[15px] font-black">
          {formatInteger(value)}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-black">{label}</p>
        <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>{note}</p>
      </div>
    </div>
  );
}

function signalSpineText(
  item: SignalSpineItem | null | undefined,
  keys: Array<keyof SignalSpineItem>,
  fallback: string,
) {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value.trim()) return publicSetupMessage(value, "Sumber eksplorasi terbatas");
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  }
  return fallback;
}

function signalSpineLabel(item: SignalSpineItem | null | undefined, fallback: string) {
  return signalSpineText(item, ["label", "title", "name", "id"], fallback);
}

function signalSpineNote(item: SignalSpineItem | null | undefined, fallback: string) {
  return signalSpineText(
    item,
    ["note", "detail", "description", "nextAction", "action", "sourceLabel", "source", "caveat"],
    fallback,
  );
}

function signalSpineStatusText(item: SignalSpineItem | null | undefined, fallback: string) {
  return signalSpineText(item, ["status", "state", "verdict", "value", "score", "count"], fallback);
}

function signalSpineListSummary(items: SignalSpineItem[], fallback: string) {
  if (!items.length) return fallback;
  return items.slice(0, 2).map((item, index) => signalSpineLabel(item, `Item ${index + 1}`)).join(" / ");
}

function signalSpineBadgeTone(status: SignalSpineStatus): "success" | "warning" | "risk" | "service" {
  if (status === "ready") return "success";
  if (status === "error") return "risk";
  if (status === "loading") return "service";
  return "warning";
}

function SignalSpineCompactPanel({
  panelClass,
  innerClass,
  mutedClass,
  signalSpine,
  signalSpineStatus,
  signalSpineError,
  className = "",
  embedded = false,
}: ViewClassProps & {
  signalSpine: SignalSpinePayload | null;
  signalSpineStatus: SignalSpineStatus;
  signalSpineError: string;
  className?: string;
  embedded?: boolean;
}) {
  const ready = signalSpineStatus === "ready" && signalSpine;
  const signalFamilies = signalSpine?.signalFamilies ?? [];
  const provenanceLedger = signalSpine?.provenanceLedger ?? [];
  const managerActionQueue = signalSpine?.managerActionQueue ?? [];
  const remediationPlanner = signalSpine?.remediationPlanner ?? [];
  const connectorScorecard = signalSpine?.connectorScorecard ?? [];
  const rolePermissionMatrix = signalSpine?.rolePermissionMatrix ?? [];
  const readinessGate = signalSpine?.readinessGate ?? null;
  const offerPackDraft = signalSpine?.offerPackDraft ?? null;
  const workingCapitalScenario = signalSpine?.workingCapitalScenario ?? null;
  const cooperativeHealthGate = signalSpine?.cooperativeHealthGate ?? null;
  const boundarySentence =
    signalSpine?.boundarySentence ??
    "Batas alur: hanya bukti agregat, tanpa data pribadi, tanpa buyer bernama, dan tanpa klaim koneksi live.";
  const statusLabel =
    signalSpineStatus === "ready"
      ? "Siap"
      : signalSpineStatus === "loading"
        ? "Memuat"
        : signalSpineStatus === "unavailable"
          ? "Perlu aktivasi"
          : "Perlu cek";
  const statusCopy =
    signalSpineStatus === "loading"
      ? "Memuat sumber bukti tanpa memblokir panel bukti lain."
      : signalSpineStatus === "unavailable"
        ? publicSetupMessage(signalSpineError, "Guardrail keputusan belum aktif di server ini.")
      : signalSpineStatus === "error"
          ? publicSetupMessage(signalSpineError, "Guardrail keputusan gagal dimuat.")
          : publicSetupMessage(boundarySentence, "Batas alur: hanya bukti agregat, tanpa data pribadi, tanpa buyer bernama, dan tanpa klaim koneksi live.");
  const summaryCards = [
    {
      label: "Kelompok sinyal",
      value: formatInteger(signalFamilies.length),
      note: signalSpineListSummary(signalFamilies, "Menunggu ringkasan kelompok sinyal."),
    },
    {
      label: "Jejak sumber",
      value: formatInteger(provenanceLedger.length),
      note: signalSpineListSummary(provenanceLedger, "Sumber bukti belum tersedia."),
    },
    {
      label: "Gerbang kesiapan",
      value: ready ? signalSpineStatusText(readinessGate, "Siap") : statusLabel,
      note: signalSpineNote(readinessGate, "Gerbang hanya menandai kesiapan, bukan persetujuan otomatis."),
    },
    {
      label: "Draft paket penawaran",
      value: signalSpineStatusText(offerPackDraft, ready ? "Draft ditahan" : statusLabel),
      note: "Draft tetap butuh review operator; tidak menampilkan buyer bernama.",
    },
    {
      label: "Kartu koneksi",
      value: formatInteger(connectorScorecard.length),
      note: "Hanya kesiapan; tidak mengklaim integrasi live.",
    },
    {
      label: "Template alur",
      value: signalSpine?.demoFixture ? "Tersedia" : ready ? "Belum ada" : statusLabel,
      note: "Template alur tidak ditampilkan sebagai aktor nyata.",
    },
  ];
  const gateRows = [
    {
      label: "Modal kerja",
      value: signalSpineStatusText(workingCapitalScenario, ready ? "Skenario menunggu" : statusLabel),
      note: signalSpineNote(workingCapitalScenario, "Skenario agregat; bukan keputusan pembiayaan."),
    },
    {
      label: "Kesehatan koperasi",
      value: signalSpineStatusText(cooperativeHealthGate, ready ? "Gate menunggu" : statusLabel),
      note: signalSpineNote(cooperativeHealthGate, "Health gate adalah early warning, bukan audit final."),
    },
    {
      label: "Matriks akses",
      value: `${formatInteger(rolePermissionMatrix.length)} peran`,
      note: signalSpineListSummary(rolePermissionMatrix, "Matriks akses belum tersedia."),
    },
  ];
  const queueRows = [
    ...managerActionQueue.slice(0, 2).map((item, index) => ({
      label: signalSpineLabel(item, `Aksi manager ${index + 1}`),
      value: signalSpineStatusText(item, "Review"),
      note: signalSpineNote(item, "Masuk antrean manager untuk review manusia."),
    })),
    ...remediationPlanner.slice(0, 2).map((item, index) => ({
      label: signalSpineLabel(item, `Perbaikan ${index + 1}`),
      value: signalSpineStatusText(item, "Rencana"),
      note: signalSpineNote(item, "Perbaikan data sebelum klaim bukti."),
    })),
  ];
  const containerClass = embedded
    ? `${className} border-t border-current/10 pt-5`
    : `${className} rounded-[16px] border p-5 ${panelClass}`;

  return (
    <section className={containerClass}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Guardrail keputusan</p>
          <h2 className="mt-2 text-xl font-black">Kesiapan, jejak sumber, dan aksi manager.</h2>
          <p className={`mt-2 max-w-4xl text-sm font-semibold leading-6 ${mutedClass}`}>{statusCopy}</p>
        </div>
        <StatusBadge tone={signalSpineBadgeTone(signalSpineStatus)}>{statusLabel}</StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-[12px] border p-3 ${innerClass}`}>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#D79A2B]">{card.label}</p>
            <p className="mt-2 text-lg font-black">{card.value}</p>
            <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>{card.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {gateRows.map((row) => (
            <div key={row.label} className={`rounded-[12px] border px-3 py-2 ${innerClass}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black">{row.label}</p>
                <span className="font-mono text-xs font-black text-[#D79A2B]">{row.value}</span>
              </div>
              <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>{row.note}</p>
            </div>
          ))}
        </div>
        <div className={`rounded-[12px] border p-3 ${innerClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black">Antrean manager dan rencana perbaikan</p>
            <span className="font-mono text-xs font-black text-[#D79A2B]">
              {formatInteger(managerActionQueue.length)} aksi / {formatInteger(remediationPlanner.length)} rencana
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {queueRows.length > 0 ? (
              queueRows.map((row) => (
                <div key={`${row.label}-${row.value}`} className="border-l-4 border-[#D79A2B] bg-black/5 px-3 py-2">
                  <p className="text-sm font-black">{row.label}</p>
                  <p className="mt-1 font-mono text-xs font-black text-[#D79A2B]">{row.value}</p>
                  <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>{row.note}</p>
                </div>
              ))
            ) : (
              <p className={`md:col-span-2 text-sm font-semibold leading-6 ${mutedClass}`}>
                {ready
                  ? "Antrean aksi belum tersedia di ringkasan bukti."
                  : "Antrean akan muncul setelah guardrail keputusan aktif."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardOnboardingTour({
  open,
  steps,
  index,
  onNext,
  onBack,
  onSkip,
}: {
  open: boolean;
  steps: TourStep[];
  index: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [geometry, setGeometry] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    panelTop: number;
    panelLeft: number;
    connector: { d: string; targetX: number; targetY: number; panelX: number; panelY: number } | null;
  } | null>(null);

  const step = steps[index];

  useEffect(() => {
    if (!open || !step) return;

    function updateGeometry() {
      const target = document.querySelector<HTMLElement>(step.selector);
      if (!target) {
        setGeometry({
          top: 24,
          left: 24,
          width: 0,
          height: 0,
          panelTop: Math.max(24, window.innerHeight / 2 - 150),
          panelLeft: Math.max(16, window.innerWidth / 2 - 190),
          connector: null,
        });
        return;
      }

      target.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });

      window.setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const margin = 8;
        const panelWidth = Math.min(380, window.innerWidth - 32);
        const mobile = window.innerWidth < 760;
        const preferredLeft = rect.left + rect.width + 24;
        const fallbackLeft = rect.left - panelWidth - 24;
        const panelLeft = mobile
          ? 16
          : preferredLeft + panelWidth < window.innerWidth - 16
            ? preferredLeft
            : Math.max(16, fallbackLeft);
        const panelTop = mobile
          ? Math.max(16, window.innerHeight - 270)
          : Math.min(
              Math.max(16, rect.top + rect.height / 2 - 132),
              Math.max(16, window.innerHeight - 290),
            );
        const targetOnRight = panelLeft > rect.left;
        const targetX = targetOnRight ? rect.right + margin : rect.left - margin;
        const targetY = Math.min(Math.max(panelTop + 34, rect.top + 16), rect.bottom - 16);
        const panelX = targetOnRight ? panelLeft : panelLeft + panelWidth;
        const panelY = panelTop + 38;
        const bend = Math.max(36, Math.min(88, Math.abs(panelX - targetX) * 0.38));
        const controlA = targetOnRight ? targetX + bend : targetX - bend;
        const controlB = targetOnRight ? panelX - bend : panelX + bend;
        const midY = targetY + (panelY - targetY) * 0.42;
        const d = `M ${targetX} ${targetY} C ${controlA} ${targetY}, ${controlA} ${midY}, ${targetX + (panelX - targetX) / 2} ${midY} S ${controlB} ${panelY}, ${panelX} ${panelY}`;

        setGeometry({
          top: Math.max(4, rect.top - margin),
          left: Math.max(4, rect.left - margin),
          width: rect.width + margin * 2,
          height: rect.height + margin * 2,
          panelTop,
          panelLeft,
          connector: mobile ? null : { d, targetX, targetY, panelX, panelY },
        });
      }, 280);
    }

    updateGeometry();
    window.addEventListener("resize", updateGeometry);
    window.addEventListener("scroll", updateGeometry, true);
    return () => {
      window.removeEventListener("resize", updateGeometry);
      window.removeEventListener("scroll", updateGeometry, true);
    };
  }, [index, open, step]);

  if (!open || !step || !geometry) return null;

  const last = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      <div className="absolute inset-0 bg-black/36" />
      {geometry.width > 0 ? (
        <div
          className="absolute rounded-[18px] border border-[#D79A2B] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.52),0_0_0_6px_rgba(215,154,43,0.18)] transition-all duration-300"
          style={{
            top: geometry.top,
            left: geometry.left,
            width: geometry.width,
            height: geometry.height,
          }}
        />
      ) : null}
      {geometry.connector ? (
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path
            d={geometry.connector.d}
            fill="none"
            stroke="#D79A2B"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="7 7"
            opacity="0.85"
          />
          <circle cx={geometry.connector.targetX} cy={geometry.connector.targetY} r="4.5" fill="#D79A2B" />
          <circle cx={geometry.connector.panelX} cy={geometry.connector.panelY} r="4.5" fill="#D79A2B" />
        </svg>
      ) : null}
      <section
        className="lb-tour-card pointer-events-auto absolute w-[min(380px,calc(100vw-32px))] rounded-[18px] border border-[#D79A2B]/55 bg-[#111A20] p-5 text-[#F8F4EA] shadow-[0_30px_80px_rgba(0,0,0,0.42)]"
        style={{
          top: geometry.panelTop,
          left: geometry.panelLeft,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#D79A2B]">
              Langkah {index + 1} dari {steps.length}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-[10px] border border-white/10 p-2 text-[#CFC3B2] hover:text-white focus-visible:lb-focus"
            aria-label="Tutup panduan"
          >
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-3 text-sm font-normal leading-6 text-[#CFC3B2]">{step.body}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-[10px] border border-white/10 px-3 py-2 text-sm font-semibold text-[#CFC3B2] focus-visible:lb-focus"
          >
            Lewati
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={index === 0}
              className="rounded-[10px] border border-white/10 px-3 py-2 text-sm font-semibold text-[#F8F4EA] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:lb-focus"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-[10px] bg-[#D79A2B] px-3 py-2 text-sm font-semibold text-[#172027] focus-visible:lb-focus"
            >
              {last ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const toneClass: Record<ToastTone, string> = {
    success: "border-[#2F7D32]/35 bg-[#E7F5E8] text-[#172027]",
    info: "border-[#1D5D8F]/35 bg-[#E9F3FB] text-[#172027]",
    warning: "border-[#D79A2B]/45 bg-[#FFF3D8] text-[#172027]",
    error: "border-[#C92A2A]/35 bg-[#FFE3E3] text-[#172027]",
  };
  const dotClass: Record<ToastTone, string> = {
    success: "bg-[#2F7D32]",
    info: "bg-[#1D5D8F]",
    warning: "bg-[#D79A2B]",
    error: "bg-[#C92A2A]",
  };

  if (!toasts.length) return null;

  return (
    <div className="lb-toast-layer fixed left-3 right-3 top-3 flex flex-col gap-2 sm:left-auto sm:right-5 sm:top-5 sm:w-[380px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`lb-toast-card rounded-[14px] border px-4 py-3 shadow-[0_18px_45px_rgba(23,32,39,0.18)] ${toneClass[toast.tone]}`}
          role="status"
        >
          <div className="flex items-start gap-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass[toast.tone]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message ? (
                <p className="mt-1 text-xs font-normal leading-5 text-[#53606A]">{toast.message}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-[8px] p-1 text-[#53606A] transition hover:bg-black/5 focus-visible:lb-focus"
              aria-label="Tutup notifikasi"
            >
              <X size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({
  config,
  busy,
  onCancel,
  onConfirm,
}: {
  config: ConfirmConfig | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!config) return null;

  return (
    <div className="lb-modal-layer fixed inset-0 grid place-items-center bg-[#081014]/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-[440px] rounded-[20px] border border-white/12 bg-[#111A20] p-5 text-[#FFF8EA] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#D79A2B]">Konfirmasi aksi</p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">{config.title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-[10px] border border-white/10 p-2 text-[#CFC3B2] transition hover:bg-white/5 focus-visible:lb-focus"
            aria-label="Tutup konfirmasi"
          >
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-4 text-sm font-normal leading-6 text-[#CFC3B2]">{config.message}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-[12px] border border-white/12 px-4 py-2.5 text-sm font-medium text-[#F8F4EA] transition hover:bg-white/5 active:scale-[0.98] disabled:opacity-60 focus-visible:lb-focus"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:lb-focus ${
              config.tone === "danger" ? "bg-[#C92A2A]" : "bg-[#2F7D32]"
            }`}
          >
            {busy ? (
              <Loader2 size={16} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
            ) : null}
            {busy ? "Memproses" : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailDrawer({
  title,
  eyebrow,
  children,
  panelClass,
  innerClass,
  mutedClass,
  onClose,
}: ViewClassProps & {
  title: string;
  eyebrow: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="lb-modal-layer fixed inset-0 z-50 flex justify-end bg-[#081014]/55 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Tutup detail" onClick={onClose} />
      <aside className={`relative h-full w-full max-w-[720px] overflow-y-auto border-l p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] ${panelClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black">{title}</h2>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
              Buka detail hanya saat perlu memeriksa sumber, skor, caveat, dan aksi lanjutan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-[10px] border p-2 focus-visible:lb-focus ${innerClass}`}
            aria-label="Tutup detail"
          >
            <X size={17} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">{children}</div>
      </aside>
    </div>
  );
}

function DetailModal({
  title,
  eyebrow,
  children,
  panelClass,
  innerClass,
  mutedClass,
  onClose,
}: ViewClassProps & {
  title: string;
  eyebrow: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="lb-modal-layer fixed inset-0 z-50 grid place-items-center bg-[#081014]/65 px-4 py-6 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Tutup detail" onClick={onClose} />
      <article className={`relative max-h-[88dvh] w-full max-w-[820px] overflow-y-auto rounded-[20px] border p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] ${panelClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black">{title}</h2>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
              Detail dibuka hanya saat operator perlu memeriksa alasan, bukti, caveat, dan aksi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-[10px] border p-2 focus-visible:lb-focus ${innerClass}`}
            aria-label="Tutup detail"
          >
            <X size={17} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">{children}</div>
      </article>
    </div>
  );
}

function SetupRequiredView({
  panelClass,
  innerClass,
  mutedClass,
  kind,
  message,
  onRetry,
}: ViewClassProps & { kind: "operational-data" | "scope" | "error"; message: string; onRetry: () => void }) {
  const isScope = kind === "scope";
  const isOperationalData = kind === "operational-data";

  return (
    <section className={`rounded-[16px] border p-5 ${panelClass}`}>
      <p className="text-sm font-black text-[#D79A2B]">
        {isOperationalData ? "Data operasional belum aktif" : isScope ? "Workspace koperasi diperlukan" : "Dashboard belum siap"}
      </p>
      <h2 className="mt-2 text-2xl font-black">
        {isOperationalData
          ? "Dashboard menunggu data operasional aplikasi."
          : isScope
            ? "Akun login belum tersambung ke workspace koperasi."
            : "Dashboard belum berhasil memuat data operasional."}
      </h2>
      <p className={`mt-3 max-w-3xl text-sm font-semibold leading-6 ${mutedClass}`}>
        {publicSetupMessage(
          message,
          (isOperationalData
            ? "Hubungi operator teknis untuk mengaktifkan data operasional, lalu muat ulang dashboard."
            : isScope
              ? "Logout lalu login ulang agar sesi lama diperbarui, atau minta operator teknis menghubungkan akun operator ke koperasi."
              : "Cek koneksi API dashboard lalu muat ulang."),
        )}
      </p>
      <div className={`mt-5 rounded-[14px] border p-4 ${innerClass}`}>
        <p className="font-black">{isScope ? "Langkah cepat workspace" : "Langkah cepat"}</p>
        <ol className={`mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-6 ${mutedClass}`}>
          {isScope ? (
            <>
              <li>Tekan logout di kanan atas, lalu masuk kembali dari halaman login.</li>
              <li>Pastikan akun operator terdaftar sebagai operator koperasi.</li>
              <li>Minta operator teknis mengaktifkan data awal jika workspace belum muncul.</li>
              <li>Setelah workspace aktif, dashboard akan menampilkan antrean, stok, kesiapan buyer, dan laporan.</li>
            </>
          ) : (
            <>
              <li>Pastikan layanan data operasional aplikasi aktif.</li>
              <li>Aktifkan struktur data dan data awal dari server aplikasi.</li>
              <li>Pastikan akun operator terhubung ke koperasi yang sama.</li>
              <li>Muat ulang dashboard setelah aktivasi selesai.</li>
            </>
          )}
        </ol>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex rounded-[12px] bg-[#C92A2A] px-4 py-3 text-sm font-extrabold text-white focus-visible:lb-focus"
      >
        {isScope ? "Cek ulang workspace" : "Cek ulang data"}
      </button>
    </section>
  );
}

function DashboardWelcomePanel({
  panelClass,
  innerClass,
  mutedClass,
  systemStatus,
  onDismiss,
  onStartTour,
  onOpenView,
}: ViewClassProps & {
  systemStatus: string;
  onDismiss: () => void;
  onStartTour: () => void;
  onOpenView: (view: string) => void;
}) {
  const highlights = [
    ["Alur Kerja", "Peta Potensi -> Rekomendasi Produk -> Buyer Awal -> Stok/Kesiapan -> Laporan Aksi."],
    ["Data aman", "Hanya sampel dan agregat; tidak menampilkan data pribadi atau buyer bernama sebagai fakta."],
    ["Review manusia", "AI membantu rekomendasi, operator dan pengurus mengunci keputusan."],
    ["Tabel kerja", "Antrean, stok, buyer, pembiayaan, ledger, dan bukti media bisa dicari, difilter, dan dipaginasi."],
  ];

  return (
    <section className={`mb-5 rounded-[16px] border p-5 ${panelClass}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">
            Onboarding kerja
          </p>
          <h2 className="mt-2 text-2xl font-black">Mulai dari alur MVP, bukan angka palsu.</h2>
          <p className={`mt-2 max-w-4xl text-sm font-semibold leading-6 ${mutedClass}`}>
            Panel ini menjaga alur pertama tetap jelas: mulai dari peta potensi, pilih rekomendasi produk, cocokkan tipe buyer, cek stok/kesiapan, lalu tutup dengan laporan aksi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={systemStatus === "Data operasional siap" ? "success" : "warning"}>{systemStatus}</StatusBadge>
          <button
            type="button"
            onClick={onDismiss}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border focus-visible:lb-focus ${innerClass}`}
            aria-label="Tutup welcome onboarding"
          >
            <X size={15} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map(([label, detail]) => (
          <div key={label} className={`rounded-[12px] border p-4 ${innerClass}`}>
            <p className="text-sm font-black text-[#D79A2B]">{label}</p>
            <p className={`mt-2 text-xs font-semibold leading-5 ${mutedClass}`}>{detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onStartTour}
          className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-4 py-3 text-sm font-extrabold text-white focus-visible:lb-focus"
        >
          <Play size={16} strokeWidth={2.2} aria-hidden="true" />
          Mulai tur MVP
        </button>
        <button
          type="button"
          onClick={() => onOpenView("lumbung-data")}
          className={`inline-flex items-center justify-center gap-2 rounded-[12px] border px-4 py-3 text-sm font-extrabold focus-visible:lb-focus ${innerClass}`}
        >
          <Database size={16} strokeWidth={2.2} aria-hidden="true" />
          Buka meja data
        </button>
        <button
          type="button"
          onClick={() => {
            onDismiss();
            window.location.href = "/peta-unggulan";
          }}
          className={`inline-flex items-center justify-center gap-2 rounded-[12px] border px-4 py-3 text-sm font-extrabold focus-visible:lb-focus ${innerClass}`}
        >
          <MapPinned size={16} strokeWidth={2.2} aria-hidden="true" />
          Buka peta standalone
        </button>
      </div>
    </section>
  );
}

function OverviewView({
  panelClass,
  innerClass,
  mutedClass,
  metrics,
  filteredQueue,
  stocks,
  buyers,
  buyerRequirements,
  stockLedger,
  mediaEvidence,
  prefixedDbStatus,
  hackathonSharedDb,
  finance,
  reports,
  hackathonSummary,
  hackathonDataQuality,
  hackathonOpportunityScores,
  hackathonBuyerMatching,
  hackathonFinancingReadiness,
  hackathonStatus,
  hackathonError,
  signalSpine,
  signalSpineStatus,
  signalSpineError,
  approveDraft,
  askFarmer,
  openModule,
  setActiveView,
  setPanelMessage,
  reload,
  isDark,
  commodityHighlights,
  welcomeOpen,
  onDismissWelcome,
  onStartTour,
}: ViewClassProps & {
  metrics: MetricItem[];
  filteredQueue: QueueItem[];
  stocks: StockItem[];
  buyers: BuyerMatch[];
  buyerRequirements: BuyerRequirement[];
  stockLedger: StockLedgerEntry[];
  mediaEvidence: MediaEvidence[];
  prefixedDbStatus: PrefixedDbStatus | null;
  hackathonSharedDb: HackathonDashboardEvidence | null;
  finance: FinanceRequest[];
  reports: ReportSection[];
  hackathonSummary: HackathonMvpSummary | null;
  hackathonDataQuality: HackathonDataQuality | null;
  hackathonOpportunityScores: HackathonOpportunityScores | null;
  hackathonBuyerMatching: HackathonBuyerMatching | null;
  hackathonFinancingReadiness: HackathonFinancingReadiness | null;
  hackathonStatus: HackathonEndpointStatus;
  hackathonError: string;
  signalSpine: SignalSpinePayload | null;
  signalSpineStatus: SignalSpineStatus;
  signalSpineError: string;
  approveDraft: (id: string) => void;
  askFarmer: (id: string) => void;
  openModule: (moduleTitle: string) => void;
  setActiveView: (view: string) => void;
  setPanelMessage: (message: string, tone?: ToastTone) => void;
  reload: () => Promise<void>;
  isDark: boolean;
  commodityHighlights: CommodityHighlight[];
  welcomeOpen: boolean;
  onDismissWelcome: () => void;
  onStartTour: () => void;
}) {
  const kpiIcons = [MessageCircle, FileCheck2, Warehouse, ClipboardCheck];
  const kpiTones = ["#1D5D8F", "#D79A2B", "#C92A2A", "#88D982"];
  const kpiLabels = ["WA/Verified", "System Pending", "Inventory Alert", "Ready"];
  const visibleMetrics = metrics.slice(0, 4);
  const systemStatus =
    prefixedDbStatus?.status === "ready"
      ? "Data operasional siap"
      : prefixedDbStatus
        ? "Perlu aktivasi"
        : "Cek data operasional";
  const systemReady = systemStatus === "Data operasional siap";
  const topCommodity = commodityHighlights[0];
  const secondCommodity = commodityHighlights[1];
  const recentBuyer = buyers[0];
  const recentReport = reports[0];
  const systemFeed = [
    recentBuyer
      ? `Kesiapan kecocokan: ${buyerEvidenceLabel(recentBuyer)}`
      : "Kecocokan buyer menunggu syarat terverifikasi.",
    recentReport
      ? `Laporan aksi: ${recentReport.title}`
      : "Laporan aksi belum difinalkan.",
  ];
  const qualityIssueCount =
    hackathonDataQuality?.checks.reduce(
      (sum, check) =>
        sum +
        check.missingKeyRefs.filter((item) => item.missingRows > 0).length +
        check.completeness.filter((item) => item.missingRows > 0).length +
        check.quality.filter((item) => item.affectedRows > 0).length,
      0,
    ) ?? 0;
  const topOpportunityArea = hackathonOpportunityScores?.topAreas[0];
  const topOpportunityLabel =
    topOpportunityArea
      ? [topOpportunityArea.area.village, topOpportunityArea.area.district, topOpportunityArea.area.regency, topOpportunityArea.area.province]
          .filter(Boolean)
          .join(", ") || "Area belum lengkap"
      : "Belum ada ranked area";
  const financingTotals = hackathonFinancingReadiness?.totals;
  const readyPrefixedTables = prefixedDbStatus?.tables.filter((table) => table.status === "ready").length ?? 0;
  const dashboardSharedDbRowCount = hackathonSharedDb
    ? hackathonSharedDb.tables.productRows.length +
      hackathonSharedDb.tables.areaRows.length +
      hackathonSharedDb.tables.financingRows.length +
      hackathonSharedDb.tables.transactionRows.length
    : 0;
  const dashboardSharedDbStatus =
    hackathonSharedDb?.status === "ready"
      ? `${formatInteger(dashboardSharedDbRowCount)} ringkasan`
      : hackathonSharedDb?.status === "setup-required"
        ? "perlu aktivasi"
        : hackathonSharedDb?.status === "query-error"
          ? dashboardSharedDbRowCount > 0
            ? `${formatInteger(dashboardSharedDbRowCount)} ringkasan parsial`
            : "perlu cek"
          : "butuh login";
  const evidenceCards = [
    {
      label: "Data operasional",
      value: `${formatInteger(filteredQueue.length)} antrean`,
      detail: `${formatInteger(stockLedger.length)} catatan stok, ${formatInteger(mediaEvidence.length)} bukti media, ${formatInteger(buyerRequirements.length)} kebutuhan buyer`,
      source: prefixedDbStatus ? `${readyPrefixedTables}/${prefixedDbStatus.tables.length} tabel data tim siap` : "status tabel data tim belum tersedia",
      toneClass: "text-[#88D982]",
    },
    {
      label: "Agregat eksplorasi",
      value: dashboardSharedDbStatus,
      detail:
        hackathonSharedDb?.status === "ready"
          ? `${formatInteger(hackathonSharedDb.tables.productRows.length)} produk, ${formatInteger(hackathonSharedDb.tables.areaRows.length)} area, ${formatInteger(hackathonSharedDb.tables.financingRows.length)} pembiayaan, ${formatInteger(hackathonSharedDb.tables.transactionRows.length)} transaksi`
          : publicSetupMessage(
              hackathonSharedDb?.setup.message ?? hackathonSharedDb?.error?.message,
              "Agregat eksplorasi belum aktif di server ini.",
            ),
      source: `ID tim ${hackathonSharedDb?.tablePrefix ?? "anak_sarengklek_"}`,
      toneClass: hackathonSharedDb?.status === "ready" ? "text-[#88D982]" : "text-[#D79A2B]",
    },
    {
      label: "Bukti eksplorasi",
      value:
        hackathonStatus === "ready"
          ? "Lengkap"
        : hackathonStatus === "partial"
            ? "Sebagian siap"
            : hackathonStatus === "loading"
            ? "Memuat"
            : "Perlu cek",
      detail:
        hackathonStatus === "ready" || hackathonStatus === "partial"
          ? `${formatInteger(hackathonSummary?.coverage?.totalVillages ?? 0)} wilayah sampel, ${formatInteger(hackathonSummary?.coverage?.commodityAreas ?? 0)} area komoditas`
          : hackathonError || "Tidak ada angka rekaan.",
      source: "agregat terbatas",
      toneClass: hackathonStatus === "ready" ? "text-[#88D982]" : "text-[#D79A2B]",
    },
    {
      label: "Kualitas data",
      value: `${formatInteger(qualityIssueCount)} catatan`,
      detail: hackathonDataQuality
        ? `${formatInteger(hackathonDataQuality.checks.length)} kelompok data dicek`
        : "Kualitas data belum mengirim ringkasan.",
      source: "kunci hilang, kelengkapan, risiko kualitas",
      toneClass: qualityIssueCount > 0 ? "text-[#D79A2B]" : "text-[#88D982]",
    },
    {
      label: "Kesiapan pembiayaan",
      value: financingTotals
        ? `${formatPercentRatio(financingTotals.verificationRate)} terverifikasi`
        : "n/a",
      detail: financingTotals
        ? `${formatInteger(financingTotals.totalRequests)} pengajuan agregat, ${formatRupiah(financingTotals.totalAmount)} total nilai`
        : "Kesiapan pembiayaan belum mengirim agregat.",
      source: "kesiapan saja; bukan persetujuan",
      toneClass: "text-[#80CFFF]",
    },
  ];
  const commandFacts = [
    ["Peluang utama", topOpportunityLabel, topOpportunityArea ? `Skor ${topOpportunityArea.score}` : "Menunggu skor peluang"],
    ["Tipe buyer", `${formatInteger(hackathonBuyerMatching?.matches.length ?? 0)} kandidat`, "Bukan buyer bernama atau PII"],
    ["Bukti media", `${formatInteger(mediaEvidence.length)} metadata`, "Label sudah disaring dari data operasional"],
  ];
  const pendingQueueCount = filteredQueue.filter((item) => item.status !== "Sudah Disetujui").length;
  const approvedQueueCount = filteredQueue.length - pendingQueueCount;
  const criticalStockCount = stocks.filter((item) =>
    ["Perlu Restok", "Terbatas", "Menunggu Grade", "Jadwal Pickup"].includes(item.state),
  ).length;
  const buyerNeedsReviewCount = buyers.filter((item) => !item.status.toLowerCase().includes("setuju")).length;
  const topProvinceOpportunity = hackathonSummary?.provinceOpportunities[0] ?? null;
  const managerCommandRows = [
    {
      label: "Sinyal penjualan",
      value: topProvinceOpportunity ? formatInteger(topProvinceOpportunity.transactions) : "Perlu aktivasi",
      note: "Sinyal transaksi agregat saja; tidak ada detail pelanggan.",
      action: "Pakai sebagai sinyal permintaan lokal, bukan klaim permintaan nasional.",
    },
    {
      label: "Kesiapan stok",
      value: `${formatInteger(criticalStockCount)} celah`,
      note: "Stok negatif, terbatas, draft, generik, atau belum punya grade perlu verifikasi.",
      action: "Tugaskan admin gudang memvalidasi stok dan satuan.",
    },
    {
      label: "Kesiapan distribusi",
      value: `${formatInteger(stockLedger.length)} catatan`,
      note: "Pickup, kurir, dan bukti pengiriman tetap menjadi tahapan kerja.",
      action: "Pastikan gudang dan kurir sebelum kontak buyer.",
    },
    {
      label: "Aksi buyer",
      value: `${formatInteger(buyerNeedsReviewCount)} perlu review`,
      note: "Semua match tetap berupa tipe buyer sampai data buyer terverifikasi tersedia.",
      action: "Setujui script setelah grade, volume, kemasan, dan harga dicek.",
    },
    {
      label: "Kesiapan pembiayaan",
      value: financingTotals ? `${formatPercentRatio(financingTotals.verificationRate)} terverifikasi` : "Perlu aktivasi",
      note: "Hanya kesiapan agregat, tidak pernah menjadi persetujuan otomatis.",
      action: "Kirim kasus tidak lengkap ke pengurus atau komite.",
    },
    {
      label: "Catatan kualitas data",
      value: `${formatInteger(qualityIssueCount)} catatan`,
      note: "Data lemah menjadi perlu verifikasi, bukan rekomendasi percaya diri.",
      action: "Minta operator melengkapi sumber, dokumen, atau field.",
    },
  ];
  const simkopdesChecklistRows = simkopdesReadinessChecklist.map((item, index) => {
    const status =
      index === 0
        ? stocks.length > 0
          ? `${formatInteger(stocks.length)} catatan stok`
          : "Checklist"
        : index === 1
          ? topOpportunityArea
            ? "Terhubung"
            : "Butuh sumber"
          : index === 3
            ? stockLedger.length > 0
              ? `${formatInteger(stockLedger.length)} ledger`
              : "Alur kerja"
            : index === 6
              ? mediaEvidence.length > 0
                ? `${formatInteger(mediaEvidence.length)} bukti`
                : "Butuh bukti"
              : "Review";
    return { item, status };
  });
  const approvalCounts = [
    { label: "Direkomendasikan", value: formatInteger(buyers.length + (hackathonBuyerMatching?.matches.length ?? 0)) },
    { label: "Perlu verifikasi", value: formatInteger(pendingQueueCount + buyerNeedsReviewCount + criticalStockCount) },
    { label: "Disetujui", value: formatInteger(approvedQueueCount + buyers.filter((item) => item.status.toLowerCase().includes("setuju")).length) },
  ];
  const analystRows = [
    {
      label: "Kesehatan koperasi",
      value: financingTotals ? (financingTotals.verificationRate && financingTotals.verificationRate > 0.25 ? "Sehat terbatas" : "Perlu perhatian") : "Perlu verifikasi",
      note: financingTotals
        ? `${formatInteger(financingTotals.totalRequests)} pengajuan agregat; ${formatInteger(financingTotals.verifiedRequests)} terverifikasi.`
        : "Kesiapan pembiayaan belum tersedia.",
    },
    {
      label: "Sinyal arus kas",
      value: topProvinceOpportunity ? `${formatInteger(topProvinceOpportunity.transactions)} sinyal transaksi` : "Butuh sumber",
      note: "Sampel transaksi membantu membaca permintaan dan arus kas, bukan kebenaran audit keuangan.",
    },
    {
      label: "Kesesuaian simpanan anggota",
      value: `${formatInteger(memberSavingsAlignment.length)} field dipetakan`,
      note: "Status simpanan masih roadmap/agregat sampai data anggota governed tersedia.",
    },
  ];
  const borrowerRiskRows = [
    {
      label: "Pengajuan ganda atau tidak konsisten",
      status: finance.length > 1 ? "Cek antrean" : "Monitor",
      note: "Gunakan flag risiko dan bukti kurang, jangan menuduh peminjam sebagai fraud.",
    },
    {
      label: "Nilai vs skala stok/usaha",
      status: criticalStockCount > 0 ? "Perlu verifikasi" : "Siap direview",
      note: "Bandingkan tujuan pengajuan dengan inventaris dan rencana bayar sebelum komite.",
    },
    {
      label: "Kelengkapan dokumen",
      status: qualityIssueCount > 0 ? "Bukti kurang" : "Checklist siap",
      note: "Komite harus review dokumen sebelum status berubah.",
    },
  ];
  const negotiationRows = [
    {
      label: "Harga referensi pasar",
      value: "Butuh sumber",
      note: "Gunakan sumber harga resmi/kurasi atau input operator; jangan mengarang harga real-time.",
    },
    {
      label: "Harga penawaran/minimum/target",
      value: buyerRequirements.length > 0 ? "Draft setelah requirement direview" : "Menunggu requirement",
      note: "Hitung setelah grade, kemasan, logistik, dan margin minimum diketahui.",
    },
    {
      label: "Draft pesan buyer",
      value: buyers.length > 0 ? "Butuh persetujuan manusia" : "Belum ada tipe buyer",
      note: "Draft bisa disiapkan, tetapi belum boleh dikirim tanpa persetujuan operator/pengurus.",
    },
  ];
  const overviewQueueFilters = useMemo(
    () => [
      {
        value: "pending-review",
        label: "Perlu review",
        predicate: (item: QueueItem) => item.status !== "Sudah Disetujui",
      },
      {
        value: "approved",
        label: "Disetujui",
        predicate: (item: QueueItem) => item.status === "Sudah Disetujui",
      },
      ...createValueFilters(filteredQueue, (item) => item.module).map((filter) => ({
        ...filter,
        value: `module:${filter.value}`,
        label: `Modul: ${filter.label}`,
      })),
    ],
    [filteredQueue],
  );
  const overviewQueueColumns: ManagedTableColumn<QueueItem>[] = [
    {
      key: "status",
      heading: "Status",
      render: (item) => {
        const approved = item.status === "Sudah Disetujui";
        return (
          <span className={`inline-flex items-center gap-2 text-xs font-black ${approved ? "text-[#88D982]" : "text-[#D79A2B]"}`}>
            <span className={`h-2 w-2 rounded-full ${approved ? "bg-[#88D982]" : "bg-[#D79A2B]"}`} />
            {approved ? "VERIFIED" : "PENDING"}
          </span>
        );
      },
    },
    {
      key: "record",
      heading: "Record",
      render: (item) => (
        <div>
          <p className="font-mono text-xs font-black">{item.id}</p>
          <p className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>{item.source}</p>
        </div>
      ),
    },
    {
      key: "summary",
      heading: "Summary",
      render: (item) => <p className="max-w-[360px] text-sm font-semibold leading-6">{item.summary}</p>,
    },
    {
      key: "module",
      heading: "Module",
      render: (item) => (
        <span className="rounded-[3px] border border-[#D79A2B]/35 bg-[#1F2933] px-2 py-1 font-mono text-[10px] font-black uppercase text-[#D79A2B]">
          {item.module}
        </span>
      ),
    },
    {
      key: "action",
      heading: "Action",
      className: "text-right",
      headerClassName: "text-right",
      render: (item) => {
        const approved = item.status === "Sudah Disetujui";
        return (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => openModule(item.module)}
              className={`rounded-[8px] border px-3 py-1.5 text-xs font-black focus-visible:lb-focus ${innerClass}`}
            >
              Inspect
            </button>
            <button
              type="button"
              onClick={() => (approved ? askFarmer(item.id) : approveDraft(item.id))}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-black focus-visible:lb-focus ${
                approved ? "border border-[#88D982]/30 text-[#88D982]" : "bg-[#C92A2A] text-[#FFE5E2]"
              }`}
            >
              {approved ? "Tanya warga" : "Review"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D79A2B]">Command Center Koperasi</p>
          <h2 className={isDark ? "mt-1 text-2xl font-black text-[#FFF8EA]" : "mt-1 text-2xl font-black text-[#172027]"}>Ringkasan Operator</h2>
        </div>
        <div className="text-left lg:text-right">
          <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? "text-[#CFC3B2]/55" : "text-[#5B6871]"}`}>Status sistem</p>
          <p className={`mt-1 flex items-center gap-2 text-xs font-black ${systemReady ? "text-[#88D982]" : "text-[#D79A2B]"} lg:justify-end`}>
            <span className={`h-2 w-2 rounded-full ${systemReady ? "bg-[#88D982] shadow-[0_0_8px_#88d982]" : "bg-[#D79A2B]"}`} />
            {systemStatus}
          </p>
        </div>
      </section>

      {welcomeOpen ? (
        <DashboardWelcomePanel
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          systemStatus={systemStatus}
          onDismiss={onDismissWelcome}
          onStartTour={onStartTour}
          onOpenView={(view) => {
            onDismissWelcome();
            setActiveView(view);
          }}
        />
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visibleMetrics.map((metric, index) => {
          const Icon = kpiIcons[index] ?? ClipboardCheck;
          const tone = kpiTones[index] ?? "#D79A2B";
          return (
            <article
              key={metric.label}
              className={`border p-4 transition-colors ${
                isDark
                  ? "border-[#1F2933] bg-[#172027] hover:bg-[#2B1C1A]"
                  : "border-[#E7DED1] bg-[#FFFCF5] hover:bg-[#FFF3D8]"
              }`}
              style={{ borderTopColor: tone, borderTopWidth: 2 }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <Icon size={19} strokeWidth={2.2} style={{ color: tone }} aria-hidden="true" />
                <span className={`rounded-[3px] px-2 py-1 text-[10px] font-black ${isDark ? "bg-[#1F2933] text-[#CFC3B2]" : "bg-[#F2E6D4] text-[#7A4E2D]"}`}>
                  {kpiLabels[index] ?? "Metrik"}
                </span>
              </div>
              <h3 className={`text-xs font-black ${mutedClass}`}>{metric.label}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <p className={isDark ? "font-mono text-3xl font-black tabular-nums text-[#FFF8EA]" : "font-mono text-3xl font-black tabular-nums text-[#172027]"}>{metric.value}</p>
                <p className={`text-[10px] font-black uppercase ${isDark ? "text-[#CFC3B2]/45" : "text-[#5B6871]"}`}>{metric.note}</p>
              </div>
              <div className={`mt-4 h-1 overflow-hidden rounded-full ${isDark ? "bg-[#1F2933]" : "bg-[#EFE2CF]"}`}>
                <div className="h-full" style={{ width: `${Math.min(100, 35 + index * 18)}%`, backgroundColor: tone }} />
              </div>
            </article>
          );
        })}
      </section>

      <section className={`mt-5 rounded-[16px] border p-5 ${panelClass}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Alur kerja terpandu</p>
              <h2 className="mt-2 text-xl font-black">Ikuti urutan dari peta sampai laporan aksi.</h2>
              <p className={`mt-2 max-w-4xl text-sm font-semibold leading-6 ${mutedClass}`}>
              Banner ini menjaga alur kerja tetap mengikuti MVP: sampel/agregat tanpa PII, tipe buyer, dan persetujuan manusia sebelum aksi bisnis.
              </p>
            </div>
          <StatusBadge tone="service">Urutan alur siap</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {operatorFlowSteps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if ("href" in step && step.href) {
                  window.location.href = step.href;
                  return;
                }
                setActiveView(step.targetView);
              }}
              className={`rounded-[14px] border p-4 text-left transition focus-visible:lb-focus ${innerClass}`}
              title={step.detail}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-black text-[#D79A2B]">0{index + 1}</span>
                <ChevronRight size={16} strokeWidth={2.2} className={mutedClass} aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-black">{step.label}</p>
              <p className={`mt-2 text-xs font-semibold leading-5 ${mutedClass}`}>{step.detail}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <article className={`rounded-[4px] border p-4 ${panelClass}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Papan bukti</p>
              <h2 className="mt-1 text-lg font-black">Sumber data yang sedang dibaca</h2>
            </div>
            <span className={`w-fit rounded-[4px] border px-2.5 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${innerClass} ${mutedClass}`}>
              tanpa PII
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {evidenceCards.map((card) => (
              <div key={card.label} className={`border-l-4 border-[#D79A2B] p-3 ${innerClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className={`font-mono text-[10px] font-black uppercase tracking-[0.12em] ${mutedClass}`}>{card.label}</p>
                  <span className={`font-mono text-xs font-black ${card.toneClass}`}>{card.value}</span>
                </div>
                <p className="mt-2 text-sm font-black leading-5">{card.detail}</p>
                <p className={`mt-2 text-[11px] font-semibold leading-5 ${mutedClass}`}>{card.source}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={`rounded-[4px] border p-4 ${panelClass}`}>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Brief operator</p>
          <div className="mt-4 space-y-3">
            {commandFacts.map(([label, value, note]) => (
              <div key={label} className="grid grid-cols-[120px_1fr] gap-3 border-b border-current/10 pb-3 last:border-b-0 last:pb-0">
                <p className={`text-[11px] font-black uppercase tracking-[0.1em] ${mutedClass}`}>{label}</p>
                <div>
                  <p className="font-black">{value}</p>
                  <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>{note}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <SignalSpineCompactPanel
        className="mt-5"
        panelClass={panelClass}
        innerClass={innerClass}
        mutedClass={mutedClass}
        signalSpine={signalSpine}
        signalSpineStatus={signalSpineStatus}
        signalSpineError={signalSpineError}
      />

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className={`rounded-[16px] border p-5 ${panelClass}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Akses tim koperasi</p>
              <h2 className="mt-2 text-xl font-black">Pembagian kerja dan review manusia.</h2>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
                Alur kerja mengikuti peran operasional koperasi. Konektor resmi SIMKOPDES belum diaktifkan pada presentasi ini.
              </p>
            </div>
            <StatusBadge tone="warning">Tanpa PII pegawai</StatusBadge>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-current/10">
                  {["Peran", "Area kerja", "Alur kerja", "Review"].map((heading) => (
                    <th key={heading} className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${mutedClass}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-current/10">
                {simkopdesRoleAccessMatrix.map((item) => (
                  <tr key={item.role}>
                    <td className="px-3 py-3 text-sm font-black">{item.role}</td>
                    <td className={`px-3 py-3 text-xs font-bold ${mutedClass}`}>{item.surfaces}</td>
                    <td className={`px-3 py-3 text-xs font-semibold leading-5 ${mutedClass}`}>{item.workflow}</td>
                    <td className="px-3 py-3 text-xs font-black text-[#D79A2B]">{item.review}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className={`rounded-[16px] border p-5 ${panelClass}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Ruang kendali manager</p>
              <h2 className="mt-2 text-xl font-black">Aksi manager, bukan analisis pasif.</h2>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
                Untuk presentasi, satu manager bisa memantau beberapa fungsi. Saat tim tumbuh, persetujuan tetap mengikuti pembagian kerja koperasi.
              </p>
            </div>
            <StatusBadge tone="service">Manager mode</StatusBadge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {managerCommandRows.map((item) => (
              <div key={item.label} className={`rounded-[14px] border p-4 ${innerClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-black">{item.label}</p>
                  <span className="font-mono text-xs font-black text-[#D79A2B]">{item.value}</span>
                </div>
                <p className={`mt-2 text-xs font-semibold leading-5 ${mutedClass}`}>{item.note}</p>
                <p className="mt-3 text-xs font-black text-[#2F7D32]">{item.action}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div data-tour="work-queue">
          <ManagedTablePanel
            panelClass={panelClass}
            innerClass={innerClass}
            mutedClass={mutedClass}
            title="Antrian Kerja Operator"
            description="Cari, filter, dan paginasi antrean operasional. Tampilan ini memakai ID/sumber, bukan data pribadi warga."
            sourceLabel="Sumber: data operasional dashboard - keputusan tetap direview manusia"
            rows={filteredQueue}
            columns={overviewQueueColumns}
            rowKey={(item) => item.id}
            getSearchText={(item) => [item.id, item.source, item.module, item.summary, item.status].join(" ")}
            filters={overviewQueueFilters}
            filterLabel="Status/modul"
            emptyTitle="Belum ada antrean operator."
            emptyBody="Antrean akan muncul setelah pesan warga atau input operator tersimpan."
            pageSize={5}
            tableMinWidth={840}
            className="min-h-[310px]"
          />
        </div>

        <aside className="space-y-4">
          <div className={`rounded-[4px] border p-4 ${panelClass}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-black text-[#D79A2B]">
                <BarChart3 size={16} strokeWidth={2.2} aria-hidden="true" />
                Sorotan peluang
              </h2>
              <button
                type="button"
                onClick={async () => {
                  await reload();
                  setPanelMessage("Intel operasional disegarkan.", "success");
                }}
                className={`rounded-[4px] border p-2 focus-visible:lb-focus ${innerClass}`}
                aria-label="Segarkan intel operasional"
              >
                <RefreshCcw size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {[topCommodity, secondCommodity].filter(Boolean).map((profile, index) => (
                <div key={`${profile?.commodity}-${index}`} className={`border-l-4 p-3 ${innerClass} ${index === 0 ? "border-[#D79A2B]" : "border-[#1D5D8F]"}`}>
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <span className={`text-[10px] font-black ${index === 0 ? "text-[#D79A2B]" : "text-[#80CFFF]"}`}>
                      {index === 0 ? "Top Commodity" : "Rising Demand"}
                    </span>
                    <span className="text-[10px] font-black text-[#2F7D32]">{profile?.confidence}</span>
                  </div>
                  <h3 className="font-black">{profile?.commodity}</h3>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className={`text-[11px] font-semibold ${mutedClass}`}>{profile?.sourceLevel}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 4 }).map((_, barIndex) => (
                        <span
                          key={barIndex}
                          className="h-1.5 w-4"
                          style={{ backgroundColor: barIndex <= index + 1 ? (index === 0 ? "#D79A2B" : "#1D5D8F") : isDark ? "#1F2933" : "#E7DED1" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {prefixedDbStatus ? (
                <div className={`border-l-4 border-[#2F7D32] p-3 ${innerClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">Tabel data tim</p>
                      <p className="mt-2 font-mono text-xs font-semibold text-[#D79A2B]">
                        {prefixedDbStatus.prefix}
                      </p>
                    </div>
                    <StatusBadge tone={prefixedDbStatus.status === "ready" ? "success" : "warning"}>
                      {prefixedDbStatus.status === "ready" ? "Siap" : "Perlu aktivasi"}
                    </StatusBadge>
                  </div>
                  <p className={`mt-2 text-xs font-semibold leading-5 ${mutedClass}`}>
                    {publicSetupMessage(prefixedDbStatus.message, "Status tabel data tim perlu dicek di server.")}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {prefixedDbStatus.tables.slice(0, 3).map((table) => (
                      <div key={table.tableName} className="flex items-center justify-between gap-3 text-xs font-bold">
                        <span className="truncate">{table.tableName}</span>
                        <span className={table.status === "ready" ? "text-[#2F7D32]" : "text-[#C92A2A]"}>
                          {table.status === "ready" ? `${table.rows} catatan` : "perlu aktivasi"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setActiveView("lumbung-data")}
              className={`mt-4 w-full border py-3 text-xs font-black focus-visible:lb-focus ${innerClass}`}
            >
              Lihat Analisis Lengkap
            </button>
          </div>

          <div className={`rounded-[4px] border p-4 ${panelClass}`}>
            <h2 className={`mb-3 text-xs font-black uppercase tracking-[0.14em] ${mutedClass}`}>Sistem Feed</h2>
            <div className="space-y-3">
              {systemFeed.map((item, index) => (
                <div key={item} className="flex gap-3 text-xs">
                  <span className={`mt-1 h-2 w-2 rounded-full ${index === 0 ? "bg-[#88D982]" : "bg-[#D79A2B]"}`} />
                  <div>
                    <p className="font-black">{item}</p>
                    <p className={`mt-1 font-semibold ${mutedClass}`}>{index === 0 ? "Via buyer matching lite" : "Via laporan aksi"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className={`rounded-[16px] border p-5 ${panelClass}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Kesiapan SIMKOPDES</p>
              <h2 className="mt-2 text-xl font-black">Gudang, produk, transaksi, logistik, dan simpanan.</h2>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
                Checklist ini menjawab apakah komoditas siap dipasarkan, bukan mengklaim stok live atau integrasi produksi.
              </p>
            </div>
            <StatusBadge tone="review">Checklist operasional</StatusBadge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {simkopdesChecklistRows.map((row) => (
              <div key={row.item} className={`rounded-[12px] border p-3 ${innerClass}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={17} strokeWidth={2.2} className="mt-0.5 text-[#2F7D32]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-black">{row.item}</p>
                    <p className={`mt-1 text-xs font-bold ${mutedClass}`}>Status: {row.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={`mt-5 rounded-[14px] border p-4 ${innerClass}`}>
            <p className="text-sm font-black text-[#D79A2B]">Simpanan anggota dan pembiayaan koperasi</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {memberSavingsAlignment.map((item) => (
                <span key={item} className="rounded-[8px] border border-current/10 px-2.5 py-1.5 text-xs font-black">
                  {item}
                </span>
              ))}
            </div>
            <p className={`mt-3 text-xs font-semibold leading-5 ${mutedClass}`}>
              Simpanan anggota dipakai sebagai konteks kesehatan koperasi secara agregat. Sistem tidak mengubah status simpanan atau pinjaman tanpa persetujuan pengurus.
            </p>
          </div>
        </article>

        <article className={`rounded-[16px] border p-5 ${panelClass}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Review manusia</p>
              <h2 className="mt-2 text-xl font-black">Dari rekomendasi ke persetujuan.</h2>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
                Semua aksi AI, WA, kontak buyer, review pembiayaan, dan draft negosiasi masuk antrean atau membutuhkan review pengurus.
              </p>
            </div>
            <StatusBadge tone="risk">Tanpa persetujuan otomatis</StatusBadge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {approvalWorkflowSteps.map((step, index) => (
              <div key={step.label} className={`rounded-[14px] border p-4 ${innerClass}`}>
                <p className="font-mono text-xs font-black text-[#D79A2B]">0{index + 1}</p>
                <p className="mt-2 text-sm font-black">{step.label}</p>
                <p className={`mt-2 text-xs font-semibold leading-5 ${mutedClass}`}>{step.detail}</p>
                <p className="mt-3 text-lg font-black">{approvalCounts[index]?.value ?? "0"}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            <div className={`rounded-[14px] border p-4 ${innerClass}`}>
              <p className="text-sm font-black text-[#D79A2B]">AI Business Analyst - Kesehatan Simpan Pinjam</p>
              <div className="mt-3 grid gap-2">
                {analystRows.map((row) => (
                  <div key={row.label} className="grid gap-2 border-b border-current/10 pb-2 last:border-b-0 last:pb-0 sm:grid-cols-[0.38fr_0.62fr]">
                    <p className="text-xs font-black">{row.label}</p>
                    <div>
                      <p className="text-sm font-black">{row.value}</p>
                      <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>{row.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`rounded-[14px] border p-4 ${innerClass}`}>
              <p className="text-sm font-black text-[#D79A2B]">Borrower risk and market negotiation summaries</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  {borrowerRiskRows.map((row) => (
                    <div key={row.label} className="rounded-[10px] bg-black/5 p-3">
                      <p className="text-xs font-black">{row.label}</p>
                      <p className="mt-1 text-xs font-bold text-[#C92A2A]">{row.status}</p>
                      <p className={`mt-1 text-[11px] font-semibold leading-5 ${mutedClass}`}>{row.note}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {negotiationRows.map((row) => (
                    <div key={row.label} className="rounded-[10px] bg-black/5 p-3">
                      <p className="text-xs font-black">{row.label}</p>
                      <p className="mt-1 text-xs font-bold text-[#1D5D8F]">{row.value}</p>
                      <p className={`mt-1 text-[11px] font-semibold leading-5 ${mutedClass}`}>{row.note}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className={`mt-3 text-xs font-semibold leading-5 ${mutedClass}`}>
                {analystGuardrails.join(" ")}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        <article className={`rounded-[16px] border p-5 ${panelClass}`}>
          <div className="flex items-center gap-2">
            <PackageCheck size={20} strokeWidth={2.2} className="text-[#D79A2B]" aria-hidden="true" />
            <h2 className="text-xl font-black">Stok dan gudang</h2>
          </div>
          <div className="mt-4 space-y-3">
            {stocks.slice(0, 4).map((item) => (
              <div key={item.name} className={`rounded-[12px] border p-4 ${innerClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">{item.name}</p>
                  <p className="font-mono text-xs font-black text-[#D79A2B]">{item.unit}</p>
                </div>
                <p className={`mt-2 text-sm font-semibold ${mutedClass}`}>
                  {item.state} - {item.location}
                </p>
              </div>
            ))}
            {stockLedger.slice(0, 1).map((entry) => (
              <div key={entry.id} className={`rounded-[12px] border p-4 ${innerClass}`}>
                <p className="text-xs font-black uppercase text-[#D79A2B]">Ledger terbaru</p>
                <p className="mt-2 font-black">{entry.stockName}</p>
                <p className={`mt-2 text-sm font-semibold ${mutedClass}`}>
                  {entry.movementType} - {formatInteger(entry.quantity)} {entry.unitLabel}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className={`rounded-[16px] border p-5 ${panelClass}`}>
          <div className="flex items-center gap-2">
            <Building2 size={20} strokeWidth={2.2} className="text-[#D79A2B]" aria-hidden="true" />
            <h2 className="text-xl font-black">Buyer dan kesiapan</h2>
          </div>
          <div className="mt-4 space-y-3">
            {buyers.slice(0, 2).map((match) => (
              <div key={match.id} className={`rounded-[12px] border p-4 ${innerClass}`}>
                <p className="font-black">{match.buyer}</p>
                <p className="mt-2 font-mono text-xs font-black text-[#D79A2B]">
                  Kecocokan {match.matchScore}% - {match.status}
                </p>
                <p className={`mt-2 text-xs font-bold leading-5 ${mutedClass}`}>{buyerEvidenceLabel(match)}</p>
              </div>
            ))}
            {finance.slice(0, 1).map((request) => (
              <div key={request.id} className={`rounded-[12px] border p-4 ${innerClass}`}>
                <p className="font-black">Pengajuan produktif {request.id} - {formatRupiah(request.amount)}</p>
                <p className={`mt-2 text-sm font-semibold ${mutedClass}`}>Kesiapan pembiayaan: {request.purpose}</p>
              </div>
            ))}
            {buyerRequirements.slice(0, 1).map((requirement) => (
              <div key={requirement.id} className={`rounded-[12px] border p-4 ${innerClass}`}>
                <p className="text-xs font-black uppercase text-[#D79A2B]">Tabel kebutuhan</p>
                <p className="mt-2 font-black">{requirement.productName}</p>
                <p className={`mt-2 text-sm font-semibold ${mutedClass}`}>
                  {formatInteger(requirement.requiredQuantity)} {requirement.unitLabel} - {requirement.verificationStatus}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className={`rounded-[16px] border p-5 ${panelClass}`}>
          <div className="flex items-center gap-2">
            <ClipboardCheck size={20} strokeWidth={2.2} className="text-[#D79A2B]" aria-hidden="true" />
            <h2 className="text-xl font-black">Laporan dan bukti</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {reports.slice(0, 4).map((section) => (
              <div key={section.id} className={`rounded-[10px] border px-3 py-2 text-sm font-extrabold ${innerClass}`}>
                {section.title}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {mediaEvidence.slice(0, 1).map((item) => (
              <div key={item.id} className={`rounded-[10px] border px-3 py-2 text-sm ${innerClass}`}>
                <p className="font-black">{item.redactedLabel}</p>
                <p className={`mt-1 font-semibold ${mutedClass}`}>{item.verificationStatus}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={`mt-5 rounded-[16px] border p-5 ${panelClass}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-black">Modul operasional</h2>
            <p className={`mt-1 text-sm font-semibold ${mutedClass}`}>
              Core MVP muncul lebih dulu. Klik modul untuk membuka ruang kerja internal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/peta-unggulan";
            }}
            className="inline-flex w-fit items-center gap-2 rounded-[12px] bg-[#D79A2B] px-4 py-3 text-sm font-extrabold text-[#172027] focus-visible:lb-focus"
          >
            Buka Peta Unggulan
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featureModules.slice(0, 6).map((featureModule) => (
            <button
              key={featureModule.slug}
              type="button"
              onClick={() => {
                if (featureModule.slug === "peta-unggulan") {
                  window.location.href = "/peta-unggulan";
                  return;
                }
                setActiveView(dashboardViewForFeature(featureModule.slug));
              }}
              className={`rounded-[14px] border p-4 text-left transition focus-visible:lb-focus ${
                isDark
                  ? "border-white/10 bg-[#1D252C] hover:border-[#D79A2B]"
                  : "border-[#E7DED1] bg-[#FFFCF5] hover:border-[#D79A2B]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-black">{featureModule.title}</h3>
                <span className="rounded-[8px] bg-[#FFF3D8] px-2 py-1 text-[11px] font-black text-[#7A4E2D]">
                  {publicStatusLabel(featureModule.status)}
                </span>
              </div>
              <p className={`mt-3 text-sm font-semibold leading-6 ${mutedClass}`}>{featureModule.short}</p>
              <p className={`mt-4 text-xs font-bold ${isDark ? "text-[#FFF8EA]" : "text-[#7A4E2D]"}`}>
                Penanggung jawab: {featureModule.owner}
              </p>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function LumbungDataView({
  panelClass,
  innerClass,
  mutedClass,
  isDark,
  filteredQueue,
  hackathonSummary,
  hackathonDataQuality,
  hackathonOpportunityScores,
  hackathonBuyerMatching,
  hackathonFinancingReadiness,
  hackathonStatus,
  hackathonError,
  signalSpine,
  signalSpineStatus,
  signalSpineError,
  hackathonSharedDb,
  reloadHackathon,
  reload,
  approveDraft,
  askFarmer,
  openModule,
  setPanelMessage,
}: ViewClassProps & {
  isDark: boolean;
  filteredQueue: QueueItem[];
  hackathonSummary: HackathonMvpSummary | null;
  hackathonDataQuality: HackathonDataQuality | null;
  hackathonOpportunityScores: HackathonOpportunityScores | null;
  hackathonBuyerMatching: HackathonBuyerMatching | null;
  hackathonFinancingReadiness: HackathonFinancingReadiness | null;
  hackathonStatus: HackathonEndpointStatus;
  hackathonError: string;
  signalSpine: SignalSpinePayload | null;
  signalSpineStatus: SignalSpineStatus;
  signalSpineError: string;
  hackathonSharedDb: HackathonDashboardEvidence | null;
  reloadHackathon: () => Promise<void>;
  reload: () => Promise<void>;
  approveDraft: (id: string) => void;
  askFarmer: (id: string) => void;
  openModule: (moduleTitle: string) => void;
  setPanelMessage: (message: string, tone?: ToastTone) => void;
}) {
  const [selectedId, setSelectedId] = useState(filteredQueue[0]?.id ?? "");
  const [dataTab, setDataTab] = useState<"flow" | "evidence" | "opportunity" | "shared" | "queue">("flow");
  const [quickInput, setQuickInput] = useState("Saya panen padi minggu depan sekitar 5 kuintal dan butuh cek buyer/stok.");
  const [quickIntentId, setQuickIntentId] = useState(waIntents[0]?.id ?? "");
  const [quickSaving, setQuickSaving] = useState(false);
  const [queueDetailOpen, setQueueDetailOpen] = useState(false);
  const [opportunityDetailKey, setOpportunityDetailKey] = useState<string | null>(null);
  const [buyerDetailKey, setBuyerDetailKey] = useState<string | null>(null);
  const selected = filteredQueue.find((item) => item.id === selectedId) ?? filteredQueue[0];
  const completed = filteredQueue.filter((item) => item.status === "Sudah Disetujui").length;
  const rowClass = isDark
    ? "border-white/10 bg-white/5"
    : "border-[#E7DED1] bg-[#FFFCF5]";
  const alertRowClass = isDark
    ? "border-[#D79A2B]/25 bg-[#D79A2B]/10"
    : "border-[#E0B25E]/50 bg-[#FFF3D8]";
  const dangerRowClass = isDark
    ? "border-[#C92A2A]/35 bg-[#C92A2A]/10"
    : "border-[#F0B4B4] bg-[#FFE3E3]";
  const sourceLabel =
    hackathonSummary?.source ??
    hackathonDataQuality?.source ??
    hackathonOpportunityScores?.source ??
    hackathonBuyerMatching?.source ??
    hackathonFinancingReadiness?.source ??
    "sumber eksplorasi belum aktif";
  const publicEvidenceSourceLabel = publicEvidenceLabel(sourceLabel);
  const tablePrefix =
    hackathonSummary?.tablePrefix ??
    hackathonDataQuality?.tablePrefix ??
    hackathonFinancingReadiness?.tablePrefix ??
    "anak_sarengklek";
  const readyEndpointCount = [
    hackathonSummary,
    hackathonDataQuality,
    hackathonOpportunityScores,
    hackathonBuyerMatching,
    hackathonFinancingReadiness,
  ].filter(Boolean).length;
  const endpointStatus =
    hackathonStatus === "ready"
      ? "Lengkap"
      : hackathonStatus === "partial"
        ? "Sebagian siap"
        : hackathonStatus === "loading"
          ? "Memuat bukti"
        : hackathonStatus === "unavailable"
          ? "Perlu aktivasi"
          : "Perlu dicek";
  const gateState =
    hackathonStatus === "ready"
      ? "Siap"
      : hackathonStatus === "partial"
        ? "Sebagian"
      : hackathonStatus === "loading"
        ? "Memuat"
      : hackathonStatus === "unavailable"
          ? "Perlu aktivasi"
          : "Perlu dicek";
  const gateTone: "success" | "risk" | "warning" =
    hackathonStatus === "ready"
      ? "success"
      : hackathonStatus === "error"
        ? "risk"
        : "warning";
  const endpointCards = [
    {
      label: "Ringkasan MVP",
      id: "mvp-summary",
      payloadReady: Boolean(hackathonSummary),
      source: publicEvidenceLabel(hackathonSummary?.source),
      mode: publicEvidenceLabel(hackathonSummary?.mode, "Agregat terbatas"),
      note: hackathonSummary
        ? `${hackathonSummary.tableCounts.length} kelompok data, cakupan, dan peluang provinsi`
        : "Ringkasan belum tersedia.",
    },
    {
      label: "Kualitas data",
      id: "data-quality",
      payloadReady: Boolean(hackathonDataQuality),
      source: publicEvidenceLabel(hackathonDataQuality?.source),
      mode: publicEvidenceLabel(hackathonDataQuality?.mode, "Agregat terbatas"),
      note: hackathonDataQuality
        ? `${hackathonDataQuality.checks.length} kelompok dicek, catatan agregat`
        : "Ringkasan belum tersedia.",
    },
    {
      label: "Skor peluang",
      id: "opportunity-scores",
      payloadReady: Boolean(hackathonOpportunityScores),
      source: publicEvidenceLabel(hackathonOpportunityScores?.source),
      mode: publicEvidenceLabel(hackathonOpportunityScores?.mode, "Agregat terbatas"),
      note: hackathonOpportunityScores
        ? `${hackathonOpportunityScores.topAreas.length} area prioritas`
        : "Ringkasan belum tersedia.",
    },
    {
      label: "Kecocokan buyer awal",
      id: "buyer-matching",
      payloadReady: Boolean(hackathonBuyerMatching),
      source: publicEvidenceLabel(hackathonBuyerMatching?.source),
      mode: publicEvidenceLabel(hackathonBuyerMatching?.mode, "Agregat terbatas"),
      note: hackathonBuyerMatching
        ? `${hackathonBuyerMatching.matches.length} kecocokan kesiapan`
        : "Ringkasan belum tersedia.",
    },
    {
      label: "Kesiapan pembiayaan",
      id: "financing-readiness",
      payloadReady: Boolean(hackathonFinancingReadiness),
      source: publicEvidenceLabel(hackathonFinancingReadiness?.source),
      mode: publicEvidenceLabel(hackathonFinancingReadiness?.mode, "Agregat terbatas"),
      note: hackathonFinancingReadiness
        ? `${hackathonFinancingReadiness.totals.totalRequests} pengajuan agregat, ${hackathonFinancingReadiness.totals.verifiedRequests} terverifikasi`
        : "Ringkasan belum tersedia.",
    },
  ];
  const qualityRisks =
    hackathonDataQuality?.checks
      .flatMap((check) => [
        ...check.missingKeyRefs
          .filter((item) => item.missingRows > 0)
          .map((item) => ({
            label: `${check.table}.${item.field}`,
            value: item.missingRows,
            rateLabel:
              item.completenessRate === null ? "rasio belum ada" : `${Math.round(item.completenessRate * 100)}% lengkap`,
            note: "referensi kunci hilang",
            tone: "critical" as const,
          })),
        ...check.completeness
          .filter((item) => item.missingRows > 0)
          .map((item) => ({
            label: `${check.table}.${item.field}`,
            value: item.missingRows,
            rateLabel:
              item.completenessRate === null ? "rasio belum ada" : `${Math.round(item.completenessRate * 100)}% lengkap`,
            note: "field hilang sebelum pelaporan",
            tone: "warning" as const,
          })),
        ...check.quality
          .filter((item) => item.affectedRows > 0)
          .map((item) => ({
            label: `${check.table}.${item.field}`,
            value: item.affectedRows,
            rateLabel:
              item.affectedRate === null ? "rasio belum ada" : `${Math.round(item.affectedRate * 100)}% terdampak`,
            note: item.risk,
            tone: "warning" as const,
          })),
      ])
      .sort((left, right) => right.value - left.value)
      .slice(0, 6) ?? [];
  const qualityTableSummaries =
    hackathonDataQuality?.checks.map((check) => ({
      table: check.table,
      rows: check.totalRows,
      missingKeys: check.missingKeyRefs.reduce((sum, item) => sum + item.missingRows, 0),
      missingFields: check.completeness.reduce((sum, item) => sum + item.missingRows, 0),
      qualityRows: check.quality.reduce((sum, item) => sum + item.affectedRows, 0),
    })) ?? [];
  const topOpportunityAreas = hackathonOpportunityScores?.topAreas.slice(0, 5) ?? [];
  const buyerReadiness = hackathonBuyerMatching?.matches.slice(0, 5) ?? [];
  const opportunityKeyFor = (item: HackathonOpportunityScores["topAreas"][number]) =>
    item.area.kodeWilayah ?? [item.area.province, item.area.regency, item.area.district, item.area.village].filter(Boolean).join("|") ?? `score-${item.score}`;
  const buyerKeyFor = (item: HackathonBuyerMatching["matches"][number]) =>
    `${item.rank}-${item.cooperativeRef}-${item.buyerArchetypeLabel}`;
  const selectedOpportunityDetail = opportunityDetailKey
    ? topOpportunityAreas.find((item) => opportunityKeyFor(item) === opportunityDetailKey) ?? null
    : null;
  const selectedBuyerDetail = buyerDetailKey
    ? buyerReadiness.find((item) => buyerKeyFor(item) === buyerDetailKey) ?? null
    : null;
  const financingStatusSummary = hackathonFinancingReadiness?.statusSummary ?? [];
  const financingChecklist = hackathonFinancingReadiness?.actionChecklist ?? [];
  const financingChannelSummary = hackathonFinancingReadiness?.channelSummary.slice(0, 3) ?? [];
  const financingTotals = hackathonFinancingReadiness?.totals;
  const clusterLabel: Record<string, string> = {
    pilot_ready: "Siap pilot",
    qualified: "Layak",
    emerging: "Mulai kuat",
    early_stage: "Tahap awal",
  };
  const lumbungEvidenceCards = [
    {
      label: "Bukti siap",
      value: endpointStatus,
      note: "Ringkasan agregat terbatas dan siap direview operator.",
    },
    {
      label: "Catatan kualitas",
      value: `${formatInteger(qualityRisks.length)} terlihat`,
      note: hackathonDataQuality ? `${formatInteger(hackathonDataQuality.checks.length)} kelompok dicek` : "ringkasan belum tersedia",
    },
    {
      label: "Kesiapan buyer",
      value: `${formatInteger(buyerReadiness.length)} kandidat`,
      note: "tipe buyer agregat, bukan buyer bernama",
    },
    {
      label: "Kesiapan pembiayaan",
      value: financingTotals ? `${formatPercentRatio(financingTotals.verificationRate)} terverifikasi` : "n/a",
      note: "kesiapan saja; bukan persetujuan pembiayaan",
    },
  ];
  const lumbungQueueFilters = useMemo(
    () => [
      {
        value: "pending-review",
        label: "Perlu review",
        predicate: (item: QueueItem) => item.status !== "Sudah Disetujui",
      },
      {
        value: "approved",
        label: "Disetujui",
        predicate: (item: QueueItem) => item.status === "Sudah Disetujui",
      },
      ...createValueFilters(filteredQueue, (item) => item.module).map((filter) => ({
        ...filter,
        value: `module:${filter.value}`,
        label: `Modul: ${filter.label}`,
      })),
    ],
    [filteredQueue],
  );
  const lumbungQueueColumns: ManagedTableColumn<QueueItem>[] = [
    {
      key: "record",
      heading: "Record",
      render: (item) => (
        <div>
          <p className="font-mono text-xs font-black">{item.id}</p>
          <p className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>{item.source}</p>
        </div>
      ),
    },
    {
      key: "summary",
      heading: "Ringkasan",
      render: (item) => <p className="max-w-[420px] text-sm font-semibold leading-6">{item.summary}</p>,
    },
    {
      key: "module",
      heading: "Modul",
      render: (item) => <span className="text-xs font-black text-[#D79A2B]">{item.module}</span>,
    },
    {
      key: "status",
      heading: "Status",
      render: (item) => (
        <span className="rounded-[8px] bg-[#FFF3D8] px-2 py-1 text-[11px] font-black text-[#7A4E2D]">
          {item.status}
        </span>
      ),
    },
    {
      key: "action",
      heading: "Aksi",
      className: "text-right",
      headerClassName: "text-right",
      render: (item) => (
        <button
          type="button"
          onClick={() => {
            setSelectedId(item.id);
            setQueueDetailOpen(true);
          }}
          className={`rounded-[10px] border px-3 py-2 text-xs font-black focus-visible:lb-focus ${
            selected?.id === item.id ? "border-[#D79A2B] bg-[#D79A2B]/10" : innerClass
          }`}
        >
          Detail
        </button>
      ),
    },
  ];
  const dashboardSharedDbStatusLabel =
    hackathonSharedDb?.status === "ready"
      ? "terhubung"
      : hackathonSharedDb?.status === "setup-required"
        ? "perlu aktivasi"
        : hackathonSharedDb?.status === "query-error"
          ? "perlu cek"
          : "butuh login";
  const dashboardSharedProductRows = hackathonSharedDb?.tables.productRows ?? [];
  const dashboardSharedAreaRows = hackathonSharedDb?.tables.areaRows ?? [];
  const dashboardSharedFinancingRows = hackathonSharedDb?.tables.financingRows ?? [];
  const dashboardSharedTransactionRows = hackathonSharedDb?.tables.transactionRows ?? [];
  const endpointChartData = endpointCards.map((endpoint) => ({
    label: endpoint.label.replace(" lite", ""),
    value: endpoint.payloadReady ? 1 : 0,
    note: endpoint.payloadReady ? "ringkasan siap" : hackathonStatus === "loading" ? "memuat" : "perlu cek",
    color: endpoint.payloadReady ? "#2F7D32" : "#D79A2B",
  }));
  const qualityChartData = qualityTableSummaries.slice(0, 5).map((item) => ({
    label: item.table,
    value: item.missingKeys + item.missingFields + item.qualityRows,
    note: `${formatInteger(item.rows)} baris dicek`,
    color: item.missingKeys > 0 ? "#C92A2A" : "#D79A2B",
  }));
  const opportunityChartData = topOpportunityAreas.map((item) => ({
    label:
      [item.area.village, item.area.regency, item.area.province].filter(Boolean).join(", ") ||
      "Area belum lengkap",
    value: item.score,
    note: `${formatInteger(item.rawSignals.products)} produk / ${formatInteger(item.rawSignals.stockItems)} stok`,
    color: "#1D5D8F",
  }));
  const financingChartData = financingStatusSummary.slice(0, 5).map((item) => ({
    label: item.status,
    value: item.requests,
    note: formatRupiah(item.amount),
    color: item.statusKey.includes("verified") ? "#2F7D32" : "#D79A2B",
  }));
  const sharedDbChartData = [
    {
      label: "Produk",
      value: dashboardSharedProductRows.reduce((sum, item) => sum + Number(item.rows ?? 0), 0),
      note: `${formatInteger(dashboardSharedProductRows.length)} kategori`,
      color: "#2F7D32",
    },
    {
      label: "Wilayah",
      value: dashboardSharedAreaRows.reduce((sum, item) => sum + Number(item.villages ?? 0), 0),
      note: `${formatInteger(dashboardSharedAreaRows.length)} provinsi`,
      color: "#1D5D8F",
    },
    {
      label: "Pembiayaan",
      value: dashboardSharedFinancingRows.reduce((sum, item) => sum + Number(item.requests ?? 0), 0),
      note: "kesiapan saja",
      color: "#D79A2B",
    },
    {
      label: "Transaksi",
      value: dashboardSharedTransactionRows.reduce((sum, item) => sum + Number(item.transactions ?? 0), 0),
      note: "sinyal permintaan",
      color: "#C92A2A",
    },
  ];
  const lumbungDataTabs = [
    { id: "flow" as const, label: "Input data", meta: "buat case" },
    { id: "evidence" as const, label: "Bukti & alasan", meta: endpointStatus },
    { id: "opportunity" as const, label: "Rekomendasi", meta: `${formatInteger(topOpportunityAreas.length)} area` },
    { id: "shared" as const, label: "Tabel sumber", meta: dashboardSharedDbStatusLabel },
    { id: "queue" as const, label: "Verifikasi", meta: `${formatInteger(completed)}/${formatInteger(filteredQueue.length)}` },
  ];
  const sharedProductColumns: ManagedTableColumn<HackathonDashboardProductRow>[] = [
    {
      key: "category",
      heading: "Kategori produk",
      render: (item) => (
        <div>
          <p className="font-black">{item.productCategory}</p>
          <p className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>{item.caveat}</p>
        </div>
      ),
    },
    {
      key: "rows",
      heading: "Baris",
      render: (item) => <span className="font-mono text-sm font-black">{formatInteger(item.rows)}</span>,
    },
    {
      key: "cooperatives",
      heading: "Koperasi",
      render: (item) => <span className="font-mono text-sm font-black">{formatInteger(item.cooperatives)}</span>,
    },
    {
      key: "stock",
      heading: "Stok agregat",
      render: (item) => (
        <div>
          <p className="font-mono text-sm font-black">{formatInteger(item.stockTotal)}</p>
          <p className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>{formatInteger(item.inventoryRows)} catatan inventaris</p>
        </div>
      ),
    },
    {
      key: "generic",
      heading: "Label generik",
      render: (item) => (
        <span className={item.genericLabels > 0 ? "font-mono text-sm font-black text-[#C92A2A]" : "font-mono text-sm font-black text-[#2F7D32]"}>
          {formatInteger(item.genericLabels)}
        </span>
      ),
    },
  ];
  const sharedAreaColumns: ManagedTableColumn<HackathonDashboardAreaRow>[] = [
    {
      key: "province",
      heading: "Provinsi",
      render: (item) => (
        <div>
          <p className="font-black">{item.province}</p>
          <p className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>{item.source}</p>
        </div>
      ),
    },
    {
      key: "coverage",
      heading: "Wilayah",
      render: (item) => (
        <p className="font-mono text-xs font-black">
          {formatInteger(item.regencies)} kab / {formatInteger(item.districts)} kec / {formatInteger(item.villages)} desa
        </p>
      ),
    },
    {
      key: "commodities",
      heading: "Komoditas",
      render: (item) => (
        <p className="font-mono text-xs font-black">
          {formatInteger(item.commodityRows)} baris / {formatInteger(item.commodities)} referensi
        </p>
      ),
    },
    {
      key: "cooperatives",
      heading: "Koperasi",
      render: (item) => <span className="font-mono text-sm font-black">{formatInteger(item.cooperatives)}</span>,
    },
    {
      key: "potential",
      heading: "Nilai potensi",
      render: (item) => <span className="font-mono text-xs font-black">{formatRupiah(item.potentialValue)}</span>,
    },
  ];
  const sharedFinancingColumns: ManagedTableColumn<HackathonDashboardFinancingRow>[] = [
    {
      key: "status",
      heading: "Status",
      render: (item) => <span className="font-black">{item.status}</span>,
    },
    {
      key: "channel",
      heading: "Kanal/tujuan",
      render: (item) => <span className={`text-sm font-semibold ${mutedClass}`}>{item.channel}</span>,
    },
    {
      key: "requests",
      heading: "Pengajuan",
      render: (item) => <span className="font-mono text-sm font-black">{formatInteger(item.requests)}</span>,
    },
    {
      key: "amount",
      heading: "Nilai",
      render: (item) => <span className="font-mono text-sm font-black">{formatRupiah(item.amount)}</span>,
    },
    {
      key: "caveat",
      heading: "Catatan",
      render: (item) => <p className={`max-w-[320px] text-xs font-semibold leading-5 ${mutedClass}`}>{item.caveat}</p>,
    },
  ];
  const sharedTransactionColumns: ManagedTableColumn<HackathonDashboardTransactionRow>[] = [
    {
      key: "status",
      heading: "Status",
      render: (item) => <span className="font-black">{item.status}</span>,
    },
    {
      key: "channel",
      heading: "Kanal",
      render: (item) => <span className={`text-sm font-semibold ${mutedClass}`}>{item.channel}</span>,
    },
    {
      key: "transactions",
      heading: "Transaksi",
      render: (item) => <span className="font-mono text-sm font-black">{formatInteger(item.transactions)}</span>,
    },
    {
      key: "amount",
      heading: "Nilai",
      render: (item) => <span className="font-mono text-sm font-black">{formatRupiah(item.amount)}</span>,
    },
    {
      key: "cooperatives",
      heading: "Koperasi",
      render: (item) => <span className="font-mono text-sm font-black">{formatInteger(item.cooperatives)}</span>,
    },
  ];

  async function saveQuickInput() {
    const trimmed = quickInput.trim();
    if (!trimmed) {
      setPanelMessage("Isi input warga/operator dulu sebelum disimpan.", "warning");
      return;
    }
    setQuickSaving(true);
    const response = await fetch("/api/wa/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmed,
        intentId: quickIntentId,
        sender: "Input operator",
        payloadType: "text",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setQuickSaving(false);

    if (!response.ok) {
      setPanelMessage(publicSetupMessage(payload.message ?? payload.error, "Input operasional gagal disimpan."), "error");
      return;
    }

    const queueId = payload.queue?.id as string | undefined;
    if (queueId) setSelectedId(queueId);
    setDataTab("queue");
    setQuickInput("");
    await reload();
    setPanelMessage(
      queueId
        ? `${queueId}: input tersimpan sebagai antrean verifikasi.`
        : "Input tersimpan sebagai antrean verifikasi.",
      "success",
    );
  }

  const opportunityColumns: ManagedTableColumn<HackathonOpportunityScores["topAreas"][number]>[] = [
    {
      key: "area",
      heading: "Area prioritas",
      render: (item) => (
        <div>
          <p className="font-black">
            {[item.area.village, item.area.district, item.area.regency, item.area.province].filter(Boolean).join(", ") || "Area belum lengkap"}
          </p>
          <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>
            {item.area.kodeWilayah ? `Kode ${item.area.kodeWilayah}` : "Kode wilayah belum tersedia"}
          </p>
        </div>
      ),
    },
    {
      key: "score",
      heading: "Skor",
      render: (item) => <span className="font-mono text-base font-black text-[#2F7D32]">{formatInteger(item.score)}</span>,
    },
    {
      key: "signals",
      heading: "Sinyal utama",
      render: (item) => (
        <p className={`max-w-[360px] text-xs font-semibold leading-5 ${mutedClass}`}>
          Komoditas {formatInteger(item.rawSignals.commodityRows)}, koperasi {formatInteger(item.rawSignals.cooperatives)}, produk {formatInteger(item.rawSignals.products)}, stok {formatInteger(item.rawSignals.stockItems)}
        </p>
      ),
    },
    {
      key: "readiness",
      heading: "Kesiapan",
      render: (item) => (
        <p className="font-mono text-xs font-black">
          K {formatInteger(item.componentScores.commodityPotential)} / Ko {formatInteger(item.componentScores.cooperativeReadiness)} / S {formatInteger(item.componentScores.productStockReadiness)}
        </p>
      ),
    },
    {
      key: "detail",
      heading: "Aksi",
      className: "text-right",
      headerClassName: "text-right",
      render: (item) => (
        <button
          type="button"
          onClick={() => setOpportunityDetailKey(opportunityKeyFor(item))}
          className={`rounded-[10px] border px-3 py-2 text-xs font-black focus-visible:lb-focus ${innerClass}`}
        >
          Detail
        </button>
      ),
    },
  ];

  const buyerReadinessColumns: ManagedTableColumn<HackathonBuyerMatching["matches"][number]>[] = [
    {
      key: "buyer",
      heading: "Tipe buyer",
      render: (item) => (
        <div>
          <p className="font-black">{item.buyerArchetypeLabel}</p>
          <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>{item.cooperativeName ?? item.cooperativeRef}</p>
        </div>
      ),
    },
    {
      key: "cluster",
      heading: "Cluster",
      render: (item) => <span className="text-sm font-black text-[#D79A2B]">{clusterLabel[item.readinessCluster] ?? item.readinessCluster}</span>,
    },
    {
      key: "score",
      heading: "Skor",
      render: (item) => <span className="font-mono text-base font-black text-[#2F7D32]">{formatInteger(item.score)}</span>,
    },
    {
      key: "signals",
      heading: "Sinyal",
      render: (item) => (
        <p className={`max-w-[340px] text-xs font-semibold leading-5 ${mutedClass}`}>
          Produk {formatInteger(item.productSnapshot.productsTotal)}, stok {formatInteger(item.signals.stockItems)}, transaksi {formatInteger(item.signals.transactions)}, kemitraan {formatInteger(item.signals.partnershipRequests)}
        </p>
      ),
    },
    {
      key: "detail",
      heading: "Aksi",
      className: "text-right",
      headerClassName: "text-right",
      render: (item) => (
        <button
          type="button"
          onClick={() => setBuyerDetailKey(buyerKeyFor(item))}
          className={`rounded-[10px] border px-3 py-2 text-xs font-black focus-visible:lb-focus ${innerClass}`}
        >
          Detail
        </button>
      ),
    },
  ];

  return (
    <section data-tour="lumbung-data" className="grid gap-5">
      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#D79A2B]">Rekomendasi Produk</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Input, bukti, rekomendasi, lalu verifikasi.</h2>
            <p className={`mt-2 max-w-4xl text-sm font-normal leading-6 ${mutedClass}`}>
              Buka tab dari kiri ke kanan: buat case operasional, cek alasan data, pilih rekomendasi produk, lihat tabel sumber, lalu kunci verifikasi. Semua angka berasal dari layanan aplikasi, tanpa fallback metrik palsu.
            </p>
          </div>
          <StatusBadge tone="service">Review manusia</StatusBadge>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-5">
          {lumbungDataTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDataTab(tab.id)}
              className={`rounded-[12px] border px-3 py-3 text-left transition focus-visible:lb-focus ${
                dataTab === tab.id
                  ? "border-[#D79A2B] bg-[#D79A2B]/15"
                  : isDark
                    ? "border-white/10 bg-white/5 hover:border-[#D79A2B]/60"
                    : "border-[#E7DED1] bg-[#FFFCF5] hover:border-[#D79A2B]/60"
              }`}
            >
              <span className="block text-sm font-black">{tab.label}</span>
              <span className={`mt-1 block text-xs font-semibold ${mutedClass}`}>{tab.meta}</span>
            </button>
          ))}
        </div>
      </article>

      {dataTab === "flow" ? (
        <article className={`rounded-[16px] border p-5 ${panelClass}`}>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm font-semibold text-[#D79A2B]">Alur pakai Lumbung Data</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-normal">Dari pesan warga menjadi data koperasi yang sah.</h3>
              <p className={`mt-2 max-w-4xl text-sm font-normal leading-6 ${mutedClass}`}>
                Master nasional dipakai sebagai referensi wilayah dan komoditas. Data operasional baru dianggap sah setelah ada catatan warga/operator, bukti minimum, dan persetujuan pengurus.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-5 xl:grid-cols-5">
                {[
                  ["01", "WA masuk", "Teks, voice note, foto, atau input dibantu operator."],
                  ["02", "Draft antrean", "AI/aturan lokal mengisi field tanpa menghapus kalimat asli warga."],
                  ["03", "Verifikasi", "Operator cek bukti, tanya ulang, dan koreksi satuan lokal."],
                  ["04", "Kunci modul", "Data dikirim ke stok, pasar, pembiayaan, peta, atau laporan."],
                  ["05", "Audit", "Keputusan dan ekspor menyimpan alasan agar bisa ditelusuri."],
                ].map(([step, title, body]) => (
                  <div key={step} className={`rounded-[14px] border p-4 ${innerClass}`}>
                    <p className="font-mono text-xs font-semibold text-[#D79A2B]">{step}</p>
                    <p className="mt-2 text-sm font-semibold">{title}</p>
                    <p className={`mt-2 text-xs font-normal leading-5 ${mutedClass}`}>{body}</p>
                  </div>
                ))}
              </div>
              <div className={`mt-5 rounded-[14px] border p-4 ${innerClass}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-[#D79A2B]">Catat input baru</p>
                    <p className={`mt-1 max-w-2xl text-xs font-semibold leading-5 ${mutedClass}`}>
                      Untuk percakapan lapangan yang masuk di luar WA bot. Catatan disimpan sebagai case, muncul di antrean verifikasi, lalu bisa diteruskan ke modul dan Agent Center.
                    </p>
                  </div>
                  <StatusBadge tone="service">Membuat case nyata</StatusBadge>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <label htmlFor="lumbung-quick-input" className="sr-only">Input warga atau operator</label>
                  <textarea
                    id="lumbung-quick-input"
                    value={quickInput}
                    onChange={(event) => setQuickInput(event.target.value)}
                    rows={4}
                    className={`min-h-28 rounded-[14px] border px-4 py-3 text-sm font-semibold outline-none focus-visible:lb-focus ${innerClass}`}
                    placeholder="Format: Panen padi 5 kuintal minggu depan, butuh cek stok dan buyer awal."
                  />
                  <div className="grid gap-2">
                    <label htmlFor="lumbung-quick-intent" className={`text-xs font-black ${mutedClass}`}>
                      Arahkan ke modul
                    </label>
                    <select
                      id="lumbung-quick-intent"
                      value={quickIntentId}
                      onChange={(event) => setQuickIntentId(event.target.value)}
                      className={`rounded-[12px] border px-3 py-2.5 text-sm font-extrabold outline-none focus-visible:lb-focus ${innerClass}`}
                    >
                      {waIntents.map((intent) => (
                        <option key={intent.id} value={intent.id}>
                          {intent.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={saveQuickInput}
                      disabled={quickSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-4 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:lb-focus"
                    >
                      {quickSaving ? (
                        <Loader2 size={17} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Database size={17} strokeWidth={2.2} aria-hidden="true" />
                      )}
                      Simpan ke antrean
                    </button>
                    <button
                      type="button"
                      onClick={() => setDataTab("queue")}
                      className={`inline-flex items-center justify-center rounded-[12px] border px-4 py-3 text-sm font-extrabold focus-visible:lb-focus ${innerClass}`}
                    >
                      Buka verifikasi
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className={`rounded-[14px] border p-4 ${innerClass}`}>
              <RingMetric
                label="Sumber bukti"
                value={readyEndpointCount}
                max={5}
                note="Ringkasan bukti yang siap dibaca dashboard."
                mutedClass={mutedClass}
              />
              <div className="mt-5 grid gap-3">
                {lumbungEvidenceCards.map((card) => (
                  <div key={card.label} className={`rounded-[4px] border-l-4 border-[#D79A2B] p-3 ${rowClass}`}>
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#D79A2B]">{card.label}</p>
                    <p className="mt-2 text-lg font-black">{card.value}</p>
                    <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>{card.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      ) : null}

      {dataTab === "evidence" ? (
        <article className={`rounded-[4px] border p-5 ${isDark ? "border-[#26323B] bg-[#101820] text-[#F8F4EA]" : panelClass}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">Bukti eksplorasi</p>
              <h2 className="mt-2 text-2xl font-black">Panel bukti eksplorasi MVP</h2>
              <p className={`mt-2 max-w-4xl text-sm font-semibold leading-6 ${mutedClass}`}>
                {publicSetupMessage(
                  hackathonSummary?.schemaScope?.description,
                   "Sumber eksplorasi dipakai sebagai bahan terbatas untuk membaca pola dan prioritas MVP, bukan klaim referensi utama SIMKOPDES atau data operasional resmi.",
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={gateTone}>{gateState}</StatusBadge>
              <button
                type="button"
                onClick={() => void reloadHackathon()}
                className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-current/15 px-4 py-2 text-xs font-extrabold focus-visible:lb-focus"
              >
                <RefreshCcw size={15} strokeWidth={2.2} aria-hidden="true" />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[0.85fr_1.15fr_1fr]">
            <div className={`rounded-[14px] border p-4 ${gateTone === "risk" ? dangerRowClass : gateTone === "warning" ? alertRowClass : rowClass}`}>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#D79A2B]">Status bukti</p>
              <p className="mt-2 text-2xl font-black">{gateState}</p>
              <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>
                {hackathonStatus === "ready"
                  ? "Sumber eksplorasi terhubung; semua ringkasan dibaca sebagai agregat terbatas."
                : hackathonStatus === "partial"
                    ? hackathonError || "Sebagian bukti berhasil dan tetap ditampilkan tanpa fallback angka palsu."
                    : hackathonStatus === "loading"
                      ? "Menunggu respons dari lima sumber bukti."
                      : hackathonStatus === "unavailable"
                        ? "Sumber eksplorasi belum aktif di server ini."
                        : hackathonError || "Bukti gagal merespons."}
              </p>
            </div>
            <div className={`rounded-[14px] border p-4 ${rowClass}`}>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#D79A2B]">Ruang lingkup eksplorasi</p>
              <p className="mt-2 text-lg font-black">{publicEvidenceSourceLabel}</p>
              <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>
                ID tim: {tablePrefix}. {hackathonSummary?.schemaScope?.notPrimaryReference ? "Bukan referensi utama SIMKOPDES." : "Ruang lingkup terbatas untuk bukti eksplorasi."}
              </p>
            </div>
            <div className={`rounded-[14px] border p-4 ${rowClass}`}>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#D79A2B]">Sumber bukti</p>
              <p className="mt-2 text-2xl font-black">{endpointStatus}</p>
              <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>
                 Ringkasan, kualitas data, skor peluang, kecocokan buyer, dan kesiapan pembiayaan dikonsumsi terpisah.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <MiniBarChart title="Bukti siap pakai" data={endpointChartData} mutedClass={mutedClass} innerClass={rowClass} />
            <MiniBarChart title="Catatan kualitas data" data={qualityChartData} mutedClass={mutedClass} innerClass={rowClass} />
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-5">
            {endpointCards.map((endpoint) => (
              <div
                key={endpoint.id}
                className={`rounded-[12px] border px-3 py-3 ${endpoint.payloadReady ? rowClass : alertRowClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black">{endpoint.label}</p>
                  <span className={`rounded-[8px] px-2 py-1 text-[11px] font-black ${
                    endpoint.payloadReady ? "bg-[#E7F5E8] text-[#236327]" : "bg-[#FFF3D8] text-[#7A4E2D]"
                  }`}>
                    {endpoint.payloadReady ? "siap" : hackathonStatus === "loading" ? "memuat" : "perlu cek"}
                  </span>
                </div>
                <p className={`mt-2 text-xs font-semibold leading-5 ${mutedClass}`}>
                  Sumber: {endpoint.source ?? publicEvidenceSourceLabel}
                </p>
                <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>{endpoint.mode ?? endpoint.note}</p>
              </div>
            ))}
          </div>

          <SignalSpineCompactPanel
            className="mt-5"
            panelClass={panelClass}
            innerClass={rowClass}
            mutedClass={mutedClass}
            signalSpine={signalSpine}
            signalSpineStatus={signalSpineStatus}
            signalSpineError={signalSpineError}
            embedded
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className={`rounded-[14px] border p-4 ${innerClass}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">Tabel bukti</h3>
                <span className="text-xs font-black text-[#D79A2B]">Sumber: ringkasan MVP</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {hackathonSummary?.tableCounts.length ? (
                  hackathonSummary.tableCounts.map((item) => (
                    <div key={item.tableName} className={`rounded-[10px] border px-3 py-2 ${rowClass}`}>
                      <p className="text-xs font-black text-[#D79A2B]">{publicTableGroupLabel(item.tableName)}</p>
                      <p className="mt-1 text-lg font-black">{formatInteger(item.total)}</p>
                    </div>
                  ))
                ) : (
                  <p className={`rounded-[10px] border px-3 py-2 text-sm font-semibold ${alertRowClass}`}>
                    Ringkasan MVP belum mengirim jumlah kelompok data.
                  </p>
                )}
              </div>
            </div>

            <div className={`rounded-[14px] border p-4 ${innerClass}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">Catatan kualitas data</h3>
                <span className="text-xs font-black text-[#D79A2B]">Sumber: kualitas data</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {qualityTableSummaries.length ? (
                  qualityTableSummaries.map((item) => (
                    <div key={item.table} className={`rounded-[10px] border px-3 py-2 ${rowClass}`}>
                      <p className="text-xs font-black text-[#D79A2B]">{publicTableGroupLabel(item.table)}</p>
                      <p className="mt-1 text-sm font-black">{formatInteger(item.rows)} baris dicek</p>
                      <p className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>
                        Kunci {formatInteger(item.missingKeys)} - field {formatInteger(item.missingFields)} - kualitas {formatInteger(item.qualityRows)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className={`rounded-[10px] border px-3 py-2 text-sm font-semibold ${alertRowClass}`}>
                    Kualitas data belum mengirim ringkasan kelompok.
                  </p>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {qualityRisks.length > 0 ? (
                  qualityRisks.map((item) => (
                    <div
                      key={`${item.label}-${item.note}`}
                      className={`grid gap-2 rounded-[10px] border px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center ${
                        item.tone === "critical" ? dangerRowClass : alertRowClass
                      }`}
                    >
                      <div>
                        <p className="text-sm font-black">{item.label}</p>
                        <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>{item.note}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-mono text-sm font-black text-[#C92A2A]">{formatInteger(item.value)}</p>
                        <p className={`text-[11px] font-bold ${mutedClass}`}>{item.rateLabel}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={`rounded-[10px] border px-3 py-2 text-sm font-semibold ${rowClass}`}>
                    Tidak ada warning agregat yang dilaporkan kualitas data.
                  </p>
                )}
              </div>
            </div>
          </div>
        </article>
      ) : null}

      {dataTab === "opportunity" ? (
        <section className="grid gap-5">
          <article className={`rounded-[16px] border p-5 ${panelClass}`}>
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm font-black text-[#D79A2B]">Rekomendasi produk</p>
                <h3 className="mt-2 text-2xl font-black">Pilih area atau tipe buyer, lalu buka detail.</h3>
                <p className={`mt-2 max-w-3xl text-sm font-semibold leading-6 ${mutedClass}`}>
                  Layar utama hanya menampilkan ranking, sinyal, dan aksi. Angka detail, caveat, serta langkah lanjut dibuka di panel detail agar operator tidak kehilangan alur.
                </p>
              </div>
              <MiniBarChart title="Skor area prioritas" data={opportunityChartData} mutedClass={mutedClass} innerClass={rowClass} />
            </div>
          </article>

          <div className="grid gap-5 2xl:grid-cols-2">
            <ManagedTablePanel
              panelClass={panelClass}
              innerClass={innerClass}
              mutedClass={mutedClass}
              title="Area prioritas produk"
              description="Ranking area dari sinyal komoditas, koperasi, produk, stok, transaksi, dan kemitraan."
              sourceLabel="Sumber: skor peluang agregat"
              rows={topOpportunityAreas}
              columns={opportunityColumns}
              rowKey={opportunityKeyFor}
              getSearchText={(item) =>
                [
                  item.area.kodeWilayah,
                  item.area.province,
                  item.area.regency,
                  item.area.district,
                  item.area.village,
                  item.score,
                  item.rawSignals.commodityRows,
                  item.rawSignals.products,
                  item.rawSignals.stockItems,
                ].join(" ")
              }
              filters={[
                ...createValueFilters(topOpportunityAreas, (item) => item.area.province ?? "Provinsi belum lengkap").map((filter) => ({
                  ...filter,
                  value: `province:${filter.value}`,
                  label: `Provinsi: ${filter.label}`,
                })),
                {
                  value: "score-70",
                  label: "Skor 70+",
                  predicate: (item) => item.score >= 70,
                },
              ]}
              filterLabel="Provinsi/skor"
              emptyTitle="Belum ada rekomendasi area."
              emptyBody="Skor peluang belum mengirim area prioritas."
              pageSize={5}
              tableMinWidth={940}
            />

            <ManagedTablePanel
              panelClass={panelClass}
              innerClass={innerClass}
              mutedClass={mutedClass}
              title="Kesiapan buyer awal"
              description="Tipe buyer dipakai sebagai lensa readiness, bukan nama buyer atau komitmen permintaan."
              sourceLabel="Sumber: buyer matching lite agregat"
              rows={buyerReadiness}
              columns={buyerReadinessColumns}
              rowKey={buyerKeyFor}
              getSearchText={(item) =>
                [
                  item.buyerArchetypeLabel,
                  item.readinessCluster,
                  item.cooperativeRef,
                  item.cooperativeName,
                  item.location.regency,
                  item.location.province,
                  item.score,
                  item.productSnapshot.productExamples.join(" "),
                ].join(" ")
              }
              filters={createValueFilters(buyerReadiness, (item) => clusterLabel[item.readinessCluster] ?? item.readinessCluster).map((filter) => ({
                ...filter,
                value: `cluster:${filter.value}`,
                label: `Cluster: ${filter.label}`,
              }))}
              filterLabel="Cluster"
              emptyTitle="Belum ada kesiapan buyer."
              emptyBody="Kecocokan buyer belum mengirim ringkasan kesiapan."
              pageSize={5}
              tableMinWidth={900}
            />
          </div>

          <div className={`rounded-[14px] border p-4 ${innerClass}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-black">Ruang kesiapan pembiayaan</h3>
                <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>
                  Status agregat draft, diajukan, dan terverifikasi. Ini kesiapan, bukan persetujuan pembiayaan.
                </p>
              </div>
              <span className="text-xs font-black text-[#D79A2B]">Sumber: kesiapan pembiayaan</span>
            </div>
            {hackathonFinancingReadiness ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
                <MiniBarChart title="Status pembiayaan" data={financingChartData} mutedClass={mutedClass} innerClass={rowClass} />
                <div className="grid gap-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {financingStatusSummary.map((item) => (
                      <div key={item.statusKey} className={`rounded-[10px] border px-3 py-2 ${rowClass}`}>
                        <p className="text-xs font-black text-[#D79A2B]">{item.status}</p>
                        <p className="mt-1 font-mono text-lg font-black">{formatInteger(item.requests)}</p>
                        <p className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>{formatRupiah(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
                    <div className={`rounded-[12px] border p-3 ${rowClass}`}>
                      <p className="text-xs font-black uppercase text-[#D79A2B]">Ringkasan kanal</p>
                      <div className="mt-3 space-y-2">
                        {financingChannelSummary.length > 0 ? (
                          financingChannelSummary.map((item) => (
                            <div key={item.channel} className="flex items-center justify-between gap-3 text-xs font-bold">
                              <span>{item.channel}</span>
                              <span>{formatInteger(item.requests)} / {formatRupiah(item.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <p className={`text-xs font-semibold ${mutedClass}`}>Kanal pembiayaan belum terdeteksi.</p>
                        )}
                      </div>
                      <p className={`mt-3 text-[11px] font-semibold leading-5 ${mutedClass}`}>
                         Keyakinan: {hackathonFinancingReadiness.confidence?.level ?? "terbatas"}. {publicSetupMessage(hackathonFinancingReadiness.freshness?.caveat, "Catatan sumber perlu dicek operator.")}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {financingChecklist.map((item) => (
                        <div key={item.id} className={`rounded-[12px] border p-3 ${rowClass}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black">{item.title}</p>
                            <span className="rounded-[8px] bg-[#FFF3D8] px-2 py-1 text-[11px] font-black text-[#7A4E2D]">
                              {item.status}
                            </span>
                          </div>
                          <p className={`mt-2 text-xs font-semibold leading-5 ${mutedClass}`}>{item.nextAction}</p>
                          <p className={`mt-2 text-[11px] font-bold leading-5 ${mutedClass}`}>{item.caveat}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className={`mt-4 rounded-[10px] border px-3 py-2 text-sm font-semibold ${rowClass}`}>
                Kesiapan pembiayaan belum mengirim agregat.
              </p>
            )}
          </div>

          {hackathonSummary?.dataQualityFlags.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {hackathonSummary.dataQualityFlags.slice(0, 4).map((flag) => (
                <div key={flag} className={`rounded-[12px] border p-3 text-sm font-semibold leading-6 ${alertRowClass}`}>
                  {flag}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {dataTab === "shared" ? (
        <div className="grid gap-5">
          <article className={`rounded-[16px] border p-5 ${panelClass}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#D79A2B]">
                  Agregat eksplorasi
                </p>
                <h2 className="mt-2 text-xl font-black">Produk, wilayah, pembiayaan, dan transaksi dari sumber eksplorasi.</h2>
            <p className={`mt-2 max-w-4xl text-sm font-semibold leading-6 ${mutedClass}`}>
              Data di bawah datang dari agregat eksplorasi yang dibaca server sebagai ringkasan. Tidak ada NIK, telepon, alamat, dokumen mentah, foto, atau buyer bernama yang dipilih.
                </p>
              </div>
              <StatusBadge tone={hackathonSharedDb?.status === "ready" ? "success" : "warning"}>
                {dashboardSharedDbStatusLabel}
              </StatusBadge>
            </div>
            <div className="mt-5">
              <MiniBarChart title="Ringkasan agregat" data={sharedDbChartData} mutedClass={mutedClass} innerClass={innerClass} />
            </div>
            {hackathonSharedDb?.schemaScope?.description ? (
              <p className={`mt-3 rounded-[12px] border px-3 py-2 text-xs font-semibold leading-5 ${innerClass}`}>
                {publicSetupMessage(
                  hackathonSharedDb.schemaScope.description,
                  "Sumber eksplorasi dipakai sebagai bahan terbatas, bukan referensi utama SIMKOPDES atau data operasional resmi.",
                )}
              </p>
            ) : null}
            {hackathonSharedDb?.error ? (
              <p className={`mt-3 rounded-[12px] border px-3 py-2 text-xs font-semibold leading-5 ${dangerRowClass}`}>
                Agregat eksplorasi perlu dicek di server. Dashboard utama tetap memakai data operasional milik tim.
              </p>
            ) : null}
          </article>

          <div className="grid gap-5 2xl:grid-cols-2">
            <ManagedTablePanel
              panelClass={panelClass}
              innerClass={innerClass}
              mutedClass={mutedClass}
              title="Kategori produk eksplorasi"
              description="Produk mentah dikelompokkan menjadi kategori luas agar tidak menjadi klaim buyer/offtaker bernama."
              sourceLabel={`Sumber: agregat produk eksplorasi - ID tim ${hackathonSharedDb?.tablePrefix ?? "anak_sarengklek_"}`}
              rows={dashboardSharedProductRows}
              columns={sharedProductColumns}
              rowKey={(item) => item.productCategory}
              getSearchText={(item) => [item.productCategory, item.rows, item.cooperatives, item.inventoryRows, item.source, item.caveat].join(" ")}
              filters={createValueFilters(dashboardSharedProductRows, (item) => item.productCategory)}
              filterLabel="Kategori"
              emptyTitle="Agregat produk belum tersedia."
              emptyBody={publicSetupMessage(hackathonSharedDb?.setup.message ?? hackathonSharedDb?.error?.message, "Agregat produk belum aktif di server ini.")}
              pageSize={5}
              tableMinWidth={860}
            />

            <ManagedTablePanel
              panelClass={panelClass}
              innerClass={innerClass}
              mutedClass={mutedClass}
              title="Area dan komoditas eksplorasi"
              description="Sinyal wilayah/provinsi dipakai untuk prioritas eksplorasi peta dan skor peluang."
              sourceLabel="Sumber: agregat wilayah dan komoditas eksplorasi"
              rows={dashboardSharedAreaRows}
              columns={sharedAreaColumns}
              rowKey={(item) => item.province}
              getSearchText={(item) => [item.province, item.regencies, item.districts, item.villages, item.commodityRows, item.commodities, item.cooperatives, item.potentialValue].join(" ")}
              filters={createValueFilters(dashboardSharedAreaRows, (item) => item.province)}
              filterLabel="Provinsi"
              emptyTitle="Agregat wilayah belum tersedia."
              emptyBody={publicSetupMessage(hackathonSharedDb?.setup.message ?? hackathonSharedDb?.error?.message, "Agregat wilayah belum aktif di server ini.")}
              pageSize={5}
              tableMinWidth={880}
            />

            <ManagedTablePanel
              panelClass={panelClass}
              innerClass={innerClass}
              mutedClass={mutedClass}
              title="Pembiayaan agregat"
              description="Dipakai sebagai kesiapan dan guardrail analis bisnis, bukan persetujuan atau skor kredit otomatis."
              sourceLabel="Sumber: agregat kesiapan pembiayaan"
              rows={dashboardSharedFinancingRows}
              columns={sharedFinancingColumns}
              rowKey={(item) => `${item.status}-${item.channel}`}
              getSearchText={(item) => [item.status, item.channel, item.requests, item.amount, item.source, item.caveat].join(" ")}
              filters={[
                ...createValueFilters(dashboardSharedFinancingRows, (item) => item.status).map((filter) => ({
                  ...filter,
                  value: `status:${filter.value}`,
                  label: `Status: ${filter.label}`,
                })),
                ...createValueFilters(dashboardSharedFinancingRows, (item) => item.channel).map((filter) => ({
                  ...filter,
                  value: `channel:${filter.value}`,
                  label: `Kanal: ${filter.label}`,
                })),
              ]}
              filterLabel="Status/kanal"
              emptyTitle="Agregat pembiayaan belum tersedia."
              emptyBody={publicSetupMessage(hackathonSharedDb?.setup.message ?? hackathonSharedDb?.error?.message, "Agregat pembiayaan belum aktif di server ini.")}
              pageSize={5}
              tableMinWidth={860}
            />

            <ManagedTablePanel
              panelClass={panelClass}
              innerClass={innerClass}
              mutedClass={mutedClass}
              title="Transaksi agregat"
              description="Dipakai sebagai proxy permintaan/arus kas sampel, bukan permintaan live atau data pelanggan."
              sourceLabel="Sumber: agregat transaksi"
              rows={dashboardSharedTransactionRows}
              columns={sharedTransactionColumns}
              rowKey={(item) => `${item.status}-${item.channel}`}
              getSearchText={(item) => [item.status, item.channel, item.transactions, item.amount, item.cooperatives, item.source, item.caveat].join(" ")}
              filters={[
                ...createValueFilters(dashboardSharedTransactionRows, (item) => item.status).map((filter) => ({
                  ...filter,
                  value: `status:${filter.value}`,
                  label: `Status: ${filter.label}`,
                })),
                ...createValueFilters(dashboardSharedTransactionRows, (item) => item.channel).map((filter) => ({
                  ...filter,
                  value: `channel:${filter.value}`,
                  label: `Kanal: ${filter.label}`,
                })),
              ]}
              filterLabel="Status/kanal"
              emptyTitle="Agregat transaksi belum tersedia."
              emptyBody={publicSetupMessage(hackathonSharedDb?.setup.message ?? hackathonSharedDb?.error?.message, "Agregat transaksi belum aktif di server ini.")}
              pageSize={5}
              tableMinWidth={860}
            />
          </div>
        </div>
      ) : null}

      {dataTab === "queue" ? (
        <div className="grid gap-5">
          <ManagedTablePanel
            panelClass={panelClass}
            innerClass={innerClass}
            mutedClass={mutedClass}
            title="Meja verifikasi data warga"
            description="Antrean dari WhatsApp, voice note, dan input operator dibaca sebagai catatan terstruktur sebelum masuk stok, pembiayaan, atau pasar."
            sourceLabel={`${completed}/${filteredQueue.length} selesai - hanya ID dan sumber, tanpa PII terlihat`}
            rows={filteredQueue}
            columns={lumbungQueueColumns}
            rowKey={(item) => item.id}
            getSearchText={(item) => [item.id, item.source, item.module, item.summary, item.status].join(" ")}
            filters={lumbungQueueFilters}
            filterLabel="Status/modul"
            emptyTitle="Belum ada antrean verifikasi."
            emptyBody="Antrean akan muncul setelah input warga/operator masuk ke dashboard."
            pageSize={5}
            tableMinWidth={880}
            rowClassName={(item) => (selected?.id === item.id ? "bg-[#D79A2B]/10" : "")}
          />
        </div>
      ) : null}

      {queueDetailOpen && selected ? (
        <DetailDrawer
          title={selected.id}
          eyebrow="Detail verifikasi data"
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          onClose={() => setQueueDetailOpen(false)}
        >
          <div className={`rounded-[14px] border p-4 ${innerClass}`}>
            <p className="text-sm font-black">Ringkasan masuk</p>
            <p className={`mt-2 text-lg font-extrabold leading-7 ${mutedClass}`}>{selected.summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Sumber", selected.source],
              ["Modul", selected.module],
              ["Status", selected.status],
            ].map(([label, value]) => (
              <div key={label} className={`rounded-[12px] border p-3 ${innerClass}`}>
                <p className="text-xs font-black text-[#D79A2B]">{label}</p>
                <p className="mt-2 text-sm font-black">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => askFarmer(selected.id)}
              className="inline-flex justify-center rounded-[12px] border border-current/15 px-4 py-3 text-sm font-extrabold focus-visible:lb-focus"
            >
              Tanya warga
            </button>
            <button
              type="button"
              onClick={() => approveDraft(selected.id)}
              className="inline-flex justify-center rounded-[12px] bg-[#2F7D32] px-4 py-3 text-sm font-extrabold text-white focus-visible:lb-focus"
            >
              Setujui data
            </button>
            <button
              type="button"
              onClick={() => {
                setQueueDetailOpen(false);
                openModule(selected.module);
              }}
              className="inline-flex justify-center rounded-[12px] bg-[#1D5D8F] px-4 py-3 text-sm font-extrabold text-white focus-visible:lb-focus"
            >
              Buka modul
            </button>
          </div>
        </DetailDrawer>
      ) : null}

      {selectedOpportunityDetail ? (
        <DetailDrawer
          title={[selectedOpportunityDetail.area.village, selectedOpportunityDetail.area.regency, selectedOpportunityDetail.area.province].filter(Boolean).join(", ") || "Area prioritas"}
          eyebrow="Detail rekomendasi area"
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          onClose={() => setOpportunityDetailKey(null)}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Skor total", selectedOpportunityDetail.score],
              ["Komoditas", selectedOpportunityDetail.rawSignals.commodityRows],
              ["Stok", selectedOpportunityDetail.rawSignals.stockItems],
              ["Produk", selectedOpportunityDetail.rawSignals.products],
              ["Koperasi", selectedOpportunityDetail.rawSignals.cooperatives],
              ["Transaksi", selectedOpportunityDetail.rawSignals.transactions],
            ].map(([label, value]) => (
              <div key={label} className={`rounded-[12px] border p-3 ${innerClass}`}>
                <p className="text-xs font-black text-[#D79A2B]">{label}</p>
                <p className="mt-2 font-mono text-lg font-black">{formatInteger(value)}</p>
              </div>
            ))}
          </div>
          <div className={`rounded-[14px] border p-4 ${innerClass}`}>
            <p className="text-sm font-black">Komponen skor</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                ["Potensi komoditas", selectedOpportunityDetail.componentScores.commodityPotential],
                ["Kesiapan koperasi", selectedOpportunityDetail.componentScores.cooperativeReadiness],
                ["Produk dan stok", selectedOpportunityDetail.componentScores.productStockReadiness],
              ].map(([label, value]) => (
                <div key={label} className={`rounded-[10px] border px-3 py-2 ${alertRowClass}`}>
                  <p className="text-xs font-black text-[#7A4E2D]">{label}</p>
                  <p className="mt-1 font-mono text-sm font-black">{formatInteger(value)}</p>
                </div>
              ))}
            </div>
          </div>
          <p className={`rounded-[14px] border p-4 text-sm font-semibold leading-6 ${innerClass} ${mutedClass}`}>
            Gunakan rekomendasi ini untuk memilih area eksplorasi, lalu buka Buyer Awal atau Kesiapan Stok. Angka bersifat agregat dan harus direview operator sebelum dijadikan keputusan lapangan.
          </p>
        </DetailDrawer>
      ) : null}

      {selectedBuyerDetail ? (
        <DetailDrawer
          title={selectedBuyerDetail.buyerArchetypeLabel}
          eyebrow="Detail buyer matching lite"
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          onClose={() => setBuyerDetailKey(null)}
        >
          <div className={`rounded-[14px] border p-4 ${innerClass}`}>
            <p className="text-sm font-black">Koperasi dan lokasi</p>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
              {selectedBuyerDetail.cooperativeName ?? selectedBuyerDetail.cooperativeRef} - {[selectedBuyerDetail.location.regency, selectedBuyerDetail.location.province].filter(Boolean).join(", ") || "Lokasi belum lengkap"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Skor", selectedBuyerDetail.score],
              ["Produk", selectedBuyerDetail.productSnapshot.productsTotal],
              ["Stok item", selectedBuyerDetail.signals.stockItems],
              ["Transaksi", selectedBuyerDetail.signals.transactions],
              ["Kemitraan", selectedBuyerDetail.signals.partnershipRequests],
              ["Stok positif", selectedBuyerDetail.signals.positiveStockItems],
            ].map(([label, value]) => (
              <div key={label} className={`rounded-[12px] border p-3 ${innerClass}`}>
                <p className="text-xs font-black text-[#D79A2B]">{label}</p>
                <p className="mt-2 font-mono text-lg font-black">{formatInteger(value)}</p>
              </div>
            ))}
          </div>
          <div className={`rounded-[14px] border p-4 ${innerClass}`}>
            <p className="text-sm font-black">Produk terdeteksi</p>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
              {selectedBuyerDetail.productSnapshot.productExamples.slice(0, 6).join(", ") || "Produk belum tersedia."}
            </p>
          </div>
          <p className={`rounded-[14px] border p-4 text-sm font-semibold leading-6 ${innerClass} ${mutedClass}`}>
            Ini tipe buyer readiness, bukan buyer bernama. Kontak buyer hanya boleh lanjut setelah kualitas, packaging, stok, dan persetujuan pengurus sudah lengkap.
          </p>
        </DetailDrawer>
      ) : null}
    </section>
  );
}

function GeraiPintarView({
  panelClass,
  innerClass,
  mutedClass,
  stocks,
  reload,
  setPanelMessage,
  requestConfirm,
}: ViewClassProps & {
  stocks: StockItem[];
  reload: () => Promise<void>;
  setPanelMessage: (message: string, tone?: ToastTone) => void;
  requestConfirm: (config: ConfirmConfig) => void;
}) {
  const geraiItems = stocks.filter((item) => item.location.includes("Gerai"));
  const getLevel = (state: string) => (state === "Stok Aman" ? 78 : state === "Perlu Restok" ? 32 : 48);

  async function requestRestock(item: StockItem) {
    const response = await fetch(`/api/stocks/${encodeURIComponent(item.id)}/restock`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPanelMessage(publicSetupMessage(payload.message ?? payload.error, `${item.name}: restock gagal.`), "error");
      return;
    }
    await reload();
    setPanelMessage(`${item.name}: restock masuk ke rencana operasional dan Agent Center.`, "success");
  }

  function exportSupplierOrder() {
    const rows = [
      ["item_id", "name", "unit", "state", "location", "restock_requested"],
      ...stocks
        .filter((item) => item.state !== "Stok Aman" || item.restockRequested)
        .map((item) => [
          item.id,
          item.name,
          item.unit,
          item.state,
          item.location,
          Boolean(item.restockRequested),
        ]),
    ];
    downloadTextFile(
      "lumbung-bersama-draft-pesanan-supplier.csv",
      toCsv(rows),
      "text/csv;charset=utf-8",
    );
    setPanelMessage("Draft pesanan supplier diunduh dari data stok operasional.", "success");
  }

  const geraiStockFilters: ManagedTableFilter<StockItem>[] = [
    {
      value: "needs-restock",
      label: "Perlu restock",
      predicate: (item) => item.state !== "Stok Aman" || Boolean(item.restockRequested),
    },
    ...createValueFilters(geraiItems, (item) => item.state).map((filter) => ({
      ...filter,
      value: `state:${filter.value}`,
      label: `Status: ${filter.label}`,
    })),
  ];
  const geraiStockColumns: ManagedTableColumn<StockItem>[] = [
    {
      key: "item",
      heading: "Item",
      render: (item) => (
        <div>
          <p className="font-black">{item.name}</p>
          <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>{item.id}</p>
        </div>
      ),
    },
    {
      key: "unit",
      heading: "Unit",
      render: (item) => <span className="font-mono text-xs font-black text-[#D79A2B]">{item.unit}</span>,
    },
    {
      key: "state",
      heading: "Status",
      render: (item) => {
        const level = item.restockRequested ? 86 : getLevel(item.state);
        return (
          <div>
            <span className={`rounded-[8px] px-2 py-1 text-[11px] font-black ${
              level < 45 ? "bg-[#FFE3E3] text-[#9B1C1C]" : "bg-[#E7F5E8] text-[#236327]"
            }`}>
              {item.restockRequested ? "Restock diajukan" : item.state}
            </span>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-[#2F7D32]" style={{ width: `${level}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "location",
      heading: "Lokasi",
      render: (item) => <span className={`text-sm font-semibold ${mutedClass}`}>{item.location}</span>,
    },
    {
      key: "action",
      heading: "Aksi",
      className: "text-right",
      headerClassName: "text-right",
      render: (item) => (
        <button
          type="button"
          onClick={() =>
            requestConfirm({
              title: `Buat restock ${item.name}?`,
              message: "Draft restock akan masuk ke rencana operasional untuk ditindaklanjuti petugas gerai.",
              confirmLabel: "Buat restock",
              onConfirm: () => requestRestock(item),
            })
          }
          className="rounded-[10px] bg-[#C92A2A] px-3 py-2 text-xs font-extrabold text-white focus-visible:lb-focus"
        >
          Buat restock
        </button>
      ),
    },
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <ManagedTablePanel
        panelClass={panelClass}
        innerClass={innerClass}
        mutedClass={mutedClass}
        title="Rak gerai dan batas restock"
        description="Operator gerai melihat stok harian, status batas minimum, dan membuat draft pembelian kolektif."
            sourceLabel="Sumber: stok data operasional"
        rows={geraiItems}
        columns={geraiStockColumns}
        rowKey={(item) => item.id}
        getSearchText={(item) => [item.id, item.name, item.unit, item.state, item.location].join(" ")}
        filters={geraiStockFilters}
        filterLabel="Status"
        emptyTitle="Belum ada stok gerai."
        emptyBody="Stok gerai akan muncul setelah item lokasi Gerai tersimpan."
        pageSize={6}
        tableMinWidth={860}
      />

      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <h3 className="text-xl font-black">Saran belanja kolektif</h3>
        <div className="mt-4 space-y-3">
          {villageInsights
            .filter((item) => item.title.toLowerCase().includes("restock") || item.action.toLowerCase().includes("supplier"))
            .map((item) => (
              <div key={item.title} className={`rounded-[14px] border p-4 ${innerClass}`}>
                <p className="font-black">{item.title}</p>
                <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>{item.signal}</p>
                <p className="mt-3 text-sm font-black text-[#D79A2B]">{item.action}</p>
              </div>
            ))}
        </div>
        <button
          type="button"
          onClick={exportSupplierOrder}
          className="mt-5 inline-flex w-full justify-center rounded-[12px] bg-[#D79A2B] px-4 py-3 text-sm font-extrabold text-[#172027] focus-visible:lb-focus"
        >
          Gabungkan pesanan supplier
        </button>
      </article>
    </section>
  );
}

function StokLogistikView({
  panelClass,
  innerClass,
  mutedClass,
  queue,
  stocks,
  stockLedger,
  mediaEvidence,
  setPanelMessage,
}: ViewClassProps & {
  queue: QueueItem[];
  stocks: StockItem[];
  stockLedger: StockLedgerEntry[];
  mediaEvidence: MediaEvidence[];
  setPanelMessage: (message: string, tone?: ToastTone) => void;
}) {
  const [scheduled, setScheduled] = useState<string[]>([]);
  const logisticsQueue = queue.filter((item) => item.module === "Stok dan Logistik");
  const warehouseItems = stocks.filter((item) => !item.location.includes("Gerai"));

  function exportManifest() {
    const rows = [
      ["record_id", "source", "summary", "status", "scheduled"],
      ...logisticsQueue.map((item) => [
        item.id,
        item.source,
        item.summary,
        item.status,
        scheduled.includes(item.id),
      ]),
      [],
      ["stock_id", "name", "unit", "state", "location"],
      ...warehouseItems.map((item) => [item.id, item.name, item.unit, item.state, item.location]),
      [],
      ["ledger_id", "stock", "movement", "quantity", "unit", "evidence_ref", "readiness"],
      ...stockLedger.map((item) => [
        item.id,
        item.stockName,
        item.movementType,
        item.quantity,
        item.unitLabel,
        item.evidenceRef,
        item.readinessStatus,
      ]),
    ];
    downloadTextFile(
      "lumbung-bersama-manifest-logistik.csv",
      toCsv(rows),
      "text/csv;charset=utf-8",
    );
    setPanelMessage("Manifest logistik diunduh dari antrean dan stok operasional.", "success");
  }

  const logisticsQueueFilters: ManagedTableFilter<QueueItem>[] = [
    {
      value: "scheduled",
      label: "Pickup terjadwal",
      predicate: (item) => scheduled.includes(item.id),
    },
    {
      value: "unscheduled",
      label: "Belum dijadwalkan",
      predicate: (item) => !scheduled.includes(item.id),
    },
    ...createValueFilters(logisticsQueue, (item) => item.status).map((filter) => ({
      ...filter,
      value: `status:${filter.value}`,
      label: `Status: ${filter.label}`,
    })),
  ];
  const logisticsQueueColumns: ManagedTableColumn<QueueItem>[] = [
    {
      key: "record",
      heading: "Record",
      render: (item) => (
        <div>
          <p className="font-mono text-xs font-black">{item.id}</p>
          <p className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>{item.source}</p>
        </div>
      ),
    },
    {
      key: "summary",
      heading: "Pickup",
      render: (item) => <p className="max-w-[420px] text-sm font-semibold leading-6">{item.summary}</p>,
    },
    {
      key: "status",
      heading: "Status",
      render: (item) => (
        <span className="rounded-[8px] bg-[#E7F5E8] px-2 py-1 text-[11px] font-black text-[#236327]">
          {scheduled.includes(item.id) ? "Pickup terjadwal" : item.status}
        </span>
      ),
    },
    {
      key: "action",
      heading: "Aksi",
      className: "text-right",
      headerClassName: "text-right",
      render: (item) => (
        <button
          type="button"
          onClick={() => {
            setScheduled((current) => (current.includes(item.id) ? current : [...current, item.id]));
            setPanelMessage(`${item.id}: jadwal pickup Jumat pagi dibuat untuk dicek kendaraan dan gudang.`, "success");
          }}
          className="rounded-[10px] bg-[#1D5D8F] px-3 py-2 text-xs font-extrabold text-white focus-visible:lb-focus"
        >
          Jadwalkan
        </button>
      ),
    },
  ];
  const warehouseFilters = [
    ...createValueFilters(warehouseItems, (item) => item.state).map((filter) => ({
      ...filter,
      value: `state:${filter.value}`,
      label: `Status: ${filter.label}`,
    })),
    ...createValueFilters(warehouseItems, (item) => item.location).map((filter) => ({
      ...filter,
      value: `location:${filter.value}`,
      label: `Lokasi: ${filter.label}`,
    })),
  ];
  const warehouseColumns: ManagedTableColumn<StockItem>[] = [
    {
      key: "item",
      heading: "Item",
      render: (item) => (
        <div>
          <p className="font-black">{item.name}</p>
          <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>{item.id}</p>
        </div>
      ),
    },
    {
      key: "unit",
      heading: "Unit",
      render: (item) => <span className="font-mono text-xs font-black text-[#D79A2B]">{item.unit}</span>,
    },
    {
      key: "state",
      heading: "Status",
      render: (item) => <span className="text-sm font-black">{item.state}</span>,
    },
    {
      key: "location",
      heading: "Lokasi",
      render: (item) => <span className={`text-sm font-semibold ${mutedClass}`}>{item.location}</span>,
    },
  ];
  const ledgerFilters = [
    ...createValueFilters(stockLedger, (item) => item.movementType).map((filter) => ({
      ...filter,
      value: `move:${filter.value}`,
      label: `Pergerakan: ${filter.label}`,
    })),
    ...createValueFilters(stockLedger, (item) => item.readinessStatus).map((filter) => ({
      ...filter,
      value: `readiness:${filter.value}`,
      label: `Kesiapan: ${filter.label}`,
    })),
  ];
  const ledgerColumns: ManagedTableColumn<StockLedgerEntry>[] = [
    {
      key: "stock",
      heading: "Stock",
      render: (entry) => (
        <div>
          <p className="font-black">{entry.stockName}</p>
          <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>{entry.id}</p>
        </div>
      ),
    },
    {
      key: "movement",
      heading: "Pergerakan",
      render: (entry) => <span className="rounded-[8px] bg-[#FFF3D8] px-2 py-1 text-[11px] font-black text-[#7A4E2D]">{entry.movementType}</span>,
    },
    {
      key: "quantity",
      heading: "Jumlah",
      render: (entry) => <span className="font-mono text-xs font-black">{formatInteger(entry.quantity)} {entry.unitLabel}</span>,
    },
    {
      key: "readiness",
      heading: "Kesiapan",
      render: (entry) => <span className="text-sm font-black text-[#D79A2B]">{entry.readinessStatus}</span>,
    },
    {
      key: "evidence",
      heading: "Bukti",
      render: (entry) => <span className={`text-xs font-semibold ${mutedClass}`}>{entry.evidenceRef}</span>,
    },
  ];
  const mediaFilters = [
    ...createValueFilters(mediaEvidence, (item) => item.verificationStatus).map((filter) => ({
      ...filter,
      value: `status:${filter.value}`,
      label: `Status: ${filter.label}`,
    })),
    ...createValueFilters(mediaEvidence, (item) => item.mediaType).map((filter) => ({
      ...filter,
      value: `type:${filter.value}`,
      label: `Tipe: ${filter.label}`,
    })),
  ];
  const mediaColumns: ManagedTableColumn<MediaEvidence>[] = [
    {
      key: "label",
      heading: "Bukti",
      render: (item) => (
        <div>
          <p className="font-black">{item.redactedLabel}</p>
          <p className={`mt-1 text-xs font-semibold leading-5 ${mutedClass}`}>{item.caption}</p>
        </div>
      ),
    },
    {
      key: "record",
      heading: "Catatan",
      render: (item) => (
        <div>
          <p className="font-mono text-xs font-black">{item.relatedRecordId}</p>
          <p className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>{item.relatedRecordType}</p>
        </div>
      ),
    },
    {
      key: "type",
      heading: "Type",
      render: (item) => <span className="text-sm font-black">{item.mediaType}</span>,
    },
    {
      key: "status",
      heading: "Status",
      render: (item) => <span className="text-sm font-black text-[#D79A2B]">{item.verificationStatus}</span>,
    },
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <ManagedTablePanel
        panelClass={panelClass}
        innerClass={innerClass}
        mutedClass={mutedClass}
        title="Pickup dan gudang"
        description="Modul ini memisahkan permintaan pickup dari stok gudang agar operator tahu barang mana yang bergerak hari ini."
        sourceLabel="Antrean memakai ID/sumber record, bukan data pribadi warga."
        rows={logisticsQueue}
        columns={logisticsQueueColumns}
        rowKey={(item) => item.id}
        getSearchText={(item) => [item.id, item.source, item.summary, item.status, item.module].join(" ")}
        filters={logisticsQueueFilters}
        filterLabel="Pickup/status"
        emptyTitle="Belum ada antrean logistik."
        emptyBody="Permintaan pickup akan muncul setelah antrean Stok dan Logistik tersedia."
        pageSize={5}
        tableMinWidth={860}
      />

      <div className="grid gap-5">
        <ManagedTablePanel
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          title="Stok gudang"
          description="Kapasitas gudang mini ditampilkan sebagai tabel stok operasional, bukan peta dekoratif."
          sourceLabel="Sumber: stok data operasional"
          rows={warehouseItems}
          columns={warehouseColumns}
          rowKey={(item) => item.id}
          getSearchText={(item) => [item.id, item.name, item.unit, item.state, item.location].join(" ")}
          filters={warehouseFilters}
          filterLabel="Status/lokasi"
          emptyTitle="Belum ada stok gudang."
          emptyBody="Stok gudang akan muncul setelah item non-Gerai tersimpan."
          pageSize={5}
          tableMinWidth={760}
        />

        <ManagedTablePanel
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          title="Riwayat stok"
          description="Barang masuk/keluar ditelusuri dengan jumlah, kesiapan, dan referensi bukti."
          sourceLabel="Sumber: ledger stok operasional"
          rows={stockLedger}
          columns={ledgerColumns}
          rowKey={(entry) => entry.id}
          getSearchText={(entry) =>
            [entry.id, entry.stockName, entry.movementType, entry.quantity, entry.unitLabel, entry.reason, entry.evidenceRef, entry.readinessStatus].join(" ")
          }
          filters={ledgerFilters}
          filterLabel="Pergerakan/kesiapan"
          emptyTitle="Belum ada riwayat stok."
          emptyBody="Riwayat akan muncul setelah tabel data tim mengirim pergerakan stok."
          pageSize={5}
          tableMinWidth={840}
        />

        <ManagedTablePanel
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          title="Metadata bukti media"
          description="Tabel hanya menampilkan label tersaring dan metadata, bukan media mentah publik."
          sourceLabel="Sumber: metadata bukti operasional"
          rows={mediaEvidence}
          columns={mediaColumns}
          rowKey={(item) => item.id}
          getSearchText={(item) =>
            [item.id, item.relatedRecordType, item.relatedRecordId, item.mediaType, item.redactedLabel, item.caption, item.verificationStatus, item.sourceLabel].join(" ")
          }
          filters={mediaFilters}
          filterLabel="Status/tipe"
          emptyTitle="Belum ada bukti media."
          emptyBody="Metadata bukti akan muncul setelah referensi bukti ditautkan."
          pageSize={5}
          tableMinWidth={820}
        />
        <button
          type="button"
          onClick={exportManifest}
          className="mt-5 inline-flex w-full justify-center rounded-[12px] border border-current/15 px-4 py-3 text-sm font-extrabold focus-visible:lb-focus"
        >
          Export manifest
        </button>
      </div>
    </section>
  );
}

function PasarMitraView({
  panelClass,
  innerClass,
  mutedClass,
  buyers,
  buyerRequirements,
  mediaEvidence,
  reload,
  setPanelMessage,
  requestConfirm,
}: ViewClassProps & {
  buyers: BuyerMatch[];
  buyerRequirements: BuyerRequirement[];
  mediaEvidence: MediaEvidence[];
  reload: () => Promise<void>;
  setPanelMessage: (message: string, tone?: ToastTone) => void;
  requestConfirm: (config: ConfirmConfig) => void;
}) {
  const [selectedBuyerId, setSelectedBuyerId] = useState("");
  const selected = buyers.find((item) => item.id === selectedBuyerId) ?? buyers[0];
  const selectedRequirement = selected
    ? buyerRequirements.find((item) => item.productName.toLowerCase() === selected.need.toLowerCase())
    : null;
  const requirementEvidence = selectedRequirement
    ? mediaEvidence.filter((item) => item.relatedRecordId === selectedRequirement.id).slice(0, 2)
    : [];

  async function approveBuyer(buyer: BuyerMatch) {
    const response = await fetch(`/api/buyer-matches/${encodeURIComponent(buyer.id)}/approve`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPanelMessage(publicSetupMessage(payload.message ?? payload.error, `${buyer.buyer}: kesiapan gagal diperbarui.`), "error");
      return;
    }
    await reload();
    setPanelMessage(`${buyer.buyer}: kesiapan tersimpan dan Agent Center diperbarui.`, "success");
  }

  async function createBuyerScript(buyer: BuyerMatch) {
    const script = [
      `Halo calon mitra, kami dari koperasi ingin memvalidasi minat untuk kebutuhan ${buyer.need}.`,
      `Konteks match: ${buyer.reason}`,
      "Catatan: draft ini berbasis tipe kebutuhan buyer. Nama pihak mitra, grade/kualitas, dan jadwal pengiriman harus diverifikasi pengurus sebelum ada komitmen transaksi.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(script);
      setPanelMessage(`${buyer.buyer}: draft kontak buyer disalin ke clipboard.`, "success");
    } catch {
      downloadTextFile(
        `lumbung-bersama-script-buyer-${buyer.id}.txt`,
        script,
        "text/plain;charset=utf-8",
      );
      setPanelMessage(`${buyer.buyer}: clipboard tidak tersedia, draft kontak buyer diunduh sebagai TXT.`, "warning");
    }
  }

  const buyerFilters: ManagedTableFilter<BuyerMatch>[] = [
    {
      value: "needs-review",
      label: "Perlu review",
      predicate: (buyer) => !buyer.status.toLowerCase().includes("setuju"),
    },
    {
      value: "approved",
      label: "Disetujui",
      predicate: (buyer) => buyer.status.toLowerCase().includes("setuju"),
    },
    ...createValueFilters(buyers, (buyer) => buyer.status).map((filter) => ({
      ...filter,
      value: `status:${filter.value}`,
      label: `Status: ${filter.label}`,
    })),
  ];
  const buyerColumns: ManagedTableColumn<BuyerMatch>[] = [
    {
      key: "buyer",
      heading: "Tipe buyer",
      render: (buyer) => (
        <div>
          <p className="font-black">{buyer.buyer}</p>
          <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>{buyer.id}</p>
        </div>
      ),
    },
    {
      key: "need",
      heading: "Kebutuhan",
      render: (buyer) => <span className="text-sm font-semibold">{buyer.need}</span>,
    },
    {
      key: "score",
      heading: "Skor",
      render: (buyer) => <span className="font-mono text-sm font-black text-[#2F7D32]">{buyer.matchScore}%</span>,
    },
    {
      key: "status",
      heading: "Status",
      render: (buyer) => <span className="text-sm font-black text-[#D79A2B]">{buyer.status}</span>,
    },
    {
      key: "evidence",
      heading: "Bukti",
      render: (buyer) => <p className={`max-w-[320px] text-xs font-semibold leading-5 ${mutedClass}`}>{buyerEvidenceLabel(buyer)}</p>,
    },
    {
      key: "action",
      heading: "Aksi",
      className: "text-right",
      headerClassName: "text-right",
      render: (buyer) => (
        <button
          type="button"
          onClick={() => setSelectedBuyerId(buyer.id)}
          className={`rounded-[10px] border px-3 py-2 text-xs font-black focus-visible:lb-focus ${
            selectedBuyerId === buyer.id ? "border-[#D79A2B] bg-[#D79A2B]/10" : innerClass
          }`}
        >
          Detail
        </button>
      ),
    },
  ];
  const requirementFilters = [
    ...createValueFilters(buyerRequirements, (requirement) => requirement.verificationStatus).map((filter) => ({
      ...filter,
      value: `status:${filter.value}`,
      label: `Status: ${filter.label}`,
    })),
    ...createValueFilters(buyerRequirements, (requirement) => requirement.unitLabel).map((filter) => ({
      ...filter,
      value: `unit:${filter.value}`,
      label: `Unit: ${filter.label}`,
    })),
  ];
  const requirementColumns: ManagedTableColumn<BuyerRequirement>[] = [
    {
      key: "product",
      heading: "Produk",
      render: (requirement) => (
        <div>
          <p className="font-black">{requirement.productName}</p>
          <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>{requirement.id}</p>
        </div>
      ),
    },
    {
      key: "archetype",
      heading: "Tipe buyer",
      render: (requirement) => <span className="text-sm font-semibold">{requirement.buyerArchetype}</span>,
    },
    {
      key: "quantity",
      heading: "Kuantitas",
      render: (requirement) => (
        <span className="font-mono text-xs font-black">
          {formatInteger(requirement.requiredQuantity)} {requirement.unitLabel}
        </span>
      ),
    },
    {
      key: "quality",
      heading: "Spec",
      render: (requirement) => <p className={`max-w-[300px] text-xs font-semibold leading-5 ${mutedClass}`}>{requirement.qualitySpec}</p>,
    },
    {
      key: "status",
      heading: "Status",
      render: (requirement) => <span className="text-sm font-black text-[#D79A2B]">{requirement.verificationStatus}</span>,
    },
  ];

  return (
    <section className="grid gap-5">
      <div className="grid gap-5">
        <ManagedTablePanel
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          title="Kecocokan buyer yang bisa diaudit"
          description="Sistem memberi alasan kecocokan dan status risiko memakai tipe kebutuhan buyer. Nama pihak mitra dan kontak buyer tetap harus diverifikasi pengurus agar tidak ada janji penjualan palsu."
          sourceLabel="Hanya tipe kebutuhan buyer - tanpa klaim buyer bernama"
          rows={buyers}
          columns={buyerColumns}
          rowKey={(buyer) => buyer.id}
          getSearchText={(buyer) => [buyer.id, buyer.buyer, buyer.need, buyer.status, buyer.reason, buyerEvidenceLabel(buyer)].join(" ")}
          filters={buyerFilters}
          filterLabel="Status"
          emptyTitle="Belum ada kecocokan buyer."
          emptyBody="Kecocokan akan muncul setelah syarat buyer dan stok punya kesiapan yang cukup."
          pageSize={5}
          tableMinWidth={980}
          rowClassName={(buyer) => (selectedBuyerId === buyer.id ? "bg-[#D79A2B]/10" : "")}
        />

        <ManagedTablePanel
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          title="Syarat buyer"
          description="Syarat operasional ditampilkan sebagai tipe kebutuhan buyer, bukan buyer bernama atau komitmen permintaan live."
          sourceLabel="Sumber: requirement buyer operasional"
          rows={buyerRequirements}
          columns={requirementColumns}
          rowKey={(requirement) => requirement.id}
          getSearchText={(requirement) =>
            [
              requirement.id,
              requirement.buyerArchetype,
              requirement.productName,
              requirement.requiredQuantity,
              requirement.unitLabel,
              requirement.qualitySpec,
              requirement.packagingSpec,
              requirement.targetWindow,
              requirement.verificationStatus,
              requirement.sourceLabel,
            ].join(" ")
          }
          filters={requirementFilters}
          filterLabel="Status/unit"
          emptyTitle="Belum ada syarat buyer."
          emptyBody="Syarat akan muncul setelah tipe kebutuhan buyer tersimpan."
          pageSize={5}
          tableMinWidth={920}
        />
      </div>

      {selectedBuyerId && selected ? (
        <DetailModal
          title={selected.buyer}
          eyebrow="Detail kesiapan tipe buyer"
          panelClass={panelClass}
          innerClass={innerClass}
          mutedClass={mutedClass}
          onClose={() => setSelectedBuyerId("")}
        >
          <div className={`rounded-[14px] border p-4 ${innerClass}`}>
            <p className="text-sm font-black">Alasan kecocokan</p>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>{selected.reason}</p>
            <p className="mt-4 text-sm font-black">Status: {selected.status}</p>
            <p className={`mt-2 text-xs font-bold leading-5 ${mutedClass}`}>{buyerEvidenceLabel(selected)}</p>
          </div>
          {selectedRequirement ? (
            <div className={`rounded-[14px] border p-4 ${innerClass}`}>
              <p className="text-sm font-black">Syarat operasional</p>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
                {formatInteger(selectedRequirement.requiredQuantity)} {selectedRequirement.unitLabel} - {selectedRequirement.qualitySpec}
              </p>
              <p className={`mt-2 text-xs font-bold leading-5 ${mutedClass}`}>
                {selectedRequirement.packagingSpec}. Target: {selectedRequirement.targetWindow}.
              </p>
              <p className="mt-3 text-xs font-black text-[#D79A2B]">{selectedRequirement.sourceLabel}</p>
              {requirementEvidence.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {requirementEvidence.map((item) => (
                    <div key={item.id} className="rounded-[10px] bg-black/5 p-3">
                      <p className="text-xs font-black">{item.redactedLabel}</p>
                      <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>{item.caption}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                requestConfirm({
                  title: `Setujui kesiapan ${selected.buyer}?`,
                  message: "Status kecocokan akan ditandai siap review pengurus. Ini bukan komitmen penjualan dan bukan bukti buyer bernama.",
                  confirmLabel: "Setujui kesiapan",
                  onConfirm: () => approveBuyer(selected),
                })
              }
              className="inline-flex justify-center rounded-[12px] bg-[#2F7D32] px-4 py-3 text-sm font-extrabold text-white focus-visible:lb-focus"
            >
              Setujui kesiapan
            </button>
            <button
              type="button"
              onClick={() => createBuyerScript(selected)}
              className="inline-flex justify-center rounded-[12px] border border-current/15 px-4 py-3 text-sm font-extrabold focus-visible:lb-focus"
            >
              Buat draft kontak buyer
            </button>
          </div>
        </DetailModal>
      ) : null}
    </section>
  );
}

function SimpanPinjamView({
  panelClass,
  innerClass,
  mutedClass,
  finance,
  reload,
  setPanelMessage,
  requestConfirm,
}: ViewClassProps & {
  finance: FinanceRequest[];
  reload: () => Promise<void>;
  setPanelMessage: (message: string, tone?: ToastTone) => void;
  requestConfirm: (config: ConfirmConfig) => void;
}) {
  async function reviewFinance(request: FinanceRequest) {
    const response = await fetch(`/api/finance-requests/${encodeURIComponent(request.id)}/review`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPanelMessage(publicSetupMessage(payload.message ?? payload.error, `${request.id}: review gagal.`), "error");
      return;
    }
    await reload();
    setPanelMessage(`${request.id}: paket komite tersimpan dan Agent Center diperbarui.`, "success");
  }

  function exportCommitteeAgenda() {
    const agenda = [
      "Agenda Rapat Komite Simpan Pinjam - Lumbung Bersama",
      "",
      "1. Buka rapat dan cek quorum pengurus.",
      "2. Review pengajuan produktif anggota.",
      ...finance.map(
        (request, index) =>
          `${index + 3}. ${request.id} - ${formatRupiah(request.amount)} - ${request.purpose} - Catatan risiko: ${request.risk}.`,
      ),
      `${finance.length + 3}. Tetapkan keputusan manual, tenor, jaminan bila perlu, dan catatan follow-up.`,
      `${finance.length + 4}. Simpan bukti rapat dan tanda tangan pengurus.`,
      "",
      "Catatan: agent hanya menyiapkan paket risiko. Keputusan tidak otomatis.",
    ].join("\n");
    downloadTextFile(
      "lumbung-bersama-agenda-komite-simpan-pinjam.txt",
      agenda,
      "text/plain;charset=utf-8",
    );
    setPanelMessage("Agenda rapat komite diunduh sebagai TXT dari pengajuan operasional.", "success");
  }

  const financeFilters = [
    ...createValueFilters(finance, (request) => request.status).map((filter) => ({
      ...filter,
      value: `status:${filter.value}`,
      label: `Status: ${filter.label}`,
    })),
    ...createValueFilters(finance, (request) => request.risk).map((filter) => ({
      ...filter,
      value: `risk:${filter.value}`,
      label: `Risiko: ${filter.label}`,
    })),
  ];
  const financeColumns: ManagedTableColumn<FinanceRequest>[] = [
    {
      key: "request",
      heading: "Pengajuan",
      render: (request) => (
        <div>
          <p className="font-black">Pengajuan produktif {request.id}</p>
          <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>{request.purpose}</p>
        </div>
      ),
    },
    {
      key: "amount",
      heading: "Nilai",
      render: (request) => <span className="font-mono text-xs font-black text-[#D79A2B]">{formatRupiah(request.amount)}</span>,
    },
    {
      key: "risk",
      heading: "Risiko",
      render: (request) => <span className="text-sm font-black text-[#C92A2A]">{request.risk}</span>,
    },
    {
      key: "status",
      heading: "Status",
      render: (request) => (
        <span className="rounded-[8px] bg-[#FFF3D8] px-2 py-1 text-[11px] font-black text-[#7A4E2D]">
          {request.status}
        </span>
      ),
    },
    {
      key: "reviewed",
      heading: "Direview",
      render: (request) => <span className={`text-xs font-semibold ${mutedClass}`}>{request.reviewedAt ?? "Belum review"}</span>,
    },
    {
      key: "action",
      heading: "Aksi",
      className: "text-right",
      headerClassName: "text-right",
      render: (request) => (
        <button
          type="button"
          onClick={() =>
            requestConfirm({
              title: `Siapkan paket ${request.id}?`,
              message: "Pengajuan akan ditandai siap review komite. Ini bukan persetujuan pinjaman otomatis.",
              confirmLabel: "Siapkan paket",
              onConfirm: () => reviewFinance(request),
            })
          }
          className="rounded-[10px] bg-[#C92A2A] px-3 py-2 text-xs font-extrabold text-white focus-visible:lb-focus"
        >
          Siapkan paket
        </button>
      ),
    },
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <ManagedTablePanel
        panelClass={panelClass}
        innerClass={innerClass}
        mutedClass={mutedClass}
        title="Pembiayaan aman berbasis komite"
        description="Agent hanya menyiapkan catatan risiko. Keputusan, tenor, dan persetujuan tetap di komite koperasi."
        sourceLabel="Hanya kesiapan - tidak ada persetujuan pinjaman otomatis"
        rows={finance}
        columns={financeColumns}
        rowKey={(request) => request.id}
        getSearchText={(request) => [request.id, request.purpose, request.amount, request.risk, request.status, request.reviewedAt ?? ""].join(" ")}
        filters={financeFilters}
        filterLabel="Status/risiko"
        emptyTitle="Belum ada pengajuan pembiayaan."
        emptyBody="Pengajuan produktif akan muncul setelah catatan pembiayaan tersimpan."
        pageSize={6}
        tableMinWidth={980}
      />

      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <h3 className="text-xl font-black">Checklist anti-pembiayaan asal setuju</h3>
        <div className="mt-5 space-y-3">
          {["Tujuan produktif jelas", "Kemampuan bayar diverifikasi", "Tidak ada persetujuan otomatis", "Audit trail komite tersimpan"].map((item) => (
            <div key={item} className={`flex items-center gap-3 rounded-[12px] border p-3 ${innerClass}`}>
              <CheckCircle2 size={18} strokeWidth={2.2} className="text-[#2F7D32]" aria-hidden="true" />
              <span className="text-sm font-extrabold">{item}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCommitteeAgenda}
          className="mt-5 inline-flex w-full justify-center rounded-[12px] bg-[#D79A2B] px-4 py-3 text-sm font-extrabold text-[#172027] focus-visible:lb-focus"
        >
          Buat agenda rapat
        </button>
      </article>
    </section>
  );
}

function statusBucket(status: string): "open" | "closed" | "archived" {
  const normalized = status.toLowerCase();
  if (/(archive|arsip)/i.test(normalized)) return "archived";
  if (/(closed|close|selesai|disetujui|approved|done|resolved)/i.test(normalized)) return "closed";
  return "open";
}

function WhatsAppView({
  panelClass,
  innerClass,
  mutedClass,
  recentWa,
  queue,
  reload,
  setPanelMessage,
  requestConfirm,
}: ViewClassProps & {
  recentWa: RecentWaMessage[];
  queue: QueueItem[];
  reload: () => Promise<void>;
  setPanelMessage: (message: string, tone?: ToastTone) => void;
  requestConfirm: (config: ConfirmConfig) => void;
}) {
  const [selectedIntentId, setSelectedIntentId] = useState(waIntents[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("");
  const [activeSender, setActiveSender] = useState("");
  const [filter, setFilter] = useState<"open" | "closed" | "archived">("open");
  const [waSideTab, setWaSideTab] = useState<"conversations" | "rules">("conversations");
  const [attachment, setAttachment] = useState<{ name: string; type: string; payloadType: "image" | "audio" | "document" } | null>(null);
  const [waLoading, setWaLoading] = useState<"inbound" | "outbound" | "">("");
  const [personalStatus, setPersonalStatus] = useState<WaPersonalStatus | null>(null);
  const [personalLoading, setPersonalLoading] = useState(true);
  const selectedIntent = waIntents.find((intent) => intent.id === selectedIntentId) ?? waIntents[0];
  const conversations = useMemo(() => {
    const bySender = new Map<
      string,
      {
        id: string;
        sender: string;
        latestAt: string;
        latestText: string;
        module: string;
        status: string;
        queueId?: string;
        messages: Array<{ id: string; from: "warga" | "bot"; text: string; createdAt: string }>;
      }
    >();

    recentWa.forEach((item) => {
      const matchedQueue = queue.find(
        (candidate) =>
          candidate.sender === item.sender &&
          (candidate.module === item.module || item.message.includes(candidate.summary.slice(0, 40))),
      );
      const current =
        bySender.get(item.sender) ??
        {
          id: item.sender,
          sender: item.sender,
          latestAt: item.createdAt,
          latestText: item.message,
          module: item.module,
          status: matchedQueue?.status ?? item.status,
          queueId: matchedQueue?.id,
          messages: [],
        };

      current.latestAt = item.createdAt > current.latestAt ? item.createdAt : current.latestAt;
      current.latestText = item.message;
      current.module = item.module;
      current.status = matchedQueue?.status ?? item.status;
      current.queueId = matchedQueue?.id ?? current.queueId;
      current.messages.push({ id: `${item.id}-warga`, from: "warga", text: item.message, createdAt: item.createdAt });
      if (item.botReply) {
        current.messages.push({ id: `${item.id}-bot`, from: "bot", text: item.botReply, createdAt: item.createdAt });
      }
      bySender.set(item.sender, current);
    });

    return Array.from(bySender.values())
      .map((item) => ({
        ...item,
        bucket: statusBucket(item.status),
        messages: item.messages.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      }))
      .sort((left, right) => right.latestAt.localeCompare(left.latestAt));
  }, [queue, recentWa]);
  const filteredConversations = conversations.filter((item) => item.bucket === filter);
  const activeConversation =
    filteredConversations.find((item) => item.id === activeSender) ??
    filteredConversations[0] ??
    null;
  const agentRules = [
    {
      title: "Jawab otomatis",
      body: "Harga, potensi wilayah, status integrasi, dan pertanyaan informatif dijawab langsung dengan caveat sumber.",
    },
    {
      title: "Masuk antrean 24 jam",
      body: "Pembiayaan, negosiasi final, buyer outreach, koreksi data, pickup/restock, dan bukti media menunggu operator.",
    },
    {
      title: "Tolak sebelum review",
      body: "Pengajuan tanpa nominal, tujuan, rencana bayar, volume, grade, atau lokasi ditandai belum layak diproses.",
    },
    {
      title: "Handoff agent",
      body: "Mau jual diarahkan ke cek harga dulu; jika layak baru buyer matching, stok, dan laporan aksi.",
    },
  ];

  async function loadPersonalStatus() {
    try {
      const response = await fetch("/api/wa/personal/status", { cache: "no-store" });
      if (!response.ok) return;
      setPersonalStatus((await response.json()) as WaPersonalStatus);
    } finally {
      setPersonalLoading(false);
    }
  }

  useEffect(() => {
    void loadPersonalStatus();
    const timer = window.setInterval(() => {
      void loadPersonalStatus();
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  function chooseIntent(intentId: string) {
    const intent = waIntents.find((item) => item.id === intentId);
    if (!intent) return;
    setSelectedIntentId(intent.id);
    setMessage(intent.sample);
  }

  function attachmentType(file: File): "image" | "audio" | "document" {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  }

  function chooseAttachment(file: File | null) {
    if (!file) return;
    setAttachment({ name: file.name, type: file.type || "application/octet-stream", payloadType: attachmentType(file) });
    if (!message.trim()) {
      setMessage(`Lampiran ${file.name}`);
    }
  }

  async function updateConversationStatus(status: string) {
    if (!activeConversation?.queueId) {
      setPanelMessage("Percakapan ini belum punya ID antrean untuk diubah statusnya.", "warning");
      return;
    }
    const response = await fetch(`/api/operator-queue/${encodeURIComponent(activeConversation.queueId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPanelMessage(publicSetupMessage(payload.message ?? payload.error, "Status percakapan gagal diubah."), "error");
      return;
    }
    await reload();
    setPanelMessage(`${activeConversation.queueId}: status percakapan menjadi ${status}.`, "success");
  }

  async function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed && !attachment) {
      setPanelMessage("Chat butuh isi pesan atau lampiran sebelum diproses.", "warning");
      return;
    }
    const payloadType = attachment?.payloadType ?? "text";
    const messageWithAttachment = attachment
      ? [trimmed, `Lampiran web: ${attachment.name} (${attachment.type})`].filter(Boolean).join("\n")
      : trimmed;
    setWaLoading("inbound");
    const response = await fetch("/api/wa/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageWithAttachment,
        intentId: selectedIntent?.id,
        sender: activeConversation?.sender ?? "Warga web",
        payloadType,
        caption: trimmed,
        clientMessageId: makeClientMessageId("web-chat"),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setWaLoading("");
    if (!response.ok) {
      setPanelMessage(publicSetupMessage(payload.message ?? payload.error, "Pesan gagal diproses."), "error");
      return;
    }
    const saved = payload.message as { sender: string; botReply: string; module: string; intent: string };
    await reload();
    setActiveSender(saved.sender);
    setPanelMessage(`${saved.intent}: chat masuk dashboard dan diarahkan ke ${saved.module}.`, "success");
    setMessage("");
    setAttachment(null);
  }

  async function sendOutbound() {
    const trimmed = message.trim();
    if (!trimmed || !recipient.trim()) {
      setPanelMessage("Kirim resmi membutuhkan nomor tujuan dan isi pesan.", "warning");
      return;
    }

    setWaLoading("outbound");
    const response = await fetch("/api/wa/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: recipient, message: trimmed }),
    });
    const payload = await response.json().catch(() => ({}));
    setWaLoading("");

    if (!response.ok) {
      setPanelMessage(publicSetupMessage(payload.message ?? payload.error, "Pengiriman WhatsApp live gagal."), "error");
      return;
    }

    await reload();
    setPanelMessage("Pesan outbound dikirim lewat kanal WhatsApp resmi dan dicatat di meja verifikasi.", "success");
    setMessage("");
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <h2 className="text-2xl font-black">WA Inbox</h2>
        <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
          Daftar percakapan warga dari WhatsApp bot dan input web. Auto-reply berjalan dari bridge WA; operator mengubah status dan menyiapkan follow-up dari panel ini.
        </p>
        <div className={`mt-5 rounded-[14px] border p-4 ${innerClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#D79A2B]">Kanal WA</p>
              <p className="mt-2 text-lg font-black">
                {personalLoading
                  ? "Mengecek bridge"
                  : personalStatus?.status === "connected"
                    ? "Terhubung"
                    : personalStatus?.status === "qr"
                      ? "Scan QR"
                      : personalStatus?.status === "disabled"
                        ? "Belum aktif"
                        : "Menunggu bridge"}
              </p>
            </div>
            <StatusBadge tone={personalStatus?.status === "connected" ? "success" : personalStatus?.status === "qr" ? "service" : "warning"}>
              {personalStatus?.status === "connected" ? "terhubung" : personalStatus?.status === "qr" ? "QR" : "siaga"}
            </StatusBadge>
          </div>
          {personalStatus?.status === "qr" && personalStatus.qrImage ? (
            <div className="mt-4 grid place-items-center rounded-[12px] bg-[#FFF8EA] p-3">
              <img src={personalStatus.qrImage} alt="QR pairing WhatsApp personal" className="h-56 w-56 object-contain" />
            </div>
          ) : null}
          <p className={`mt-3 text-xs font-bold leading-5 ${mutedClass}`}>
            {personalStatus?.message ?? "Kanal WA personal membaca QR dari runtime bridge bila belum tersambung."}
          </p>
          {personalStatus?.status === "connected" ? (
            <p className="mt-2 text-xs font-black text-[#2F7D32]">
              Pesan berikutnya dari WA personal akan masuk ke antrean verifikasi.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void loadPersonalStatus()}
            className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-xs font-black focus-visible:lb-focus ${innerClass}`}
          >
            <RefreshCcw size={14} strokeWidth={2.2} aria-hidden="true" />
            Cek status QR
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[
            { id: "conversations", label: "Percakapan" },
            { id: "rules", label: "Aturan agent" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setWaSideTab(item.id as "conversations" | "rules")}
              className={`rounded-[10px] border px-3 py-2 text-xs font-black focus-visible:lb-focus ${
                waSideTab === item.id ? "border-[#D79A2B] bg-[#D79A2B]/10" : innerClass
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {waSideTab === "conversations" ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["open", "closed", "archived"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-[10px] border px-3 py-2 text-xs font-black capitalize focus-visible:lb-focus ${
                filter === item ? "border-[#D79A2B] bg-[#D79A2B]/10" : innerClass
              }`}
            >
              {item}
            </button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {filteredConversations.length ? (
                filteredConversations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSender(item.id)}
                className={`w-full rounded-[12px] border p-3 text-left transition focus-visible:lb-focus ${
                  activeConversation?.id === item.id ? "border-[#D79A2B] bg-[#D79A2B]/10" : innerClass
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{item.sender}</p>
                    <p className={`mt-1 truncate text-xs font-bold ${mutedClass}`}>{item.module}</p>
                  </div>
                  <StatusBadge tone={item.bucket === "open" ? "warning" : item.bucket === "closed" ? "success" : "review"}>
                    {item.bucket}
                  </StatusBadge>
                </div>
                <p className={`mt-2 line-clamp-2 text-xs font-bold leading-5 ${mutedClass}`}>{item.latestText}</p>
              </button>
                ))
              ) : (
                <div className={`rounded-[12px] border p-4 text-sm font-bold ${innerClass}`}>
                  Belum ada percakapan {filter}.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 grid gap-2">
            {agentRules.map((rule) => (
              <div key={rule.title} className={`rounded-[12px] border p-3 ${innerClass}`}>
                <p className="text-sm font-black">{rule.title}</p>
                <p className={`mt-1 text-xs font-bold leading-5 ${mutedClass}`}>{rule.body}</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-black">{activeConversation?.sender ?? "Percakapan baru"}</h3>
            <p className={`mt-1 text-sm font-semibold ${mutedClass}`}>
              {activeConversation?.queueId ? `Antrean ${activeConversation.queueId}` : "Input web baru"} - {activeConversation?.module ?? selectedIntent?.module}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void updateConversationStatus("Open")} className={`rounded-[10px] border px-3 py-2 text-xs font-black ${innerClass}`}>
              Open
            </button>
            <button type="button" onClick={() => void updateConversationStatus("Closed")} className={`rounded-[10px] border px-3 py-2 text-xs font-black ${innerClass}`}>
              Closed
            </button>
            <button type="button" onClick={() => void updateConversationStatus("Archived")} className={`rounded-[10px] border px-3 py-2 text-xs font-black ${innerClass}`}>
              Archived
            </button>
          </div>
        </div>
        <div className={`mt-5 h-[390px] overflow-y-auto rounded-[16px] border p-4 ${innerClass}`}>
          <div className="space-y-3">
            {activeConversation?.messages.length ? (
              activeConversation.messages.map((chat) => (
                <div
                  key={chat.id}
                  className={`max-w-[84%] rounded-[14px] px-4 py-3 text-sm font-semibold leading-6 ${
                    chat.from === "warga"
                      ? "mr-auto bg-[#FFF3D8] text-[#172027]"
                      : "ml-auto bg-[#2F7D32] text-white"
                  }`}
                >
                  {chat.text}
                </div>
              ))
            ) : (
              <div className={`rounded-[14px] border p-4 text-sm font-bold ${innerClass}`}>
                Mulai percakapan dari web atau tunggu pesan masuk dari WhatsApp.
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {waIntents.slice(0, 7).map((intent) => (
            <button
              key={intent.id}
              type="button"
              onClick={() => chooseIntent(intent.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-black focus-visible:lb-focus ${
                selectedIntentId === intent.id ? "border-[#D79A2B] bg-[#D79A2B]/10" : innerClass
              }`}
            >
              {intent.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label htmlFor="wa-message" className="sr-only">Pesan WhatsApp warga</label>
          <textarea
            id="wa-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            className={`min-h-24 rounded-[14px] border px-4 py-3 text-sm font-semibold outline-none focus-visible:lb-focus ${innerClass}`}
            placeholder="Tulis chat atau draft operator. Contoh: stok beras habis 20 karung, carikan pembeli kopi 1 ton."
          />
          <div className="grid gap-2">
            <label htmlFor="wa-recipient" className="sr-only">Nomor tujuan WhatsApp</label>
            <input
              id="wa-recipient"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              className={`rounded-[12px] border px-3 py-2.5 text-sm font-semibold outline-none focus-visible:lb-focus ${innerClass}`}
              placeholder="62812..."
            />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Gambar", accept: "image/*" },
                { label: "Voice", accept: "audio/*" },
                { label: "File", accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*,audio/*" },
              ].map((item) => (
                <label key={item.label} className={`cursor-pointer rounded-[10px] border px-2 py-2 text-center text-[11px] font-black ${innerClass}`}>
                  {item.label}
                  <input type="file" accept={item.accept} className="sr-only" onChange={(event) => chooseAttachment(event.target.files?.[0] ?? null)} />
                </label>
              ))}
            </div>
            {attachment ? (
              <button type="button" onClick={() => setAttachment(null)} className={`rounded-[10px] border px-3 py-2 text-left text-xs font-bold ${innerClass}`}>
                Lampiran: {attachment.name} - hapus
              </button>
            ) : null}
            <button
              type="button"
              onClick={sendMessage}
              disabled={waLoading !== ""}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60 focus-visible:lb-focus"
            >
              {waLoading === "inbound" ? (
                <Loader2 size={17} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
              ) : (
                <Database size={17} strokeWidth={2.2} aria-hidden="true" />
              )}
              Simpan chat
            </button>
            <button
              type="button"
              onClick={() =>
                requestConfirm({
                  title: "Kirim pesan WhatsApp?",
                  message: "Pesan akan dikirim melalui kanal WhatsApp resmi bila konfigurasi sudah aktif. Auto-reply WA personal tetap berjalan dari bridge bot.",
                  confirmLabel: "Kirim resmi",
                  onConfirm: sendOutbound,
                })
              }
              disabled={waLoading !== ""}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#2F7D32] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60 focus-visible:lb-focus"
            >
              {waLoading === "outbound" ? (
                <Loader2 size={17} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={17} strokeWidth={2.2} aria-hidden="true" />
              )}
              Kirim resmi
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}

function AgentsView({
  panelClass,
  innerClass,
  mutedClass,
  queue,
  recentAgentRuns,
  setPanelMessage,
}: ViewClassProps & {
  queue: QueueItem[];
  recentAgentRuns: RecentAgentRun[];
  setPanelMessage: (message: string, tone?: ToastTone) => void;
}) {
  const [activeAgent, setActiveAgent] = useState(aiAgents[0]?.name ?? "");
  const [recordId, setRecordId] = useState(queue[0]?.id ?? "");
  const [loadingAgent, setLoadingAgent] = useState("");
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [error, setError] = useState("");
  const selectedAgent = aiAgents.find((agent) => agent.name === activeAgent) ?? aiAgents[0];
  const selectedCase = queue.find((item) => item.id === recordId) ?? null;

  async function runAgent(agentName = activeAgent) {
    if (!recordId) {
      setError("Pilih case dari antrean verifikasi dulu.");
      return;
    }
    setLoadingAgent(agentName);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName, recordId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(publicSetupMessage(payload.message ?? payload.error, `Agent API gagal (${response.status})`));
      }
      const resultPayload = payload as AgentRunResult;
      setResult(resultPayload);
      setActiveAgent(resultPayload.agent);
      setPanelMessage(`${resultPayload.agent} selesai untuk ${resultPayload.recordId}: ${resultPayload.output}.`, "success");
    } catch (agentError) {
      const message = agentError instanceof Error ? agentError.message : "Agent API tidak merespons.";
      setError(message);
      setPanelMessage(message, "error");
    } finally {
      setLoadingAgent("");
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <h2 className="text-2xl font-black">Agent Center</h2>
        <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
          Pilih case dari antrean verifikasi, lalu jalankan agent. Output menjadi rekomendasi review, bukan keputusan otomatis.
        </p>
        <label htmlFor="agent-record" className={`mt-5 block text-sm font-black ${mutedClass}`}>
          Case antrean
        </label>
        <select
          id="agent-record"
          value={recordId}
          onChange={(event) => setRecordId(event.target.value)}
          className={`mt-2 w-full rounded-[12px] border px-3 py-2.5 text-sm font-extrabold outline-none focus-visible:lb-focus ${innerClass}`}
        >
          {queue.length ? (
            queue.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} - {item.module}
              </option>
            ))
          ) : (
            <option value="">Belum ada case antrean</option>
          )}
        </select>
        {selectedCase ? (
          <div className={`mt-3 rounded-[12px] border p-3 ${innerClass}`}>
            <p className="text-xs font-black text-[#D79A2B]">Ringkasan case</p>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>{selectedCase.summary}</p>
          </div>
        ) : null}
        <div className="mt-5 space-y-2">
          {aiAgents.map((agent) => (
            <button
              key={agent.name}
              type="button"
              onClick={() => setActiveAgent(agent.name)}
              className={`w-full rounded-[12px] border p-3 text-left transition focus-visible:lb-focus ${
                activeAgent === agent.name ? "border-[#D79A2B] bg-[#D79A2B]/10" : innerClass
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black">{agent.name}</span>
                <span className="rounded-[8px] bg-[#E7F5E8] px-2 py-1 text-[10px] font-black text-[#236327]">
                  {agent.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </article>

      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black text-[#D79A2B]">Agent aktif</p>
            <h3 className="mt-2 text-3xl font-black">{selectedAgent?.name}</h3>
            <p className={`mt-2 max-w-3xl text-sm font-semibold leading-6 ${mutedClass}`}>{selectedAgent?.job}</p>
          </div>
          <button
            type="button"
            onClick={() => runAgent(selectedAgent?.name)}
            disabled={Boolean(loadingAgent) || !recordId}
            data-testid="dashboard-agent-run"
            className="inline-flex min-w-40 items-center justify-center gap-2 rounded-[12px] bg-[#1D5D8F] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:lb-focus"
          >
            {loadingAgent ? (
              <Loader2 size={17} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
            ) : (
              <Play size={17} strokeWidth={2.2} aria-hidden="true" />
            )}
            {loadingAgent ? "Menjalankan" : "Jalankan case"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {selectedAgent?.checks.map((check) => (
            <div key={check} className={`rounded-[12px] border p-3 ${innerClass}`}>
              <p className="text-xs font-black text-[#D79A2B]">Check</p>
              <p className="mt-2 text-sm font-extrabold">{check}</p>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-5 rounded-[14px] border border-[#C92A2A] bg-[#FFE3E3] p-4 text-sm font-bold text-[#9B1C1C]">
            {error}
          </div>
        ) : null}

        <div className={`mt-5 rounded-[16px] border p-5 ${innerClass}`}>
          {result ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-black text-[#2F7D32]">Output</p>
                <p className="mt-2 text-2xl font-black">{result.output}</p>
              </div>
              <p className={`text-sm font-semibold leading-6 ${mutedClass}`}>{result.explanation}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[12px] bg-black/5 p-3 text-sm font-bold">
                  Status: {result.status}
                </div>
                <div className="rounded-[12px] bg-black/5 p-3 text-sm font-bold">
                  Record: {result.recordId}
                </div>
              </div>
              <p className="text-sm font-black text-[#D79A2B]">{result.nextAction}</p>
            </div>
          ) : (
            <p className={`text-sm font-semibold leading-6 ${mutedClass}`}>
              Belum ada run di sesi ini. Pilih case antrean dan tekan Jalankan case untuk melihat rekomendasi review.
            </p>
          )}
        </div>
        {recentAgentRuns.length ? (
          <div className="mt-5">
            <p className="text-sm font-black">Riwayat agent terbaru</p>
            <div className="mt-3 grid gap-2">
              {recentAgentRuns.slice(0, 4).map((run) => (
                <div key={run.id} className={`rounded-[12px] border p-3 text-sm ${innerClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{run.agentName}</p>
                    <span className="font-mono text-[11px] font-black text-[#D79A2B]">{run.recordId}</span>
                  </div>
                  <p className={`mt-2 text-xs font-bold leading-5 ${mutedClass}`}>{run.output}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function ReportsView({
  panelClass,
  innerClass,
  mutedClass,
  reports,
  reportPeriod,
  reload,
  setPanelMessage,
  requestConfirm,
}: ViewClassProps & {
  reports: ReportSection[];
  reportPeriod: ReportPeriod | null;
  reload: () => Promise<void>;
  setPanelMessage: (message: string, tone?: ToastTone) => void;
  requestConfirm: (config: ConfirmConfig) => void;
}) {
  const locked = Boolean(reportPeriod?.locked);
  const includedCount = reports.filter((section) => section.included).length;

  async function toggleSection(section: ReportSection) {
    if (locked) {
      setPanelMessage("Laporan sudah dikunci. Buka lock periode dulu untuk mengubah section.", "warning");
      return;
    }
    const response = await fetch(`/api/report-sections/${encodeURIComponent(section.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ included: !section.included }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPanelMessage(publicSetupMessage(payload.message ?? payload.error, `${section.title}: gagal diperbarui.`), "error");
      return;
    }
    await reload();
    setPanelMessage(`${section.title}: status laporan tersimpan di catatan operasional.`, "success");
  }

  async function toggleLock() {
    const response = await fetch("/api/report-periods/current/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: !locked }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPanelMessage(publicSetupMessage(payload.message ?? payload.error, "Lock laporan gagal diperbarui."), "error");
      return;
    }
    await reload();
    setPanelMessage(!locked ? "Laporan dikunci untuk periode ini." : "Lock laporan dibuka kembali.", "success");
  }

  function exportReportCsv() {
    const rows = [
      ["section", "status"],
      ...reports.map((section) => [section.title, section.included ? "included" : "excluded"]),
    ];
    downloadTextFile("lumbung-bersama-laporan-ringkas.csv", toCsv(rows), "text/csv;charset=utf-8");
    setPanelMessage("CSV laporan ringkas dibuat dari section yang dipilih.", "success");
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black">Laporan operasional</h2>
            <p className={`mt-2 max-w-3xl text-sm font-semibold leading-6 ${mutedClass}`}>
              Pilih section, lock periode, lalu export. Status laporan tersimpan di catatan operasional.
            </p>
          </div>
          <StatusBadge tone={locked ? "success" : "warning"}>{locked ? "Terkunci" : "Draft"}</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {reports.map((section) => {
            const active = section.included;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => toggleSection(section)}
                className={`rounded-[14px] border p-4 text-left transition focus-visible:lb-focus ${
                  active ? "border-[#2F7D32] bg-[#E7F5E8] text-[#172027]" : innerClass
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileCheck2 size={18} strokeWidth={2.2} className={active ? "text-[#2F7D32]" : mutedClass} aria-hidden="true" />
                  <p className="font-black">{section.title}</p>
                </div>
                <p className={`mt-2 text-sm font-semibold leading-6 ${active ? "text-[#53606A]" : mutedClass}`}>
                  {active ? "Masuk paket laporan" : "Dikeluarkan dari paket sementara"}
                </p>
              </button>
            );
          })}
        </div>
      </article>

      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <h3 className="text-xl font-black">Paket siap rapat</h3>
        <div className={`mt-5 rounded-[16px] border p-5 ${innerClass}`}>
          <p className="text-sm font-black text-[#D79A2B]">Section aktif</p>
          <p className="mt-2 text-5xl font-black">{includedCount}</p>
          <p className={`mt-2 text-sm font-semibold ${mutedClass}`}>dari {reports.length} section tersedia</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              requestConfirm({
                title: locked ? "Buka lock laporan?" : "Lock periode laporan?",
                message: locked
                  ? "Periode akan kembali bisa diubah. Pastikan perubahan masih sesuai rapat pengurus."
                  : "Paket laporan akan dikunci untuk rapat. Perubahan section perlu membuka lock terlebih dahulu.",
                confirmLabel: locked ? "Buka lock" : "Lock periode",
                onConfirm: toggleLock,
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-4 py-3 text-sm font-extrabold text-white focus-visible:lb-focus"
          >
            <Lock size={16} strokeWidth={2.2} aria-hidden="true" />
            {locked ? "Buka lock" : "Lock periode"}
          </button>
          <button
            type="button"
            onClick={exportReportCsv}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-current/15 px-4 py-3 text-sm font-extrabold focus-visible:lb-focus"
          >
            <Download size={16} strokeWidth={2.2} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </article>
    </section>
  );
}

function IntegrationView({
  panelClass,
  innerClass,
  mutedClass,
  setPanelMessage,
}: ViewClassProps & { setPanelMessage: (message: string, tone?: ToastTone) => void }) {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function checkHealth() {
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/health");
      if (!response.ok) throw new Error(`Cek koneksi gagal (${response.status})`);
      const payload = (await response.json()) as HealthPayload;
      setHealth(payload);
      const configured = payload.integrations?.filter((item) => item.configured).length ?? 0;
      const total = payload.integrations?.length ?? 0;
      setPanelMessage(`Cek koneksi selesai: ${configured}/${total} integrasi aktif.`, "success");
    } catch (healthError) {
      const message = healthError instanceof Error ? healthError.message : "Cek koneksi tidak merespons.";
      setError(message);
      setPanelMessage(message, "error");
    } finally {
      setChecking(false);
    }
  }
  const healthModeLabel = health?.mode ? publicReadinessLabel(health.mode) : "Belum dicek";

  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <h2 className="text-2xl font-black">Kesiapan integrasi</h2>
        <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
          Semua koneksi eksternal harus diberi status jelas. Jika konfigurasi belum aktif, dashboard tidak mengklaim koneksi live.
        </p>
        <button
          type="button"
          onClick={checkHealth}
          disabled={checking}
          data-testid="dashboard-health-check"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#1D5D8F] px-4 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:lb-focus"
        >
          {checking ? (
            <Loader2 size={17} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCcw size={17} strokeWidth={2.2} aria-hidden="true" />
          )}
          Cek koneksi
        </button>
        <div className={`mt-5 rounded-[14px] border p-4 text-sm font-semibold leading-6 ${innerClass}`}>
          <p className="font-black">Panduan aktivasi produksi</p>
          <p className={`mt-2 ${mutedClass}`}>
            Saat digunakan, tampilkan status integrasi di sini. Detail akses dan konfigurasi server dikelola operator teknis di luar halaman operasional.
          </p>
        </div>
        {error ? (
          <div className="mt-5 rounded-[14px] border border-[#C92A2A] bg-[#FFE3E3] p-4 text-sm font-bold text-[#9B1C1C]">
            {error}
          </div>
        ) : null}
      </article>

      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-black">Matrix koneksi</h3>
            <p className={`mt-1 text-sm font-semibold ${mutedClass}`}>
              {health?.checkedAt ? `Terakhir dicek: ${new Date(health.checkedAt).toLocaleString("id-ID")}` : "Belum dicek dari dashboard."}
            </p>
          </div>
          <StatusBadge tone={health?.mode === "operator-ready" ? "success" : "warning"}>
            {healthModeLabel}
          </StatusBadge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(health?.integrations ?? integrationChecks.map((item) => ({
            name: item.name,
            required: item.env.split(",").map((envName) => envName.trim()),
            configured: false,
            status: item.status,
            fallback: item.fallback,
          }))).map((item) => (
            <article key={item.name} className={`rounded-[14px] border p-4 ${innerClass}`}>
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-black">{item.name}</h4>
                <span className={`rounded-[8px] px-2 py-1 text-[11px] font-black ${
                  item.configured ? "bg-[#E7F5E8] text-[#236327]" : "bg-[#FFF3D8] text-[#7A4E2D]"
                }`}>
                  {item.configured ? "aktif" : publicStatusLabel(item.status)}
                </span>
              </div>
              <p className={`mt-3 text-xs font-bold leading-5 ${mutedClass}`}>
                {formatInteger(item.required.length)} prasyarat aktivasi diperlukan
              </p>
              <p className={`mt-3 text-sm font-semibold leading-6 ${mutedClass}`}>{item.fallback}</p>
            </article>
          ))}
        </div>
        {health?.whatsapp?.setup ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className={`rounded-[14px] border p-4 ${innerClass}`}>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#D79A2B]">WhatsApp resmi</p>
              <p className="mt-2 text-xl font-black">{publicStatusLabel(health.whatsapp.setup.cloudApi?.send)}</p>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
                {health.whatsapp.setup.cloudApi?.message ?? "Kanal resmi perlu dicek dari server."}
              </p>
            </article>
            <article className={`rounded-[14px] border p-4 ${innerClass}`}>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#D79A2B]">QR personal testing</p>
              <p className="mt-2 text-xl font-black">{publicStatusLabel(health.whatsapp.setup.personalBridge?.status)}</p>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
                {health.whatsapp.setup.personalBridge?.message ?? "Bridge personal perlu dijalankan di terminal untuk menampilkan QR."}
              </p>
              <p className={`mt-2 text-xs font-bold ${mutedClass}`}>
                PDF: {health.whatsapp.setup.personalBridge?.capabilities?.pdfTextExtraction ? "siap" : "perlu cek"}; OCR gambar:{" "}
                {health.whatsapp.setup.personalBridge?.capabilities?.imageOcr ? "aktif" : "opsional"}
              </p>
            </article>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function ModuleView({
  view,
  panelClass,
  innerClass,
  mutedClass,
  setPanelMessage,
}: ViewClassProps & { view: string; setPanelMessage: (message: string, tone?: ToastTone) => void }) {
  const detail = featureDetails[view];
  const featureModule = featureModules.find((item) => item.slug === view);
  const [workingAction, setWorkingAction] = useState("");

  if (!detail || !featureModule) {
    return null;
  }

  const activeDetail = detail;
  const activeFeatureModule = featureModule;

  const moduleAgent =
    aiAgents.find((agent) =>
      activeDetail.agentChecks.some((check) => agent.checks.join(" ").includes(check)),
    ) ?? aiAgents[0];

  async function sendModuleWa() {
    setWorkingAction("wa");
    try {
      const response = await fetch("/api/wa/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: activeFeatureModule.waCommand,
          sender: "Operator",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(publicSetupMessage(payload.message ?? payload.error, "WA API gagal."));
      }
      const saved = payload.message as { id: string; module: string; status: string };
      setPanelMessage(`${activeDetail.title}: pesan WA tersimpan sebagai ${saved.id} untuk modul ${saved.module}. Status: ${saved.status}.`, "success");
    } catch (error) {
      setPanelMessage(error instanceof Error ? error.message : `${activeDetail.title}: WA API tidak merespons.`, "error");
    } finally {
      setWorkingAction("");
    }
  }

  async function runModuleAgent() {
    setWorkingAction("agent");
    try {
      const draftResponse = await fetch("/api/wa/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: activeFeatureModule.waCommand,
          sender: "Operator",
        }),
      });
      const draftPayload = await draftResponse.json().catch(() => ({}));
      if (!draftResponse.ok) {
        throw new Error(publicSetupMessage(draftPayload.message ?? draftPayload.error, "Case operasional belum berhasil dibuat."));
      }
      const queueId = draftPayload.agent?.lbQueueId ?? draftPayload.queue?.id;
      if (!queueId) {
        throw new Error("Case operasional belum memiliki ID antrean untuk agent.");
      }
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: moduleAgent.name,
          recordId: queueId,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(publicSetupMessage(payload.message ?? payload.error, "Agent API gagal."));
      }
      const run = payload as AgentRunResult;
      setPanelMessage(`${activeDetail.title}: ${run.agent} selesai dan tersimpan untuk record ${run.recordId}.`, "success");
    } catch (error) {
      setPanelMessage(error instanceof Error ? error.message : `${activeDetail.title}: Agent API tidak merespons.`, "error");
    } finally {
      setWorkingAction("");
    }
  }

  const sections = [
    ["WA flows", activeDetail.waFlows],
    ["Agent checks", activeDetail.agentChecks],
    ["Operator actions", activeDetail.operatorActions],
    ["Output", activeDetail.operationalOutputs],
  ] as const;

  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <article className={`rounded-[16px] border p-5 ${panelClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#D79A2B]">{activeFeatureModule.status}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Ruang kerja {activeDetail.title}</h2>
          </div>
          <StatusBadge tone="service">Workspace</StatusBadge>
        </div>
        <p className={`mt-4 text-sm font-semibold leading-7 ${mutedClass}`}>{activeDetail.intro}</p>
        <div className={`mt-5 rounded-[14px] border p-4 ${innerClass}`}>
          <div className="flex items-center gap-2">
            <MessageCircle size={18} strokeWidth={2.2} className="text-[#D79A2B]" aria-hidden="true" />
            <p className="font-black">Input operasional</p>
          </div>
          <p className="mt-3 text-xl font-black">{activeFeatureModule.waCommand}</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={sendModuleWa}
            disabled={Boolean(workingAction)}
            className="inline-flex justify-center rounded-[12px] bg-[#C92A2A] px-5 py-3 text-sm font-extrabold text-[#FFF8EA] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:lb-focus"
          >
            {workingAction === "wa" ? "Menyimpan WA" : "Kirim ke WA Center"}
          </button>
          <button
            type="button"
            onClick={runModuleAgent}
            disabled={Boolean(workingAction)}
            className="inline-flex justify-center rounded-[12px] border border-current/15 px-5 py-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60 focus-visible:lb-focus"
          >
            {workingAction === "agent" ? "Menjalankan" : `Jalankan ${moduleAgent.name}`}
          </button>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([title, items]) => (
          <article key={title} className={`rounded-[16px] border p-5 ${panelClass}`}>
            <h3 className="text-xl font-black">{title}</h3>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item}
                  className={`rounded-[10px] border px-4 py-3 text-sm font-extrabold ${innerClass}`}
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileCheck2, Lock, RefreshCcw } from "lucide-react";

type DashboardReportPayload = {
  source: "postgres";
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
  source: "static" | "postgres";
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
  return item.sourceLabel ?? "Buyer archetype; bukan named buyer atau komitmen permintaan live.";
}

const reportDemoFlowSteps = [
  ["Dashboard", "Evidence, role, queue, and manager command center."],
  ["Peta", "Wilayah/komoditas with source caveat."],
  ["Score", "Explainable opportunity score and data-quality caveat."],
  ["Buyer", "Buyer archetype, market check, and approval workflow."],
  ["Laporan", "CSV/report artifact for cooperative meeting."],
] as const;

const reportRoleRows = [
  ["Pengurus", "/dashboard, /laporan", "Final approval for outreach, finance, and locked report."],
  ["Manager Koperasi", "/dashboard, /peta-unggulan, /laporan", "Monitors sales, stock, delivery, buyer, finance, and alerts."],
  ["Staff/Admin Gudang", "Stock readiness", "Validates product, unit, inventory, location, and evidence."],
  ["Staff/Admin Logistik", "Fulfillment", "Schedules pickup, courier assignment, delivery status, and proof."],
  ["Kasir", "POS signal", "Aggregate transaction signal only; no customer detail."],
  ["Kurir", "Delivery", "Marks delivery stages without public recipient data."],
  ["Juri/Viewer demo", "Read-only demo routes", "Sample/aggregate/no PII view."],
] as const;

const reportApprovalStages = [
  ["Recommended", "AI/rules produce source-grounded recommendation."],
  ["Needs verification", "Operator checks stock, document, price, buyer requirement, and caveat."],
  ["Approved", "Manager/pengurus approves next action; AI never approves automatically."],
] as const;

const reportSimkopdesChecklist = [
  "Produk punya satuan, kategori, potensi desa, supplier/source, and status not draft.",
  "Inventory readiness checks negative stock, generic labels, grade, packaging, and documentation.",
  "POS signal is aggregate demand/cashflow proxy, not customer or receipt detail.",
  "Logistics readiness covers warehouse location, courier, delivery status, and proof-of-delivery governance.",
  "Member savings alignment covers Simpanan Pokok, Wajib, Sukarela, billing period, payment proof, withdrawal rules, and aggregate liquidity signal.",
] as const;

const reportAiGuardrails = [
  "AI Business Analyst is aggregate early warning, not formal audit.",
  "Borrower Risk uses risk flag and missing evidence, never automatic rejection or fraud labeling.",
  "Market negotiation needs official/curated price source or operator input before offer/floor/target price.",
  "Outreach script stays editable and requires operator/pengurus approval before buyer contact.",
] as const;

export function ReportClient() {
  const [dashboardData, setDashboardData] = useState<DashboardReportPayload | null>(null);
  const [hackathonSummary, setHackathonSummary] = useState<HackathonSummaryPayload | null>(null);
  const [hackathonDataQuality, setHackathonDataQuality] = useState<HackathonDataQualityPayload | null>(null);
  const [hackathonOpportunityScores, setHackathonOpportunityScores] = useState<HackathonOpportunityPayload | null>(null);
  const [hackathonBuyerMatching, setHackathonBuyerMatching] = useState<HackathonBuyerPayload | null>(null);
  const [financingReadiness, setFinancingReadiness] = useState<HackathonFinancingPayload | null>(null);
  const [sourceRegistry, setSourceRegistry] = useState<OpenDataRegistryPayload | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [hackathonStatus, setHackathonStatus] = useState<LoadStatus>("loading");
  const [registryStatus, setRegistryStatus] = useState<LoadStatus>("loading");
  const [message, setMessage] = useState("Memuat laporan aksi dari API.");
  const [locked, setLocked] = useState(false);
  const [working, setWorking] = useState("");

  async function loadReport() {
    setStatus((current) => (current === "ready" ? "ready" : "loading"));
    setHackathonStatus((current) => (current === "ready" ? "ready" : "loading"));
    setRegistryStatus((current) => (current === "ready" ? "ready" : "loading"));
    setMessage("Memuat laporan aksi dari API.");

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
        setMessage(dashboardPayload?.message ?? dashboardPayload?.error ?? "Data operasional belum tersedia.");
      } else {
        const payload = dashboardPayload as DashboardReportPayload;
        setDashboardData(payload);
        setLocked(Boolean(payload.reportPeriod?.locked));
        setStatus("ready");
        setMessage("Laporan aksi memakai data operasional Postgres.");
      }
    } catch (error) {
      setDashboardData(null);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Gagal memuat dashboard API.");
    }

    try {
      const [
        sharedResponse,
        dataQualityResponse,
        opportunityResponse,
        buyerResponse,
        financingResponse,
      ] = await Promise.all([
        fetch("/api/hackathon/mvp-summary", { cache: "no-store" }),
        fetch("/api/hackathon/data-quality", { cache: "no-store" }),
        fetch("/api/hackathon/opportunity-scores", { cache: "no-store" }),
        fetch("/api/hackathon/buyer-matching", { cache: "no-store" }),
        fetch("/api/hackathon/financing-readiness", { cache: "no-store" }),
      ]);
      const [sharedPayload, dataQualityPayload, opportunityPayload, buyerPayload, financingPayload] = await Promise.all([
        sharedResponse.json().catch(() => null),
        dataQualityResponse.json().catch(() => null),
        opportunityResponse.json().catch(() => null),
        buyerResponse.json().catch(() => null),
        financingResponse.json().catch(() => null),
      ]);
      const responses = [sharedResponse, dataQualityResponse, opportunityResponse, buyerResponse, financingResponse];
      if (responses.some((response) => response.status === 401)) return;

      setHackathonSummary(sharedResponse.ok ? (sharedPayload as HackathonSummaryPayload) : null);
      setHackathonDataQuality(dataQualityResponse.ok ? (dataQualityPayload as HackathonDataQualityPayload) : null);
      setHackathonOpportunityScores(opportunityResponse.ok ? (opportunityPayload as HackathonOpportunityPayload) : null);
      setHackathonBuyerMatching(buyerResponse.ok ? (buyerPayload as HackathonBuyerPayload) : null);
      setFinancingReadiness(financingResponse.ok ? (financingPayload as HackathonFinancingPayload) : null);
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
  const sourceLabels = sourceRegistry?.sourceLabels ?? [];
  const p0Roadmap = sourceRegistry?.p0Roadmap ?? [];
  const registryCoverage = sourceRegistry?.coverage.administrativeAreasImported ?? {};
  const importedAreaTotal = Object.values(registryCoverage).reduce((total, value) => total + Number(value ?? 0), 0);
  const implementedConnectors = registrySources.filter((item) => item.integrationClaim === "implemented").length;
  const envGatedConnectors = registrySources.filter((item) => item.integrationClaim === "env-gated").length;
  const discoveryOrPlannedSources = registrySources.filter((item) =>
    ["source-discovery", "connector-planned"].includes(item.integrationClaim),
  ).length;
  const sourceRegistrySummary =
    registryStatus === "ready"
      ? `${formatInteger(registrySources.length)} sumber; ${formatInteger(sourceLabels.length)} label; ${formatInteger(p0Roadmap.length)} roadmap P0`
      : registryStatus === "loading"
        ? "Memuat registry sumber"
        : "Registry sumber belum tersedia";
  const buyerNeedsReview = buyers.filter((item) => !item.status.toLowerCase().includes("setuju")).length;
  const approvalSummary = [
    ["Recommended", buyers.length + buyerRequirements.length],
    ["Needs verification", pendingQueue.length + buyerNeedsReview + criticalStocks.length],
    ["Approved", approvedBuyers.length],
  ] as const;
  const managerCommandRows = [
    ["Sales/POS signal", topHackathonOpportunity ? formatInteger(topHackathonOpportunity.transactions) : "Env gated", "Aggregate transaction signal only; no customer detail."],
    ["Inventory readiness", `${formatInteger(criticalStocks.length)} gaps`, "Validate stock, grade, unit, packaging, and documentation."],
    ["Warehouse/logistics", `${formatInteger(stockLedger.length)} ledger rows`, "Check pickup, courier, storage location, and proof-of-delivery stage."],
    ["Buyer outreach", `${formatInteger(buyerNeedsReview)} need review`, "Approve script only after price, grade, volume, and packaging are checked."],
    ["Financing readiness", financingReadiness ? `${formatInteger(financingReadiness.totals.verifiedRequests)} verified` : "Env gated", "Readiness only, not loan approval."],
    ["Data quality", `${formatInteger(qualityIssueTotal || hackathonSummary?.dataQualityFlags.length || 0)} flags`, "Bad data becomes needs verification."],
  ] as const;
  const simkopdesChecklistRows = reportSimkopdesChecklist.map((item, index) => {
    const status =
      index === 0
        ? stocks.length > 0
          ? `${formatInteger(stocks.length)} stock rows`
          : "Checklist"
        : index === 1
          ? criticalStocks.length > 0
            ? `${formatInteger(criticalStocks.length)} gaps`
            : "No critical gap"
          : index === 2
            ? topHackathonOpportunity
              ? `${formatInteger(topHackathonOpportunity.transactions)} transactions`
              : "Env gated"
            : index === 3
              ? stockLedger.length > 0
                ? `${formatInteger(stockLedger.length)} ledger`
                : "Workflow"
              : "Aggregate/roadmap";
    return { item, status };
  });
  const businessAnalystRows = [
    [
      "Health score koperasi",
      financingReadiness
        ? financingReadiness.totals.verificationRate && financingReadiness.totals.verificationRate > 0.25
          ? "Sehat terbatas"
          : "Perlu perhatian"
        : "Needs verification",
      financingReadiness
        ? `${formatInteger(financingReadiness.totals.totalRequests)} aggregate requests; ${formatInteger(financingReadiness.totals.verifiedRequests)} verified.`
        : "Shared financing endpoint belum tersedia.",
    ],
    ["Liquidity/cashflow proxy", topHackathonOpportunity ? `${formatInteger(topHackathonOpportunity.transactions)} POS signals` : "Source required", "POS sample helps demand reading, not audited finance."],
    ["Savings aggregate", `${formatInteger(reportSimkopdesChecklist.length)} mapped checklist items`, "Member savings detail is not exposed in the public/demo report."],
  ] as const;
  const borrowerRiskRows = [
    ["Duplicate/inconsistent request", finance.length > 1 ? "Check queue" : "Monitor", "Use risk flag and missing evidence, never fraud labels."],
    ["Amount vs business scale", criticalStocks.length > 0 ? "Needs verification" : "Ready for review", "Compare purpose with inventory, stock, and repayment plan."],
    ["Document completeness", pendingQueue.length > 0 ? "Missing evidence possible" : "Queue clear", "Committee review is required before status change."],
  ] as const;
  const negotiationRows = [
    ["Market reference price", "Source required", "Use official/curated source or operator input; do not invent live prices."],
    ["Offer/floor/target price", buyerRequirements.length > 0 ? "Draft after requirement review" : "Waiting requirement", "Needs grade, packaging, logistics, and margin minimum."],
    ["Outreach script", buyers.length > 0 ? "Human approval required" : "No buyer archetype", "Editable script, not automatic buyer contact."],
  ] as const;

  const executiveRows = [
    ["Koperasi", dashboardData?.cooperative?.name ?? "Belum tersedia"],
    ["Lokasi", dashboardData?.cooperative ? `${dashboardData.cooperative.village}, ${dashboardData.cooperative.regency}` : "Belum tersedia"],
    ["Source operasional", status === "ready" ? "Postgres operational" : "Setup required"],
    ["Shared DB evidence", hackathonStatus === "ready" ? "Shared DB read-only" : "Env gated"],
    ["Headline evidence", headlineMetrics.length ? `${formatInteger(headlineMetrics.length)} aggregate metrics` : "Env gated"],
    ["Opportunity score endpoint", directOpportunityAreas.length ? `${formatInteger(directOpportunityAreas.length)} ranked areas` : "Env gated"],
    ["Buyer matching lite endpoint", directBuyerMatches.length ? `${formatInteger(directBuyerMatches.length)} archetype matches` : "Env gated"],
    ["Data-quality endpoint", qualityChecks.length ? `${formatInteger(qualityChecks.length)} table checks` : "Env gated"],
    ["External source registry", sourceRegistrySummary],
    ["Guided demo flow", reportDemoFlowSteps.map(([label]) => label).join(" -> ")],
    ["Role/access alignment", `${formatInteger(reportRoleRows.length)} SIMKOPDES roles mapped`],
    ["Manager command actions", `${formatInteger(managerCommandRows.length)} action rows`],
    ["SIMKOPDES readiness checklist", `${formatInteger(simkopdesChecklistRows.length)} checklist rows`],
    ["Operator approval workflow", approvalSummary.map(([label, value]) => `${label}: ${formatInteger(value)}`).join("; ")],
    ["AI business analyst", String(businessAnalystRows[0]?.[1] ?? "Needs verification")],
    ["Borrower risk guardrail", String(borrowerRiskRows[0]?.[1] ?? "Monitor")],
    ["Market negotiation", String(negotiationRows[0]?.[1] ?? "Source required")],
    ["Draft perlu verifikasi", formatInteger(pendingQueue.length)],
    ["Stok/readiness gap", formatInteger(criticalStocks.length)],
    ["Buyer readiness approved", formatInteger(approvedBuyers.length)],
    ["Buyer requirement rows", formatInteger(buyerRequirements.length)],
    ["Financing shared DB requests", financingReadiness ? formatInteger(financingReadiness.totals.totalRequests) : "Env gated"],
    ["Financing verified aggregate", financingReadiness ? formatInteger(financingReadiness.totals.verifiedRequests) : "Env gated"],
    ["Stock ledger rows", formatInteger(stockLedger.length)],
    ["Media evidence rows", formatInteger(mediaEvidence.length)],
    ["Team table prefix", dashboardData?.teamTablePrefix ?? "anak_sarengklek_"],
    ["Prefixed DB status", dashboardData?.prefixedDbStatus?.status ?? "unknown"],
    ["Section laporan aktif", `${formatInteger(includedSections.length)} dari ${formatInteger(reportSections.length)}`],
    ["Decision status", locked ? "Dikunci untuk rapat pengurus" : "Draft laporan aksi"],
  ];

  async function toggleReportLock() {
    if (!dashboardData?.reportPeriod) {
      setMessage("Report period belum tersedia dari Postgres.");
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
    ) => [section, field, value, sourceLabel, freshness, confidence, nextAction, privacyScope, caveat];

    const rows = [
      [
        "section",
        "field",
        "value",
        "source_label",
        "freshness",
        "confidence",
        "next_action",
        "privacy_scope",
        "caveat",
      ],
      ...executiveRows.map(([field, value]) => reportRow(
        "executive-summary",
        field,
        value,
        "Postgres operational + shared DB read-only + source registry",
        {
          confidence: status === "ready" ? "medium" : "limited",
          nextAction: "Gunakan sebagai pembuka rapat, lalu cek section detail sebelum outreach atau pembiayaan.",
          caveat: "Ringkasan menggabungkan API operasional dan evidence aggregate; bukan klaim produksi SIMKOPDES.",
        },
      )),
      ...reportDemoFlowSteps.map(([label, detail], index) => reportRow(
        "guided-demo-flow",
        `step-${index + 1}-${label}`,
        detail,
        "MVP backlog",
        {
          confidence: "medium",
          nextAction: "Presenter mengikuti urutan flow dari dashboard ke laporan aksi.",
          privacyScope: "navigation-only",
          caveat: "Flow ini memandu demo; bukan bukti integrasi produksi.",
        },
      )),
      ...reportRoleRows.map(([role, surface, workflow]) => reportRow(
        "role-access-alignment",
        role,
        `${surface}; ${workflow}`,
        "SIMKOPDES role alignment backlog",
        {
          confidence: "workflow-design",
          nextAction: "Gunakan role sesuai kewenangan saat aksi bisnis direview.",
          privacyScope: "role-matrix-no-employee-pii",
          caveat: "Role matrix adalah alignment operasional demo; connector resmi SIMKOPDES belum aktif.",
        },
      )),
      ...reportApprovalStages.map(([stage, detail]) => reportRow(
        "operator-approval-workflow",
        stage,
        detail,
        "human-in-the-loop policy",
        {
          confidence: "medium",
          nextAction: "Pastikan buyer outreach, pembiayaan, dan report lock tetap perlu approval pengurus/manager.",
          privacyScope: "workflow-only",
          caveat: "AI tidak melakukan approval otomatis.",
        },
      )),
      ...reportAiGuardrails.map((guardrail, index) => reportRow(
        "ai-business-risk-guardrail",
        `guardrail-${index + 1}`,
        guardrail,
        "MVP safety guardrail",
        {
          confidence: "policy",
          nextAction: "Tampilkan guardrail ini saat membahas AI Business Analyst, Borrower Risk, dan Negotiation Agent.",
          privacyScope: "policy-no-pii",
          caveat: "Guardrail membatasi output AI agar tetap decision-support.",
        },
      )),
      reportRow(
        "evidence-source",
        "source registry",
        `${sourceRegistrySummary}; status ${sourceRegistry?.registryStatus ?? registryStatus}`,
        sourceRegistry?.source ?? "open-data API",
        {
          confidence: registryStatus === "ready" ? "medium" : "limited",
          nextAction: "Aktifkan connector hanya setelah akses resmi dan smoke test tersedia.",
          privacyScope: "registry-only-no-secrets",
          caveat: sourceRegistry?.registryPolicy?.externalClaims ?? "External integrations stay planned unless tested.",
        },
      ),
      ...headlineMetrics.map((item) => reportRow(
        "shared-db-headline-evidence",
        item.label,
        item.amountIdr ? `${formatInteger(item.value)} ${item.unit}; Rp${formatInteger(item.amountIdr)}` : `${formatInteger(item.value)} ${item.unit}`,
        hackathonSummary?.headlineEvidence?.caveat ?? "hackathon shared DB aggregate verification",
        {
          confidence: "aggregate-sample",
          nextAction: "Gunakan sebagai bukti konteks eksplorasi, lalu cek endpoint detail sebelum keputusan.",
          privacyScope: "aggregate-no-pii",
          caveat: hackathonSummary?.headlineEvidence?.caveat ?? "Sample eksplorasi, bukan KPI produksi.",
        },
      )),
      ...qualityChecks.map((check) => reportRow(
        "data-quality-endpoint",
        check.table,
        `${formatInteger(check.totalRows)} rows; ${formatInteger(
          check.quality.reduce((total, item) => total + item.affectedRows, 0),
        )} quality flags`,
        hackathonDataQuality?.source ?? "hackathon data-quality API",
        {
          confidence: hackathonDataQuality ? "medium" : "limited",
          nextAction: "Ubah issue menjadi verification task sebelum rekomendasi dijalankan.",
          privacyScope: "aggregate-no-pii",
          caveat: "Warning agregat tidak membuka row pribadi atau dokumen mentah.",
        },
      )),
      ...directOpportunityAreas.slice(0, 5).map((item, index) => reportRow(
        "opportunity-score-endpoint",
        `rank-${index + 1}`,
        `${[item.area.village, item.area.district, item.area.regency, item.area.province].filter(Boolean).join(", ") || "Area aggregate"}; score ${item.score}`,
        hackathonOpportunityScores?.source ?? "hackathon opportunity-scores API",
        {
          confidence: item.sourceCaveat?.confidence ?? "limited",
          nextAction: "Validasi stok, kualitas, buyer need, dan data source sebelum tindak lanjut.",
          privacyScope: "area-aggregate-no-pii",
          caveat: item.sourceCaveat?.caveat ?? "Score explainable adalah prioritas awal, bukan keputusan otomatis.",
        },
      )),
      ...directBuyerMatches.slice(0, 5).map((item) => reportRow(
        "buyer-matching-endpoint",
        `rank-${item.rank}-${item.buyerArchetypeLabel}`,
        `${item.cooperativeRef}; score ${item.score}; ${item.readinessCluster}`,
        hackathonBuyerMatching?.source ?? "hackathon buyer-matching API",
        {
          confidence: item.score >= 60 ? "medium" : "limited",
          nextAction: item.readinessGaps?.[0] ?? hackathonBuyerMatching?.nextActions?.[0] ?? "Human review before outreach.",
          privacyScope: "buyer-archetype-pseudonymous-profile",
          caveat: "Buyer matching lite memakai archetype dan profile pseudonymous, bukan buyer/koperasi bernama.",
        },
      )),
      ...p0Roadmap.map((item) => reportRow(
        "evidence-source",
        item.title,
        `${item.sources.join(" | ")}; ${item.output}`,
        "docs/37 P0 roadmap",
        {
          confidence: "planned-source",
          nextAction: "Jalankan import/source-check sebelum memakai data sebagai evidence operasional.",
          privacyScope: "registry-only-no-secrets",
          caveat: item.caveat,
        },
      )),
      ...reportDemoFlowSteps.map(([label, detail], index) => reportRow(
        "guided-demo-mode",
        `step-${index + 1}-${label}`,
        detail,
        "dashboard/report UI",
        {
          nextAction: "Ikuti flow demo tanpa melompat ke klaim marketplace penuh.",
          privacyScope: "demo-navigation-no-pii",
          caveat: "Demo mode adalah presenter guide, bukan bukti integrasi eksternal.",
        },
      )),
      ...reportRoleRows.map(([role, surfaces, workflow]) => reportRow(
        "role-access-matrix",
        role,
        `${surfaces}; ${workflow}`,
        "SIMKOPDES alignment checklist",
        {
          confidence: "workflow-alignment",
          nextAction: "Pastikan aksi bisnis direview role yang sesuai.",
          privacyScope: "role-only-no-employee-pii",
          caveat: "Role model mengikuti pola operasional, bukan daftar karyawan asli.",
        },
      )),
      ...managerCommandRows.map(([label, value, note]) => reportRow(
        "manager-command-center",
        label,
        value,
        "dashboard aggregate command rows",
        {
          nextAction: note,
          caveat: "Manager command center memberi daftar aksi, bukan keputusan otomatis.",
        },
      )),
      ...simkopdesChecklistRows.map((row) => reportRow(
        "simkopdes-readiness-checklist",
        row.item,
        row.status,
        "SIMKOPDES warehouse/POS/logistics/savings alignment",
        {
          confidence: row.status === "Checklist" || row.status === "Workflow" ? "workflow" : "medium",
          nextAction: "Lengkapi readiness sebelum buyer outreach agresif.",
          caveat: "Checklist operasional; stok resmi SIMKOPDES belum disinkronkan.",
        },
      )),
      ...approvalSummary.map(([label, value]) => reportRow(
        "operator-approval-workflow",
        label,
        value,
        "operator queue + buyer readiness summary",
        {
          nextAction: "Move recommended items through verification before approval.",
          privacyScope: "aggregate-count-no-pii",
          caveat: "Approved means internal readiness approval, not automatic outreach or financing approval.",
        },
      )),
      ...businessAnalystRows.map(([label, value, note]) => reportRow(
        "ai-business-analyst",
        label,
        value,
        "financing readiness + POS aggregate signals",
        {
          confidence: financingReadiness ? "limited-aggregate" : "needs-verification",
          nextAction: note,
          privacyScope: "aggregate-no-member-pii",
          caveat: "Early warning only, not formal audit or accounting opinion.",
        },
      )),
      ...borrowerRiskRows.map(([label, value, note]) => reportRow(
        "borrower-risk",
        label,
        value,
        "finance queue + stock/readiness signals",
        {
          confidence: "risk-flag",
          nextAction: note,
          privacyScope: "pseudonymous-no-member-identity",
          caveat: "No automatic approval/rejection and no fraud labels.",
        },
      )),
      ...negotiationRows.map(([label, value, note]) => reportRow(
        "market-negotiation",
        label,
        value,
        "buyer requirement + market source readiness",
        {
          confidence: value === "Source required" ? "source-required" : "draft",
          nextAction: note,
          privacyScope: "archetype-no-named-buyer",
          caveat: "No fake real-time price and no automatic buyer contact.",
        },
      )),
      ...commodityHighlights.slice(0, 5).map((item) => reportRow(
        "top-opportunity",
        `rank-${item.rank}`,
        `${item.commodity}; ${item.sector}; rank ${item.rank}; confidence ${item.confidence}`,
        item.sourceLevel,
        {
          confidence: item.confidence,
          nextAction: item.basis,
          privacyScope: "commodity-label-no-member-pii",
          caveat: "Opportunity highlight perlu validasi operator sebelum buyer outreach.",
        },
      )),
      reportRow("pending-verification", "total pending items", pendingQueue.length, "Postgres operational", {
        nextAction: "Operator menutup draft atau minta bukti tambahan.",
        caveat: "Menampilkan jumlah, bukan isi pesan atau kontak warga.",
      }),
      reportRow("buyer-action", "total buyer archetype actions", buyers.length, "Postgres operational", {
        nextAction: "Review archetype dan syarat kualitas sebelum outreach.",
        privacyScope: "archetype-no-named-buyer",
        caveat: "Buyer matching lite bukan komitmen buyer bernama.",
      }),
      reportRow("buyer-action", "approved buyer readiness actions", approvedBuyers.length, "Postgres operational", {
        nextAction: "Gunakan approval sebagai izin internal untuk draft outreach, bukan klaim penjualan.",
        privacyScope: "archetype-no-named-buyer",
        caveat: "Approval pengurus tidak membuktikan buyer siap membeli.",
      }),
      reportRow("buyer-requirement", "prefixed buyer requirement rows", buyerRequirements.length, "anak_sarengklek_buyer_requirements", {
        nextAction: "Cek grade, packaging, target window, dan source label.",
        privacyScope: "archetype-no-named-buyer",
        caveat: "Requirement adalah readiness proxy sampai buyer record verified tersedia.",
      }),
      ...financingStatuses.map((item) => reportRow(
        "financing-readiness",
        item.status,
        `${formatInteger(item.requests)} requests; ${formatInteger(item.amount)} nominal aggregate`,
        financingReadiness?.source ?? "hackathon financing-readiness API",
        {
          freshness: financingReadiness?.freshness?.generatedAt ?? "env-gated",
          confidence: financingReadiness?.confidence?.level ?? "limited",
          nextAction: `Deal room: lanjutkan checklist untuk status ${item.status}.`,
          privacyScope: "aggregate-no-pii-no-approval-claim",
          caveat: financingReadiness?.confidence?.caveat ?? "Financing readiness bukan approval otomatis.",
        },
      )),
      ...financingChecklist.map((item) => reportRow(
        "financing-checklist",
        item.title,
        item.status,
        item.source,
        {
          freshness: financingReadiness?.freshness?.generatedAt ?? "env-gated",
          confidence: financingReadiness?.confidence?.level ?? "limited",
          nextAction: item.nextAction,
          privacyScope: "aggregate-no-pii-no-approval-claim",
          caveat: item.caveat,
        },
      )),
      reportRow("stock-readiness-gap", "critical stock/readiness rows", criticalStocks.length, "Postgres operational", {
        nextAction: "Verifikasi stok, grade, dan jadwal pickup sebelum buyer action.",
        caveat: "Jumlah stok kritis berasal dari state operasional app, bukan stok nasional.",
      }),
      reportRow("stock-readiness-gap", "total stock rows", stocks.length, "Postgres operational", {
        nextAction: "Pisahkan stok aman, terbatas, restock, dan menunggu grade.",
        caveat: "Stock row bukan bukti volume siap kirim tanpa verifikasi.",
      }),
      reportRow("stock-ledger", "prefixed stock ledger rows", stockLedger.length, "anak_sarengklek_stock_ledger", {
        nextAction: "Cek evidence_ref untuk pergerakan stok yang masuk laporan.",
        caveat: "Ledger metadata tidak menyertakan raw media atau dokumen.",
      }),
      reportRow("media-evidence", "prefixed media evidence rows", mediaEvidence.length, "anak_sarengklek_media_evidence", {
        nextAction: "Gunakan label redacted dan status verifikasi, bukan file mentah.",
        privacyScope: "metadata-no-raw-media",
        caveat: "Raw media/storage URI tidak diekspor ke CSV demo.",
      }),
      reportRow(
        "prefixed-db-status",
        dashboardData?.prefixedDbStatus?.message ?? "status unavailable",
        dashboardData?.prefixedDbStatus?.tables.length ?? 0,
        dashboardData?.teamTablePrefix ?? "anak_sarengklek_",
        {
          confidence: dashboardData?.prefixedDbStatus?.status ?? "unknown",
          nextAction: "Jalankan migrasi app DB bila status setup-required.",
          caveat: "Tabel prefixed adalah app-owned; shared DB tetap read-only.",
        },
      ),
      ...(topHackathonOpportunity
        ? [reportRow(
            "shared-db-opportunity",
            topHackathonOpportunity.province,
            `${topHackathonOpportunity.commodityRows} commodity rows; ${topHackathonOpportunity.cooperatives} cooperatives`,
            "Shared DB read-only aggregate",
            {
              freshness: hackathonStatus === "ready" ? generatedAt : "env-gated",
              confidence: "sample-exploration",
              nextAction: "Kirim area teratas ke opportunity-score dan buyer-matching review.",
              caveat: hackathonSummary?.schemaScope?.description ?? "Sample eksplorasi, bukan KPI produksi.",
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
          Laporan ini menutup flow MVP: executive summary, peluang teratas, evidence/source,
          pending verification, buyer action, stok/readiness gap, dan decision status.
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
              <p className="text-sm font-black text-[#7A4E2D]">Guided demo and access</p>
              <h2 className="mt-2 text-2xl font-black">Flow juri dan matrix role SIMKOPDES</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              sample/aggregate/no PII
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
                  {["Role", "Surface", "Workflow"].map((heading) => (
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
              <p className="text-sm font-black text-[#7A4E2D]">Manager command center</p>
              <h2 className="mt-2 text-2xl font-black">Aksi operasional dan readiness SIMKOPDES</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">
                Laporan menunjukkan tindak lanjut manager untuk sales/POS, inventory, logistics, buyer, finance, dan data-quality alerts.
              </p>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              official connector not active
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
              <p className="text-sm font-black text-[#7A4E2D]">AI guardrails</p>
              <h2 className="mt-2 text-2xl font-black">Business analyst, borrower risk, and negotiation summary</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              human approval required
            </span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">AI Business Analyst</p>
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
              <p className="text-xs font-black uppercase text-[#C92A2A]">Borrower risk</p>
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
              <p className="text-xs font-black uppercase text-[#C92A2A]">Market negotiation</p>
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
              <p className="text-sm font-black text-[#7A4E2D]">Evidence/source</p>
              <h2 className="mt-2 text-2xl font-black">Top opportunities dan data pendukung</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              {hackathonStatus === "ready" ? "Shared DB read-only" : "Shared DB env-gated"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-sm font-black text-[#D79A2B]">Opportunity highlight</p>
              <div className="mt-3 space-y-3">
                {commodityHighlights.length > 0 ? (
                  commodityHighlights.slice(0, 4).map((item) => (
                    <div key={`${item.commodity}-${item.rank}`} className="rounded-[12px] bg-black/5 p-3">
                      <p className="font-black">{item.commodity}</p>
                      <p className="mt-1 text-xs font-semibold text-[#53606A]">
                        {item.sector} - source {item.sourceLevel} - confidence {item.confidence}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-[#53606A]">Belum ada highlight komoditas dari Postgres.</p>
                )}
              </div>
            </div>

            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-sm font-black text-[#D79A2B]">Shared DB aggregate</p>
              {topHackathonOpportunity ? (
                <div className="mt-3 rounded-[12px] bg-black/5 p-3">
                  <p className="font-black">{topHackathonOpportunity.province}</p>
                  <p className="mt-1 text-xs font-semibold text-[#53606A]">
                    {formatInteger(topHackathonOpportunity.villages)} wilayah, {formatInteger(topHackathonOpportunity.commodityRows)} komoditas, {formatInteger(topHackathonOpportunity.cooperatives)} koperasi.
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#7A4E2D]">
                    {hackathonSummary?.schemaScope?.description ?? "Sample eksplorasi, bukan referensi utama SIMKOPDES."}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-[#53606A]">
                  Shared DB belum configured atau butuh login/env. Laporan tetap tidak membuat angka palsu.
                </p>
              )}
            </div>

            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-sm font-black text-[#D79A2B]">External source registry</p>
              {registryStatus === "ready" ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-[12px] bg-black/5 p-3">
                    <p className="font-black">{sourceRegistrySummary}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">
                      {sourceRegistry?.registryStatus ?? "static registry"} - {formatInteger(importedAreaTotal)} wilayah terhitung.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <p className="text-xs font-black uppercase text-[#7A4E2D]">Connector claims</p>
                    <p className="text-xs font-semibold text-[#53606A]">
                      {formatInteger(discoveryOrPlannedSources)} discovery/planned, {formatInteger(envGatedConnectors)} env-gated, {formatInteger(implementedConnectors)} implemented.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sourceLabels.slice(0, 5).map((label) => (
                      <span key={label} className="rounded-full border border-[#E7DED1] bg-[#FFFCF5] px-3 py-1 text-[11px] font-black text-[#7A4E2D]">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-[#53606A]">
                  Source registry belum terbaca. Klaim integrasi tetap discovery/planned.
                </p>
              )}
            </div>
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">SIMKOPDES alignment</p>
              <h2 className="mt-2 text-2xl font-black">Role, approval, dan guardrail AI</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">
                Laporan ini memosisikan Lumbung Bersama sebagai operating layer koperasi: role-aware, human-reviewed, dan aggregate-only.
              </p>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              no PII
            </span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-black uppercase text-[#C92A2A]">Role matrix</p>
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
              <p className="text-xs font-black uppercase text-[#C92A2A]">Approval workflow</p>
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
              <p className="text-xs font-black uppercase text-[#C92A2A]">AI guardrails</p>
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
              <p className="text-sm font-black text-[#7A4E2D]">Evidence/source roadmap</p>
              <h2 className="mt-2 text-2xl font-black">P0 source labels dan connector plan</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              docs/37
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {p0Roadmap.length > 0 ? (
              p0Roadmap.map((item) => (
                <div key={item.id} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                  <p className="font-black text-[#1F2933]">{item.title}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{item.output}</p>
                  <p className="mt-3 text-xs font-black text-[#7A4E2D]">
                    {item.sources.join(" / ")}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{item.caveat}</p>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-[#53606A]">
                Roadmap sumber belum tersedia dari API.
              </p>
            )}
          </div>
          <p className="mt-4 text-xs font-bold leading-5 text-[#7A4E2D]">
            {sourceRegistry?.registryPolicy?.externalClaims ??
              "External integrations stay source-discovery or connector-planned unless an implemented connector is tested."}
          </p>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-sm font-black text-[#C92A2A]">Pending verification</p>
              <div className="mt-3 space-y-2">
                {pendingQueue.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.id}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">{item.module} - {item.status}</p>
                  </div>
                ))}
                {pendingQueue.length === 0 ? <p className="text-sm font-semibold text-[#53606A]">Tidak ada draft pending dari API.</p> : null}
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-[#C92A2A]">Buyer readiness</p>
              <div className="mt-3 space-y-2">
                {buyers.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.buyer}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">{item.matchScore}% - {item.status}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">{buyerEvidenceLabel(item)}</p>
                  </div>
                ))}
                {buyers.length === 0 ? <p className="text-sm font-semibold text-[#53606A]">Belum ada buyer readiness dari API.</p> : null}
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-[#C92A2A]">Stock/readiness gap</p>
              <div className="mt-3 space-y-2">
                {criticalStocks.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">{item.state} - {item.location}</p>
                  </div>
                ))}
                {criticalStocks.length === 0 ? <p className="text-sm font-semibold text-[#53606A]">Tidak ada gap stok kritis dari API.</p> : null}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Financing readiness</p>
              <h2 className="mt-2 text-2xl font-black">Deal room aggregate-only</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">
                Status draft/requested/verified ditampilkan sebagai kesiapan dokumen dan komite, bukan approval otomatis.
              </p>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              {financingReadiness ? "Shared DB read-only" : "Env-gated"}
            </span>
          </div>
          {financingReadiness ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {financingStatuses.map((item) => (
                  <div key={item.statusKey} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                    <p className="text-sm font-black text-[#D79A2B]">{item.status}</p>
                    <p className="mt-2 text-3xl font-black">{formatInteger(item.requests)}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">{formatInteger(item.amount)} nominal aggregate</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                  <p className="text-xs font-black uppercase text-[#C92A2A]">LPDB/HIMBARA proxy</p>
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
                    Freshness: {financingReadiness.freshness?.generatedAt ?? "current request"}.
                    Confidence: {financingReadiness.confidence?.level ?? "limited"}.
                  </p>
                </div>
                <div className="grid gap-3">
                  {financingChecklist.map((item) => (
                    <div key={item.id} className="rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black">{item.title}</p>
                        <span className="rounded-[8px] bg-[#FFFCF5] px-2.5 py-1 text-[11px] font-black text-[#7A4E2D]">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-[#53606A]">{item.nextAction}</p>
                      <p className="mt-2 text-xs font-bold leading-5 text-[#7A4E2D]">{item.caveat}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4 text-sm font-semibold text-[#53606A]">
              Shared DB belum configured atau butuh login/env. Laporan tidak membuat angka pembiayaan palsu.
            </p>
          )}
        </article>

        <article className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#7A4E2D]">Prefixed app DB</p>
              <h2 className="mt-2 text-2xl font-black">Requirement, ledger, dan evidence</h2>
            </div>
            <span className="rounded-[10px] bg-[#FFF3D8] px-3 py-2 text-xs font-black text-[#7A4E2D]">
              {dashboardData?.teamTablePrefix ?? "anak_sarengklek_"}
            </span>
          </div>
          {dashboardData?.prefixedDbStatus ? (
            <div className="mt-4 rounded-[12px] bg-[#FFF8EA] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black">{dashboardData.prefixedDbStatus.message}</p>
                <span className="w-fit rounded-[8px] bg-white px-2.5 py-1 text-xs font-black text-[#7A4E2D]">
                  {dashboardData.prefixedDbStatus.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {dashboardData.prefixedDbStatus.tables.map((table) => (
                  <div key={table.tableName} className="rounded-[10px] bg-white p-2 text-xs font-bold text-[#53606A]">
                    <p className="truncate text-[#172027]">{table.tableName}</p>
                    <p className="mt-1">
                      {table.status === "ready" ? `${formatInteger(table.rows)} rows` : table.errorCode ?? "setup-required"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">Buyer requirements</p>
              <div className="mt-3 space-y-2">
                {buyerRequirements.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.productName}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">
                      {formatInteger(item.requiredQuantity)} {item.unitLabel} - {item.verificationStatus}
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">{item.sourceLabel}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">Stock ledger</p>
              <div className="mt-3 space-y-2">
                {stockLedger.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.stockName}</p>
                    <p className="mt-1 text-xs font-semibold text-[#53606A]">
                      {item.movementType} - {formatInteger(item.quantity)} {item.unitLabel}
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">Evidence: {item.evidenceRef}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-[#C92A2A]">Media evidence</p>
              <div className="mt-3 space-y-2">
                {mediaEvidence.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-[12px] bg-[#FFF8EA] p-3">
                    <p className="font-black">{item.redactedLabel}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#53606A]">{item.caption}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">{item.verificationStatus}</p>
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
              <p className="font-black">Decision status</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#53606A]">{message}</p>
              <p className="mt-2 text-xs font-bold text-[#7A4E2D]">
                Financing ditampilkan sebagai readiness saja. Keputusan tetap oleh komite/pengurus koperasi.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

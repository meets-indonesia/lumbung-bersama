export type SignalStatus =
  | "available"
  | "missing"
  | "stale"
  | "needs_verification"
  | "not_authorized"
  | "future_connector";

export type ApprovalStatus =
  | "draft"
  | "needs_verification"
  | "ready_for_approval"
  | "approved"
  | "blocked";

export type RoleOwner =
  | "manager"
  | "pengurus"
  | "admin_gudang"
  | "admin_logistik"
  | "kasir"
  | "kurir"
  | "operator_wa"
  | "audit_viewer";

export type Provenance = {
  sourceFamily:
    | "shared_db_sample"
    | "public_snapshot"
    | "static_route_audit"
    | "open_data"
    | "operator_wa"
    | "future_connector";
  sourceRouteFamily: string;
  freshness: string;
  confidence: "high" | "medium" | "low";
  caveat: string;
  humanReviewStatus: "required" | "completed" | "not_applicable";
  approvalOwner: RoleOwner;
};

export type SignalFamily = {
  family: string;
  title: string;
  observedRouteFamily: string;
  signalType: string;
  status: SignalStatus;
  sourceLabel: string;
  caveat: string;
  ownerRole: RoleOwner;
  usedFor: string[];
  provenance: Provenance;
};

export type GateCheck = {
  id: string;
  label: string;
  status: "ready" | "partial" | "missing" | "blocked" | "needs_verification";
  ownerRole: RoleOwner;
  evidence: string;
  caveat: string;
  nextAction: string;
};

export type ManagerAction = {
  actionId: string;
  ownerRole: RoleOwner;
  sourceSignal: string;
  priority: "high" | "medium" | "low";
  dueAction: string;
  status: ApprovalStatus;
  provenance: Provenance;
};

export type RemediationTask = {
  taskId: string;
  issue: string;
  ownerRole: RoleOwner;
  priority: "high" | "medium" | "low";
  sourceSignal: string;
  dueAction: string;
  status: Exclude<ApprovalStatus, "approved">;
  caveat: string;
};

export type ConnectorReadiness = {
  id: string;
  sourceFamily: string;
  observedRouteFamily: string;
  status:
    | "observed_route_family"
    | "sample_static_only"
    | "official_access_missing"
    | "sandbox_available"
    | "read_only_aggregate"
    | "production_connector_approved"
    | "blocked_by_policy";
  score: number;
  securityNote: string;
  nextAction: string;
  caveat: string;
};

const STATIC_AUDIT_FRESHNESS = "2026-07-10 static route-family audit";
const SHARED_DB_FRESHNESS = "2026-07-10 hackathon shared DB aggregate snapshot";
const BOUNDARY_SENTENCE =
  "Lumbung reads or simulates aggregate signals from existing Kopdes/SIMKOPDES feature families; it does not call the dev API, mutate records, or replace operational modules without official connector approval.";

function provenance(
  sourceFamily: Provenance["sourceFamily"],
  sourceRouteFamily: string,
  approvalOwner: RoleOwner,
  confidence: Provenance["confidence"] = "medium",
  freshness = STATIC_AUDIT_FRESHNESS,
): Provenance {
  return {
    sourceFamily,
    sourceRouteFamily,
    freshness,
    confidence,
    caveat:
      "Route/API family is observed or mapped as aggregate evidence only; it is not an official API contract or production integration.",
    humanReviewStatus: "required",
    approvalOwner,
  };
}

const signalFamilies: SignalFamily[] = [
  {
    family: "profile_potensi",
    title: "Profil, dokumen, potensi desa",
    observedRouteFamily: "/koperasi/beranda/profil + /koperasi/beranda/potensi-desa",
    signalType: "area-and-cooperative-context",
    status: "available",
    sourceLabel: "workflow alignment/sample adapter",
    caveat: "Used as context signal only. Legal/profile documents still need official connector or operator verification.",
    ownerRole: "manager",
    usedFor: ["opportunity-score", "cooperative-health-gate", "offer-pack-readiness"],
    provenance: provenance("static_route_audit", "koperasi/beranda/profil,potensi-desa", "manager"),
  },
  {
    family: "inventory_pos",
    title: "Produk, POS, gudang, inventory",
    observedRouteFamily: "/koperasi/penjualan/produk + /transaksi + /warehouse",
    signalType: "product-inventory-demand-readiness",
    status: "needs_verification",
    sourceLabel: "shared DB aggregate + future official connector",
    caveat: "Product, stock, and POS demand signals must stay aggregate-only and must not expose receipt/customer detail.",
    ownerRole: "admin_gudang",
    usedFor: ["readiness-gate", "pos-demand-aggregator", "data-remediation"],
    provenance: provenance("shared_db_sample", "produk_koperasi,inventaris_produk,transaksi_penjualan", "admin_gudang", "medium", SHARED_DB_FRESHNESS),
  },
  {
    family: "offtaker_b2b_rfq",
    title: "Offtaker, B2B, RFQ, order surface",
    observedRouteFamily: "/koperasi/penjualan-b2b/order + /rfq + /bank/pusat/buyer/rfq",
    signalType: "pre-offtaker-gate-target",
    status: "future_connector",
    sourceLabel: "observed route family, not live integration",
    caveat: "Lumbung only prepares a readiness gate and offer draft; it does not submit RFQ/order/contract.",
    ownerRole: "pengurus",
    usedFor: ["buyer-match", "offer-pack-draft", "manager-approval"],
    provenance: provenance("static_route_audit", "penjualan-b2b,rfq,order", "pengurus", "low"),
  },
  {
    family: "finance_governance",
    title: "RAT, SHU, laporan keuangan, simpanan, pinjaman",
    observedRouteFamily: "/koperasi/rat + /koperasi/shu + /simpanan + /pinjaman",
    signalType: "cooperative-health-and-financing-readiness",
    status: "needs_verification",
    sourceLabel: "aggregate readiness signal",
    caveat: "Health gate is an early-warning support tool, not an audit, legal opinion, or loan decision.",
    ownerRole: "pengurus",
    usedFor: ["cooperative-health-gate", "working-capital-scenario", "financing-readiness"],
    provenance: provenance("shared_db_sample", "pengajuan_pembiayaan + finance/governance route family", "pengurus", "medium", SHARED_DB_FRESHNESS),
  },
  {
    family: "fulfillment_logistics",
    title: "Pengiriman, kurir, proof-of-delivery",
    observedRouteFamily: "/logistik/pengiriman-barang + /warehouse/pengiriman",
    signalType: "fulfillment-sla-confidence",
    status: "needs_verification",
    sourceLabel: "workflow alignment/sample adapter",
    caveat: "Proof-of-delivery is a confidence signal only; no photos, addresses, courier personal data, or coordinates are exposed.",
    ownerRole: "admin_logistik",
    usedFor: ["readiness-gate", "offer-pack-logistics-note", "manager-action-queue"],
    provenance: provenance("static_route_audit", "logistik,pengiriman,kurir", "admin_logistik", "low"),
  },
  {
    family: "issue_helpdesk_jaga_desa",
    title: "Helpdesk, pengaduan anggota, Jaga Desa",
    observedRouteFamily: "/koperasi/helpdesk + /koperasi/jaga-desa",
    signalType: "issue-and-risk-caveat",
    status: "future_connector",
    sourceLabel: "observed route family",
    caveat: "Issue signal is aggregate caveat only and must not expose complainant identity or case detail.",
    ownerRole: "operator_wa",
    usedFor: ["cooperative-health-gate", "remediation-planner", "action-queue"],
    provenance: provenance("static_route_audit", "helpdesk,jaga-desa", "operator_wa", "low"),
  },
  {
    family: "provider_connector",
    title: "Technology provider, partnership, sandbox/access",
    observedRouteFamily: "/technology-provider + /cooperative-provider-partnership",
    signalType: "official-connector-readiness",
    status: "not_authorized",
    sourceLabel: "future official connector only",
    caveat: "Observed endpoints are not contracts. Future connector must use server-side proxy, rate limit, audit log, and official approval.",
    ownerRole: "manager",
    usedFor: ["connector-scorecard", "security-readiness", "integration-roadmap"],
    provenance: provenance("static_route_audit", "technology-provider,partnership,sandbox", "manager", "low"),
  },
  {
    family: "public_sector_facilitator",
    title: "Pendamping, dinas, kementerian/lembaga, survey",
    observedRouteFamily: "/pendamping-desa + /dinas-provinsi + /kementerian-lembaga + /survey",
    signalType: "facilitator-reporting-and-assessment-readiness",
    status: "future_connector",
    sourceLabel: "cross-role public-sector signal map",
    caveat: "This can only become a facilitator/dinas report view after official access rules are clear.",
    ownerRole: "audit_viewer",
    usedFor: ["facilitator-report-mode", "connector-scorecard", "roadmap"],
    provenance: provenance("static_route_audit", "pendamping,dinas,kementerian,survey", "manager", "low"),
  },
];

const readinessChecks: GateCheck[] = [
  {
    id: "stock-volume",
    label: "Stock and aggregation volume",
    status: "needs_verification",
    ownerRole: "admin_gudang",
    evidence: "inventory/POS sample signal plus product rows",
    caveat: "Stock rows can include low, negative, generic, or stale values.",
    nextAction: "Verify stock unit, quantity, grade, and aggregation window before offer pack approval.",
  },
  {
    id: "grade-spec",
    label: "Grade/specification",
    status: "missing",
    ownerRole: "admin_gudang",
    evidence: "product normalization checklist",
    caveat: "Generic product names cannot be used for buyer-facing outreach.",
    nextAction: "Complete product grade, specification, unit, and packaging data.",
  },
  {
    id: "price-margin",
    label: "Price, margin, floor and target",
    status: "partial",
    ownerRole: "manager",
    evidence: "market source registry and operator-input workflow",
    caveat: "No real-time price is invented when official price source is unavailable.",
    nextAction: "Record official/curated reference price or local operator price before negotiation script is approved.",
  },
  {
    id: "documents-governance",
    label: "Documents, RAT, finance, legal readiness",
    status: "partial",
    ownerRole: "pengurus",
    evidence: "finance/governance route-family signal",
    caveat: "This is readiness support, not a legal audit or financing approval.",
    nextAction: "Check RAT/reporting, financial report availability, financing status, and governance caveat.",
  },
  {
    id: "fulfillment-sla",
    label: "Warehouse, courier and proof-of-delivery readiness",
    status: "needs_verification",
    ownerRole: "admin_logistik",
    evidence: "fulfillment/logistics route-family signal",
    caveat: "No recipient address, photo, coordinate, or courier personal detail is exposed.",
    nextAction: "Confirm warehouse location, pickup plan, courier assignment, and POD governance before outreach.",
  },
  {
    id: "issue-caveat",
    label: "Helpdesk/Jaga Desa unresolved issue caveat",
    status: "blocked",
    ownerRole: "operator_wa",
    evidence: "observed issue/helpdesk route family",
    caveat: "No complaint details are shown. Aggregate issue count requires official connector.",
    nextAction: "If official access exists later, add unresolved issue count as activation caveat.",
  },
];

const readinessGate = {
  commodity: "Demo aggregate commodity",
  buyerTarget: "buyer archetype/market proxy",
  status: "ready_with_caveat" as const,
  summary:
    "Ready for internal manager review, but not ready for RFQ/order submission until stock, grade, price, and fulfillment evidence are verified.",
  approvalOwner: "manager" as RoleOwner,
  checks: readinessChecks,
  guardrails: [
    "No automatic RFQ, order, contract, buyer contact, or marketplace checkout.",
    "Buyer output remains archetype/proxy until verified buyer data exists.",
    "High-impact action requires manager/pengurus approval.",
  ],
  provenance: provenance("static_route_audit", "pre-offtaker-readiness-gate", "manager", "medium"),
};

const offerPackDraft = {
  commodity: "Demo aggregate commodity",
  product: "Source-labeled cooperative product",
  volumeStatus: "aggregation_needed" as const,
  gradeStatus: "missing" as const,
  price: {
    reference: null,
    floor: null,
    target: null,
    caveat: "Operator input or official/curated market source is required before price suggestion is buyer-facing.",
  },
  logisticsNote: "Warehouse, pickup, courier, and proof-of-delivery readiness must be verified.",
  buyerTarget: "buyer archetype/proxy",
  cooperativeReadinessBadges: ["sample/aggregate/no PII", "human approval required", "not RFQ/order/contract"],
  outreachScriptDraft:
    "Draft: Koperasi menyiapkan komoditas dengan volume dan spesifikasi yang sedang diverifikasi. Mohon konfirmasi kebutuhan grade, volume, jadwal, dan syarat dokumen sebelum pembahasan harga.",
  approvalStatus: "needs_verification" as ApprovalStatus,
  provenance: provenance("static_route_audit", "offer-pack-draft", "pengurus", "medium"),
};

const priceMarginNegotiationGuardrail = {
  referencePrice: null,
  suggestedOfferPrice: null,
  floorPrice: null,
  targetPrice: null,
  targetMargin: "operator-input-required",
  costInputs: ["buy price", "grading", "packaging", "pickup/logistics", "cold-chain if relevant"],
  marginWarning: "Cannot calculate margin until reference price and cost inputs are entered by operator.",
  negotiationScript:
    "Draft script is internal only. It must be edited and approved before any buyer/outreach channel is used.",
  caveat: "No live price is invented and no offer is sent automatically.",
  provenance: provenance("open_data", "bapanas,pihps,kemendag,operator-price-input", "manager", "low"),
};

const workingCapitalScenario = {
  status: "scenario_draft",
  minimumCapital: null,
  idealCapital: null,
  cashConversionCycle: "needs operator input",
  financingGap: "needs verification",
  requiredDocuments: ["stock plan", "purchase estimate", "packaging/grading estimate", "pickup/logistics plan", "repayment trigger"],
  riskLevel: "needs_verification",
  caveat: "Business analyst copilot only; not a credit decision, accounting opinion, or financial advice.",
  linkedReadiness: "/api/hackathon/financing-readiness",
  provenance: provenance("shared_db_sample", "pengajuan_pembiayaan + working-capital-scenario", "pengurus", "medium", SHARED_DB_FRESHNESS),
};

const cooperativeHealthGate = {
  status: "activate_with_guardrail" as const,
  signals: [
    { label: "RAT/reporting", status: "needs_verification", ownerRole: "pengurus" },
    { label: "Savings discipline aggregate", status: "future_connector", ownerRole: "pengurus" },
    { label: "Loan/financing aggregate", status: "available", ownerRole: "pengurus" },
    { label: "Financial report availability", status: "needs_verification", ownerRole: "manager" },
    { label: "SHU period/allocation", status: "future_connector", ownerRole: "pengurus" },
    { label: "Helpdesk/Jaga Desa unresolved issues", status: "future_connector", ownerRole: "operator_wa" },
  ],
  caveat: "Aggregate early-warning only. Not an audit and not an individual borrower assessment.",
  nextAction: "Hold aggressive outreach when governance, liquidity, or issue signals are missing.",
  provenance: provenance("static_route_audit", "rat,shu,simpanan,pinjaman,laporan-keuangan,helpdesk", "pengurus", "low"),
};

const rolePermissionMatrix = [
  { role: "Pengurus", ownerRole: "pengurus", canView: true, canCorrect: false, canApprove: true, canExecute: false, boundary: "Final approval for outreach, finance posture, and locked report." },
  { role: "Manager", ownerRole: "manager", canView: true, canCorrect: true, canApprove: true, canExecute: true, boundary: "Owns action queue and one-person-operations demo flow." },
  { role: "Admin Gudang", ownerRole: "admin_gudang", canView: true, canCorrect: true, canApprove: false, canExecute: true, boundary: "Executes stock, product, grade, supplier, and warehouse remediation." },
  { role: "Admin Logistik", ownerRole: "admin_logistik", canView: true, canCorrect: true, canApprove: false, canExecute: true, boundary: "Executes pickup, courier, SLA, and POD readiness." },
  { role: "Kasir", ownerRole: "kasir", canView: true, canCorrect: true, canApprove: false, canExecute: true, boundary: "Supplies aggregate POS demand signal without customer detail." },
  { role: "Kurir", ownerRole: "kurir", canView: true, canCorrect: false, canApprove: false, canExecute: true, boundary: "Updates fulfillment stage without exposing recipient detail publicly." },
  { role: "Operator WA", ownerRole: "operator_wa", canView: true, canCorrect: true, canApprove: false, canExecute: true, boundary: "Receives evidence and creates drafts; no automatic external action." },
  { role: "Viewer audit", ownerRole: "audit_viewer", canView: true, canCorrect: false, canApprove: false, canExecute: false, boundary: "Read-only aggregate view." },
] as const;

const remediationPlanner: RemediationTask[] = [
  {
    taskId: "REM-001",
    issue: "Generic or inconsistent product name",
    ownerRole: "admin_gudang",
    priority: "high",
    sourceSignal: "inventory_pos",
    dueAction: "Normalize product name, category, unit, potential link, supplier/source, and subsidy flag.",
    status: "needs_verification",
    caveat: "System proposes the task; operator performs and approves correction.",
  },
  {
    taskId: "REM-002",
    issue: "Negative/outlier stock or volume uncertainty",
    ownerRole: "admin_gudang",
    priority: "high",
    sourceSignal: "inventory_pos",
    dueAction: "Verify physical stock, unit, grade, warehouse location, and aggregation window.",
    status: "needs_verification",
    caveat: "Bad stock lowers confidence and blocks aggressive outreach.",
  },
  {
    taskId: "REM-003",
    issue: "Missing price and margin inputs",
    ownerRole: "manager",
    priority: "medium",
    sourceSignal: "price_margin_guardrail",
    dueAction: "Record official/curated reference price or local operator price, then add cost and target margin.",
    status: "draft",
    caveat: "No fake real-time price is generated.",
  },
  {
    taskId: "REM-004",
    issue: "Fulfillment proof/SLA not ready",
    ownerRole: "admin_logistik",
    priority: "medium",
    sourceSignal: "fulfillment_logistics",
    dueAction: "Confirm warehouse, pickup, courier assignment, delivery stage, and POD governance.",
    status: "needs_verification",
    caveat: "No photos, addresses, or courier personal data are exported.",
  },
  {
    taskId: "REM-005",
    issue: "Financing or governance status stale",
    ownerRole: "pengurus",
    priority: "medium",
    sourceSignal: "finance_governance",
    dueAction: "Check financing readiness, RAT/reporting, financial report availability, and cooperative health gate.",
    status: "draft",
    caveat: "Readiness only; no automatic credit decision.",
  },
  {
    taskId: "REM-006",
    issue: "Complaint/helpdesk/Jaga Desa caveat not connected",
    ownerRole: "operator_wa",
    priority: "low",
    sourceSignal: "issue_helpdesk_jaga_desa",
    dueAction: "Keep issue signal as future connector; do not expose complainant/case detail.",
    status: "blocked",
    caveat: "Requires official access and governance policy before use.",
  },
];

const managerActionQueue: ManagerAction[] = [
  {
    actionId: "ACT-001",
    ownerRole: "admin_gudang",
    sourceSignal: "inventory_pos",
    priority: "high",
    dueAction: "Verify stock, unit, grade, supplier/source, and warehouse evidence before off-taker gate advances.",
    status: "needs_verification",
    provenance: provenance("shared_db_sample", "produk,inventaris,barang-masuk,barang-keluar", "admin_gudang", "medium", SHARED_DB_FRESHNESS),
  },
  {
    actionId: "ACT-002",
    ownerRole: "manager",
    sourceSignal: "price_margin_guardrail",
    priority: "high",
    dueAction: "Add reference price, cost assumptions, margin target, floor price, and target price.",
    status: "draft",
    provenance: provenance("open_data", "bapanas,pihps,kemendag,operator-input", "manager", "low"),
  },
  {
    actionId: "ACT-003",
    ownerRole: "admin_logistik",
    sourceSignal: "fulfillment_logistics",
    priority: "medium",
    dueAction: "Confirm pickup route, courier assignment, fulfillment stage, and POD policy.",
    status: "needs_verification",
    provenance: provenance("static_route_audit", "logistik,pengiriman,kurir", "admin_logistik", "low"),
  },
  {
    actionId: "ACT-004",
    ownerRole: "pengurus",
    sourceSignal: "finance_governance",
    priority: "medium",
    dueAction: "Review cooperative health gate, financing readiness, RAT/reporting, and financial report caveats.",
    status: "ready_for_approval",
    provenance: provenance("shared_db_sample", "pengajuan_pembiayaan,rat,shu,laporan-keuangan", "pengurus", "medium", SHARED_DB_FRESHNESS),
  },
  {
    actionId: "ACT-005",
    ownerRole: "operator_wa",
    sourceSignal: "operator_wa",
    priority: "medium",
    dueAction: "Collect missing evidence from WA/operator channel and attach it as draft evidence, not public PII.",
    status: "draft",
    provenance: provenance("operator_wa", "wa-intake,operator-queue", "operator_wa", "medium"),
  },
  {
    actionId: "ACT-006",
    ownerRole: "manager",
    sourceSignal: "offtaker_b2b_rfq",
    priority: "high",
    dueAction: "Approve or hold offer pack draft before any buyer-facing outreach script is used.",
    status: "ready_for_approval",
    provenance: provenance("static_route_audit", "b2b,rfq,order", "manager", "low"),
  },
];

const connectorScorecard: ConnectorReadiness[] = [
  {
    id: "kopdes-simkopdes",
    sourceFamily: "Kopdes/SIMKOPDES future connector",
    observedRouteFamily: "profile, product, POS, warehouse, B2B/RFQ, finance, helpdesk route families",
    status: "official_access_missing",
    score: 35,
    securityNote: "No frontend secret usage; future connector must run server-side with audit log and rate limit.",
    nextAction: "Request approved connector agreement, sandbox, rate limits, data dictionary, and privacy review.",
    caveat: "Observed static bundle route family is not an official API contract.",
  },
  {
    id: "bps",
    sourceFamily: "BPS",
    observedRouteFamily: "BPS WebAPI / Master File Desa",
    status: "sandbox_available",
    score: 70,
    securityNote: "Use server-side BPS_API_KEY only; cache allowed aggregate variables.",
    nextAction: "Map variables and code reconciliation per commodity/wilayah.",
    caveat: "Statistics baseline is not live cooperative stock.",
  },
  {
    id: "big",
    sourceFamily: "BIG/admin boundary",
    observedRouteFamily: "ArcGIS boundary service / wilayah_boundaries cache",
    status: "read_only_aggregate",
    score: 78,
    securityNote: "Geometry cache and simplification must avoid leaking restricted layers.",
    nextAction: "Continue boundary cache warming and code reconciliation.",
    caveat: "Boundary coverage can be partial and must show source label.",
  },
  {
    id: "bapanas-pihps",
    sourceFamily: "Bapanas/PIHPS",
    observedRouteFamily: "food price portals",
    status: "sample_static_only",
    score: 45,
    securityNote: "Server-side connector only after access rules are known.",
    nextAction: "Confirm official download/API path and market-level interpretation.",
    caveat: "Price context is not buyer demand or transaction volume.",
  },
  {
    id: "kemendag-sisp",
    sourceFamily: "Kemendag/SISP",
    observedRouteFamily: "trade/market candidate sources",
    status: "official_access_missing",
    score: 35,
    securityNote: "No scraping authenticated surfaces; use official connector only.",
    nextAction: "Identify permitted endpoint or dataset for market/export signals.",
    caveat: "Trade signal remains roadmap until tested.",
  },
  {
    id: "wa-operator",
    sourceFamily: "WA/operator verification",
    observedRouteFamily: "WA intake + operator queue",
    status: "read_only_aggregate",
    score: 68,
    securityNote: "Cloud API token stays server-side; local draft mode cannot claim live delivery.",
    nextAction: "Use operator-reviewed evidence to close stock/grade/price/remediation tasks.",
    caveat: "WA messages are support channel evidence, not automatic approval.",
  },
];

const provenanceLedger = [
  {
    recommendationId: "REC-OPP-001",
    label: "Opportunity Score",
    whyWeRecommendThis: "Commodity, cooperative, product/stock, market, partnership, and data-completeness signals are explainable.",
    provenance: provenance("shared_db_sample", "opportunity-scores aggregate tables", "manager", "medium", SHARED_DB_FRESHNESS),
  },
  {
    recommendationId: "REC-BUY-001",
    label: "Buyer Match Recommendation behind readiness gate",
    whyWeRecommendThis: "Buyer target stays archetype/proxy until readiness gate clears and verified buyer records exist.",
    provenance: provenance("shared_db_sample", "buyer-matching aggregate tables + b2b/rfq observed family", "manager", "medium", SHARED_DB_FRESHNESS),
  },
  {
    recommendationId: "REC-PRICE-001",
    label: "Price, Margin & Negotiation Guardrail",
    whyWeRecommendThis: "Negotiation draft is blocked until price source or operator input and costs are available.",
    provenance: priceMarginNegotiationGuardrail.provenance,
  },
  {
    recommendationId: "REC-FIN-001",
    label: "Financing and working capital readiness",
    whyWeRecommendThis: "Financing bottleneck is treated as readiness and cashflow scenario, never as loan approval.",
    provenance: workingCapitalScenario.provenance,
  },
  {
    recommendationId: "REC-ACT-001",
    label: "Manager Action Queue",
    whyWeRecommendThis: "Each blocker is converted into owner, priority, due action, and human approval status.",
    provenance: provenance("static_route_audit", "manager-action-queue", "manager", "medium"),
  },
  {
    recommendationId: "REC-REPORT-001",
    label: "Laporan Aksi",
    whyWeRecommendThis: "Report export carries source, confidence, caveat, next owner, and action status.",
    provenance: provenance("public_snapshot", "laporan-aksi", "pengurus", "medium"),
  },
];

const demoFixture = {
  name: "Manager one-person-operations demo",
  durationTarget: "<= 3 minutes",
  commodity: "Kopi kering",
  productSignal: "inventory row requires grade and volume verification",
  posSignal: "aggregate POS/demand proxy only",
  fulfillmentGap: "warehouse and pickup confirmation missing",
  financeSignal: "working capital scenario draft, not credit decision",
  buyerTarget: "bulk buyer archetype",
  reportOutput: "Laporan Aksi with evidence ledger and manager action queue",
  caveat: "No personal data, no official dev API claim, no automatic outreach.",
};

export function buildSimkopdesSignalSpine() {
  const readySignals = signalFamilies.filter((item) => item.status === "available").length;
  const blockedSignals = signalFamilies.filter((item) => ["not_authorized", "future_connector"].includes(item.status)).length;
  const highPriorityActions = managerActionQueue.filter((item) => item.priority === "high").length;

  return {
    source: "static-route-audit-and-aggregate-readiness",
    mode: "workflow-alignment-sample-adapter",
    generatedAt: new Date().toISOString(),
    boundarySentence: BOUNDARY_SENTENCE,
    mvpSpine: [
      "Signal Snapshot Adapter",
      "Evidence & Provenance Ledger",
      "Opportunity Score",
      "Pre-Offtaker Readiness Gate",
      "Offer Pack Draft",
      "Manager Action Queue",
      "Laporan Aksi",
    ],
    summary: {
      signalFamilies: signalFamilies.length,
      readySignals,
      blockedSignals,
      provenanceRows: provenanceLedger.length,
      managerActions: managerActionQueue.length,
      highPriorityActions,
      remediationTasks: remediationPlanner.length,
      connectorScorecards: connectorScorecard.length,
    },
    signalFamilies,
    provenanceLedger,
    readinessGate,
    offerPackDraft,
    priceMarginNegotiationGuardrail,
    workingCapitalScenario,
    cooperativeHealthGate,
    rolePermissionMatrix,
    managerActionQueue,
    remediationPlanner,
    connectorScorecard,
    demoFixture,
    safety: {
      noPii:
        "No NIK, phone, email, address, bank detail, receipt detail, raw document path, or personal member/customer/employee data is returned.",
      noSecret:
        "No token, password, credential, API key, or connection string is returned.",
      noOverclaim:
        "This payload maps observed route families and aggregate signals; it does not call dev API, mutate records, or claim official production integration.",
    },
  };
}

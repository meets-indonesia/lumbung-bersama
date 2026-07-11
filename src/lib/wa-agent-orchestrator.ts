import { runWaReplyProvider, type WaReplyProviderResult } from "@/lib/ai-provider";
import { runScopedAgentTools, type AgentToolRunSummary } from "@/lib/agent-tool-registry";
import {
  buildWaOperationalReply,
  getWaReviewPolicy,
  quickWaActionsText,
  type WaAgentDraft,
  type WaAgentIntent,
  type WaPayloadType,
} from "@/lib/wa-operator-queue";

type OrchestratedWaReplyInput = {
  cooperativeId: string;
  cooperativeProvince?: string | null;
  cooperativeRegency?: string | null;
  intent: WaAgentIntent;
  draft?: WaAgentDraft;
  message: string;
  payloadType?: WaPayloadType;
  queueId?: string | null;
  mediaSummary?: string | null;
  commodityDetails?: string[];
};

export type OrchestratedWaReply = {
  reply: string;
  toolSummary: AgentToolRunSummary;
  provider: WaReplyProviderResult;
  outOfScope: boolean;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSections(sections: Array<{ title?: string; lines: Array<string | null | undefined> }>) {
  return sections
    .map((section) => {
      const lines = section.lines.map((line) => String(line ?? "").trim()).filter(Boolean);
      if (!lines.length) return "";
      return [section.title, ...lines].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function isWaMessageOutOfScope(message: string, payloadType: WaPayloadType) {
  if (payloadType !== "text") return false;
  const normalized = normalize(message);
  if (
    !normalized ||
    ["menu", "bantuan", "help", "halo", "hai", "operator", "puas", "tidak", "tidak puas", "terima kasih", "terimakasih", "makasih", "thanks", "thank you"].includes(
      normalized,
    )
  ) {
    return false;
  }

  return !/\b(koperasi|kopdes|lumbung|desa|warga|komoditas|produk|panen|beras|padi|gabah|sawit|tbs|cpo|kopi|cabai|singkong|jagung|kakao|lada|sagu|rumput laut|harga|jual|buyer|pembeli|offtaker|stok|stock|gerai|gudang|restock|pickup|barang|pinjam|pinjaman|pembiayaan|modal|simpan|keuangan|angsuran|pupuk|benih|nota|bukti|dokumen|pdf|foto|gambar|ocr|laporan|aksi|integrasi|wa|catatan|status|kemitraan|transaksi|umkm)\b/i.test(
    normalized,
  );
}

function statusLines(queueId: string | null | undefined, reviewMode: string, slaText?: string) {
  if (queueId) {
    return [`Nomor antrean: ${queueId}`, slaText ?? "Operator/pengurus menindaklanjuti maksimal 24 jam kerja."];
  }
  if (reviewMode === "manual-review") {
    return [slaText ?? "Butuh tindak lanjut operator/pengurus maksimal 24 jam kerja."];
  }
  return ["Dijawab otomatis dari data yang tersedia dan tersimpan di WA Inbox."];
}

function scopeTitle(scope: AgentToolRunSummary["scope"]) {
  if (scope === "harga") return "Cek Harga";
  if (scope === "buyer") return "Buyer Matching";
  if (scope === "stok") return "Stok dan Gudang";
  if (scope === "finance") return "Pembiayaan Readiness";
  if (scope === "document") return "Bukti dan Dokumen";
  if (scope === "report") return "Laporan Aksi";
  if (scope === "integration") return "Integrasi";
  if (scope === "intake") return "WA Intake";
  return "Peta Potensi";
}

function fallbackLinesForScope(input: OrchestratedWaReplyInput, toolSummary: AgentToolRunSummary) {
  const evidence = toolSummary.evidenceLines.slice(0, 5);
  const missingDataLine =
    "Data minimum: wilayah/kabupaten, komoditas/produk, grade/kualitas, volume, satuan, tanggal siap, dan bukti bila ada.";

  if (toolSummary.scope === "harga") {
    const hasNumericPrice = evidence.some((line) => /Rp\d/i.test(line));
    return evidence.length
      ? [
          "Saya cek harga dari data transaksi, inventaris, atau sinyal harga yang tersedia.",
          ...evidence,
          hasNumericPrice
            ? "Angka di atas berasal dari field harga/nilai/kuantitas yang tersedia di data; harga final tetap perlu grade, volume, lokasi pickup, ongkos angkut, dan sumber hari ini."
            : "Data yang tersedia belum memuat harga satuan eksplisit, jadi saya tidak mengeluarkan angka harga/kg dan tidak membuat ticket operator untuk pertanyaan informasional.",
        ]
      : [
          "Saya belum menemukan produk/harga/sinyal harga yang cocok di data untuk komoditas/wilayah ini.",
          "Kirim wilayah lebih spesifik, grade/kualitas, volume, dan satuan agar saya cek lagi dari data koperasi.",
        ];
  }

  if (toolSummary.scope === "buyer") {
    return [
      "Alur jual yang aman: cek harga dan grade dulu, lalu cocokkan ke buyer archetype setelah stok siap.",
      ...evidence,
      "Saya tidak menyebut buyer bernama dan tidak mengirim outreach tanpa approval pengurus.",
      missingDataLine,
    ];
  }

  if (toolSummary.scope === "finance") {
    const financeLines = financingReadinessLines(input.message);
    return [
      "Pembiayaan saya cek sebagai readiness, bukan persetujuan otomatis.",
      ...evidence,
      ...financeLines,
      "Keputusan tetap menunggu review pengurus/komite.",
    ];
  }

  if (toolSummary.scope === "stok") {
    return [
      "Saya cek stok, gudang, dan readiness dari data yang tersedia.",
      ...evidence,
      "Untuk restock/pickup/barang masuk-keluar, operator perlu mengunci jumlah, lokasi, dan bukti.",
    ];
  }

  if (toolSummary.scope === "document") {
    return [
      input.mediaSummary ? `Hasil baca awal: ${input.mediaSummary}` : "File/bukti diterima sebagai evidence awal.",
      ...evidence,
      "Hasil OCR/PDF dipisahkan dari keputusan operasional agar tidak rancu.",
    ];
  }

  if (toolSummary.scope === "report") {
    return [
      "Saya siapkan bahan laporan aksi dari case, evidence, gap verifikasi, readiness stok, buyer action, dan status keputusan.",
      ...evidence,
    ];
  }

  if (toolSummary.scope === "integration") {
    return ["Status integrasi harus dibaca dari health runtime/dashboard, bukan klaim manual.", ...evidence];
  }

  return [
    "Saya cek potensi desa/komoditas dari data peta dan evidence yang tersedia.",
    ...evidence,
    "Agar analisis lebih tajam, kirim wilayah, komoditas, volume, musim panen, dan bukti pasokan.",
  ];
}

function financingReadinessLines(message: string) {
  const normalized = normalize(message);
  const hasAmount = /\b(?:rp|rupiah)\s*\d|(?:\d+(?:[.,]\d+)?)\s*(?:juta|ribu|jt)\b/i.test(message);
  const productivePurpose = /\b(pupuk|benih|bibit|panen|musim tanam|modal usaha|usaha|produksi|stok|alat tani|komoditas|kopi|padi|beras|sawit|cabai|jagung)\b/i.test(normalized);
  const repayment = /\b(bayar|cicil|angsuran|setelah panen|panen|mingguan|bulanan|tenor|rencana bayar)\b/i.test(normalized);
  const riskyPurpose = /\b(konsumtif|pribadi|gadget|hp|liburan|judi|tidak tahu|belum tahu|tanpa usaha|tidak ada usaha)\b/i.test(normalized);

  if (riskyPurpose || (!productivePurpose && hasAmount)) {
    return [
      "Status awal: Perlu revisi sebelum review komite.",
      "Alasan: tujuan pembiayaan belum terkait usaha/komoditas produktif atau rencana bayar belum jelas.",
      "Lengkapi tujuan produktif, nominal wajar, rencana bayar, sumber pembayaran, dan bukti usaha/panen.",
    ];
  }

  if (hasAmount && productivePurpose && repayment) {
    return [
      "Status awal: Siap masuk review komite.",
      "Alasan: nominal, tujuan produktif, dan rencana bayar sudah terbaca dari pesan.",
      "Data yang tetap diminta: bukti usaha/panen, status anggota terverifikasi, dan catatan pengurus.",
    ];
  }

  return [
    "Status awal: Data belum lengkap.",
    "Kirim nominal, tujuan penggunaan, rencana bayar, sumber pembayaran, dan bukti usaha/panen.",
  ];
}

function buildFallbackReply(input: OrchestratedWaReplyInput, toolSummary: AgentToolRunSummary, outOfScope: boolean) {
  const payloadType = input.payloadType ?? "text";
  const reviewPolicy = getWaReviewPolicy(input.intent, payloadType, input.message);

  if (outOfScope) {
    return formatSections([
      {
        title: "Di Luar Scope",
        lines: [
          "Mohon maaf, saya hanya bisa membantu topik Lumbung Bersama/koperasi desa: potensi komoditas, harga koperasi, stok, buyer readiness, pembiayaan readiness, dokumen, laporan, dan integrasi.",
          "Balas menu untuk memilih agent koperasi.",
        ],
      },
    ]);
  }

  const normalized = normalize(input.message);
  if (["puas", "tidak", "tidak puas", "terima kasih", "terimakasih", "makasih", "thanks", "thank you"].includes(normalized)) {
    return "Terima kasih. Percakapan saya tutup sebagai selesai. Ketik menu bila nanti membutuhkan bantuan lagi.";
  }

  if (normalized === "operator" || normalized === "panggil operator") {
    return formatSections([
      { title: "Operator", lines: ["Saya teruskan percakapan ini ke operator.", ...statusLines(input.queueId, reviewPolicy.mode, reviewPolicy.slaText)] },
      { title: "Catatan", lines: ["Ada lagi yang bisa saya bantu?", quickWaActionsText()] },
    ]);
  }

  return formatSections([
    { title: scopeTitle(toolSummary.scope), lines: fallbackLinesForScope(input, toolSummary) },
    { title: "Status", lines: statusLines(reviewPolicy.shouldQueue ? input.queueId : null, reviewPolicy.mode, reviewPolicy.slaText) },
    { title: "Lanjutkan", lines: ["Ada lagi yang bisa saya bantu?", quickWaActionsText()] },
  ]);
}

function sanitizeProviderReply(reply: string) {
  return reply
    .replace(/\b(?:DATABASE_URL|DB_PASSWORD|OPENAI_API_KEY|AI_API_KEY|WHATSAPP_[A-Z0-9_]+|WA_PERSONAL_[A-Z0-9_]+)\b/gi, "[secret-redacted]")
    .replace(/\b\d{10,16}@s\.whatsapp\.net\b/gi, "[wa-redacted]")
    .replace(/\b(?:\+?62|0)\d{8,13}\b/g, "[nomor-redacted]")
    .trim();
}

export async function buildOrchestratedWaReply(input: OrchestratedWaReplyInput): Promise<OrchestratedWaReply> {
  const payloadType = input.payloadType ?? "text";
  const reviewPolicy = getWaReviewPolicy(input.intent, payloadType, input.message);
  const outOfScope = isWaMessageOutOfScope(input.message, payloadType);
  const toolSummary = outOfScope
    ? {
        scope: "intake" as const,
        tools: [],
        evidenceLines: [],
        restrictions: ["Scope hanya Lumbung Bersama/koperasi desa."],
        handoffHints: ["Balas menu untuk memilih agent koperasi."],
      }
    : await runScopedAgentTools({
        cooperativeId: input.cooperativeId,
        cooperativeProvince: input.cooperativeProvince,
        cooperativeRegency: input.cooperativeRegency,
        agentName: input.intent.label,
        module: input.draft?.module ?? input.intent.module,
        message: input.message,
      });

  const legacyFallback = buildWaOperationalReply({
    intent: input.intent,
    draft: input.draft,
    message: input.message,
    payloadType,
    queueId: input.queueId,
    mediaSummary: input.mediaSummary,
    commodityDetails: input.commodityDetails ?? [],
  });
  const fallbackReply = buildFallbackReply(input, toolSummary, outOfScope) || legacyFallback;
  const provider = outOfScope
    ? {
        configured: false,
        used: false,
        mode: "rules-out-of-scope",
        providerLabel: "not-used",
        model: null,
      }
    : await runWaReplyProvider({
        agentName: input.intent.label,
        agentJob: input.intent.bot,
        module: input.draft?.module ?? input.intent.module,
        message: input.message,
        payloadType,
        reviewMode: reviewPolicy.mode,
        queueId: input.queueId,
        fallbackReply,
        toolSummary,
      });

  return {
    reply: provider.reply ? sanitizeProviderReply(provider.reply) : fallbackReply,
    toolSummary,
    provider,
    outOfScope,
  };
}

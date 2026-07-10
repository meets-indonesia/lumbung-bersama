"use client";

import { useEffect, useState } from "react";
import { Activity, ExternalLink, Loader2, ServerCog } from "lucide-react";
import { integrationChecks } from "@/lib/pilot-data";

type HealthResponse = {
  app: string;
  mode: string;
  checkedAt: string;
  integrations: Array<{
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
};

type OpenDataSourcesResponse = {
  registryStatus: string;
  sourceLabels: string[];
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
    coverage: string;
    refreshStrategy: string;
    status: string;
    notes: string;
    sourceLabel: string;
    integrationClaim: string;
  }>;
  p0Roadmap: Array<{
    id: string;
    title: string;
    sources: string[];
    output: string;
    caveat: string;
  }>;
};

function publicStatusLabel(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "Belum dicek";
  if (/unconfigured|not[-_\s]?configured|not[-_\s]?ready/i.test(raw)) return "Perlu aktivasi";
  if (/operator[-_\s]?ready|configured|implemented|ready|application/i.test(raw)) return "Siap dipakai";
  if (/loading/i.test(raw)) return "Memuat";
  if (/env|setup|required|static|fallback|pilot/i.test(raw)) return "Perlu aktivasi";
  if (/source-discovery|discovery/i.test(raw)) return "Discovery";
  if (/planned|connector/i.test(raw)) return "Direncanakan";
  if (/manual|reference/i.test(raw)) return "Referensi";
  return publicProductText(raw, "Belum dicek").replace(/[-_]/g, " ");
}

function publicProductText(value: unknown, fallback = "Belum tersedia") {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  if (
    /DATABASE_URL|HACKATHON_SHARED_DATABASE_URL|DB_HOST|DB_PORT|DB_DATABASE|DB_USERNAME|DB_PASSWORD|POSTGRES|postgres|env\b|environment/i.test(
      raw,
    )
  ) {
    return fallback;
  }
  return raw
    .replace(/setup[-_\s]?required/gi, "perlu aktivasi")
    .replace(/operator[-_\s]?ready/gi, "siap dipakai")
    .replace(/pilot[-_\s]?fallback/gi, "mode pilot")
    .replace(/shared[-_\s]?db/gi, "sumber eksplorasi")
    .replace(/Postgres|postgres|database/gi, "data operasional")
    .replace(/\bdb\b/gi, "data")
    .replace(/credentials?/gi, "akses resmi")
    .replace(/\bfallback\b/gi, "jalur cadangan")
    .replace(/\bconnector\b/gi, "konektor")
    .replace(/smoke test/gi, "uji koneksi");
}

function publicSourceLabel(value: string) {
  return publicProductText(value)
    .replace(/shared[-_\s]?db/gi, "Sumber eksplorasi")
    .replace(/source-discovery/gi, "discovery")
    .replace(/connector-planned/gi, "direncanakan")
    .replace(/\bdb\b/gi, "data");
}

function registryPolicyLabel(value: string) {
  if (/externalClaims/i.test(value)) return "Batas klaim eksternal";
  if (/sharedDbScope/i.test(value)) return "Cakupan bukti agregat";
  if (/privacy/i.test(value)) return "Privasi";
  return publicSourceLabel(value);
}

export function IntegrationClient() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sourceRegistry, setSourceRegistry] = useState<OpenDataSourcesResponse | null>(null);
  const [sourceStatus, setSourceStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  async function loadSourceRegistry() {
    setSourceStatus("loading");
    try {
      const response = await fetch("/api/open-data/sources", { cache: "no-store" });
      const payload = (await response.json()) as OpenDataSourcesResponse;
      if (!response.ok) throw new Error("Source registry belum tersedia.");
      setSourceRegistry(payload);
      setSourceStatus("ready");
    } catch {
      setSourceRegistry(null);
      setSourceStatus("error");
    }
  }

  async function checkHealth() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/health");
      const data = (await response.json()) as HealthResponse;
      setHealth(data);
    } catch {
      setError("Pemeriksaan koneksi gagal. Pastikan aplikasi berjalan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSourceRegistry();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = health?.integrations ?? integrationChecks.map((item) => ({
    name: item.name,
    required: item.env.split(",").map((envName) => envName.trim()),
    configured: false,
    status: "pilot-fallback",
    fallback: item.fallback,
  }));
  const prioritizedSources = sourceRegistry?.sources.filter((source) =>
    /(bps|big|bapanas|pihps|kemendag|sisp|wilayah|bpk|jdih|kemenkop|idm|sdgs)/i.test(
      `${source.id} ${source.name} ${source.category} ${source.sourceLabel}`,
    ),
  ) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#C92A2A]">
          Kesiapan integrasi produksi
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
          Siap pilot, jelas soal aktivasi.
        </h1>
        <p className="mt-4 text-base font-semibold leading-8 text-[#53606A]">
          Fitur produksi seperti WhatsApp resmi, AI live, data operasional,
          storage, dan mapping SIMKOPDES membutuhkan aktivasi. App ini
          menampilkan status dan jalur cadangan secara eksplisit.
        </p>
        <button
          type="button"
          onClick={checkHealth}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#1D5D8F] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#A5B8C6] focus-visible:lb-focus"
        >
          {loading ? (
            <Loader2 size={17} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
          ) : (
            <Activity size={17} strokeWidth={2.2} aria-hidden="true" />
          )}
          Cek koneksi
        </button>
        {error ? (
          <p className="mt-4 rounded-[14px] bg-[#FDEAEA] p-4 text-sm font-extrabold text-[#A82020]">
            {error}
          </p>
        ) : null}
        {health ? (
          <p className="mt-4 rounded-[14px] bg-[#E7F5E8] p-4 text-sm font-extrabold text-[#236327]">
            Koneksi dicek: {new Date(health.checkedAt).toLocaleString("id-ID")}. Status: {publicStatusLabel(health.mode)}.
          </p>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#7A4E2D]">
              Checklist aktivasi
            </p>
            <h2 className="mt-2 text-2xl font-black">Status integrasi</h2>
          </div>
          <ServerCog size={28} strokeWidth={2.2} className="text-[#1D5D8F]" aria-hidden="true" />
        </div>

        <div className="mt-5 space-y-3">
          {rows.map((item) => (
            <article key={item.name} className="rounded-[16px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-black text-[#1F2933]">{item.name}</h3>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${
                    item.configured
                      ? "bg-[#E7F5E8] text-[#236327]"
                      : "bg-[#FFF3D8] text-[#7A4E2D]"
                  }`}
                >
                  {item.configured ? "Siap dipakai" : publicStatusLabel(item.status)}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#53606A]">
                Prasyarat aktivasi: {item.required.length} item
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-[#7A4E2D]">
                Jalur cadangan: {publicProductText(item.fallback, "Mode pilot tersedia saat aktivasi belum lengkap.")}
              </p>
            </article>
          ))}
        </div>
        {health?.whatsapp?.setup ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[16px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7A4E2D]">
                WhatsApp resmi
              </p>
              <p className="mt-2 text-lg font-black text-[#1F2933]">
                {publicStatusLabel(health.whatsapp.setup.cloudApi?.send)}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">
                {publicProductText(health.whatsapp.setup.cloudApi?.message, "Kanal resmi perlu dicek dari server.")}
              </p>
            </div>
            <div className="rounded-[16px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7A4E2D]">
                QR kanal uji
              </p>
              <p className="mt-2 text-lg font-black text-[#1F2933]">
                {publicStatusLabel(health.whatsapp.setup.personalBridge?.status)}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">
                {publicProductText(health.whatsapp.setup.personalBridge?.message, "Kanal uji perlu diaktifkan untuk menampilkan QR.")}
              </p>
              <p className="mt-2 text-xs font-bold text-[#7A4E2D]">
                PDF: {health.whatsapp.setup.personalBridge?.capabilities?.pdfTextExtraction ? "siap" : "perlu cek"}; OCR gambar:{" "}
                {health.whatsapp.setup.personalBridge?.capabilities?.imageOcr ? "aktif" : "opsional"}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#7A4E2D]">
              Kesiapan sumber bukti
            </p>
            <h2 className="mt-2 text-2xl font-black">Registry sumber eksternal</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#53606A]">
              Panel ini membedakan calon sumber bukti, konektor yang perlu aktivasi, dan integrasi yang sudah diuji.
              Tidak ada klaim impor otomatis sebelum konektor berjalan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSourceRegistry()}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] px-4 py-2 text-sm font-extrabold text-[#7A4E2D] transition hover:border-[#D79A2B] focus-visible:lb-focus"
          >
            {sourceStatus === "loading" ? (
              <Loader2 size={16} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
            ) : (
              <Activity size={16} strokeWidth={2.2} aria-hidden="true" />
            )}
            Muat ulang sumber
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["Registry", publicStatusLabel(sourceRegistry?.registryStatus ?? sourceStatus), "Status daftar sumber eksternal"],
            ["Label bukti", sourceRegistry?.sourceLabels.length ?? 0, "Label bukti yang boleh tampil di UI"],
            ["Rencana aktivasi", sourceRegistry?.p0Roadmap.length ?? 0, "Calon konektor tanpa klaim berlebih"],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-[16px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7A4E2D]">{label}</p>
              <p className="mt-2 text-2xl font-black text-[#1F2933]">{value}</p>
              <p className="mt-1 text-xs font-bold leading-5 text-[#53606A]">{note}</p>
            </div>
          ))}
        </div>

        {sourceStatus === "error" ? (
          <p className="mt-4 rounded-[14px] bg-[#FDEAEA] p-4 text-sm font-extrabold text-[#A82020]">
            Registry sumber gagal dimuat. Pemeriksaan koneksi tetap bisa diulang.
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {(prioritizedSources.length ? prioritizedSources : sourceRegistry?.sources ?? []).slice(0, 8).map((source) => (
            <article key={source.id} className="rounded-[16px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-black text-[#1F2933]">{source.name}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#7A4E2D]">
                    {publicProductText(source.category, "Sumber bukti")} - {publicStatusLabel(source.integrationClaim)}
                  </p>
                </div>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-[10px] border border-[#E0B25E]/60 bg-[#FFF3D8] px-3 py-1.5 text-xs font-extrabold text-[#7A4E2D] hover:border-[#D79A2B] focus-visible:lb-focus"
                  >
                    Sumber
                    <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#53606A]">{publicProductText(source.notes, "Catatan sumber belum tersedia.")}</p>
              <div className="mt-3 grid gap-2 text-xs font-bold text-[#53606A] sm:grid-cols-2">
                <span className="rounded-[10px] border border-[#E7DED1] bg-[#FFFCF5] px-3 py-2">
                  Cakupan: {publicProductText(source.coverage, "Belum tersedia")}
                </span>
                <span className="rounded-[10px] border border-[#E7DED1] bg-[#FFFCF5] px-3 py-2">
                  Pembaruan: {publicProductText(source.refreshStrategy, "Belum dijadwalkan")}
                </span>
              </div>
            </article>
          ))}
        </div>

        {sourceRegistry?.registryPolicy ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Object.entries(sourceRegistry.registryPolicy).map(([key, value]) => (
              <div key={key} className="rounded-[14px] border border-[#E0B25E]/60 bg-[#FFF3D8] p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7A4E2D]">{registryPolicyLabel(key)}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-[#53606A]">{publicSourceLabel(value)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

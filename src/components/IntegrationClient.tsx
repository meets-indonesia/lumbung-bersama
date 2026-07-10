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
      setError("Health check gagal. Pastikan dev server berjalan.");
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
          Integrasi Production Readiness
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
          Siap pilot, jujur soal env gate.
        </h1>
        <p className="mt-4 text-base font-semibold leading-8 text-[#53606A]">
          Fitur produksi seperti WhatsApp asli, AI live, database, storage, dan
          SIMKOPDES mapping membutuhkan credential. App ini menampilkan status
          dan fallback secara eksplisit.
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
          Test API Health
        </button>
        {error ? (
          <p className="mt-4 rounded-[14px] bg-[#FDEAEA] p-4 text-sm font-extrabold text-[#A82020]">
            {error}
          </p>
        ) : null}
        {health ? (
          <p className="mt-4 rounded-[14px] bg-[#E7F5E8] p-4 text-sm font-extrabold text-[#236327]">
            Health checked: {health.checkedAt}. Mode: {health.mode}.
          </p>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#7A4E2D]">
              Env Checklist
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
                  {item.configured ? "Configured" : item.status}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#53606A]">
                Required: {item.required.join(", ")}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-[#7A4E2D]">
                Fallback: {item.fallback}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#7A4E2D]">
              Open data source readiness
            </p>
            <h2 className="mt-2 text-2xl font-black">Registry sumber eksternal</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#53606A]">
              Panel ini membedakan source candidate, env-gated connector, dan integrasi yang sudah di-smoke test.
              Tidak ada klaim import otomatis sebelum connector berjalan.
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
            Refresh source
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["Registry", sourceRegistry?.registryStatus ?? sourceStatus, "Status dari /api/open-data/sources"],
            ["Source labels", sourceRegistry?.sourceLabels.length ?? 0, "Label evidence yang boleh dipakai di UI"],
            ["P0 roadmap", sourceRegistry?.p0Roadmap.length ?? 0, "Connector candidate tanpa overclaim"],
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
            Source registry gagal dimuat. Endpoint tetap dicek oleh smoke test agar tidak 404.
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {(prioritizedSources.length ? prioritizedSources : sourceRegistry?.sources ?? []).slice(0, 8).map((source) => (
            <article key={source.id} className="rounded-[16px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-black text-[#1F2933]">{source.name}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#7A4E2D]">
                    {source.category} - {source.integrationClaim}
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
              <p className="mt-3 text-sm font-semibold leading-6 text-[#53606A]">{source.notes}</p>
              <div className="mt-3 grid gap-2 text-xs font-bold text-[#53606A] sm:grid-cols-2">
                <span className="rounded-[10px] border border-[#E7DED1] bg-[#FFFCF5] px-3 py-2">
                  Coverage: {source.coverage}
                </span>
                <span className="rounded-[10px] border border-[#E7DED1] bg-[#FFFCF5] px-3 py-2">
                  Refresh: {source.refreshStrategy}
                </span>
              </div>
            </article>
          ))}
        </div>

        {sourceRegistry?.registryPolicy ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Object.entries(sourceRegistry.registryPolicy).map(([key, value]) => (
              <div key={key} className="rounded-[14px] border border-[#E0B25E]/60 bg-[#FFF3D8] p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7A4E2D]">{key}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-[#53606A]">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

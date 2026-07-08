"use client";

import { useState } from "react";
import { Activity, Loader2, ServerCog } from "lucide-react";
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

export function IntegrationClient() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");

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

  const rows = health?.integrations ?? integrationChecks.map((item) => ({
    name: item.name,
    required: item.env.split(",").map((envName) => envName.trim()),
    configured: false,
    status: "pilot-fallback",
    fallback: item.fallback,
  }));

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
    </div>
  );
}

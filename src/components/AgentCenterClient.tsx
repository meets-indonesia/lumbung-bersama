"use client";

import { useState } from "react";
import { Bot, Loader2, Play, ShieldCheck } from "lucide-react";
import { aiAgents } from "@/lib/pilot-data";

type AgentResult = {
  agent: string;
  recordId: string;
  status: string;
  envMode: string;
  checks: string[];
  output: string;
  explanation: string;
  nextAction: string;
};

export function AgentCenterClient() {
  const [activeAgent, setActiveAgent] = useState(aiAgents[0].name);
  const [recordId, setRecordId] = useState("LB-1024");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);

  async function runAgent(agentName = activeAgent) {
    setActiveAgent(agentName);
    setLoading(true);
    const response = await fetch("/api/agents/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName, recordId }),
    });
    const data = (await response.json()) as AgentResult;
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#C92A2A]">
          Agen Rekomendasi
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
          Tiga agent untuk flow MVP.
        </h1>
        <p className="mt-4 text-base font-semibold leading-8 text-[#53606A]">
          Fokus hanya pada unggulan desa, pasar dan mitra, serta laporan aksi.
          Saat API key belum aktif, hasil memakai rules lokal dan tetap perlu
          approval manusia.
        </p>

        <label htmlFor="record-id" className="mt-6 block text-sm font-extrabold text-[#1F2933]">
          Nomor catatan
        </label>
        <input
          id="record-id"
          value={recordId}
          onChange={(event) => setRecordId(event.target.value)}
          className="mt-2 w-full rounded-[14px] border border-[#E7DED1] bg-white px-4 py-3 font-mono text-sm font-bold text-[#1F2933] outline-none focus:border-[#D79A2B]"
        />

        <div className="mt-6 grid gap-3">
          {aiAgents.map((agent) => (
            <button
              key={agent.name}
              type="button"
              onClick={() => runAgent(agent.name)}
              className={`rounded-[16px] border p-4 text-left transition focus-visible:lb-focus ${
                activeAgent === agent.name
                  ? "border-[#C92A2A] bg-[#FFF3D8]"
                  : "border-[#E7DED1] bg-[#FFF8EA] hover:border-[#D79A2B]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-[#1F2933]">{agent.name}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#53606A]">{agent.job}</p>
                </div>
                <span className="rounded-full bg-[#F4EBDD] px-3 py-1 text-xs font-extrabold text-[#7A4E2D]">
                  {agent.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#7A4E2D]">
              Agent Run
            </p>
            <h2 className="mt-2 text-2xl font-black">Trace dan hasil</h2>
          </div>
          <div className="rounded-[18px] bg-[#F4EBDD] p-3 text-[#7A4E2D]">
            <Bot size={24} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => runAgent()}
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-5 py-3 text-sm font-extrabold text-[#FFF8EA] disabled:cursor-not-allowed disabled:bg-[#C9B8A4] focus-visible:lb-focus"
        >
          {loading ? (
            <Loader2 size={17} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
          ) : (
            <Play size={17} strokeWidth={2.2} aria-hidden="true" />
          )}
          Jalankan agent aktif
        </button>

        {result ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[16px] border border-[#E7DED1] bg-[#FFF8EA] p-4">
              <p className="text-sm font-extrabold text-[#7A4E2D]">Output</p>
              <p className="mt-2 text-xl font-black text-[#1F2933]">{result.output}</p>
              <p className="mt-2 text-sm font-semibold leading-7 text-[#53606A]">{result.explanation}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.checks.map((check) => (
                <div key={check} className="rounded-[14px] border border-[#E7DED1] bg-white p-4">
                  <ShieldCheck size={18} strokeWidth={2.2} className="text-[#2F7D32]" aria-hidden="true" />
                  <p className="mt-2 text-sm font-extrabold text-[#1F2933]">{check}</p>
                </div>
              ))}
            </div>
            <div className="rounded-[16px] bg-[#F4EBDD] p-4 text-sm font-bold leading-7 text-[#7A4E2D]">
              Next action: {result.nextAction}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[18px] border border-dashed border-[#D79A2B] bg-[#FFF8EA] p-8 text-center">
            <p className="text-lg font-black text-[#1F2933]">Belum ada agent run.</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#7A4E2D]">
              Pilih agent atau tekan Jalankan agent aktif.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { featureModules, waIntents } from "@/lib/pilot-data";
import { StatusBadge } from "./StatusBadge";

export function WhatsAppHubClient() {
  const [selectedId, setSelectedId] = useState(waIntents[0].id);
  const [message, setMessage] = useState(waIntents[0].sample);
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [botReply, setBotReply] = useState(waIntents[0].bot);

  const selectedIntent = useMemo(
    () => waIntents.find((intent) => intent.id === selectedId) ?? waIntents[0],
    [selectedId],
  );

  const targetModule = featureModules.find(
    (module) => module.title === selectedIntent.module,
  );

  function chooseIntent(id: string) {
    const intent = waIntents.find((item) => item.id === id) ?? waIntents[0];
    setSelectedId(intent.id);
    setMessage(intent.sample);
    setBotReply(intent.bot);
    setState("idle");
  }

  function sendMessage() {
    if (message.trim().length < 8) {
      setState("error");
      setBotReply("Pesan terlalu pendek. Mohon tulis laporan atau pertanyaan yang lebih jelas.");
      return;
    }

    setState("loading");
    window.setTimeout(() => {
      setState("sent");
      setBotReply(selectedIntent.bot);
    }, 500);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#C92A2A]">
          WA Center
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
          Semua fitur bisa dimulai dari WA.
        </h1>
        <p className="mt-4 text-base font-semibold leading-8 text-[#53606A]">
          Pilih intent, kirim pesan operasional, lalu lanjut ke modul operasional.
          Dalam mode produksi, pesan asli masuk melalui WhatsApp Business API.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {waIntents.map((intent) => (
            <button
              key={intent.id}
              type="button"
              onClick={() => chooseIntent(intent.id)}
              className={`rounded-[14px] border p-4 text-left transition focus-visible:lb-focus ${
                selectedId === intent.id
                  ? "border-[#C92A2A] bg-[#FFF3D8]"
                  : "border-[#E7DED1] bg-[#FFF8EA] hover:border-[#D79A2B]"
              }`}
            >
              <p className="font-extrabold text-[#1F2933]">{intent.label}</p>
              <p className="mt-2 text-xs font-bold text-[#7A4E2D]">
                Modul: {intent.module}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#7A4E2D]">
              Simulasi Chat
            </p>
            <h2 className="mt-2 text-2xl font-black">WA Lumbung Bersama</h2>
          </div>
          <StatusBadge tone={state === "sent" ? "success" : state === "error" ? "risk" : "review"}>
            {state === "loading" ? "Memproses" : state === "sent" ? "Terkirim" : state === "error" ? "Perlu Pesan" : "Pilot"}
          </StatusBadge>
        </div>

        <div className="mt-5 rounded-[18px] bg-[#F4EBDD] p-4">
          <div className="rounded-[16px] bg-[#E7F5E8] p-4 text-sm font-bold leading-7 text-[#236327]">
            {message || "Tulis pesan warga di bawah."}
          </div>
          <div className="mt-4 rounded-[16px] bg-[#FFF8EA] p-4 text-sm font-bold leading-7 text-[#1F2933]">
            {state === "loading" ? "Sedang diproses agent pilot..." : botReply}
          </div>
        </div>

        <label htmlFor="wa-message" className="mt-5 block text-sm font-extrabold text-[#1F2933]">
          Pesan warga
        </label>
        <textarea
          id="wa-message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setState("idle");
          }}
          rows={4}
          className={`mt-2 w-full rounded-[14px] border bg-white p-4 text-base font-semibold leading-7 text-[#1F2933] outline-none focus:border-[#D79A2B] ${
            state === "error" ? "border-[#A82020] ring-2 ring-[#FDEAEA]" : "border-[#E7DED1]"
          }`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={sendMessage}
            disabled={state === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-5 py-3 text-sm font-extrabold text-[#FFF8EA] disabled:cursor-not-allowed disabled:bg-[#C9B8A4] focus-visible:lb-focus"
          >
            {state === "loading" ? (
              <Loader2 size={17} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={17} strokeWidth={2.2} aria-hidden="true" />
            )}
            Kirim Pesan Operasional
          </button>
          <Link
            href={targetModule ? `/modules/${targetModule.slug}` : "/modules"}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] px-5 py-3 text-sm font-extrabold text-[#1F2933] focus-visible:lb-focus"
          >
            Lanjut ke Modul
            <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-4 rounded-[14px] border border-dashed border-[#D79A2B] bg-[#FFF8EA] p-4 text-sm font-bold leading-6 text-[#7A4E2D]">
          <CheckCircle2 size={18} strokeWidth={2.2} className="mr-2 inline text-[#2F7D32]" aria-hidden="true" />
          Production gate: pengiriman WA asli butuh `WHATSAPP_BUSINESS_TOKEN`.
        </div>
      </section>
    </div>
  );
}

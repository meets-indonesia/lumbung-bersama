"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mic,
  RotateCcw,
  Send,
} from "lucide-react";
import { demoVoiceNote, extractedSubmission } from "@/lib/demo-data";
import { StatusBadge } from "./StatusBadge";

type FormState = "empty" | "filled" | "loading" | "success" | "error";

export function VoiceDemoClient() {
  const [transcript, setTranscript] = useState(demoVoiceNote);
  const [formState, setFormState] = useState<FormState>("filled");
  const [showResult, setShowResult] = useState(true);
  const [lastAction, setLastAction] = useState("Draft catatan siap ditinjau operator.");

  const validation = useMemo(() => {
    if (!transcript.trim()) {
      return {
        valid: false,
        message: "Isi transcript voice note terlebih dahulu.",
      };
    }
    if (transcript.trim().length < 25) {
      return {
        valid: false,
        message: "Transcript terlalu pendek untuk diekstrak menjadi data koperasi.",
      };
    }
    return {
      valid: true,
      message: "Transcript cukup untuk simulasi ekstraksi data.",
    };
  }, [transcript]);

  function handleTranscriptChange(value: string) {
    setTranscript(value);
    setShowResult(false);
    if (!value.trim()) {
      setFormState("empty");
      setLastAction("Menunggu transcript voice note warga.");
      return;
    }
    setFormState("filled");
    setLastAction("Transcript berubah. Jalankan ekstraksi ulang.");
  }

  function runExtraction() {
    if (!validation.valid) {
      setFormState("error");
      setShowResult(false);
      setLastAction(validation.message);
      return;
    }

    setFormState("loading");
    setShowResult(false);
    setLastAction("AI sedang membaca transcript.");

    window.setTimeout(() => {
      setFormState("success");
      setShowResult(true);
      setLastAction("Data berhasil diekstrak sebagai draft catatan.");
    }, 650);
  }

  function resetDemo() {
    setTranscript(demoVoiceNote);
    setFormState("filled");
    setShowResult(true);
    setLastAction("Form dikembalikan ke contoh voice note kopi.");
  }

  const borderClass =
    formState === "error"
      ? "border-[#A82020] ring-2 ring-[#FDEAEA]"
      : formState === "success"
        ? "border-[#2F7D32] ring-2 ring-[#E7F5E8]"
        : "border-[#E7DED1] focus-within:border-[#D79A2B]";

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5 shadow-[0_18px_50px_rgba(122,78,45,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#C92A2A]">
              Simulasi Voice Note
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1F2933] sm:text-5xl">
              Dari suara warga menjadi draft data.
            </h1>
          </div>
          <div className="hidden h-14 w-14 items-center justify-center rounded-[18px] bg-[#F4EBDD] text-[#7A4E2D] sm:flex">
            <Mic size={26} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>

        <label
          htmlFor="voice-transcript"
          className="mt-7 block text-sm font-extrabold text-[#1F2933]"
        >
          Transcript voice note warga
        </label>
        <div className={`mt-3 rounded-[16px] border bg-white p-3 ${borderClass}`}>
          <textarea
            id="voice-transcript"
            value={transcript}
            onChange={(event) => handleTranscriptChange(event.target.value)}
            rows={7}
            required
            aria-describedby="voice-transcript-help"
            className="min-h-36 w-full resize-none bg-transparent text-base font-semibold leading-7 text-[#1F2933] outline-none placeholder:text-[#9A8F82]"
            placeholder="Contoh: Panen padi minggu depan kira-kira 5 kuintal di Blok C."
          />
        </div>
        <div
          id="voice-transcript-help"
          className="mt-3 flex items-start gap-2 text-sm font-semibold text-[#7A4E2D]"
        >
          {validation.valid ? (
            <CheckCircle2 size={18} strokeWidth={2.2} className="mt-0.5 text-[#2F7D32]" aria-hidden="true" />
          ) : (
            <AlertCircle size={18} strokeWidth={2.2} className="mt-0.5 text-[#A82020]" aria-hidden="true" />
          )}
          <span>{validation.message}</span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={runExtraction}
            disabled={formState === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-5 py-3 text-base font-extrabold text-[#FFF8EA] transition hover:bg-[#A82020] disabled:cursor-not-allowed disabled:bg-[#C9B8A4] focus-visible:lb-focus"
          >
            {formState === "loading" ? (
              <Loader2 size={18} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={18} strokeWidth={2.2} aria-hidden="true" />
            )}
            Ekstrak Data
          </button>
          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] px-5 py-3 text-base font-extrabold text-[#1F2933] transition hover:border-[#D79A2B] focus-visible:lb-focus"
          >
            <RotateCcw size={18} strokeWidth={2.2} aria-hidden="true" />
            Reset
          </button>
        </div>

        <div className="mt-5 rounded-[14px] bg-[#F4EBDD] p-4 text-sm font-bold leading-6 text-[#7A4E2D]">
          Status: {lastAction}
        </div>

        <div className="mt-4 rounded-[14px] border border-dashed border-[#D79A2B] bg-[#FFF8EA] p-4">
          <p className="text-sm font-extrabold text-[#1F2933]">
            Kirim WhatsApp asli
          </p>
          <p className="mt-2 text-sm leading-6 text-[#7A4E2D]">
            Fitur ini aktif setelah konfigurasi produksi. Butuh token WhatsApp dan
            `WHATSAPP_PHONE_NUMBER_ID`. Mode sekarang hanya pratinjau lokal.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-[12px] bg-[#E7DED1] px-5 py-3 text-sm font-extrabold text-[#7A4E2D]"
          >
            WhatsApp asli belum aktif
          </button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5 shadow-[0_18px_50px_rgba(122,78,45,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#7A4E2D]">
              Hasil Ekstraksi
            </p>
            <h2 className="mt-3 text-2xl font-black text-[#1F2933]">
              Draft operator
            </h2>
          </div>
          <StatusBadge tone={showResult ? "success" : "review"}>
            {showResult ? "Siap Dicek" : "Belum Diekstrak"}
          </StatusBadge>
        </div>

        {showResult ? (
          <div className="mt-6 space-y-4">
            {[
              ["Nomor catatan", extractedSubmission.recordId],
              ["Sumber", extractedSubmission.source],
              ["Komoditas", extractedSubmission.commodity],
              ["Estimasi jumlah", extractedSubmission.quantity],
              ["Kondisi", extractedSubmission.condition],
              ["Status", extractedSubmission.status],
              ["Keyakinan AI", extractedSubmission.confidence],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4 sm:grid-cols-[0.45fr_0.55fr]"
              >
                <p className="text-sm font-extrabold text-[#7A4E2D]">{label}</p>
                <p className="text-sm font-bold text-[#1F2933]">{value}</p>
              </div>
            ))}

            <div className="rounded-[14px] border border-[#E7DED1] bg-white p-4">
              <p className="text-sm font-extrabold text-[#7A4E2D]">
                Data yang masih perlu diminta
              </p>
              <ul className="mt-3 space-y-2">
                {extractedSubmission.missing.map((item) => (
                  <li key={item} className="text-sm font-bold text-[#1F2933]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#1F2933] px-5 py-3 text-base font-extrabold text-[#FFF8EA] transition hover:bg-[#303B44] focus-visible:lb-focus"
            >
              Lanjut ke Queue Operator
              <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-[18px] border border-dashed border-[#D79A2B] bg-[#FFF8EA] p-8 text-center">
            <p className="text-lg font-black text-[#1F2933]">
              Jalankan ekstraksi untuk melihat draft data.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#7A4E2D]">
              Panel ini sengaja kosong sampai tombol Ekstrak Data
              digunakan.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

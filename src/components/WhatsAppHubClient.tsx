"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Mic,
  Send,
} from "lucide-react";
import {
  WA_AGENT_INTENTS,
  WA_AGENT_MODULES,
  type WaPayloadType,
} from "@/lib/wa-operator-queue";
import { StatusBadge } from "./StatusBadge";

type HubState = "idle" | "loading" | "ready" | "setup" | "error";

type WaSetupPayload = {
  status?: "ready" | "setup-required";
  missing?: string[];
  send?: { status?: "ready" | "setup-required"; missing?: string[] };
  webhook?: { status?: "ready" | "setup-required"; missing?: string[] };
  pairing?: { message?: string };
};

type WaAgentPayload = {
  lbQueueId?: string | null;
  module?: string;
  moduleRoute?: string;
  deliveryStatus?: string;
  mediaStatus?: string;
  humanReviewStatus?: string;
  caveat?: string;
};

const WA_ENV_LABELS: Record<string, string> = {
  WHATSAPP_VERIFY_TOKEN: "verify token",
  WHATSAPP_APP_SECRET: "app secret",
  WHATSAPP_BUSINESS_TOKEN: "business token",
  WHATSAPP_PHONE_NUMBER_ID: "phone number id",
};

const DEFAULT_WA_INTENT = WA_AGENT_INTENTS[0];
const PAYLOAD_OPTIONS: Array<{
  type: WaPayloadType;
  label: string;
  helper: string;
  icon: typeof MessageSquare;
}> = [
  {
    type: "text",
    label: "Teks",
    helper: "Draft catatan dari isi pesan.",
    icon: MessageSquare,
  },
  {
    type: "image",
    label: "Foto",
    helper: "Media masuk, OCR manual.",
    icon: ImageIcon,
  },
  {
    type: "audio",
    label: "Voice",
    helper: "Voice note perlu transkripsi.",
    icon: Mic,
  },
  {
    type: "document",
    label: "Dokumen",
    helper: "Lampiran perlu review.",
    icon: FileText,
  },
];

function setupSummary(setup?: WaSetupPayload) {
  if (!setup) return "Setup aplikasi belum lengkap. Cek DATABASE_URL, login operator, dan env WhatsApp.";
  const missing = setup?.missing ?? [
    ...(setup?.send?.missing ?? []),
    ...(setup?.webhook?.missing ?? []),
  ];
  if (!missing.length) return "Setup WA Cloud API siap.";
  const labels = missing.map((item) => WA_ENV_LABELS[item] ?? item);
  return `Setup WA Cloud API belum lengkap: ${labels.join(", ")}.`;
}

export function WhatsAppHubClient() {
  const [selectedId, setSelectedId] = useState(DEFAULT_WA_INTENT.id);
  const [message, setMessage] = useState(DEFAULT_WA_INTENT.sample);
  const [payloadType, setPayloadType] = useState<WaPayloadType>("text");
  const [state, setState] = useState<HubState>("idle");
  const [botReply, setBotReply] = useState(DEFAULT_WA_INTENT.bot);
  const [savedStatus, setSavedStatus] = useState("");

  const selectedIntent = useMemo(
    () => WA_AGENT_INTENTS.find((intent) => intent.id === selectedId) ?? DEFAULT_WA_INTENT,
    [selectedId],
  );

  function chooseIntent(id: string) {
    const intent = WA_AGENT_INTENTS.find((item) => item.id === id) ?? DEFAULT_WA_INTENT;
    setSelectedId(intent.id);
    setMessage(intent.sample);
    setBotReply(intent.bot);
    setSavedStatus("");
    setState("idle");
  }

  async function sendMessage() {
    if (payloadType === "text" && message.trim().length < 8) {
      setState("error");
      setBotReply("Pesan terlalu pendek. Mohon tulis laporan atau pertanyaan yang lebih jelas.");
      setSavedStatus("");
      return;
    }

    setState("loading");
    setSavedStatus("");

    try {
      const response = await fetch("/api/wa/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "Warga",
          message,
          intentId: selectedIntent.id,
          payloadType,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      const setup = payload.setup as WaSetupPayload | undefined;

      if (!response.ok) {
        const setupRequired =
          response.status === 503 ||
          payload.status === "setup-required" ||
          setup?.status === "setup-required";
        setState(setupRequired ? "setup" : "error");
        setBotReply(payload.message ?? payload.error ?? `WA API gagal (${response.status}).`);
        setSavedStatus(setupRequired ? setupSummary(setup) : "Belum tersimpan. Cek login dan role operator.");
        return;
      }

      const saved = payload.message as {
        id?: string;
        botReply?: string;
        status?: string;
        module?: string;
      };
      const agent = payload.agent as WaAgentPayload | undefined;
      const cloudReady = setup?.status === "ready";
      setState(cloudReady ? "ready" : "setup");
      setBotReply(saved.botReply ?? selectedIntent.bot);
      setSavedStatus(
        [
          `${saved.id ?? "Pesan"} tersimpan sebagai draft.`,
          agent?.lbQueueId ? `Queue ${agent.lbQueueId}.` : "",
          agent?.module ? `Modul: ${agent.module}.` : "",
          agent?.mediaStatus ?? "",
          cloudReady ? "Live delivery belum dilakukan dan tetap perlu approval operator." : setupSummary(setup),
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (error) {
      setState("error");
      setBotReply(error instanceof Error ? error.message : "WA API tidak merespons.");
      setSavedStatus("Belum tersimpan. Cek login, DATABASE_URL, dan seed koperasi.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#C92A2A]">
          WA Center
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
          WA sebagai kanal verifikasi operasional.
        </h1>
        <p className="mt-4 text-base font-semibold leading-8 text-[#53606A]">
          Pilih intent, simulasikan pesan warga/operator, lalu simpan sebagai draft follow-up.
          Live delivery hanya diklaim jika WhatsApp Graph API benar-benar sukses.
        </p>

        <div className="mt-5 rounded-[16px] border border-dashed border-[#D79A2B] bg-[#FFF8EA] p-4 text-sm font-bold leading-6 text-[#7A4E2D]">
          <CheckCircle2 size={18} strokeWidth={2.2} className="mr-2 inline text-[#2F7D32]" aria-hidden="true" />
          Support channel: AI membuat draft, queue, checklist, dan next action; approval buyer, stok, harga, dan pinjaman tetap di operator koperasi.
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {WA_AGENT_INTENTS.map((intent) => (
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
          <StatusBadge
            tone={
              state === "ready"
                ? "success"
                : state === "setup"
                  ? "warning"
                  : state === "error"
                    ? "risk"
                    : "review"
            }
          >
            {state === "loading"
              ? "Memproses"
              : state === "ready"
                ? "Ready"
                : state === "setup"
                  ? "Setup Required"
                  : state === "error"
                    ? "Perlu Cek"
                    : "Pilot"}
          </StatusBadge>
        </div>

        <div className="mt-5 rounded-[18px] bg-[#F4EBDD] p-4">
          <div className="rounded-[16px] bg-[#E7F5E8] p-4 text-sm font-bold leading-7 text-[#236327]">
            {message || "Tulis pesan warga di bawah."}
          </div>
          <div className="mt-4 rounded-[16px] bg-[#FFF8EA] p-4 text-sm font-bold leading-7 text-[#1F2933]">
            {state === "loading" ? "Sedang menyimpan ke WA API..." : botReply}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {PAYLOAD_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = payloadType === option.type;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => {
                  setPayloadType(option.type);
                  setSavedStatus("");
                  setState("idle");
                }}
                className={`min-h-[86px] rounded-[14px] border p-3 text-left transition focus-visible:lb-focus ${
                  active
                    ? "border-[#C92A2A] bg-[#FFF3D8]"
                    : "border-[#E7DED1] bg-white hover:border-[#D79A2B]"
                }`}
              >
                <Icon size={18} strokeWidth={2.2} className="text-[#C92A2A]" aria-hidden="true" />
                <span className="mt-2 block text-sm font-extrabold text-[#1F2933]">{option.label}</span>
                <span className="mt-1 block text-xs font-bold leading-5 text-[#7A4E2D]">{option.helper}</span>
              </button>
            );
          })}
        </div>

        <label htmlFor="wa-message" className="mt-5 block text-sm font-extrabold text-[#1F2933]">
          Pesan atau caption warga
        </label>
        <textarea
          id="wa-message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setSavedStatus("");
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
            Simpan Draft + Queue
          </button>
          <Link
            href={selectedIntent.moduleRoute}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] px-5 py-3 text-sm font-extrabold text-[#1F2933] focus-visible:lb-focus"
          >
            Lanjut ke Modul
            <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </div>

        {savedStatus ? (
          <div className={`mt-4 rounded-[14px] border p-4 text-sm font-bold leading-6 ${
            state === "ready"
              ? "border-[#B7D9B9] bg-[#E7F5E8] text-[#236327]"
              : state === "setup"
                ? "border-[#E2C58E] bg-[#FFF8EA] text-[#7A4E2D]"
              : "border-[#F0C6C6] bg-[#FFE3E3] text-[#9B1C1C]"
          }`}>
            {savedStatus}
          </div>
        ) : null}

        <div className="mt-4 rounded-[14px] border border-dashed border-[#D79A2B] bg-[#FFF8EA] p-4 text-sm font-bold leading-6 text-[#7A4E2D]">
          <CheckCircle2 size={18} strokeWidth={2.2} className="mr-2 inline text-[#2F7D32]" aria-hidden="true" />
          Production gate: local intake butuh `DATABASE_URL` dan login operator; Cloud API butuh token, phone number id, verify token, dan app secret. QR pairing tidak tersedia untuk adapter Cloud API.
        </div>

        <div className="mt-4 rounded-[14px] border border-[#E7DED1] bg-white p-4">
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#7A4E2D]">
            Coverage Modul WA
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {WA_AGENT_MODULES.map((module) => (
              <div key={module.title} className="rounded-[12px] bg-[#FFF8EA] p-3">
                <p className="text-sm font-extrabold text-[#1F2933]">{module.title}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-[#7A4E2D]">{module.coverage}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

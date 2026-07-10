"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { stitchAssets } from "@/lib/stitch-assets";

type LoginClientProps = {
  next: string;
};

export function LoginClient({ next }: LoginClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.length >= 8 && status !== "loading",
    [email, password, status],
  );

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus("error");
      setMessage(payload.message ?? payload.error ?? "Login gagal. Periksa credential operator.");
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#0F1519] text-[#FFF8EA]">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <img
          alt=""
          src={stitchAssets.heroVillage}
          className="h-full w-full scale-105 object-cover opacity-[0.18] mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(215,154,43,0.18),transparent_28rem),linear-gradient(90deg,rgba(15,21,25,0.98)_0%,rgba(15,21,25,0.92)_48%,rgba(15,21,25,0.76)_100%)]" />
      </div>
      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <section className="flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <Link href="/" className="flex min-w-0 flex-col gap-2 focus-visible:lb-focus">
              <span className="w-fit rounded-[10px] border border-[#E7DED1]/80 bg-[#FFF8EA]/95 p-2 shadow-[0_18px_46px_rgba(0,0,0,0.22)]">
                <img
                  alt="Lumbung Bersama"
                  src={stitchAssets.dashboardLogo}
                  className="h-16 w-auto max-w-[min(68vw,19rem)] object-contain sm:h-20"
                />
              </span>
              <span className="w-fit rounded-[4px] border border-[#1F2933] bg-[#172027]/80 px-2.5 py-1 font-mono text-xs font-semibold text-[#E7DED1]/70">
                Village Command Center
              </span>
            </Link>
            <Link
              href="/"
              className="rounded-[4px] border border-[#1F2933] bg-[#172027] px-3 py-2 text-sm font-semibold text-[#CFC3B2] transition hover:border-[#D79A2B] hover:text-[#FFF8EA] focus-visible:lb-focus"
            >
              Kembali
            </Link>
          </div>

          <div className="py-10 lg:py-0">
            <div className="inline-flex items-center gap-2 rounded-[4px] border border-[#1F2933] bg-[#172027] px-3 py-1.5 text-sm font-semibold text-[#D79A2B]">
              <ShieldCheck size={16} strokeWidth={2.2} aria-hidden="true" />
              Akses operator terproteksi
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.05] tracking-normal sm:text-6xl">
              Masuk ke ruang kerja koperasi.
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-[#CFC3B2]">
              Dashboard hanya untuk operator dan pengurus. Laporan warga tetap
              masuk dari WhatsApp Business setelah webhook produksi diaktifkan.
            </p>
            <div className="mt-8 grid gap-3 text-sm font-medium text-[#CFC3B2] sm:grid-cols-3">
              {[
                "Session httpOnly",
                "Tidak ada register publik",
                "API operator terkunci",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-[4px] border border-[#1F2933] bg-[#172027] p-3">
                  <CheckCircle2 size={17} strokeWidth={2.2} className="text-[#88D982]" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="hidden max-w-md text-xs font-medium leading-6 text-[#CFC3B2]/70 lg:block">
            Credential dibuat dari environment server. Ganti password setelah
            deploy awal dan jangan simpan credential di dokumen publik.
          </p>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-[480px] rounded-[6px] border border-[#2A343C] bg-[#172027]/92 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-md sm:p-6">
            <div className="rounded-[4px] border border-[#2A343C] bg-[#111A20]/96 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-[4px] bg-[#C92A2A] text-[#FFE5E2]">
                <LockKeyhole size={22} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-normal">Login operator</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#CFC3B2]">
                Gunakan akun admin yang sudah disiapkan di server.
              </p>

              <form onSubmit={submitLogin} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-[#E7DED1]">Email operator</span>
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-[4px] border border-[#1F2933] bg-[#0F1519] px-4 py-3 text-sm font-medium text-[#FFF8EA] outline-none transition placeholder:text-[#CFC3B2]/35 focus:border-[#D79A2B] focus-visible:lb-focus"
                    placeholder="admin@lumbung-bersama.meetsin.id"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#E7DED1]">Password</span>
                  <span className="mt-2 flex rounded-[4px] border border-[#1F2933] bg-[#0F1519] px-4 py-3 transition focus-within:border-[#D79A2B] focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[#D79A2B]/45">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#FFF8EA] outline-none placeholder:text-[#CFC3B2]/35"
                      placeholder="Masukkan password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="ml-2 rounded-lg p-1 text-[#CFC3B2] transition hover:text-[#FFF8EA] focus-visible:lb-focus"
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? (
                        <EyeOff size={18} strokeWidth={2.2} aria-hidden="true" />
                      ) : (
                        <Eye size={18} strokeWidth={2.2} aria-hidden="true" />
                      )}
                    </button>
                  </span>
                </label>

                {message ? (
                  <div className="rounded-[4px] border border-[#C92A2A]/50 bg-[#C92A2A]/10 p-3 text-sm font-medium leading-6 text-[#FFB4AC]">
                    {message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#C92A2A] px-5 py-3 text-sm font-bold text-[#FFE5E2] transition hover:bg-[#A82020] disabled:cursor-not-allowed disabled:bg-[#42302E] disabled:text-[#CFC3B2]/55 focus-visible:lb-focus"
                >
                  {status === "loading" ? (
                    <Loader2 size={18} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
                  )}
                  Masuk dashboard
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

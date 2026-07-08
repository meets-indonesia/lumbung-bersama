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
import { BrandMark } from "./BrandMark";

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
    <main className="min-h-[100dvh] bg-[#FFF8EA] text-[#1F2933]">
      <div className="mx-auto grid min-h-[100dvh] max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <section className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <BrandMark />
            <Link
              href="/"
              className="rounded-[10px] border border-[#E7DED1] bg-[#FFFCF5] px-3 py-2 text-sm font-semibold text-[#53606A] transition hover:border-[#D79A2B] hover:text-[#1F2933] focus-visible:lb-focus"
            >
              Kembali
            </Link>
          </div>

          <div className="py-10 lg:py-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E7DED1] bg-[#FFFCF5] px-3 py-1.5 text-sm font-semibold text-[#7A4E2D]">
              <ShieldCheck size={16} strokeWidth={2.2} aria-hidden="true" />
              Akses operator terproteksi
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.05] tracking-normal sm:text-6xl">
              Masuk ke ruang kerja koperasi.
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-[#53606A]">
              Dashboard hanya untuk operator dan pengurus. Laporan warga tetap
              masuk dari WhatsApp Business setelah webhook produksi diaktifkan.
            </p>
            <div className="mt-8 grid gap-3 text-sm font-medium text-[#53606A] sm:grid-cols-3">
              {[
                "Session httpOnly",
                "Tidak ada register publik",
                "API operator terkunci",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-[14px] border border-[#E7DED1] bg-[#FFFCF5] p-3">
                  <CheckCircle2 size={17} strokeWidth={2.2} className="text-[#2F7D32]" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="hidden max-w-md text-xs font-medium leading-6 text-[#7A4E2D] lg:block">
            Credential dibuat dari environment server. Ganti password setelah
            deploy awal dan jangan simpan credential di dokumen publik.
          </p>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-[480px] rounded-[22px] border border-[#E7DED1] bg-[#FFFCF5] p-5 shadow-[0_24px_70px_rgba(122,78,45,0.12)] sm:p-6">
            <div className="rounded-[18px] border border-[#E7DED1] bg-white p-5">
              <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#1F2933] text-[#FFF8EA]">
                <LockKeyhole size={22} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-normal">Login operator</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#53606A]">
                Gunakan akun admin yang sudah disiapkan di server.
              </p>

              <form onSubmit={submitLogin} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-[#1F2933]">Email operator</span>
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-[12px] border border-[#D9CFC0] bg-[#FFF8EA] px-4 py-3 text-sm font-medium outline-none transition focus:border-[#D79A2B] focus-visible:lb-focus"
                    placeholder="admin@lumbung-bersama.meetsin.id"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#1F2933]">Password</span>
                  <span className="mt-2 flex rounded-[12px] border border-[#D9CFC0] bg-[#FFF8EA] px-4 py-3 transition focus-within:border-[#D79A2B] focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[#D79A2B]/45">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
                      placeholder="Masukkan password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="ml-2 rounded-lg p-1 text-[#53606A] transition hover:text-[#1F2933] focus-visible:lb-focus"
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
                  <div className="rounded-[12px] border border-[#F1C6C6] bg-[#FFF1F1] p-3 text-sm font-medium leading-6 text-[#A82020]">
                    {message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-5 py-3 text-sm font-bold text-[#FFF8EA] transition hover:bg-[#A82020] disabled:cursor-not-allowed disabled:bg-[#CBB8A5] focus-visible:lb-focus"
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

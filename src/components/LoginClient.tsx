"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
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

type LoginPayload = {
  error?: unknown;
  message?: unknown;
};

function publicLoginMessage(payload: LoginPayload) {
  const raw = typeof payload.message === "string" ? payload.message.trim() : "";
  const code = typeof payload.error === "string" ? payload.error.trim() : "";
  const combined = `${code} ${raw}`;
  if (!raw) return "Login gagal. Periksa akun operator.";
  if (/auth_not_configured|not_configured|required|database|connection|schema|seed|configuration/i.test(combined)) {
    return "Akses login belum tersedia. Hubungi penanggung jawab aplikasi.";
  }
  if (/same-origin|mutation|csrf|security/i.test(combined)) {
    return "Sesi keamanan tidak valid. Muat ulang halaman login lalu coba lagi.";
  }
  return raw;
}

export function LoginClient({ next }: LoginClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const emailReady = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const passwordReady = password.length >= 8;
  const isLoading = status === "loading";
  const showEmailError = emailTouched && email.trim().length > 0 && !emailReady;
  const showPasswordError = passwordTouched && password.length > 0 && !passwordReady;

  const canSubmit = useMemo(
    () => emailReady && passwordReady && !isLoading,
    [emailReady, passwordReady, isLoading],
  );

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!canSubmit) {
      setStatus("error");
      setMessage("Isi email dan password operator untuk melanjutkan.");
      return;
    }

    setStatus("loading");
    setMessage("");

    let response: Response;
    let payload: LoginPayload;

    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      payload = (await response.json().catch(() => ({}))) as LoginPayload;
    } catch {
      setStatus("error");
      setMessage("Koneksi login belum berhasil. Coba lagi.");
      return;
    }

    if (!response.ok) {
      setStatus("error");
      setMessage(publicLoginMessage(payload));
      return;
    }

    setStatus("success");
    setMessage("Login berhasil. Dashboard operator dibuka.");
    window.setTimeout(() => {
      router.replace(next);
      router.refresh();
    }, 350);
  }

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#0F1519] text-[#FFF8EA]">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image
          alt=""
          src={stitchAssets.heroVillage}
          fill
          sizes="100vw"
          className="h-full w-full scale-105 object-cover opacity-[0.16] mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,21,25,0.98)_0%,rgba(15,21,25,0.94)_45%,rgba(15,21,25,0.72)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,248,234,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,248,234,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60" />
      </div>
      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <Link href="/" className="group flex min-w-0 items-center gap-4 focus-visible:lb-focus">
              <span className="grid h-16 w-20 shrink-0 place-items-center rounded-[6px] border border-[#E7DED1]/80 bg-[#FFF8EA]/95 p-2 shadow-[0_18px_46px_rgba(0,0,0,0.22)] sm:h-20 sm:w-24">
                <Image
                  alt="Lumbung Bersama"
                  src={stitchAssets.dashboardLogo}
                  width={160}
                  height={78}
                  className="max-h-full w-auto object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-black leading-none tracking-normal text-white sm:text-3xl">
                  Lumbung Bersama
                </span>
                <span className="mt-2 block w-fit rounded-[4px] border border-[#E7DED1]/15 bg-[#FFF8EA]/8 px-2.5 py-1 text-xs font-semibold text-[#E7DED1]/78">
                  Ruang kerja koperasi
                </span>
              </span>
            </Link>
            <Link
              href="/"
              className="rounded-[4px] border border-[#E7DED1]/12 bg-[#FFF8EA]/8 px-3 py-2 text-sm font-semibold text-[#CFC3B2] transition duration-200 hover:border-[#D79A2B]/70 hover:bg-[#FFF8EA]/12 hover:text-[#FFF8EA] active:translate-y-px focus-visible:lb-focus"
            >
              Kembali
            </Link>
          </div>

          <div className="py-10 lg:py-0">
            <div className="inline-flex items-center gap-2 rounded-[4px] border border-[#D79A2B]/24 bg-[#D79A2B]/10 px-3 py-1.5 text-sm font-semibold text-[#F4C86C] shadow-[0_12px_34px_rgba(0,0,0,0.16)]">
              <ShieldCheck size={16} strokeWidth={2.2} aria-hidden="true" />
              Akses operator terproteksi
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.04] tracking-normal text-white sm:text-6xl">
              Masuk ke ruang kerja koperasi.
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-[#CFC3B2]">
              Masuk untuk mengikuti alur 5 langkah: peta potensi, rekomendasi
              produk, buyer awal, stok/kesiapan, dan laporan aksi dari satu
              ruang kerja.
            </p>
            <div className="mt-8 grid gap-3 text-sm font-medium text-[#CFC3B2] sm:grid-cols-3">
              {[
                "Alur 5 langkah",
                "Review manusia",
                "Tanpa data pribadi publik",
              ].map((item) => (
                <div key={item} className="flex min-h-14 items-center gap-2 rounded-[4px] border border-[#E7DED1]/10 bg-[#FFF8EA]/7 p-3 shadow-[inset_0_1px_0_rgba(255,248,234,0.05)]">
                  <CheckCircle2 size={17} strokeWidth={2.2} className="text-[#88D982]" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="hidden max-w-md text-xs font-medium leading-6 text-[#CFC3B2]/70 lg:block">
            Gunakan hanya akun yang diberikan penanggung jawab aplikasi. Jangan
            tampilkan detail akses pada materi publik.
          </p>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-[486px] rounded-[8px] border border-[#E7DED1]/14 bg-[#172027]/86 p-4 shadow-[0_32px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-5">
            <div className="rounded-[6px] border border-[#E7DED1]/12 bg-[#111A20]/96 p-5 shadow-[inset_0_1px_0_rgba(255,248,234,0.05)] sm:p-6">
              <div className="grid h-12 w-12 place-items-center rounded-[4px] bg-[#C92A2A] text-[#FFE5E2] shadow-[0_14px_32px_rgba(201,42,42,0.22)]">
                <LockKeyhole size={22} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-normal text-white">Login operator</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#CFC3B2]">
                Gunakan akun resmi yang sudah diberikan untuk masuk ke dashboard.
              </p>

              <form onSubmit={submitLogin} className="mt-6 space-y-4" noValidate aria-busy={isLoading}>
                <label className="block">
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold text-[#E7DED1]">
                    Email operator
                    {showEmailError ? (
                      <span className="text-xs font-semibold text-[#FFB4AC]">Format belum valid</span>
                    ) : null}
                  </span>
                  <input
                    id="operator-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onBlur={() => setEmailTouched(true)}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (status === "error") {
                        setStatus("idle");
                        setMessage("");
                      }
                    }}
                    aria-invalid={showEmailError}
                    aria-describedby={showEmailError ? "operator-email-error" : undefined}
                    className={`mt-2 w-full rounded-[4px] border bg-[#0F1519] px-4 py-3 text-sm font-medium text-[#FFF8EA] outline-none transition duration-200 placeholder:text-[#CFC3B2]/35 focus:border-[#D79A2B] focus-visible:lb-focus ${
                      showEmailError ? "border-[#C92A2A]/70" : "border-[#E7DED1]/12"
                    }`}
                    placeholder="admin@lumbung-bersama.meetsin.id"
                  />
                  {showEmailError ? (
                    <p id="operator-email-error" className="mt-2 text-xs font-semibold leading-5 text-[#FFB4AC]">
                      Masukkan alamat email operator yang benar.
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold text-[#E7DED1]">
                    Password
                    {showPasswordError ? (
                      <span className="text-xs font-semibold text-[#FFB4AC]">Minimal 8 karakter</span>
                    ) : null}
                  </span>
                  <span
                    className={`mt-2 flex rounded-[4px] border bg-[#0F1519] px-4 py-3 transition duration-200 focus-within:border-[#D79A2B] focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[#D79A2B]/45 ${
                      showPasswordError ? "border-[#C92A2A]/70" : "border-[#E7DED1]/12"
                    }`}
                  >
                    <input
                      id="operator-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      minLength={8}
                      value={password}
                      onBlur={() => setPasswordTouched(true)}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (status === "error") {
                          setStatus("idle");
                          setMessage("");
                        }
                      }}
                      aria-invalid={showPasswordError}
                      aria-describedby={showPasswordError ? "operator-password-error" : undefined}
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
                  {showPasswordError ? (
                    <p id="operator-password-error" className="mt-2 text-xs font-semibold leading-5 text-[#FFB4AC]">
                      Password perlu diisi lengkap sebelum masuk.
                    </p>
                  ) : null}
                </label>

                {isLoading ? (
                  <div
                    className="rounded-[4px] border border-[#D79A2B]/28 bg-[#D79A2B]/9 p-3 text-sm font-semibold text-[#F4C86C]"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>Memeriksa akses</span>
                      <span className="h-2 w-20 overflow-hidden rounded-full bg-[#FFF8EA]/10">
                        <span className="block h-full w-10 animate-pulse rounded-full bg-[#D79A2B]/70" />
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2" aria-hidden="true">
                      <span className="h-2 rounded-full bg-[#FFF8EA]/10" />
                      <span className="h-2 w-7/12 rounded-full bg-[#FFF8EA]/10" />
                    </div>
                  </div>
                ) : null}

                {message ? (
                  <div
                    className={`rounded-[4px] border p-3 text-sm font-medium leading-6 ${
                      status === "success"
                        ? "border-[#2F7D32]/55 bg-[#2F7D32]/14 text-[#CFF6D1]"
                        : "border-[#C92A2A]/50 bg-[#C92A2A]/10 text-[#FFB4AC]"
                    }`}
                    role={status === "success" ? "status" : "alert"}
                    aria-live={status === "success" ? "polite" : "assertive"}
                  >
                    <span className="inline-flex items-center gap-2">
                      {status === "success" ? (
                        <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden="true" />
                      ) : (
                        <AlertCircle size={16} strokeWidth={2.2} aria-hidden="true" />
                      )}
                      <span>{message}</span>
                    </span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-[#C92A2A] px-5 py-3 text-sm font-bold text-[#FFE5E2] shadow-[0_18px_38px_rgba(201,42,42,0.24)] transition duration-200 hover:bg-[#A82020] active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#42302E] disabled:text-[#CFC3B2]/55 disabled:shadow-none focus-visible:lb-focus"
                >
                  {isLoading ? (
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

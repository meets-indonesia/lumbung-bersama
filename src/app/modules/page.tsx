import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ModuleCard } from "@/components/ModuleCard";
import { featureModules } from "@/lib/demo-data";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Flow MVP",
  description:
    "Flow MVP Lumbung Bersama untuk peta potensi, rekomendasi, buyer matching, readiness stok, laporan aksi, dan fitur pendukung.",
};

export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login?next=/modules");
  const coreModules = featureModules.filter((module) => module.status === "Core MVP");
  const supportModules = featureModules.filter((module) => module.status !== "Core MVP");

  return (
    <main className="min-h-[100dvh] bg-[#FFF8EA] px-4 py-5 text-[#1F2933] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-[10px] border border-[#E7DED1] bg-[#FFFCF5] px-4 py-2 text-sm font-extrabold text-[#1F2933] focus-visible:lb-focus"
        >
          <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
          Kembali ke dashboard
        </Link>
        <section className="mt-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#C92A2A]">
            Flow MVP
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            Fokus kerja: peta potensi sampai laporan aksi.
          </h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-[#53606A]">
            Modul pendukung tetap tersedia, tetapi presentasi utama sebaiknya
            mengikuti urutan core MVP agar tidak melebar menjadi super-app.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {coreModules.map((module) => (
              <ModuleCard key={module.slug} {...module} />
            ))}
          </div>
          <h2 className="mt-12 text-2xl font-black">Fitur pendukung</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {supportModules.map((module) => (
              <ModuleCard key={module.slug} {...module} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

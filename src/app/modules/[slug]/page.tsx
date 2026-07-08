import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { featureDetails, featureModules } from "@/lib/demo-data";
import { getCurrentUserFromCookies } from "@/lib/auth";

type ModulePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return featureModules.map((module) => ({ slug: module.slug }));
}

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { slug } = await params;
  const moduleDetail = featureDetails[slug];

  if (!moduleDetail) {
    return { title: "Modul Tidak Ditemukan" };
  }

  return {
    title: moduleDetail.title,
    description: moduleDetail.intro,
  };
}

export default async function ModuleDetailPage({ params }: ModulePageProps) {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login?next=/modules");

  const { slug } = await params;
  const detail = featureDetails[slug];
  const featureModule = featureModules.find((item) => item.slug === slug);

  if (!detail || !featureModule) {
    notFound();
  }

  const sections = [
    ["WA flows", detail.waFlows],
    ["Agent checks", detail.agentChecks],
    ["Operator actions", detail.operatorActions],
    ["Output operasional", detail.operationalOutputs],
  ] as const;

  return (
    <main className="min-h-[100dvh] bg-[#FFF8EA] px-4 py-5 text-[#1F2933] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/modules"
          className="inline-flex items-center gap-2 rounded-[10px] border border-[#E7DED1] bg-[#FFFCF5] px-4 py-2 text-sm font-extrabold text-[#1F2933] focus-visible:lb-focus"
        >
          <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
          Semua modul
        </Link>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-6">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#C92A2A]">
              {featureModule.status}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
              {detail.title}
            </h1>
            <p className="mt-5 text-lg font-semibold leading-8 text-[#53606A]">
              {detail.intro}
            </p>
            <div className="mt-6 rounded-[18px] bg-[#F4EBDD] p-5">
              <div className="flex items-center gap-2 text-[#7A4E2D]">
                <MessageCircle size={20} strokeWidth={2.2} aria-hidden="true" />
                <p className="font-extrabold">WA command contoh</p>
              </div>
              <p className="mt-3 text-xl font-black text-[#1F2933]">
                {featureModule.waCommand}
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/wa"
                className="inline-flex justify-center rounded-[12px] bg-[#C92A2A] px-5 py-3 text-sm font-extrabold text-[#FFF8EA] focus-visible:lb-focus"
              >
                Buka WA Center
              </Link>
              <Link
                href={slug === "peta-unggulan" ? "/peta-unggulan" : "/agents"}
                className="inline-flex justify-center rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] px-5 py-3 text-sm font-extrabold text-[#1F2933] focus-visible:lb-focus"
              >
                {slug === "peta-unggulan" ? "Buka Peta Unggulan" : "Jalankan Agent"}
              </Link>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {sections.map(([title, items]) => (
              <article
                key={title}
                className="rounded-[20px] border border-[#E7DED1] bg-[#FFFCF5] p-5"
              >
                <h2 className="text-xl font-black">{title}</h2>
                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <div
                      key={item}
                      className="rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] px-4 py-3 text-sm font-extrabold text-[#1F2933]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

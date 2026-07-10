import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { IntegrationClient } from "@/components/IntegrationClient";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Integrasi",
  description:
    "Status kesiapan integrasi untuk WhatsApp Business, AI, database, storage, dan SIMKOPDES mapping.",
};

export const dynamic = "force-dynamic";

export default async function IntegrasiPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login?next=/integrasi");

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
        <div className="mt-6">
          <IntegrationClient />
        </div>
      </div>
    </main>
  );
}

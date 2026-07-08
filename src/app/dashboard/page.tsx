import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard Operator",
  description:
    "Dashboard Lumbung Bersama untuk queue verifikasi, stok gerai, ekspor CSV, dan readiness integrasi.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login?next=/dashboard");

  return <DashboardClient initialUser={user} />;
}

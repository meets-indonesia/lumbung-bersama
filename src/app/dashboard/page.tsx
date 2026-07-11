import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClient, type DashboardData } from "@/components/DashboardClient";
import { getCurrentUserFromCookies, SESSION_COOKIE } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard Operator",
  description:
    "Dashboard Lumbung Bersama untuk queue verifikasi, stok gerai, ekspor CSV, dan readiness integrasi.",
};

export const dynamic = "force-dynamic";

async function preloadDashboardData() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const controller = new AbortController();
  const timeout = windowSafeTimeout(() => controller.abort(), 900);

  try {
    const baseUrl =
      process.env.DASHBOARD_INTERNAL_BASE_URL?.trim() ||
      `http://127.0.0.1:${process.env.PORT?.trim() || "3000"}`;
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      cache: "no-store",
      headers: {
        cookie: `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return (await response.json()) as DashboardData;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function windowSafeTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

export default async function DashboardPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login?next=/dashboard");

  const initialDashboardData = await preloadDashboardData();

  return <DashboardClient initialUser={user} initialDashboardData={initialDashboardData} />;
}

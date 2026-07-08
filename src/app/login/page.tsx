import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginClient } from "@/components/LoginClient";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Masuk Operator",
  description:
    "Login operator Lumbung Bersama untuk mengakses dashboard koperasi, notifikasi, profil, dan integrasi WhatsApp.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUserFromCookies();
  const params = await searchParams;
  const next = safeNext(params.next);

  if (user) redirect(next);

  return <LoginClient next={next} />;
}

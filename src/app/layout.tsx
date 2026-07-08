import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lumbungbersama.id"),
  applicationName: "Lumbung Bersama",
  title: {
    default: "Lumbung Bersama | Platform Operasional Koperasi Desa",
    template: "%s | Lumbung Bersama",
  },
  description:
    "Platform operasional koperasi desa berbasis WhatsApp untuk laporan warga, komoditas unggulan, stok, buyer, pembiayaan, dan laporan yang bisa diverifikasi.",
  keywords: [
    "koperasi desa",
    "koperasi merah putih",
    "komoditas unggulan desa",
    "WhatsApp koperasi",
    "dashboard koperasi",
    "peta unggulan desa",
    "Lumbung Bersama",
  ],
  authors: [{ name: "Lumbung Bersama" }],
  creator: "Lumbung Bersama",
  publisher: "Lumbung Bersama",
  category: "civic technology",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.svg?v=4", type: "image/svg+xml" },
      { url: "/favicon.ico?v=4", sizes: "any" },
    ],
    shortcut: "/favicon.ico?v=4",
    apple: "/icon.svg?v=4",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Lumbung Bersama | Platform Operasional Koperasi Desa",
    description:
      "Dari WhatsApp warga menjadi data koperasi yang bisa diverifikasi untuk stok, komoditas unggulan, buyer, pembiayaan, dan laporan.",
    url: "https://lumbungbersama.id",
    siteName: "Lumbung Bersama",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Lumbung Bersama | Platform Operasional Koperasi Desa",
    description:
      "Platform WhatsApp-first untuk laporan warga, komoditas unggulan, stok, buyer, pembiayaan, dan laporan koperasi.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

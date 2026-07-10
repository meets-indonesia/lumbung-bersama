import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lumbungbersama.id"),
  applicationName: "Lumbung Bersama",
  title: {
    default: "Lumbung Bersama | Peta Peluang dan Aksi Koperasi Desa",
    template: "%s | Lumbung Bersama",
  },
  description:
    "Ruang kerja koperasi desa untuk memetakan potensi, merekomendasikan komoditas, mencocokkan buyer, mengecek readiness stok, dan membuat laporan aksi.",
  keywords: [
    "koperasi desa",
    "koperasi merah putih",
    "komoditas unggulan desa",
    "buyer matching koperasi",
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
    title: "Lumbung Bersama | Peta Peluang dan Aksi Koperasi Desa",
    description:
      "Dari potensi desa menjadi rekomendasi komoditas, buyer matching lite, readiness stok, dan laporan aksi yang bisa diverifikasi.",
    url: "https://lumbungbersama.id",
    siteName: "Lumbung Bersama",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Lumbung Bersama | Peta Peluang dan Aksi Koperasi Desa",
    description:
      "Peta potensi, rekomendasi komoditas, buyer matching lite, readiness stok, dan laporan aksi untuk koperasi desa.",
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

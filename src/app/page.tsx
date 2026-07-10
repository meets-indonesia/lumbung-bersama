import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileDown,
  Handshake,
  Layers3,
  MapPinned,
  Network,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { stitchAssets } from "@/lib/stitch-assets";
import {
  brand,
  buyerMatches,
  indonesiaOpportunityRegions,
  nationalDataSources,
  stockItems,
} from "@/lib/pilot-data";

const mvpName = "Lumbung Bersama - Koperasi Opportunity & Offtaker Radar";

function publicStatusLabel(value: string) {
  if (/ready|implemented/i.test(value)) return "Aktif";
  if (/env|setup|required/i.test(value)) return "Perlu aktivasi";
  if (/planned|connector/i.test(value)) return "Direncanakan";
  if (/manual|reference/i.test(value)) return "Referensi";
  if (/discovery/i.test(value)) return "Discovery";
  return value.replace(/[-_]/g, " ");
}

const mvpFlow = [
  {
    step: "01",
    title: "Peta Potensi Desa",
    copy: "Wilayah, komoditas, aset, dan karakter desa menjadi pintu masuk analisis.",
    icon: MapPinned,
  },
  {
    step: "02",
    title: "Skor Peluang",
    copy: "Skor menjelaskan potensi, kesiapan koperasi, stok, pasar, kemitraan, dan tingkat keyakinan.",
    icon: BarChart3,
  },
  {
    step: "03",
    title: "Kecocokan Buyer Awal",
    copy: "Produk desa dicocokkan dengan tipe kebutuhan buyer tanpa klaim komitmen atau checkout.",
    icon: Handshake,
  },
  {
    step: "04",
    title: "Kesiapan Stok",
    copy: "Stok, kualitas, bukti media, dan celah logistik dibaca sebelum kontak buyer.",
    icon: Warehouse,
  },
  {
    step: "05",
    title: "Kesiapan Pembiayaan",
    copy: "Status dokumen dan komite dibaca sebagai checklist kesiapan, bukan persetujuan otomatis.",
    icon: ShieldCheck,
  },
  {
    step: "06",
    title: "Laporan Aksi",
    copy: "Pengurus mendapat ringkasan bukti, risiko, keputusan, dan tindak lanjut.",
    icon: FileDown,
  },
];

const guardrails = [
  {
    title: "AI dengan review manusia",
    copy: "AI memberi rekomendasi berbasis aturan dan data. Keputusan tetap oleh operator atau pengurus.",
    icon: ShieldCheck,
  },
  {
    title: "Bukti lebih dulu",
    copy: "Setiap aksi punya status sumber: input warga, operator, data operasional, sumber eksplorasi terbatas, atau calon konektor resmi.",
    icon: ClipboardCheck,
  },
  {
    title: "Koperasi sebagai trust layer",
    copy: "Fokusnya bukan transaksi checkout, tetapi kesiapan usaha dan koordinasi koperasi.",
    icon: Network,
  },
];

const faqItems = [
  {
    question: "Landing ini menjual apa?",
    answer:
      "Bukan toko online. Ini ruang kerja koperasi untuk mengubah data potensi desa menjadi keputusan operasional yang bisa diverifikasi.",
  },
  {
    question: "Apakah sumber eksplorasi dipakai sebagai sumber utama?",
    answer:
      "Tidak. Sumber eksplorasi hanya bukti terbatas. Data operasional tim dipakai untuk syarat buyer, riwayat stok, dan bukti media.",
  },
  {
    question: "Kenapa buyer tidak disebut nama asli?",
    answer:
      "MVP memakai tipe kebutuhan buyer agar tidak membuat klaim komitmen palsu. Kontak buyer tetap butuh verifikasi pengurus.",
  },
  {
    question: "Alur pertama yang harus dibuka?",
    answer:
      "Mulai dari Peta Unggulan, lalu masuk dashboard operator untuk rekomendasi, kesiapan stok, buyer matching, dan laporan aksi.",
  },
];

const mapShapes = [
  ["M86 92 C122 62 172 62 203 94 C234 127 246 175 226 212 C205 251 149 258 116 231 C82 202 54 124 86 92 Z", 0, "Sumatera", 146, 157],
  ["M250 240 C286 230 331 232 359 246 C346 264 297 267 254 258 C242 255 240 246 250 240 Z", 1, "Jawa Barat", 304, 249],
  ["M356 246 C397 236 438 240 464 254 C446 270 397 272 358 260 C348 257 347 250 356 246 Z", 2, "Jawa Tengah", 411, 256],
  ["M462 254 C504 244 549 247 575 262 C553 279 502 279 464 267 C454 264 453 257 462 254 Z", 3, "Jawa Timur", 522, 266],
  ["M312 103 C349 70 428 72 470 104 C509 134 502 191 465 219 C423 251 348 239 313 203 C281 169 281 132 312 103 Z", 4, "Kalimantan", 400, 159],
  ["M554 121 C581 100 616 112 625 143 C649 131 676 144 674 170 C672 196 638 200 623 183 C616 211 630 237 610 253 C589 269 562 245 574 218 C583 196 558 187 544 166 C532 148 536 132 554 121 Z", 5, "Sulawesi", 611, 174],
  ["M698 170 C724 147 755 154 774 177 C807 148 862 152 888 185 C916 221 884 260 837 252 C803 247 778 224 756 208 C738 224 706 219 690 197 C681 186 685 178 698 170 Z", 6, "Papua", 794, 202],
] as const;

const mapHotspots = [
  {
    label: "Stok siap",
    detail: "82%",
    x: 592,
    y: 274,
    boxX: 646,
    boxY: 278,
    path: "M592 274 C610 266 626 276 646 296",
    color: "#2F7D32",
  },
  {
    label: "Buyer fit",
    detail: "High",
    x: 694,
    y: 220,
    boxX: 738,
    boxY: 198,
    path: "M694 220 C715 216 719 202 738 216",
    color: "#D79A2B",
  },
  {
    label: "Harga risiko",
    detail: "Watch",
    x: 470,
    y: 210,
    boxX: 514,
    boxY: 174,
    path: "M470 210 C494 210 494 184 514 192",
    color: "#C92A2A",
  },
] as const;

function PrimaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex w-fit items-center gap-3 rounded-full bg-[#C92A2A] py-2.5 pl-5 pr-2.5 text-sm font-black text-[#FFF8EA] shadow-[0_18px_42px_rgba(201,42,42,0.24)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#A82020] active:scale-[0.98] focus-visible:lb-focus sm:text-base"
    >
      {children}
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF8EA]/18 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-0.5">
        <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <>
      <main className="lb-landing min-h-[100dvh] overflow-hidden bg-[#FFF8EA] text-[#1F2933]">
        <PublicHeader />
        <div className="lb-landing-grain" aria-hidden="true" />

        <section className="relative isolate overflow-hidden bg-[#F8F5F0] px-4 py-10 sm:px-6 lg:px-8 lg:py-0">
          <div className="absolute inset-0 z-0" aria-hidden="true">
            <img
              alt=""
              src={stitchAssets.heroVillage}
              className="h-full w-full scale-105 object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,234,0.96)_0%,rgba(255,248,234,0.82)_43%,rgba(255,248,234,0.12)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#FFF8EA] to-transparent" />
          </div>
          <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] max-w-7xl flex-col items-center lg:flex-row">
            <div className="w-full py-10 text-center lg:w-[52%] lg:py-20 lg:text-left">
              <img
                alt="Lumbung Bersama"
                src={stitchAssets.landingLogo}
                className="mx-auto mb-5 h-auto w-[min(390px,88vw)] object-contain drop-shadow-[0_24px_54px_rgba(31,41,51,0.18)] lg:mx-0 lg:w-[430px]"
              />
              <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#E7DED1] bg-white/82 px-3 py-2 text-xs font-black text-[#7A4E2D] shadow-[0_12px_30px_rgba(122,78,45,0.08)]">
                <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
                {mvpName}
              </p>
              <h1 className="text-4xl font-extrabold leading-[1.03] text-[#172027] sm:text-5xl lg:text-7xl">
                Transformasi Digital <br />
                <span className="text-[#C92A2A]">Koperasi Desa</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base font-semibold leading-8 text-[#4F5B63] sm:text-lg lg:mx-0">
                Mengubah potensi desa menjadi aksi koperasi berbasis data,
                rekomendasi terjelaskan, dan bukti yang bisa diaudit.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <PrimaryCta href="/login?next=/dashboard">Masuk Dashboard</PrimaryCta>
                <Link
                  href="/peta-unggulan"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[#E7DED1] bg-white px-8 py-4 text-sm font-black text-[#1F2933] shadow-[0_14px_32px_rgba(122,78,45,0.08)] transition-all duration-300 hover:border-[#D79A2B] hover:bg-[#FFFCF5] active:scale-[0.98] focus-visible:lb-focus sm:w-auto"
                >
                  Lihat Alur
                  <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#C92A2A] text-[#C92A2A]">
                    <ArrowRight size={13} strokeWidth={3} aria-hidden="true" />
                  </span>
                </Link>
              </div>
              <div className="mx-auto mt-8 flex max-w-xl items-start justify-center gap-2 text-left text-sm font-semibold leading-6 text-[#4F5B63] lg:mx-0 lg:justify-start">
                <CheckCircle2 size={20} strokeWidth={2.2} className="text-[#2F7D32]" aria-hidden="true" />
                Platform ini dibangun untuk keputusan koperasi yang aman, transparan, dan dapat dipertanggungjawabkan.
              </div>
            </div>

            <div className="relative hidden min-h-[calc(100dvh-5rem)] w-full self-end lg:block lg:w-[48%]">
              <div className="absolute bottom-0 right-0 top-10 h-[calc(100%-2.5rem)] w-[88%] rounded-t-[2.5rem] bg-[#D6D7D4]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]" aria-hidden="true" />
              <img
                alt="Visual kepemimpinan koperasi desa dari referensi Stitch"
                src={stitchAssets.heroLeader}
                className="relative z-10 mx-auto block h-[calc(100dvh-3rem)] min-h-[680px] w-full origin-bottom scale-[1.08] object-contain object-bottom"
              />
              {[
                ["Data Terintegrasi", "bg-[#2F7D32]/20 text-[#2F7D32]", "translate-x-4 top-28"],
                ["AI Terjelaskan", "bg-[#1D5D8F]/20 text-[#1D5D8F]", "-translate-x-12 top-60"],
                ["Keputusan Koperasi", "bg-[#D79A2B]/20 text-[#7A4E2D]", "top-[25rem] translate-x-1"],
              ].map(([label, tone, position]) => (
                <div
                  key={label}
                  className={`lb-soft-float absolute right-0 z-20 flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/45 bg-white/38 p-4 text-center shadow-[0_20px_54px_rgba(31,41,51,0.18)] backdrop-blur-md ${position}`}
                >
                  <div className={`mb-1 grid h-10 w-10 place-items-center rounded-full text-xs font-black ${tone}`}>
                    {label === "AI Terjelaskan" ? "AI" : <CheckCircle2 size={22} strokeWidth={2.2} aria-hidden="true" />}
                  </div>
                  <p className="text-[9px] font-black leading-3 text-[#172027]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="mvp" className="relative border-y border-[#E7DED1] bg-[#FFFCF5] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="lb-view-reveal">
              <p className="text-sm font-black text-[#C92A2A]">MVP yang dipresentasikan</p>
              <h2 className="lb-display mt-4 max-w-xl text-4xl font-black leading-[0.98] sm:text-6xl">
                Satu alur, bukan kumpulan fitur terpisah.
              </h2>
              <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-[#53606A]">
                Alur MVP sengaja pendek agar juri melihat masalah, bukti,
                rekomendasi, kesiapan operasional, dan keputusan pengurus dalam
                satu narasi.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              {mvpFlow.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.title}
                    className={`lb-view-reveal lb-spotlight-card rounded-[1.5rem] p-1.5 ${index % 2 ? "xl:mt-10" : ""}`}
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="h-full rounded-[1.15rem] bg-[#FFF8EA] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-black text-[#7A4E2D]">{step.step}</span>
                        <Icon size={22} strokeWidth={2.1} className="text-[#C92A2A]" aria-hidden="true" />
                      </div>
                      <h3 className="mt-10 text-xl font-black leading-tight">{step.title}</h3>
                      <p className="mt-3 text-sm font-semibold leading-7 text-[#53606A]">{step.copy}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="peta" className="relative bg-[#F4F8ED] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="lb-view-reveal flex flex-col justify-center">
              <MapPinned size={34} strokeWidth={2.1} className="text-[#2F7D32]" aria-hidden="true" />
              <h2 className="lb-display mt-5 max-w-2xl text-4xl font-black leading-[0.98] sm:text-6xl">
                Peta menjadi alat memilih prioritas.
              </h2>
              <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[#53606A]">
                Pengurus bisa mencari wilayah, melihat komoditas, memeriksa aset,
                dan memahami kenapa satu produk layak diprioritaskan.
              </p>
              <div className="mt-7 grid gap-3">
                {[
                  "Layer nasional siap untuk dasar wilayah dan konektor resmi.",
                  "Klik wilayah mengantar ke detail komoditas, aset, risiko, dan kesiapan.",
                  "Peta tetap halaman mandiri agar fokus presentasi tidak pecah.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-[18px] border border-[#DDE7D6] bg-white/70 p-4">
                    <CheckCircle2 size={19} strokeWidth={2.2} className="mt-0.5 shrink-0 text-[#2F7D32]" aria-hidden="true" />
                    <p className="text-sm font-bold leading-6 text-[#53606A]">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <PrimaryCta href="/peta-unggulan">Coba peta interaktif</PrimaryCta>
              </div>
            </div>

            <div className="lb-view-reveal lb-bezel rounded-[2rem] p-2">
              <div className="overflow-hidden rounded-[1.55rem] bg-[#EAF3E4]">
                <div className="flex flex-col gap-3 border-b border-[#C6D8BD] bg-[#FBFFF7] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-[#45623D]">Preview peta nasional</p>
                    <p className="mt-1 text-sm font-semibold text-[#53606A]">
                      Warna menunjukkan sinyal surplus, olahan, risiko harga, logistik, dan data.
                    </p>
                  </div>
                  <StatusBadge tone="service">Map-first</StatusBadge>
                </div>
                <svg
                  viewBox="0 0 940 330"
                  role="img"
                  aria-label="Preview peta Indonesia untuk Peta Unggulan Desa"
                  className="h-auto w-full"
                >
                  <rect width="940" height="330" fill="#EAF3E4" />
                  <path d="M0 250 C140 214 255 229 382 200 C514 170 612 211 740 179 C820 160 883 170 940 155 L940 330 L0 330 Z" fill="#DDEBD4" />
                  {mapShapes.map(([d, regionIndex, label, x, y]) => (
                    <g key={label}>
                      <path
                        d={d}
                        fill={indonesiaOpportunityRegions[regionIndex].color}
                        stroke="#FFFFFF"
                        strokeWidth="3"
                        className="lb-map-region"
                      />
                      <text x={x} y={y} textAnchor="middle" className="fill-white text-[14px] font-black">
                        {label}
                      </text>
                    </g>
                  ))}
                  {mapHotspots.map((item) => (
                    <g key={item.label}>
                      <path
                        d={item.path}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="7 8"
                        opacity="0.86"
                      />
                      <circle className="lb-soft-pulse" cx={item.x} cy={item.y} r="7" fill="#FFFCF5" stroke={item.color} strokeWidth="4" />
                      <circle cx={item.x} cy={item.y} r="3.2" fill={item.color} />
                      <circle cx={item.boxX} cy={item.boxY + 18} r="4" fill={item.color} />
                      <rect
                        x={item.boxX}
                        y={item.boxY}
                        width="122"
                        height="46"
                        rx="13"
                        fill="#FFFCF5"
                        stroke={item.color}
                        strokeWidth="2"
                      />
                      <text x={item.boxX + 14} y={item.boxY + 19} className="fill-[#172027] text-[12px] font-black">
                        {item.label}
                      </text>
                      <text x={item.boxX + 14} y={item.boxY + 35} className="fill-[#53606A] text-[11px] font-bold">
                        {item.detail}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section id="flow" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="lb-view-reveal max-w-3xl">
              <p className="text-sm font-black text-[#C92A2A]">Buyer dan kesiapan</p>
              <h2 className="lb-display mt-4 text-4xl font-black leading-[0.98] sm:text-6xl">
                Outreach hanya dilakukan saat stok siap.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.82fr_1fr]">
              <div className="lb-view-reveal lb-bezel rounded-[2rem] p-2">
                <div className="h-full rounded-[1.55rem] bg-[#FFFCF5] p-5">
                  <BarChart3 size={26} strokeWidth={2.1} className="text-[#D79A2B]" aria-hidden="true" />
                  <h3 className="mt-5 text-2xl font-black">Requirement buyer</h3>
                  <div className="mt-5 grid gap-3">
                    {buyerMatches.slice(0, 3).map((item) => (
                      <div key={item.buyer} className="rounded-[16px] bg-[#FFF8EA] p-4">
                        <p className="text-sm font-black">{item.need}</p>
                        <p className="mt-1 text-xs font-bold text-[#7A4E2D]">{item.buyer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lb-view-reveal rounded-[2rem] bg-[#172027] p-6 text-[#FFF8EA] shadow-[0_24px_70px_rgba(31,41,51,0.22)] [--lb-delay:100ms]">
                <Layers3 size={28} strokeWidth={2.1} className="text-[#D79A2B]" aria-hidden="true" />
                <p className="mt-8 text-5xl font-black leading-none">Tanpa janji buyer palsu</p>
                <p className="mt-5 text-sm font-semibold leading-7 text-[#C9D0D4]">
                  Landing, dashboard, dan laporan memakai tipe kebutuhan buyer dan status kesiapan.
                  Tidak ada nama buyer palsu atau janji pembelian.
                </p>
              </div>
              <div className="lb-view-reveal lb-bezel rounded-[2rem] p-2 [--lb-delay:160ms]">
                <div className="h-full rounded-[1.55rem] bg-[#FFFCF5] p-5">
                  <Warehouse size={26} strokeWidth={2.1} className="text-[#2F7D32]" aria-hidden="true" />
                  <h3 className="mt-5 text-2xl font-black">Stock ledger</h3>
                  <div className="mt-5 grid gap-3">
                    {stockItems.slice(0, 3).map((item) => (
                      <div key={item.name} className="flex items-center justify-between gap-3 rounded-[16px] bg-[#FFF8EA] p-4">
                        <p className="text-sm font-black">{item.name}</p>
                        <p className="text-xs font-bold text-[#7A4E2D]">{item.state}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="bukti" className="border-y border-[#E7DED1] bg-[#FFFCF5] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="lb-view-reveal">
              <Database size={32} strokeWidth={2.1} className="text-[#C92A2A]" aria-hidden="true" />
              <h2 className="lb-display mt-5 max-w-2xl text-4xl font-black leading-[0.98] sm:text-6xl">
                Bukti ditandai, bukan dilebihkan.
              </h2>
              <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[#53606A]">
                Sumber eksplorasi diperlakukan sebagai bahan terbatas. Data
                operasional MVP disimpan di ruang kerja aplikasi dengan ID tim.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {guardrails.map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="lb-view-reveal rounded-[1.5rem] border border-[#E7DED1] bg-[#FFF8EA] p-5"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <Icon size={24} strokeWidth={2.1} className="text-[#C92A2A]" aria-hidden="true" />
                    <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-7 text-[#53606A]">{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="lb-view-reveal mx-auto mt-10 max-w-7xl rounded-[2rem] border border-[#E7DED1] bg-[#FFF8EA] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#7A4E2D]">Registry sumber</p>
                <h3 className="mt-1 text-2xl font-black">Sumber nasional dan rencana konektor</h3>
              </div>
              <StatusBadge tone="warning">Berlabel sumber</StatusBadge>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {nationalDataSources.slice(0, 5).map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[18px] bg-[#FFFCF5] p-4 text-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-white focus-visible:lb-focus"
                >
                  <p className="font-black">{source.name}</p>
                  <p className="mt-2 font-semibold leading-6 text-[#53606A]">{publicStatusLabel(source.status)}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="lb-view-reveal mx-auto grid max-w-7xl gap-8 rounded-[2.5rem] bg-[#172027] p-6 text-[#FFF8EA] shadow-[0_24px_80px_rgba(31,41,51,0.24)] lg:grid-cols-[1fr_0.75fr] lg:p-10">
            <div>
              <p className="text-sm font-black text-[#D79A2B]">Siap operasional</p>
              <h2 className="lb-display mt-4 max-w-3xl text-4xl font-black leading-[0.98] sm:text-6xl">
                Mulai dari peta, tutup dengan laporan aksi.
              </h2>
              <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[#C9D0D4]">
                Login operator membuka dashboard, WA intake, agent center,
                integrasi, dan laporan. Semua tetap membutuhkan review manusia.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <PrimaryCta href="/login?next=/dashboard">Masuk dashboard</PrimaryCta>
              <Link
                href="/login?next=/laporan"
                className="inline-flex w-fit items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.08] px-5 py-3 text-sm font-black text-[#FFF8EA] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.12] active:scale-[0.98] focus-visible:lb-focus"
              >
                Lihat laporan aksi
              </Link>
            </div>
          </div>
        </section>

        <section id="faq" className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="lb-view-reveal max-w-3xl">
              <h2 className="lb-display text-4xl font-black leading-[0.98] sm:text-6xl">
                Jawaban cepat untuk pitch.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {faqItems.map((item, index) => (
                <article
                  key={item.question}
                  className="lb-view-reveal rounded-[1.5rem] border border-[#E7DED1] bg-[#FFFCF5] p-6"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <h3 className="text-xl font-black">{item.question}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#53606A]">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E7DED1] bg-[#FFFCF5] text-[#1F2933]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <img
              alt="Lumbung Bersama"
              src={stitchAssets.footerLogo}
              className="h-16 w-auto object-contain"
            />
            <p className="mt-5 max-w-sm text-sm font-semibold leading-7 text-[#53606A]">
              {brand.tagline} Dibangun untuk membantu koperasi membaca peluang,
              mengecek kesiapan, dan mengambil tindakan yang bisa diaudit.
            </p>
          </div>
          <div>
            <h3 className="font-black">Produk</h3>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-[#53606A]">
              <Link href="/peta-unggulan">Peta Potensi</Link>
              <Link href="/login?next=/dashboard">Dashboard</Link>
              <Link href="/login?next=/agents">Agent Center</Link>
            </div>
          </div>
          <div>
            <h3 className="font-black">Operasional</h3>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-[#53606A]">
              <Link href="/login?next=/wa">WA Intake</Link>
              <Link href="/login?next=/laporan">Laporan</Link>
              <Link href="/login?next=/integrasi">Integrasi</Link>
            </div>
          </div>
          <div>
            <h3 className="font-black">Catatan</h3>
            <p className="mt-4 text-sm font-semibold leading-7 text-[#53606A]">
              Platform uji terbatas. Integrasi produksi memerlukan izin,
              akses resmi, dan pengamanan data.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

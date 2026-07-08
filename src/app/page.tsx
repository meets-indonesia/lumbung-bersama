import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileDown,
  Handshake,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  Store,
  Warehouse,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { PublicHeader } from "@/components/PublicHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  brand,
  pilotCooperative,
  indonesiaOpportunityRegions,
  nationalDataSources,
  operatorQueue,
} from "@/lib/pilot-data";

const audienceCards = [
  {
    title: "Warga",
    copy: "Cukup kirim WhatsApp untuk panen, stok, harga, pickup, atau pinjaman.",
  },
  {
    title: "Operator koperasi",
    copy: "Mengecek draft, bukti, satuan, status, dan catatan yang belum lengkap.",
  },
  {
    title: "Pengurus",
    copy: "Melihat stok, buyer, pembiayaan, peta unggulan, dan laporan harian.",
  },
];

const workflow = [
  {
    title: "Lapor lewat WA",
    copy: "Warga mengirim teks, foto, atau voice note seperti biasa.",
  },
  {
    title: "Jadi draft data",
    copy: "AI membaca komoditas, jumlah, lokasi, dan kebutuhan tindak lanjut.",
  },
  {
    title: "Dicek manusia",
    copy: "Operator mengoreksi, meminta bukti, lalu menyetujui catatan.",
  },
  {
    title: "Masuk aksi",
    copy: "Data dipakai untuk stok, pickup, buyer, pembiayaan, peta, dan laporan.",
  },
];

const platformModules = [
  {
    title: "Suara Warga",
    copy: "WhatsApp menjadi pintu masuk laporan petani dan anggota.",
    icon: MessageCircle,
    href: "/wa",
  },
  {
    title: "Lumbung Data",
    copy: "Semua catatan punya status, sumber, bukti, dan audit.",
    icon: Database,
    href: "/modules/lumbung-data",
  },
  {
    title: "Gerai dan Stok",
    copy: "Stok gerai, gudang, pickup, dan restock terlihat cepat.",
    icon: Store,
    href: "/modules/gerai-pintar",
  },
  {
    title: "Pasar dan Mitra",
    copy: "Buyer match disertai alasan dan approval pengurus.",
    icon: Handshake,
    href: "/modules/pasar-mitra",
  },
  {
    title: "Lapor Siap",
    copy: "Ringkasan dan CSV siap untuk rapat atau integrasi lanjutan.",
    icon: FileDown,
    href: "/laporan",
  },
];

const governance = [
  {
    title: "AI tidak memutuskan",
    copy: "Harga, buyer, stok, dan pembiayaan tetap perlu approval manusia.",
    icon: ShieldCheck,
  },
  {
    title: "Sumber data jelas",
    copy: "Setiap catatan dibedakan antara input warga, operator, sumber nasional, dan integrasi resmi.",
    icon: ClipboardCheck,
  },
  {
    title: "Siap dioperasikan bertahap",
    copy: "Akses operator, database, webhook, dan connector disiapkan sebagai jalur produksi.",
    icon: Building2,
  },
];

const faqItems = [
  {
    question: "Apa ini sebenarnya?",
    answer:
      "Lumbung Bersama adalah dashboard dan bot WhatsApp untuk membantu koperasi desa mencatat laporan warga, memverifikasi data, dan mengambil aksi operasional.",
  },
  {
    question: "Apakah petani harus belajar aplikasi baru?",
    answer:
      "Tidak. Petani cukup memakai WhatsApp. Dashboard dipakai operator dan pengurus koperasi.",
  },
  {
    question: "Apakah sudah sistem resmi pemerintah?",
    answer:
      "Belum. Ini platform hackathon yang siap dipilotkan, dengan integrasi produksi yang tetap membutuhkan credential dan izin resmi.",
  },
  {
    question: "Apa yang perlu disiapkan untuk pilot?",
    answer:
      "Akses WhatsApp Business API, database, storage, role pengguna, data koperasi, dan izin integrasi resmi bila dibutuhkan.",
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

export default function Home() {
  return (
    <>
      <main className="min-h-[100dvh] bg-[#FFF8EA] text-[#1F2933]">
        <PublicHeader />

        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-16 lg:pt-14">
          <div className="flex flex-col justify-center">
            <div className="lb-reveal">
              <StatusBadge tone="service">Untuk Koperasi Desa/Kelurahan Merah Putih</StatusBadge>
            </div>
            <h1 className="lb-reveal mt-6 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-[#1F2933] [--lb-delay:90ms] sm:text-6xl">
              Dashboard koperasi desa yang dimulai dari WhatsApp warga.
            </h1>
            <p className="lb-reveal mt-5 max-w-2xl text-lg font-semibold leading-8 text-[#53606A] [--lb-delay:170ms]">
              Warga lapor lewat WhatsApp. Operator memverifikasi. Pengurus
              melihat stok, peta unggulan, buyer, pembiayaan, dan laporan dalam
              satu ruang kerja.
            </p>
            <div className="lb-reveal mt-8 flex flex-col gap-3 [--lb-delay:250ms] sm:flex-row">
              <Link
                href="#alur"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-5 py-3 text-base font-extrabold text-[#FFF8EA] transition hover:bg-[#A82020] focus-visible:lb-focus"
              >
                Pelajari alur WhatsApp
                <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
              </Link>
              <Link
                href="/login?next=/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#D9CFC0] bg-[#FFFCF5] px-5 py-3 text-base font-extrabold text-[#1F2933] transition hover:border-[#D79A2B] focus-visible:lb-focus"
              >
                Masuk operator
              </Link>
            </div>
            <p className="lb-reveal mt-5 max-w-2xl text-sm font-semibold leading-6 text-[#7A4E2D] [--lb-delay:330ms]">
              Dashboard operator memakai login. Integrasi produksi tetap
              membutuhkan akses, izin, dan credential yang sah.
            </p>
          </div>

          <div className="lb-reveal lb-float rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-3 shadow-[0_24px_70px_rgba(122,78,45,0.12)] [--lb-delay:180ms]">
            <div className="rounded-[18px] border border-[#E7DED1] bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-[#E7DED1] p-4">
                <div>
                  <p className="text-sm font-black">{pilotCooperative.name}</p>
                  <p className="mt-1 text-xs font-semibold text-[#7A4E2D]">
                    Ruang kerja operator
                  </p>
                </div>
                <StatusBadge tone="warning">Contoh alur</StatusBadge>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[14px] bg-[#E7F5E8] p-4">
                  <p className="text-sm font-extrabold text-[#236327]">Pesan warga</p>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#1F2933]">
                    Panen kopi kering sekitar 120 kilo. Mohon cek harga koperasi.
                  </p>
                  <div className="mt-4 rounded-[12px] bg-[#2F7D32] px-4 py-3 text-sm font-black text-white">
                    Masuk queue operator
                  </div>
                </div>
                <div className="space-y-3">
                  {operatorQueue.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-xs font-black text-[#7A4E2D]">{item.id}</p>
                        <StatusBadge tone="warning">{item.status}</StatusBadge>
                      </div>
                      <p className="mt-2 text-sm font-black">{item.sender}</p>
                      <p className="mt-1 text-sm leading-6 text-[#53606A]">{item.module}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="border-y border-[#E7DED1] bg-[#FFFCF5]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div className="lb-view-reveal">
              <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
                Apa yang dibereskan?
              </h2>
              <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-[#53606A]">
                Data koperasi sering tercecer di chat, buku stok, dan file laporan.
                Lumbung Bersama menyatukannya tanpa memaksa warga belajar aplikasi baru.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {audienceCards.map((item, index) => (
                <article
                  key={item.title}
                  className="lb-view-reveal rounded-[16px] border border-[#E7DED1] bg-[#FFF8EA] p-5"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <h3 className="text-xl font-black">{item.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#53606A]">{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="alur" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="lb-view-reveal max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Alur kerja dibuat pendek.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-[#53606A]">
              Dari pesan warga sampai keputusan pengurus, setiap langkah punya
              status yang bisa dicek.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {workflow.map((step, index) => (
              <article
                key={step.title}
                className="lb-view-reveal rounded-[16px] border border-[#E7DED1] bg-[#FFFCF5] p-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <CheckCircle2 size={22} strokeWidth={2.2} className="text-[#2F7D32]" aria-hidden="true" />
                <h3 className="mt-5 text-xl font-black">{step.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-[#53606A]">{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#F6F8F2]" id="unggulan">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
            <div className="lb-view-reveal flex flex-col justify-center">
              <MapPinned size={32} strokeWidth={2.2} className="text-[#2F7D32]" aria-hidden="true" />
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                Peta untuk melihat peluang desa.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[#53606A]">
                Komoditas, gudang, koperasi, UMKM, sawah, dan peternakan dibaca
                sebagai sinyal usaha. Pengurus bisa mencari daerah, klik peta,
                lalu melihat rekomendasi awal.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  "Klik wilayah untuk memilih desa contoh lintas Indonesia.",
                  "Cari komoditas seperti kopi, cabai, sagu, singkong, atau rumput laut.",
                  "Legenda warna membantu membaca surplus, olahan, risiko harga, dan logistik.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-[14px] border border-[#DDE7D6] bg-white p-4">
                    <CheckCircle2 size={19} strokeWidth={2.2} className="mt-0.5 shrink-0 text-[#2F7D32]" aria-hidden="true" />
                    <p className="text-sm font-bold leading-6 text-[#53606A]">{item}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/peta-unggulan"
                className="mt-7 inline-flex w-fit items-center gap-2 rounded-[12px] bg-[#2F7D32] px-5 py-3 text-sm font-extrabold text-white focus-visible:lb-focus"
              >
                Buka peta interaktif
                <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
              </Link>
            </div>

            <div className="lb-view-reveal rounded-[22px] border border-[#DDE7D6] bg-[#FBFFF7] p-4 shadow-[0_24px_70px_rgba(47,125,50,0.12)]">
              <div className="flex flex-col gap-3 border-b border-[#DDE7D6] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-[#45623D]">Preview peta nasional</p>
                  <p className="mt-1 text-sm font-semibold text-[#53606A]">
                    Kode wilayah nasional siap; layer GIS resmi dapat ditambahkan saat integrasi data tersedia.
                  </p>
                </div>
                <StatusBadge tone="warning">Data Awal</StatusBadge>
              </div>
              <div className="mt-4 overflow-hidden rounded-[18px] border border-[#C6D8BD] bg-[#EAF3E4]">
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
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        className="fill-white text-[14px] font-black"
                      >
                        {label}
                      </text>
                    </g>
                  ))}
                  <g fill="#A7B99D">
                    <circle className="lb-soft-pulse" cx="592" cy="274" r="5" />
                    <circle cx="614" cy="279" r="4" />
                    <circle cx="637" cy="284" r="4" />
                    <circle cx="662" cy="286" r="3" />
                    <circle className="lb-soft-pulse" cx="694" cy="220" r="5" />
                    <circle cx="723" cy="232" r="4" />
                  </g>
                </svg>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-5">
                {[
                  ["#2F7D32", "Surplus"],
                  ["#D79A2B", "Olahan"],
                  ["#C92A2A", "Harga"],
                  ["#1D5D8F", "Logistik"],
                  ["#7A4E2D", "Data"],
                ].map(([color, label]) => (
                  <div key={label} className="rounded-[12px] border border-[#DDE7D6] bg-white p-3">
                    <span className="block h-3 w-8 rounded-[4px]" style={{ backgroundColor: color }} />
                    <p className="mt-2 text-xs font-black text-[#1F2933]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="lb-view-reveal max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Modulnya mengikuti kerja harian koperasi.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-[#53606A]">
              Bukan daftar fitur kosong. Setiap modul punya alur, aksi, dan route
              alur operasional yang bisa dibuka operator.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {platformModules.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  key={item.title}
                  className="lb-view-reveal rounded-[16px] border border-[#E7DED1] bg-[#FFFCF5] p-5 transition hover:-translate-y-1 hover:border-[#D79A2B] focus-visible:lb-focus"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <Icon size={24} strokeWidth={2.1} className="text-[#C92A2A]" aria-hidden="true" />
                  <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#53606A]">{item.copy}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="tata-kelola" className="border-y border-[#E7DED1] bg-[#FFFCF5]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="lb-view-reveal">
                <ShieldCheck size={32} strokeWidth={2.2} className="text-[#C92A2A]" aria-hidden="true" />
                <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                  Aman untuk pilot, jujur untuk produksi.
                </h2>
                <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-[#53606A]">
                  Sistem membedakan input warga, data operator, sumber nasional,
                  dan integrasi resmi. Tidak ada klaim palsu.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {governance.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <article
                      key={item.title}
                      className="lb-view-reveal rounded-[16px] border border-[#E7DED1] bg-[#FFF8EA] p-5"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <Icon size={24} strokeWidth={2.1} className="text-[#C92A2A]" aria-hidden="true" />
                      <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                      <p className="mt-3 text-sm font-semibold leading-7 text-[#53606A]">{item.copy}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="lb-view-reveal mt-8 rounded-[18px] border border-[#E7DED1] bg-[#FFF8EA] p-5">
              <div className="flex items-center gap-2">
                <Database size={20} strokeWidth={2.2} className="text-[#2F7D32]" aria-hidden="true" />
                <h3 className="text-xl font-black">Sumber data yang disiapkan</h3>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {nationalDataSources.map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[12px] border border-[#E7DED1] bg-[#FFFCF5] p-4 text-sm transition hover:border-[#2F7D32] focus-visible:lb-focus"
                  >
                    <p className="font-black">{source.name}</p>
                    <p className="mt-2 font-semibold leading-6 text-[#53606A]">{source.status}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F4EBDD]">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
            <div className="lb-view-reveal">
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                Siap dipresentasikan. Siap dipilotkan bertahap.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[#53606A]">
                Fondasi operasional sudah memakai login, Postgres, webhook, dan
                API. Tahap berikutnya adalah mengisi credential resmi, data
                koperasi, storage, dan connector pemerintah yang diizinkan.
              </p>
            </div>
            <div className="lb-view-reveal flex flex-col justify-center gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/login?next=/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#1F2933] px-5 py-3 text-sm font-extrabold text-[#FFF8EA] focus-visible:lb-focus"
              >
                Masuk operator
                <Warehouse size={18} strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <Link
                href="/login?next=/integrasi"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#D9CFC0] bg-[#FFFCF5] px-5 py-3 text-sm font-extrabold text-[#1F2933] focus-visible:lb-focus"
              >
                Cek readiness integrasi
              </Link>
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="lb-view-reveal max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Pertanyaan singkat.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {faqItems.map((item, index) => (
              <article
                key={item.question}
                className="lb-view-reveal rounded-[16px] border border-[#E7DED1] bg-[#FFFCF5] p-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <h3 className="text-xl font-black">{item.question}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-[#53606A]">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E7DED1] bg-[#FFFCF5] text-[#1F2933]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr] lg:px-8">
          <div>
            <BrandMark />
            <p className="mt-5 max-w-sm text-sm font-semibold leading-7 text-[#53606A]">
              {brand.tagline} Dibangun untuk membantu koperasi menerima laporan,
              mengecek data, membaca peluang, dan menyiapkan laporan.
            </p>
          </div>
          <div>
            <h3 className="font-black">Produk</h3>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-[#53606A]">
              <Link href="/login?next=/wa">WA Center</Link>
              <Link href="/login?next=/dashboard">Dashboard</Link>
              <Link href="/peta-unggulan">Peta Unggulan</Link>
              <Link href="/login?next=/modules">Modul</Link>
            </div>
          </div>
          <div>
            <h3 className="font-black">Operasional</h3>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-[#53606A]">
              <Link href="/login?next=/agents">Agent Center</Link>
              <Link href="/login?next=/laporan">Laporan</Link>
              <Link href="/login?next=/integrasi">Integrasi</Link>
              <Link href="#alur">Alur WA</Link>
            </div>
          </div>
          <div>
            <h3 className="font-black">Catatan</h3>
            <p className="mt-4 text-sm font-semibold leading-7 text-[#53606A]">
              Bukan sistem resmi pemerintah. Semua integrasi produksi harus
              melalui akses, izin, dan keamanan data yang sesuai.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

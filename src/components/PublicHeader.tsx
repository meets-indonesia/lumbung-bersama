"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { stitchAssets } from "@/lib/stitch-assets";

const navItems = [
  { label: "Beranda", href: "/" },
  { label: "Fitur", href: "#mvp" },
  { label: "Tentang", href: "#bukti" },
  { label: "Integrasi", href: "#flow" },
  { label: "Dokumentasi", href: "#bukti" },
  { label: "Tim", href: "#faq" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky inset-x-0 top-0 z-40 border-b border-[#E7DED1]/80 bg-[#F8F5F0]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 focus-visible:lb-focus" aria-label="Lumbung Bersama">
          <img
            alt="Lumbung Bersama"
            src={stitchAssets.landingLogo}
            className="h-16 w-auto max-w-[min(48vw,13rem)] object-contain drop-shadow-[0_12px_26px_rgba(122,78,45,0.18)] sm:h-[4.5rem] sm:max-w-[15.5rem]"
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-bold text-[#5B6871] lg:flex xl:gap-8">
          {navItems.map((item) => (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className="transition-colors duration-300 first:text-[#C92A2A] hover:text-[#C92A2A] focus-visible:lb-focus"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login?next=/dashboard"
            className="group inline-flex min-h-10 items-center gap-1 rounded-full bg-[#C92A2A] px-3 py-2 text-xs font-extrabold text-white shadow-[0_14px_34px_rgba(201,42,42,0.22)] transition-all duration-300 hover:bg-[#A82020] active:scale-[0.98] focus-visible:lb-focus min-[380px]:gap-2 min-[380px]:px-5 min-[380px]:py-2.5 min-[380px]:text-sm"
          >
            <span className="hidden min-[340px]:inline">Masuk</span>
            <span className="hidden min-[430px]:inline">Dashboard</span>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5 min-[380px]:h-6 min-[380px]:w-6">
              <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[#E7DED1] bg-[#FFFCF5] text-[#1F2933] transition-all duration-300 active:scale-[0.98] focus-visible:lb-focus lg:hidden"
            aria-expanded={open}
            aria-controls="public-mobile-nav"
            aria-label={open ? "Tutup menu" : "Buka menu"}
          >
            <span className="relative grid h-5 w-5 place-items-center">
              <Menu
                size={19}
                strokeWidth={2.2}
                className={`absolute transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`}
                aria-hidden="true"
              />
              <X
                size={19}
                strokeWidth={2.2}
                className={`absolute transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`}
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="public-mobile-nav"
        className={`mx-auto max-w-7xl overflow-hidden border-x border-b border-[#E7DED1]/85 bg-[#FFF8EA]/96 shadow-[0_22px_70px_rgba(122,78,45,0.16)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden ${
          open ? "max-h-[28rem] opacity-100" : "max-h-0 border-transparent opacity-0"
        }`}
      >
        <nav className="grid gap-2 p-4">
          {navItems.map((item, index) => (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`rounded-[18px] bg-[#FFFCF5] px-4 py-4 text-lg font-black text-[#1F2933] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:lb-focus ${
                open ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
              }`}
              style={{ transitionDelay: open ? `${90 + index * 45}ms` : "0ms" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

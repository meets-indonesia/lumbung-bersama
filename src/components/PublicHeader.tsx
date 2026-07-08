import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "./BrandMark";

export function PublicHeader() {
  const navItems = [
    { label: "Platform", href: "#platform" },
    { label: "Alur", href: "#alur" },
    { label: "Unggulan", href: "#unggulan" },
    { label: "Tata kelola", href: "#tata-kelola" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#E7DED1]/80 bg-[#FFF8EA]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-4 text-sm font-bold text-[#7A4E2D] lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg transition hover:text-[#C92A2A] focus-visible:lb-focus"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="#alur"
            className="hidden rounded-[10px] border border-[#E7DED1] bg-[#FFFCF5] px-4 py-2 text-sm font-bold text-[#1F2933] transition hover:border-[#D79A2B] focus-visible:lb-focus sm:inline-flex"
          >
            Alur WhatsApp
          </Link>
          <Link
            href="/login?next=/dashboard"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#C92A2A] px-4 py-2 text-sm font-extrabold text-[#FFF8EA] transition hover:bg-[#A82020] focus-visible:lb-focus"
          >
            Masuk operator
            <ArrowUpRight size={16} strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}

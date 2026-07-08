import Link from "next/link";
import { ArrowRight } from "lucide-react";

type ModuleCardProps = {
  slug: string;
  title: string;
  short: string;
  status: string;
  owner: string;
  href?: string;
  dark?: boolean;
};

export function ModuleCard({
  slug,
  title,
  short,
  status,
  owner,
  href = `/modules/${slug}`,
  dark = false,
}: ModuleCardProps) {
  return (
    <Link
      href={href}
      className={`group rounded-[18px] border p-5 transition focus-visible:lb-focus ${
        dark
          ? "border-white/10 bg-[#1D252C] hover:border-[#D79A2B]"
          : "border-[#E7DED1] bg-[#FFFCF5] hover:border-[#D79A2B]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#D79A2B]">
            {status}
          </p>
          <h3 className="mt-3 text-xl font-black">{title}</h3>
        </div>
        <span className="rounded-full border border-current/10 p-2 transition group-hover:translate-x-1">
          <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-4 text-sm font-semibold leading-7 ${dark ? "text-[#D8CBB8]" : "text-[#53606A]"}`}>
        {short}
      </p>
      <p className={`mt-5 text-xs font-bold ${dark ? "text-[#FFF8EA]" : "text-[#7A4E2D]"}`}>
        Pemilik: {owner}
      </p>
    </Link>
  );
}

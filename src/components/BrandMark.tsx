import Link from "next/link";
import { stitchAssets } from "@/lib/stitch-assets";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
};

export function BrandMark({ href = "/", compact = false }: BrandMarkProps) {
  const mark = (
    <div className="flex items-center gap-3">
      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] shadow-[0_12px_24px_rgba(122,78,45,0.14)]">
        <img
          alt=""
          src={stitchAssets.landingLogo}
          className="h-11 w-11 scale-[1.55] object-contain"
        />
      </span>
      {!compact ? (
        <div>
          <p className="text-[1.02rem] font-bold leading-none text-[#1F2933]">
            Lumbung Bersama
          </p>
          <p className="mt-1 text-xs font-medium text-[#7A4E2D]">
            Koperasi Desa/Kelurahan Merah Putih
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <Link href={href} className="rounded-xl focus-visible:lb-focus">
      {mark}
    </Link>
  );
}

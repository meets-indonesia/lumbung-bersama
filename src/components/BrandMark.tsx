import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
};

function LumbungLogoMark({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="8" width="80" height="80" rx="23" fill="#FFF8EA" />
      <rect x="8" y="8" width="80" height="80" rx="23" stroke="#E7DED1" strokeWidth="2" />
      <path
        d="M20 34L48 18L76 34L69 42H27L20 34Z"
        fill="#C92A2A"
      />
      <path
        d="M30 43V72H66V43"
        fill="none"
        stroke="#7A4E2D"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 43C39 50 39 64 48 74C57 64 57 50 48 43Z"
        fill="#D79A2B"
      />
      <path
        d="M48 50V70"
        stroke="#7A4E2D"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.62"
      />
      <path
        d="M32 66C39 58 44 55 48 55C52 55 57 58 64 66"
        stroke="#2F7D32"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M34 76H62"
        stroke="#1F2933"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
      <circle cx="64" cy="66" r="4.8" fill="#2F7D32" stroke="#FFF8EA" strokeWidth="2.6" />
      <path
        d="M31 34H65"
        stroke="#FFF8EA"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.78"
      />
    </svg>
  );
}

export function BrandMark({ href = "/", compact = false }: BrandMarkProps) {
  const mark = (
    <div className="flex items-center gap-3">
      <LumbungLogoMark className="h-11 w-11 shrink-0 drop-shadow-[0_12px_18px_rgba(122,78,45,0.16)]" />
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

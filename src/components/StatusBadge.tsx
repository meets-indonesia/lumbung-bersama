import type { ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "review" | "success" | "service" | "warning" | "risk";
};

const toneClass = {
  review: "bg-[#FFF3D8] text-[#7A4E2D] ring-[#E7DED1]",
  success: "bg-[#E7F5E8] text-[#236327] ring-[#B8DEC0]",
  service: "bg-[#E9F2FA] text-[#1D5D8F] ring-[#B9D5E8]",
  warning: "bg-[#F4EBDD] text-[#6B4B1E] ring-[#E2C58E]",
  risk: "bg-[#FDEAEA] text-[#A82020] ring-[#E8B9B9]",
};

export function StatusBadge({ children, tone = "review" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

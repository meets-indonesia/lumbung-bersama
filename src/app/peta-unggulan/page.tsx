import type { Metadata } from "next";
import { PetaUnggulanClient } from "@/components/PetaUnggulanClient";

export const metadata: Metadata = {
  title: "Peta Unggulan Desa",
  description:
    "Peta drill-down wilayah Indonesia untuk membaca provinsi, kabupaten/kota, kecamatan, desa, dan komoditas unggulan berbasis data koperasi dan baseline nasional.",
};

export default function PetaUnggulanPage() {
  return (
    <main className="min-h-[100dvh] bg-[#080A0B] text-[#F4F0E8]">
      <PetaUnggulanClient />
    </main>
  );
}

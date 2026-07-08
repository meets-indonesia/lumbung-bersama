"use client";

import { useMemo, useState } from "react";
import { Download, FileCheck2, Lock } from "lucide-react";
import {
  buyerMatches,
  pilotCooperative,
  financeRequests,
  operatorQueue,
  reportSections,
  stockItems,
  villageInsights,
} from "@/lib/pilot-data";

export function ReportClient() {
  const [locked, setLocked] = useState(false);
  const [included, setIncluded] = useState(reportSections);
  const [message, setMessage] = useState("Laporan pilot siap direview pengurus.");

  const summary = useMemo(
    () => [
      ["Koperasi", pilotCooperative.name],
      ["Desa", pilotCooperative.village],
      ["Catatan warga", String(operatorQueue.length)],
      ["Item stok", String(stockItems.length)],
      ["Buyer match", String(buyerMatches.length)],
      ["Simpan pinjam", String(financeRequests.length)],
      ["Insight desa", String(villageInsights.length)],
      ["Status", locked ? "Dikunci untuk presentasi" : "Draft pilot"],
    ],
    [locked],
  );

  function toggleSection(section: string) {
    setIncluded((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
    setMessage("Struktur laporan pilot diperbarui.");
  }

  function exportReport() {
    const rows = [
      ["field", "value"],
      ...summary,
      ["sections", included.join(" | ")],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "lumbung-bersama-lapor-siap-pilot.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("CSV laporan pilot berhasil dibuat di browser.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#C92A2A]">
          Lapor Siap
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
          Ringkasan siap presentasi dan ekspor.
        </h1>
        <p className="mt-4 text-base font-semibold leading-8 text-[#53606A]">
          Laporan ini memakai data awal. Dalam production, data bersumber dari
          database dan dapat dipetakan ke kebutuhan pelaporan resmi bila sudah
          ada akses integrasi.
        </p>

        <div className="mt-6 grid gap-3">
          {reportSections.map((section) => {
            const active = included.includes(section);
            return (
              <button
                key={section}
                type="button"
                onClick={() => toggleSection(section)}
                className={`rounded-[14px] border px-4 py-3 text-left text-sm font-extrabold transition focus-visible:lb-focus ${
                  active
                    ? "border-[#2F7D32] bg-[#E7F5E8] text-[#236327]"
                    : "border-[#E7DED1] bg-[#FFF8EA] text-[#7A4E2D]"
                }`}
              >
                {active ? "Masuk laporan: " : "Dikeluarkan: "}
                {section}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E7DED1] bg-[#FFFCF5] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#7A4E2D]">
              Preview Laporan
            </p>
            <h2 className="mt-2 text-2xl font-black">Data Awal</h2>
          </div>
          <FileCheck2 size={28} strokeWidth={2.2} className="text-[#2F7D32]" aria-hidden="true" />
        </div>

        <div className="mt-5 space-y-3">
          {summary.map(([label, value]) => (
            <div
              key={label}
              className="grid gap-2 rounded-[14px] border border-[#E7DED1] bg-[#FFF8EA] p-4 sm:grid-cols-[0.42fr_0.58fr]"
            >
              <p className="text-sm font-extrabold text-[#7A4E2D]">{label}</p>
              <p className="text-sm font-bold text-[#1F2933]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={exportReport}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#C92A2A] px-5 py-3 text-sm font-extrabold text-[#FFF8EA] focus-visible:lb-focus"
          >
            <Download size={17} strokeWidth={2.2} aria-hidden="true" />
            Ekspor CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setLocked((current) => !current);
              setMessage(locked ? "Laporan kembali menjadi draft pilot." : "Laporan dikunci untuk presentasi pilot.");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#E7DED1] bg-[#FFF8EA] px-5 py-3 text-sm font-extrabold text-[#1F2933] focus-visible:lb-focus"
          >
            <Lock size={17} strokeWidth={2.2} aria-hidden="true" />
            {locked ? "Buka Draft" : "Kunci Pilot"}
          </button>
        </div>

        <div className="mt-5 rounded-[14px] bg-[#F4EBDD] p-4 text-sm font-bold leading-6 text-[#7A4E2D]">
          {message}
        </div>
      </section>
    </div>
  );
}

type FormalReplyInput = {
  summary: string;
  details?: string[];
  nextSteps?: string[];
  note?: string;
};

export function formatFormalWaReply({
  summary,
  details = [],
  nextSteps = [],
  note = "Data akan diverifikasi operator koperasi sebelum dipakai untuk keputusan.",
}: FormalReplyInput) {
  const lines = ["Baik, Bapak/Ibu.", "", `Ringkasan: ${summary}`];

  if (details.length) {
    lines.push("", "Data yang kami baca:");
    details.forEach((detail, index) => {
      lines.push(`${index + 1}. ${detail}`);
    });
  }

  if (nextSteps.length) {
    lines.push("", "Tindak lanjut:");
    nextSteps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }

  if (note) {
    lines.push("", `Catatan: ${note}`);
  }

  return lines.join("\n");
}

export function formatAgentExplanation({
  agentName,
  mode,
  dataBasis,
  approvalNote = "Hasil agent adalah bahan bantu. Pengurus/operator tetap memutuskan setelah cek bukti.",
}: {
  agentName: string;
  mode: string;
  dataBasis: string;
  approvalNote?: string;
}) {
  return `${agentName} berjalan dalam mode ${mode}. Dasar data: ${dataBasis}. ${approvalNote}`;
}

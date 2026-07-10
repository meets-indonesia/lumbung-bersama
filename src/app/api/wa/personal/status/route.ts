import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { requireAuthenticatedRequest } from "@/lib/auth";
import { getWaSetupStatus } from "../../status";

export const runtime = "nodejs";

type BridgeStateFile = {
  status?: string;
  qr?: string | null;
  updatedAt?: string;
  connectedAt?: string | null;
  lastDisconnect?: string | null;
  capabilities?: {
    qrPairing?: boolean;
    mediaDownload?: boolean;
    pdfTextExtraction?: boolean;
    imageOcr?: boolean;
  };
};

function stateFilePath() {
  return path.resolve(process.cwd(), process.env.WA_PERSONAL_STATE_DIR || ".wa-personal-state", "status.json");
}

function publicStatus(state: BridgeStateFile | null, enabled: boolean) {
  if (!enabled) return "disabled";
  if (!state?.status) return "waiting-for-bridge";
  if (state.status === "qr" && state.qr) return "qr";
  if (state.status === "connected") return "connected";
  if (state.status === "logged-out") return "logged-out";
  return "disconnected";
}

async function readBridgeState() {
  try {
    const raw = await readFile(stateFilePath(), "utf8");
    return JSON.parse(raw) as BridgeStateFile;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const setup = getWaSetupStatus();
  const enabled = setup.personalPairing.status === "available";
  const state = await readBridgeState();
  const status = publicStatus(state, enabled);
  const qrImage =
    status === "qr" && state?.qr
      ? await QRCode.toDataURL(state.qr, {
          margin: 1,
          scale: 8,
          color: {
            dark: "#172027",
            light: "#FFF8EA",
          },
        })
      : null;

  return Response.json({
    status,
    qrImage,
    updatedAt: state?.updatedAt ?? null,
    connectedAt: status === "connected" ? state?.connectedAt ?? state?.updatedAt ?? null : null,
    lastDisconnect: state?.lastDisconnect ?? null,
    command: setup.personalPairing.command,
    message:
      status === "disabled"
        ? "Bridge WA personal belum diaktifkan untuk runtime ini."
        : status === "waiting-for-bridge"
          ? "Jalankan bridge WA personal di server/terminal untuk membuat QR."
          : status === "qr"
            ? "Scan QR dari WhatsApp biasa: Perangkat tertaut, lalu Tautkan perangkat."
            : status === "connected"
              ? "WA personal testing terhubung. Pesan teks, foto, dan PDF masuk ke meja verifikasi."
              : "Bridge WA personal belum terhubung. Jalankan ulang bridge jika perlu pairing baru.",
    capabilities: state?.capabilities ?? setup.personalPairing.capabilities,
  });
}

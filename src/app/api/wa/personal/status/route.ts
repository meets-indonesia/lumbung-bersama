import QRCode from "qrcode";
import { requireAuthenticatedRequest } from "@/lib/auth";
import { readWaPersonalBridgeState, waPersonalRuntimeStatus } from "@/lib/wa-personal-state";
import { getWaSetupStatus } from "../../status";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  const setup = getWaSetupStatus();
  const state = await readWaPersonalBridgeState();
  const status = waPersonalRuntimeStatus(state, setup.personalPairing.status === "available");
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

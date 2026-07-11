import { readFile } from "node:fs/promises";
import path from "node:path";

export type WaPersonalBridgeState = {
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

function statePathFromDir(dir: string) {
  return path.resolve(process.cwd(), dir, "status.json");
}

export function waPersonalStateFileCandidates() {
  return Array.from(
    new Set(
      [
        process.env.WA_PERSONAL_STATE_DIR ? statePathFromDir(process.env.WA_PERSONAL_STATE_DIR) : null,
        statePathFromDir(".wa-personal-state"),
        "/tmp/wa-personal-state/status.json",
      ].filter(Boolean) as string[],
    ),
  );
}

export async function readWaPersonalBridgeState() {
  for (const candidate of waPersonalStateFileCandidates()) {
    try {
      const raw = await readFile(candidate, "utf8");
      return JSON.parse(raw) as WaPersonalBridgeState;
    } catch {
      // Try the next runtime state location.
    }
  }

  return null;
}

export function waPersonalRuntimeStatus(state: WaPersonalBridgeState | null, configured: boolean) {
  if (state?.status === "qr" && state.qr) return "qr";
  if (state?.status === "connected") return "connected";
  if (state?.status === "logged-out") return "logged-out";
  if (state?.status) return "disconnected";
  if (configured) return "waiting-for-bridge";
  return "disabled";
}

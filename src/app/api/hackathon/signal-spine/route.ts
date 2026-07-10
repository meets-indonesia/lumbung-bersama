import { buildSimkopdesSignalSpine } from "@/lib/simkopdes-signal-spine";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(buildSimkopdesSignalSpine());
}

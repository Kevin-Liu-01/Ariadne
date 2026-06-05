import { getBackbone } from "@/server/backbone";
import { requirePlayer } from "@/server/play/require-player";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live state for the web Live Player screen. Polled by /play/live. */
export async function GET(req: Request): Promise<Response> {
  const participantId = requirePlayer(req);
  if (!participantId) return problem(401, "unauthorized");
  const view = await getBackbone().player.me(participantId);
  if (!view) return problem(404, "participant not found");
  return json(view);
}

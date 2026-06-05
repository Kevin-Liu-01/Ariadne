import { getBackbone } from "@/server/backbone";
import { requirePlayer } from "@/server/play/require-player";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confirm the guest grabbed their ready drink. */
export async function POST(req: Request): Promise<Response> {
  const participantId = requirePlayer(req);
  if (!participantId) return problem(401, "unauthorized");
  const result = await getBackbone().player.confirmPickup(participantId);
  if (!result) return problem(404, "participant not found");
  return json(result);
}

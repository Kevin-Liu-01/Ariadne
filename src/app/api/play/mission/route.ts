import { getBackbone } from "@/server/backbone";
import { playerTextAction } from "@/server/play/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Submit a mission answer from the Live Player. Pass/fail is deterministic, as over text. */
export function POST(req: Request): Promise<Response> {
  return playerTextAction(req, (id, text) => getBackbone().player.submitMission(id, text));
}

import { getBackbone } from "@/server/backbone";
import { playerTextAction } from "@/server/play/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Send a song request to the DJ from the Live Player. */
export function POST(req: Request): Promise<Response> {
  return playerTextAction(req, (id, text) => getBackbone().player.requestSong(id, text));
}

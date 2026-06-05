import { getBackbone } from "@/server/backbone";
import { playerTextAction } from "@/server/play/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tap-to-order a drink from the Live Player. Routes to the same bar queue as text. */
export function POST(req: Request): Promise<Response> {
  return playerTextAction(req, (id, text) => getBackbone().player.orderDrink(id, text));
}

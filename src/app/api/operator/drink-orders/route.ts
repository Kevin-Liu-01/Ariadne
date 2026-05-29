import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import type { DrinkOrder } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withGuest(bb: ReturnType<typeof getBackbone>, order: DrinkOrder) {
  const p = bb.repos.participants.findById(order.participantId);
  return {
    ...order,
    guest: p ? { gameId: p.gameId, displayName: p.displayName } : null,
  };
}

export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  return json({
    active: bb.drinks.listActive().map((o) => withGuest(bb, o)),
    recent: bb.drinks.listRecent(50).map((o) => withGuest(bb, o)),
  });
}

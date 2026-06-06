import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import type { DrinkOrder } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function withGuest(bb: ReturnType<typeof getBackbone>, order: DrinkOrder) {
  const p = await bb.repos.participants.findById(order.participantId);
  return {
    ...order,
    guest: p ? { gameId: p.gameId, displayName: p.displayName } : null,
  };
}

export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  // Pull the full order history so the console can scroll every finished drink, not just the last few.
  const [active, recent] = await Promise.all([bb.drinks.listActive(), bb.drinks.listRecent(500)]);
  return json({
    active: await Promise.all(active.map((o) => withGuest(bb, o))),
    recent: await Promise.all(recent.map((o) => withGuest(bb, o))),
  });
}

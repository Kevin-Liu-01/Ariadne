import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { guestRefsById } from "@/server/http/operator-views";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  // Pull the full order history so the console can scroll every finished drink, not just the last few.
  const [active, recent] = await Promise.all([bb.drinks.listActive(), bb.drinks.listRecent(500)]);
  // One batched lookup for every guest on screen, not a findById per order.
  const ids = [...new Set([...active, ...recent].map((o) => o.participantId))];
  const guests = guestRefsById(await bb.repos.participants.findByIds(ids));
  return json({
    active: active.map((o) => ({ ...o, guest: guests.get(o.participantId) ?? null })),
    recent: recent.map((o) => ({ ...o, guest: guests.get(o.participantId) ?? null })),
  });
}

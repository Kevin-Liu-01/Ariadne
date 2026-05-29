import { GEMS } from "@/constants/gems";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Operator roster. Includes secret word so staff can force-complete a stuck guest. */
export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  const participants = bb.repos.participants.listByEvent(bb.eventId).map((p) => ({
    gameId: p.gameId,
    displayName: p.displayName,
    gem: p.gem,
    gemLabel: GEMS[p.gem].label,
    gemHex: GEMS[p.gem].hex,
    secretWord: p.secretWord,
    score: p.score,
    eliminated: p.eliminated,
    phone: p.phone,
  }));
  return json({ participants });
}

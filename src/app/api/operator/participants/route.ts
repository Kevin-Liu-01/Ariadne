import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { participantView } from "@/server/http/operator-views";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Operator roster. Includes secret word so staff can force-complete a stuck guest. */
export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  const roster = await bb.repos.participants.listByEvent(bb.eventId);
  return json({ participants: roster.map(participantView) });
}

import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { participantView, stageView } from "@/server/http/operator-views";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operator roster. Includes secret word (force-complete a stuck guest), each guest's
 * current game stage, and per-game status so staff can move them between games.
 */
export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  const [roster, statuses, conversations] = await Promise.all([
    bb.repos.participants.listByEvent(bb.eventId),
    bb.repos.participantMissions.statusesByEvent(bb.eventId),
    bb.repos.conversations.listByEvent(bb.eventId),
  ]);
  // listByEvent orders newest first, so the first pointer seen per guest is the live one.
  const pointerByParticipant = new Map<string, string | null>();
  for (const c of conversations) {
    if (c.participantId && !pointerByParticipant.has(c.participantId)) {
      pointerByParticipant.set(c.participantId, c.currentMissionId);
    }
  }
  const participants = roster.map((p) =>
    participantView(p, stageView(statuses.get(p.id) ?? {}, pointerByParticipant.get(p.id) ?? null)),
  );
  return json({ participants });
}

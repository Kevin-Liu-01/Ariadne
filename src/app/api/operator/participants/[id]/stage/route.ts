import { z } from "zod";
import { MISSION_SEQUENCE } from "@/constants/missions";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { participantView, stageView } from "@/server/http/operator-views";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  missionId: z.enum([...MISSION_SEQUENCE] as [string, ...string[]]),
});

/** Operator override: move a guest onto a specific game (the staff stage toggle). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const { id } = await params;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return problem(422, "invalid stage update");
  }

  const bb = getBackbone();
  const moved = await bb.missions.setStageForParticipant(id, body.missionId);
  if (!moved) return problem(404, "participant not found");

  // Reflect the move back: re-read the guest plus their stage so the console updates.
  const [participant, statuses, conversation] = await Promise.all([
    bb.repos.participants.findById(id),
    bb.repos.participantMissions.listByParticipant(id),
    bb.repos.conversations.findLatestByParticipant(id),
  ]);
  if (!participant) return problem(404, "participant not found");
  const statusRecord: Record<string, string> = {};
  for (const m of statuses) statusRecord[m.missionId] = m.status;
  return json(participantView(participant, stageView(statusRecord, conversation?.currentMissionId ?? null)));
}

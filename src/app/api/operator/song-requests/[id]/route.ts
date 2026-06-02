import { z } from "zod";
import { songDecisionCopy } from "@/constants/copy";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import { sendToParticipant } from "@/server/partners/agentphone/outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({ status: z.enum(["accepted", "rejected", "played"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const { id } = await params;

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch {
    return problem(422, "invalid song decision");
  }

  const updated = await getBackbone().repos.songRequests.setStatus(id, body.status);
  if (!updated) return problem(404, "request not found");

  // Tell the guest the verdict (best-effort) when the DJ accepts or rejects.
  if (body.status === "accepted" || body.status === "rejected") {
    void sendToParticipant(updated.participantId, songDecisionCopy(updated.rawText, body.status === "accepted"));
  }
  return json(updated);
}

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

  // Only ping the guest on an accept. Rejections are silent: the DJ just skips
  // it in the queue and the guest is never told no.
  if (body.status === "accepted") {
    void sendToParticipant(updated.participantId, songDecisionCopy(updated.rawText, true));
  }
  return json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const { id } = await params;
  const removed = await getBackbone().repos.songRequests.remove(id);
  if (!removed) return problem(404, "request not found");
  return json({ ok: true });
}

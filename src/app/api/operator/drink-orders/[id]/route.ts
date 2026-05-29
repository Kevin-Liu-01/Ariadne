import { z } from "zod";
import { DRINK_STATUSES } from "@/constants/drinks";
import { drinkReadyCopy } from "@/constants/copy";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import { sendToParticipant } from "@/server/partners/agentphone/outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({
  status: z.enum(DRINK_STATUSES),
  note: z.string().trim().max(200).optional(),
});

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
    return problem(422, "invalid status update");
  }

  const updated = getBackbone().drinks.updateStatus(id, body.status, body.note ?? null);
  if (!updated) return problem(404, "order not found");

  // Notify the guest when the drink is ready (best-effort).
  if (body.status === "ready") {
    void sendToParticipant(updated.participantId, drinkReadyCopy(updated.label));
  }
  return json(updated);
}

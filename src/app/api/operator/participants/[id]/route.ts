import { z } from "zod";
import { GEM_IDS, type GemId } from "@/constants/gems";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { participantView } from "@/server/http/operator-views";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({
  displayName: z.string().trim().max(40).nullable().optional(),
  gem: z.enum(GEM_IDS as [GemId, ...GemId[]]).optional(),
  secretWord: z.string().trim().min(1).max(40).optional(),
  score: z.number().int().min(0).max(100000).optional(),
  eliminated: z.boolean().optional(),
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
    return problem(422, "invalid participant update");
  }

  const updated = await getBackbone().participantAdmin.edit(id, body);
  if (!updated) return problem(404, "participant not found");
  return json(participantView(updated));
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const { id } = await params;
  const removed = await getBackbone().participantAdmin.remove(id);
  if (!removed) return problem(404, "participant not found");
  return json({ ok: true });
}

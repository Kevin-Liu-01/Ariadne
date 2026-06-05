import { z } from "zod";
import { requirePlayer } from "@/server/play/require-player";
import { json, problem } from "@/server/http/respond";

const TextBody = z.object({ text: z.string().trim().min(1).max(200) });

/**
 * Shared shell for a token-gated player action that takes a `{ text }` body:
 * authenticate, parse, run, and map a null (unknown participant) to 404. Keeps the
 * drink / song / mission routes to a single line each.
 */
export async function playerTextAction<T>(
  req: Request,
  run: (participantId: string, text: string) => Promise<T | null>,
): Promise<Response> {
  const participantId = requirePlayer(req);
  if (!participantId) return problem(401, "unauthorized");
  let body: z.infer<typeof TextBody>;
  try {
    body = TextBody.parse(await req.json());
  } catch {
    return problem(422, "invalid request");
  }
  const result = await run(participantId, body.text);
  if (!result) return problem(404, "participant not found");
  return json(result);
}

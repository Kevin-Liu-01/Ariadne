import { z } from "zod";
import { GEMS } from "@/constants/gems";
import { normalizePhone } from "@/domain/phone";
import { getBackbone } from "@/server/backbone";
import { signPlayerToken } from "@/server/play/session";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RegisterBody = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(32).optional(),
  category: z.string().trim().max(60).optional(),
  stationId: z.string().trim().max(60).optional(),
  channel: z.enum(["sms", "mms", "imessage", "voice"]).optional(),
});

export async function POST(req: Request): Promise<Response> {
  let input: z.infer<typeof RegisterBody>;
  try {
    input = RegisterBody.parse(await req.json());
  } catch {
    return problem(422, "invalid registration");
  }

  const bb = getBackbone();
  // Name-only check-in: the phone (when given) is the identity, so a re-submit from
  // the same number resumes the same guest instead of minting a duplicate tile.
  const result = await bb.registration.register({
    phone: input.phone ? normalizePhone(input.phone) || null : null,
    externalConversationId: null,
    channel: input.channel ?? null,
    name: input.name,
    category: input.category ?? null,
    stationId: input.stationId ?? null,
  });
  const p = result.participant;

  // The signed token is the browser's identity for the web Live Player (/play/live).
  return json({
    isNew: result.isNew,
    playerToken: signPlayerToken(p.id),
    participant: {
      gameId: p.gameId,
      gem: p.gem,
      gemLabel: GEMS[p.gem].label,
      gemHex: GEMS[p.gem].hex,
      secretWord: p.secretWord,
      displayName: p.displayName,
    },
    firstMission: result.firstMission
      ? { title: result.firstMission.title, prompt: bb.missions.renderPrompt(result.firstMission, p) }
      : null,
  });
}

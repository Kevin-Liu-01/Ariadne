import { z } from "zod";
import { GEMS } from "@/constants/gems";
import { getBackbone } from "@/server/backbone";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RegisterBody = z.object({
  name: z.string().trim().min(1).max(80).optional(),
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
  const result = await bb.registration.register({
    phone: input.phone ?? null,
    externalConversationId: null,
    channel: input.channel ?? null,
    name: input.name ?? null,
    category: input.category ?? null,
    stationId: input.stationId ?? null,
  });
  const p = result.participant;

  return json({
    isNew: result.isNew,
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

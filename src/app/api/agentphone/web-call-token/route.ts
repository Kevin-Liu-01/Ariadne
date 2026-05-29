import { env } from "@/lib/env";
import { getAgentphoneClient } from "@/server/partners/agentphone/client";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mints a 30-second AgentPhone web-call token for the iPad/browser voice path. */
export async function POST(req: Request): Promise<Response> {
  if (!env.agentphone.agentId || !env.agentphone.apiKey) {
    return problem(503, "web voice not configured");
  }
  let variables: Record<string, string> | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as { variables?: Record<string, string> };
    variables = body.variables;
  } catch {
    variables = undefined;
  }
  try {
    const token = await getAgentphoneClient().createWebCall({
      agentId: env.agentphone.agentId,
      variables,
    });
    return json(token);
  } catch {
    return problem(502, "could not mint web call token");
  }
}

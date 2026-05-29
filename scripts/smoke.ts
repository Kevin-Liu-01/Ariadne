/**
 * Live AgentPhone smoke test. Reads account usage + agents, triggers a signed
 * test webhook at this server, and optionally sends one real SMS.
 *
 * Usage: pnpm smoke                  (usage + agents + test webhook)
 *        pnpm smoke --send +1555...   (also send a real outbound message)
 */
import { loadScriptEnv } from "@/lib/env";

loadScriptEnv();

import { env, requireAgentphoneApi } from "@/lib/env";
import { AgentphoneClient } from "@/server/partners/agentphone/client";

async function main(): Promise<void> {
  const { apiKey, baseUrl } = requireAgentphoneApi();
  const client = new AgentphoneClient(apiKey, baseUrl);

  console.log("• usage:", JSON.stringify(await client.getUsage()));
  const agents = await client.listAgents();
  console.log("• agents:", agents.data.map((a) => ({ id: a.id, name: a.name })));

  if (env.agentphone.agentId) {
    console.log(`• triggering test webhook for agent ${env.agentphone.agentId} …`);
    try {
      console.log("  result:", JSON.stringify(await client.testAgentWebhook(env.agentphone.agentId)));
    } catch (err) {
      console.error("  test webhook failed:", err);
    }
  } else {
    console.log("• no AGENTPHONE_AGENT_ID set — run `pnpm provision` first to test the webhook.");
  }

  const sendIdx = process.argv.indexOf("--send");
  const to = sendIdx >= 0 ? process.argv[sendIdx + 1] : undefined;
  if (to && env.agentphone.agentId) {
    console.log(`• sending a real message to ${to} …`);
    try {
      console.log("  sent:", JSON.stringify(await client.sendMessage({
        agentId: env.agentphone.agentId,
        toNumber: to,
        body: "Ariadne smoke test — text JOIN to check in.",
      })));
    } catch (err) {
      console.error("  send failed (expected for SMS without 10DLC; iMessage works):", err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

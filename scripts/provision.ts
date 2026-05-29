/**
 * Provision (idempotently) the AgentPhone surface for Ariadne:
 *   1. create/reuse a dedicated "Ariadne · Run(way)time" agent (webhook mode),
 *   2. ensure it has a phone number (provision one if missing),
 *   3. point a PER-AGENT webhook at this server (leaves the account master
 *      webhook + any other agents untouched),
 *   4. write the resulting ids + signing secret into .env.local.
 *
 * Usage: pnpm provision            (provisions a number if the agent has none)
 *        pnpm provision --no-number (only (re)configure agent + webhook)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ARIADNE_BEGIN_MESSAGE, ARIADNE_SYSTEM_PROMPT } from "@/constants/prompts";
import { env, loadScriptEnv, requireAgentphoneApi } from "@/lib/env";
import { AgentphoneClient } from "@/server/partners/agentphone/client";
import type { AgentResponse } from "@/server/partners/agentphone/types";

const AGENT_NAME = "Ariadne · Run(way)time";

loadScriptEnv();

function upsertEnvLocal(updates: Record<string, string>): void {
  const path = ".env.local";
  const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
  for (const [key, value] of Object.entries(updates)) {
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    const line = `${key}=${value}`;
    if (idx >= 0) lines[idx] = line;
    else lines.push(line);
  }
  writeFileSync(path, lines.join("\n").replace(/\n+$/, "") + "\n");
}

async function main(): Promise<void> {
  const { apiKey, baseUrl } = requireAgentphoneApi();
  const client = new AgentphoneClient(apiKey, baseUrl);
  const webhookUrl = `${env.publicBaseUrl}/api/webhooks/agentphone`;
  const provisionNumber = !process.argv.includes("--no-number");

  if (env.publicBaseUrl.includes("localhost")) {
    console.warn("⚠ ARIADNE_PUBLIC_BASE_URL is localhost — AgentPhone cannot reach it. Start a tunnel first.");
  }

  const agents = await client.listAgents();
  let agent: AgentResponse | undefined = agents.data.find((a) => a.name === AGENT_NAME);

  if (agent) {
    console.log(`• reusing agent ${agent.id} (${AGENT_NAME})`);
  } else {
    agent = await client.createAgent({
      name: AGENT_NAME,
      description: "Ariadne — phone-first host for Run(way)time.",
      voiceMode: "webhook",
      systemPrompt: ARIADNE_SYSTEM_PROMPT,
      beginMessage: ARIADNE_BEGIN_MESSAGE,
    });
    console.log(`• created agent ${agent.id}`);
  }

  let numberId = agent.numbers?.[0]?.id ?? "";
  let phoneNumber = agent.numbers?.[0]?.phoneNumber ?? "";
  if (!numberId && provisionNumber) {
    const num = await client.createNumber();
    await client.attachNumber(agent.id, num.id);
    numberId = num.id;
    phoneNumber = num.phoneNumber;
    console.log(`• provisioned + attached number ${phoneNumber} (${numberId})`);
  } else if (numberId) {
    console.log(`• agent already has number ${phoneNumber} (${numberId})`);
  } else {
    console.log("• skipped number provisioning (--no-number)");
  }

  const webhook = await client.createOrUpdateAgentWebhook(agent.id, webhookUrl, { contextLimit: 10 });
  console.log(`• per-agent webhook → ${webhookUrl}`);

  upsertEnvLocal({
    AGENTPHONE_AGENT_ID: agent.id,
    AGENTPHONE_NUMBER_ID: numberId,
    AGENTPHONE_PHONE_NUMBER: phoneNumber,
    AGENTPHONE_WEBHOOK_SECRET: webhook.secret,
  });

  console.log("\n✓ provisioned. wrote ids + webhook secret to .env.local");
  console.log(`  agent:   ${agent.id}`);
  console.log(`  number:  ${phoneNumber || "(none)"}`);
  console.log(`  webhook: ${webhookUrl}`);
}

main().catch((err) => {
  console.error("provision failed:", err);
  process.exit(1);
});

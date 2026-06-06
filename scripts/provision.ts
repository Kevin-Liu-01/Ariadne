/**
 * Provision (idempotently) the AgentPhone surface for Ariadne:
 *   1. create OR update a dedicated "Ariadne · Run(way)time" agent (webhook mode),
 *      always pushing the current name, description, system prompt, and begin
 *      message so config edits in the repo propagate to the live agent,
 *   2. ensure it has a phone number (provision one if missing),
 *   3. point a PER-AGENT webhook at this server (leaves the account master
 *      webhook + any other agents untouched),
 *   4. write the resulting ids + signing secret into .env.local.
 *
 * Usage: pnpm provision              (provisions a number if the agent has none)
 *        pnpm provision --no-number   (only (re)configure agent + webhook)
 *        pnpm provision --prompt-only (push name/description/system prompt/begin
 *                                      message to the live agent ONLY; leaves the
 *                                      number and webhook -- and its signing secret
 *                                      -- untouched, so it is safe to run against
 *                                      prod after a copy/prompt edit)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { EVENT_NAME, PRODUCT_NAME } from "@/constants/event";
import { ARIADNE_BEGIN_MESSAGE, ARIADNE_SYSTEM_PROMPT } from "@/constants/prompts";
import { env, loadScriptEnv, requireAgentphoneApi } from "@/lib/env";
import { AgentphoneClient } from "@/server/partners/agentphone/client";
import type { AgentResponse } from "@/server/partners/agentphone/types";

/** Live agent identity, sourced from the brand constants so it tracks the rebrand. */
const AGENT_NAME = `${PRODUCT_NAME} · ${EVENT_NAME}`;
const AGENT_DESCRIPTION = `${PRODUCT_NAME}, the phone-first host for ${EVENT_NAME}.`;
/** Pre-rebrand agent names to adopt + rename in place instead of creating a duplicate. */
const LEGACY_AGENT_NAMES = ["Ariadne · Run(time)way"];

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
  const promptOnly = process.argv.includes("--prompt-only");
  const provisionNumber = !promptOnly && !process.argv.includes("--no-number");

  if (env.publicBaseUrl.includes("localhost")) {
    console.warn("⚠ ARIADNE_PUBLIC_BASE_URL is localhost — AgentPhone cannot reach it. Start a tunnel first.");
  }

  const agentConfig = {
    name: AGENT_NAME,
    description: AGENT_DESCRIPTION,
    systemPrompt: ARIADNE_SYSTEM_PROMPT,
    beginMessage: ARIADNE_BEGIN_MESSAGE,
  };

  // Prefer the id we already stored (so a rename updates in place); else match the
  // current or a legacy name. Found agents keep the `numbers` from listAgents.
  const agents = await client.listAgents();
  const existing =
    (env.agentphone.agentId ? agents.data.find((a) => a.id === env.agentphone.agentId) : undefined) ??
    agents.data.find((a) => a.name === AGENT_NAME) ??
    agents.data.find((a) => LEGACY_AGENT_NAMES.includes(a.name));

  let agent: AgentResponse;
  if (existing) {
    await client.updateAgent(existing.id, agentConfig);
    agent = existing;
    console.log(`• updated agent ${existing.id} -> ${AGENT_NAME} (prompt + begin message refreshed)`);
  } else if (promptOnly) {
    throw new Error(
      "--prompt-only needs an already-provisioned agent, but none was found. Run `pnpm provision` first.",
    );
  } else {
    agent = await client.createAgent({ voiceMode: "webhook", ...agentConfig });
    console.log(`• created agent ${agent.id} (${AGENT_NAME})`);
  }

  // Prompt-only sync: the agent's name/description/system prompt/begin message are
  // now current. Stop before the number + webhook steps so the signing secret is
  // never rotated -- safe to run against prod whenever the repo copy changes.
  if (promptOnly) {
    console.log("\n✓ synced agent name, description, system prompt, and begin message.");
    console.log("  number + webhook left untouched (signing secret unchanged).");
    console.log(`  agent: ${agent.id}`);
    return;
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

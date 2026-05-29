/**
 * Post a correctly-signed AgentPhone `agent.message` at a running server. Lets
 * you exercise the full webhook path (signature verify -> idempotency -> brain
 * -> reply) locally without a real phone. Requires AGENTPHONE_WEBHOOK_SECRET.
 *
 * Usage: pnpm simulate --from +15550001111 --text "vodka soda"
 *        pnpm simulate --text "JOIN" --channel sms --url http://localhost:3939
 */
import { createHmac } from "node:crypto";
import { env, loadScriptEnv } from "@/lib/env";

loadScriptEnv();

function arg(flag: string, fallback: string): string {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main(): Promise<void> {
  const from = arg("--from", "+15550000001");
  const message = arg("--text", "JOIN");
  const channel = arg("--channel", "sms");
  const base = arg("--url", env.publicBaseUrl);
  const secret = env.agentphone.webhookSecret;
  if (!secret) {
    throw new Error("AGENTPHONE_WEBHOOK_SECRET is unset — run `pnpm provision` or set it in .env.local");
  }

  const ts = Math.floor(Date.now() / 1000).toString();
  const webhookId = `sim_${Date.now()}`;
  const isVoice = channel === "voice";
  const payload = {
    event: "agent.message",
    channel,
    timestamp: new Date().toISOString(),
    agentId: env.agentphone.agentId || "agt_sim",
    data: {
      conversationId: `conv_${from}`,
      callId: isVoice ? `call_${from}` : undefined,
      numberId: env.agentphone.numberId || "num_sim",
      from,
      to: env.agentphone.phoneNumber || "+19990000000",
      message: isVoice ? undefined : message,
      transcript: isVoice ? message : undefined,
      direction: "inbound",
      receivedAt: new Date().toISOString(),
    },
    conversationState: null,
    recentHistory: [],
  };
  const raw = JSON.stringify(payload);
  const signature = `sha256=${createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex")}`;

  const res = await fetch(`${base}/api/webhooks/agentphone`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": signature,
      "x-webhook-timestamp": ts,
      "x-webhook-id": webhookId,
      "x-webhook-event": "agent.message",
    },
    body: raw,
  });
  console.log(`→ ${channel} "${message}" from ${from}`);
  console.log(`← ${res.status} ${await res.text()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

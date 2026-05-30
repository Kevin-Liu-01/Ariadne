/**
 * Live smoke test of the conversational brain against the Dedalus gateway.
 * Requires DEDALUS_API_KEY in .env.local. Sends one message through the real
 * agent (in-memory DB) and prints the reply.
 *
 * Usage: pnpm smoke:agent "hey, what is this place?"
 *        pnpm smoke:agent "I'm Kevin"
 */
import { loadScriptEnv } from "@/lib/env";

loadScriptEnv();

import { Backbone } from "@/server/backbone";
import { createDb } from "@/server/db/connection";
import { EventBus } from "@/server/services/event-bus";

async function main(): Promise<void> {
  const turns =
    process.argv.length > 2
      ? process.argv.slice(2)
      : ["hey, what is this place?", "what's good to drink?", "who is ariadne?"];
  const bb = new Backbone(createDb(":memory:"), { eventId: "smoke", bus: new EventBus() });
  const history: { content: string; direction: "inbound" | "outbound" }[] = [];

  for (const text of turns) {
    const reply = await bb.brain.process({
      provider: "agentphone",
      webhookId: `smoke_${history.length}`,
      channel: "sms",
      externalConversationId: "conv_smoke",
      from: "+15550000000",
      to: "+19990000000",
      text,
      mediaUrls: [],
      receivedAt: new Date().toISOString(),
      recentHistory: [...history],
      conversationState: null,
    });
    console.log(`\nguest:   ${text}`);
    console.log(`ariadne: ${reply.text}`);
    history.push({ content: text, direction: "inbound" });
    history.push({ content: reply.text, direction: "outbound" });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

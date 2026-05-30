/**
 * Seed the local DB with demo participants/missions/drinks so /projection and
 * /operator have something to show without a phone. Writes to the Supabase
 * Postgres pointed at by SUPABASE_DB_URL via the live conversational brain.
 */
import { loadScriptEnv } from "@/lib/env";

loadScriptEnv();

import type { InteractionEvent } from "@/domain/types";
import { getBackbone } from "@/server/backbone";

let seq = 0;
function inbound(from: string, text: string): InteractionEvent {
  seq += 1;
  return {
    provider: "agentphone",
    webhookId: `seed_${seq}`,
    channel: "sms",
    externalConversationId: `conv_${from}`,
    from,
    to: "+19990000000",
    text,
    mediaUrls: [],
    receivedAt: new Date().toISOString(),
    recentHistory: [],
    conversationState: null,
  };
}

const NAMES = ["Alice", "Bao", "Cleo", "Diego", "Esme", "Finn", "Gwen", "Hiro"];

async function main(): Promise<void> {
  const bb = getBackbone();
  const phones = NAMES.map((_, i) => `+1999000${1000 + i}`);

  for (let i = 0; i < NAMES.length; i += 1) {
    await bb.brain.process(inbound(phones[i], `I'm ${NAMES[i]}`));
  }

  const ids: string[] = [];
  for (const phone of phones) {
    const p = await bb.repos.participants.findByPhone(bb.eventId, phone);
    ids.push(p?.gameId ?? "");
  }

  // two trios solve the color constellation
  await bb.brain.process(inbound(phones[0], `${ids[0]} ${ids[1]} ${ids[2]}`));
  await bb.brain.process(inbound(phones[3], `${ids[3]} ${ids[4]} ${ids[5]}`));

  // a couple of drinks
  await bb.brain.process(inbound(phones[1], "espresso martini"));
  await bb.brain.process(inbound(phones[2], "vodka soda, double"));

  await bb.projection.emit("scene.changed", { scene: "runway" });

  const snap = await bb.projection.snapshot();
  console.log(`✓ seeded ${snap.stats.checkedIn} guests, ${snap.stats.missionsCompleted} missions solved, ${snap.stats.drinksActive} drinks open`);
  console.log("  open /projection and /operator to see the board.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

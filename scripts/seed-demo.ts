/**
 * Seed the local DB with demo participants/missions/drinks so /projection and
 * /operator have something to show without a phone. Writes to ARIADNE_DB_PATH.
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

function main(): void {
  const bb = getBackbone();
  const phones = NAMES.map((_, i) => `+1999000${1000 + i}`);

  NAMES.forEach((name, i) => bb.brain.process(inbound(phones[i], `I'm ${name}`)));

  const ids = phones.map((p) => bb.repos.participants.findByPhone(bb.eventId, p)?.gameId ?? "");

  // two trios solve the color constellation
  bb.brain.process(inbound(phones[0], `${ids[0]} ${ids[1]} ${ids[2]}`));
  bb.brain.process(inbound(phones[3], `${ids[3]} ${ids[4]} ${ids[5]}`));

  // a couple of drinks
  bb.brain.process(inbound(phones[1], "espresso martini"));
  bb.brain.process(inbound(phones[2], "vodka soda, double"));

  bb.projection.emit("scene.changed", { scene: "runway" });

  const snap = bb.projection.snapshot();
  console.log(`✓ seeded ${snap.stats.checkedIn} guests, ${snap.stats.missionsCompleted} missions solved, ${snap.stats.drinksActive} drinks open`);
  console.log("  open /projection and /operator to see the board.");
}

main();

/**
 * Full multi-player end-to-end on a fresh in-memory DB driven by the REAL LLM
 * brain. Walks a roomful of guests through the entire cycle — check-in, all three
 * quests (color, word, riddle), drinks, operator actions, projection, profanity — exactly as
 * the deployed code runs it, but isolated (no Supabase writes, no board
 * pollution) and deterministic (a clean DB gives a clean gem/word spread).
 *
 * Usage: npx tsx scripts/e2e-full.ts
 */
import { loadScriptEnv } from "@/lib/env";

loadScriptEnv();

import { PUZZLES } from "@/constants/puzzles";
import { riddlesForParticipant } from "@/domain/mission-parse";
import type { InboundChannel } from "@/constants/event";
import type { InteractionEvent } from "@/domain/types";
import { Backbone } from "@/server/backbone";
import { createPgliteDb } from "@/server/db/pglite";
import { getDedalusChat } from "@/server/partners/dedalus/client";

const EVENT = "e2e";
let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = ""): void {
  if (cond) pass += 1;
  else fail += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

let seq = 0;
function inbound(from: string, text: string): InteractionEvent {
  seq += 1;
  return {
    provider: "agentphone",
    webhookId: `e2e_${seq}`,
    channel: "sms" as InboundChannel,
    externalConversationId: `conv_${from}`,
    from,
    to: "+15550000000",
    text,
    mediaUrls: [],
    receivedAt: new Date().toISOString(),
    recentHistory: [],
    conversationState: null,
  };
}

const CLEAN = [
  { phone: "+19990000001", name: "Aria" },
  { phone: "+19990000002", name: "Bell" },
  { phone: "+19990000003", name: "Cyrus" },
  { phone: "+19990000004", name: "Dione" },
  { phone: "+19990000005", name: "Echo" },
  { phone: "+19990000006", name: "Faye" },
];

const COLOR_GROUPS: Record<string, string[]> = {
  amethyst: ["amethyst", "garnet"],
  garnet: ["garnet", "amethyst"],
  moonstone: ["moonstone", "peridot"],
  peridot: ["peridot", "moonstone"],
  aquamarine: ["aquamarine", "topaz", "peridot"],
  topaz: ["topaz", "aquamarine", "peridot"],
};

async function main(): Promise<void> {
  const bb = new Backbone(await createPgliteDb(), { eventId: EVENT, chat: getDedalusChat() });
  const say = (from: string | null, text: string) => bb.brain.process(inbound(from ?? "", text));
  const live = () => bb.repos.participants.listByEvent(EVENT);
  const scored = async (min: number) =>
    (await live()).filter((p) => CLEAN.some((c) => c.phone === p.phone) && p.score >= min).length;

  console.log("== Ariadne FULL e2e (fresh DB, real brain) ==\n");

  // ---- Phase 1: check-in (sequential → clean gem/word spread) ----
  for (const p of CLEAN) await say(p.phone, `hey, I'm ${p.name}`);

  // Web check-in with a profane name must be anonymized.
  const profane = await bb.registration.register({
    phone: "+19990000099",
    externalConversationId: null,
    channel: null,
    name: "Shithead McGee",
  });
  ok("profane name anonymized at check-in", profane.participant.displayName === null, `name=${profane.participant.displayName}`);

  const clean = (await live()).filter((p) => CLEAN.some((c) => c.phone === p.phone));
  ok("all 6 guests checked in", clean.length === 6, `${clean.length}/6`);
  ok("6 distinct gems assigned", new Set(clean.map((p) => p.gem)).size === 6, [...new Set(clean.map((p) => p.gem))].join(","));

  const byGem = Object.fromEntries(clean.map((p) => [p.gem, p]));
  const byWord = Object.fromEntries(clean.map((p) => [p.secretWord, p]));
  const gid = (gem: string) => byGem[gem]?.gameId ?? "????";

  // ---- Phase 2: color quest ----
  await Promise.all(
    Object.entries(COLOR_GROUPS).map(([gem, group]) =>
      byGem[gem] ? say(byGem[gem].phone, group.map(gid).join(" ")) : Promise.resolve(null),
    ),
  );
  ok("color quest scored for all 6", (await scored(100)) === 6, `${await scored(100)}/6 at >=100`);

  // ---- Phase 3: word match ----
  await Promise.all(
    (
      [
        ["give", "wings"],
        ["drip", "ship"],
        ["run", "way"],
      ] as const
    ).flatMap(([a, b]) => {
      const pa = byWord[a];
      const pb = byWord[b];
      return pa && pb
        ? [say(pa.phone, `${a} ${b} ${pb.gameId}`), say(pb.phone, `${b} ${a} ${pa.gameId}`)]
        : [];
    }),
  );
  ok("word match scored for all 6", (await scored(250)) === 6, `${await scored(250)}/6 at >=250`);

  // ---- Phase 4: riddle quest (each guest solves 3 of the 8 riddles, any order) ----
  for (const p of clean) {
    for (const riddle of riddlesForParticipant(p.gameId)) await say(p.phone, riddle.answers[0]);
  }
  // color (100) + riddle (3x50) = 250 minimum, regardless of whether word scored.
  ok("riddle quest scored for all 6", (await scored(250)) === 6, `${await scored(250)}/6 at >=250`);

  // ---- Phase 5: drinks + operator queue ----
  await say(byGem.garnet.phone, "can I get a vodka soda");
  await say(byGem.peridot.phone, "espresso martini please");
  const active = await bb.drinks.listActive();
  ok("2 drinks queued to the bar", active.length >= 2, `${active.length} active`);
  if (active[0]) {
    await bb.drinks.updateStatus(active[0].id, "in_progress", null);
    const ready = await bb.drinks.updateStatus(active[0].id, "ready", null);
    ok("operator advanced a drink to ready", ready?.status === "ready");
  }

  // ---- Phase 7: flag operator + resolve ----
  await say(byGem.moonstone.phone, "I think I lost my jacket — can someone help?");
  let open = await bb.repos.operatorAlerts.listOpen(EVENT);
  ok("guest issue raised an operator alert", open.length >= 1, `${open.length} open`);
  if (open[0]) {
    await bb.repos.operatorAlerts.resolve(open[0].id);
    open = await bb.repos.operatorAlerts.listOpen(EVENT);
    ok("operator resolved the alert", open.length === 0, `${open.length} open after resolve`);
  }

  // ---- Phase 8: scene + puzzle advance (projection board ambiance, not a quest) ----
  await bb.projection.emit("scene.changed", { scene: "runway" });
  const puzzleId = await bb.projection.currentPuzzleId();
  const at = PUZZLES.findIndex((p) => p.id === puzzleId);
  const next = PUZZLES[(at + 1) % PUZZLES.length];
  await bb.projection.emit("puzzle.changed", { puzzleId: next.id, imageUrl: next.imageUrl ?? null });
  const snap = await bb.projection.snapshot();
  ok("scene change reflected on board", snap.scene === "runway", `scene=${snap.scene}`);
  ok("puzzle advanced on board", snap.puzzle.id === next.id, `puzzle=${snap.puzzle.id}`);

  // ---- Phase 9: fade + restore ----
  const victim = byGem.topaz;
  await bb.repos.participants.setEliminated(victim.id, true);
  ok("operator faded a guest", (await bb.repos.participants.findById(victim.id))?.eliminated === true);
  await bb.repos.participants.setEliminated(victim.id, false);
  ok("operator restored the guest", (await bb.repos.participants.findById(victim.id))?.eliminated === false);

  // ---- Phase 10: projection state + event stream ----
  const finalSnap = await bb.projection.snapshot();
  ok("projection shows all guests as tiles", finalSnap.participants.length >= 7, `${finalSnap.participants.length} tiles`);
  ok("projection counted mission completions", finalSnap.stats.missionsCompleted >= 24, `${finalSnap.stats.missionsCompleted} solved`);
  const top = finalSnap.participants[0];
  ok("leaderboard ranks by score", top.rank === 1 && top.score >= 490, `#1 ${top.gameId} score=${top.score}`);
  const events = await bb.projection.eventsSince(0);
  ok("projection event stream populated", events.length >= 24, `${events.length} events`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("e2e crashed:", e);
  process.exit(1);
});

import { describe, expect, it } from "vitest";
import type { GemId } from "@/constants/gems";
import type { Backbone } from "@/server/backbone";
import type { Conversation, Participant } from "@/domain/types";
import { riddlesForParticipant } from "@/domain/mission-parse";
import { QUEST_BASE, partnerQuestPoints, speedBonus } from "@/domain/scoring";
import { freshBackbone } from "./helpers";

const EVENT = "test-event";

async function checkIn(bb: Backbone, phone: string, name: string): Promise<Participant> {
  const result = await bb.registration.register({
    phone,
    externalConversationId: `conv_${phone}`,
    channel: "sms",
    name,
  });
  return result.participant;
}

async function conv(bb: Backbone, phone: string): Promise<Conversation> {
  const c = await bb.repos.conversations.findByPhone(EVENT, phone);
  if (!c) throw new Error("no conversation");
  return c;
}

/** These cover the deterministic core directly (no LLM), which is the contract the agent's tools call. */
describe("backbone services (deterministic core)", () => {
  it("checks in, orders a drink, and solves all three quests", async () => {
    const bb = await freshBackbone();

    // Six sequential check-ins assign all six distinct gems (round-robin index).
    const guests: Participant[] = [];
    for (let i = 1; i <= 6; i += 1) {
      guests.push(await checkIn(bb, `+100000000${i}`, `Guest${i}`));
    }
    const byGem = new Map<GemId, Participant>(guests.map((g) => [g.gem, g]));
    expect(byGem.size).toBe(6);
    expect((await bb.projection.snapshot()).stats.checkedIn).toBe(6);

    // The solver is a secondary-triangle gem so the primary triangle is three OTHERS.
    const solver = byGem.get("amethyst")!;
    const convFor = async () => conv(bb, solver.phone!);

    // drink: one cocktail voucher, queued to the bar.
    const drink = await bb.drinks.createFromText(solver, (await convFor()).id, "modelo");
    expect(drink.kind).toBe("queued");
    expect(await bb.drinks.listActive()).toHaveLength(1);

    // Color Quest: name three guests whose gems form the primary triangle (red/yellow/blue).
    // garnet=red, moonstone=Citrine yellow, aquamarine=blue. (topaz is orange, a secondary.)
    const triangle = [byGem.get("garnet")!, byGem.get("moonstone")!, byGem.get("aquamarine")!];
    const colorAnswer = triangle.map((p) => p.gameId).join(" ");
    // The solver is the first to finish each quest (prior completions = 0).
    const colorPts = partnerQuestPoints("color_quest", 0, 3);
    expect((await bb.missions.submit(solver, await convFor(), colorAnswer)).kind).toBe("correct");
    expect((await bb.repos.participants.findById(solver.id))?.score).toBe(colorPts);

    // Word Quest: name a fresh partner and include their secret word (any order proves it).
    const wordPartner = byGem.get("peridot")!;
    const wordAnswer = `${wordPartner.secretWord} ${wordPartner.gameId}`;
    const wordPts = partnerQuestPoints("word_match", 0, 1);
    expect((await bb.missions.submit(solver, await convFor(), wordAnswer)).kind).toBe("correct");
    expect((await bb.repos.participants.findById(solver.id))?.score).toBe(colorPts + wordPts);

    // Riddle Quest: solve all three assigned riddles (base each, plus a speed bonus on completion).
    const riddles = riddlesForParticipant(solver.gameId);
    expect(riddles).toHaveLength(3);
    for (const riddle of riddles) {
      await bb.missions.submit(solver, await convFor(), riddle.answers[0]);
    }
    const riddlePts = QUEST_BASE.riddle_quest * 3 + speedBonus(0);
    expect((await bb.repos.participants.findById(solver.id))?.score).toBe(colorPts + wordPts + riddlePts);

    const snap = await bb.projection.snapshot();
    expect(snap.stats.missionsCompleted).toBe(3);
    expect(snap.participants[0]?.gameId).toBe(solver.gameId);
  });

  it("rejects a wrong mission answer without scoring", async () => {
    const bb = await freshBackbone();
    const dana = await checkIn(bb, "+1222", "Dana");
    const wrong = await bb.missions.submit(dana, await conv(bb, "+1222"), "I think it's Theseus");
    expect(wrong.kind).toBe("incorrect");
    expect((await bb.repos.participants.findById(dana.id))?.score).toBe(0);
  });

  it("is idempotent on the partner-event id", async () => {
    const bb = await freshBackbone();
    const e = {
      id: "pe_1",
      eventId: EVENT,
      provider: "agentphone" as const,
      webhookId: "dup_1",
      eventType: "agent.message",
      channel: "sms",
      payload: "{}",
      status: "received" as const,
      createdAt: new Date().toISOString(),
    };
    expect(await bb.repos.partnerEvents.recordOnce(e)).toBe(true);
    expect(await bb.repos.partnerEvents.recordOnce({ ...e, id: "pe_2" })).toBe(false);
  });

  it("claims the contact-card / welcome-image send at most once (no duplicate onboarding)", async () => {
    const bb = await freshBackbone();
    await checkIn(bb, "+1888000001", "Onboard");
    const c = await conv(bb, "+1888000001");
    const repo = bb.repos.conversations;
    // Two inbound messages racing through deliver() must not both send the card.
    expect(await repo.claimContactCardSend(c.id)).toBe(true);
    expect(await repo.claimContactCardSend(c.id)).toBe(false);
    // A failed send releases the claim so the next message retries.
    await repo.releaseContactCardSend(c.id);
    expect(await repo.claimContactCardSend(c.id)).toBe(true);
    // The welcome image uses the same one-shot guard.
    expect(await repo.claimWelcomeImageSend(c.id)).toBe(true);
    expect(await repo.claimWelcomeImageSend(c.id)).toBe(false);
  });
});

/** The quests' rejection contract: bad triangles, wrong counts, repeat partners, wrong words. */
describe("mission edge cases", () => {
  // Six check-ins assign all six distinct gems; amethyst (a secondary hue) solves,
  // so the primary triangle is three OTHER guests (garnet/moonstone/aquamarine).
  async function room(bb: Backbone) {
    const guests: Participant[] = [];
    for (let i = 1; i <= 6; i += 1) guests.push(await checkIn(bb, `+1333000000${i}`, `G${i}`));
    const byGem = new Map<GemId, Participant>(guests.map((g) => [g.gem, g]));
    const solver = byGem.get("amethyst")!;
    return { byGem, solver, convFor: () => conv(bb, solver.phone!) };
  }

  it("rejects three colors that do not form a wheel triangle", async () => {
    const bb = await freshBackbone();
    const { byGem, solver, convFor } = await room(bb);
    // red + yellow + orange mixes a secondary in, so it is no triangle.
    const ids = [byGem.get("garnet")!, byGem.get("moonstone")!, byGem.get("topaz")!].map((p) => p.gameId);
    const r = await bb.missions.submit(solver, await convFor(), ids.join(" "));
    expect(r.kind).toBe("incorrect");
    expect((await bb.repos.participants.findById(solver.id))?.score).toBe(0);
  });

  it("rejects the color quest when fewer than three guests are named", async () => {
    const bb = await freshBackbone();
    const { byGem, solver, convFor } = await room(bb);
    const ids = [byGem.get("garnet")!, byGem.get("aquamarine")!].map((p) => p.gameId);
    expect((await bb.missions.submit(solver, await convFor(), ids.join(" "))).kind).toBe("incorrect");
  });

  it("rejects a partner already used on a prior quest (meet new people)", async () => {
    const bb = await freshBackbone();
    const { byGem, solver, convFor } = await room(bb);
    const triangle = [byGem.get("garnet")!, byGem.get("moonstone")!, byGem.get("aquamarine")!];
    expect(
      (await bb.missions.submit(solver, await convFor(), triangle.map((p) => p.gameId).join(" "))).kind,
    ).toBe("correct");
    // The word quest needs a *new* partner; reusing a color partner is rejected.
    const used = byGem.get("garnet")!;
    expect((await bb.missions.submit(solver, await convFor(), used.gameId)).kind).toBe("duplicate_partner");
  });

  it("rejects a word-quest partner named with the wrong secret word", async () => {
    const bb = await freshBackbone();
    const { byGem, solver, convFor } = await room(bb);
    // Clear color first so a single-partner submission routes to the word quest.
    const triangle = [byGem.get("garnet")!, byGem.get("moonstone")!, byGem.get("aquamarine")!];
    await bb.missions.submit(solver, await convFor(), triangle.map((p) => p.gameId).join(" "));
    const fresh = byGem.get("peridot")!;
    const r = await bb.missions.submit(solver, await convFor(), `zzzznotaword ${fresh.gameId}`);
    expect(r.kind).toBe("incorrect");
  });

  it("has nothing left to submit once all three quests are done", async () => {
    const bb = await freshBackbone();
    const { byGem, solver, convFor } = await room(bb);
    const triangle = [byGem.get("garnet")!, byGem.get("moonstone")!, byGem.get("aquamarine")!];
    await bb.missions.submit(solver, await convFor(), triangle.map((p) => p.gameId).join(" "));
    const fresh = byGem.get("peridot")!;
    await bb.missions.submit(solver, await convFor(), `${fresh.secretWord} ${fresh.gameId}`);
    for (const riddle of riddlesForParticipant(solver.gameId)) {
      await bb.missions.submit(solver, await convFor(), riddle.answers[0]);
    }
    expect((await bb.missions.submit(solver, await convFor(), "anything")).kind).toBe("no_mission");
  });
});

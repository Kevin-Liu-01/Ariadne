import { describe, expect, it } from "vitest";
import type { GemId } from "@/constants/gems";
import type { Backbone } from "@/server/backbone";
import type { Conversation, Participant } from "@/domain/types";
import { riddlesForParticipant } from "@/domain/mission-parse";
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
    expect((await bb.missions.submit(solver, await convFor(), colorAnswer)).kind).toBe("correct");
    expect((await bb.repos.participants.findById(solver.id))?.score).toBe(100);

    // Word Quest: name a fresh partner and include their secret word (any order proves it).
    const wordPartner = byGem.get("peridot")!;
    const wordAnswer = `${wordPartner.secretWord} ${wordPartner.gameId}`;
    expect((await bb.missions.submit(solver, await convFor(), wordAnswer)).kind).toBe("correct");
    expect((await bb.repos.participants.findById(solver.id))?.score).toBe(250);

    // Riddle Quest: solve all three assigned riddles (50 each).
    const riddles = riddlesForParticipant(solver.gameId);
    expect(riddles).toHaveLength(3);
    for (const riddle of riddles) {
      await bb.missions.submit(solver, await convFor(), riddle.answers[0]);
    }
    expect((await bb.repos.participants.findById(solver.id))?.score).toBe(400);

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
});

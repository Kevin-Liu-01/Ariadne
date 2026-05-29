import { describe, expect, it } from "vitest";
import { freshBackbone, inbound } from "./helpers";

const EVENT = "test-event";

describe("backbone end-to-end (SMS)", () => {
  it("checks in, orders a drink, and solves the whole labyrinth", () => {
    const bb = freshBackbone();

    const a = bb.brain.process(inbound("+1000000001", "I'm Alice"));
    expect(a.intent).toBe("checkin");
    bb.brain.process(inbound("+1000000002", "Bob"));
    bb.brain.process(inbound("+1000000003", "my name is Carol"));

    const alice = bb.repos.participants.findByPhone(EVENT, "+1000000001");
    const bob = bb.repos.participants.findByPhone(EVENT, "+1000000002");
    const carol = bb.repos.participants.findByPhone(EVENT, "+1000000003");
    if (!alice || !bob || !carol) throw new Error("participants not created");

    // welcome copy carries gem + textable id
    expect(a.text.toLowerCase()).toContain("gem");
    expect(a.text).toContain(alice.gameId);

    // balanced assignment => first three guests get distinct gems and words
    expect(new Set([alice.gem, bob.gem, carol.gem]).size).toBe(3);
    expect(alice.secretWord).toBe("give");
    expect(bob.secretWord).toBe("wings");

    expect(bb.projection.snapshot().stats.checkedIn).toBe(3);

    // drink order
    const drink = bb.brain.process(inbound("+1000000001", "vodka soda"));
    expect(drink.intent).toBe("drink_order");
    expect(drink.text.toLowerCase()).toContain("locked");
    expect(bb.drinks.listActive()).toHaveLength(1);
    expect(bb.projection.snapshot().stats.drinksActive).toBe(1);

    // mission 1: color constellation (three distinct gems)
    const m1 = bb.brain.process(
      inbound("+1000000001", `${alice.gameId} ${bob.gameId} ${carol.gameId}`),
    );
    expect(m1.intent).toBe("mission_answer");
    expect(m1.text.toLowerCase()).toContain("solved");
    expect(bb.repos.participants.findById(alice.id)?.score).toBe(100);

    // mission 2: word thread (give + wings)
    const m2 = bb.brain.process(inbound("+1000000001", `give wings ${bob.gameId}`));
    expect(m2.text.toLowerCase()).toContain("solved");
    expect(bb.repos.participants.findById(alice.id)?.score).toBe(250);

    // mission 3: clue (Ariadne)
    const m3 = bb.brain.process(inbound("+1000000001", "is it Ariadne?"));
    expect(m3.text.toLowerCase()).toContain("solved");

    // mission 4: puzzle (wings)
    const m4 = bb.brain.process(inbound("+1000000001", "wings"));
    expect(m4.text.toLowerCase()).toContain("solved");

    expect(bb.repos.participants.findById(alice.id)?.score).toBe(490);

    const snap = bb.projection.snapshot();
    expect(snap.stats.missionsCompleted).toBe(4);
    expect(snap.participants[0]?.gameId).toBe(alice.gameId); // top of the board
  });

  it("checks in a first-timer who texts a drink instead of a name", () => {
    const bb = freshBackbone();
    const r = bb.brain.process(inbound("+1000000009", "espresso martini"));
    expect(r.intent).toBe("checkin");
    const p = bb.repos.participants.findByPhone(EVENT, "+1000000009");
    expect(p?.displayName).toBeNull(); // not named "espresso martini"
  });

  it("rejects a wrong mission answer without scoring", () => {
    const bb = freshBackbone();
    bb.brain.process(inbound("+1222", "Dana"));
    const wrong = bb.brain.process(inbound("+1222", "I think it's Theseus"));
    expect(wrong.text.toLowerCase()).toContain("not quite");
    expect(bb.repos.participants.findByPhone(EVENT, "+1222")?.score).toBe(0);
  });

  it("is idempotent on the partner-event id", () => {
    const bb = freshBackbone();
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
    expect(bb.repos.partnerEvents.recordOnce(e)).toBe(true);
    expect(bb.repos.partnerEvents.recordOnce({ ...e, id: "pe_2" })).toBe(false);
  });
});

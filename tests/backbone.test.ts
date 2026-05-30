import { describe, expect, it } from "vitest";
import type { Backbone } from "@/server/backbone";
import type { Conversation, Participant } from "@/domain/types";
import { freshBackbone } from "./helpers";

const EVENT = "test-event";

function checkIn(bb: Backbone, phone: string, name: string): Participant {
  return bb.registration.register({
    phone,
    externalConversationId: `conv_${phone}`,
    channel: "sms",
    name,
  }).participant;
}

function conv(bb: Backbone, phone: string): Conversation {
  const c = bb.repos.conversations.findByPhone(EVENT, phone);
  if (!c) throw new Error("no conversation");
  return c;
}

/** These cover the deterministic core directly (no LLM), which is the contract the agent's tools call. */
describe("backbone services (deterministic core)", () => {
  it("checks in, orders a drink, and solves the whole labyrinth", () => {
    const bb = freshBackbone();

    const alice = checkIn(bb, "+1000000001", "Alice");
    const bob = checkIn(bb, "+1000000002", "Bob");
    const carol = checkIn(bb, "+1000000003", "Carol");

    expect(new Set([alice.gem, bob.gem, carol.gem]).size).toBe(3);
    expect(alice.secretWord).toBe("give");
    expect(bob.secretWord).toBe("wings");
    expect(bb.projection.snapshot().stats.checkedIn).toBe(3);

    // drink
    const drink = bb.drinks.createFromText(alice, conv(bb, "+1000000001").id, "vodka soda");
    expect(drink.kind).toBe("queued");
    expect(bb.drinks.listActive()).toHaveLength(1);

    // mission 1: color constellation (three distinct gems)
    const m1 = bb.missions.submit(
      alice,
      conv(bb, "+1000000001"),
      `${alice.gameId} ${bob.gameId} ${carol.gameId}`,
    );
    expect(m1.kind).toBe("correct");
    expect(bb.repos.participants.findById(alice.id)?.score).toBe(100);

    // mission 2: word thread (give + wings)
    expect(bb.missions.submit(alice, conv(bb, "+1000000001"), `give wings ${bob.gameId}`).kind).toBe(
      "correct",
    );
    expect(bb.repos.participants.findById(alice.id)?.score).toBe(250);

    // mission 3 + 4: clue + puzzle
    expect(bb.missions.submit(alice, conv(bb, "+1000000001"), "is it Ariadne?").kind).toBe("correct");
    expect(bb.missions.submit(alice, conv(bb, "+1000000001"), "wings").kind).toBe("correct");
    expect(bb.repos.participants.findById(alice.id)?.score).toBe(490);

    const snap = bb.projection.snapshot();
    expect(snap.stats.missionsCompleted).toBe(4);
    expect(snap.participants[0]?.gameId).toBe(alice.gameId);
  });

  it("rejects a wrong mission answer without scoring", () => {
    const bb = freshBackbone();
    const dana = checkIn(bb, "+1222", "Dana");
    const wrong = bb.missions.submit(dana, conv(bb, "+1222"), "I think it's Theseus");
    expect(wrong.kind).toBe("incorrect");
    expect(bb.repos.participants.findById(dana.id)?.score).toBe(0);
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

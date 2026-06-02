import { describe, expect, it } from "vitest";
import type { Backbone } from "@/server/backbone";
import type { Participant } from "@/domain/types";
import {
  DEFAULT_CAPS,
  type GuestSnapshot,
  type ReminderCaps,
  ReminderService,
  type SweepContext,
  planReminders,
} from "@/server/services/reminders";
import { freshBackbone } from "./helpers";

const NOW = 1_700_000_000_000;
const MIN = 60_000;
const ago = (mins: number) => NOW - mins * MIN;

function guest(over: Partial<GuestSnapshot> = {}): GuestSnapshot {
  return {
    id: "par_1",
    phone: "+1000000001",
    displayName: "Maya",
    eliminated: false,
    score: 100,
    createdAtMs: ago(60),
    lastActiveMs: ago(10), // past the active window, but not idle enough for an activity nudge
    engaged: true,
    hasMission: true,
    missionPrompt: "find a matching gem",
    ...over,
  };
}

function ctx(over: Partial<SweepContext> = {}): SweepContext {
  return {
    nowMs: NOW,
    scene: null,
    guests: [],
    readyOrders: [],
    history: [],
    caps: DEFAULT_CAPS,
    ...over,
  };
}

describe("planReminders (gentle, idempotent)", () => {
  it("broadcasts a scene change to active guests once, then never again", () => {
    const base = ctx({ scene: { seq: 7, id: "missions" }, guests: [guest()] });
    const first = planReminders(base);
    expect(first).toHaveLength(1);
    expect(first[0].kind).toBe("scene");
    expect(first[0].text).toContain("Missions are live");

    const repeat = planReminders({
      ...base,
      history: [{ participantId: "par_1", kind: "scene", refId: "7", sentAt: new Date(ago(20)).toISOString() }],
    });
    expect(repeat).toHaveLength(0);
  });

  it("never sends two in a row: a recent nudge suppresses the next", () => {
    const planned = planReminders(
      ctx({
        scene: { seq: 7, id: "missions" },
        guests: [guest()],
        history: [{ participantId: "par_1", kind: "name", refId: null, sentAt: new Date(ago(2)).toISOString() }],
      }),
    );
    expect(planned).toHaveLength(0);
  });

  it("leaves mid-conversation guests alone", () => {
    const planned = planReminders(ctx({ scene: { seq: 7, id: "missions" }, guests: [guest({ lastActiveMs: ago(1) })] }));
    expect(planned).toHaveLength(0);
  });

  it("does not broadcast the arrival scene", () => {
    const planned = planReminders(ctx({ scene: { seq: 1, id: "arrival" }, guests: [guest()] }));
    expect(planned).toHaveLength(0);
  });

  it("prioritizes a waiting drink over a scene blast", () => {
    const planned = planReminders(
      ctx({
        scene: { seq: 7, id: "missions" },
        guests: [guest()],
        readyOrders: [{ id: "drk_1", participantId: "par_1", label: "Negroni", readyAtMs: ago(6) }],
      }),
    );
    expect(planned).toHaveLength(1);
    expect(planned[0].kind).toBe("pickup");
    expect(planned[0].text).toContain("Negroni");
  });

  it("chases a missing name, but respects the per-night cap", () => {
    const nameless = guest({ displayName: null, createdAtMs: ago(20) });
    expect(planReminders(ctx({ guests: [nameless] }))[0]?.kind).toBe("name");

    const capped = planReminders(
      ctx({
        guests: [nameless],
        history: [
          { participantId: "par_1", kind: "name", refId: null, sentAt: new Date(ago(40)).toISOString() },
          { participantId: "par_1", kind: "name", refId: null, sentAt: new Date(ago(30)).toISOString() },
        ],
      }),
    );
    expect(capped).toHaveLength(0);
  });

  it("nudges an idle player with an active mission, but not a faded one", () => {
    expect(planReminders(ctx({ guests: [guest({ lastActiveMs: ago(40) })] }))[0]?.kind).toBe("activity");
    expect(planReminders(ctx({ guests: [guest({ lastActiveMs: ago(40), eliminated: true })] }))).toHaveLength(0);
  });

  it("applies the per-sweep blast ceiling, pickups first", () => {
    const guests = Array.from({ length: 5 }, (_, i) => guest({ id: `par_${i}`, phone: `+100000000${i}` }));
    const small: ReminderCaps = { ...DEFAULT_CAPS, perSweepCap: 2 };
    const planned = planReminders(ctx({ scene: { seq: 7, id: "missions" }, guests, caps: small }));
    expect(planned).toHaveLength(2);
  });
});

async function checkIn(bb: Backbone, phone: string, name: string): Promise<Participant> {
  const r = await bb.registration.register({ phone, externalConversationId: `c_${phone}`, channel: "sms", name });
  return r.participant;
}

// All thresholds at zero so just-checked-in guests qualify; activity off so we
// isolate the scene-broadcast idempotency contract.
const EAGER: ReminderCaps = {
  activeWindowMs: 0,
  quietGapMs: 0,
  pickupDelayMs: 0,
  nameDelayMs: 0,
  activityIdleMs: Number.MAX_SAFE_INTEGER,
  activityGapMs: 0,
  nameCap: 2,
  activityCap: 3,
  pickupCap: 2,
  perSweepCap: 60,
};

describe("ReminderService.run (integration)", () => {
  it("broadcasts a scene change to every guest exactly once and logs it", async () => {
    const bb = await freshBackbone();
    await checkIn(bb, "+1000000001", "Alice");
    await checkIn(bb, "+1000000002", "Bob");
    await bb.projection.emit("scene.changed", { scene: "missions" });

    const svc = new ReminderService(bb.eventId, bb.repos, bb.missions, EAGER);
    const sent: { phone: string; text: string }[] = [];
    const spy = async (phone: string, text: string) => {
      sent.push({ phone, text });
      return true;
    };

    const first = await svc.run(spy);
    expect(first.sent).toBe(2);
    expect(first.byKind.scene).toBe(2);
    expect(sent.every((s) => s.text.includes("Missions are live"))).toBe(true);
    expect(await bb.repos.reminders.listByEvent(bb.eventId)).toHaveLength(2);

    const second = await svc.run(spy);
    expect(second.sent).toBe(0);
  });
});

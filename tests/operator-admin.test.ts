import { describe, expect, it } from "vitest";
import { leastUsedGem } from "@/constants/gems";
import { SCENE_IDS, nextScene } from "@/constants/scenes";
import type { Backbone } from "@/server/backbone";
import type { Participant } from "@/domain/types";
import { freshBackbone } from "./helpers";

async function checkIn(bb: Backbone, phone: string, name: string): Promise<Participant> {
  const result = await bb.registration.register({
    phone,
    externalConversationId: `conv_${phone}`,
    channel: "sms",
    name,
  });
  return result.participant;
}

describe("operator admin: edit, change, delete", () => {
  it("swaps a drink order's item and modifiers", async () => {
    const bb = await freshBackbone();
    const alice = await checkIn(bb, "+1000000001", "Alice");
    const conv = await bb.repos.conversations.findByPhone("test-event", "+1000000001");
    const queued = await bb.drinks.createFromText(alice, conv?.id ?? null, "machina mule");
    if (queued.kind !== "queued") throw new Error("expected a queued order");

    const edited = await bb.drinks.editItem(queued.order.id, "cloud_hypervisor_fizz", ["double"]);
    expect(edited?.label).toBe("Cloud Hypervisor Fizz");
    expect(edited?.modifiers).toEqual(["double"]);

    const active = await bb.drinks.listActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.label).toBe("Cloud Hypervisor Fizz");
  });

  it("rejects an unknown menu item on edit", async () => {
    const bb = await freshBackbone();
    const alice = await checkIn(bb, "+1000000001", "Alice");
    const queued = await bb.drinks.createFromText(alice, null, "machina mule");
    if (queued.kind !== "queued") throw new Error("expected a queued order");
    expect(await bb.drinks.editItem(queued.order.id, "unicorn_tears", [])).toBeNull();
  });

  it("deletes a drink order", async () => {
    const bb = await freshBackbone();
    const alice = await checkIn(bb, "+1000000001", "Alice");
    const queued = await bb.drinks.createFromText(alice, null, "machina mule");
    if (queued.kind !== "queued") throw new Error("expected a queued order");

    expect(await bb.drinks.remove(queued.order.id)).toBe(true);
    expect(await bb.drinks.listActive()).toHaveLength(0);
    expect(await bb.drinks.remove(queued.order.id)).toBe(false);
  });

  it("edits a guest's name, gem, score, and fade state", async () => {
    const bb = await freshBackbone();
    const alice = await checkIn(bb, "+1000000001", "Alice");

    const updated = await bb.participantAdmin.edit(alice.id, {
      displayName: "Ali",
      gem: "garnet",
      score: 250,
      eliminated: true,
    });
    expect(updated?.displayName).toBe("Ali");
    expect(updated?.gem).toBe("garnet");
    expect(updated?.score).toBe(250);
    expect(updated?.eliminated).toBe(true);

    const snap = await bb.projection.snapshot();
    const tile = snap.participants.find((p) => p.gameId === alice.gameId);
    expect(tile?.score).toBe(250);
    expect(tile?.gem).toBe("garnet");
    expect(tile?.eliminated).toBe(true);
  });

  it("edits a guest's phone and email, lowercasing nothing it isn't given", async () => {
    const bb = await freshBackbone();
    const alice = await checkIn(bb, "+1000000001", "Alice");

    const updated = await bb.participantAdmin.edit(alice.id, {
      phone: "+1999999999",
      email: "alice@example.com",
    });
    expect(updated?.phone).toBe("+1999999999");
    expect(updated?.email).toBe("alice@example.com");
    // Untouched fields stay put.
    expect(updated?.displayName).toBe(alice.displayName);

    const reread = await bb.repos.participants.findById(alice.id);
    expect(reread?.phone).toBe("+1999999999");
    expect(reread?.email).toBe("alice@example.com");

    // Clearing is explicit (null), distinct from "leave alone" (undefined).
    const cleared = await bb.participantAdmin.edit(alice.id, { phone: null });
    expect(cleared?.phone).toBeNull();
    expect(cleared?.email).toBe("alice@example.com");
  });

  it("returns null when editing a missing guest", async () => {
    const bb = await freshBackbone();
    expect(await bb.participantAdmin.edit("par_missing", { score: 10 })).toBeNull();
  });

  it("deletes a guest and every row hanging off them", async () => {
    const bb = await freshBackbone();
    const alice = await checkIn(bb, "+1000000001", "Alice");
    const bob = await checkIn(bb, "+1000000002", "Bob");
    await bb.drinks.createFromText(alice, null, "machina mule");

    expect((await bb.projection.snapshot()).stats.checkedIn).toBe(2);

    expect(await bb.participantAdmin.remove(alice.id)).toBe(true);
    expect(await bb.repos.participants.findById(alice.id)).toBeNull();
    expect(await bb.repos.participantMissions.listByParticipant(alice.id)).toHaveLength(0);
    expect(await bb.drinks.listActive()).toHaveLength(0);

    const snap = await bb.projection.snapshot();
    expect(snap.stats.checkedIn).toBe(1);
    expect(snap.participants[0]?.gameId).toBe(bob.gameId);

    expect(await bb.participantAdmin.remove(alice.id)).toBe(false);
  });
});

describe("operator song requests", () => {
  it("creates, decides, and deletes a song request", async () => {
    const bb = await freshBackbone();
    const alice = await checkIn(bb, "+1000000001", "Alice");

    const req = await bb.repos.songRequests.create("test-event", alice.id, "Sandstorm");
    expect(req.status).toBe("requested");
    expect(req.decidedAt).toBeNull();

    const accepted = await bb.repos.songRequests.setStatus(req.id, "accepted");
    expect(accepted?.status).toBe("accepted");
    expect(accepted?.decidedAt).not.toBeNull();

    expect(await bb.repos.songRequests.remove(req.id)).toBe(true);
    expect(await bb.repos.songRequests.remove(req.id)).toBe(false);
    expect(await bb.repos.songRequests.listByEvent("test-event")).toHaveLength(0);
  });
});

describe("operator announcements", () => {
  it("records then deletes an announcement from the history", async () => {
    const bb = await freshBackbone();
    const a = await bb.repos.announcements.insert("test-event", "Showcase in 5", 10, 9);
    expect(await bb.repos.announcements.listRecent("test-event")).toHaveLength(1);

    expect(await bb.repos.announcements.remove(a.id)).toBe(true);
    expect(await bb.repos.announcements.remove(a.id)).toBe(false);
    expect(await bb.repos.announcements.listRecent("test-event")).toHaveLength(0);
  });
});

describe("operator recommendations", () => {
  it("nextScene advances through the run of show and wraps", () => {
    expect(nextScene("arrival")).toBe("opening");
    expect(nextScene("opening")).toBe("game");
    expect(nextScene("game")).toBe("visuals");
    expect(nextScene("visuals")).toBe("finale");
    expect(nextScene(SCENE_IDS[SCENE_IDS.length - 1])).toBe(SCENE_IDS[0]);
    expect(nextScene("not-a-scene")).toBe(SCENE_IDS[0]);
  });

  it("leastUsedGem recommends the emptiest gem, ties by gem order", () => {
    expect(leastUsedGem({ amethyst: 3, garnet: 1 })).toBe("moonstone");
    expect(leastUsedGem({})).toBe("amethyst");
    expect(leastUsedGem({ amethyst: 1, garnet: 1, moonstone: 1, peridot: 1, aquamarine: 1, topaz: 0 })).toBe("topaz");
  });
});

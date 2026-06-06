import { describe, expect, it } from "vitest";
import type { GemId } from "@/constants/gems";
import type { Backbone } from "@/server/backbone";
import type { Participant } from "@/domain/types";
import { freshBackbone } from "./helpers";

/**
 * The web Live Player is a second front door onto the same backbone. These cover the
 * contract the player routes call: resume-by-phone (no duplicate tiles), the live
 * `me` read-model (scene-gated current quest), and that tap actions route to the
 * exact same deterministic services the text thread uses.
 */

async function checkIn(bb: Backbone, phone: string, name: string): Promise<Participant> {
  const r = await bb.registration.register({
    phone,
    externalConversationId: `conv_${phone}`,
    channel: "sms",
    name,
  });
  return r.participant;
}

async function setScene(bb: Backbone, scene: string): Promise<void> {
  await bb.projection.emit("scene.changed", { scene });
}

/** Six check-ins assign all six distinct gems; amethyst (purple) solves with two others (green+orange). */
async function room(bb: Backbone): Promise<{ byGem: Map<GemId, Participant>; solver: Participant }> {
  const guests: Participant[] = [];
  for (let i = 1; i <= 6; i += 1) {
    guests.push(await checkIn(bb, `+1617000000${i}`, `G${i}`));
  }
  const byGem = new Map<GemId, Participant>(guests.map((g) => [g.gem, g]));
  return { byGem, solver: byGem.get("amethyst")! };
}

describe("web check-in resume", () => {
  it("resumes an existing participant by phone instead of creating a duplicate", async () => {
    const bb = await freshBackbone();
    const dana = await checkIn(bb, "+15550001", "Dana");
    const before = (await bb.projection.snapshot()).stats.checkedIn;

    // A web check-in from the same number (no external thread) must resume the same guest.
    const resumed = await bb.registration.register({
      phone: "+15550001",
      externalConversationId: null,
      channel: null,
      name: "Dana",
    });

    expect(resumed.isNew).toBe(false);
    expect(resumed.participant.id).toBe(dana.id);
    expect((await bb.projection.snapshot()).stats.checkedIn).toBe(before);
  });

  it("registers a genuinely new guest", async () => {
    const bb = await freshBackbone();
    const res = await bb.registration.register({
      phone: "+15559999",
      externalConversationId: null,
      channel: null,
      name: "New",
    });
    expect(res.isNew).toBe(true);
    expect((await bb.projection.snapshot()).stats.checkedIn).toBe(1);
  });
});

describe("player read-model (me)", () => {
  it("returns identity and gates the current quest on the scene", async () => {
    const bb = await freshBackbone();
    const eli = await checkIn(bb, "+15550002", "Eli");

    // Arrival (default): identity is visible, but gameplay and the current quest are locked.
    const atArrival = await bb.player.me(eli.id);
    expect(atArrival?.participant.gameId).toBe(eli.gameId);
    expect(atArrival?.participant.secretWord).toBe(eli.secretWord);
    expect(atArrival?.participant.gemLabel.length).toBeGreaterThan(0);
    expect(atArrival?.gameplayOpen).toBe(false);
    expect(atArrival?.missions.current).toBeNull();
    expect(atArrival?.missions.questsTotal).toBe(3);

    // Game scene opens gameplay and surfaces the first quest.
    await setScene(bb, "game");
    const atGame = await bb.player.me(eli.id);
    expect(atGame?.gameplayOpen).toBe(true);
    expect(atGame?.missions.current?.title).toBe("Color Quest");
    expect(atGame?.totalPlayers).toBe(1);
  });

  it("returns null for an unknown participant", async () => {
    const bb = await freshBackbone();
    expect(await bb.player.me("par_missing")).toBeNull();
  });
});

describe("player actions mirror the text path", () => {
  it("orders a drink, requests a song, solves a quest, and confirms pickup", async () => {
    const bb = await freshBackbone();
    const { byGem, solver } = await room(bb);
    await setScene(bb, "game");

    // Drink -> bar queue, reflected in me().
    const drink = await bb.player.orderDrink(solver.id, "modelo");
    expect(drink?.status).toBe("queued");
    expect(await bb.drinks.listActive()).toHaveLength(1);
    const afterDrink = await bb.player.me(solver.id);
    expect(afterDrink?.drink?.label).toBe("Modelo");
    expect(afterDrink?.drink?.status).toBe("queued");

    // Song -> DJ queue (the SONG prefix is stripped, like the text tool).
    const song = await bb.player.requestSong(solver.id, "song One More Time");
    expect(song?.status).toBe("queued");
    expect((await bb.player.me(solver.id))?.song?.text).toBe("One More Time");

    // Mission -> deterministic color solve (you + two others), scored like the text path.
    const pair = [byGem.get("peridot")!, byGem.get("topaz")!];
    const mission = await bb.player.submitMission(solver.id, pair.map((p) => p.gameId).join(" "));
    expect(mission?.result).toBe("correct");
    expect((await bb.repos.participants.findById(solver.id))?.score ?? 0).toBeGreaterThan(0);
    const afterMission = await bb.player.me(solver.id);
    expect(afterMission?.missions.quests.find((q) => q.id === "color-constellation")?.done).toBe(true);

    // Pickup -> the ready order transitions to picked_up.
    const active = await bb.drinks.listActive();
    await bb.drinks.updateStatus(active[0].id, "ready", null);
    const pickup = await bb.player.confirmPickup(solver.id);
    expect(pickup?.pickedUp).toBe(true);
    expect((await bb.drinks.get(active[0].id))?.status).toBe("picked_up");
  });

  it("locks missions until the game starts, but the bar and DJ stay open", async () => {
    const bb = await freshBackbone();
    const zo = await checkIn(bb, "+15550003", "Zo");

    // Missions are still gated by the run-of-show scene.
    expect((await bb.player.submitMission(zo.id, "anything"))?.result).toBe("locked");

    // Drinks and songs are available anytime, even at arrival before the game.
    expect((await bb.player.orderDrink(zo.id, "modelo"))?.status).toBe("queued");
    expect(await bb.drinks.listActive()).toHaveLength(1);
    expect((await bb.player.requestSong(zo.id, "song anything"))?.status).toBe("queued");
    expect((await bb.player.me(zo.id))?.song?.text).toBe("anything");
  });

  it("flags a host issue onto the operator alert queue", async () => {
    const bb = await freshBackbone();
    const ada = await checkIn(bb, "+15550004", "Ada");
    const res = await bb.player.flag(ada.id, "lost my jacket");
    expect(res?.flagged).toBe(true);
    expect((await bb.repos.operatorAlerts.listOpen(bb.eventId)).length).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { FLOWS } from "@/constants/event";
import type { ChatFn, ChatResponse } from "@/server/partners/dedalus/types";
import { partnerQuestPoints } from "@/domain/scoring";
import { freshBackbone, inbound } from "./helpers";

const EVENT = "test-event";

function content(text: string): ChatResponse {
  return { id: "x", choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }] };
}

function toolCall(name: string, args: object): ChatResponse {
  return {
    id: "x",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{ id: "tc", type: "function", function: { name, arguments: JSON.stringify(args) } }],
        },
        finish_reason: "tool_calls",
      },
    ],
  };
}

// Scripted gateway: route by the guest's words to the matching tool, then echo the
// tool's canonical reply. Order matters so phrases route to one tool only.
const chat: ChatFn = async (req) => {
  const last = req.messages[req.messages.length - 1];
  if (last?.role === "tool") {
    const r = JSON.parse(last.content ?? "{}") as { say?: string };
    return content(r.say ?? "ok");
  }
  const user = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (/grabbed|picked it up|got it/i.test(user)) return toolCall("confirm_pickup", {});
  if (/\bplay\b|\bsong\b/i.test(user)) return toolCall("queue_song", { text: user });
  if (/mule|machina|modelo|stella|claw|fizz|margar|wine|beer|red bull/i.test(user)) return toolCall("order_drink", { text: user });
  if (/help/i.test(user)) return toolCall("help", {});
  const bare = user.trim();
  if (/^[a-z][a-z'-]{1,30}$/i.test(bare) && !/^(yes|no|ok|okay|stop|thanks|thank|sure|yeah|help)$/i.test(bare)) {
    return toolCall("check_in", { name: bare });
  }
  return content("noted.");
};

describe("end to end: a full night", () => {
  it("walks door, bar, songs, announcements, board, missions, and admin", async () => {
    const bb = await freshBackbone(chat);

    // 1. DOOR: guests check in with just a first name (no email, no gate).
    const aliceReply = await bb.brain.process(inbound("+15550000002", "Alice"));
    expect(aliceReply.text.toLowerCase()).toContain("checked in");
    const alice = await bb.repos.participants.findByPhone(EVENT, "+15550000002");
    expect(alice?.displayName).toBe("Alice");

    await bb.brain.process(inbound("+15550000003", "Bob"));
    const bob = await bb.repos.participants.findByPhone(EVENT, "+15550000003");
    expect(bob).toBeTruthy();

    // 2. HELP lists the actions, including songs.
    const help = await bb.brain.process(inbound("+15550000002", "what can I do, help"));
    expect(help.text.toLowerCase()).toContain("song");

    // The game opens: from here the bar, songs, and quests are live (the gate is by
    // scene, on both the text and web surfaces).
    await bb.projection.emit("scene.changed", { scene: "game" });

    // 3. BAR QUEUE: order -> operator makes + readies it -> guest confirms pickup.
    const order = await bb.brain.process(inbound("+15550000002", "can I get a machina mule"));
    expect(order.text.toLowerCase()).toContain("order received");
    const active = await bb.drinks.listActive();
    expect(active).toHaveLength(1);
    const drinkId = active[0].id;
    await bb.drinks.updateStatus(drinkId, "in_progress", null);
    await bb.drinks.updateStatus(drinkId, "ready", null);
    expect((await bb.drinks.get(drinkId))?.status).toBe("ready");

    const pickup = await bb.brain.process(inbound("+15550000002", "grabbed it, thanks"));
    expect(pickup.text.toLowerCase()).toContain("enjoy");
    expect((await bb.drinks.get(drinkId))?.status).toBe("picked_up");
    expect(await bb.drinks.listActive()).toHaveLength(0);

    // 4. SONGS: guest requests -> the DJ accepts it.
    await bb.brain.process(inbound("+15550000002", "play some daft punk"));
    const songs = await bb.repos.songRequests.listByEvent(EVENT);
    expect(songs).toHaveLength(1);
    expect(songs[0].status).toBe("requested");
    expect((await bb.repos.songRequests.setStatus(songs[0].id, "accepted"))?.status).toBe("accepted");

    // 5. Run-of-show scene picks update the board only; room texts use announcements
    // (see announcements.test.ts for broadcastScene copy).

    // 6. MISSIONS: solve the word thread (give + wings), score lands on the board.
    const conv = await bb.repos.conversations.findByPhone(EVENT, "+15550000002");
    await bb.repos.participantMissions.assign(EVENT, alice!.id, "word-thread");
    await bb.repos.conversations.setFlow(conv!.id, FLOWS.MISSION, "word-thread");
    const onWord = await bb.repos.conversations.findById(conv!.id);
    const result = await bb.missions.submit(alice!, onWord!, `give wings ${bob!.gameId}`);
    expect(result.kind).toBe("correct");
    // First to finish the word quest, one new partner: base + speed + one unique bonus.
    expect((await bb.repos.participants.findById(alice!.id))?.score).toBe(
      partnerQuestPoints("word_match", 0, 1),
    );

    // 7. BOARD: the projection snapshot reflects the room.
    const snap = await bb.projection.snapshot();
    expect(snap.scene).toBe("game");
    expect(snap.stats.checkedIn).toBe(2);
    expect(snap.stats.missionsCompleted).toBe(1);
    expect(typeof snap.eventPhone).toBe("string"); // carried for the arrival board (empty without env)

    // 8. OPERATOR ADMIN: correct a score, then remove a guest (cascades + drops the tile).
    expect((await bb.participantAdmin.edit(alice!.id, { score: 300 }))?.score).toBe(300);
    expect(await bb.participantAdmin.remove(bob!.id)).toBe(true);
    expect(await bb.repos.participants.findById(bob!.id)).toBeNull();
    expect((await bb.projection.snapshot()).stats.checkedIn).toBe(1);
  });
});

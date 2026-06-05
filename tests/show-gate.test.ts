import { describe, expect, it } from "vitest";
import { GAMEPLAY_SCENES, gameplayAllowed } from "@/constants/show-gate";
import { SCENE_IDS } from "@/constants/scenes";
import type { ChatFn, ChatResponse } from "@/server/partners/dedalus/types";
import type { Backbone } from "@/server/backbone";
import type { Participant } from "@/domain/types";
import { freshBackbone, inbound } from "./helpers";

/**
 * The run-of-show gate must be decided by code on every surface, never guessed by
 * the model. These cover the SMS agent path (the one that was wrongly refusing song
 * requests during the runway): gameplay actions open in game/finale/runway and lock
 * in arrival/opening, identically for songs, drinks, and quests.
 */

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

// Routes a song/play request to queue_song and a drink word to order_drink, then
// echoes the tool's canonical `say`. The model never decides whether play is open.
const chat: ChatFn = async (req) => {
  const last = req.messages[req.messages.length - 1];
  if (last?.role === "tool") {
    const r = JSON.parse(last.content ?? "{}") as { say?: string };
    return content(r.say ?? "ok");
  }
  const user = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (/\bplay\b|\bsong\b/i.test(user)) return toolCall("queue_song", { text: user });
  if (/modelo|mule|beer|wine/i.test(user)) return toolCall("order_drink", { text: user });
  return content("noted.");
};

let n = 0;
async function checkedInGuest(bb: Backbone): Promise<{ participant: Participant; phone: string }> {
  n += 1;
  const phone = `+1500009${String(n).padStart(3, "0")}`;
  const r = await bb.registration.register({
    phone,
    externalConversationId: `conv_${phone}`,
    channel: "sms",
    name: `G${n}`,
    email: `g${n}@runwaytime.test`,
  });
  return { participant: r.participant, phone };
}

async function setScene(bb: Backbone, scene: string): Promise<void> {
  await bb.projection.emit("scene.changed", { scene });
}

describe("gameplayAllowed predicate", () => {
  it("opens once the game is live (game, visuals, finale, runway) and locks before it", () => {
    expect(gameplayAllowed("game")).toBe(true);
    // The ambient visuals break sits mid-show, so the bar and DJ stay open through it.
    expect(gameplayAllowed("visuals")).toBe(true);
    expect(gameplayAllowed("finale")).toBe(true);
    expect(gameplayAllowed("runway")).toBe(true);
    expect(gameplayAllowed("arrival")).toBe(false);
    expect(gameplayAllowed("opening")).toBe(false);
  });

  it("covers every declared scene (no scene is ungated by omission)", () => {
    for (const id of SCENE_IDS) {
      expect(gameplayAllowed(id)).toBe(GAMEPLAY_SCENES.has(id));
    }
  });
});

describe("SMS agent: song requests follow the run-of-show gate, not the model's guess", () => {
  for (const scene of ["game", "finale", "runway"] as const) {
    it(`queues a song while the scene is "${scene}"`, async () => {
      const bb = await freshBackbone(chat);
      const { phone } = await checkedInGuest(bb);
      await setScene(bb, scene);

      const reply = await bb.brain.process(inbound(phone, "song One More Time by Daft Punk"));

      const songs = await bb.repos.songRequests.listByEvent(bb.eventId);
      expect(songs).toHaveLength(1);
      expect(songs[0]?.status).toBe("requested");
      expect(reply.text.toLowerCase()).toContain("sent");
    });
  }

  for (const scene of ["arrival", "opening"] as const) {
    it(`locks a song while the scene is "${scene}" (no DJ request created)`, async () => {
      const bb = await freshBackbone(chat);
      const { phone } = await checkedInGuest(bb);
      await setScene(bb, scene);

      const reply = await bb.brain.process(inbound(phone, "song One More Time by Daft Punk"));

      expect(await bb.repos.songRequests.listByEvent(bb.eventId)).toHaveLength(0);
      expect(reply.text.toLowerCase()).toContain("not started");
    });
  }
});

describe("SMS agent: drinks share the same gate", () => {
  it("queues a drink once the game is live", async () => {
    const bb = await freshBackbone(chat);
    const { phone } = await checkedInGuest(bb);
    await setScene(bb, "game");

    await bb.brain.process(inbound(phone, "can I get a modelo"));
    expect(await bb.drinks.listActive()).toHaveLength(1);
  });

  it("locks a drink before the game starts", async () => {
    const bb = await freshBackbone(chat);
    const { phone } = await checkedInGuest(bb);
    await setScene(bb, "arrival");

    const reply = await bb.brain.process(inbound(phone, "can I get a modelo"));
    expect(await bb.drinks.listActive()).toHaveLength(0);
    expect(reply.text.toLowerCase()).toContain("not started");
  });
});

import { beforeAll, describe, expect, it } from "vitest";
import { GAMEPLAY_SCENES, gameplayAllowed } from "@/constants/show-gate";
import { SCENE_IDS } from "@/constants/scenes";
import type { ChatFn, ChatResponse } from "@/server/partners/dedalus/types";
import type { Backbone } from "@/server/backbone";
import type { Participant } from "@/domain/types";
import { freshBackbone, inbound } from "./helpers";

/**
 * The run-of-show gate must be decided by code on every surface, never guessed by
 * the model. Quests open in game/visuals/finale and lock in arrival/opening/runway
 * (the runway show runs before the game), but the bar and DJ stay open in every
 * scene: a checked-in guest can order a drink or request a song anytime, even before
 * the game starts.
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

describe("gameplayAllowed predicate (quests)", () => {
  it("opens once the game is live (game, visuals, finale) and locks before it (arrival, opening, runway)", () => {
    expect(gameplayAllowed("game")).toBe(true);
    // The ambient visuals break sits mid-game; quests stay open through it.
    expect(gameplayAllowed("visuals")).toBe(true);
    expect(gameplayAllowed("finale")).toBe(true);
    // The runway show runs before the game, so quests are still locked during it.
    expect(gameplayAllowed("runway")).toBe(false);
    expect(gameplayAllowed("arrival")).toBe(false);
    expect(gameplayAllowed("opening")).toBe(false);
  });

  it("covers every declared scene (no scene is ungated by omission)", () => {
    for (const id of SCENE_IDS) {
      expect(gameplayAllowed(id)).toBe(GAMEPLAY_SCENES.has(id));
    }
  });
});

describe("SMS agent: the bar and DJ are open in every scene", () => {
  // Drinks and song requests no longer wait for the game: a checked-in guest can
  // order in any scene, including arrival/opening before the game starts. One shared
  // backbone (assertions are per guest) keeps this off the pglite cold-start path.
  let bb: Backbone;
  beforeAll(async () => {
    bb = await freshBackbone(chat);
  }, 30_000);

  for (const scene of SCENE_IDS) {
    it(`takes a song and a drink while the scene is "${scene}"`, async () => {
      const { participant, phone } = await checkedInGuest(bb);
      await setScene(bb, scene);

      const songReply = await bb.brain.process(inbound(phone, "song One More Time by Daft Punk"));
      expect(songReply.text.toLowerCase()).toContain("sent");
      const song = await bb.repos.songRequests.findLatestByParticipant(participant.id);
      expect(song?.status).toBe("requested");

      await bb.brain.process(inbound(phone, "can I get a modelo"));
      const drink = await bb.repos.drinkOrders.findLatestActiveByParticipant(participant.id);
      expect(drink?.label).toBe("Modelo");
    });
  }
});

describe("SMS agent: quests still gate, but never dead-end", () => {
  it("shows what you can do (no 'game hasn't started') when MISSION is locked", async () => {
    const bb = await freshBackbone(chat);
    const { phone } = await checkedInGuest(bb);
    await setScene(bb, "arrival");

    const reply = await bb.brain.process(inbound(phone, "MISSION"));
    const text = reply.text.toLowerCase();

    // No quest is delivered, but we never dead-end on the game not having started.
    expect(text).not.toContain("not started");
    expect(text).not.toContain("hang tight");
    // Instead, surface what the guest can do right now.
    expect(text).toContain("drink");
    expect(text).toContain("song");
  });
});

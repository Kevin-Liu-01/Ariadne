import { describe, expect, it } from "vitest";
import { FLOWS } from "@/constants/event";
import {
  MISSION_BY_ID,
  MISSION_SEQUENCE,
  RIDDLE_MISSION_ID,
} from "@/constants/missions";
import { matchBypassCode } from "@/domain/mission-parse";
import { stageView } from "@/server/http/operator-views";
import type { ChatFn } from "@/server/partners/dedalus/types";
import type { Backbone } from "@/server/backbone";
import type { Conversation, Participant } from "@/domain/types";
import { freshBackbone, inbound } from "./helpers";

const COLOR = "color-constellation";
const WORD = "word-thread";

function code(missionId: string): string {
  const c = MISSION_BY_ID.get(missionId)?.bypassCode;
  if (!c) throw new Error(`mission ${missionId} has no bypass code`);
  return c;
}

/** Register a guest and open gameplay (assign first quest, flip to the game scene). */
async function inGame(
  bb: Backbone,
  phone: string,
  name: string,
): Promise<{ participant: Participant; conversation: Conversation }> {
  const r = await bb.registration.register({
    phone,
    externalConversationId: `conv_${phone}`,
    channel: "sms",
    name,
    email: `${name.toLowerCase()}@runwaytime.test`,
  });
  await bb.missions.unlockGameplay(r.participant, r.conversation);
  await bb.projection.emit("scene.changed", { scene: "game" });
  const conversation = (await bb.repos.conversations.findById(r.conversation.id)) ?? r.conversation;
  return { participant: r.participant, conversation };
}

async function finishedIds(bb: Backbone, participantId: string): Promise<Set<string>> {
  return new Set(await bb.repos.participantMissions.finishedMissionIds(participantId));
}

describe("bypass code matching", () => {
  it("matches a game's code regardless of case, spacing, and surrounding text", () => {
    const colorCode = code(COLOR);
    expect(matchBypassCode(colorCode)?.id).toBe(COLOR);
    expect(matchBypassCode(colorCode.toUpperCase())?.id).toBe(COLOR);
    expect(matchBypassCode(`  please use ${colorCode} now  `)?.id).toBe(COLOR);
    expect(matchBypassCode(code(WORD))?.id).toBe(WORD);
    expect(matchBypassCode(code(RIDDLE_MISSION_ID))?.id).toBe(RIDDLE_MISSION_ID);
  });

  it("does not match normal answers, riddle words, or game ids", () => {
    expect(matchBypassCode("give wings ABC123")).toBeNull();
    expect(matchBypassCode("cache")).toBeNull();
    expect(matchBypassCode("")).toBeNull();
    expect(matchBypassCode("the game is hard")).toBeNull();
  });

  it("every game defines a distinct, hard-to-guess code", () => {
    const codes = MISSION_SEQUENCE.map((id) => code(id));
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(c.length).toBeGreaterThanOrEqual(8);
  });
});

describe("code word bypasses a game and advances", () => {
  it("skips the game tied to the code and surfaces the next, scoring nothing", async () => {
    const bb = await freshBackbone();
    const { participant, conversation } = await inGame(bb, "+1500000001", "Mira");

    const outcome = await bb.missions.submit(participant, conversation, code(COLOR));
    expect(outcome.kind).toBe("bypassed");
    if (outcome.kind === "bypassed") {
      expect(outcome.title).toBe(MISSION_BY_ID.get(COLOR)?.title);
      expect(outcome.nextPrompt).toBeTruthy();
    }

    // Color is finished-by-skip; score is untouched; pointer advanced to the next quest.
    expect(await finishedIds(bb, participant.id)).toContain(COLOR);
    expect((await bb.repos.participants.findById(participant.id))?.score).toBe(0);
    const after = await bb.repos.conversations.findById(conversation.id);
    expect(after?.currentFlow).toBe(FLOWS.MISSION);
    expect(after?.currentMissionId).toBe(WORD);
  });

  it("bypasses any game by its own code, even when it is not the current stage", async () => {
    const bb = await freshBackbone();
    const { participant, conversation } = await inGame(bb, "+1500000002", "Noor");

    // Current stage is color, but the riddle code retires the riddle game.
    const outcome = await bb.missions.submit(participant, conversation, code(RIDDLE_MISSION_ID));
    expect(outcome.kind).toBe("bypassed");
    expect(await finishedIds(bb, participant.id)).toContain(RIDDLE_MISSION_ID);
    // Color is still unfinished, so it remains the surfaced quest.
    expect(await finishedIds(bb, participant.id)).not.toContain(COLOR);
  });

  it("bypasses through the whole labyrinth one code at a time", async () => {
    const bb = await freshBackbone();
    const { participant, conversation } = await inGame(bb, "+1500000003", "Ravi");

    for (const id of MISSION_SEQUENCE) {
      const fresh = (await bb.repos.conversations.findById(conversation.id)) ?? conversation;
      await bb.missions.submit(participant, fresh, code(id));
    }
    const finished = await finishedIds(bb, participant.id);
    for (const id of MISSION_SEQUENCE) expect(finished).toContain(id);
    const done = await bb.repos.conversations.findById(conversation.id);
    expect(done?.currentFlow).toBe(FLOWS.IDLE);
    expect(done?.currentMissionId).toBeNull();
  });
});

describe("code word over the SMS brain is deterministic (no model)", () => {
  it("bypasses on the code without ever calling the model", async () => {
    const modelTripwire: ChatFn = async () => {
      throw new Error("model must not run for a deterministic bypass code");
    };
    const bb = await freshBackbone(modelTripwire);
    const { participant } = await inGame(bb, "+1500000010", "Pia");

    const reply = await bb.brain.process(inbound("+1500000010", code(COLOR)));
    expect(reply.text.toLowerCase()).toContain("bypassed");
    expect(await finishedIds(bb, participant.id)).toContain(COLOR);
  });

  it("refuses to bypass before the game opens", async () => {
    const modelTripwire: ChatFn = async () => {
      throw new Error("model must not run");
    };
    const bb = await freshBackbone(modelTripwire);
    // Registered but game not opened (still at arrival).
    const r = await bb.registration.register({
      phone: "+1500000011",
      externalConversationId: "conv_+1500000011",
      channel: "sms",
      name: "Lior",
      email: "lior@runwaytime.test",
    });

    const reply = await bb.brain.process(inbound("+1500000011", code(COLOR)));
    expect(reply.text.toLowerCase()).not.toContain("bypassed");
    expect(await finishedIds(bb, r.participant.id)).not.toContain(COLOR);
  });
});

describe("staff sets a guest's game stage", () => {
  it("moves a guest onto a chosen game on both the text and web surfaces", async () => {
    const bb = await freshBackbone();
    const { participant, conversation } = await inGame(bb, "+1500000020", "Sky");

    const res = await bb.missions.setStageForParticipant(participant.id, RIDDLE_MISSION_ID);
    expect(res?.gameId).toBe(participant.gameId);

    // The conversation pointer (text/agent surface) is on the chosen game.
    const after = await bb.repos.conversations.findById(conversation.id);
    expect(after?.currentMissionId).toBe(RIDDLE_MISSION_ID);
    expect(after?.currentFlow).toBe(FLOWS.MISSION);

    // The web player surfaces the same game, even though earlier quests are unfinished.
    const view = await bb.player.me(participant.id);
    expect(view?.missions.current?.id).toBe(RIDDLE_MISSION_ID);
  });

  it("reopens a game that was bypassed when staff moves the guest back to it", async () => {
    const bb = await freshBackbone();
    const { participant, conversation } = await inGame(bb, "+1500000021", "Wren");

    await bb.missions.submit(participant, conversation, code(COLOR));
    expect(await finishedIds(bb, participant.id)).toContain(COLOR);

    const res = await bb.missions.setStageForParticipant(participant.id, COLOR);
    expect(res).not.toBeNull();
    // Color is playable again and surfaces as the current quest.
    expect(await finishedIds(bb, participant.id)).not.toContain(COLOR);
    const view = await bb.player.me(participant.id);
    expect(view?.missions.current?.id).toBe(COLOR);
  });

  it("rejects an unknown game id", async () => {
    const bb = await freshBackbone();
    const { participant } = await inGame(bb, "+1500000022", "Zoe");
    expect(await bb.missions.setStageForParticipant(participant.id, "not-a-game")).toBeNull();
    expect(await bb.missions.setStageForParticipant("par_missing", COLOR)).toBeNull();
  });
});

describe("operator stage view", () => {
  it("derives the current stage from the pointer, falling back to first unfinished", () => {
    const fresh = stageView({}, null);
    expect(fresh.stage).toBe(MISSION_SEQUENCE[0]);
    expect(fresh.quests).toHaveLength(MISSION_SEQUENCE.length);
    expect(fresh.quests.every((q) => q.status === "pending")).toBe(true);

    // Pointer wins when it points at an unfinished game.
    const pointed = stageView({ [COLOR]: "skipped" }, RIDDLE_MISSION_ID);
    expect(pointed.stage).toBe(RIDDLE_MISSION_ID);

    // A pointer at a finished game falls back to the first unfinished game.
    const finishedPointer = stageView({ [COLOR]: "completed" }, COLOR);
    expect(finishedPointer.stage).toBe(WORD);
  });

  it("exposes each guest's stage and per-game status through the roster view", async () => {
    const bb = await freshBackbone();
    const { participant } = await inGame(bb, "+1500000030", "Ivo");
    await bb.missions.setStageForParticipant(participant.id, WORD);

    const statuses = await bb.repos.participantMissions.statusesByEvent(bb.eventId);
    const view = stageView(statuses.get(participant.id) ?? {}, WORD);
    expect(view.stage).toBe(WORD);
    expect(view.quests.find((q) => q.id === WORD)?.status).toBe("assigned");
  });
});

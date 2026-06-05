import { describe, expect, it } from "vitest";
import { RIDDLE_MISSION_ID } from "@/constants/missions";
import { riddlesForParticipant } from "@/domain/mission-parse";
import { QUEST_BASE, revealedRiddlePoints } from "@/domain/scoring";
import { freshBackbone, inGame } from "./helpers";

async function score(bb: Awaited<ReturnType<typeof freshBackbone>>, id: string): Promise<number> {
  return (await bb.repos.participants.findById(id))?.score ?? -1;
}

describe("riddle quest: progressive hints, reveal, reduced scoring", () => {
  it("escalates hints per miss then reveals the focused riddle's answer", async () => {
    const bb = await freshBackbone();
    const { participant, conversation } = await inGame(bb, "+1500000100", "Thea");
    const riddles = riddlesForParticipant(participant.gameId);
    const first = riddles[0];

    const miss1 = await bb.missions.submit(participant, conversation, "wronganswerone");
    expect(miss1.kind).toBe("riddle_incorrect");
    if (miss1.kind === "riddle_incorrect") {
      expect(miss1.riddleNumber).toBe(1);
      expect(miss1.nudge).toEqual({ kind: "hint", level: 1, text: first.hints[0] });
    }

    const miss2 = await bb.missions.submit(participant, conversation, "wronganswertwo");
    expect(miss2.kind).toBe("riddle_incorrect");
    if (miss2.kind === "riddle_incorrect") {
      expect(miss2.nudge).toEqual({ kind: "hint", level: 2, text: first.hints[1] });
    }

    const miss3 = await bb.missions.submit(participant, conversation, "wronganswerthree");
    expect(miss3.kind).toBe("riddle_incorrect");
    if (miss3.kind === "riddle_incorrect") {
      expect(miss3.nudge).toEqual({ kind: "reveal", answer: first.answers[0] });
    }

    // Missing the riddle never awards points.
    expect(await score(bb, participant.id)).toBe(0);
  });

  it("scores a revealed riddle at the reduced rate but unrevealed ones in full", async () => {
    const bb = await freshBackbone();
    const { participant, conversation } = await inGame(bb, "+1500000101", "Cyrus");
    const riddles = riddlesForParticipant(participant.gameId);
    const [first, second, third] = riddles;
    const full = QUEST_BASE.riddle_quest;
    const reduced = revealedRiddlePoints(full);

    // Burn three misses so the first riddle's answer is revealed.
    for (const wrong of ["nopenope", "stillnope", "nopeagain"]) {
      await bb.missions.submit(participant, conversation, wrong);
    }
    const before = await score(bb, participant.id);

    // Solving the revealed riddle scores the reduced rate.
    const solvedRevealed = await bb.missions.submit(participant, conversation, first.answers[0]);
    expect(solvedRevealed.kind).toBe("riddle_progress");
    expect((await score(bb, participant.id)) - before).toBe(reduced);

    // A riddle solved without a reveal still scores in full.
    const afterFirst = await score(bb, participant.id);
    const solvedClean = await bb.missions.submit(participant, conversation, second.answers[0]);
    expect(solvedClean.kind).toBe("riddle_progress");
    expect((await score(bb, participant.id)) - afterFirst).toBe(full);

    // The third solve completes the quest and reports a "correct" outcome.
    const done = await bb.missions.submit(participant, conversation, third.answers[0]);
    expect(done.kind).toBe("correct");
    const finished = new Set(await bb.repos.participantMissions.finishedMissionIds(participant.id));
    expect(finished.has(RIDDLE_MISSION_ID)).toBe(true);
  });

  it("resets the hint ladder after a solve so the next riddle starts gentle", async () => {
    const bb = await freshBackbone();
    const { participant, conversation } = await inGame(bb, "+1500000102", "Dalia");
    const riddles = riddlesForParticipant(participant.gameId);

    // Solve the first riddle cleanly; the streak should reset.
    await bb.missions.submit(participant, conversation, riddles[0].answers[0]);

    // The next miss targets riddle #2 at hint level 1, not a carried-over level.
    const miss = await bb.missions.submit(participant, conversation, "wrongwrongwrong");
    expect(miss.kind).toBe("riddle_incorrect");
    if (miss.kind === "riddle_incorrect") {
      expect(miss.riddleNumber).toBe(2);
      expect(miss.nudge).toEqual({ kind: "hint", level: 1, text: riddles[1].hints[0] });
    }
  });
});

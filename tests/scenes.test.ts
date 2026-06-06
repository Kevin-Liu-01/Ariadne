import { describe, expect, it } from "vitest";
import { SCENE_IDS, nextScene, sceneMeta } from "@/constants/scenes";

/**
 * The run-of-show order is the operator's button order and powers the "recommended
 * next" hint. The runway show runs before the game (the night opens with the show,
 * then the labyrinth game goes live), and the ambient visuals break sits between the
 * live game and the finale, so the operator can let the room watch the shaders before
 * the winners are crowned.
 */
describe("run-of-show scene order", () => {
  it("places the runway show immediately before the game", () => {
    const runwayAt = SCENE_IDS.indexOf("runway");
    const gameAt = SCENE_IDS.indexOf("game");
    expect(runwayAt).toBeGreaterThanOrEqual(0);
    expect(gameAt).toBe(runwayAt + 1);
  });

  it("places visuals immediately before finale", () => {
    const visualsAt = SCENE_IDS.indexOf("visuals");
    const finaleAt = SCENE_IDS.indexOf("finale");
    expect(visualsAt).toBeGreaterThanOrEqual(0);
    expect(finaleAt).toBe(visualsAt + 1);
  });

  it("recommends opening -> runway -> game -> visuals -> finale as the night moves on", () => {
    expect(nextScene("opening")).toBe("runway");
    expect(nextScene("runway")).toBe("game");
    expect(nextScene("game")).toBe("visuals");
    expect(nextScene("visuals")).toBe("finale");
  });

  it("gives the visuals scene operator-facing board metadata", () => {
    const meta = sceneMeta("visuals");
    expect(meta.id).toBe("visuals");
    expect(meta.note.length).toBeGreaterThan(0);
  });
});

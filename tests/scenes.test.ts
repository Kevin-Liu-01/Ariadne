import { describe, expect, it } from "vitest";
import { SCENE_IDS, nextScene, sceneMeta } from "@/constants/scenes";

/**
 * The run-of-show order is the operator's button order and powers the "recommended
 * next" hint. The ambient visuals break sits between the live game and the finale,
 * so the operator can let the room watch the shaders before the winners are crowned.
 */
describe("run-of-show scene order", () => {
  it("places visuals immediately before finale", () => {
    const visualsAt = SCENE_IDS.indexOf("visuals");
    const finaleAt = SCENE_IDS.indexOf("finale");
    expect(visualsAt).toBeGreaterThanOrEqual(0);
    expect(finaleAt).toBe(visualsAt + 1);
  });

  it("recommends game -> visuals -> finale as the night moves on", () => {
    expect(nextScene("game")).toBe("visuals");
    expect(nextScene("visuals")).toBe("finale");
  });

  it("gives the visuals scene operator-facing board metadata", () => {
    const meta = sceneMeta("visuals");
    expect(meta.id).toBe("visuals");
    expect(meta.note.length).toBeGreaterThan(0);
  });
});

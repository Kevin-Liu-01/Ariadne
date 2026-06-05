import { describe, expect, it } from "vitest";
import { freshBackbone } from "./helpers";

/**
 * The home page leads with iMessage by default; staff flip it to the web Live Player
 * from the operator console. The value is derived from the last toggle, like scene.
 */
describe("home mode toggle", () => {
  it("defaults to imessage and follows the latest staff toggle", async () => {
    const bb = await freshBackbone();
    expect(await bb.projection.homeMode()).toBe("imessage");
    expect((await bb.projection.snapshot()).homeMode).toBe("imessage");

    await bb.projection.emit("home_mode.changed", { mode: "play" });
    expect(await bb.projection.homeMode()).toBe("play");
    expect((await bb.projection.snapshot()).homeMode).toBe("play");

    // Last write wins, so staff can flip it back mid-event.
    await bb.projection.emit("home_mode.changed", { mode: "imessage" });
    expect(await bb.projection.homeMode()).toBe("imessage");
  });
});

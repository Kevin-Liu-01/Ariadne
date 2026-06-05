import { describe, expect, it } from "vitest";
import { textableAction } from "@/constants/textable-actions";

describe("textable action templates", () => {
  it("prefills editable stems for sample iMessage actions", () => {
    expect(textableAction("drinks").body).toBe("I want to order a ");
    expect(textableAction("songs").body).toBe("I want to request ");
    expect(textableAction("missions").body).toBe("My mission answer is ");
    expect(textableAction("help").body).toBe("I need help with ");
  });
});

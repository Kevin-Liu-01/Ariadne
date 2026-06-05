import type { GemId } from "@/constants/gems";

/** Color-wheel role for the Color Quest (primary or secondary triangle). */
export type WheelHue = "red" | "yellow" | "blue" | "purple" | "green" | "orange";

/** Map each gem to its wheel color. Matches the gem hex shown to guests. */
export const GEM_WHEEL_HUE: Record<GemId, WheelHue> = {
  garnet: "red",
  moonstone: "yellow", // the yellow Citrine gem
  aquamarine: "blue",
  amethyst: "purple",
  peridot: "green",
  topaz: "orange",
};

const PRIMARY: readonly WheelHue[] = ["red", "yellow", "blue"];
const SECONDARY: readonly WheelHue[] = ["purple", "green", "orange"];

/**
 * True when exactly three gems (in play, the solver's own plus two others) each
 * have a different hue and those hues are either all three primaries (red, yellow,
 * blue) or all three secondaries (purple, green, orange): a triangle on the wheel.
 */
export function isValidColorTriangle(gems: readonly GemId[]): boolean {
  if (gems.length !== 3) return false;
  const hues = gems.map((g) => GEM_WHEEL_HUE[g]);
  if (new Set(hues).size !== 3) return false;
  const allPrimary = hues.every((h) => PRIMARY.includes(h));
  const allSecondary = hues.every((h) => SECONDARY.includes(h));
  return allPrimary || allSecondary;
}

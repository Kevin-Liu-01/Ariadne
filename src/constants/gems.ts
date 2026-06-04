/**
 * Color gems. Each guest is assigned one at check-in based on their RSVP
 * category (we never tell them why). Gems drive the color-quest mission and the
 * projection tiles. Hexes are the canonical event palette.
 */

export interface Gem {
  readonly id: GemId;
  readonly label: string;
  readonly hex: string;
  readonly rsvp: string; // the cohort this gem quietly encodes
}

// The six gems are the six color-wheel hues so the Color Quest triangles work:
// red/yellow/blue (primary) and purple/green/orange (secondary). The `id` is the
// stable DB key; `label`/`hex` are what guests see. The yellow gem keeps the id
// "moonstone" (so existing rows stay valid) but presents as Citrine, a yellow stone.
export const GEMS = {
  amethyst: { id: "amethyst", label: "Amethyst", hex: "#D2BEFF", rsvp: "founders" }, // purple
  garnet: { id: "garnet", label: "Garnet", hex: "#A20000", rsvp: "engineers" }, // red
  moonstone: { id: "moonstone", label: "Citrine", hex: "#F4C430", rsvp: "artists" }, // yellow
  peridot: { id: "peridot", label: "Peridot", hex: "#C3D95A", rsvp: "growth" }, // green
  aquamarine: { id: "aquamarine", label: "Aquamarine", hex: "#ADD8E6", rsvp: "product" }, // blue
  topaz: { id: "topaz", label: "Topaz", hex: "#FFAB57", rsvp: "other" }, // orange
} as const satisfies Record<string, Gem>;

export type GemId = "amethyst" | "garnet" | "moonstone" | "peridot" | "aquamarine" | "topaz";

export const GEM_IDS = Object.keys(GEMS) as GemId[];

export function isGemId(value: string): value is GemId {
  return value in GEMS;
}

/** The gem with the fewest holders, for a balanced "recommended" reassignment. Ties break by gem order. */
export function leastUsedGem(counts: Partial<Record<GemId, number>>): GemId {
  let best: GemId = GEM_IDS[0];
  let fewest = Number.POSITIVE_INFINITY;
  for (const id of GEM_IDS) {
    const count = counts[id] ?? 0;
    if (count < fewest) {
      fewest = count;
      best = id;
    }
  }
  return best;
}

/** Free-text RSVP category -> gem. Unknown categories fall to balanced assignment, not here. */
export const RSVP_CATEGORY_TO_GEM: Record<string, GemId> = {
  founder: "amethyst",
  founders: "amethyst",
  ceo: "amethyst",
  engineer: "garnet",
  engineering: "garnet",
  eng: "garnet",
  developer: "garnet",
  artist: "moonstone",
  artists: "moonstone",
  creative: "moonstone",
  "creative technologist": "moonstone",
  designer: "moonstone",
  growth: "peridot",
  marketing: "peridot",
  product: "aquamarine",
  pm: "aquamarine",
  bd: "aquamarine",
  "business development": "aquamarine",
  sales: "aquamarine",
  other: "topaz",
};

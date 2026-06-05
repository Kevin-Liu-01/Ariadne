/**
 * Drink menu. Drinks are free; the flow only captures + routes orders. Product
 * owns this list at build freeze. `aliases` feed the deterministic order parser
 * (lowercased, punctuation-stripped contains-match).
 */

import { BULLET } from "@/constants/format";

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly category: "cocktail" | "wine" | "beer" | "zero_proof";
  readonly available: boolean;
  /** What a signature cocktail is made of, shown on the menu. Cocktails only. */
  readonly ingredients?: string;
}

export const DRINK_MENU = [
  { id: "modelo", label: "Modelo", aliases: ["modelo", "modello", "mexican beer"], category: "beer", available: true },
  { id: "stella", label: "Stella", aliases: ["stella", "stella artois"], category: "beer", available: true },
  { id: "white_claw", label: "White Claw", aliases: ["white claw", "whiteclaw", "hard seltzer", "seltzer"], category: "beer", available: true },
  { id: "house_red", label: "Red Wine (Bogus)", aliases: ["red wine", "red", "bogus", "house red"], category: "wine", available: true },
  { id: "house_white", label: "White Wine (Oyster Bay)", aliases: ["white wine", "white", "oyster bay", "sauvignon blanc", "house white"], category: "wine", available: true },
  { id: "sparkling_water", label: "Sparkling Water", aliases: ["sparkling water", "sparkling", "bubbly water", "soda water", "club soda"], category: "zero_proof", available: true },
  { id: "still_water", label: "Still Water", aliases: ["still water", "water", "h2o"], category: "zero_proof", available: true },
  { id: "red_bull", label: "Red Bull", aliases: ["red bull", "redbull", "energy drink"], category: "zero_proof", available: true },
  { id: "machina_mule", label: "Machina Mule", aliases: ["machina mule", "machina", "mule", "moscow mule"], category: "cocktail", available: true, ingredients: "vodka, ginger beer, lime" },
  { id: "margaraita", label: "Margar(AI)ta", aliases: ["margaraita", "margarita", "marg", "ai marg"], category: "cocktail", available: true, ingredients: "tequila, lime, triple sec" },
  { id: "cloud_hypervisor_fizz", label: "Cloud Hypervisor Fizz", aliases: ["cloud hypervisor fizz", "cloud fizz", "hypervisor", "fizz"], category: "cocktail", available: true, ingredients: "gin, lemon, soda" },
] as const satisfies readonly MenuItem[];

export type MenuItemId = (typeof DRINK_MENU)[number]["id"];

// "expired" closes a ready order the guest never picked up (distinct from an operator
// "cancelled", which is a mistake/void). An expired cocktail still spends the voucher.
export const DRINK_STATUSES = ["queued", "in_progress", "ready", "picked_up", "cancelled", "expired"] as const;
export type DrinkStatus = (typeof DRINK_STATUSES)[number];

/** Window in which an identical, still-open order is treated as a duplicate, not a new pour. */
export const DRINK_DEDUP_WINDOW_MS = 90_000;

/** Cocktails are voucher-gated: one free cocktail per guest. Beer, wine, and zero-proof are unlimited. */
export const COCKTAIL_VOUCHER_PER_GUEST = 1;
/**
 * Per-cocktail stock for the night. Each signature cocktail can be ordered this many
 * times before it sells out on its own; the others (and the unlimited categories) keep
 * pouring. Hitting the cap alerts the operator once for that cocktail.
 */
export const COCKTAIL_STOCK_PER_ITEM = 50;

const MENU_BY_ID: ReadonlyMap<string, MenuItem> = new Map(DRINK_MENU.map((d) => [d.id, d]));

export function menuItemById(id: string): MenuItem | null {
  return MENU_BY_ID.get(id) ?? null;
}

/** True if the menu item is a cocktail (the voucher-limited category). */
export function isCocktailItem(id: string): boolean {
  return menuItemById(id)?.category === "cocktail";
}

/** Menu ids in the voucher-limited cocktail category. */
export const COCKTAIL_MENU_IDS: readonly string[] = DRINK_MENU.filter(
  (d) => d.category === "cocktail",
).map((d) => d.id);

const CATEGORY_LABELS: Record<MenuItem["category"], string> = {
  cocktail: "Cocktails",
  wine: "Wine",
  beer: "Beer",
  zero_proof: "Zero-proof",
};

/**
 * The bar menu in two sections, for guests (DRINK command) and the agent's context:
 * the signature cocktails (one per guest, with what each is made of), then everything
 * that is unlimited and free at the bar.
 */
export function menuSummary(): string {
  const cocktails: readonly MenuItem[] = DRINK_MENU.filter(
    (d) => d.available && d.category === "cocktail",
  );
  const specials = cocktails.map(
    (d) => `${BULLET}${d.label}${d.ingredients ? ` (${d.ingredients})` : ""}`,
  );

  const unlimited = new Map<MenuItem["category"], string[]>();
  for (const item of DRINK_MENU) {
    if (!item.available || item.category === "cocktail") continue;
    const list = unlimited.get(item.category) ?? [];
    list.push(item.label);
    unlimited.set(item.category, list);
  }
  const unlimitedLines = (["beer", "wine", "zero_proof"] as const)
    .filter((c) => unlimited.has(c))
    .map((c) => `${BULLET}${CATEGORY_LABELS[c]}: ${unlimited.get(c)?.join(", ")}`);

  return [
    "Signature cocktails (one per guest):",
    ...specials,
    "",
    "Free and unlimited until supplies run out:",
    ...unlimitedLines,
  ].join("\n");
}

/** Common modifiers we recognize in free text and echo back to the bar. */
export const DRINK_MODIFIERS: readonly string[] = [
  "double",
  "neat",
  "on the rocks",
  "rocks",
  "no ice",
  "extra ice",
  "dirty",
  "spicy",
  "no salt",
  "lime",
  "lemon",
  "skinny",
];

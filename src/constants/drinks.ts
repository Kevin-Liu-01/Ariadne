/**
 * Drink menu. Drinks are free; the flow only captures + routes orders. Product
 * owns this list at build freeze. `aliases` feed the deterministic order parser
 * (lowercased, punctuation-stripped contains-match).
 */

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly category: "cocktail" | "wine" | "beer" | "zero_proof";
  readonly available: boolean;
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
  { id: "machina_mule", label: "Machina Mule", aliases: ["machina mule", "machina", "mule", "moscow mule"], category: "cocktail", available: true },
  { id: "margaraita", label: "Margar(AI)ta", aliases: ["margaraita", "margarita", "marg", "ai marg"], category: "cocktail", available: true },
  { id: "cloud_hypervisor_fizz", label: "Cloud Hypervisor Fizz", aliases: ["cloud hypervisor fizz", "cloud fizz", "hypervisor", "fizz"], category: "cocktail", available: true },
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
/** Total cocktail vouchers for the night. When spent, cocktails close and the operator is alerted. */
export const COCKTAIL_VOUCHER_LIMIT = 150;

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

/** One-line menu of available items, grouped by category. Injected into the agent's context. */
export function menuSummary(): string {
  const grouped = new Map<MenuItem["category"], string[]>();
  for (const item of DRINK_MENU) {
    if (!item.available) continue;
    const list = grouped.get(item.category) ?? [];
    list.push(item.label);
    grouped.set(item.category, list);
  }
  return (["cocktail", "wine", "beer", "zero_proof"] as const)
    .filter((c) => grouped.has(c))
    .map((c) => `${CATEGORY_LABELS[c]}: ${grouped.get(c)?.join(", ")}`)
    .join(" · ");
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

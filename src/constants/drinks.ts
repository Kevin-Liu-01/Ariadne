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
  { id: "vodka_soda", label: "Vodka Soda", aliases: ["vodka soda", "vodka and soda", "vodka & soda", "vodka"], category: "cocktail", available: true },
  { id: "gin_tonic", label: "Gin & Tonic", aliases: ["gin tonic", "gin and tonic", "g and t", "gandt", "gt", "gin"], category: "cocktail", available: true },
  { id: "espresso_martini", label: "Espresso Martini", aliases: ["espresso martini", "espresso", "espress martini", "ebar"], category: "cocktail", available: true },
  { id: "negroni", label: "Negroni", aliases: ["negroni"], category: "cocktail", available: true },
  { id: "aperol_spritz", label: "Aperol Spritz", aliases: ["aperol spritz", "aperol", "spritz"], category: "cocktail", available: true },
  { id: "margarita", label: "Margarita", aliases: ["margarita", "marg", "marga"], category: "cocktail", available: true },
  { id: "paloma", label: "Paloma", aliases: ["paloma"], category: "cocktail", available: true },
  { id: "old_fashioned", label: "Old Fashioned", aliases: ["old fashioned", "oldfashioned", "old fashion"], category: "cocktail", available: true },
  { id: "whiskey_sour", label: "Whiskey Sour", aliases: ["whiskey sour", "whisky sour", "sour"], category: "cocktail", available: true },
  { id: "wingspan", label: "Wingspan (house mezcal)", aliases: ["wingspan", "house pour", "signature", "mezcal"], category: "cocktail", available: true },
  { id: "house_red", label: "House Red", aliases: ["house red", "red wine", "red", "cabernet", "pinot noir"], category: "wine", available: true },
  { id: "house_white", label: "House White", aliases: ["house white", "white wine", "white", "sauvignon", "chardonnay"], category: "wine", available: true },
  { id: "beer", label: "Beer", aliases: ["beer", "lager", "ipa", "pilsner"], category: "beer", available: true },
  { id: "shirley_temple", label: "Shirley Temple", aliases: ["shirley temple", "shirley", "mocktail"], category: "zero_proof", available: true },
  { id: "club_soda", label: "Club Soda + Lime", aliases: ["club soda", "soda water", "sparkling water", "lime soda"], category: "zero_proof", available: true },
  { id: "coke", label: "Coke", aliases: ["coke", "cola", "diet coke", "pepsi"], category: "zero_proof", available: true },
  { id: "water", label: "Water", aliases: ["water", "still water", "h2o"], category: "zero_proof", available: true },
] as const satisfies readonly MenuItem[];

export type MenuItemId = (typeof DRINK_MENU)[number]["id"];

// "expired" closes a ready order the guest never picked up (distinct from an operator
// "cancelled", which is a mistake/void). An expired cocktail still spends the voucher.
export const DRINK_STATUSES = ["queued", "in_progress", "ready", "picked_up", "cancelled", "expired"] as const;
export type DrinkStatus = (typeof DRINK_STATUSES)[number];

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

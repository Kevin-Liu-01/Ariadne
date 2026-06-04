import { DRINK_MENU, DRINK_MODIFIERS, type MenuItem } from "@/constants/drinks";
import { containsPhrase, normalize } from "@/domain/text";

export interface DrinkMatch {
  item: MenuItem | null;
  modifiers: string[];
  confidence: number; // 0..1, scaled by how specific the matched alias is
}

/**
 * Map free text to a menu item using word-boundary alias matching. The longest
 * matching alias wins (most specific). Confidence scales with alias length so a
 * bare "red" is lower-confidence than "espresso martini".
 */
export function parseDrink(text: string): DrinkMatch {
  const haystack = normalize(text);
  let best: { item: MenuItem; aliasLen: number } | null = null;

  for (const item of DRINK_MENU) {
    for (const alias of item.aliases) {
      const a = normalize(alias);
      if (containsPhrase(haystack, a) && (best === null || a.length > best.aliasLen)) {
        best = { item, aliasLen: a.length };
      }
    }
  }

  const modifiers = dedupeModifiers(
    DRINK_MODIFIERS.filter((m) => containsPhrase(haystack, normalize(m))),
  );

  if (best === null) return { item: null, modifiers, confidence: 0 };
  const confidence = best.aliasLen >= 6 ? 0.95 : best.aliasLen >= 4 ? 0.8 : 0.6;
  return { item: best.item, modifiers, confidence };
}

/** True when the guest asked for more than one drink in a single message. */
export function isMultiDrinkOrder(text: string): boolean {
  const haystack = normalize(text);
  if (/\b(?:two|2|three|3|four|4|couple|double)\b/u.test(haystack) && /\b(?:drink|cocktail|beer|wine|vodka|gin|martini|soda)\b/u.test(haystack)) {
    return true;
  }
  let hits = 0;
  for (const item of DRINK_MENU) {
    for (const alias of item.aliases) {
      if (alias.length < 4) continue;
      if (containsPhrase(haystack, normalize(alias))) {
        hits += 1;
        break;
      }
    }
  }
  return hits > 1;
}

/** Drop a modifier when a longer matched modifier already contains it ("rocks" vs "on the rocks"). */
function dedupeModifiers(matched: string[]): string[] {
  return matched.filter(
    (m) => !matched.some((other) => other !== m && containsPhrase(normalize(other), normalize(m))),
  );
}

import { DRINK_MENU, DRINK_MODIFIERS, type MenuItem } from "@/constants/drinks";
import { containsPhrase, normalize } from "@/domain/text";

export interface DrinkMatch {
  item: MenuItem | null;
  modifiers: string[];
  confidence: number; // 0..1, scaled by how specific the matched alias is
}

interface MenuSpan {
  item: MenuItem; // the named item
  start: number; // index into the normalized haystack
  len: number; // length of the matched name (longer = more specific)
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every place the text names a menu item, as a word-boundary span. The displayed
 * label is matched as an implicit alias, so a guest can always order by the name
 * on the menu: "Margar(AI)ta" normalizes to "margar ai ta", which no hand-written
 * alias covered. Overlapping spans (e.g. "water" inside "sparkling water") are kept
 * here and resolved by `maximalMatches`.
 */
function namedSpans(haystack: string): MenuSpan[] {
  const spans: MenuSpan[] = [];
  for (const item of DRINK_MENU) {
    for (const phrase of [item.label, ...item.aliases]) {
      const a = normalize(phrase);
      if (a.length === 0) continue;
      // Leading boundary is consumed; trailing is a lookahead so adjacent names
      // separated by one space ("modelo stella") both match.
      const re = new RegExp(`(?:^|\\s)(${escapeRe(a)})(?=$|\\s)`, "g");
      for (let m = re.exec(haystack); m; m = re.exec(haystack)) {
        const start = m.index + (m[0].length - a.length);
        spans.push({ item, start, len: a.length });
        re.lastIndex = start + a.length;
      }
    }
  }
  return spans;
}

/**
 * Resolve overlapping name matches to the maximal set: take the longest match,
 * then the next longest that does not overlap it, and so on. This makes the
 * longest name win ("sparkling water" beats the "water" inside it) while still
 * surfacing genuinely separate drinks ("modelo and stella").
 */
function maximalMatches(haystack: string): MenuSpan[] {
  const spans = namedSpans(haystack).sort((a, b) => b.len - a.len);
  const chosen: MenuSpan[] = [];
  for (const s of spans) {
    const overlaps = chosen.some((c) => s.start < c.start + c.len && c.start < s.start + s.len);
    if (!overlaps) chosen.push(s);
  }
  return chosen;
}

/**
 * Map free text to a menu item. The longest named match wins (most specific).
 * Confidence scales with the match length so a bare "red" is lower-confidence
 * than "machina mule".
 */
export function parseDrink(text: string): DrinkMatch {
  const haystack = normalize(text);
  const matches = maximalMatches(haystack);
  const modifiers = dedupeModifiers(
    DRINK_MODIFIERS.filter((m) => containsPhrase(haystack, normalize(m))),
  );
  if (matches.length === 0) return { item: null, modifiers, confidence: 0 };
  const best = matches.reduce((a, b) => (b.len > a.len ? b : a));
  const confidence = best.len >= 6 ? 0.95 : best.len >= 4 ? 0.8 : 0.6;
  return { item: best.item, modifiers, confidence };
}

/**
 * True when the guest asked for more than one drink in a single message: either a
 * count word next to a drink noun ("two beers", "3 cocktails") or two distinct menu
 * items named at once ("modelo and stella"). A single multi-word drink whose name
 * contains a shorter item's alias ("sparkling water" contains "water") is one order,
 * not two. "double" is a modifier, not a count.
 */
export function isMultiDrinkOrder(text: string): boolean {
  const haystack = normalize(text);
  const hasCount = /\b(?:two|three|four|five|2|3|4|5|couple)\b/u.test(haystack);
  const hasDrinkNoun = /\b(?:drinks?|cocktails?|beers?|wines?|waters?|seltzers?|shots?|rounds?|margs?)\b/u.test(
    haystack,
  );
  if (hasCount && hasDrinkNoun) return true;

  const distinct = new Set(maximalMatches(haystack).map((m) => m.item.id));
  return distinct.size > 1;
}

/** Drop a modifier when a longer matched modifier already contains it ("rocks" vs "on the rocks"). */
function dedupeModifiers(matched: string[]): string[] {
  return matched.filter(
    (m) => !matched.some((other) => other !== m && containsPhrase(normalize(other), normalize(m))),
  );
}

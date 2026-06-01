import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";

/**
 * Profanity gate for anything a guest can put on the big screen (chiefly their
 * display name). One matcher per process; building the dataset is non-trivial,
 * so we reuse it. The recommended transformers catch common obfuscations
 * (leetspeak, spacing) so "sh1t" and "s h i t" are caught alongside "shit".
 */
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/** True if the text contains profanity or a slur, including light obfuscation. */
export function isProfane(text: string): boolean {
  return matcher.hasMatch(text);
}

/**
 * A display name safe to project to the whole room: trimmed and length-capped.
 * Returns null when the name is empty or profane, so the caller falls back to
 * anonymous initials / game id rather than putting it on screen.
 */
export function cleanDisplayName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 40);
  if (!trimmed) return null;
  return isProfane(trimmed) ? null : trimmed;
}

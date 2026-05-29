import { randomInt, randomUUID } from "node:crypto";

/** Internal id with a short type prefix, e.g. `par_3f9a...`. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

// Crockford-ish alphabet without 0/O/1/I/L to stay legible when read aloud or texted.
const GAME_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Public, textable participant code, e.g. `G7F3`. Uniqueness enforced by caller. */
export function newGameId(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += GAME_ALPHABET[randomInt(GAME_ALPHABET.length)];
  }
  return out;
}

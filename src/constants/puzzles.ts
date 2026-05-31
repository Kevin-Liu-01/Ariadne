/**
 * Image-puzzle catalog for the collaborative "decode the labyrinth" mission
 * (Scenario 3). One puzzle is shown on the projection at a time (the operator
 * advances them); guests text the agent what they think it is. Deterministic
 * code checks the answer against `answers` — the agent never decides.
 *
 * `answers` is server-only and MUST NOT be sent to the projection client. The
 * public snapshot exposes only `id` and `imageUrl`.
 *
 * Difficulty is intentionally HIGH: images are cropped/blurred on the board and
 * the room solves them together. `answers` are kept generous so any correct
 * identification of the myth, object, place, or source counts.
 */

export interface PuzzlePiece {
  readonly id: string;
  /** Operator-facing label (what it is). Never sent to the public board. */
  readonly label: string;
  /** Original reference. Some are source pages, not direct images (see needsImage). */
  readonly sourceUrl: string;
  /** Direct image to render on the board. Undefined until a local asset is hosted. */
  readonly imageUrl?: string;
  /** Accepted identifications (lowercased, matched as substrings). Server-only. */
  readonly answers: readonly string[];
  /** True when a direct, event-safe (cropped/blurred, locally hosted) image is still needed. */
  readonly needsImage?: boolean;
}

export const PUZZLES: readonly PuzzlePiece[] = [
  {
    id: "erechtheion",
    label: "Erechtheion — anathyrosis stonework (Acropolis)",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Erechtheion-anathyrosis.jpg",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Erechtheion-anathyrosis.jpg",
    answers: ["erechtheion", "anathyrosis", "acropolis", "greek temple", "temple", "athens"],
  },
  {
    id: "automata",
    label: "Automata in Greek mythology (Hero of Alexandria basin)",
    sourceUrl: "https://themadmuseum.co.uk/wp-content/uploads/2016/06/hero-basin-1-e1467647711377.jpg",
    imageUrl: "https://themadmuseum.co.uk/wp-content/uploads/2016/06/hero-basin-1-e1467647711377.jpg",
    answers: ["automata", "automaton", "automatons", "hero of alexandria", "greek automata"],
  },
  {
    id: "pasiphae",
    label: "Daedalus delivering the wooden cow to Pasiphae",
    sourceUrl:
      "https://media.gettyimages.com/id/655097684/vector/daedalus-delivering-the-wooden-cow-to-pasiphae-pasipha%C3%AB.jpg",
    imageUrl:
      "https://media.gettyimages.com/id/655097684/vector/daedalus-delivering-the-wooden-cow-to-pasiphae-pasipha%C3%AB.jpg",
    answers: ["daedalus", "pasiphae", "wooden cow", "the wooden cow", "cow", "daedalus and pasiphae"],
    needsImage: true, // getty hotlink is watermarked/unreliable — host a local crop for the event
  },
  {
    id: "stater",
    label: "Knossos silver stater — labyrinth coin",
    sourceUrl: "https://www.puzzlemuseum.com/month/picm09/2009-09-stater.htm",
    answers: ["stater", "labyrinth", "knossos", "coin", "labyrinth coin"],
    needsImage: true, // source is a page, not a direct image
  },
  {
    id: "labyrinth",
    label: "The Labyrinth / Minotaur",
    sourceUrl:
      "https://www.thenewworld.co.uk/wp-content/uploads/sites/2/2023/05/labyrinth-e1683641158996.jpg",
    imageUrl:
      "https://www.thenewworld.co.uk/wp-content/uploads/sites/2/2023/05/labyrinth-e1683641158996.jpg",
    answers: ["labyrinth", "minotaur", "maze", "the labyrinth"],
  },
  {
    id: "daedalus-escapes",
    label: "Daedalus escapes (iuvat evasisse)",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Daedalus_escapes_(iuvat_evasisse).jpg",
    answers: ["daedalus", "daedalus escapes", "icarus", "wings", "escape", "flight"],
    needsImage: true, // source is a wikimedia File page, not a direct image
  },
  {
    id: "wing-hoodie",
    label: "Dedalus wing hoodie (cropped hard)",
    sourceUrl: "",
    answers: [
      "wing hoodie",
      "wings",
      "wing",
      "hoodie",
      "give your agent wings",
      "dedalus hoodie",
      "the hoodie",
      "merch",
    ],
    needsImage: true, // product to provide a hard-cropped photo of the wing hoodie
  },
];

export const PUZZLE_BY_ID: ReadonlyMap<string, PuzzlePiece> = new Map(PUZZLES.map((p) => [p.id, p]));

export const DEFAULT_PUZZLE_ID = PUZZLES[0].id;

/** Resolve a puzzle by id, falling back to the first puzzle (there is always one). */
export function puzzleById(id: string): PuzzlePiece {
  return PUZZLE_BY_ID.get(id) ?? PUZZLES[0];
}

/** Client-safe view of a puzzle (no answers, no operator label). For the public board. */
export interface PublicPuzzle {
  id: string;
  imageUrl: string | null;
}

export function toPublicPuzzle(piece: PuzzlePiece): PublicPuzzle {
  return { id: piece.id, imageUrl: piece.imageUrl ?? null };
}

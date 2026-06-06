/**
 * How many guests each people-list surface renders before the rest collapse into a
 * single "+N more" overflow affordance.
 *
 * Tuned so the cinematic stages never spill past one screen: the projection page is
 * fixed-height and the projector can't scroll, so anything beyond the cap would otherwise
 * vanish silently. The live standings board caps dynamically by measuring how many tiles
 * fit (see `useGridFit`), not from a constant. Operator panels can scroll, so their cap is
 * just a "leaders" head with an honest remainder.
 */
export const PEOPLE_CAP = {
  /** Arrival board: compact gem swarm (icons only). */
  arrivalGems: 42,
  /** Runway scene: name pills floating under the wordmark. */
  runwayPills: 16,
  /** Finale: the field below the top-three podium. */
  finaleField: 15,
  /** Operator game-progress leaderboard. */
  operatorLeaderboard: 8,
} as const;

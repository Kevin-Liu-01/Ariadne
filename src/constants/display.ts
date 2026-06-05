/**
 * How many guests each people-list surface renders before the rest collapse into a
 * single "+N more" overflow affordance.
 *
 * Tuned so the projected board and cinematic stages never spill past one screen: the
 * projection page is fixed-height and the projector can't scroll, so anything beyond the
 * cap would otherwise vanish silently. Operator panels can scroll, so their cap is just a
 * "leaders" head with an honest remainder.
 */
export const PEOPLE_CAP = {
  /** Arrival board: compact gem swarm (icons only). */
  arrivalGems: 42,
  /** Runway scene: name pills floating under the wordmark. */
  runwayPills: 2,
  /** Finale: the field below the top-three podium. */
  finaleField: 15,
  /** Live game board standings tiles. */
  standingsTiles: 2,
  /** Operator game-progress leaderboard. */
  operatorLeaderboard: 8,
} as const;

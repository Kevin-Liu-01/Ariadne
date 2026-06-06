/** A list capped for display: the head we render plus how many were collapsed away. */
export interface Capped<T> {
  visible: T[];
  overflow: number;
}

/**
 * Cap a list to `limit` items for display, reporting how many were hidden so a UI can
 * render a single "+N more" affordance at the end. A non-positive `limit` means no cap.
 *
 * One deliberate edge: when the cap would hide exactly one item we show it instead, since
 * an overflow chip costs the same room as the item it stands in for. So callers never get
 * a pointless "+1 more".
 */
export function capForDisplay<T>(items: readonly T[], limit: number): Capped<T> {
  if (limit <= 0 || items.length <= limit || items.length === limit + 1) {
    return { visible: [...items], overflow: 0 };
  }
  return { visible: items.slice(0, limit), overflow: items.length - limit };
}

/**
 * Cap a list to a hard `capacity` of total cells, reserving one cell for the "+N more"
 * indicator when it overflows. Unlike `capForDisplay`, the indicator counts against the
 * budget, so `visible.length + (overflow ? 1 : 0)` never exceeds `capacity`. Use this for
 * a fixed grid (e.g. the projected board) where the indicator must fit, not wrap.
 */
export function capToCapacity<T>(items: readonly T[], capacity: number): Capped<T> {
  if (capacity <= 0 || items.length <= capacity) {
    return { visible: [...items], overflow: 0 };
  }
  const visibleCount = capacity - 1;
  return { visible: items.slice(0, visibleCount), overflow: items.length - visibleCount };
}

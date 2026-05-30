/**
 * In-process sliding-window rate limit per key (guest phone). Bounds LLM spend
 * and abuse: a spammer can't trigger unbounded gateway calls. Single-instance by
 * design (matches the deployment); memoized across HMR.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

const globalRef = globalThis as unknown as { __ariadneHits?: Map<string, number[]> };
function hits(): Map<string, number[]> {
  if (!globalRef.__ariadneHits) globalRef.__ariadneHits = new Map();
  return globalRef.__ariadneHits;
}

/** True if this key may proceed; records the hit. False when over the window cap. */
export function allowInbound(key: string): boolean {
  if (!key) return true;
  const store = hits();
  const nowMs = Date.now();
  const recent = (store.get(key) ?? []).filter((t) => nowMs - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    store.set(key, recent);
    return false;
  }
  recent.push(nowMs);
  store.set(key, recent);
  return true;
}

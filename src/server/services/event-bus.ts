import type { ProjectionEvent } from "@/domain/types";

type Listener = (event: ProjectionEvent) => void;

/**
 * In-process pub/sub for projection events. The projection board and operator
 * console subscribe over SSE; services publish. Single-process by design (the
 * event runs on one machine); SQLite remains the durable source of truth, so a
 * reconnecting client recovers full state regardless of what it missed.
 */
export class EventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  subscribe(eventId: string, listener: Listener): () => void {
    let set = this.listeners.get(eventId);
    if (!set) {
      set = new Set();
      this.listeners.set(eventId, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  publish(eventId: string, event: ProjectionEvent): void {
    const set = this.listeners.get(eventId);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(event);
      } catch {
        // a slow/broken subscriber must never block the publisher
      }
    }
  }
}

const globalRef = globalThis as unknown as { __ariadneBus?: EventBus };

export function getEventBus(): EventBus {
  if (!globalRef.__ariadneBus) globalRef.__ariadneBus = new EventBus();
  return globalRef.__ariadneBus;
}

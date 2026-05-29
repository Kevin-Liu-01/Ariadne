import { getBackbone } from "@/server/backbone";
import type { ProjectionEvent } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_MS = 2000;
const HEARTBEAT_MS = 15000;

/**
 * Server-Sent Events for the projection board. On connect we send a full
 * `snapshot`, then stream `projection` events. We both subscribe to the
 * in-process bus (sub-second, same process) and poll the durable log (catches
 * cross-process writes from the operator console or a strap-on agent). Events
 * are de-duplicated by their monotonic sequence number.
 */
export function GET(): Response {
  const bb = getBackbone();
  const encoder = new TextEncoder();
  let lastSeq = 0;
  let unsubscribe = () => {};
  let poll: ReturnType<typeof setInterval> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      const flush = (events: ProjectionEvent[]) => {
        for (const e of events) {
          if (e.seq > lastSeq) {
            lastSeq = e.seq;
            send("projection", e);
          }
        }
      };

      const snapshot = bb.projection.snapshot();
      lastSeq = snapshot.latestSeq;
      send("snapshot", snapshot);

      unsubscribe = bb.projection.subscribe((e) => flush([e]));
      poll = setInterval(() => {
        try {
          flush(bb.projection.eventsSince(lastSeq));
        } catch {
          // transient DB read error: next tick retries
        }
      }, POLL_MS);
      heartbeat = setInterval(() => write(": hb\n\n"), HEARTBEAT_MS);
    },
    cancel() {
      unsubscribe();
      if (poll) clearInterval(poll);
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

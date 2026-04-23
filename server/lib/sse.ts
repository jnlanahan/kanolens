import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

import { subscribe, type AnalysisEvent } from "../agents/event-bus";

export function streamAnalysisSSE(c: Context, sessionId: string) {
  return streamSSE(c, async (stream) => {
    let nextId = 0;
    const queue: AnalysisEvent[] = [];
    let resolveWaiter: (() => void) | null = null;
    let closed = false;

    const { replay, unsubscribe } = subscribe(sessionId, (event) => {
      queue.push(event);
      if (resolveWaiter) {
        resolveWaiter();
        resolveWaiter = null;
      }
    });
    queue.unshift(...replay);

    stream.onAbort(() => {
      closed = true;
      unsubscribe();
      if (resolveWaiter) {
        resolveWaiter();
        resolveWaiter = null;
      }
    });

    try {
      while (!closed) {
        while (queue.length > 0 && !closed) {
          const event = queue.shift();
          if (!event) break;
          await stream.writeSSE({
            id: String(nextId++),
            event: event.type,
            data: JSON.stringify(event),
          });
          if (event.type === "done" || event.type === "error") {
            closed = true;
            break;
          }
        }
        if (closed) break;
        await new Promise<void>((resolve) => {
          resolveWaiter = resolve;
          setTimeout(() => {
            if (resolveWaiter === resolve) {
              resolveWaiter = null;
              resolve();
            }
          }, 15000);
        });
        if (!closed && queue.length === 0) {
          await stream.writeSSE({ event: "heartbeat", data: "ok" });
        }
      }
    } finally {
      unsubscribe();
    }
  });
}

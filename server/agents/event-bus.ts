export type AnalysisEvent =
  | { type: "status"; status: "queued" | "researching" | "writing" | "done" | "error"; message?: string }
  | { type: "row"; feature: { id: string; name: string; description: string; customerBenefit: string; category: string }; ratings: Record<string, string>; justifications?: Record<string, string>; estimated?: Record<string, boolean>; sources: string[] }
  | { type: "narration"; text: string }
  | { type: "done"; summary: string }
  | { type: "error"; message: string };

type Listener = (event: AnalysisEvent) => void;

const TTL_MS = 30 * 60 * 1000;

interface Stream {
  listeners: Set<Listener>;
  buffer: AnalysisEvent[];
  closed: boolean;
  ttlTimer: ReturnType<typeof setTimeout>;
}

const streams = new Map<string, Stream>();

function getOrCreate(sessionId: string): Stream {
  let s = streams.get(sessionId);
  if (!s) {
    const ttlTimer = setTimeout(() => clearStream(sessionId), TTL_MS);
    s = { listeners: new Set(), buffer: [], closed: false, ttlTimer };
    streams.set(sessionId, s);
  }
  return s;
}

export function publish(sessionId: string, event: AnalysisEvent): void {
  const s = getOrCreate(sessionId);
  if (s.closed) return;
  s.buffer.push(event);
  for (const listener of s.listeners) listener(event);
  if (event.type === "done" || event.type === "error") {
    s.closed = true;
  }
}

export function subscribe(sessionId: string, listener: Listener): { replay: AnalysisEvent[]; unsubscribe: () => void } {
  const s = getOrCreate(sessionId);
  s.listeners.add(listener);
  return {
    replay: [...s.buffer],
    unsubscribe: () => {
      s.listeners.delete(listener);
    },
  };
}

export function clearStream(sessionId: string): void {
  const s = streams.get(sessionId);
  if (s) clearTimeout(s.ttlTimer);
  streams.delete(sessionId);
}

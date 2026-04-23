import { useEffect, useRef, useState } from "react";

import { api, type StreamEvent } from "@/lib/api";

export interface StreamState {
  events: StreamEvent[];
  status: "idle" | "connecting" | "open" | "done" | "error";
  error: string | null;
}

export function useAnalysisStream(sessionId: string | null, enabled: boolean): StreamState {
  const [state, setState] = useState<StreamState>({
    events: [],
    status: "idle",
    error: null,
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId || !enabled) return;
    setState({ events: [], status: "connecting", error: null });

    const es = new EventSource(api.streamUrl(sessionId), { withCredentials: true });
    esRef.current = es;

    const push = (ev: StreamEvent) =>
      setState((prev) => ({
        ...prev,
        events: [...prev.events, ev],
        status: ev.type === "done" ? "done" : ev.type === "error" ? "error" : "open",
        error: ev.type === "error" ? ev.message : prev.error,
      }));

    const handler = (raw: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(raw.data) as StreamEvent;
        push(parsed);
        if (parsed.type === "done" || parsed.type === "error") es.close();
      } catch (err) {
        setState((prev) => ({ ...prev, status: "error", error: String(err) }));
      }
    };

    for (const type of ["status", "row", "narration", "done", "error"] as const) {
      es.addEventListener(type, handler);
    }
    es.onerror = () => {
      setState((prev) =>
        prev.status === "done" ? prev : { ...prev, status: "error", error: "stream disconnected" },
      );
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sessionId, enabled]);

  return state;
}

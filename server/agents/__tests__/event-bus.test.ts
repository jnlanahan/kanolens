import { describe, expect, it } from "vitest";

import type { AnalysisEvent } from "../event-bus";
import { clearStream, publish, subscribe } from "../event-bus";

describe("event-bus", () => {
  it("buffers events so late subscribers can replay", () => {
    const sessionId = "s1";
    publish(sessionId, { type: "status", status: "researching" });
    publish(sessionId, { type: "narration", text: "hi" });

    const received: AnalysisEvent[] = [];
    const { replay, unsubscribe } = subscribe(sessionId, (e) => received.push(e));

    expect(replay).toHaveLength(2);
    expect(replay[0]?.type).toBe("status");
    expect(replay[1]?.type).toBe("narration");

    publish(sessionId, { type: "narration", text: "more" });
    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe("narration");

    unsubscribe();
    clearStream(sessionId);
  });

  it("closes the stream on done/error and stops delivering", () => {
    const sessionId = "s2";
    const received: AnalysisEvent[] = [];
    subscribe(sessionId, (e) => received.push(e));

    publish(sessionId, { type: "done", summary: "ok" });
    publish(sessionId, { type: "narration", text: "should be ignored" });

    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe("done");
    clearStream(sessionId);
  });
});

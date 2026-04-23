import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalysisEvent } from "../event-bus";

const createMock = vi.fn();

vi.mock("../../lib/anthropic", () => ({
  getAnthropicClient: () => ({
    messages: { create: createMock },
  }),
  MODELS: { analyst: "claude-sonnet-4-6", verifier: "claude-haiku-4-5", proposer: "claude-sonnet-4-6" },
}));

vi.mock("../verifier", () => ({
  verifySource: vi.fn(async (args: { url: string }) => ({
    verdict: args.url.startsWith("https://") ? ("verified" as const) : ("cannot_verify" as const),
    note: "ok",
  })),
}));

const { runAnalyst } = await import("../analyst");
const { clearStream, subscribe } = await import("../event-bus");

function assistantToolUse(id: string, name: string, input: unknown) {
  return {
    stop_reason: "tool_use",
    content: [
      {
        type: "tool_use",
        id,
        name,
        input,
      },
    ],
  } as const;
}

function assistantEndTurn() {
  return { stop_reason: "end_turn", content: [{ type: "text", text: "done" }] } as const;
}

describe("analyst loop", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("streams a row per upsert and closes on finalize_table", async () => {
    const scope = {
      userProductName: "Acme Tasks",
      products: ["Linear", "Jira"],
      targetCustomer: "engineering leads",
      features: [
        {
          id: "f1",
          name: "Fast command palette",
          description: "cmd+k search across everything",
          customerBenefit: "reach any task in under a second",
          category: "must-have" as const,
        },
        {
          id: "f2",
          name: "AI status recaps",
          description: "auto-generated daily digests",
          customerBenefit: "skip most standups",
          category: "delighter" as const,
        },
      ],
    };

    createMock
      .mockResolvedValueOnce(
        assistantToolUse("u1", "upsert_feature_row", {
          feature_id: "f1",
          per_product: {
            "Acme Tasks": { rating: "Yes", justification: "has palette" },
            Linear: { rating: "Yes", justification: "cmd+k works" },
            Jira: { rating: "No", justification: "no palette" },
          },
          sources: [{ url: "https://linear.app/docs", claim: "Linear has command palette" }],
        }),
      )
      .mockResolvedValueOnce(
        assistantToolUse("u2", "upsert_feature_row", {
          feature_id: "f2",
          per_product: {
            "Acme Tasks": { rating: "Maybe", justification: "planned" },
            Linear: { rating: "No", justification: "not offered" },
            Jira: { rating: "No", justification: "not offered" },
          },
          sources: [{ url: "https://acme.com/roadmap", claim: "Acme has planned AI recaps" }],
        }),
      )
      .mockResolvedValueOnce(
        assistantToolUse("u3", "finalize_table", {
          summary: "Acme matches Linear on palette but uniquely offers AI recaps.",
        }),
      )
      .mockResolvedValueOnce(assistantEndTurn());

    const events: AnalysisEvent[] = [];
    const { unsubscribe } = subscribe("t-session", (e) => events.push(e));

    const result = await runAnalyst({ sessionId: "t-session", scope });

    unsubscribe();
    clearStream("t-session");

    expect(result.summary).toContain("Acme");
    expect(result.committedFeatureIds).toEqual(["f1", "f2"]);

    const rowEvents = events.filter((e) => e.type === "row");
    expect(rowEvents).toHaveLength(2);
    expect(rowEvents[0]?.type === "row" && rowEvents[0].feature.id).toBe("f1");
    expect(rowEvents[0]?.type === "row" && rowEvents[0].ratings.Jira).toBe("No");
    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent?.type === "done" && doneEvent.summary).toContain("Acme");

    expect(createMock).toHaveBeenCalledTimes(4);
  });

  it("downgrades all ratings to Cannot Verify when no sources verify", async () => {
    const scope = {
      userProductName: "Acme",
      products: ["Linear"],
      targetCustomer: "pm",
      features: [
        {
          id: "f1",
          name: "Dark mode",
          description: "dark ui",
          customerBenefit: "eye comfort at night",
          category: "must-have" as const,
        },
      ],
    };

    createMock
      .mockResolvedValueOnce(
        assistantToolUse("u1", "upsert_feature_row", {
          feature_id: "f1",
          per_product: {
            Acme: { rating: "Yes", justification: "we have it" },
            Linear: { rating: "Yes", justification: "seen in blog" },
          },
          sources: [{ url: "ftp://unverified", claim: "some blog mentioned it" }],
        }),
      )
      .mockResolvedValueOnce(
        assistantToolUse("u2", "finalize_table", { summary: "both have dark mode" }),
      )
      .mockResolvedValueOnce(assistantEndTurn());

    const events: AnalysisEvent[] = [];
    const { unsubscribe } = subscribe("t-session-2", (e) => events.push(e));

    await runAnalyst({ sessionId: "t-session-2", scope });
    unsubscribe();
    clearStream("t-session-2");

    const row = events.find((e) => e.type === "row");
    expect(row?.type === "row" && row.ratings.Acme).toBe("Cannot Verify");
    expect(row?.type === "row" && row.ratings.Linear).toBe("Cannot Verify");
  });
});

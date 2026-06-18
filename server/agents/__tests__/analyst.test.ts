import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalysisEvent } from "../event-bus";

const createMock = vi.fn();
const parseMock = vi.fn();

vi.mock("../../lib/anthropic", () => ({
  getAnthropicClient: () => ({
    messages: { create: createMock, parse: parseMock },
  }),
  MODELS: {
    analyst: "claude-sonnet-4-6",
    verifier: "claude-haiku-4-5",
    proposer: "claude-sonnet-4-6",
  },
}));

vi.mock("../verifier", () => ({
  verifySource: vi.fn(async (args: { url: string }) => ({
    verdict: args.url.startsWith("https://") ? ("verified" as const) : ("cannot_verify" as const),
    note: "ok",
  })),
}));

const { runAnalyst } = await import("../analyst");
const { clearStream, subscribe } = await import("../event-bus");

function upsertToolUseResponse(id: string, input: unknown) {
  return {
    stop_reason: "tool_use",
    content: [
      {
        type: "tool_use",
        id,
        name: "upsert_feature_row",
        input,
      },
    ],
    usage: { input_tokens: 100, output_tokens: 50 },
  } as const;
}

function textResponse(text: string) {
  return {
    stop_reason: "end_turn",
    content: [{ type: "text", text }],
    usage: { input_tokens: 100, output_tokens: 50 },
  } as const;
}

describe("analyst coordinator", () => {
  beforeEach(() => {
    createMock.mockReset();
    parseMock.mockReset();
  });

  it("runs pre-pass, fans out per feature, emits a row each, and finalizes with a summary", async () => {
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

    // Phase A: pre-pass (messages.parse)
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        products: [
          { product: "Linear", sources: [{ url: "https://linear.app", purpose: "marketing" }] },
          { product: "Jira", sources: [{ url: "https://atlassian.com/software/jira", purpose: "marketing" }] },
          { product: "Acme Tasks", sources: [{ url: "https://acme.com", purpose: "marketing" }] },
        ],
      },
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    // Phase B: two feature-analyst calls (one per feature) + Phase C: summary call
    createMock
      .mockResolvedValueOnce(
        upsertToolUseResponse("u1", {
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
        upsertToolUseResponse("u2", {
          feature_id: "f2",
          per_product: {
            "Acme Tasks": { rating: "Maybe", justification: "planned" },
            Linear: { rating: "No", justification: "not offered" },
            Jira: { rating: "No", justification: "not offered" },
          },
          sources: [{ url: "https://acme.com/roadmap", claim: "Acme has planned AI recaps" }],
        }),
      )
      .mockResolvedValueOnce(textResponse("Acme matches Linear on palette but uniquely offers AI recaps."));

    const events: AnalysisEvent[] = [];
    const { unsubscribe } = subscribe("t-session", (e) => events.push(e));

    const result = await runAnalyst({ sessionId: "t-session", scope });

    unsubscribe();
    clearStream("t-session");

    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(3); // 2 feature loops + 1 summary

    expect(result.committedFeatureIds.sort()).toEqual(["f1", "f2"]);
    expect(result.summary).toContain("Acme");

    const rowEvents = events.filter((e) => e.type === "row");
    expect(rowEvents).toHaveLength(2);
    const byId = Object.fromEntries(
      rowEvents.map((e) => [e.type === "row" ? e.feature.id : "", e]),
    );
    expect(byId.f1?.type === "row" && byId.f1.ratings.Jira).toBe("No");
    expect(byId.f2?.type === "row" && byId.f2.ratings["Acme Tasks"]).toBe("Maybe");

    const done = events.find((e) => e.type === "done");
    expect(done?.type === "done" && done.summary).toContain("Acme");
  });

  it("publishes a Cannot Verify fallback row when a single feature fails and still finalizes", async () => {
    const scope = {
      userProductName: null,
      products: ["Linear", "Jira"],
      targetCustomer: "pm",
      features: [
        {
          id: "f1",
          name: "Dark mode",
          description: "dark ui",
          customerBenefit: "eye comfort at night",
          category: "must-have" as const,
        },
        {
          id: "f2",
          name: "API access",
          description: "rest api",
          customerBenefit: "automation",
          category: "performance" as const,
        },
      ],
    };

    // Pre-pass returns nothing useful (also tests the empty-map path)
    parseMock.mockResolvedValueOnce({
      parsed_output: { products: [] },
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    // Feature f1 fails outright; feature f2 commits; then summary call
    createMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(
        upsertToolUseResponse("u2", {
          feature_id: "f2",
          per_product: {
            Linear: { rating: "High", justification: "full rest api" },
            Jira: { rating: "Medium", justification: "limited rest api" },
          },
          sources: [{ url: "https://linear.app/developers", claim: "Linear has a REST API" }],
        }),
      )
      .mockResolvedValueOnce(textResponse("Linear leads on API; dark mode unverified."));

    const events: AnalysisEvent[] = [];
    const { unsubscribe } = subscribe("t-session-2", (e) => events.push(e));

    const result = await runAnalyst({ sessionId: "t-session-2", scope });

    unsubscribe();
    clearStream("t-session-2");

    expect(result.committedFeatureIds).toEqual(["f2"]);

    const rowEvents = events.filter((e) => e.type === "row");
    expect(rowEvents).toHaveLength(2);

    const f1Row = rowEvents.find((e) => e.type === "row" && e.feature.id === "f1");
    expect(f1Row?.type === "row" && f1Row.ratings.Linear).toBe("Cannot Verify");
    expect(f1Row?.type === "row" && f1Row.sources).toEqual([]);

    const f2Row = rowEvents.find((e) => e.type === "row" && e.feature.id === "f2");
    expect(f2Row?.type === "row" && f2Row.ratings.Linear).toBe("High");

    const done = events.find((e) => e.type === "done");
    expect(done?.type === "done" && done.summary.length).toBeGreaterThan(0);
  });

  it("downgrades ratings to Cannot Verify when no source verifies", async () => {
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

    parseMock.mockResolvedValueOnce({
      parsed_output: { products: [] },
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    createMock
      .mockResolvedValueOnce(
        upsertToolUseResponse("u1", {
          feature_id: "f1",
          per_product: {
            Acme: { rating: "Yes", justification: "we have it" },
            Linear: { rating: "Yes", justification: "seen in blog" },
          },
          sources: [{ url: "ftp://unverified", claim: "some blog mentioned it" }],
        }),
      )
      .mockResolvedValueOnce(textResponse("both have dark mode"));

    const events: AnalysisEvent[] = [];
    const { unsubscribe } = subscribe("t-session-3", (e) => events.push(e));

    await runAnalyst({ sessionId: "t-session-3", scope });

    unsubscribe();
    clearStream("t-session-3");

    const row = events.find((e) => e.type === "row");
    expect(row?.type === "row" && row.ratings.Acme).toBe("Cannot Verify");
    expect(row?.type === "row" && row.ratings.Linear).toBe("Cannot Verify");
  });
});

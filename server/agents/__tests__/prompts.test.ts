import { describe, expect, it } from "vitest";

import { buildAnalystKickoff, buildScopeProposalPrompt, buildSystemBlocks } from "../prompts";

describe("prompts", () => {
  it("buildSystemBlocks returns two text blocks, the second cache-controlled with the methodology", () => {
    const blocks = buildSystemBlocks();
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.type).toBe("text");
    expect(blocks[0]?.text).toContain("THREE CATEGORIES ONLY");
    expect(blocks[1]?.type).toBe("text");
    expect(blocks[1]?.cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[1]?.text).toContain("<methodology>");
    expect(blocks[1]?.text).toContain("Kano");
  });

  it("buildSystemBlocks is stable across calls (byte-for-byte) so prompt cache hits", () => {
    const a = buildSystemBlocks();
    const b = buildSystemBlocks();
    expect(a[1]?.text).toBe(b[1]?.text);
    expect(a[0]?.text).toBe(b[0]?.text);
  });

  it("buildScopeProposalPrompt embeds the user context", () => {
    const p = buildScopeProposalPrompt({
      userProductName: "Acme Tasks",
      userProductDescription: "a task tracker for engineering leads",
      targetCustomerHint: "engineering leads",
      competitorHints: ["Linear", "Jira"],
    });
    expect(p).toContain("Acme Tasks");
    expect(p).toContain("engineering leads");
    expect(p).toContain("Linear, Jira");
    expect(p).toContain("3 to 5");
    expect(p).toContain("8 to 12");
  });

  it("buildAnalystKickoff lists every feature and product with Kano constraints", () => {
    const kick = buildAnalystKickoff({
      userProductName: "Acme Tasks",
      products: ["Linear", "Jira"],
      targetCustomer: "eng leads",
      features: [
        {
          id: "f1",
          name: "Fast search",
          description: "find anything",
          customerBenefit: "saves time",
          category: "must-have",
        },
        {
          id: "f2",
          name: "AI summaries",
          description: "auto recaps",
          customerBenefit: "fewer status meetings",
          category: "delighter",
        },
      ],
    });
    expect(kick).toContain("Linear | Jira");
    expect(kick).toContain("f1");
    expect(kick).toContain("f2");
    expect(kick).toContain("upsert_feature_row");
    expect(kick).toContain("finalize_table");
    expect(kick).toContain("Cannot Verify");
  });
});

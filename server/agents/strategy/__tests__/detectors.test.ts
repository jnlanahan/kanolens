import { describe, expect, it } from "vitest";

import type { ScopeJson, TableJson } from "../../../db/schema";
import { detectSignals, mustHaveCoverage } from "../detectors";

type Category = ScopeJson["features"][number]["category"];

function feat(id: string, name: string, category: Category) {
  return { id, name, description: "", customerBenefit: "", category };
}

function mkTable(args: {
  products: string[];
  features: { id: string; name: string; category: Category }[];
  ratings: Record<string, Record<string, string>>;
  confidence?: Record<string, Record<string, "high" | "medium" | "low">>;
}): TableJson {
  return {
    products: args.products,
    features: args.features.map((f) => feat(f.id, f.name, f.category)),
    ratings: args.ratings,
    justifications: {},
    confidence: args.confidence,
    summary: "",
  };
}

describe("strategy detectors", () => {
  it("flags a verifiably missing must-have as the top, high-severity signal", () => {
    const table = mkTable({
      products: ["Linear", "Jira", "Asana", "Nucleus"],
      features: [
        { id: "mh", name: "Mobile app", category: "must-have" },
        { id: "del", name: "AI recaps", category: "delighter" },
      ],
      ratings: {
        mh: { Linear: "Yes", Jira: "Yes", Asana: "Yes", Nucleus: "No" },
        del: { Linear: "Yes", Jira: "Yes", Asana: "Yes", Nucleus: "Yes" },
      },
    });

    const signals = detectSignals(table, "Nucleus");
    const top = signals[0]!;
    expect(top.kind).toBe("missing_musthave");
    expect(top.featureIds).toEqual(["mh"]);
    expect(top.severity).toBeGreaterThanOrEqual(0.85);
    // It must outrank the commoditizing delighter that also fires.
    const commod = signals.find((s) => s.kind === "commoditizing_delighter");
    expect(commod).toBeDefined();
    expect(top.severity).toBeGreaterThan(commod!.severity);
  });

  it("never turns a competitor's Cannot Verify into a competitive edge", () => {
    const table = mkTable({
      products: ["Rival", "Nucleus"],
      features: [{ id: "mh", name: "SSO", category: "must-have" }],
      // User has it; the rival is unknown (data gap) — NOT a verified absence.
      ratings: { mh: { Rival: "Cannot Verify", Nucleus: "Yes" } },
    });

    const signals = detectSignals(table, "Nucleus");
    expect(signals.find((s) => s.kind === "musthave_edge")).toBeUndefined();
  });

  it("does produce an edge only from a VERIFIED rival absence", () => {
    const table = mkTable({
      products: ["RivalA", "RivalB", "Nucleus"],
      features: [{ id: "mh", name: "SSO", category: "must-have" }],
      ratings: { mh: { RivalA: "Yes", RivalB: "No", Nucleus: "Yes" } },
    });
    const signals = detectSignals(table, "Nucleus");
    const edge = signals.find((s) => s.kind === "musthave_edge");
    expect(edge).toBeDefined();
    expect(edge!.products).toEqual(["RivalB"]);
  });

  it("treats an unknown user must-have as a data gap, not a settled gap", () => {
    const table = mkTable({
      products: ["Linear", "Jira", "Nucleus"],
      features: [{ id: "mh", name: "Audit log", category: "must-have" }],
      ratings: { mh: { Linear: "Yes", Jira: "Yes", Nucleus: "Cannot Verify" } },
    });
    const signals = detectSignals(table, "Nucleus");
    expect(signals.find((s) => s.kind === "missing_musthave")).toBeUndefined();
    const unver = signals.find((s) => s.kind === "unverified_musthave");
    expect(unver).toBeDefined();
    expect(unver!.confidence).toBe("low");
  });

  it("flags a 'must-have' that few competitors confirm as mis-categorized", () => {
    const table = mkTable({
      products: ["A", "B", "C", "D", "E", "Nucleus"],
      features: [{ id: "mh", name: "Niche thing", category: "must-have" }],
      // Only 1 of 5 competitors confirms — not really a must-have.
      ratings: {
        mh: { A: "Yes", B: "No", C: "No", D: "Cannot Verify", E: "No", Nucleus: "No" },
      },
    });
    const signals = detectSignals(table, "Nucleus");
    expect(signals.find((s) => s.kind === "weak_musthave_category")).toBeDefined();
    // And because it's shaky, it must NOT be reported as a missing must-have.
    expect(signals.find((s) => s.kind === "missing_musthave")).toBeUndefined();
  });

  it("detects unique delighters and single-competitor white space", () => {
    const table = mkTable({
      products: ["Linear", "Jira", "Nucleus"],
      features: [
        { id: "u", name: "Voice mode", category: "delighter" },
        { id: "w", name: "Gantt view", category: "delighter" },
      ],
      ratings: {
        u: { Linear: "No", Jira: "No", Nucleus: "Yes" }, // unique to user
        w: { Linear: "Yes", Jira: "No", Nucleus: "No" }, // only one rival has it
      },
    });
    const signals = detectSignals(table, "Nucleus");
    expect(signals.find((s) => s.kind === "unique_delighter")?.featureIds).toEqual(["u"]);
    const steal = signals.find((s) => s.kind === "single_competitor_delighter");
    expect(steal?.featureIds).toEqual(["w"]);
    expect(steal?.products).toEqual(["Linear"]);
  });

  it("flags open performance territory when nobody leads", () => {
    const table = mkTable({
      products: ["Linear", "Jira", "Nucleus"],
      features: [{ id: "p", name: "Forecasting accuracy", category: "performance" }],
      ratings: { p: { Linear: "Medium", Jira: "Low", Nucleus: "Medium" } },
    });
    const signals = detectSignals(table, "Nucleus");
    expect(signals.find((s) => s.kind === "perf_open_high")).toBeDefined();
  });

  it("computes must-have coverage, excluding shaky must-haves", () => {
    const table = mkTable({
      products: ["A", "B", "Nucleus"],
      features: [
        { id: "m1", name: "Real must-have 1", category: "must-have" },
        { id: "m2", name: "Real must-have 2", category: "must-have" },
        { id: "m3", name: "Shaky must-have", category: "must-have" },
      ],
      ratings: {
        m1: { A: "Yes", B: "Yes", Nucleus: "Yes" }, // held
        m2: { A: "Yes", B: "Yes", Nucleus: "No" }, // missing
        m3: { A: "No", B: "No", Nucleus: "No" }, // shaky → excluded
      },
    });
    const cov = mustHaveCoverage(table, "Nucleus");
    expect(cov.total).toBe(2);
    expect(cov.held).toBe(1);
    expect(cov.missing).toEqual(["Real must-have 2"]);
  });
});

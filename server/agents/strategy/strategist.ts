import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { Strategy, StrategyInsight, StrategyInsightType, TableJson } from "../../db/schema";
import { getAnthropicClient, MODELS } from "../../lib/anthropic";
import { buildStrategyPrompt, buildSystemBlocks } from "../prompts";
import { detectSignals, mustHaveCoverage, type CandidateSignal, type SignalKind } from "./detectors";

const InsightOutSchema = z.object({
  type: z.enum(["gap", "opportunity", "risk", "strength", "concede"]),
  title: z.string(),
  rationale: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  confidence: z.enum(["high", "medium", "low"]),
  affectedFeatureIds: z.array(z.string()),
  needsValidation: z.boolean(),
  validationQuery: z.string(),
});

const StrategyOutSchema = z.object({
  headline: z.string().describe("the 2-4 sentence strategic read"),
  insights: z.array(InsightOutSchema).max(12).describe("ranked most-important-first"),
});

export interface GenerateStrategyResult {
  strategy: Strategy;
  /** Insights the strategist flagged for outside validation (used by the paid validation loop). */
  validationCandidates: { id: string; query: string }[];
  inputTokens: number;
  outputTokens: number;
}

export async function generateStrategy(args: {
  scope: { userProductName: string | null; products: string[]; targetCustomer: string };
  table: TableJson;
}): Promise<GenerateStrategyResult> {
  const candidates = detectSignals(args.table, args.scope.userProductName);
  const coverage = mustHaveCoverage(args.table, args.scope.userProductName);

  const client = getAnthropicClient();
  try {
    const response = await client.messages.parse({
      model: MODELS.analyst,
      max_tokens: 2000,
      system: buildSystemBlocks(),
      messages: [
        {
          role: "user",
          content: buildStrategyPrompt({ scope: args.scope, table: args.table, candidates, coverage }),
        },
      ],
      output_config: { format: zodOutputFormat(StrategyOutSchema) },
    });

    if (response.parsed_output) {
      const out = response.parsed_output;
      const insights: StrategyInsight[] = [];
      const validationCandidates: { id: string; query: string }[] = [];
      out.insights.forEach((ins, i) => {
        const id = `s-${i}`;
        insights.push({
          id,
          type: ins.type,
          title: ins.title,
          rationale: ins.rationale,
          priority: ins.priority,
          confidence: ins.confidence,
          affectedFeatureIds: ins.affectedFeatureIds,
        });
        if (ins.needsValidation && ins.validationQuery.trim()) {
          validationCandidates.push({ id, query: ins.validationQuery.trim() });
        }
      });
      return {
        strategy: {
          headline: out.headline,
          insights,
          mustHaveCoverage: coverage.total > 0 ? coverage : undefined,
        },
        validationCandidates,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    }
  } catch (error) {
    console.warn("[strategist] synthesis failed, using deterministic fallback:", error);
  }

  // Always produce something usable, straight from the structural signals.
  return {
    strategy: fallbackStrategy(candidates, coverage),
    validationCandidates: [],
    inputTokens: 0,
    outputTokens: 0,
  };
}

// ─── Deterministic fallback ──────────────────────────────────────────────────────

const KIND_TO_TYPE: Record<SignalKind, StrategyInsightType> = {
  missing_musthave: "gap",
  unverified_musthave: "gap",
  weak_musthave_category: "risk",
  musthave_edge: "strength",
  musthave_parity_met: "strength",
  perf_open_high: "opportunity",
  perf_behind: "gap",
  perf_lead: "strength",
  perf_table_stakes: "risk",
  unique_delighter: "strength",
  single_competitor_delighter: "opportunity",
  commoditizing_delighter: "risk",
};

const KIND_TO_TITLE: Record<SignalKind, string> = {
  missing_musthave: "Missing must-have",
  unverified_musthave: "Unverified must-have",
  weak_musthave_category: "Possible mis-categorization",
  musthave_edge: "Baseline edge",
  musthave_parity_met: "Table stakes met",
  perf_open_high: "Open performance territory",
  perf_behind: "Performance gap",
  perf_lead: "Performance leadership",
  perf_table_stakes: "Trending to table stakes",
  unique_delighter: "Unique delighter",
  single_competitor_delighter: "White space",
  commoditizing_delighter: "Fading delighter",
};

function severityToPriority(sev: number): StrategyInsight["priority"] {
  if (sev >= 0.8) return "critical";
  if (sev >= 0.55) return "high";
  if (sev >= 0.35) return "medium";
  return "low";
}

function fallbackStrategy(
  candidates: CandidateSignal[],
  coverage: ReturnType<typeof mustHaveCoverage>,
): Strategy {
  const insights: StrategyInsight[] = candidates
    .filter((c) => c.kind !== "musthave_parity_met")
    .slice(0, 8)
    .map((c, i) => ({
      id: `s-${i}`,
      type: KIND_TO_TYPE[c.kind],
      title: KIND_TO_TITLE[c.kind],
      rationale: c.evidence,
      priority: severityToPriority(c.severity),
      confidence: c.confidence,
      affectedFeatureIds: c.featureIds,
    }));

  const headline =
    coverage.total > 0
      ? `Holds ${coverage.held}/${coverage.total} baseline must-haves${coverage.missing.length ? `; verifiably missing ${coverage.missing.join(", ")}` : ""}. ${insights[0]?.rationale ?? ""}`.trim()
      : insights[0]?.rationale ?? "See the table for competitive positioning.";

  return {
    headline,
    insights,
    mustHaveCoverage: coverage.total > 0 ? coverage : undefined,
  };
}

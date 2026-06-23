import type Anthropic from "@anthropic-ai/sdk";

import type { Strategy, StrategyInsight } from "../../db/schema";
import { getAnthropicClient, MODELS } from "../../lib/anthropic";
import { publish } from "../event-bus";

export type Verdict = "confirmed" | "refuted" | "unproven";

const MAX_HYPOTHESES = 3;

const SYSTEM = `You validate a strategic hypothesis about a competitive product market using web search.
ADVERSARIALLY TRY TO REFUTE it — look for evidence it is wrong, not just evidence it is right.
Use web_search to gather evidence, then return ONLY a JSON object:
{"verdict":"confirmed"|"refuted"|"unproven","note":"<=20 word justification"}
- confirmed: solid evidence supports the hypothesis.
- refuted: evidence contradicts it.
- unproven: not enough evidence either way.
Default to "unproven" when the evidence is thin. Output ONLY the JSON.`;

const TOOLS: Anthropic.Messages.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 2 },
];

async function validateHypothesis(
  hypothesis: string,
  query: string,
): Promise<{ verdict: Verdict; note: string; inputTokens: number; outputTokens: number }> {
  const client = getAnthropicClient();
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: `Hypothesis: ${hypothesis}\nResearch query: ${query}\n\nResearch it and return the JSON verdict.` },
  ];

  let totalInput = 0;
  let totalOutput = 0;
  let text = "";
  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: MODELS.analyst,
      max_tokens: 700,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });
    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;
    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason === "pause_turn") continue; // web_search runs server-side
    text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    break;
  }

  let verdict: Verdict = "unproven";
  let note = "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? text) as { verdict?: string; note?: string };
    if (parsed.verdict === "confirmed" || parsed.verdict === "refuted" || parsed.verdict === "unproven") {
      verdict = parsed.verdict;
    }
    note = String(parsed.note ?? "").slice(0, 200);
  } catch {
    // leave default "unproven"
  }
  return { verdict, note, inputTokens: totalInput, outputTokens: totalOutput };
}

/**
 * Validate the strategist's top flagged hypotheses against the web (paid runs only).
 * Attaches a verdict to each matching insight; a refuted opportunity/strength is demoted
 * to "concede". Bounded to the top few hypotheses.
 */
export async function validateStrategy(args: {
  sessionId: string;
  strategy: Strategy;
  candidates: { id: string; query: string }[];
}): Promise<{ strategy: Strategy; inputTokens: number; outputTokens: number }> {
  const { sessionId, strategy, candidates } = args;
  const byId = new Map(strategy.insights.map((ins) => [ins.id, ins]));
  const top = candidates.filter((c) => byId.has(c.id)).slice(0, MAX_HYPOTHESES);
  if (top.length === 0) return { strategy, inputTokens: 0, outputTokens: 0 };

  let totalInput = 0;
  let totalOutput = 0;

  const results = await Promise.all(
    top.map(async (c) => {
      const insight = byId.get(c.id)!;
      publish(sessionId, { type: "narration", text: `Validating: ${insight.title}…` });
      try {
        const r = await validateHypothesis(`${insight.title} — ${insight.rationale}`, c.query);
        return { id: c.id, verdict: r.verdict, note: r.note, inputTokens: r.inputTokens, outputTokens: r.outputTokens };
      } catch {
        return { id: c.id, verdict: "unproven" as Verdict, note: "validation error", inputTokens: 0, outputTokens: 0 };
      }
    }),
  );

  const insights: StrategyInsight[] = strategy.insights.map((ins) => {
    const res = results.find((r) => r.id === ins.id);
    if (!res) return ins;
    totalInput += res.inputTokens;
    totalOutput += res.outputTokens;
    const validated: StrategyInsight = { ...ins, validation: { verdict: res.verdict, note: res.note } };
    // A refuted opening or strength isn't worth pursuing — demote it.
    if (res.verdict === "refuted" && (ins.type === "opportunity" || ins.type === "strength")) {
      validated.type = "concede";
      validated.priority = "low";
    }
    return validated;
  });

  return { strategy: { ...strategy, insights }, inputTokens: totalInput, outputTokens: totalOutput };
}

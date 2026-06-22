import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { getAnthropicClient, MODELS } from "../lib/anthropic";
import { buildScopeProposalPrompt, buildSystemBlocks, type ScopeProposalContext } from "./prompts";

const KanoCategoryEnum = z.enum(["must-have", "performance", "delighter"]);

/** Product names must be the bare name only. Models sometimes append a parenthetical
 *  positioning note ("Onebrief (AI planning, NATO focus)") which then breaks the table
 *  header. Strip any trailing "(...)" / "[...]" and clamp length defensively. */
function cleanProductName(raw: string): string {
  return raw
    .replace(/\s*[([].*$/s, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

const FeatureProposalSchema = z.object({
  id: z.string().describe("kebab-case slug, unique within the scope"),
  name: z
    .string()
    .describe(
      "benefit phrasing (what the customer gets), 4–10 words — NOT a raw feature name",
    ),
  description: z.string().describe("one-sentence elaboration of the benefit"),
  customerBenefit: z
    .string()
    .describe("the concrete benefit the customer experiences, one sentence"),
  category: KanoCategoryEnum.describe("Kano category assignment"),
});

const ScopeProposalSchema = z.object({
  targetCustomer: z
    .string()
    .describe("the primary customer segment this analysis will focus on"),
  products: z
    .array(z.string().transform(cleanProductName))
    .min(3)
    .max(5)
    .describe(
      '3–5 directly comparable competitor products. Use the exact product NAME ONLY — no parenthetical descriptions, taglines, or positioning notes (e.g. "Onebrief", not "Onebrief (AI planning, NATO focus)").',
    ),
  features: z
    .array(FeatureProposalSchema)
    .min(8)
    .max(12)
    .describe("8–12 features/benefits spanning all three Kano categories"),
  rationale: z
    .string()
    .describe("≤3 sentences explaining why these products and features were chosen"),
  suggestedAdditionalCompetitors: z
    .array(z.string().transform(cleanProductName))
    .min(0)
    .max(3)
    .optional()
    .default([])
    .describe("2–3 additional competitor names (name only, no parentheticals) the user may not have thought of, based on the product space. Omit any already in products."),
});

export type ScopeProposal = z.infer<typeof ScopeProposalSchema>;

export interface ProposeScopeResult {
  proposal: ScopeProposal;
  inputTokens: number;
  outputTokens: number;
}

export async function proposeScope(ctx: ScopeProposalContext): Promise<ProposeScopeResult> {
  const client = getAnthropicClient();
  const response = await client.messages.parse({
    model: MODELS.proposer,
    max_tokens: 4096,
    system: buildSystemBlocks(),
    messages: [{ role: "user", content: buildScopeProposalPrompt(ctx) }],
    output_config: { format: zodOutputFormat(ScopeProposalSchema) },
  });

  if (!response.parsed_output) {
    throw new Error(
      `Scope proposer returned no structured output. stop_reason=${response.stop_reason}`,
    );
  }
  return {
    proposal: response.parsed_output,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

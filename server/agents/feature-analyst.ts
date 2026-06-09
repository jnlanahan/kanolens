import type Anthropic from "@anthropic-ai/sdk";

import { getAnthropicClient, MODELS } from "../lib/anthropic";
import { publish } from "./event-bus";
import {
  buildFeatureAnalystKickoff,
  buildSystemBlocks,
  type PrimarySourceMap,
} from "./prompts";
import { verifySource } from "./verifier";

export interface FeatureScope {
  userProductName: string | null;
  products: string[];
  targetCustomer: string;
}

export interface FeatureDescriptor {
  id: string;
  name: string;
  description: string;
  customerBenefit: string;
  category: "must-have" | "performance" | "delighter";
}

export interface FeatureAnalystResult {
  featureId: string;
  committed: boolean;
  ratings: Record<string, string>;
  justifications: Record<string, string>;
  sources: string[];
  inputTokens: number;
  outputTokens: number;
}

type UpsertResult = Omit<FeatureAnalystResult, "inputTokens" | "outputTokens">;

type UpsertInput = {
  feature_id: string;
  per_product: Record<string, { rating: string; justification: string }>;
  sources: { url: string; claim: string }[];
};

const TOOLS: Anthropic.Messages.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 4 },
  {
    name: "upsert_feature_row",
    description:
      "Commit the ratings + justifications + sources for THIS feature across all products. Call this EXACTLY ONCE, then stop.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        feature_id: {
          type: "string",
          description: "The id of the feature being rated (must match the scope).",
        },
        per_product: {
          type: "object",
          description:
            "Map of product name -> { rating, justification }. Must include every product in the scope.",
          additionalProperties: {
            type: "object",
            additionalProperties: false,
            properties: {
              rating: {
                type: "string",
                description:
                  'Must-Have / Delighter: "Yes" | "Maybe" | "No" | "Cannot Verify". Performance: "High" | "Medium" | "Low" | "Maybe High" | "Maybe Medium" | "Maybe Low" | "Cannot Verify".',
              },
              justification: {
                type: "string",
                description: "one-sentence rationale for this rating",
              },
            },
            required: ["rating", "justification"],
          },
        },
        sources: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              url: { type: "string" },
              claim: {
                type: "string",
                description: "the specific claim this URL backs",
              },
            },
            required: ["url", "claim"],
          },
          description:
            "Source URLs for the ratings. If you have no primary-source URLs, leave empty — ratings with no sources will be downgraded to Cannot Verify server-side.",
        },
      },
      required: ["feature_id", "per_product", "sources"],
    },
  },
];

const MAX_ITERATIONS = 8;

export async function runFeatureAnalyst(args: {
  sessionId: string;
  scope: FeatureScope;
  feature: FeatureDescriptor;
  siblingFeatureNames: string[];
  primarySources: PrimarySourceMap;
}): Promise<FeatureAnalystResult> {
  const { sessionId, scope, feature, siblingFeatureNames, primarySources } = args;
  const client = getAnthropicClient();

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: buildFeatureAnalystKickoff({ scope, feature, siblingFeatureNames, primarySources }),
    },
  ];

  let captured: UpsertResult | null = null;
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODELS.analyst,
      max_tokens: 8000,
      system: buildSystemBlocks(),
      tools: TOOLS,
      messages,
    });

    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      break;
    }

    if (response.stop_reason === "pause_turn") {
      continue;
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) {
      throw new Error(
        `Feature analyst produced no tool calls (feature=${feature.id}, stop_reason=${response.stop_reason})`,
      );
    }

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tool of toolUses) {
      if (tool.name === "upsert_feature_row") {
        const input = tool.input as UpsertInput;
        const outcome = await handleUpsert({ sessionId, input, scope, feature });
        captured = outcome.result;
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: outcome.message,
          is_error: outcome.isError,
        });
      } else {
        // web_search is server-side; no manual handling
        continue;
      }
    }

    if (captured) break;
    if (toolResults.length === 0) continue;
    messages.push({ role: "user", content: toolResults });
  }

  if (!captured) {
    throw new Error(`Feature analyst finished without committing feature=${feature.id}`);
  }

  return { ...captured, inputTokens: totalInput, outputTokens: totalOutput };
}

async function handleUpsert(args: {
  sessionId: string;
  input: UpsertInput;
  scope: FeatureScope;
  feature: FeatureDescriptor;
}): Promise<{ result: UpsertResult | null; message: string; isError: boolean }> {
  const { sessionId, input, scope, feature } = args;

  if (input.feature_id !== feature.id) {
    return {
      result: null,
      isError: true,
      message: `Expected feature_id "${feature.id}", got "${input.feature_id}". Retry with the correct id.`,
    };
  }

  const verdicts = await Promise.all(
    input.sources.map(async (s) => {
      try {
        const v = await verifySource({
          claim: s.claim,
          url: s.url,
          product: scope.userProductName ?? "(market analysis)",
        });
        return { url: s.url, ...v };
      } catch {
        return { url: s.url, verdict: "cannot_verify" as const, note: "verifier error" };
      }
    }),
  );
  const anyVerified = verdicts.some((v) => v.verdict === "verified");
  const anyMaybe = verdicts.some((v) => v.verdict === "maybe");

  const ratings: Record<string, string> = {};
  const justifications: Record<string, string> = {};
  const allProducts = scope.userProductName
    ? [...scope.products, scope.userProductName]
    : scope.products;
  for (const product of allProducts) {
    const row = input.per_product[product];
    if (!row) {
      ratings[product] = "Cannot Verify";
      justifications[product] = "not provided by analyst";
      continue;
    }
    if (!anyVerified && !anyMaybe) {
      ratings[product] = "Cannot Verify";
      justifications[product] = row.justification;
    } else {
      ratings[product] = row.rating;
      justifications[product] = row.justification;
    }
  }

  const sourceUrls = input.sources.map((s) => s.url);
  publish(sessionId, {
    type: "row",
    feature: {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      customerBenefit: feature.customerBenefit,
      category: feature.category,
    },
    ratings,
    justifications,
    sources: sourceUrls,
  });

  return {
    result: {
      featureId: feature.id,
      committed: true,
      ratings,
      justifications,
      sources: sourceUrls,
    },
    isError: false,
    message: `row committed. verifier: ${verdicts.map((v) => v.verdict).join("/")}`,
  };
}

import type Anthropic from "@anthropic-ai/sdk";

import { getAnthropicClient, MODELS } from "../lib/anthropic";
import { publish } from "./event-bus";
import { buildAnalystKickoff, buildSystemBlocks } from "./prompts";
import { verifySource } from "./verifier";

export interface AnalystScope {
  userProductName: string;
  products: string[];
  targetCustomer: string;
  features: {
    id: string;
    name: string;
    description: string;
    customerBenefit: string;
    category: "must-have" | "performance" | "delighter";
  }[];
}

const TOOLS: Anthropic.Messages.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 12 },
  {
    name: "upsert_feature_row",
    description:
      "Commit the ratings + justifications + sources for one feature across all products. Call this ONCE per feature, in order. Emits a live row event to the user's UI.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        feature_id: {
          type: "string",
          description: "The id of the feature from the scope",
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
            "Source URLs for the ratings above. If you have no primary-source URLs, leave empty — ratings with no sources will be downgraded to Cannot Verify server-side.",
        },
      },
      required: ["feature_id", "per_product", "sources"],
    },
  },
  {
    name: "finalize_table",
    description:
      "Call this EXACTLY ONCE after every feature has been upserted, to close out the analysis. The UI navigates to the report view on this call.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: {
          type: "string",
          description:
            "≤2-sentence summary of the overall competitive position. No speculation beyond what the table shows.",
        },
      },
      required: ["summary"],
    },
  },
];

type UpsertInput = {
  feature_id: string;
  per_product: Record<string, { rating: string; justification: string }>;
  sources: { url: string; claim: string }[];
};

type FinalizeInput = { summary: string };

export interface AnalystResult {
  summary: string;
  committedFeatureIds: string[];
}

export async function runAnalyst(args: {
  sessionId: string;
  scope: AnalystScope;
}): Promise<AnalystResult> {
  const { sessionId, scope } = args;
  const client = getAnthropicClient();
  const featuresById = new Map(scope.features.map((f) => [f.id, f]));
  const committed = new Set<string>();
  let summary = "";

  publish(sessionId, { type: "status", status: "researching", message: "Starting analysis" });

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: buildAnalystKickoff(scope) },
  ];

  const MAX_ITERATIONS = 40;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODELS.analyst,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: buildSystemBlocks(),
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      if (summary) break;
      throw new Error("Analyst ended without calling finalize_table");
    }

    if (response.stop_reason === "pause_turn") {
      continue;
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) {
      throw new Error(`Analyst produced no tool calls (stop_reason=${response.stop_reason})`);
    }

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tool of toolUses) {
      if (tool.name === "upsert_feature_row") {
        const input = tool.input as UpsertInput;
        const result = await handleUpsert({ sessionId, input, scope, featuresById, committed });
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: result.message,
          is_error: result.isError,
        });
      } else if (tool.name === "finalize_table") {
        const input = tool.input as FinalizeInput;
        summary = input.summary;
        publish(sessionId, { type: "done", summary });
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: "table finalized; session closed",
        });
      } else {
        // web_search / web_fetch are server-side; no manual handling needed.
        continue;
      }
    }

    if (toolResults.length === 0) continue;
    messages.push({ role: "user", content: toolResults });
  }

  if (!summary) throw new Error("Analyst exceeded max iterations without finalizing");
  return { summary, committedFeatureIds: [...committed] };
}

async function handleUpsert(args: {
  sessionId: string;
  input: UpsertInput;
  scope: AnalystScope;
  featuresById: Map<string, AnalystScope["features"][number]>;
  committed: Set<string>;
}): Promise<{ message: string; isError: boolean }> {
  const { sessionId, input, scope, featuresById, committed } = args;
  const feature = featuresById.get(input.feature_id);
  if (!feature) {
    return {
      isError: true,
      message: `Unknown feature_id "${input.feature_id}". Scope features: ${[...featuresById.keys()].join(", ")}`,
    };
  }

  const verdicts = await Promise.all(
    input.sources.map(async (s) => {
      try {
        const v = await verifySource({
          claim: s.claim,
          url: s.url,
          product: scope.userProductName,
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
  for (const product of scope.products.concat(scope.userProductName)) {
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
  committed.add(feature.id);

  return {
    isError: false,
    message: `row committed. verifier: ${verdicts.map((v) => `${v.verdict}`).join("/")}`,
  };
}

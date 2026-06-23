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
  userProductDescription?: string | null;
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
  /** Per-product: true when the rating is the analyst's best estimate (researched but
   *  not backed by a citable source), false when source-verified or an honest unknown. */
  estimated: Record<string, boolean>;
  /** Per-product trust signal: "high" = verified source / first-party, "medium" =
   *  weakly-verified or best-estimate, "low" = could not verify. */
  confidence: Record<string, "high" | "medium" | "low">;
  sources: string[];
  /** Source URL -> the specific claim that URL backs, for showing evidence in the UI. */
  sourceClaims: Record<string, string>;
  inputTokens: number;
  outputTokens: number;
}

type UpsertResult = Omit<FeatureAnalystResult, "inputTokens" | "outputTokens">;

type UpsertInput = {
  feature_id: string;
  per_product: Record<string, { rating: string; justification: string }>;
  sources: { url: string; claim: string; products?: string[] }[];
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
              products: {
                type: "array",
                items: { type: "string" },
                description:
                  "Which product names this source backs. Only those products are credited; others without their own verified source are downgraded to Cannot Verify. Omit only if the source genuinely applies to every product.",
              },
            },
            required: ["url", "claim"],
          },
          description:
            "Source URLs for the ratings. A competitor with no verified source is downgraded to Cannot Verify server-side. The user's own product may instead be rated from the provided <user_product_context> with no URL.",
        },
      },
      required: ["feature_id", "per_product", "sources"],
    },
  },
];

const MAX_ITERATIONS = 10;

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
  let verificationRetried = false;
  let totalInput = 0;
  let totalOutput = 0;

  publish(sessionId, { type: "narration", text: `Researching “${feature.name}”…` });

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
        const outcome = await handleUpsert({ input, scope, feature });
        if (outcome.isError || !outcome.result) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: outcome.message,
            is_error: true,
          });
          continue;
        }

        // Verification feedback loop: if competitors have no verified source, send the
        // analyst back to search once more before committing — rather than silently
        // shipping unverified estimates. Bounded to a single re-search per feature.
        const canReverify =
          !verificationRetried &&
          outcome.ungroundedCompetitors.length > 0 &&
          i < MAX_ITERATIONS - 2;
        if (canReverify) {
          verificationRetried = true;
          publish(sessionId, {
            type: "narration",
            text: `Couldn't confirm ${outcome.ungroundedCompetitors.join(", ")} for “${feature.name}” — searching again…`,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: `Before this row is final: ${outcome.ungroundedCompetitors.join(", ")} have NO verified primary source, so they would ship as unverified estimates. Run 1–2 more targeted web_search queries to find a primary source for each, then call upsert_feature_row again with updated sources. If you still find nothing, commit as-is and they'll be flagged as estimates.`,
            is_error: false,
          });
        } else {
          captured = outcome.result;
          publishRow(sessionId, feature, outcome.result);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: outcome.message,
            is_error: false,
          });
        }
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
  input: UpsertInput;
  scope: FeatureScope;
  feature: FeatureDescriptor;
}): Promise<{
  result: UpsertResult | null;
  message: string;
  isError: boolean;
  ungroundedCompetitors: string[];
}> {
  const { input, scope, feature } = args;

  if (input.feature_id !== feature.id) {
    return {
      result: null,
      isError: true,
      ungroundedCompetitors: [],
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
        return { url: s.url, products: s.products, ...v };
      } catch {
        return {
          url: s.url,
          products: s.products,
          verdict: "cannot_verify" as const,
          note: "verifier error",
        };
      }
    }),
  );

  // A source applies to a product when it lists that product, or lists none (back-compat).
  const sourceApplies = (
    v: { products?: string[] },
    product: string,
  ): boolean => !v.products || v.products.length === 0 || v.products.includes(product);

  // A product is backed if it has its own verified/maybe source.
  const productSupported = (product: string): boolean =>
    verdicts.some(
      (v) => (v.verdict === "verified" || v.verdict === "maybe") && sourceApplies(v, product),
    );

  // The strongest verdict backing a product, used to grade confidence.
  const bestVerdictFor = (product: string): "verified" | "maybe" | null => {
    let best: "verified" | "maybe" | null = null;
    for (const v of verdicts) {
      if (!sourceApplies(v, product)) continue;
      if (v.verdict === "verified") return "verified";
      if (v.verdict === "maybe") best = "maybe";
    }
    return best;
  };

  // The user's own product can be rated from their first-party description (passed
  // to the analyst as <user_product_context>) without an external citation.
  const userDescriptionAvailable =
    Boolean(scope.userProductName) && Boolean(scope.userProductDescription?.trim());

  const ratings: Record<string, string> = {};
  const justifications: Record<string, string> = {};
  const estimated: Record<string, boolean> = {};
  const confidence: Record<string, "high" | "medium" | "low"> = {};
  const allProducts = scope.userProductName
    ? [...scope.products, scope.userProductName]
    : scope.products;
  for (const product of allProducts) {
    const row = input.per_product[product];
    if (!row) {
      ratings[product] = "Cannot Verify";
      justifications[product] = "not provided by analyst";
      estimated[product] = false;
      confidence[product] = "low";
      continue;
    }
    const isUserProduct = scope.userProductName === product;
    const grounded = productSupported(product) || (isUserProduct && userDescriptionAvailable);
    if (grounded) {
      // Source-verified (or the user's own product from its first-party description).
      ratings[product] = row.rating;
      justifications[product] = row.justification;
      estimated[product] = false;
      // A "verified" source or first-party knowledge is high confidence; a "maybe"
      // verdict is only weak corroboration.
      confidence[product] =
        bestVerdictFor(product) === "verified" || (isUserProduct && userDescriptionAvailable)
          ? "high"
          : "medium";
    } else if (!row.rating || row.rating === "Cannot Verify") {
      // The analyst itself had no basis to judge — keep the honest unknown.
      ratings[product] = "Cannot Verify";
      justifications[product] = row.justification;
      estimated[product] = false;
      confidence[product] = "low";
    } else {
      // Researched but no citable source found — keep the best-estimate rating,
      // flagged so the UI shows it as an unverified estimate rather than a fact.
      ratings[product] = row.rating;
      justifications[product] = row.justification;
      estimated[product] = true;
      confidence[product] = "medium";
    }
  }

  const sourceUrls = input.sources.map((s) => s.url);
  const sourceClaims: Record<string, string> = {};
  for (const s of input.sources) {
    if (s.claim?.trim()) sourceClaims[s.url] = s.claim.trim();
  }

  // Competitors (not the user's own product) whose rating is an unverified estimate —
  // these are the cells a re-search could solidify with a primary source.
  const ungroundedCompetitors = allProducts.filter(
    (p) => p !== scope.userProductName && estimated[p] === true,
  );

  return {
    result: {
      featureId: feature.id,
      committed: true,
      ratings,
      justifications,
      estimated,
      confidence,
      sources: sourceUrls,
      sourceClaims,
    },
    ungroundedCompetitors,
    isError: false,
    message: `row computed. verifier: ${verdicts.map((v) => v.verdict).join("/")}`,
  };
}

/** Publish the committed row to the live stream. Kept separate from handleUpsert so the
 *  loop only emits a row once it actually commits (not on a pre-commit verification pass). */
function publishRow(sessionId: string, feature: FeatureDescriptor, result: UpsertResult): void {
  publish(sessionId, {
    type: "row",
    feature: {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      customerBenefit: feature.customerBenefit,
      category: feature.category,
    },
    ratings: result.ratings,
    justifications: result.justifications,
    estimated: result.estimated,
    confidence: result.confidence,
    sources: result.sources,
    sourceClaims: result.sourceClaims,
  });
}

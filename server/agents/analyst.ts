import { getAnthropicClient, MODELS } from "../lib/anthropic";
import { publish } from "./event-bus";
import { runFeatureAnalyst, type FeatureAnalystResult } from "./feature-analyst";
import { buildSummaryPrompt, buildSystemBlocks, type PrimarySourceMap } from "./prompts";
import { gatherPrimarySources } from "./source-prepass";

export interface AnalystScope {
  userProductName: string | null;
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

export interface AnalystResult {
  summary: string;
  committedFeatureIds: string[];
  inputTokens: number;
  outputTokens: number;
}

const FAN_OUT_CONCURRENCY = 8;

export async function runAnalyst(args: {
  sessionId: string;
  scope: AnalystScope;
}): Promise<AnalystResult> {
  const { sessionId, scope } = args;

  publish(sessionId, {
    type: "status",
    status: "researching",
    message: "Gathering primary sources",
  });

  let primarySources: PrimarySourceMap = {};
  let totalInput = 0;
  let totalOutput = 0;
  try {
    const prepass = await gatherPrimarySources({
      userProductName: scope.userProductName,
      products: scope.products,
      targetCustomer: scope.targetCustomer,
    });
    primarySources = prepass.map;
    totalInput += prepass.inputTokens;
    totalOutput += prepass.outputTokens;
  } catch (error) {
    console.warn("[analyst] pre-pass failed, continuing without hints:", error);
  }

  publish(sessionId, {
    type: "status",
    status: "researching",
    message: `Analyzing ${scope.features.length} features in parallel`,
  });

  const siblingFeatureNames = scope.features.map((f) => f.name);
  const featureScope = {
    userProductName: scope.userProductName,
    products: scope.products,
    targetCustomer: scope.targetCustomer,
  };

  const limit = pLimit(FAN_OUT_CONCURRENCY);
  const settled = await Promise.allSettled(
    scope.features.map((feature) =>
      limit(() =>
        runFeatureAnalyst({
          sessionId,
          scope: featureScope,
          feature,
          siblingFeatureNames: siblingFeatureNames.filter((n) => n !== feature.name),
          primarySources,
        }),
      ),
    ),
  );

  const fullProducts = scope.userProductName
    ? [...scope.products, scope.userProductName]
    : scope.products;

  const rowsByFeatureId = new Map<string, FeatureAnalystResult>();
  settled.forEach((result, idx) => {
    const feature = scope.features[idx]!;
    if (result.status === "fulfilled" && result.value.committed) {
      totalInput += result.value.inputTokens;
      totalOutput += result.value.outputTokens;
      rowsByFeatureId.set(feature.id, result.value);
    } else {
      const reason =
        result.status === "rejected"
          ? result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
          : "feature research failed";
      console.warn(`[analyst] feature ${feature.id} failed:`, reason);
      publishFallbackRow({ sessionId, feature, products: fullProducts, reason });
    }
  });

  publish(sessionId, {
    type: "status",
    status: "writing",
    message: "Writing summary",
  });

  const committedFeatureIds = [...rowsByFeatureId.keys()];
  const summaryResult = await generateSummary({
    scope,
    rows: scope.features
      .map((f) => {
        const row = rowsByFeatureId.get(f.id);
        if (!row) return null;
        return {
          feature: { id: f.id, name: f.name, category: f.category },
          ratings: row.ratings,
          justifications: row.justifications,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
  });
  totalInput += summaryResult.inputTokens;
  totalOutput += summaryResult.outputTokens;

  publish(sessionId, { type: "done", summary: summaryResult.summary });

  return {
    summary: summaryResult.summary,
    committedFeatureIds,
    inputTokens: totalInput,
    outputTokens: totalOutput,
  };
}

function publishFallbackRow(args: {
  sessionId: string;
  feature: AnalystScope["features"][number];
  products: string[];
  reason: string;
}): void {
  const { sessionId, feature, products, reason } = args;
  const ratings: Record<string, string> = {};
  const justifications: Record<string, string> = {};
  for (const p of products) {
    ratings[p] = "Cannot Verify";
    justifications[p] = `feature research did not complete (${reason.slice(0, 120)})`;
  }
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
    sources: [],
  });
}

async function generateSummary(args: {
  scope: AnalystScope;
  rows: {
    feature: { id: string; name: string; category: string };
    ratings: Record<string, string>;
    justifications: Record<string, string>;
  }[];
}): Promise<{ summary: string; inputTokens: number; outputTokens: number }> {
  if (args.rows.length === 0) {
    return { summary: "No features could be rated from primary sources.", inputTokens: 0, outputTokens: 0 };
  }

  const client = getAnthropicClient();
  try {
    const response = await client.messages.create({
      model: MODELS.verifier,
      max_tokens: 400,
      system: buildSystemBlocks(),
      messages: [
        {
          role: "user",
          content: buildSummaryPrompt({
            scope: {
              userProductName: args.scope.userProductName,
              products: args.scope.products,
              targetCustomer: args.scope.targetCustomer,
            },
            rows: args.rows,
          }),
        },
      ],
    });
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    if (text) {
      return { summary: text, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    }
  } catch (error) {
    console.warn("[analyst] summary generation failed:", error);
  }
  return {
    summary: `${args.rows.length} features rated across ${args.scope.products.length} products; see table for details.`,
    inputTokens: 0,
    outputTokens: 0,
  };
}

function pLimit(n: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    active--;
    const waiter = queue.shift();
    if (waiter) waiter();
  };
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= n) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      next();
    }
  };
}

import type { Strategy, TableJson } from "../db/schema";
import { publish } from "./event-bus";
import { runFeatureAnalyst, type FeatureAnalystResult } from "./feature-analyst";
import { type PrimarySourceMap } from "./prompts";
import { gatherPrimarySources } from "./source-prepass";
import { generateStrategy } from "./strategy/strategist";
import { validateStrategy } from "./strategy/validator";

export interface AnalystScope {
  userProductName: string | null;
  userProductDescription?: string | null;
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
  strategy: Strategy;
  /** Insights flagged for outside validation — consumed by the paid validation loop. */
  validationCandidates: { id: string; query: string }[];
  committedFeatureIds: string[];
  inputTokens: number;
  outputTokens: number;
}

const FAN_OUT_CONCURRENCY = 8;

export async function runAnalyst(args: {
  sessionId: string;
  scope: AnalystScope;
  /** When true (paid runs), validate the strategist's top hypotheses against the web. */
  validate?: boolean;
}): Promise<AnalystResult> {
  const { sessionId, scope, validate = false } = args;

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
    userProductDescription: scope.userProductDescription,
    products: scope.products,
    targetCustomer: scope.targetCustomer,
  };

  const limit = pLimit(FAN_OUT_CONCURRENCY);
  const settled = await Promise.allSettled(
    scope.features.map((feature) =>
      limit(() =>
        runFeatureWithRetry({
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
    message: "Synthesizing strategy",
  });

  const committedFeatureIds = [...rowsByFeatureId.keys()];

  // Assemble a table view for the strategist (same shape the route persists).
  const strategyTable: TableJson = {
    products: fullProducts,
    features: scope.features,
    ratings: {},
    justifications: {},
    estimated: {},
    confidence: {},
  };
  for (const f of scope.features) {
    const row = rowsByFeatureId.get(f.id);
    strategyTable.ratings[f.id] = row?.ratings ?? {};
    strategyTable.justifications[f.id] = row?.justifications ?? {};
    strategyTable.estimated![f.id] = row?.estimated ?? {};
    strategyTable.confidence![f.id] = row?.confidence ?? {};
  }

  const strategyResult = await generateStrategy({
    scope: {
      userProductName: scope.userProductName,
      products: scope.products,
      targetCustomer: scope.targetCustomer,
    },
    table: strategyTable,
  });
  totalInput += strategyResult.inputTokens;
  totalOutput += strategyResult.outputTokens;

  let strategy = strategyResult.strategy;
  if (validate && strategyResult.validationCandidates.length > 0) {
    publish(sessionId, { type: "status", status: "writing", message: "Validating top findings" });
    const validated = await validateStrategy({
      sessionId,
      strategy,
      candidates: strategyResult.validationCandidates,
    });
    strategy = validated.strategy;
    totalInput += validated.inputTokens;
    totalOutput += validated.outputTokens;
  }

  publish(sessionId, { type: "done", summary: strategy.headline });

  return {
    summary: strategy.headline,
    strategy,
    validationCandidates: strategyResult.validationCandidates,
    committedFeatureIds,
    inputTokens: totalInput,
    outputTokens: totalOutput,
  };
}

/** A transient API failure (overload, rate limit, timeout) is worth one retry; a
 *  deterministic failure (bad output, no commit) is not — retrying just burns tokens. */
function isTransientError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return typeof status === "number" && [408, 409, 429, 500, 502, 503, 529].includes(status);
}

async function runFeatureWithRetry(
  args: Parameters<typeof runFeatureAnalyst>[0],
): Promise<FeatureAnalystResult> {
  try {
    return await runFeatureAnalyst(args);
  } catch (error) {
    if (!isTransientError(error)) throw error;
    console.warn(`[analyst] feature ${args.feature.id} hit a transient error — retrying once`);
    return await runFeatureAnalyst(args);
  }
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

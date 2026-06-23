import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import type { AnalystScope } from "../agents/analyst";
import { runAnalyst } from "../agents/analyst";
import { runFeatureAnalyst } from "../agents/feature-analyst";
import { runPrefill } from "../agents/prefill-agent";
import { applyMutation, runRefineAgent } from "../agents/refine-agent";
import { clearStream, publish, subscribe } from "../agents/event-bus";
import { proposeScope } from "../agents/scope-proposer";
import { getDb, schema } from "../db/client";
import type { ScopeJson, SourcesJson, TableJson } from "../db/schema";
import { mapAnthropicError } from "../lib/anthropic-errors";
import { checkRateLimit } from "../lib/rate-limiter";
import { streamAnalysisSSE } from "../lib/sse";
import { ADMIN_EMAIL, guardRefine, guardRunStart } from "../lib/usage-guard";
import { requireUser, type AuthContext } from "./auth";

export const analysisRoutes = new Hono<AuthContext>();

const ScopeInputBody = z.object({
  userProductName: z.string().trim().max(100).nullish(),
  userProductDescription: z.string().trim().min(10).max(4000),
  targetCustomerHint: z.string().trim().max(400).optional(),
  competitorHints: z.array(z.string().trim().min(1)).max(10).optional(),
});

const FeatureSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  customerBenefit: z.string().trim().min(1),
  category: z.enum(["must-have", "performance", "delighter"]),
});

const ScopeEditBody = z.object({
  userProductName: z.string().trim().nullable(),
  userProductDescription: z.string().trim().min(1),
  targetCustomer: z.string().trim().min(1),
  products: z.array(z.string().trim().min(1)).min(1).max(10),
  features: z.array(FeatureSchema).min(1).max(50),
  suggestedAdditionalCompetitors: z.array(z.string()).optional(),
});

const RefineBody = z.object({
  message: z.string().trim().min(1).max(2000),
});

const ReResearchBody = z.object({
  featureId: z.string().trim().min(1),
  product: z.string().trim().min(1),
});

const PrefillBody = z.object({
  url: z.string().trim().url().max(500),
});

async function loadSession(c: import("hono").Context<AuthContext>) {
  const user = await requireUser(c);
  if (!user) {
    c.status(401);
    return { response: c.json({ error: "unauthorized" }) } as const;
  }
  const id = c.req.param("id");
  if (!id) {
    c.status(400);
    return { response: c.json({ error: "missing_id" }) } as const;
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, id), eq(schema.sessions.userId, user.id)))
    .limit(1);
  const session = rows[0];
  if (!session) {
    c.status(404);
    return { response: c.json({ error: "not_found" }) } as const;
  }
  return { user, session, db, id } as const;
}

// Read a product URL and propose form values (product name, description, competitors).
// Session-less: this runs before a session exists, during first-run intake.
analysisRoutes.post("/prefill", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  if (!checkRateLimit(`prefill:${user.id}`, 20, 3_600_000)) {
    return c.json({ error: "rate_limited", message: "Too many requests. Try again in an hour." }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = PrefillBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", message: "Enter a valid URL (including https://)." }, 400);
  }

  try {
    const result = await runPrefill(parsed.data.url);
    return c.json({
      productName: result.productName,
      description: result.description,
      competitors: result.competitors,
    });
  } catch (error) {
    console.error("[prefill] failed:", error);
    const mapped = mapAnthropicError(error);
    const message = mapped?.userMessage ?? (error instanceof Error ? error.message : String(error));
    return c.json(
      { error: "prefill_failed", message },
      (mapped?.status as 400 | 401 | 402 | 403 | 429 | 500 | 503) ?? 500,
    );
  }
});

analysisRoutes.post("/:id/scope", async (c) => {
  const loaded = await loadSession(c);
  if ("response" in loaded) return loaded.response;
  const { db, id, user } = loaded;

  if (!checkRateLimit(`scope:${user.id}`, 20, 3_600_000)) {
    return c.json({ error: "rate_limited", message: "Too many scope proposals. Try again in an hour." }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = ScopeInputBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", detail: parsed.error.flatten() }, 400);
  }

  await db.update(schema.sessions).set({ status: "scoping" }).where(eq(schema.sessions.id, id));

  try {
    const name = parsed.data.userProductName?.trim() ? parsed.data.userProductName.trim() : null;
    const { proposal, inputTokens, outputTokens } = await proposeScope({
      userProductName: name ?? undefined,
      userProductDescription: parsed.data.userProductDescription,
      targetCustomerHint: parsed.data.targetCustomerHint,
      competitorHints: parsed.data.competitorHints,
    });
    const scopeJson: ScopeJson = {
      userProductName: name,
      userProductDescription: parsed.data.userProductDescription,
      targetCustomer: proposal.targetCustomer,
      products: proposal.products,
      features: proposal.features,
      rationale: proposal.rationale,
      suggestedAdditionalCompetitors: proposal.suggestedAdditionalCompetitors ?? [],
    };
    await db
      .update(schema.analyses)
      .set({
        scope: scopeJson,
        inputTokens: sql`${schema.analyses.inputTokens} + ${inputTokens}`,
        outputTokens: sql`${schema.analyses.outputTokens} + ${outputTokens}`,
      })
      .where(eq(schema.analyses.sessionId, id));
    await db
      .update(schema.sessions)
      .set({ status: "scoped", title: titleFor(name) })
      .where(eq(schema.sessions.id, id));
    return c.json({ scope: scopeJson });
  } catch (error) {
    console.error("[scope-proposer] failed:", error);
    const mapped = mapAnthropicError(error);
    const message = mapped?.userMessage ?? (error instanceof Error ? error.message : String(error));
    await db
      .update(schema.sessions)
      .set({ status: "error", errorMessage: message })
      .where(eq(schema.sessions.id, id));
    if (mapped) {
      return c.json(
        { error: mapped.code, message: mapped.userMessage, detail: mapped.raw },
        mapped.status as 400 | 401 | 402 | 403 | 429 | 500 | 503,
      );
    }
    return c.json({ error: "scope_proposal_failed", message }, 500);
  }
});

analysisRoutes.put("/:id/scope", async (c) => {
  const loaded = await loadSession(c);
  if ("response" in loaded) return loaded.response;
  const { db, id } = loaded;

  const body = await c.req.json().catch(() => ({}));
  const parsed = ScopeEditBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", detail: parsed.error.flatten() }, 400);
  }
  const scopeJson: ScopeJson = parsed.data;
  await db
    .update(schema.analyses)
    .set({ scope: scopeJson })
    .where(eq(schema.analyses.sessionId, id));
  await db
    .update(schema.sessions)
    .set({ status: "scoped" })
    .where(eq(schema.sessions.id, id));
  return c.json({ scope: scopeJson });
});

analysisRoutes.post("/:id/start", async (c) => {
  const loaded = await loadSession(c);
  if ("response" in loaded) return loaded.response;
  const { db, id, user } = loaded;

  if (!checkRateLimit(`start:${user.id}`, 5, 3_600_000)) {
    return c.json({ error: "rate_limited", message: "Too many analysis runs. Try again in an hour." }, 429);
  }

  const usageError = await guardRunStart(user.id, id);
  if (usageError) {
    return c.json({ error: usageError.code, message: usageError.message }, 402);
  }

  const analysisRow = await db
    .select()
    .from(schema.analyses)
    .where(eq(schema.analyses.sessionId, id))
    .limit(1);
  const analysis = analysisRow[0];
  if (!analysis?.scope) {
    return c.json({ error: "scope_missing" }, 400);
  }

  // Validate the strategist's top hypotheses against the web on paid runs (and for the admin tester).
  const privileged = user.email === ADMIN_EMAIL;
  const [paidRow] = await db
    .select({ isPaidRun: schema.sessions.isPaidRun })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .limit(1);
  const validate = privileged || (paidRow?.isPaidRun ?? false);

  clearStream(id);
  publish(id, { type: "status", status: "queued" });

  const scope = analysis.scope;
  const fullProducts = scope.userProductName
    ? [...scope.products, scope.userProductName]
    : scope.products;
  const rowsCollected = new Map<
    string,
    {
      feature: AnalystScope["features"][number];
      ratings: Record<string, string>;
      justifications: Record<string, string>;
      estimated: Record<string, boolean>;
      confidence: Record<string, "high" | "medium" | "low">;
      sources: string[];
      sourceClaims: Record<string, string>;
    }
  >();

  const { unsubscribe } = subscribe(id, (event) => {
    if (event.type === "row") {
      rowsCollected.set(event.feature.id, {
        feature: event.feature as AnalystScope["features"][number],
        ratings: event.ratings,
        justifications: event.justifications ?? {},
        estimated: event.estimated ?? {},
        confidence: event.confidence ?? {},
        sources: event.sources,
        sourceClaims: event.sourceClaims ?? {},
      });
    }
  });

  await db.update(schema.sessions).set({ status: "running" }).where(eq(schema.sessions.id, id));

  (async () => {
    try {
      const analystScope: AnalystScope = {
        userProductName: scope.userProductName,
        userProductDescription: scope.userProductDescription,
        products: scope.products,
        targetCustomer: scope.targetCustomer,
        features: scope.features,
      };
      const result = await runAnalyst({ sessionId: id, scope: analystScope, validate });

      const tableData: TableJson = {
        products: fullProducts,
        features: scope.features,
        ratings: {},
        justifications: {},
        estimated: {},
        confidence: {},
        summary: result.summary,
        strategy: result.strategy,
      };
      const sources: SourcesJson = { byFeatureId: {}, claimsByFeatureId: {} };
      for (const f of scope.features) {
        const row = rowsCollected.get(f.id);
        tableData.ratings[f.id] = row?.ratings ?? {};
        tableData.justifications[f.id] = row?.justifications ?? {};
        tableData.estimated![f.id] = row?.estimated ?? {};
        tableData.confidence![f.id] = row?.confidence ?? {};
        sources.byFeatureId[f.id] = row?.sources ?? [];
        sources.claimsByFeatureId![f.id] = row?.sourceClaims ?? {};
      }

      await getDb()
        .update(schema.analyses)
        .set({
          tableData,
          sources,
          inputTokens: sql`${schema.analyses.inputTokens} + ${result.inputTokens}`,
          outputTokens: sql`${schema.analyses.outputTokens} + ${result.outputTokens}`,
        })
        .where(eq(schema.analyses.sessionId, id));
      await getDb()
        .update(schema.sessions)
        .set({ status: "complete" })
        .where(eq(schema.sessions.id, id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      publish(id, { type: "error", message });
      await getDb()
        .update(schema.sessions)
        .set({ status: "error", errorMessage: message })
        .where(eq(schema.sessions.id, id));
    } finally {
      unsubscribe();
      clearStream(id);
    }
  })();

  return c.json({ ok: true, sessionId: id }, 202);
});

analysisRoutes.get("/:id/stream", async (c) => {
  const loaded = await loadSession(c);
  if ("response" in loaded) return loaded.response;
  return streamAnalysisSSE(c, loaded.id);
});

analysisRoutes.post("/:id/refine", async (c) => {
  const loaded = await loadSession(c);
  if ("response" in loaded) return loaded.response;
  const { db, id, user } = loaded;

  if (!checkRateLimit(`refine:${user.id}`, 20, 3_600_000)) {
    return c.json({ error: "rate_limited", message: "Too many refinements. Try again in an hour." }, 429);
  }

  const refineError = await guardRefine(user.id, id);
  if (refineError) {
    return c.json({ error: refineError.code, message: refineError.message }, 402);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsedBody = RefineBody.safeParse(body);
  if (!parsedBody.success) {
    return c.json({ error: "invalid_body", detail: parsedBody.error.flatten() }, 400);
  }
  const message = parsedBody.data.message;

  const analysisRows = await db
    .select()
    .from(schema.analyses)
    .where(eq(schema.analyses.sessionId, id))
    .limit(1);
  const analysis = analysisRows[0];
  if (!analysis?.tableData) {
    return c.json({ error: "no_analysis" }, 400);
  }

  let result;
  try {
    result = await runRefineAgent({ message, tableData: analysis.tableData });
  } catch (error) {
    console.error("[refine-agent] failed:", error);
    return c.json({ error: "refine_failed", message: error instanceof Error ? error.message : String(error) }, 500);
  }

  if (result.mutation.type !== "none") {
    const updated = applyMutation(analysis.tableData, result.mutation);
    await db
      .update(schema.analyses)
      .set({ tableData: updated })
      .where(eq(schema.analyses.sessionId, id));
  }

  return c.json({ reply: result.reply });
});

// Re-research a SINGLE cell (one feature × one product) when the user flags it as wrong.
analysisRoutes.post("/:id/re-research", async (c) => {
  const loaded = await loadSession(c);
  if ("response" in loaded) return loaded.response;
  const { db, id, user } = loaded;

  if (!checkRateLimit(`reresearch:${user.id}`, 30, 3_600_000)) {
    return c.json({ error: "rate_limited", message: "Too many re-research requests. Try again in an hour." }, 429);
  }

  // Shares the refine budget — a re-research is a targeted refinement.
  const refineError = await guardRefine(user.id, id);
  if (refineError) {
    return c.json({ error: refineError.code, message: refineError.message }, 402);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = ReResearchBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", detail: parsed.error.flatten() }, 400);
  }
  const { featureId, product } = parsed.data;

  const [analysis] = await db
    .select()
    .from(schema.analyses)
    .where(eq(schema.analyses.sessionId, id))
    .limit(1);
  if (!analysis?.tableData || !analysis.scope) {
    return c.json({ error: "no_analysis" }, 400);
  }
  const scope = analysis.scope;
  const feature = scope.features.find((f) => f.id === featureId);
  if (!feature) return c.json({ error: "feature_not_found" }, 404);

  const isUserProduct = product === scope.userProductName;
  const allProducts = scope.userProductName ? [...scope.products, scope.userProductName] : scope.products;
  if (!allProducts.includes(product)) return c.json({ error: "product_not_found" }, 404);

  // Run the existing per-feature analyst, but scoped to just this one product.
  const featureScope = {
    userProductName: isUserProduct ? product : null,
    userProductDescription: isUserProduct ? scope.userProductDescription : null,
    products: isUserProduct ? [] : [product],
    targetCustomer: scope.targetCustomer,
  };

  let result;
  try {
    result = await runFeatureAnalyst({
      sessionId: id,
      scope: featureScope,
      feature,
      siblingFeatureNames: scope.features.map((f) => f.name).filter((n) => n !== feature.name),
      primarySources: {},
    });
  } catch (error) {
    console.error("[re-research] failed:", error);
    const mapped = mapAnthropicError(error);
    const message = mapped?.userMessage ?? (error instanceof Error ? error.message : String(error));
    return c.json({ error: "reresearch_failed", message }, 500);
  }

  // Merge the single-cell result back into the stored table + sources.
  const td: TableJson = structuredClone(analysis.tableData);
  td.ratings[featureId] = { ...(td.ratings[featureId] ?? {}), [product]: result.ratings[product] ?? "Cannot Verify" };
  td.justifications[featureId] = { ...(td.justifications[featureId] ?? {}), [product]: result.justifications[product] ?? "" };
  td.estimated = td.estimated ?? {};
  td.estimated[featureId] = { ...(td.estimated[featureId] ?? {}), [product]: result.estimated[product] ?? false };
  td.confidence = td.confidence ?? {};
  td.confidence[featureId] = { ...(td.confidence[featureId] ?? {}), [product]: result.confidence[product] ?? "low" };

  const srcs: SourcesJson = analysis.sources ? structuredClone(analysis.sources) : { byFeatureId: {} };
  const mergedUrls = Array.from(new Set([...(srcs.byFeatureId[featureId] ?? []), ...result.sources]));
  srcs.byFeatureId[featureId] = mergedUrls;
  srcs.claimsByFeatureId = srcs.claimsByFeatureId ?? {};
  srcs.claimsByFeatureId[featureId] = { ...(srcs.claimsByFeatureId[featureId] ?? {}), ...result.sourceClaims };

  await db
    .update(schema.analyses)
    .set({
      tableData: td,
      sources: srcs,
      inputTokens: sql`${schema.analyses.inputTokens} + ${result.inputTokens}`,
      outputTokens: sql`${schema.analyses.outputTokens} + ${result.outputTokens}`,
    })
    .where(eq(schema.analyses.sessionId, id));

  return c.json({
    featureId,
    product,
    rating: td.ratings[featureId][product],
    justification: td.justifications[featureId][product],
    estimated: td.estimated[featureId][product],
    confidence: td.confidence[featureId][product],
  });
});

analysisRoutes.post("/:id/share", async (c) => {
  const loaded = await loadSession(c);
  if ("response" in loaded) return loaded.response;
  const { db, id } = loaded;

  await db
    .update(schema.analyses)
    .set({ shareEnabled: true })
    .where(eq(schema.analyses.sessionId, id));

  const [analysis] = await db
    .select({ shareToken: schema.analyses.shareToken })
    .from(schema.analyses)
    .where(eq(schema.analyses.sessionId, id))
    .limit(1);

  if (!analysis) return c.json({ error: "not_found" }, 404);

  const base = process.env.PUBLIC_WEB_ORIGIN ?? `http://localhost:${process.env.WEB_PORT ?? 5173}`;
  return c.json({ shareUrl: `${base}/share/${analysis.shareToken}` });
});

function titleFor(userProductName: string | null): string {
  return userProductName ? `${userProductName} vs. competitors` : "Market scan";
}

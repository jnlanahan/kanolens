import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import type { AnalystScope } from "../agents/analyst";
import { runAnalyst } from "../agents/analyst";
import { applyMutation, runRefineAgent } from "../agents/refine-agent";
import { clearStream, publish, subscribe } from "../agents/event-bus";
import { proposeScope } from "../agents/scope-proposer";
import { getDb, schema } from "../db/client";
import type { ScopeJson, SourcesJson, TableJson } from "../db/schema";
import { mapAnthropicError } from "../lib/anthropic-errors";
import { checkRateLimit } from "../lib/rate-limiter";
import { streamAnalysisSSE } from "../lib/sse";
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
});

const RefineBody = z.object({
  message: z.string().trim().min(1).max(2000),
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

  const analysisRow = await db
    .select()
    .from(schema.analyses)
    .where(eq(schema.analyses.sessionId, id))
    .limit(1);
  const analysis = analysisRow[0];
  if (!analysis?.scope) {
    return c.json({ error: "scope_missing" }, 400);
  }

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
      sources: string[];
    }
  >();

  const { unsubscribe } = subscribe(id, (event) => {
    if (event.type === "row") {
      rowsCollected.set(event.feature.id, {
        feature: event.feature as AnalystScope["features"][number],
        ratings: event.ratings,
        justifications: event.justifications ?? {},
        sources: event.sources,
      });
    }
  });

  await db.update(schema.sessions).set({ status: "running" }).where(eq(schema.sessions.id, id));

  (async () => {
    try {
      const analystScope: AnalystScope = {
        userProductName: scope.userProductName,
        products: scope.products,
        targetCustomer: scope.targetCustomer,
        features: scope.features,
      };
      const result = await runAnalyst({ sessionId: id, scope: analystScope });

      const tableData: TableJson = {
        products: fullProducts,
        features: scope.features,
        ratings: {},
        justifications: {},
        summary: result.summary,
      };
      const sources: SourcesJson = { byFeatureId: {} };
      for (const f of scope.features) {
        const row = rowsCollected.get(f.id);
        tableData.ratings[f.id] = row?.ratings ?? {};
        tableData.justifications[f.id] = row?.justifications ?? {};
        sources.byFeatureId[f.id] = row?.sources ?? [];
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

function titleFor(userProductName: string | null): string {
  return userProductName ? `${userProductName} vs. competitors` : "Market scan";
}

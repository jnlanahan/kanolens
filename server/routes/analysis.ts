import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import type { AnalystScope } from "../agents/analyst";
import { runAnalyst } from "../agents/analyst";
import { clearStream, publish, subscribe } from "../agents/event-bus";
import { proposeScope } from "../agents/scope-proposer";
import { getDb, schema } from "../db/client";
import type { ScopeJson, SourcesJson, TableJson } from "../db/schema";
import { streamAnalysisSSE } from "../lib/sse";
import { requireUser, type AuthContext } from "./auth";

export const analysisRoutes = new Hono<AuthContext>();

const ScopeInputBody = z.object({
  userProductName: z.string().trim().min(1).max(100),
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
  userProductName: z.string().trim().min(1),
  userProductDescription: z.string().trim().min(1),
  targetCustomer: z.string().trim().min(1),
  products: z.array(z.string().trim().min(1)).min(1).max(10),
  features: z.array(FeatureSchema).min(1).max(50),
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
  const { db, id } = loaded;

  const body = await c.req.json().catch(() => ({}));
  const parsed = ScopeInputBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", detail: parsed.error.flatten() }, 400);
  }

  await db.update(schema.sessions).set({ status: "scoping" }).where(eq(schema.sessions.id, id));

  try {
    const proposal = await proposeScope(parsed.data);
    const scopeJson: ScopeJson = {
      userProductName: parsed.data.userProductName,
      userProductDescription: parsed.data.userProductDescription,
      targetCustomer: proposal.targetCustomer,
      products: proposal.products,
      features: proposal.features,
      rationale: proposal.rationale,
    };
    await db
      .update(schema.analyses)
      .set({ scope: scopeJson })
      .where(eq(schema.analyses.sessionId, id));
    await db
      .update(schema.sessions)
      .set({ status: "scoped", title: titleFor(parsed.data.userProductName) })
      .where(eq(schema.sessions.id, id));
    return c.json({ scope: scopeJson });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(schema.sessions)
      .set({ status: "error", errorMessage: message })
      .where(eq(schema.sessions.id, id));
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
  const { db, id } = loaded;

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
  const fullProducts = [...scope.products, scope.userProductName];
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
        .set({ tableData, sources })
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
    }
  })();

  return c.json({ ok: true, sessionId: id }, 202);
});

analysisRoutes.get("/:id/stream", async (c) => {
  const loaded = await loadSession(c);
  if ("response" in loaded) return loaded.response;
  return streamAnalysisSSE(c, loaded.id);
});

function titleFor(userProductName: string): string {
  return `${userProductName} vs. competitors`;
}

import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { getDb, schema } from "../db/client";
import { requireUser, type AuthContext } from "./auth";

export const sessionRoutes = new Hono<AuthContext>();

const CreateBody = z.object({
  title: z.string().trim().min(1).max(160).optional(),
});

sessionRoutes.get("/", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const db = getDb();
  const rows = await db
    .select({
      id: schema.sessions.id,
      title: schema.sessions.title,
      status: schema.sessions.status,
      createdAt: schema.sessions.createdAt,
      updatedAt: schema.sessions.updatedAt,
    })
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, user.id))
    .orderBy(desc(schema.sessions.createdAt))
    .limit(50);
  return c.json({ sessions: rows });
});

sessionRoutes.post("/", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", detail: parsed.error.flatten() }, 400);
  }

  const db = getDb();
  const [session] = await db
    .insert(schema.sessions)
    .values({
      userId: user.id,
      title: parsed.data.title ?? "Untitled analysis",
      status: "draft",
    })
    .returning();
  if (!session) return c.json({ error: "create_failed" }, 500);

  await db.insert(schema.analyses).values({ sessionId: session.id });

  return c.json({ session }, 201);
});

sessionRoutes.get("/:id", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const id = c.req.param("id");
  if (!id) return c.json({ error: "missing_id" }, 400);
  const db = getDb();
  const sessionRow = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, id), eq(schema.sessions.userId, user.id)))
    .limit(1);
  const session = sessionRow[0];
  if (!session) return c.json({ error: "not_found" }, 404);

  const analysisRow = await db
    .select()
    .from(schema.analyses)
    .where(eq(schema.analyses.sessionId, id))
    .limit(1);
  return c.json({ session, analysis: analysisRow[0] ?? null });
});

sessionRoutes.delete("/:id", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const id = c.req.param("id");
  if (!id) return c.json({ error: "missing_id" }, 400);
  const db = getDb();
  const result = await db
    .delete(schema.sessions)
    .where(and(eq(schema.sessions.id, id), eq(schema.sessions.userId, user.id)))
    .returning();
  if (result.length === 0) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

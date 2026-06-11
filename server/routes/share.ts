import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { getDb, schema } from "../db/client";

export const shareRoutes = new Hono();

shareRoutes.get("/:shareToken", async (c) => {
  const shareToken = c.req.param("shareToken");
  const db = getDb();

  const rows = await db
    .select({
      tableData: schema.analyses.tableData,
      scope: schema.analyses.scope,
      sources: schema.analyses.sources,
      title: schema.sessions.title,
    })
    .from(schema.analyses)
    .innerJoin(schema.sessions, eq(schema.analyses.sessionId, schema.sessions.id))
    .where(
      and(
        eq(schema.analyses.shareToken, shareToken),
        eq(schema.analyses.shareEnabled, true),
      ),
    )
    .limit(1);

  if (!rows[0]) return c.json({ error: "not_found" }, 404);
  return c.json(rows[0]);
});

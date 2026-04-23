import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { env } from "./env";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.PUBLIC_WEB_ORIGIN ?? `http://localhost:${env.WEB_PORT}`,
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ ok: true, env: env.NODE_ENV, version: "2.0.0" }));

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    env: env.NODE_ENV,
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    database: Boolean(env.DATABASE_URL),
  }),
);

app.notFound((c) => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  console.error("[server]", err);
  return c.json({ error: "internal server error" }, 500);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[kanolens] api listening on http://localhost:${info.port}`);
});

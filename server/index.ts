import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { getDbAsync } from "./db/client";
import { env } from "./env";
import type { AuthContext } from "./routes/auth";
import { authRoutes } from "./routes/auth";
import { analysisRoutes } from "./routes/analysis";
import { sessionRoutes } from "./routes/sessions";

const app = new Hono<AuthContext>();

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
    google_oauth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  }),
);

app.route("/api/auth", authRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/analysis", analysisRoutes);

app.notFound((c) => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  console.error("[server]", err);
  return c.json({ error: "internal server error" }, 500);
});

async function bootstrap() {
  await getDbAsync();
  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`[kanolens] api listening on http://localhost:${info.port}`);
  });
}

bootstrap().catch((err) => {
  console.error("[kanolens] failed to start:", err);
  process.exit(1);
});

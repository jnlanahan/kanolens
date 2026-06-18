import "dotenv/config";
import * as Sentry from "@sentry/node";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { getDbAsync } from "./db/client";
import { env } from "./env";

if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
}
import type { AuthContext } from "./routes/auth";
import { authRoutes } from "./routes/auth";
import { analysisRoutes } from "./routes/analysis";
import { paymentsRoutes } from "./routes/payments";
import { sessionRoutes } from "./routes/sessions";
import { shareRoutes } from "./routes/share";

const app = new Hono<AuthContext>();

app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: env.PUBLIC_WEB_ORIGIN ?? `http://localhost:${env.WEB_PORT}`,
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ ok: true, env: env.NODE_ENV, version: "2.0.0" }));

app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/auth", authRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/analysis", analysisRoutes);
app.route("/api/payments", paymentsRoutes);
app.route("/api/share", shareRoutes);

// Unmatched API routes always return JSON 404 — must come before the SPA
// static fallback below so they never get served index.html.
app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

// In production the Hono server also serves the built React app (dist/web).
// In dev the frontend is served by Vite on its own port, so this is skipped.
if (env.NODE_ENV === "production") {
  // Serve any built asset that exists on disk (JS/CSS bundles, favicon, etc.).
  app.use("/*", serveStatic({ root: "./dist/web" }));
  // SPA fallback: client-side routes (/new, /report/:id, …) get index.html.
  app.get("*", serveStatic({ path: "./dist/web/index.html" }));
}

app.notFound((c) => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  console.error("[server]", err);
  Sentry.captureException(err);
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

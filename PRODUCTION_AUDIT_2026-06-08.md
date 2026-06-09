# Production Readiness Audit — KanoLens v2

**Date:** 2026-06-08
**Classification:** Vibe-coded (high confidence)
**Branch:** main
**Auditor:** prod-readiness-auditor + secret-scanner + dependency-currency-checker

---

## Severity Summary

| Severity | Total | Fixed | Remaining |
| --- | --- | --- | --- |
| Critical | 3 | 3 ✅ | 0 |
| High | 5 | 5 ✅ | 0 |
| Medium | 4 | 4 ✅ | 0 |
| Low | 3 | 3 ✅ | 0 |

**Status (2026-06-08):** All 15 findings resolved. ✅ Audit complete.

---

## Critical (must fix before launch)

**C1 — OAuth redirect URI hardcoded to localhost** ✅ FIXED 2026-06-08
- File: `server/routes/auth.ts:20-21`
- `http://localhost:${env.PORT}/api/auth/google/callback` is built unconditionally — production login will never work.
- Fix: `redirectUri()` now uses `PUBLIC_WEB_ORIGIN` as base, falls back to localhost only in dev.

**C2 — Google OAuth skips `email_verified` check** ✅ FIXED 2026-06-08
- File: `server/routes/auth.ts:91-107`
- `profile.email_verified` is declared on the type but never checked — unverified Google accounts get full sessions.
- Fix: Added `if (!profile.email_verified) return c.json({ error: "email_not_verified" }, 400)` before `upsertUser`.

**C3 — Sourcemaps emitted in production build** ✅ FIXED 2026-06-08
- File: `vite.config.ts:29`
- `sourcemap: true` with no environment guard exposes full TypeScript source paths, variable names, and routing logic to anyone in DevTools.
- Fix: Changed to `sourcemap: process.env.NODE_ENV !== "production"`.

---

## High

**H1 — No rate limiting on AI endpoints** ✅ FIXED 2026-06-08
- File: `server/routes/analysis.ts:66, 144, 243`
- One authenticated user can exhaust your entire Anthropic balance. The `/start` endpoint fans out up to 8 concurrent Claude Opus calls per request.
- Fix: `server/lib/rate-limiter.ts` sliding-window limiter. Limits: scope 20/hr, start 5/hr, refine 20/hr per user. Returns 429 on breach.

**H2 — AI token usage never recorded** ✅ FIXED 2026-06-08
- File: `server/agents/feature-analyst.ts:120`, `server/agents/scope-proposer.ts:46`
- `response.usage` is returned by the Anthropic SDK on every call but never read. Zero visibility into per-user spend or abuse.
- Fix: `inputTokens`/`outputTokens` columns added to `analyses` table. All Anthropic calls (scope-proposer, source-prepass, feature-analyst loop, summary) accumulate usage and write it via SQL increment to the DB. Run `npm run db:push` to apply the schema change.

**H3 — No security headers** ✅ FIXED 2026-06-08
- File: `server/index.ts:14-23`
- No CSP, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy. Hono ships `secureHeaders()` built-in.
- Fix: Added `import { secureHeaders } from "hono/secure-headers"` and `app.use("*", secureHeaders())`.

**H4 — Refine endpoint accepts unbounded user input sent to LLM** ✅ FIXED 2026-06-08
- File: `server/routes/analysis.ts:248-249`
- No `maxLength` on the message string before it's embedded in a prompt. Risk of token burn + prompt injection.
- Fix: Added `RefineBody` Zod schema with `.max(2000)` cap; replaces the old manual string extraction.

**H5 — No error tracker (production errors are console.error only)** ✅ FIXED 2026-06-08
- File: `server/index.ts:42-45`
- A breaking regression in production is invisible until a user reports it.
- Fix: Installed `@sentry/node`. `Sentry.init()` runs at startup when `SENTRY_DSN` env var is present (no-op in dev without it). `Sentry.captureException(err)` called in `app.onError`. Add `SENTRY_DSN` to your production environment to activate.

---

## Medium

**M1 — Critical env vars are `optional()` — server starts silently without them** ✅ FIXED 2026-06-08
- File: `server/env.ts:8-17`
- `DATABASE_URL`, `JWT_SECRET`, and `ANTHROPIC_API_KEY` are all `.optional()`. A misconfigured deploy boots cleanly and throws at runtime.
- Fix: `loadEnv()` now exits with a clear error if any of these are absent when `NODE_ENV=production`.

**M2 — SSE event bus has no cleanup for abandoned streams (memory leak)** ✅ FIXED 2026-06-08
- File: `server/agents/event-bus.ts:16-35`
- If a client disconnects mid-stream or the agent crashes, the `Set<Listener>` + buffer array is never freed.
- Fix: Added 30-minute TTL `setTimeout` in `getOrCreate`; timer is cancelled in `clearStream`. Added `clearStream(id)` to the analysis run's `finally` block.

**M3 — No CI pipeline** ✅ FIXED 2026-06-08
- Missing: `.github/workflows/`
- TypeScript errors and failing tests can reach main undetected.
- Fix: `.github/workflows/ci.yml` — runs `npm run check && npm run test` on push/PR to main, Node 22, `npm ci` with cache.

**M4 — Weak JWT_SECRET placeholder passes Zod validation** ✅ FIXED 2026-06-08
- File: `server/env.ts:16`
- The default dev value satisfies `.min(32)` and would ship if `.env` is copied to production.
- Fix: `loadEnv()` now rejects values matching `/dev|example|change.?me|placeholder|secret.?here/i` in production.

---

## Low

**L1 — `/api/health` leaks config state to unauthenticated callers** ✅ FIXED 2026-06-08
- File: `server/index.ts:27-35`
- Returns which API keys are configured (Anthropic, Google, DB). Gives attackers a free inventory of what's connected.
- Fix: Endpoint now returns only `{ ok: true }`.

**L2 — `db:push` documented as the production deploy step instead of `db:migrate`** ✅ FIXED 2026-06-08
- File: `REBUILD_LOG.md:134`
- `db:push` will silently alter/drop columns in future schema changes with no diff review.
- Fix: Updated `REBUILD_LOG.md` to instruct `db:migrate` for production deploys and to commit `drizzle/meta/` migration history.

**L3 — No dependency vulnerability scanning** ✅ FIXED 2026-06-08
- No `npm audit` in CI, no Dependabot config.
- Fix: Added `npm audit --audit-level=high` step to `.github/workflows/ci.yml`; created `.github/dependabot.yml` for weekly npm updates.

---

## Recommended Fix Order

| # | Finding | Effort | Notes |
|---|---|---|---|
| 1 | C2 — email_verified check | 5 min | One line, pure security |
| 2 | C3 — sourcemaps off | 5 min | One line, no side effects |
| 3 | C1 — OAuth redirect URI | 20 min | Blocks production login entirely |
| 4 | H3 — Security headers | 10 min | Built-in Hono middleware, 2-line change |
| 5 | M4 — JWT_SECRET validation | 15 min | Guards against a catastrophic config mistake |
| 6 | M1 — Env vars required in prod | 20 min | Fail-fast startup instead of runtime surprise |
| 7 | H4 — Refine input length cap | 15 min | Quick Zod fix, closes injection surface |
| 8 | L1 — Health endpoint | 10 min | Reduce recon surface before going live |
| 9 | H1 — Rate limiting | 2–3 hrs | Needs a rate-limit library; prevents cost abuse |
| 10 | H2 — Token usage tracking | 2–3 hrs | Requires DB schema migration + analyses columns |
| 11 | M2 — SSE cleanup / TTL | 1 hr | Memory leak; low urgency until load increases |
| 12 | M3 — CI pipeline | 2 hrs | Depends on nothing; enables L3 for free |
| 13 | H5 — Sentry | 1–2 hrs | After CI is in place (deploy pipeline needed) |
| 14 | L2 — db:migrate runbook | 30 min | Before first real Postgres deploy |
| 15 | L3 — Dependabot | 20 min | After CI workflow exists |

**Critical path to launch:** Items 1–8 are all under 2 hours total. Do those first. Then tackle H1 + H2 as a "cost guard" sprint before any real traffic.

---

## Outdated Dependencies

| Package | Installed | Latest | Risk |
|---|---|---|---|
| `tailwindcss` | 3.4.x | 4.3.0 | HIGH — full rewrite, CSS config format changed, shadcn components affected. 1–2 day migration. |
| `vite` | 7.3.x | 8.0.16 | Medium — plugin API changes, Node 20+ required. 1–3 hrs. |
| `vitest` | 3.2.x | 4.1.8 | Low-medium — upgrade after Vite first. 1–2 hrs. |
| `typescript` | 5.9.x | 6.0.3 | Medium — stricter module resolution. Half a day. |

All other scanned dependencies (React, Hono, TanStack Router/Query, Drizzle, jose, Zod, Playwright, Anthropic SDK, Gemini SDK, Zustand, postgres) are current within their major version.

---

## Positive Findings

- Session ownership enforcement is correct — every query uses `AND userId = user.id` (no IDOR risk)
- JWT implementation is solid: HS256 with issuer/audience verification, HTTP-only + sameSite cookies, CSRF nonce in OAuth state
- Input validation is consistent: all mutation endpoints go through Zod before touching the DB
- Agent fallback is well-designed: `Promise.allSettled` ensures one bad feature row never aborts the full run
- Dev auto-login (`/api/auth/dev`) is correctly blocked with 403 in production

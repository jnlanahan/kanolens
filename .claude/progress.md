# KanoLens Build Progress

## 2026-06-09 — Payments + Pricing

**Skill:** 4-Build-Payments  
**Model:** $5 one-time / run, free tier (1 run, 0 refinements), admin bypass for `jnlanahan@gmail.com`

**Files created/modified:**
- `server/lib/usage-guard.ts` — `guardRunStart` + `guardRefine` enforcement
- `server/routes/payments.ts` — Stripe Checkout + webhook (with idempotency via `payments` table)
- `server/routes/auth.ts` — removed dev login route; admin email auto-seeds `isAdmin = true`
- `server/db/schema.ts` — 5 new cols (users: freeRunUsed, runCredits, isAdmin; sessions: isPaidRun, refinementsUsed) + payments table
- `server/index.ts` — registered `/api/payments` route
- `server/env.ts` — added STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID
- `src/hooks/useAuth.ts` — removed `useAutoDevLogin`
- `src/routes/__root.tsx` — switched to `useCurrentUser()`
- `src/lib/api.ts` — removed `devLogin`, added `createCheckout`
- `src/components/kano/RefineChat.tsx` — locked paywall banner state
- `src/routes/scope.$sessionId.tsx` — no-credits paywall panel
- `src/routes/dashboard.tsx` — `?payment=success` toast
- `.env.example` — added Stripe vars
- `tests/e2e/flow.spec.ts` — removed dev login mock

**Next step:** Add Stripe test keys to `.env`, create a $5 product in Stripe test dashboard, run `stripe listen --forward-to localhost:3001/api/payments/webhook`, and test the full flow with a non-admin Google account.

## 2026-06-09 — /4-Build-Evals

**Skill:** 4-Build-Evals
**Eval type:** Rule-based + LLM-as-judge hybrid on `runFeatureAnalyst`
**Dataset:** `kanolens-feature-analyst-v1` — 7 examples (2 must-have, 2 performance, 2 delighter, 1 edge case)
**Baseline score:** `schema_validity = 1.00`, `justification_coherence = 0.83` (lowest: multiplayer-design 0.73 — Adobe XD discontinued)
**Files created:**

- `scripts/run-evals.ts` — eval harness with two evaluators
- `.env.example` — added LangSmith vars
- `package.json` — added `evals` script

**Next step:** Re-run `npm run evals` before/after any prompt change to detect regressions. Target: `schema_validity ≥ 1.0`, `justification_coherence ≥ 0.75`.

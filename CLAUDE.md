# KanoLens v2

AI-powered competitive analysis using the Kano Model (Dan Olsen's benefits-focused framing). Users drop in product context, the app proposes a competitor scope, then builds an interactive Kano table with fully-cited ratings streamed live.

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Router + TanStack Query + Zustand
- **Backend**: Hono on Node (tsx in dev, esbuild bundle in prod)
- **DB**: Postgres + Drizzle ORM
- **AI**: Claude Sonnet 4.6 (agent loop) + Claude Haiku 4.5 (source verifier), via `@anthropic-ai/sdk`, with prompt caching on the methodology PDFs and the built-in `web_search` tool.
- **Streaming**: Native Server-Sent Events (no WebSocket)
- **Auth**: Google OAuth → JWT in HTTP-only cookie (via `jose`)

## Dev commands

- `npm install` — install deps
- `npm run dev` — starts Vite (`:5173`) and Hono (`:3001`) concurrently; Vite proxies `/api` → Hono
- `npm run db:push` — push Drizzle schema to `DATABASE_URL`
- `npm run db:studio` — Drizzle Studio UI
- `npm run check` — `tsc --noEmit`
- `npm run test` — Vitest unit/integration
- `npm run e2e` — Playwright end-to-end
- `npm run build` — prod build (web → `dist/web`, server → `dist/server.js`)
- `npm start` — run prod build

## Key files

- `docs/methodology/kano-instructions.md` — **authoritative methodology**, loaded verbatim as the Analyst's system prompt. Never paraphrased by the LLM.
- `docs/methodology/kano-instructions.pdf`, `competitive-analysis.pdf` — same methodology in PDF, attached to the Claude message with `cache_control: ephemeral`.
- `docs/prd.md` — product requirements.
- `server/agents/analyst.ts` — single Claude Sonnet 4.6 agent loop with 5 tools.
- `server/agents/verifier.ts` — Haiku per-citation verifier.
- `server/db/schema.ts` — 3 tables: `users`, `sessions`, `analyses`.
- `src/components/kano/KanoTable.tsx` — centerpiece UI (ported intact from v1).
- `src/routes/` — TanStack Router file-based routes.

## Kano rules (enforced in the system prompt — do not relax)

- Three categories only: **Must-Have**, **Performance Benefit**, **Delighter**. No Indifferent/Reverse.
- Rows describe **customer benefits**, not raw features. ("Easy third-party app connections — saves developer time," not "API integration.")
- Scoring: **Yes / Maybe / No / Cannot Verify** for Must-Haves + Delighters. **High / Medium / Low** (+ Maybe variants) for Performance Benefits.
- Every rating needs a **source URL + access date**. No citation → rating must be `Cannot Verify`.
- Tables: 8–12 features initially, 50 hard cap.

## Rebuild context

v2 is a clean rewrite. For decision history, phase checklist, and pick-up-here instructions if context resets, see [`REBUILD_LOG.md`](./REBUILD_LOG.md). For the original plan, see `C:\Users\jnlan\.claude\plans\this-is-an-old-happy-shamir.md`.

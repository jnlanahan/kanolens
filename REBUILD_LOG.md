# KanoLens v2 Rebuild — Live Log

**Branch:** `kanolens-v2` (branched from `main` at `25d421f`)
**Plan:** `C:\Users\jnlan\.claude\plans\this-is-an-old-happy-shamir.md` (user-approved)
**Purpose:** Clean rebuild of KanoLens. The v1 codebase was vibe-coded and didn't work reliably. v2 strips it to the brand + methodology + centerpiece KanoTable UI and rebuilds the agent pipeline with Claude Sonnet 4.6, a single agentic loop instead of 5 loosely-coupled agents.

---

## Decision record

### Rewrite, not refactor
The v1 codebase was ~12k LOC of backend for what is effectively a single-user doc-in → table-out tool. Three files alone (`orchestrator.ts` 1,199 LOC, `researcher.ts` 1,059, `validator.ts` 1,041) were 2–3x the right size. Duplicate implementations (`researcher-improved.ts` unused, `repository-service.ts` unused), mixed AI providers (OpenAI `gpt-4o` + old Claude 3.5), 4 auth mechanisms for a single-user app, 604-LOC monitoring collecting metrics nobody read. Refactor would take longer and produce something the user already dislikes.

### Stack (locked)
| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind + shadcn/ui | Kept shadcn from v1 — works. React 19 for latest. |
| Router | TanStack Router | File-based, typed, better than wouter. |
| Client state | TanStack Query (server) + Zustand (wizard) | No more localStorage bridge. |
| Backend | Hono on Node | Lighter than Express, fully typed, clean SSE. |
| AI | Claude Sonnet 4.6 (reasoning) + Haiku 4.5 (source verify) | Single provider. Prompt caching for the methodology PDFs. Anthropic's built-in web search tool replaces Perplexity. |
| Streaming | Native SSE | Simpler than WebSocket for one-way progress streams. |
| DB | Postgres + Drizzle | Kept. Schema reduced from ~10 tables to 3. |
| Auth v1 | Google OAuth, JWT in HTTP-only cookie | POC-ready, scales to multi-tenant by flipping allowlist off. |

### Agent architecture (simplified 5 → 1 loop)
Replaced the v1 Orchestrator → Researcher → Validator → Analyst → Evaluator pipeline with a **single Claude Sonnet 4.6 agent loop** that uses these tools:

1. `web_search` — Anthropic's built-in web search (replaces 500 LOC of Perplexity + rate-limiter code)
2. `fetch_url` — primary-source verification (official docs, G2/Capterra)
3. `propose_scope` — writes products/features/customer to session, pauses for user confirmation
4. `upsert_feature_row` — streams one Kano row at a time via SSE
5. `finalize_table` — commits to Postgres

The `docs/methodology/kano-instructions.pdf` + `competitive-analysis.pdf` are attached to the system prompt with `cache_control: ephemeral` so they're cached across turns. The Kano categorization rules, the Yes/Maybe/No/Cannot-Verify scoring, and the anti-hallucination rules are loaded **verbatim** from `docs/methodology/kano-instructions.md` — no paraphrasing by the LLM.

A cheap Haiku 4.5 sub-call handles per-citation source verification (`verified | maybe | cannot_verify`). This replaces the v1 Validator, which had been reduced to hard-coded rules pretending to be "intelligent."

### Kano fidelity (non-negotiable)
- **3 categories only**: Must-Have, Performance Benefit, Delighter (Dan Olsen's simplified framing; no Indifferent/Reverse).
- **Benefits language, not features**: Every row describes the customer benefit ("Easy third-party app connections — saves developer time"), not the raw feature ("API integration").
- **Scoring scale**: Yes / Maybe / No / Cannot Verify for Must-Haves + Delighters; High / Medium / Low (+Maybe variants) for Performance Benefits.
- **Citations required**: Every rating carries a source URL + access date; no citation = rating must be "Cannot Verify."
- **Table caps**: 8–12 features initial; 50 hard cap.

---

## Repository layout (target)

```
/
├── src/                         # React app (Vite root = repo root)
│   ├── main.tsx
│   ├── index.css                # ported from v1 — kano-* palette
│   ├── App.tsx
│   ├── router.tsx               # TanStack Router
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx            # Landing
│   │   ├── new.tsx              # Step 1: input
│   │   ├── scope.$sessionId.tsx # Step 2: review AI-proposed scope
│   │   ├── run.$sessionId.tsx   # Step 3: live streaming table build
│   │   └── report.$sessionId.tsx# Step 4: final editable table
│   ├── components/
│   │   ├── ui/                  # shadcn primitives
│   │   ├── brand/LensLogo.tsx   # recreated minimal SVG
│   │   └── kano/
│   │       ├── KanoTable.tsx    # ported from v1
│   │       └── FeatureModal.tsx # ported from v1
│   ├── lib/
│   │   ├── api.ts               # typed client for Hono routes
│   │   └── utils.ts             # cn() helper
│   └── store/
│       └── wizard.ts            # Zustand — ephemeral wizard state
├── server/                      # Hono backend (tsx in dev, bundled by esbuild for prod)
│   ├── index.ts                 # Hono bootstrap + CORS + /health
│   ├── env.ts                   # zod-validated env
│   ├── routes/
│   │   ├── auth.ts              # Google OAuth callback, JWT cookie
│   │   ├── session.ts           # CRUD for analysis sessions
│   │   └── analysis.ts          # POST /analysis/:id/start + GET /analysis/:id/stream (SSE)
│   ├── agents/
│   │   ├── prompts.ts           # loads docs/methodology/kano-instructions.md + PDFs
│   │   ├── analyst.ts           # Claude Sonnet 4.6 loop with 5 tools
│   │   └── verifier.ts          # Claude Haiku 4.5 per-citation verifier
│   ├── db/
│   │   ├── schema.ts            # 3 tables: users, sessions, analyses
│   │   └── client.ts            # postgres + drizzle
│   └── lib/
│       ├── sse.ts               # SSE helpers for Hono
│       └── auth.ts              # JWT sign/verify
├── docs/
│   ├── methodology/
│   │   ├── kano-instructions.pdf     # user-directed keeper
│   │   ├── kano-instructions.md      # transcript — loaded as system prompt
│   │   └── competitive-analysis.pdf  # user-directed keeper
│   └── prd.md                        # original PRD
├── .preserve/                   # NOT COMMITTED — staging for in-flight porting
│   ├── KanoTable.tsx
│   ├── FeatureModal.tsx
│   └── index.css
├── CLAUDE.md                    # fresh, short
├── REBUILD_LOG.md               # this file
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json              # shadcn config
├── drizzle.config.ts
├── index.html                   # Vite entry
├── .env
├── .env.example
└── .gitignore
```

---

## Phases

- [x] **Phase 0.a** — Branch + preserve artifacts (docs/methodology, docs/prd.md)
- [x] **Phase 0.b** — Strip cruft (root docs, attached_assets 92 files, server/, client/, shared/, scripts/, old root configs)
- [x] **Phase 0.c** — Scaffold fresh stack (package.json, configs, index.html, shadcn primitives, ported KanoTable, Hono skeleton). `npm run check` clean, Vite on :5173 and Hono on :3001 both boot.
- [x] **Phase 1** — Agent system built: `server/agents/prompts.ts` (methodology as cached system block), `verifier.ts` (Haiku source check), `scope-proposer.ts` (Sonnet + structured output via zod), `analyst.ts` (Sonnet streaming loop with 3 tools: `web_search_20250305`, custom `upsert_feature_row`, custom `finalize_table`), `event-bus.ts` (in-memory SSE event fanout). 8 vitest tests pass, including an end-to-end analyst loop test with mocked Claude. Design choices: 2-phase (scope → analyst) instead of one loop with pause; verifier runs inside `upsert_feature_row` tool handler, all-cannot-verify sources downgrade ratings automatically; `web_search` uses the standard (non-dynamic) variant since we only need search, not in-browser filtering.
- [x] **Phase 2** — Backend plumbing complete: 3-table Drizzle schema (`users`, `sessions`, `analyses`), Postgres client via `postgres-js`, JWT auth via `jose` in HTTP-only cookie, `/api/auth/google` + `/api/auth/google/callback` + `/api/auth/dev` (dev-only bypass) + `/api/auth/logout` + `/api/auth/me`, session CRUD at `/api/sessions`, and the full analysis flow at `/api/analysis/:id/{scope,start,stream}`. SSE endpoint drains `event-bus` with 15s heartbeats. `npm run check` clean, Hono boots on `:3001`, `/api/sessions` returns 401 without auth cookie. **Migration not yet run against a live Postgres** — see Running below for `npm run db:push`.
- [ ] **Phase 3** — Frontend wizard (`/`, `/new`, `/scope/:id`, `/run/:id`, `/report/:id`) with ported KanoTable rendering streamed rows  ← **YOU ARE HERE**
- [ ] **Phase 4** — Polish (loading/error/empty states, a11y, responsive, Playwright e2e against mocked Anthropic SSE)

---

## Commit ledger (Phase 0)

| Commit | What |
|---|---|
| `25d421f` | `chore: freeze efficiency-pass WIP before v2 rebuild` (main — last v1 state) |
| `1fc3ee0` | `chore: preserve Kano methodology + PRD under docs/ for v2` |
| `6baf8fc` | `chore: remove root-level cruft for v2 rebuild` (15 files, -2533 lines) |
| `3bee51f` | `chore: remove .config and reports dirs` (4 files, -52k lines of bundle reports) |
| `da94eb3` | `chore: remove attached_assets (90+ screenshots + pasted logs)` (92 files, -2367 lines) |
| `682d922` | `chore: remove LLM-generated docs/ cruft` (18 files, -8894 lines) |
| `89f1f60` | `chore: remove server/ and shared/ for v2 rewrite` |
| `3f426bd` | `chore: remove client/ for v2 rewrite` |
| `5137514` | `chore: remove root configs and scripts for v2 scaffold` |

Net so far: **~66k lines deleted**, clean slate established.

---

## Remaining work (pick-up-here checklist)

If context gets reset, resume from here. Items are in dependency order.

### Phase 0.c — Scaffold (in progress)

1. **Root configs** — write:
   - `tsconfig.json` (strict, paths `@/` → `src/*`, `@server/` → `server/*`, `@docs/` → `docs/*`)
   - `tsconfig.node.json` (for vite.config.ts)
   - `vite.config.ts` (React + TanStack Router plugin, proxy `/api` → `http://localhost:3001`)
   - `tailwind.config.ts` (content: `./index.html`, `./src/**/*`; extend with kano-* tokens from ported index.css)
   - `postcss.config.js`
   - `components.json` (shadcn: default style, slate base, css vars, aliases matching tsconfig)
   - `drizzle.config.ts` (pg, schema → `server/db/schema.ts`, out → `./drizzle`)
   - `index.html` (Vite entry, `<div id="root">`, basic meta)
   - `.env.example` (DATABASE_URL, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, PORT)
   - Fresh **CLAUDE.md** (short — project purpose, dev commands, key files)

2. **App entry** — write:
   - `src/main.tsx` (renders App inside QueryClientProvider + RouterProvider)
   - `src/App.tsx` (minimal shell + `<Toaster />`)
   - `src/index.css` — copy `.preserve/index.css` and add shadcn `@layer base` vars
   - `src/lib/utils.ts` (`cn` helper)

3. **shadcn primitives** — hand-author the ones we need (no CLI, avoid network):
   - `src/components/ui/button.tsx`
   - `src/components/ui/card.tsx`
   - `src/components/ui/badge.tsx`
   - `src/components/ui/dialog.tsx`
   - `src/components/ui/input.tsx`
   - `src/components/ui/label.tsx`
   - `src/components/ui/textarea.tsx`
   - `src/components/ui/tooltip.tsx`
   - `src/components/ui/skeleton.tsx`

4. **Port UI** from `.preserve/`:
   - `src/components/kano/KanoTable.tsx` (update imports: `@shared/schema` → `@/lib/kano-types`; drop the toast + chat-edit logic for now — comes back in Phase 3)
   - `src/components/kano/FeatureModal.tsx`
   - `src/lib/kano-types.ts` — define `KanoTableData`, `KanoFeature`, rating types extracted from the two ported files

5. **Brand** — write:
   - `src/components/brand/LensLogo.tsx` (minimal overlapping circles SVG, blue→violet gradient per PRD)

6. **Hono skeleton** — write:
   - `server/env.ts` (zod-validated env)
   - `server/index.ts` (Hono app + `@hono/node-server` listen on `PORT`, `/health` route, CORS, request logging)
   - Verify `npm run dev:api` boots and `curl localhost:3001/health` returns `{ok:true}`.

7. **Sanity check**: `npm install && npm run check && npm run dev` — Vite serves blank `/` page, Hono responds on 3001, TS compiles clean. Commit.

### Phase 1 — Agent loop

1. `server/agents/prompts.ts` — reads the methodology MD + PDFs from `docs/methodology/` at boot, builds the cacheable system-prompt content block array (text + document + `cache_control: { type: "ephemeral" }`). Export `SYSTEM_PROMPT_BLOCKS`.
2. Define the 5 tool JSON-schemas (`web_search`, `fetch_url`, `propose_scope`, `upsert_feature_row`, `finalize_table`) in `server/agents/tools.ts`. `web_search` uses Anthropic's `{type: "web_search_20250305"}` server-side tool (no schema needed — just declare it).
3. `server/agents/analyst.ts` — `runAnalyst({sessionId, userInput, onEvent})`. Implements the loop: call `messages.create` with `stream: true`, handle `tool_use` deltas by dispatching to `fetch_url`/`propose_scope`/`upsert_feature_row`/`finalize_table`, feed results back via `tool_result`, `onEvent` emits each row as it's upserted.
4. `server/agents/verifier.ts` — `verifySource(claim, url)` → Haiku call returning `"verified" | "maybe" | "cannot_verify"`. Wire into `upsert_feature_row` tool handler.
5. CLI smoke test: `tsx server/agents/analyst.ts --scope '{"target":"eng leads","products":["Linear","Jira"]}'` prints streaming events.

### Phase 2 — Backend plumbing

1. `server/db/schema.ts` — 3 tables:
   ```
   users     (id uuid pk, email text unique, google_sub text unique, created_at)
   sessions  (id uuid pk, user_id fk, name text, status text, created_at, updated_at)
   analyses  (session_id fk pk, scope_json jsonb, table_json jsonb, sources_json jsonb, updated_at)
   ```
2. `server/db/client.ts` — `postgres(DATABASE_URL)` + `drizzle(client, { schema })`.
3. `drizzle-kit push` against local Postgres.
4. `server/lib/auth.ts` — `signJWT`, `verifyJWT` using `jose`. 7-day expiry.
5. `server/routes/auth.ts` — `/auth/google` (redirect), `/auth/google/callback` (exchange code → user email → upsert user → set JWT cookie).
6. `server/routes/session.ts` — `GET /sessions` (list user's), `POST /sessions` (create), `DELETE /sessions/:id`.
7. `server/routes/analysis.ts` — `POST /analysis/:id/start` (kicks off agent loop as detached promise), `GET /analysis/:id/stream` (SSE reading from an in-memory event bus keyed by session id).
8. `server/lib/sse.ts` — tiny event-bus + Hono SSE response helper.

### Phase 3 — Frontend wizard

1. `src/router.tsx` — TanStack Router config with file-based routes.
2. `src/routes/__root.tsx` — layout with LensLogo header + `<Outlet />`.
3. `src/routes/index.tsx` — landing (hero from `docs/prd.md`, "Start analysis" CTA → `/new`).
4. `src/routes/new.tsx` — form: textarea for context, optional file drop, "your product name" field. On submit: `POST /sessions` → navigate `/scope/:id` and kick off `POST /analysis/:id/start`.
5. `src/routes/scope.$sessionId.tsx` — reads SSE for the `propose_scope` event, renders editable list, on confirm → resumes agent (via a "resume" endpoint) and navigates to `/run/:id`.
6. `src/routes/run.$sessionId.tsx` — subscribes to SSE, renders `<KanoTable>` with rows appended as `upsert_feature_row` events arrive. When `finalize_table` arrives → navigates `/report/:id`.
7. `src/routes/report.$sessionId.tsx` — loads final `analyses` row, renders `<KanoTable>` + `<FeatureModal>` cell click-through. Inline-edit on cells. No exports v1.

### Phase 4 — Polish

1. Loading skeletons for each route (Suspense boundaries).
2. Error boundaries with retry CTAs.
3. A11y pass: keyboard nav on KanoTable, `aria-label` on category rows, focus trap in FeatureModal.
4. Responsive: desktop-first, tablet graceful, mobile is acceptable (per PRD non-goal).
5. `tests/e2e/flow.spec.ts` (Playwright): mocks Anthropic SSE to fixed fixture, walks `/` → `/new` → `/scope` → `/run` → `/report`, asserts table has ≥8 rows all with citations.
6. `tests/agents/prompts.test.ts`: snapshot the system-prompt content blocks, including cache-control flag.

---

## Environment setup

Create `.env` locally (not committed; `.env.example` is):
```
DATABASE_URL=postgres://kanolens:kanolens@localhost:5432/kanolens
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=<32+ random chars>
PORT=3001
WEB_PORT=5173
```

Google OAuth setup: Google Cloud Console → create OAuth 2.0 Client (Web app) → redirect URI `http://localhost:3001/auth/google/callback`. For deploy, add the prod URI.

Postgres locally: any managed or `docker run --name kanolens-pg -e POSTGRES_USER=kanolens -e POSTGRES_PASSWORD=kanolens -e POSTGRES_DB=kanolens -p 5432:5432 -d postgres:17`.

---

## Running

```
npm install
npm run db:push          # first time only
npm run dev              # web on :5173, api on :3001
```

Production:
```
npm run build
npm start
```

---

## Verification (from the plan)

End-to-end success: land on `/`, click "Start analysis," drop a PDF + enter "Linear-like task tracker, target engineering leads." Within 10s the scope page lists 3–5 competitors + 8–12 benefit rows all editable. Click "Run analysis," rows stream in live, every cell has a source chip or "Cannot Verify." Every rating has a clickable citation with URL + access date. No "API integration" style raw-feature phrasings. `npm run test` and `npm run check` both clean.

---

## Sources consulted

- Dan Olsen's Kano framing (benefits-focused, 3-bucket) — [Productboard summary](https://www.productboard.com/blog/dan-olsens-product-strategy-framework/), [The Lean Product Process](https://www.productbookshelf.com/2017/01/the-lean-product-process/)
- v1 methodology as captured in `docs/methodology/kano-instructions.md` — this is the authoritative source at runtime.

# Analyst Speedup — Live Log

**Branch:** `analyst-parallel` (branched from `main` at `ae686f0`)
**Plan:** `C:\Users\jnlan\.claude\plans\so-it-is-working-melodic-dream.md` (user-approved 2026-04-23)
**Purpose:** Cut Kano analyst wall time from ~10–15 min per run to ~2–3 min, without regressing output quality. User's quote at kickoff: *"I like the results I am getting but it is ridiculously slow."*

This log mirrors the cadence of [`REBUILD_LOG.md`](./REBUILD_LOG.md) — decisions first, then a phase checklist, then a commit ledger updated as changes land.

---

## Decision record

### Root cause of the slowness

[`server/agents/analyst.ts`](./server/agents/analyst.ts) before this change was a **single** Claude Sonnet 4.6 loop that walked 8–12 features **sequentially**. Each iteration did one `messages.create` with `max_tokens: 16000`, `thinking: adaptive`, `effort: high`, and the built-in `web_search` tool (`max_uses: 12`). Every feature's research + rating was serialized. The only parallelism was in `handleUpsert` (`Promise.all` over per-source Haiku verifiers). For 10 features × ~3–5 web searches each × serialized tool-use turns, wall time of 10+ minutes was **by design**.

### Chosen approach — 3 phases inside `runAnalyst`

| Phase | What | Model | Parallelism |
|---|---|---|---|
| A. Pre-pass | `gatherPrimarySources(scope)` returns a JSON map `{ product: [{url, purpose}] }` — canonical marketing / pricing / docs URLs per competitor | Sonnet 4.6 (`MODELS.analyst`) | single call |
| B. Fan-out | One `runFeatureAnalyst` per feature, each with its own `web_search` + `upsert_feature_row`, fed the pre-pass URLs as hints | Sonnet 4.6 (`MODELS.analyst`) | `Promise.allSettled` with `pLimit(5)` |
| C. Summary | Haiku call over the committed ratings + justifications, produces the ≤2-sentence table summary | Haiku 4.5 (`MODELS.verifier`) | single call |

### Why per-feature shard (not per-product)

Per-product would emit partial rows (one product's rating per row), forcing a merge step in the event-bus consumer. Per-feature emits a **complete row per event** — the existing collector in [`server/routes/analysis.ts`](./server/routes/analysis.ts) is keyed by `feature.id` with `Map.set`, so order-agnostic and merge-free. Zero route changes.

### Why the pre-pass

Naive per-feature fan-out loses the "I already saw Productboard's pricing page, that covers features 3 and 7" context the monolith enjoyed. Without it, 10 parallel agents would each redundantly search "Productboard pricing" → wasted web_search quota + possible quality regression as agents miss shared primary sources. The pre-pass pays for itself in search-quota savings alone, and addresses the single biggest quality-regression risk of naive fan-out. Cost: one ~10s Sonnet call.

### Why Haiku for summary

The summary step only needs to read the already-structured table (ratings + justifications) and produce 1–2 sentences. No grounding risk, no web content. Haiku is ~10× cheaper and ~3× faster than Sonnet for this kind of summarization — strictly the right tier.

### Why `pLimit(5)` (hand-rolled, no new dep)

- Sonnet 4.6 default tier RPM limits can choke at 10 concurrent agents each doing 3–4 tool-use turns.
- Anthropic's server-side `web_search` tool has per-org quota; capping concurrency flattens the burst.
- 5-wide fan-out still delivers most of the speedup: `ceil(10/5) × ~60–90s ≈ 2–3 min` wall time for 10 features.
- No dep needed — 10-line FIFO queue.

### Why per-feature failures publish a synthetic "Cannot Verify" row (NOT `type: "error"`)

The event bus ([`event-bus.ts:32-34`](./server/agents/event-bus.ts#L32-L34)) closes the stream on any `type: "error"` event. A single feature failure emitting `error` would swallow all subsequent rows. Instead, the coordinator catches `Promise.allSettled` rejections and publishes a `row` event with all products marked `Cannot Verify` and `justifications` set to "feature research failed" — the existing UI handles this gracefully.

### What we keep from the old design

- `buildSystemBlocks()` ([`prompts.ts:34-47`](./server/agents/prompts.ts#L34-L47)) — module-memoized methodology + `cache_control: ephemeral`. All N sub-agents share the same prompt cache; the pre-pass seeds it for free.
- `verifySource()` ([`verifier.ts`](./server/agents/verifier.ts)) — Haiku per-citation verifier. Unchanged.
- `handleUpsert`'s Cannot-Verify downgrade logic — moved verbatim from `analyst.ts` into `feature-analyst.ts`.
- `buildAnalystKickoff()` stays exported — unused by the new coordinator but kept to avoid churning the existing `prompts.test.ts` snapshots.

---

## Phase checklist

- [x] **Phase 0 — Git workflow:** commit outstanding `.claude/settings.local.json`, fast-forward `kanolens-v2` into `main` (already included `bac61dc` pglite-default fix and `c74e204` exploring-market mode), cut `analyst-parallel` branch.
- [ ] **Phase 1 — Prompts:** add `buildFeatureAnalystKickoff(scope, feature, siblingFeatureNames, primarySources)` and `buildSourcePrepassKickoff(scope)` to [`server/agents/prompts.ts`](./server/agents/prompts.ts). Non-breaking — existing `buildAnalystKickoff` stays.
- [ ] **Phase 2 — Pre-pass:** new file [`server/agents/source-prepass.ts`](./server/agents/source-prepass.ts) exporting `gatherPrimarySources(scope) → PrimarySourceMap`. Uses `messages.parse` + zod output schema (same pattern as [`scope-proposer.ts`](./server/agents/scope-proposer.ts)).
- [ ] **Phase 3 — Feature analyst:** new file [`server/agents/feature-analyst.ts`](./server/agents/feature-analyst.ts) exporting `runFeatureAnalyst({sessionId, scope, feature, primarySources}) → {committed, ratings, justifications, sources}`. Internally: `max_tokens: 8000`, `thinking: adaptive`, `max_uses: 4` on web_search, `MAX_ITERATIONS: 8`, no `finalize_table` tool. Includes moved `handleUpsert` as a module-private helper.
- [ ] **Phase 4 — Coordinator rewrite:** [`server/agents/analyst.ts`](./server/agents/analyst.ts) becomes the 3-phase coordinator. Delete old tool-use loop, keep exported `AnalystScope` and `AnalystResult` types.
- [ ] **Phase 5 — Tests:** rewrite [`server/agents/__tests__/analyst.test.ts`](./server/agents/__tests__/analyst.test.ts) to mock the fan-out: pre-pass call + N feature-analyst calls + summary call. Assert row ordering is irrelevant, failure of one feature doesn't abort.
- [ ] **Phase 6 — Live verification:** `npm run dev`, browser wizard flow, confirm rows stream within ~45s and complete within ~3 min.

---

## Commit ledger

| Commit | What |
|---|---|
| `ae686f0` | `chore: allow git merge * after session approval` (kanolens-v2 → main fast-forward tip) |
| _(pending Phase 1)_ | Add `buildFeatureAnalystKickoff` + `buildSourcePrepassKickoff` to prompts.ts |
| _(pending Phase 2-3)_ | Add `source-prepass.ts` + `feature-analyst.ts` |
| _(pending Phase 4-5)_ | Rewrite analyst.ts as coordinator + update tests |
| _(pending Phase 6)_ | Any post-verification fixes |

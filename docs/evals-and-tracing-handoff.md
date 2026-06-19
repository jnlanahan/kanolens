# KanoLens — LangSmith Handoff: Tracing Fix + Eval Plan

This document is a handoff for a developer. It covers two things:
1. The exact fix for LangSmith tracing (runs currently aren't being logged).
2. An opinionated eval plan grounded in what KanoLens actually does.

---

## Part 1 — Fix LangSmith tracing (runs aren't being logged)

### The problem
The app only enables tracing when an environment variable named **`LANGSMITH_TRACING`**
equals `true`. The current `.env` instead uses the **older LangChain names**
(`LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`). Because the names
don't match what the code checks, the tracing wrapper is silently skipped and
**live Claude calls are not being traced.**

The exact gate, in `server/lib/anthropic.ts` (line 11):
```ts
client = process.env.LANGSMITH_TRACING === "true" ? wrapAnthropic(base) : base;
```
There is no `LANGSMITH_TRACING` in `.env`, so this is always `false`.

### The fix (recommended: rename the vars in `.env`)
In the project's **`.env`** file, replace the three legacy lines with the new names.
**Keep the existing values** — only the names on the left change:

| Change this (current)             | To this                                          |
| --------------------------------- | ------------------------------------------------ |
| `LANGCHAIN_TRACING_V2=true`       | `LANGSMITH_TRACING=true`                         |
| `LANGCHAIN_API_KEY=lsv2_...`      | `LANGSMITH_API_KEY=lsv2_...` *(same key value)*  |
| `LANGCHAIN_PROJECT="KanoLens..."` | `LANGSMITH_PROJECT="KanoLens..."` *(same value)* |

The LangSmith API key value (`lsv2_...`) is correct as-is — only the variable
**name** is wrong.

### Steps
1. Edit `.env` as in the table above. Delete the old `LANGCHAIN_*` lines so there's no confusion.
2. **Restart the server** — env vars are only read at boot (`npm run dev` reads `.env`
   via `--env-file`). A hot reload is not enough.
3. **In production (Railway):** add the same three `LANGSMITH_*` variables in the
   service's Variables tab and redeploy.
4. **Verify:** sign in, run one analysis, then open https://smith.langchain.com → the
   **KanoLens** project. New traces for the analyst's Claude calls should appear within
   a few seconds. If nothing shows up, confirm the server was restarted and that
   `LANGSMITH_TRACING=true` is spelled exactly.

### Two things the fixer should know
- **More robust alternative (optional):** instead of (or in addition to) renaming env
  vars, make the code accept either name so this can't break again:
  ```ts
  const tracingOn =
    process.env.LANGSMITH_TRACING === "true" ||
    process.env.LANGCHAIN_TRACING_V2 === "true";
  client = tracingOn ? wrapAnthropic(base) : base;
  ```
  Still standardize `.env` on the `LANGSMITH_*` names to match `.env.example`.
- **Only Claude is traced.** The tracing wrapper (`wrapAnthropic`) is applied to
  Anthropic/Claude calls only. The **Gemini source-verifier** (`server/lib/google.ts`)
  is **not** instrumented, so verifier steps won't appear in traces. If full-pipeline
  visibility is wanted, wrap the Gemini calls with LangSmith's `traceable()` — a small
  additional task, separate from this fix.

---

## Part 2 — What evals KanoLens should have

### Framing for whoever builds these
KanoLens's entire value proposition is a **trustworthy, fully-cited** competitive
analysis built on the **Kano method**. So the evals must answer two questions above all else:
1. **Is it grounded, or is it making things up?** (citations real + actually support the
   claim; appropriate "Cannot Verify" instead of false confidence)
2. **Does it understand features the Kano way?** (correct category, framed as customer
   benefits, correct scoring scale)

The original suite had only two evaluators in `scripts/run-evals.ts`: `schema_validity`
(format checks) and `justification_coherence` (an LLM judge that reads the justification
vs. the rating). Those are a fine start but **neither one reads the actual cited
source**, so neither can catch the most dangerous failure: a real-looking URL that
doesn't say what the model claims.

> **Status (this revision).** The evals below marked **✅ built** have been implemented
> in `scripts/run-evals.ts`. The harness now runs **three passes** — feature analyst,
> scope proposer, and table summary — each with its own dataset. The two original
> evaluators are retained. Run everything with `npm run evals`.

Three real-world failures motivated this revision, all observed in production:
1. **"I told it my product's features, but the whole column came back 'Cannot Verify.'"**
   This was a *product bug*, not just a missing eval — the user's product description was
   never passed to the feature-analyst, and a coarse all-or-nothing rule then flipped the
   whole row to "Cannot Verify" whenever no external URL verified. Fixed (see *Bug fix*
   below) and guarded by the new `false_cannot_verify` eval.
2. **Wrong/weak competitors** proposed by the scope-proposer — nothing evaluated it.
3. **Irrelevant or non-discriminating features** proposed for comparison — the suite
   checked category and phrasing but never whether a feature was *worth comparing at all*.

Below is the full set, in priority tiers. "Method" tells you whether it's cheap
deterministic code, an LLM-judge, or needs human review.

### Tier P0 — the anti-hallucination / trust core

| #  | Eval                              | Status | What it measures                                                                                 | Why it matters here                                                                                       | Method                                                                                   |
| -- | --------------------------------- | ------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1  | **Citation faithfulness** (`citation_faithfulness`) | ✅ built | For each rating, fetch the cited source and judge: *does this page actually support this claim?*  | The real "are they researching or fabricating" test. Catches a valid URL whose content doesn't back it.  | LLM-judge that **fetches the source text** and scores it vs. the ratings+justifications. |
| 2  | **Source resolves / not fabricated** (`source_resolves`) | ✅ built | Fraction of cited URLs that actually load (HTTP 200, real page, not 404 / dead / invented domain). | Fabricated or dead links destroy the "fully-cited" promise. Cheap to run on every output.              | **Deterministic** — fetch each URL, check it loads.        |
| 3a | **False Cannot-Verify** (`false_cannot_verify`) | ✅ built | On examples where the user described their own product, does its column come back "Cannot Verify" on a benefit the description clearly covers? | **The user's #1 complaint** — under-claiming / ignoring what the user told the app. Regression guard for the bug fix below. | **Deterministic** — checks the user-product cell on flagged examples.   |
| 3b | **Abstains on fiction** (`abstains_on_fiction`) | ✅ built | When a *fabricated* product is in scope, does the analyst correctly abstain ("Cannot Verify"/"No") instead of inventing a confident rating? | The over-claim / hallucination direction. Paired with #1/#2, which catch any fake source it cites. | **Deterministic** — checks the fiction product's rating on trap examples. |
| 4  | **Kano category correctness**     | ⬜ todo | Is each feature put in the right bucket — Must-Have / Performance / Delighter — per the methodology? | "Ability to understand features." Mis-categorization makes the whole table misleading. Belongs on the **scope-proposer** (it assigns category), alongside #5/#9. | LLM-judge against `docs/methodology/kano-instructions.md`, and/or labeled ground truth.  |

### Bug fix shipped with this revision — "Cannot Verify all the way down"

Root cause was two-part, both now fixed:

1. **The user's product description never reached the analyst.** It was stored on the
   scope but dropped when building the analyst's input. Fixed by threading
   `userProductDescription` through `AnalystScope` → `FeatureScope` →
   `buildFeatureAnalystKickoff`, which now renders a `<user_product_context>` block so the
   analyst knows what the user's product actually does. (`server/agents/analyst.ts`,
   `server/agents/feature-analyst.ts`, `server/agents/prompts.ts`,
   `server/routes/analysis.ts`.)
2. **An all-or-nothing downgrade discarded everything.** In `handleUpsert`, if no cited
   source verified, *every* product in the row flipped to "Cannot Verify." Now the
   downgrade is **per-product** — each source carries an optional `products` list, and only
   products without their own verified source are downgraded. The **user's own product**
   may additionally be rated from its first-party description with no external URL
   (competitor columns still require external citations, preserving the "fully-cited"
   promise). (`server/agents/feature-analyst.ts`.)

`false_cannot_verify` (#3a) is the regression guard: it should read ~1.0 on the
user-product examples after this fix and would drop toward 0 if the bug regresses.

### Tier P1 — scope quality (elevated) + methodology discipline

> **Re-prioritized.** Scope quality is upstream — garbage scope poisons the whole table —
> so competitor relevance (#9) and feature-selection relevance (#9b) are elevated and were
> built first among the P1 set. Both run in the new scope-proposer pass.

| #  | Eval                          | Status | What it measures                                                                                       | Why it matters                                                                       | Method                                                |
| -- | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 9  | **Competitor / scope relevance** (`competitor_relevance`) | ✅ built | Are the proposed competitors real, current, and genuinely in the same space for the stated customer? | Garbage scope → garbage table. Was unevaluated. **(User concern #2.)** | LLM-judge over the proposed competitor set. |
| 9b | **Feature-selection relevance** (`feature_selection_relevance`) | ✅ built | Is each proposed feature relevant to the customer AND a *discriminating* axis (likely to differ across these products), not universal table-stakes? | Catches "these features aren't helpful to compare / wrong for this user." **(User concern #3.)** | LLM-judge per proposed feature. |
| 10 | **Summary faithfulness** (`summary_faithfulness`) | ✅ built | Does the AI-written 1–2 sentence table summary reflect the table and obey its constraints (no recommendations / speculation / URLs)? | The only AI-generated narrative output; was unevaluated. | LLM-judge over a fixture table + the real summary model. |
| 5  | **Benefit framing (not raw features)** | ⬜ todo | Are rows phrased as customer benefits ("saves dev time") rather than raw features ("API integration")? | An explicit, enforced product rule that's easy for the model to violate.            | LLM-judge rubric (on scope-proposer output).          |
| 6  | **Did-it-actually-search**    | ⬜ todo | Per feature: number of web-search tool calls; flag any confident rating produced with **zero** searches. | Directly measures "are they really researching." Easy once tracing (Part 1) is on. | **Deterministic from the trace** — count tool calls.  |
| 7  | **Source quality & diversity** | ⬜ todo | Are sources authoritative (official docs, pricing, reputable reviews) and varied, vs. marketing/blogspam or all one domain? | Real-but-weak sources are a subtler grounding failure than dead links. | LLM-judge on the source set.                          |
| 8  | **Scoring-scale correctness** | partial | Must-Have/Delighter use Yes/Maybe/No/Cannot Verify; Performance uses High/Med/Low(+Maybe). No banned categories. | Methodology integrity; covered by `schema_validity` today.  | **Deterministic.**                                    |

### Tier P2 — reliability, refinement, coverage (todo)

| #  | Eval                                | What it measures                                                                                       | Why it matters                                                            | Method                                            |
| -- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------- |
| 13 | **Cross-run stability**             | Run the same input twice; how much do categories and ratings drift?                                    | High drift means users can't trust a given table is "the" answer.        | Deterministic diff across two runs.               |
| 14 | **Refine fidelity & no-regression** | When a user edits via the refine chat, does it do exactly what was asked **without** corrupting ratings/citations on untouched rows? | The refine agent can silently damage a good table.          | LLM-judge + deterministic diff of untouched rows. |
| 15 | **Coverage & non-duplication**      | 8–12 distinct features, spanning categories (not all Must-Haves), no near-duplicates.                  | Product spec rule; affects how useful the table feels.                   | Deterministic + light LLM-judge for duplicates.   |

### Not evals — "Strategic Insights" and "At a Glance" are deterministic
A natural assumption is that the **Strategic Insights** panel and the **At a Glance**
banner are AI-generated and need evals. They are **not.** Both are computed by a
client-side rules engine — `detectInsights()` in
`src/components/kano/InsightsPanel.tsx`, consumed by `src/components/kano/TLDRBanner.tsx`.
They contain hardcoded thresholds (e.g. "≥75% of competitors High → trending to table
stakes") that are currently **untested**. The right tool here is **unit tests** over
`detectInsights()` — feed crafted tables and assert which insights fire — not LLM evals.
The only AI-written narrative on the report is the table **summary**, covered by #10.

### How to deploy these (offline vs. online)
- **Offline regression suite** (`npm run evals`) — now three passes:
  - *feature analyst:* `schema_validity`, `justification_coherence`, `citation_faithfulness`,
    `source_resolves`, `false_cannot_verify`, `abstains_on_fiction`.
  - *scope proposer:* `competitor_relevance`, `feature_selection_relevance`.
  - *table summary:* `summary_faithfulness`.
- **Online / production auto-scoring** (LangSmith rules that score real traces as users
  run them): `source_resolves`, `false_cannot_verify`, did-it-search (#6), and a sampled
  `citation_faithfulness`. These catch live regressions. *(Requires Part 1 tracing fixed first.)*
- **Kept:** `schema_validity` (folds in #8) and `justification_coherence` (a lightweight
  cousin of `citation_faithfulness` — useful, but reading the real source is the stronger signal).

### Dataset work — done, with room to grow
The harness now seeds **three datasets** in `scripts/run-evals.ts`:
- `kanolens-feature-analyst-v2` — the original 7 plus **user-product examples**
  (`expectedUserProductVerifiable`, powering `false_cannot_verify`) and an **abstention
  trap** (`expectFiction`, powering `abstains_on_fiction`).
- `kanolens-scope-proposer-v1` — product contexts for the scope-quality judges.
- `kanolens-summary-v1` — fixture tables for `summary_faithfulness`.

Still worth adding for fuller coverage: more abstention traps, **fast-moving features**
(recency, powers #6/#7), and a handful of **known-correct ratings** to measure raw
accuracy rather than only internal consistency.

### One-line summary to lead with
> The grounding core is now live: every citation is fetched and judged
> (`citation_faithfulness`), checked for resolution (`source_resolves`), and the model is
> measured both for **bluffing** (`abstains_on_fiction`) and for **ignoring what the user
> told it** (`false_cannot_verify`) — the latter paired with a code fix so the user's own
> product description finally reaches the analyst. Scope quality (`competitor_relevance`,
> `feature_selection_relevance`) and the table summary are now scored too. Remaining todo
> is mostly methodology polish (category correctness, benefit framing) and the P2 reliability set.

---

## Relevant files (for the developer)
- `server/lib/anthropic.ts` — the tracing gate (Part 1).
- `server/lib/google.ts` — Gemini verifier, currently un-traced.
- `scripts/run-evals.ts` — three-pass eval harness + the three datasets.
- `server/agents/feature-analyst.ts` — the analyst most evals score; holds the per-product downgrade + user-product-as-source logic.
- `server/agents/prompts.ts` — `buildFeatureAnalystKickoff` (renders `<user_product_context>`), `buildSummaryPrompt`.
- `server/agents/scope-proposer.ts` — targeted by `competitor_relevance` / `feature_selection_relevance`.
- `server/agents/refine-agent.ts` — targeted by eval #14.
- `src/components/kano/InsightsPanel.tsx` — `detectInsights()`; unit-test target (not an eval).
- `docs/methodology/kano-instructions.md` — authoritative Kano rules (ground truth for #4, #5, #8).
- `.env.example` — documents the correct `LANGSMITH_*` variable names.

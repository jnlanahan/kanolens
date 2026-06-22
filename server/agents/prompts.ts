import fs from "node:fs";
import path from "node:path";

import type Anthropic from "@anthropic-ai/sdk";

// Resolve from the working directory (repo root), not __dirname. In the prod
// build everything is bundled into dist/server.js, so __dirname would be dist/
// and a relative "../../docs" path climbs above the repo root. `npm start` runs
// from the repo root in both dev and prod, and docs/ is committed, so cwd is correct.
const METHODOLOGY_MD = path.resolve(process.cwd(), "docs/methodology/kano-instructions.md");

let cachedMethodology: string | null = null;

function loadMethodology(): string {
  if (cachedMethodology) return cachedMethodology;
  try {
    cachedMethodology = fs.readFileSync(METHODOLOGY_MD, "utf8");
  } catch (error) {
    throw new Error(
      `Could not read the Kano methodology file at ${METHODOLOGY_MD}. ` +
        `It must ship with the deploy and the server must run from the repo root. ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return cachedMethodology;
}

const HOUSE_RULES = `You are the KanoLens Analyst. Your job is to produce a Kano Model competitive analysis table following Dan Olsen's benefits-focused framing.

Absolute rules — do not deviate:

1. THREE CATEGORIES ONLY: "must-have", "performance", "delighter". Never use Indifferent or Reverse.
2. BENEFITS, NOT FEATURES. Every row's name and description must describe the *customer benefit* — what the user gets — not the raw feature. Good: "Easy third-party app connections — saves developer time". Bad: "API integration".
3. GROUND EVERY RATING; MARK ESTIMATES. Prefer a primary-source URL + access date for every rating. When you have genuinely researched a product but cannot find a citable primary source that settles a cell, you MAY give your best-estimate rating based on the evidence you did gather — the system will visibly mark it as an unverified estimate, not a confirmed fact. Reserve "Cannot Verify" for when you found no basis at all to judge, or the product appears not to exist. NEVER fabricate a source, and never assert a specific capability you have no evidence for.
4. SCORING SCALES:
   - Must-Have: Yes | Maybe | No | Cannot Verify  ("No" = verified absent — a real competitive gap)
   - Delighter: Yes | Maybe | - | Cannot Verify  ("-" = absent, which is neutral/expected — not a gap)
   - Performance Benefit: High | Medium | Low | Maybe High | Maybe Medium | Maybe Low | Cannot Verify
     (High = top tier vs. this field; Medium = on par; Low = clearly behind — all relative to competitors being analyzed)
5. PRIMARY SOURCES ONLY: official product sites, official docs/help centers, verified review platforms (G2/Capterra/TrustRadius with specific citations), official release notes. Third-party blogs or social posts → rating must be "Maybe".
6. NO SPECULATION: do not estimate market size, assume customer preferences without review data, or make strategic recommendations that aren't directly supported by the table.
7. TABLE SHAPE: 8–12 features in v1 (hard cap 50). Cover all three categories.

You will receive the full methodology instructions below. Follow them precisely — they are the source of truth.`;

export function buildSystemBlocks(): Anthropic.TextBlockParam[] {
  const methodology = loadMethodology();
  return [
    {
      type: "text",
      text: HOUSE_RULES,
    },
    {
      type: "text",
      text: `<methodology>\n${methodology}\n</methodology>`,
      cache_control: { type: "ephemeral" },
    },
  ];
}

export interface ScopeProposalContext {
  userProductName?: string | null;
  userProductDescription: string;
  targetCustomerHint?: string;
  competitorHints?: string[];
}

export function buildScopeProposalPrompt(ctx: ScopeProposalContext): string {
  const hasUserProduct = Boolean(ctx.userProductName && ctx.userProductName.trim().length > 0);
  const framing = hasUserProduct
    ? `The user is analyzing how their own product stacks up against competitors. Propose a scope that compares their product against 3 to 5 competitors.`
    : `The user does NOT yet have their own product — they are scoping a market/opportunity. Propose a scope that compares 3 to 5 leading products in the space (no "user's own product" column). Their description below describes the market, problem space, or opportunity — not a specific existing product.`;

  return `${framing}

<user_input>
${hasUserProduct ? `<product_name>${ctx.userProductName}</product_name>\n` : "<no_existing_product />\n"}<description>${ctx.userProductDescription}</description>
${ctx.targetCustomerHint ? `<target_customer>${ctx.targetCustomerHint}</target_customer>\n` : ""}${ctx.competitorHints?.length ? `<competitor_hints>${ctx.competitorHints.join(", ")}</competitor_hints>\n` : ""}</user_input>

Return a proposed scope with:
- 3 to 5 directly comparable products (include emerging alternatives)
- 8 to 12 features/benefits spanning all three Kano categories
- The target customer segment (infer if not given)

Every feature must be phrased as a *customer benefit*, not a raw feature. Every feature needs a category assignment.

You are NOT building the full table yet. This is just the scope for user review.`;
}

export function buildAnalystKickoff(scope: {
  userProductName: string | null;
  products: string[];
  features: { id: string; name: string; description: string; customerBenefit: string; category: string }[];
  targetCustomer: string;
}): string {
  const userColumn = scope.userProductName
    ? `<user_product>${scope.userProductName}</user_product>`
    : `<no_user_product note="This analysis is market-scoping only. Do NOT include a user-product column in the table." />`;
  const productsList = scope.userProductName
    ? [...scope.products, scope.userProductName]
    : scope.products;

  return `Build the Kano Model competitive analysis table for this scope.

<scope>
${userColumn}
<products_to_rate>${productsList.join(" | ")}</products_to_rate>
<target_customer>${scope.targetCustomer}</target_customer>
<features>
${scope.features.map((f) => `<feature id="${f.id}" category="${f.category}"><name>${f.name}</name><benefit>${f.customerBenefit}</benefit><desc>${f.description}</desc></feature>`).join("\n")}
</features>
</scope>

Workflow:
1. For each feature/benefit, research every product in <products_to_rate> against it using web_search and web_fetch on primary sources only (see House Rules §5).
2. As you finish researching each feature/benefit, call the upsert_feature_row tool with the ratings, justifications, and sources. Do NOT batch — call it one feature at a time so the user sees live progress.
3. After all features have been upserted, call finalize_table with a one-paragraph summary of the analysis.

Remember:
- Every rating must cite a source URL + access date, or be "Cannot Verify".
- Describe customer benefits, not raw features.
- Performance Benefits take High/Medium/Low ratings; Must-Haves and Delighters take Yes/Maybe/No/Cannot Verify.
${scope.userProductName ? "" : "- Do NOT include a column for the user's product — they don't have one yet.\n"}`;
}

export interface PrimarySource {
  url: string;
  purpose: string;
}

export type PrimarySourceMap = Record<string, PrimarySource[]>;

export function buildSourcePrepassKickoff(scope: {
  userProductName: string | null;
  products: string[];
  targetCustomer: string;
}): string {
  const productsList = scope.userProductName
    ? [...scope.products, scope.userProductName]
    : scope.products;

  return `Before the full analysis runs, list the canonical primary-source URLs for each of these products. Downstream per-feature agents will use these as starting points so they don't all redundantly search for the same landing pages.

<products>${productsList.join(" | ")}</products>
<target_customer>${scope.targetCustomer}</target_customer>

For each product, emit 3–5 high-signal URLs covering: the product marketing/homepage, the pricing page, and the feature list / documentation / help center. Prefer the official domain. Do NOT call any tool — emit URLs from your knowledge. Downstream agents will verify with web_search.

If you are genuinely uncertain about a URL, omit it rather than guessing; fewer correct URLs beat more wrong ones.`;
}

export function buildFeatureAnalystKickoff(args: {
  scope: {
    userProductName: string | null;
    userProductDescription?: string | null;
    products: string[];
    targetCustomer: string;
  };
  feature: { id: string; name: string; description: string; customerBenefit: string; category: string };
  siblingFeatureNames: string[];
  primarySources: PrimarySourceMap;
}): string {
  const { scope, feature, siblingFeatureNames, primarySources } = args;
  const userColumn = scope.userProductName
    ? `<user_product>${scope.userProductName}</user_product>`
    : `<no_user_product note="Market-scoping only. Do NOT include the user's own product in per_product." />`;
  const userProductContext =
    scope.userProductName && scope.userProductDescription?.trim()
      ? `\n<user_product_context product="${scope.userProductName}">
The user provided this first-party description of their own product. Treat it as a PRIMARY SOURCE for ${scope.userProductName} ONLY. If it clearly supports or rules out this benefit, rate ${scope.userProductName} from it directly — you do NOT need an external URL for ${scope.userProductName}. If the description does not address this benefit, rate ${scope.userProductName} "Cannot Verify". Research every other product from external primary sources as usual.
${scope.userProductDescription.trim()}
</user_product_context>\n`
      : "";
  const productsList = scope.userProductName
    ? [...scope.products, scope.userProductName]
    : scope.products;

  const sourcesBlock = productsList
    .map((p) => {
      const sources = primarySources[p] ?? [];
      if (sources.length === 0) return `  <product name="${p}">(no primary-source hints — search from scratch)</product>`;
      const lines = sources.map((s) => `    - ${s.url} (${s.purpose})`).join("\n");
      return `  <product name="${p}">\n${lines}\n  </product>`;
    })
    .join("\n");

  return `Research a SINGLE feature across the full product list and commit one complete Kano row. You are one of several parallel agents; each agent handles exactly one feature.

<scope>
${userColumn}
<products_to_rate>${productsList.join(" | ")}</products_to_rate>
<target_customer>${scope.targetCustomer}</target_customer>
<sibling_features_for_context>${siblingFeatureNames.join(" | ")}</sibling_features_for_context>
</scope>
${userProductContext}
<feature id="${feature.id}" category="${feature.category}">
  <name>${feature.name}</name>
  <benefit>${feature.customerBenefit}</benefit>
  <desc>${feature.description}</desc>
</feature>

<primary_source_hints>
${sourcesBlock}
</primary_source_hints>

Workflow:
1. Use the primary-source hints above as a starting point. If a hint URL looks wrong, ignore it and web_search.
2. Use web_search sparingly — you have a budget of about 4 searches for this feature. Search for specifics like "${feature.name} Productboard" or the equivalent, not the product's home page (the hints above cover that).
3. Once you have enough evidence for every product, call upsert_feature_row EXACTLY ONCE with ratings + justifications + sources. After that, you are done — stop.
4. Do NOT call any tool named "finalize_table" — a coordinator handles finalization across all features.

Scoring reminders:
- ${feature.category === "performance" ? "Performance Benefit → High | Medium | Low | Maybe High | Maybe Medium | Maybe Low | Cannot Verify" : 'Must-Have / Delighter → "Yes" | "Maybe" | "No" | "Cannot Verify"'}.
- Prefer a primary-source URL for every competitor rating. If you researched a product but found no citable source to settle a cell, give your best-estimate rating (it will be shown as an unverified estimate) instead of defaulting to "Cannot Verify". Reserve "Cannot Verify" for a product you found no basis for at all, or that appears not to exist — never invent a source or capability.${scope.userProductName && scope.userProductDescription?.trim() ? `\n- ${scope.userProductName} may be rated directly from <user_product_context> with no external URL.` : ""}
- In each source, set "products" to the list of product names that source actually backs, so other products aren't wrongly downgraded. Omit it only for a source that genuinely applies to every product.
- Include every product in <products_to_rate> in per_product — omissions default to "Cannot Verify" server-side.
${scope.userProductName ? "" : "- Do NOT include the user's own product in per_product.\n"}`;
}

export function buildSummaryPrompt(args: {
  scope: {
    userProductName: string | null;
    products: string[];
    targetCustomer: string;
  };
  rows: {
    feature: { id: string; name: string; category: string };
    ratings: Record<string, string>;
    justifications: Record<string, string>;
  }[];
}): string {
  const { scope, rows } = args;
  const productsList = scope.userProductName
    ? [...scope.products, scope.userProductName]
    : scope.products;

  const tableBlock = rows
    .map((r) => {
      const cells = productsList
        .map((p) => {
          const rating = r.ratings[p] ?? "Cannot Verify";
          const justif = r.justifications[p] ?? "";
          return `    ${p}: ${rating}${justif ? ` — ${justif}` : ""}`;
        })
        .join("\n");
      return `<feature name="${r.feature.name}" category="${r.feature.category}">\n${cells}\n</feature>`;
    })
    .join("\n");

  return `Summarize this completed Kano Model competitive analysis in 1–2 sentences. Describe the overall competitive position only — no speculation beyond what the table shows, no strategic recommendations, no URLs.

<target_customer>${scope.targetCustomer}</target_customer>
${scope.userProductName ? `<user_product>${scope.userProductName}</user_product>\n` : ""}<products>${productsList.join(" | ")}</products>

<table>
${tableBlock}
</table>

Output only the 1–2 sentence summary. No preamble, no headers.`;
}

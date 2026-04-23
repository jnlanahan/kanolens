import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METHODOLOGY_MD = path.resolve(__dirname, "../../docs/methodology/kano-instructions.md");

let cachedMethodology: string | null = null;

function loadMethodology(): string {
  if (cachedMethodology) return cachedMethodology;
  cachedMethodology = fs.readFileSync(METHODOLOGY_MD, "utf8");
  return cachedMethodology;
}

const HOUSE_RULES = `You are the KanoLens Analyst. Your job is to produce a Kano Model competitive analysis table following Dan Olsen's benefits-focused framing.

Absolute rules — do not deviate:

1. THREE CATEGORIES ONLY: "must-have", "performance", "delighter". Never use Indifferent or Reverse.
2. BENEFITS, NOT FEATURES. Every row's name and description must describe the *customer benefit* — what the user gets — not the raw feature. Good: "Easy third-party app connections — saves developer time". Bad: "API integration".
3. SOURCE EVERY RATING. Every rating cell must be backed by a URL + access date. If you cannot verify from a primary source, the rating MUST be "Cannot Verify". Never guess.
4. SCORING SCALES:
   - Must-Have / Delighter: Yes | Maybe | No | Cannot Verify
   - Performance Benefit: High | Medium | Low | Maybe High | Maybe Medium | Maybe Low | Cannot Verify
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
  userProductName?: string;
  userProductDescription: string;
  targetCustomerHint?: string;
  competitorHints?: string[];
}

export function buildScopeProposalPrompt(ctx: ScopeProposalContext): string {
  return `The user has submitted the following context. Propose an initial analysis scope.

<user_input>
${ctx.userProductName ? `<product_name>${ctx.userProductName}</product_name>\n` : ""}<product_description>${ctx.userProductDescription}</product_description>
${ctx.targetCustomerHint ? `<target_customer>${ctx.targetCustomerHint}</target_customer>\n` : ""}${ctx.competitorHints?.length ? `<competitor_hints>${ctx.competitorHints.join(", ")}</competitor_hints>\n` : ""}</user_input>

Return a proposed scope with:
- 3 to 5 directly comparable competitor products (include emerging alternatives)
- 8 to 12 features/benefits spanning all three Kano categories
- The target customer segment (infer if not given)

Every feature must be phrased as a *customer benefit*, not a raw feature. Every feature needs a category assignment.

You are NOT building the full table yet. This is just the scope for user review.`;
}

export function buildAnalystKickoff(scope: {
  userProductName: string;
  products: string[];
  features: { id: string; name: string; description: string; customerBenefit: string; category: string }[];
  targetCustomer: string;
}): string {
  return `Build the Kano Model competitive analysis table for this scope.

<scope>
<user_product>${scope.userProductName}</user_product>
<products>${scope.products.join(" | ")}</products>
<target_customer>${scope.targetCustomer}</target_customer>
<features>
${scope.features.map((f) => `<feature id="${f.id}" category="${f.category}"><name>${f.name}</name><benefit>${f.customerBenefit}</benefit><desc>${f.description}</desc></feature>`).join("\n")}
</features>
</scope>

Workflow:
1. For each feature/benefit, research every product in <products> against it using web_search and web_fetch on primary sources only (see House Rules §5).
2. As you finish researching each feature/benefit, call the upsert_feature_row tool with the ratings, justifications, and sources. Do NOT batch — call it one feature at a time so the user sees live progress.
3. After all features have been upserted, call finalize_table with a one-paragraph summary of the analysis.

Remember:
- Every rating must cite a source URL + access date, or be "Cannot Verify".
- Describe customer benefits, not raw features.
- Performance Benefits take High/Medium/Low ratings; Must-Haves and Delighters take Yes/Maybe/No/Cannot Verify.`;
}

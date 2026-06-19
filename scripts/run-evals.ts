import "dotenv/config";

import Anthropic from "@anthropic-ai/sdk";
import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import type { EvaluationResult } from "langsmith/evaluation";

import { clearStream } from "../server/agents/event-bus";
import {
  runFeatureAnalyst,
  type FeatureAnalystResult,
  type FeatureScope,
  type FeatureDescriptor,
} from "../server/agents/feature-analyst";
import { proposeScope, type ScopeProposal } from "../server/agents/scope-proposer";
import { buildSummaryPrompt } from "../server/agents/prompts";
import { getAnthropicClient, MODELS } from "../server/lib/anthropic";

// ─── Shared judge helper ────────────────────────────────────────────────────────
// Always judge with Haiku — never grade an output with the same model that made it.

const JUDGE_MODEL = "claude-haiku-4-5-20251001";

async function judge(prompt: string): Promise<{ score: number; reason: string } | null> {
  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "{}";
    const match = raw.match(/\{[\s\S]*?\}/);
    const parsed = match ? (JSON.parse(match[0]) as { score?: number; reason?: string }) : {};
    if (typeof parsed.score !== "number") return null;
    return {
      score: Math.min(10, Math.max(0, parsed.score)) / 10,
      reason: parsed.reason ?? "",
    };
  } catch (err) {
    console.warn("[judge] failed:", err);
    return null;
  }
}

async function fetchPageText(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "KanoLens-Eval/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3500);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function urlResolves(url: string, timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "KanoLens-Eval/1.0" },
      redirect: "follow",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// PASS 1 — Feature analyst (the agent that fills the table)
// ════════════════════════════════════════════════════════════════════════════════

const FEATURE_DATASET = "kanolens-feature-analyst-v2";

interface EvalInputs {
  scope: FeatureScope;
  feature: FeatureDescriptor;
  siblingFeatureNames: string[];
  /** When the user described their own product and this benefit is clearly covered,
   *  the user-product column should NOT come back "Cannot Verify". Powers false_cannot_verify. */
  expectedUserProductVerifiable?: boolean;
  /** Name of a fabricated product in `products`. A faithful analyst must abstain on it. */
  expectFiction?: string;
}

const FEATURE_EXAMPLES: Array<{ inputs: EvalInputs }> = [
  // 1. Must-have — team messaging (all three products clearly support it)
  {
    inputs: {
      scope: {
        userProductName: null,
        products: ["Slack", "Microsoft Teams", "Discord"],
        targetCustomer: "remote software engineering teams",
      },
      feature: {
        id: "real-time-messaging",
        name: "Instant team messaging with threaded replies",
        description: "Send messages and organize replies in focused thread structures",
        customerBenefit: "Teams can have focused async conversations without cluttering main channels",
        category: "must-have",
      },
      siblingFeatureNames: [],
    },
  },
  // 2. Must-have — mobile app (all project management tools have one)
  {
    inputs: {
      scope: {
        userProductName: null,
        products: ["Asana", "Monday.com", "ClickUp"],
        targetCustomer: "project managers at mid-size companies",
      },
      feature: {
        id: "mobile-app",
        name: "Native iOS and Android app for on-the-go management",
        description: "Full-featured mobile application for managing tasks and projects",
        customerBenefit: "Managers can approve, update, and track projects from anywhere without a laptop",
        category: "must-have",
      },
      siblingFeatureNames: [],
    },
  },
  // 3. Performance — video call quality (visible differences between products)
  {
    inputs: {
      scope: {
        userProductName: null,
        products: ["Zoom", "Google Meet", "Microsoft Teams"],
        targetCustomer: "distributed teams running daily standups and client calls",
      },
      feature: {
        id: "video-call-quality",
        name: "HD video quality on poor or unstable networks",
        description: "Clear video even when participants have weak internet connections",
        customerBenefit: "Meetings stay productive when team members have poor connectivity",
        category: "performance",
      },
      siblingFeatureNames: [],
    },
  },
  // 4. Performance — roadmap views (Linear vs Jira vs Notion show differentiation)
  {
    inputs: {
      scope: {
        userProductName: null,
        products: ["Linear", "Jira", "Notion"],
        targetCustomer: "product teams tracking quarterly roadmaps",
      },
      feature: {
        id: "roadmap-views",
        name: "Visual timeline-based roadmap planning",
        description: "Gantt or timeline views showing work planned across quarters",
        customerBenefit: "Teams communicate priorities and sequencing to stakeholders at a glance",
        category: "performance",
      },
      siblingFeatureNames: [],
    },
  },
  // 5. Delighter — AI meeting summaries (emerging, differentiation visible)
  {
    inputs: {
      scope: {
        userProductName: null,
        products: ["Zoom", "Google Meet", "Microsoft Teams"],
        targetCustomer: "enterprise teams trying to reduce meeting overhead",
      },
      feature: {
        id: "ai-meeting-summaries",
        name: "Automatic AI-generated post-meeting summaries",
        description: "AI summarizes key decisions and action items after meetings end",
        customerBenefit: "People who missed meetings save time without reading full transcripts",
        category: "delighter",
      },
      siblingFeatureNames: [],
    },
  },
  // 6. Delighter — real-time multiplayer design (Figma clearly leads)
  {
    inputs: {
      scope: {
        userProductName: null,
        products: ["Figma", "Adobe XD", "Sketch"],
        targetCustomer: "product design teams collaborating on UI designs",
      },
      feature: {
        id: "multiplayer-design",
        name: "Real-time multiplayer design with live cursors",
        description: "Multiple designers work in the same file simultaneously",
        customerBenefit: "Teams design together without waiting for handoffs or merge conflicts",
        category: "delighter",
      },
      siblingFeatureNames: [],
    },
  },
  // 7. Edge case — SSO on mixed-maturity products (Basecamp may Cannot Verify)
  {
    inputs: {
      scope: {
        userProductName: null,
        products: ["Notion", "Coda", "Basecamp"],
        targetCustomer: "small teams managing internal documentation and projects",
      },
      feature: {
        id: "sso-saml",
        name: "Enterprise SSO and SAML authentication",
        description: "Support for SAML 2.0 and enterprise single sign-on providers",
        customerBenefit: "IT teams manage employee access centrally without separate password management",
        category: "must-have",
      },
      siblingFeatureNames: [],
    },
  },
  // 8. USER-PRODUCT — the user described their own product; its column must NOT be
  //    "Cannot Verify" on a benefit the description plainly covers. (Regression guard
  //    for the "Cannot Verify all the way down" bug.)
  {
    inputs: {
      scope: {
        userProductName: "Tella",
        userProductDescription:
          "Tella is a browser-based screen recorder for creators. It records your screen and webcam at the same time and lets you arrange them in side-by-side or picture-in-picture layouts. It adds animated zoom, one-click background music, customizable backgrounds, and exports up to 4K.",
        products: ["Loom", "Vidyard", "ScreenPal"],
        targetCustomer: "creators and founders recording product demos and tutorials",
      },
      feature: {
        id: "camera-screen-layouts",
        name: "Flexible camera-and-screen layouts",
        description: "Arrange the webcam and screen in side-by-side or picture-in-picture layouts",
        customerBenefit: "Creators produce a polished demo without opening a video editor",
        category: "performance",
      },
      siblingFeatureNames: ["One-click background music", "Animated zoom", "4K export"],
      expectedUserProductVerifiable: true,
    },
  },
  // 9. USER-PRODUCT — must-have the description clearly addresses.
  {
    inputs: {
      scope: {
        userProductName: "Tella",
        userProductDescription:
          "Tella is a browser-based screen recorder for creators. It records your screen and webcam at the same time and exports finished videos up to 4K. No software install is required — it runs entirely in the browser.",
        products: ["Loom", "Vidyard", "ScreenPal"],
        targetCustomer: "creators and founders recording product demos and tutorials",
      },
      feature: {
        id: "no-install-recording",
        name: "Record with no software to install",
        description: "Start recording directly in the browser with nothing to download",
        customerBenefit: "New users start recording in seconds without IT or downloads",
        category: "must-have",
      },
      siblingFeatureNames: ["Side-by-side layouts", "4K export"],
      expectedUserProductVerifiable: true,
    },
  },
  // 10. ABSTENTION TRAP — one product is fabricated. A faithful analyst must rate it
  //     "Cannot Verify" (or "No"), not invent a confident rating or a fake source.
  {
    inputs: {
      scope: {
        userProductName: null,
        products: ["Notion", "Quillenova Docs 7", "Coda"],
        targetCustomer: "small teams managing internal documentation",
      },
      feature: {
        id: "doc-templates",
        name: "Ready-made document templates",
        description: "A library of starter templates for common document types",
        customerBenefit: "Teams start documents fast without building structure from scratch",
        category: "must-have",
      },
      siblingFeatureNames: [],
      expectFiction: "Quillenova Docs 7",
    },
  },
];

const MUST_HAVE_DELIGHTER_RATINGS = new Set(["Yes", "Maybe", "No", "-", "Cannot Verify"]);
const PERFORMANCE_RATINGS = new Set([
  "High", "Medium", "Low",
  "Maybe High", "Maybe Medium", "Maybe Low",
  "Cannot Verify",
]);

const ABSTAIN_RATINGS = new Set(["Cannot Verify", "No", "-"]);

function schemaValidity(args: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}): EvaluationResult {
  const inputs = args.inputs as EvalInputs;
  const outputs = args.outputs as FeatureAnalystResult;

  if (!outputs?.committed) {
    return { key: "schema_validity", score: 0, comment: "analyst did not commit results" };
  }

  const issues: string[] = [];
  const expectedProducts = inputs.scope.userProductName
    ? [...inputs.scope.products, inputs.scope.userProductName]
    : inputs.scope.products;

  const validRatings =
    inputs.feature.category === "performance" ? PERFORMANCE_RATINGS : MUST_HAVE_DELIGHTER_RATINGS;

  for (const product of expectedProducts) {
    const rating = outputs.ratings[product];
    if (!rating) {
      issues.push(`missing rating for "${product}"`);
    } else if (!validRatings.has(rating)) {
      issues.push(`invalid rating "${rating}" for "${product}"`);
    }
  }

  // Sources are required for confident *competitor* ratings. The user's own product
  // may be rated from its first-party description with no external URL.
  const userName = inputs.scope.userProductName;
  const competitorRatings = Object.entries(outputs.ratings).filter(([p]) => p !== userName);
  const hasConfidentCompetitor = competitorRatings.some(([, r]) => r !== "Cannot Verify");
  if (hasConfidentCompetitor && outputs.sources.length === 0) {
    issues.push("no sources despite confident competitor ratings");
  }

  return {
    key: "schema_validity",
    score: issues.length === 0 ? 1 : 0,
    comment: issues.length === 0 ? "all checks passed" : issues.join("; "),
  };
}

async function justificationCoherence(args: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}): Promise<EvaluationResult> {
  const inputs = args.inputs as EvalInputs;
  const outputs = args.outputs as FeatureAnalystResult;

  if (!outputs?.committed || Object.keys(outputs.ratings ?? {}).length === 0) {
    return { key: "justification_coherence", score: 0, comment: "no output to evaluate" };
  }

  const scores: number[] = [];
  for (const [product, rating] of Object.entries(outputs.ratings)) {
    const justification = outputs.justifications?.[product] ?? "(none provided)";
    const result = await judge(`Score how well the justification supports this Kano rating.

Feature: "${inputs.feature.name}" (${inputs.feature.category})
Customer benefit: ${inputs.feature.customerBenefit}
Product: ${product}
Rating: ${rating}
Justification: "${justification}"

Score 0-10:
- 10 = justification directly supports the rating with specific evidence
- 5 = relevant but vague or indirect
- 0 = contradicts the rating or is empty

Respond with only JSON: {"score": <0-10>, "reason": "<one sentence>"}`);
    scores.push(result ? result.score : 0.5);
  }

  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  return {
    key: "justification_coherence",
    score: Math.round(avg * 100) / 100,
    comment: `avg across ${scores.length} product ratings`,
  };
}

/** The user's #1 complaint: they describe their product, but its column comes back
 *  "Cannot Verify" anyway. Only scores examples flagged expectedUserProductVerifiable. */
function falseCannotVerify(args: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}): EvaluationResult {
  const inputs = args.inputs as EvalInputs;
  const outputs = args.outputs as FeatureAnalystResult;
  const userName = inputs.scope.userProductName;

  if (!userName || !inputs.expectedUserProductVerifiable) {
    return { key: "false_cannot_verify", comment: "n/a — no verifiable user product in this example" };
  }
  if (!outputs?.committed) {
    return { key: "false_cannot_verify", score: 0, comment: "analyst did not commit" };
  }
  const rating = outputs.ratings[userName];
  const failed = rating === "Cannot Verify";
  return {
    key: "false_cannot_verify",
    score: failed ? 0 : 1,
    comment: failed
      ? `FAIL: "${userName}" came back "Cannot Verify" despite a description that covers this benefit`
      : `ok: "${userName}" rated "${rating}" from its description`,
  };
}

/** Abstention trap: a fabricated product must be abstained on, not confidently rated. */
function abstainsOnFiction(args: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}): EvaluationResult {
  const inputs = args.inputs as EvalInputs;
  const outputs = args.outputs as FeatureAnalystResult;
  const fiction = inputs.expectFiction;

  if (!fiction) {
    return { key: "abstains_on_fiction", comment: "n/a — no fiction trap in this example" };
  }
  if (!outputs?.committed) {
    return { key: "abstains_on_fiction", score: 0, comment: "analyst did not commit" };
  }
  const rating = outputs.ratings[fiction];
  const abstained = ABSTAIN_RATINGS.has(rating ?? "");
  return {
    key: "abstains_on_fiction",
    score: abstained ? 1 : 0,
    comment: abstained
      ? `ok: abstained on fabricated "${fiction}" (${rating})`
      : `FAIL: confidently rated fabricated "${fiction}" as "${rating}" — hallucination`,
  };
}

/** Deterministic: fraction of cited URLs that actually load (real page, not 404/dead). */
async function sourceResolves(args: {
  outputs: Record<string, unknown>;
}): Promise<EvaluationResult> {
  const outputs = args.outputs as FeatureAnalystResult;
  const urls = outputs?.sources ?? [];
  if (urls.length === 0) {
    return { key: "source_resolves", comment: "n/a — no sources cited" };
  }
  const results = await Promise.all(urls.map((u) => urlResolves(u)));
  const ok = results.filter(Boolean).length;
  return {
    key: "source_resolves",
    score: Math.round((ok / urls.length) * 100) / 100,
    comment: `${ok}/${urls.length} cited URLs resolved`,
  };
}

/** The highest-value grounding eval: fetch each cited page and judge whether it
 *  actually supports the analyst's claims for this feature. */
async function citationFaithfulness(args: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}): Promise<EvaluationResult> {
  const inputs = args.inputs as EvalInputs;
  const outputs = args.outputs as FeatureAnalystResult;
  const urls = outputs?.sources ?? [];
  if (urls.length === 0) {
    return { key: "citation_faithfulness", comment: "n/a — no sources cited" };
  }

  const claimSummary = Object.entries(outputs.ratings ?? {})
    .map(([p, r]) => `${p}: ${r} — ${outputs.justifications?.[p] ?? ""}`)
    .join("\n");

  const scores: number[] = [];
  for (const url of urls) {
    const text = await fetchPageText(url);
    if (text === null) continue; // can't fetch → skip (source_resolves already covers reachability)
    const result = await judge(`A product-research agent cited the page below to support its ratings for the feature "${inputs.feature.name}" (${inputs.feature.customerBenefit}).

Its ratings/justifications:
${claimSummary}

Page content (truncated):
"""
${text}
"""

Does this page actually support the agent's claims about this feature?
Score 0-10:
- 10 = the page clearly and specifically backs the claims
- 5 = the page is on-topic for the product but doesn't directly confirm the claim
- 0 = off-topic, generic, or contradicts the claims

Respond with only JSON: {"score": <0-10>, "reason": "<one sentence>"}`);
    if (result) scores.push(result.score);
  }

  if (scores.length === 0) {
    return { key: "citation_faithfulness", comment: "n/a — no cited pages could be fetched" };
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    key: "citation_faithfulness",
    score: Math.round(avg * 100) / 100,
    comment: `avg across ${scores.length} fetched sources`,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// PASS 2 — Scope proposer (which competitors + which features to compare)
// ════════════════════════════════════════════════════════════════════════════════

const SCOPE_DATASET = "kanolens-scope-proposer-v1";

interface ScopeEvalInputs {
  userProductName?: string | null;
  userProductDescription: string;
  targetCustomerHint?: string;
  competitorHints?: string[];
}

const SCOPE_EXAMPLES: Array<{ inputs: ScopeEvalInputs }> = [
  {
    inputs: {
      userProductName: "Tella",
      userProductDescription:
        "Tella is a browser-based screen recorder for creators that records screen and webcam together, arranges them in layouts, and exports polished demo videos.",
      targetCustomerHint: "creators and founders recording product demos",
    },
  },
  {
    inputs: {
      userProductName: "Linear",
      userProductDescription:
        "Linear is an issue tracker and project tool built for software teams that want fast, keyboard-driven workflows, cycles, and a clean roadmap.",
      targetCustomerHint: "engineering teams at startups",
    },
  },
  {
    inputs: {
      userProductName: null,
      userProductDescription:
        "A market scan of tools that help solo accountants send invoices, track expenses, and file simple taxes for very small businesses.",
      targetCustomerHint: "solo accountants and freelancers",
    },
  },
];

/** Are the proposed features relevant to the customer AND discriminating axes
 *  (likely to differ across these products), not universal table-stakes-for-all? */
async function featureSelectionRelevance(args: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}): Promise<EvaluationResult> {
  const inputs = args.inputs as ScopeEvalInputs;
  const proposal = args.outputs as ScopeProposal;
  const features = proposal?.features ?? [];
  if (features.length === 0) {
    return { key: "feature_selection_relevance", score: 0, comment: "no features proposed" };
  }

  const scores: number[] = [];
  for (const f of features) {
    const result = await judge(`A competitive-analysis tool proposed comparing these products on a feature. Judge whether the feature is a GOOD axis of comparison.

Product context: ${inputs.userProductDescription}
Target customer: ${inputs.targetCustomerHint ?? "(infer)"}
Competitors: ${proposal.products.join(", ")}
Proposed feature: "${f.name}" — ${f.customerBenefit} (${f.category})

Score 0-10 on whether this feature is:
- relevant to the target customer's needs,
- a *discriminating* axis likely to differ across these specific products (not something every product trivially has or lacks),
- grounded in this product's domain.
10 = excellent comparison axis. 5 = relevant but weak/generic. 0 = irrelevant or non-discriminating.

Respond with only JSON: {"score": <0-10>, "reason": "<one sentence>"}`);
    if (result) scores.push(result.score);
  }

  if (scores.length === 0) {
    return { key: "feature_selection_relevance", score: 0.5, comment: "judge unavailable" };
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    key: "feature_selection_relevance",
    score: Math.round(avg * 100) / 100,
    comment: `avg across ${scores.length} proposed features`,
  };
}

/** Are the proposed competitors real, current, and genuinely in the same space? */
async function competitorRelevance(args: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}): Promise<EvaluationResult> {
  const inputs = args.inputs as ScopeEvalInputs;
  const proposal = args.outputs as ScopeProposal;
  const products = proposal?.products ?? [];
  if (products.length === 0) {
    return { key: "competitor_relevance", score: 0, comment: "no competitors proposed" };
  }

  const result = await judge(`A competitive-analysis tool proposed this competitor set for a product. Judge whether the competitors are well chosen.

Product context: ${inputs.userProductDescription}
Target customer: ${inputs.targetCustomerHint ?? "(infer)"}
Proposed competitors: ${products.join(", ")}

Score 0-10 on whether the competitors are:
- real, currently-shipping products,
- genuinely in the same category as the product context,
- the kind of products this target customer would actually compare.
10 = all strong, direct competitors. 5 = mixed (some off-target or adjacent). 0 = mostly wrong, fabricated, or out of category.

Respond with only JSON: {"score": <0-10>, "reason": "<one sentence>"}`);
  if (!result) {
    return { key: "competitor_relevance", score: 0.5, comment: "judge unavailable" };
  }
  return {
    key: "competitor_relevance",
    score: Math.round(result.score * 100) / 100,
    comment: result.reason || `judged ${products.length} competitors`,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// PASS 3 — Table summary (the AI-written 1–2 sentence narrative)
// ════════════════════════════════════════════════════════════════════════════════

const SUMMARY_DATASET = "kanolens-summary-v1";

interface SummaryEvalInputs {
  scope: { userProductName: string | null; products: string[]; targetCustomer: string };
  rows: {
    feature: { id: string; name: string; category: string };
    ratings: Record<string, string>;
    justifications: Record<string, string>;
  }[];
}

const SUMMARY_EXAMPLES: Array<{ inputs: SummaryEvalInputs }> = [
  {
    inputs: {
      scope: {
        userProductName: "Nucleus",
        products: ["Jira", "Linear", "Nucleus"],
        targetCustomer: "software teams tracking issues and roadmaps",
      },
      rows: [
        {
          feature: { id: "f1", name: "AI-assisted issue triage", category: "delighter" },
          ratings: { Jira: "No", Linear: "Maybe", Nucleus: "Yes" },
          justifications: {
            Jira: "no native AI triage",
            Linear: "limited AI suggestions",
            Nucleus: "auto-triages new issues with AI",
          },
        },
        {
          feature: { id: "f2", name: "Enterprise compliance reporting", category: "performance" },
          ratings: { Jira: "High", Linear: "Low", Nucleus: "Low" },
          justifications: {
            Jira: "deep compliance suite",
            Linear: "minimal reporting",
            Nucleus: "basic reporting only",
          },
        },
        {
          feature: { id: "f3", name: "Fast keyboard-driven workflow", category: "performance" },
          ratings: { Jira: "Low", Linear: "High", Nucleus: "Medium" },
          justifications: {
            Jira: "mouse-heavy UI",
            Linear: "keyboard-first design",
            Nucleus: "some shortcuts",
          },
        },
      ],
    },
  },
  {
    inputs: {
      scope: {
        userProductName: null,
        products: ["Zoom", "Google Meet", "Microsoft Teams"],
        targetCustomer: "distributed teams running daily calls",
      },
      rows: [
        {
          feature: { id: "g1", name: "HD video on weak networks", category: "performance" },
          ratings: { Zoom: "High", "Google Meet": "Medium", "Microsoft Teams": "Medium" },
          justifications: {
            Zoom: "strong low-bandwidth mode",
            "Google Meet": "adaptive but less robust",
            "Microsoft Teams": "adaptive but less robust",
          },
        },
        {
          feature: { id: "g2", name: "AI meeting summaries", category: "delighter" },
          ratings: { Zoom: "Yes", "Google Meet": "Yes", "Microsoft Teams": "Yes" },
          justifications: {
            Zoom: "AI Companion summaries",
            "Google Meet": "Gemini summaries",
            "Microsoft Teams": "Copilot summaries",
          },
        },
      ],
    },
  },
];

/** Does the summary reflect the table AND obey its constraints (no recommendations,
 *  no speculation beyond the table, no URLs)? */
async function summaryFaithfulness(args: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}): Promise<EvaluationResult> {
  const inputs = args.inputs as SummaryEvalInputs;
  const out = args.outputs as { summary: string };
  const summary = out?.summary ?? "";
  if (!summary.trim()) {
    return { key: "summary_faithfulness", score: 0, comment: "no summary produced" };
  }

  const tableText = inputs.rows
    .map((r) => {
      const cells = Object.entries(r.ratings)
        .map(([p, rate]) => `${p}: ${rate}`)
        .join(", ");
      return `${r.feature.name} (${r.feature.category}) — ${cells}`;
    })
    .join("\n");

  const result = await judge(`Judge a 1–2 sentence summary of a competitive analysis table.

Table:
${tableText}

Summary:
"${summary}"

Score 0-10 on whether the summary:
- accurately reflects what the table shows (no claims the table doesn't support),
- contains NO strategic recommendations, NO speculation beyond the table, NO URLs.
10 = fully faithful and within constraints. 5 = mostly faithful with a minor overreach. 0 = fabricates, contradicts the table, or gives recommendations.

Respond with only JSON: {"score": <0-10>, "reason": "<one sentence>"}`);
  if (!result) {
    return { key: "summary_faithfulness", score: 0.5, comment: "judge unavailable" };
  }
  return {
    key: "summary_faithfulness",
    score: Math.round(result.score * 100) / 100,
    comment: result.reason || "judged summary",
  };
}

async function generateSummaryForEval(inputs: SummaryEvalInputs): Promise<{ summary: string }> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODELS.verifier,
    max_tokens: 400,
    messages: [{ role: "user", content: buildSummaryPrompt({ scope: inputs.scope, rows: inputs.rows }) }],
  });
  const summary = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  return { summary };
}

// ─── Dataset helper ─────────────────────────────────────────────────────────────

async function ensureDataset(
  ls: Client,
  name: string,
  description: string,
  examples: Array<{ inputs: Record<string, unknown> }>,
): Promise<string> {
  try {
    await ls.readDataset({ datasetName: name });
    console.log(`Using existing dataset "${name}"`);
    return name;
  } catch {
    const dataset = await ls.createDataset(name, { description });
    await ls.createExamples(
      examples.map((ex) => ({ inputs: ex.inputs, dataset_id: dataset.id })),
    );
    console.log(`Created dataset "${name}" with ${examples.length} examples`);
    return name;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const ls = new Client();

  await ensureDataset(
    ls,
    FEATURE_DATASET,
    "Feature-analyst regression suite — includes user-product and abstention-trap cases",
    FEATURE_EXAMPLES.map((ex) => ({ inputs: ex.inputs as unknown as Record<string, unknown> })),
  );
  await ensureDataset(
    ls,
    SCOPE_DATASET,
    "Scope-proposer suite — competitor and feature-selection quality",
    SCOPE_EXAMPLES.map((ex) => ({ inputs: ex.inputs as unknown as Record<string, unknown> })),
  );
  await ensureDataset(
    ls,
    SUMMARY_DATASET,
    "Table-summary suite — faithfulness of the AI-written narrative",
    SUMMARY_EXAMPLES.map((ex) => ({ inputs: ex.inputs as unknown as Record<string, unknown> })),
  );

  // ── Pass 1: feature analyst ──
  console.log("\n=== Pass 1: feature analyst ===");
  let idx = 0;
  await evaluate(
    async (inputs: Record<string, unknown>) => {
      const n = ++idx;
      const typed = inputs as EvalInputs;
      const sessionId = `eval-fa-${n}-${process.pid}`;
      console.log(`  [${n}/${FEATURE_EXAMPLES.length}] ${typed.feature.name} (${typed.scope.products.join(", ")})`);
      try {
        return await runFeatureAnalyst({
          sessionId,
          scope: typed.scope,
          feature: typed.feature,
          siblingFeatureNames: typed.siblingFeatureNames ?? [],
          primarySources: {},
        });
      } finally {
        clearStream(sessionId);
      }
    },
    {
      data: FEATURE_DATASET,
      evaluators: [
        schemaValidity,
        justificationCoherence,
        falseCannotVerify,
        abstainsOnFiction,
        sourceResolves,
        citationFaithfulness,
      ],
      experimentPrefix: "feature-analyst",
      maxConcurrency: 2,
    },
  );

  // ── Pass 2: scope proposer ──
  console.log("\n=== Pass 2: scope proposer ===");
  let sIdx = 0;
  await evaluate(
    async (inputs: Record<string, unknown>) => {
      const n = ++sIdx;
      const typed = inputs as ScopeEvalInputs;
      console.log(`  [${n}/${SCOPE_EXAMPLES.length}] scope for ${typed.userProductName ?? "(market scan)"}`);
      const { proposal } = await proposeScope({
        userProductName: typed.userProductName ?? undefined,
        userProductDescription: typed.userProductDescription,
        targetCustomerHint: typed.targetCustomerHint,
        competitorHints: typed.competitorHints,
      });
      return proposal;
    },
    {
      data: SCOPE_DATASET,
      evaluators: [featureSelectionRelevance, competitorRelevance],
      experimentPrefix: "scope-proposer",
      maxConcurrency: 2,
    },
  );

  // ── Pass 3: table summary ──
  console.log("\n=== Pass 3: table summary ===");
  let mIdx = 0;
  await evaluate(
    async (inputs: Record<string, unknown>) => {
      const n = ++mIdx;
      console.log(`  [${n}/${SUMMARY_EXAMPLES.length}] summary`);
      return await generateSummaryForEval(inputs as unknown as SummaryEvalInputs);
    },
    {
      data: SUMMARY_DATASET,
      evaluators: [summaryFaithfulness],
      experimentPrefix: "summary",
      maxConcurrency: 2,
    },
  );

  console.log(`\nAll passes complete. View results at: https://smith.langchain.com`);

  // Force-exit: event-bus TTL timers would otherwise keep the process alive
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

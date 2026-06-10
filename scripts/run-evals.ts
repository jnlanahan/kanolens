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

// ─── Dataset ──────────────────────────────────────────────────────────────────

const DATASET_NAME = "kanolens-feature-analyst-v1";

interface EvalInputs {
  scope: FeatureScope;
  feature: FeatureDescriptor;
  siblingFeatureNames: string[];
}

const EXAMPLES: Array<{ inputs: EvalInputs }> = [
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
];

// ─── Evaluators ───────────────────────────────────────────────────────────────

const MUST_HAVE_DELIGHTER_RATINGS = new Set(["Yes", "Maybe", "No", "-", "Cannot Verify"]);
const PERFORMANCE_RATINGS = new Set([
  "High", "Medium", "Low",
  "Maybe High", "Maybe Medium", "Maybe Low",
  "Cannot Verify",
]);

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

  const hasNonCannotVerify = Object.values(outputs.ratings).some((r) => r !== "Cannot Verify");
  if (hasNonCannotVerify && outputs.sources.length === 0) {
    issues.push("no sources despite non-Cannot Verify ratings");
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

  // Use Haiku to judge Sonnet — never judge with the same model you're evaluating
  const anthropic = new Anthropic();
  const scores: number[] = [];

  for (const [product, rating] of Object.entries(outputs.ratings)) {
    const justification = outputs.justifications?.[product] ?? "(none provided)";
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `Score how well the justification supports this Kano rating.

Feature: "${inputs.feature.name}" (${inputs.feature.category})
Customer benefit: ${inputs.feature.customerBenefit}
Product: ${product}
Rating: ${rating}
Justification: "${justification}"

Score 0-10:
- 10 = justification directly supports the rating with specific evidence
- 5 = relevant but vague or indirect
- 0 = contradicts the rating or is empty

Respond with only JSON: {"score": <0-10>, "reason": "<one sentence>"}`,
          },
        ],
      });
      const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "{}";
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as { score?: number }) : {};
      if (typeof parsed.score === "number") {
        scores.push(Math.min(10, Math.max(0, parsed.score)) / 10);
      }
    } catch (err) {
      console.warn(`[justification_coherence] judge failed for "${product}":`, err);
      scores.push(0.5);
    }
  }

  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  return {
    key: "justification_coherence",
    score: Math.round(avg * 100) / 100,
    comment: `avg across ${scores.length} product ratings`,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const ls = new Client();

  // Create dataset once; skip if it already exists
  let datasetId: string;
  try {
    const existing = await ls.readDataset({ datasetName: DATASET_NAME });
    datasetId = existing.id;
    console.log(`Using existing dataset "${DATASET_NAME}" (${datasetId})`);
  } catch {
    const dataset = await ls.createDataset(DATASET_NAME, {
      description: "KanoLens feature-analyst regression suite — 7 feature/product combos",
    });
    datasetId = dataset.id;
    await ls.createExamples(
      EXAMPLES.map((ex) => ({ inputs: ex.inputs as Record<string, unknown>, dataset_id: datasetId })),
    );
    console.log(`Created dataset "${DATASET_NAME}" with ${EXAMPLES.length} examples`);
  }

  // Run evaluation — maxConcurrency 2 avoids rate-limit issues across web search + verifier
  let idx = 0;
  const results = await evaluate(
    async (inputs: Record<string, unknown>) => {
      const n = ++idx;
      const typedInputs = inputs as EvalInputs;
      const sessionId = `eval-${n}-${Date.now()}`;
      console.log(
        `  [${n}/${EXAMPLES.length}] ${typedInputs.feature.name} (${typedInputs.scope.products.join(", ")})`,
      );
      try {
        return await runFeatureAnalyst({
          sessionId,
          scope: typedInputs.scope,
          feature: typedInputs.feature,
          siblingFeatureNames: typedInputs.siblingFeatureNames ?? [],
          primarySources: {},
        });
      } finally {
        clearStream(sessionId);
      }
    },
    {
      data: DATASET_NAME,
      evaluators: [schemaValidity, justificationCoherence],
      experimentPrefix: "baseline",
      maxConcurrency: 2,
    },
  );

  console.log(`\nExperiment complete.`);
  console.log(`View results at: https://smith.langchain.com`);
  console.log(
    `Re-run after any prompt change with: npm run evals -- --experimentPrefix=<your-label>`,
  );

  // Force-exit: event-bus TTL timers would otherwise keep the process alive
  void results;
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

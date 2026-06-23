import { useMemo } from "react";
import type { KanoTableData, Strategy } from "@/lib/kano-types";

export type InsightType = "risk" | "opportunity" | "gap" | "strength" | "concede";

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  body: string;
  affectedFeatureIds: string[];
  /** Present when sourced from the server strategist (ranked output). */
  priority?: "critical" | "high" | "medium" | "low";
  confidence?: "high" | "medium" | "low";
  validation?: { verdict: "confirmed" | "refuted" | "unproven"; note: string };
}

/** Adapt the server strategist's ranked output to the Insight shape the panels consume.
 *  Order is preserved (strategist already ranks by priority). */
export function strategyToInsights(strategy: Strategy): Insight[] {
  return strategy.insights.map((s) => ({
    id: s.id,
    type: s.type,
    title: s.title,
    body: s.rationale,
    affectedFeatureIds: s.affectedFeatureIds,
    priority: s.priority,
    confidence: s.confidence,
    validation: s.validation,
  }));
}

const HIGH_RATINGS = new Set(["Yes", "High", "Maybe High"]);
const POSITIVE_RATINGS = new Set(["Yes", "High"]);

/** Joins competitor names into a readable phrase: "A", "A and B", "A, B and C". */
function listNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function detectInsights(tableData: KanoTableData, userProductName: string | null): Insight[] {
  const insights: Insight[] = [];
  const userProduct = userProductName ?? tableData.products[tableData.products.length - 1] ?? "";
  const competitors = tableData.products.filter((p) => p !== userProduct);

  for (const feature of tableData.features) {
    const ratings = tableData.ratings[feature.id] ?? {};
    const userRating = ratings[userProduct] ?? "";

    if (feature.category === "performance") {
      const leadingCompetitors = competitors.filter((c) => HIGH_RATINGS.has(ratings[c] ?? ""));
      if (competitors.length > 0 && leadingCompetitors.length / competitors.length >= 0.75) {
        insights.push({
          id: `risk-${feature.id}`,
          type: "risk",
          title: `Trending to table stakes: ${feature.name}`,
          body: `${leadingCompetitors.length} of ${competitors.length} rivals already lead here — it's becoming table stakes.`,
          affectedFeatureIds: [feature.id],
        });
      }
    }

    if (feature.category === "must-have") {
      if (userRating === "No" || userRating === "Cannot Verify") {
        const confirmers = competitors.filter((c) => ratings[c] === "Yes");
        const youVerb = userRating === "Cannot Verify" ? "can't verify it" : "don't have it";
        let body: string;
        if (confirmers.length === 0) {
          body = `No rival has confirmed it either — unproven across the field, so closing it first wins the baseline.`;
        } else if (confirmers.length === 1) {
          body = `Only ${confirmers[0]} confirms it while you ${youVerb} — an early gap to close.`;
        } else {
          body = `${confirmers.length} rivals confirm it while you ${youVerb} — a baseline gap to close first.`;
        }
        insights.push({
          id: `gap-${feature.id}`,
          type: "gap",
          title: `Critical gap: ${feature.name}`,
          body,
          affectedFeatureIds: [feature.id],
        });
      }

      const allYes = tableData.products.every((p) => ratings[p] === "Yes");
      if (allYes) {
        insights.push({
          id: `strength-musthave-${feature.id}`,
          type: "strength",
          title: `Table stakes met: ${feature.name}`,
          body: `Every product delivers it — neutral ground, so differentiate elsewhere.`,
          affectedFeatureIds: [feature.id],
        });
      }
    }

    if (feature.category === "delighter") {
      const confirmingCompetitors = competitors.filter((c) => POSITIVE_RATINGS.has(ratings[c] ?? ""));
      const userHasFeature = POSITIVE_RATINGS.has(userRating);

      if (!userHasFeature && userRating === "No" && confirmingCompetitors.length === 1) {
        insights.push({
          id: `steal-${feature.id}`,
          type: "opportunity",
          title: `Steal this delighter: ${feature.name}`,
          body: `Only ${confirmingCompetitors[0]} has it and you've confirmed you don't — a concrete build target.`,
          affectedFeatureIds: [feature.id],
        });
      } else if (!userHasFeature && confirmingCompetitors.length === 1) {
        insights.push({
          id: `opportunity-${feature.id}`,
          type: "opportunity",
          title: `White space: ${feature.name}`,
          body: `Only ${confirmingCompetitors[0]} offers it — open space to differentiate.`,
          affectedFeatureIds: [feature.id],
        });
      }

      if (userHasFeature && confirmingCompetitors.length === 0) {
        insights.push({
          id: `strength-delighter-${feature.id}`,
          type: "strength",
          title: `Unique advantage: ${feature.name}`,
          body: `You're the only product confirming it — a genuine delighter to lead with.`,
          affectedFeatureIds: [feature.id],
        });
      }

      if (confirmingCompetitors.length >= 3) {
        insights.push({
          id: `risk-commoditizing-${feature.id}`,
          type: "risk",
          title: `Becoming a must-have: ${feature.name}`,
          body: `${confirmingCompetitors.length} rivals already offer it — its delight factor is fading toward expected.`,
          affectedFeatureIds: [feature.id],
        });
      }
    }

    if (feature.category === "performance") {
      const userIsHigh = userRating === "High";
      const LOW_PERFORMANCE = new Set(["Medium", "Low", "Maybe Medium", "Maybe Low"]);
      const allCompetitorsLow =
        competitors.length > 0 && competitors.every((c) => LOW_PERFORMANCE.has(ratings[c] ?? ""));
      if (userIsHigh && allCompetitorsLow) {
        insights.push({
          id: `lead-${feature.id}`,
          type: "strength",
          title: `Performance leadership: ${feature.name}`,
          body: `You score High while every rival sits at Medium or below — lead with it.`,
          affectedFeatureIds: [feature.id],
        });
      }
    }

    if (feature.category === "must-have" && userRating === "Yes") {
      const competitorsMissing = competitors.filter((c) =>
        ["No", "Cannot Verify"].includes(ratings[c] ?? ""),
      );
      if (competitorsMissing.length >= 1) {
        const who =
          competitorsMissing.length <= 2
            ? listNames(competitorsMissing)
            : `${competitorsMissing.length} rivals`;
        insights.push({
          id: `parity-${feature.id}`,
          type: "strength",
          title: `Parity advantage: ${feature.name}`,
          body: `You confirm this baseline while ${who} can't — a real parity edge.`,
          affectedFeatureIds: [feature.id],
        });
      }
    }
  }

  return insights;
}

const insightDisplay: Record<InsightType, { label: string; color: string; mark: string }> = {
  gap: { label: "Gap", color: "hsl(var(--rate-maybe))", mark: "△" },
  risk: { label: "Risk", color: "hsl(var(--destructive))", mark: "▲" },
  opportunity: { label: "Opening", color: "hsl(var(--brand-emerald))", mark: "◆" },
  strength: { label: "Strength", color: "hsl(var(--rate-yes))", mark: "✦" },
  concede: { label: "Concede", color: "hsl(var(--rate-unknown))", mark: "▽" },
};

const VALIDATION_BADGE: Record<"confirmed" | "refuted" | "unproven", { text: string; color: string }> = {
  confirmed: { text: "Validated ✓", color: "hsl(var(--rate-yes))" },
  refuted: { text: "Refuted", color: "hsl(var(--destructive))" },
  unproven: { text: "Unproven", color: "hsl(var(--rate-unknown))" },
};

/** Pulls the feature name out of a "Label: Feature" insight title. */
function featureFromTitle(title: string): string {
  const idx = title.indexOf(": ");
  return idx >= 0 ? title.slice(idx + 2) : title;
}

interface InsightsPanelProps {
  insights: Insight[];
  onInsightHover: (insight: Insight | null) => void;
}

export function InsightsPanel({ insights, onInsightHover }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: "6px" }}>What it means</p>
      <div>
        {insights.map((insight) => {
          const d = insightDisplay[insight.type];
          return (
            <div
              key={insight.id}
              className="insight-row"
              onMouseEnter={() => onInsightHover(insight)}
              onMouseLeave={() => onInsightHover(null)}
            >
              <span className="insight-row__label" style={{ color: d.color }}>
                <span className="insight-row__mark" aria-hidden="true">{d.mark}</span>
                {d.label}
              </span>
              <span className="insight-row__feature">{featureFromTitle(insight.title)}</span>
              <span className="insight-row__note">
                {insight.body}
                {insight.validation ? (
                  <span
                    className="ml-1.5 text-[11px] font-medium"
                    style={{ color: VALIDATION_BADGE[insight.validation.verdict].color }}
                    title={insight.validation.note}
                  >
                    {VALIDATION_BADGE[insight.validation.verdict].text}
                  </span>
                ) : insight.confidence === "low" ? (
                  <span className="ml-1.5 text-[11px] font-medium text-muted-foreground" title="Rests on low-confidence data — worth validating">
                    Hypothesis
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SIGNAL_TILES: { type: InsightType; label: string; color: string; caption: string }[] = [
  { type: "gap", label: "Gaps", color: "hsl(var(--rate-maybe))", caption: "Baselines you're missing" },
  { type: "risk", label: "Risk", color: "hsl(var(--destructive))", caption: "Eroding or commoditizing" },
  { type: "opportunity", label: "Opening", color: "hsl(var(--brand-emerald))", caption: "White-space to seize" },
  { type: "strength", label: "Strengths", color: "hsl(var(--rate-yes))", caption: "Edges to lead with" },
  { type: "concede", label: "Concede", color: "hsl(var(--rate-unknown))", caption: "Not worth pursuing" },
];

export function SignalStrip({ insights }: { insights: Insight[] }) {
  const counts = useMemo(() => {
    const c: Record<InsightType, number> = { gap: 0, risk: 0, opportunity: 0, strength: 0, concede: 0 };
    for (const i of insights) c[i.type] += 1;
    return c;
  }, [insights]);

  return (
    <div className="signal-strip">
      {SIGNAL_TILES.filter((t) => t.type !== "concede" || counts.concede > 0).map((t) => (
        <div key={t.type} className="signal-tile">
          <div className="signal-tile__top">
            <span className="signal-tile__num" style={{ color: t.color }}>{counts[t.type]}</span>
            <span className="signal-tile__label" style={{ color: t.color }}>{t.label}</span>
          </div>
          <div className="signal-tile__cap">{t.caption}</div>
        </div>
      ))}
    </div>
  );
}

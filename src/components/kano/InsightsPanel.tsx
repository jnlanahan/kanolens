import { AlertTriangle, Lightbulb, TrendingUp, Zap } from "lucide-react";
import type { KanoTableData } from "@/lib/kano-types";

export type InsightType = "risk" | "opportunity" | "gap" | "strength";

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  body: string;
  affectedFeatureIds: string[];
}

const HIGH_RATINGS = new Set(["Yes", "High", "Maybe High"]);
const POSITIVE_RATINGS = new Set(["Yes", "High"]);

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
          body: `${leadingCompetitors.length} of ${competitors.length} competitors already lead here`,
          affectedFeatureIds: [feature.id],
        });
      }
    }

    if (feature.category === "must-have") {
      if (userRating === "No" || userRating === "Cannot Verify") {
        insights.push({
          id: `gap-${feature.id}`,
          type: "gap",
          title: `Critical gap: ${feature.name}`,
          body: `You${userRating === "Cannot Verify" ? " cannot verify this feature" : " are missing this feature"}, which competitors treat as baseline`,
          affectedFeatureIds: [feature.id],
        });
      }

      const allYes = tableData.products.every((p) => ratings[p] === "Yes");
      if (allYes) {
        insights.push({
          id: `strength-musthave-${feature.id}`,
          type: "strength",
          title: `Table stakes met: ${feature.name}`,
          body: `Universally delivered — differentiate elsewhere`,
          affectedFeatureIds: [feature.id],
        });
      }
    }

    if (feature.category === "delighter") {
      const competitorsWithFeature = competitors.filter((c) => POSITIVE_RATINGS.has(ratings[c] ?? ""));
      const userHasFeature = POSITIVE_RATINGS.has(userRating);

      if (!userHasFeature && competitorsWithFeature.length === 1) {
        insights.push({
          id: `opportunity-${feature.id}`,
          type: "opportunity",
          title: `White space: ${feature.name}`,
          body: `Only ${competitorsWithFeature[0]} has this — room to differentiate`,
          affectedFeatureIds: [feature.id],
        });
      }

      if (userHasFeature && competitorsWithFeature.length === 0) {
        insights.push({
          id: `strength-delighter-${feature.id}`,
          type: "strength",
          title: `Unique advantage: ${feature.name}`,
          body: `You're the only product with this feature`,
          affectedFeatureIds: [feature.id],
        });
      }
    }
  }

  return insights;
}

const insightConfig: Record<InsightType, { icon: React.ReactNode; colorClass: string; labelClass: string }> = {
  risk: {
    icon: <AlertTriangle className="h-4 w-4" />,
    colorClass: "border-l-red-500 bg-red-500/5",
    labelClass: "text-red-600",
  },
  gap: {
    icon: <TrendingUp className="h-4 w-4" />,
    colorClass: "border-l-yellow-500 bg-yellow-500/5",
    labelClass: "text-yellow-700",
  },
  opportunity: {
    icon: <Lightbulb className="h-4 w-4" />,
    colorClass: "border-l-blue-500 bg-blue-500/5",
    labelClass: "text-blue-600",
  },
  strength: {
    icon: <Zap className="h-4 w-4" />,
    colorClass: "border-l-green-500 bg-green-500/5",
    labelClass: "text-green-700",
  },
};

const insightLabel: Record<InsightType, string> = {
  risk: "Risk",
  gap: "Gap",
  opportunity: "Opportunity",
  strength: "Strength",
};

interface InsightsPanelProps {
  insights: Insight[];
  onInsightHover: (insight: Insight | null) => void;
}

export function InsightsPanel({ insights, onInsightHover }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Strategic Insights</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {insights.map((insight) => {
          const config = insightConfig[insight.type];
          return (
            <div
              key={insight.id}
              className={`panel border-l-4 p-3 space-y-1 cursor-default transition-opacity ${config.colorClass}`}
              onMouseEnter={() => onInsightHover(insight)}
              onMouseLeave={() => onInsightHover(null)}
            >
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${config.labelClass}`}>
                {config.icon}
                <span>{insightLabel[insight.type]}</span>
              </div>
              <p className="text-sm font-medium leading-snug">{insight.title}</p>
              <p className="text-xs text-muted-foreground leading-snug">{insight.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

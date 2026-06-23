export type KanoCategory = "must-have" | "performance" | "delighter";

export type Rating =
  | "Yes"
  | "Maybe"
  | "No"
  | "Cannot Verify"
  | "High"
  | "Medium"
  | "Low"
  | "Maybe High"
  | "Maybe Medium"
  | "Maybe Low"
  | "N/A"
  | "";

export interface KanoFeature {
  id: string;
  name: string;
  description: string;
  customerBenefit: string;
  category: KanoCategory;
}

export interface KanoTableData {
  products: string[];
  features: KanoFeature[];
  ratings: Record<string, Record<string, Rating>>;
  justifications?: Record<string, Record<string, string>>;
  /** Per feature → per product: true when the rating is an unverified best-estimate. */
  estimated?: Record<string, Record<string, boolean>>;
  /** Per feature → per product trust signal derived from source verdicts. */
  confidence?: Record<string, Record<string, "high" | "medium" | "low">>;
  sources: Record<string, string[]>;
  /** Per feature → source URL → the claim that URL backs (evidence shown in the modal). */
  sourceClaims?: Record<string, Record<string, string>>;
  summary?: string;
  /** Ranked, synthesized strategy from the server-side strategist. */
  strategy?: Strategy;
}

export type StrategyInsightType = "gap" | "opportunity" | "risk" | "strength" | "concede";

export interface StrategyInsight {
  id: string;
  type: StrategyInsightType;
  title: string;
  rationale: string;
  priority: "critical" | "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  affectedFeatureIds: string[];
  validation?: { verdict: "confirmed" | "refuted" | "unproven"; note: string };
}

export interface Strategy {
  headline: string;
  insights: StrategyInsight[];
  mustHaveCoverage?: { held: number; total: number; missing: string[] };
}

export const CATEGORY_ORDER: KanoCategory[] = ["must-have", "performance", "delighter"];

export const CATEGORY_LABEL: Record<KanoCategory, string> = {
  "must-have": "Must-Have Features",
  performance: "Performance Benefits",
  delighter: "Delighter Features",
};

export const CATEGORY_DEFINITION: Record<KanoCategory, string> = {
  "must-have":
    "Essential features customers expect. Missing them causes dissatisfaction; having them is neutral.",
  performance:
    "Features where more is better. Customer satisfaction scales linearly with how well this is delivered.",
  delighter:
    "Unexpected features that surprise and delight. Absence doesn't hurt; presence creates excitement.",
};

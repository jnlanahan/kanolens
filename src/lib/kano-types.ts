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
  sources: Record<string, string[]>;
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

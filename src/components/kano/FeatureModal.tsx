import { ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { KanoFeature, KanoTableData } from "@/lib/kano-types";

interface FeatureModalProps {
  feature: KanoFeature | null;
  tableData?: KanoTableData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryBadgeVariant = {
  "must-have": "must" as const,
  performance: "perf" as const,
  delighter: "delight" as const,
};

const categoryHuman = {
  "must-have": "Must-Have",
  performance: "Performance Benefit",
  delighter: "Delighter",
};

function displayRating(rating: string): string {
  if (rating === "Yes") return "✓ Available";
  if (rating === "No") return "✗ Not available";
  if (rating === "High") return "⬆ High performance";
  if (rating === "Medium") return "➡ Medium performance";
  if (rating === "Low") return "⬇ Low performance";
  if (rating === "Cannot Verify") return "Cannot verify";
  if (!rating || rating === "" || rating === "N/A") return "No data";
  return rating;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

export function FeatureModal({ feature, tableData, open, onOpenChange }: FeatureModalProps) {
  if (!feature || !tableData) return null;

  const ratings = tableData.ratings[feature.id] ?? {};
  const sources = tableData.sources[feature.id] ?? [];
  const justifications = tableData.justifications?.[feature.id] ?? {};
  const estimatedMap = tableData.estimated?.[feature.id] ?? {};

  const positive = Object.values(ratings).filter((r) => r === "Yes" || r === "High").length;
  const total = tableData.products.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg font-semibold">{feature.name}</DialogTitle>
            <Badge variant={categoryBadgeVariant[feature.category]}>
              {categoryHuman[feature.category]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Customer-benefit analysis</p>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h4 className="font-medium mb-1.5">Customer benefit</h4>
            <p className="text-sm text-muted-foreground">{feature.customerBenefit}</p>
          </section>

          {feature.description ? (
            <section>
              <h4 className="font-medium mb-1.5">Feature description</h4>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </section>
          ) : null}

          <section>
            <h4 className="font-medium mb-3">Competitive position</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tableData.products.map((product) => {
                const rating = ratings[product] ?? "N/A";
                const isPositive = rating === "Yes" || rating === "High";
                const isNegative = rating === "No" || rating === "Low";
                const tone = isPositive
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
                  : isNegative
                    ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900"
                    : "bg-muted/50 border";
                const note = justifications[product];
                const isEstimate = estimatedMap[product] ?? false;
                return (
                  <Card key={product} className={`p-3 ${tone}`}>
                    <div className="font-medium text-sm">{product}</div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      {displayRating(rating)}
                      {isEstimate ? (
                        <span className="ml-1.5 text-[hsl(var(--gold))]" title="Best estimate — not verified by a citable source">
                          ✦ estimate
                        </span>
                      ) : null}
                    </div>
                    {note ? <div className="text-xs mt-2 text-foreground/80">{note}</div> : null}
                  </Card>
                );
              })}
            </div>
          </section>

          <section>
            <h4 className="font-medium mb-3">Market adoption</h4>
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold">{positive}/{total}</div>
                  <div className="text-xs text-muted-foreground">Have this</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{total - positive}/{total}</div>
                  <div className="text-xs text-muted-foreground">Don't</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    {total === 0 ? "–" : `${Math.round((positive / total) * 100)}%`}
                  </div>
                  <div className="text-xs text-muted-foreground">Adoption</div>
                </div>
              </div>
            </Card>
          </section>

          {sources.length > 0 ? (
            <section>
              <h4 className="font-medium mb-2">Sources</h4>
              <ul className="space-y-2">
                {sources.map((source, i) => {
                  const valid = source.startsWith("http://") || source.startsWith("https://");
                  return (
                    <li key={i}>
                      <Card className="p-3">
                        {valid ? (
                          <a
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start justify-between gap-2 text-sm hover:underline"
                          >
                            <div>
                              <div className="font-medium">{domainOf(source)}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-md">
                                {source}
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          </a>
                        ) : (
                          <div className="text-sm text-muted-foreground">{source}</div>
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

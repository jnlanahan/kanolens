import { useMemo, useState, useCallback } from "react";
import { Info } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CATEGORY_DEFINITION,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type KanoCategory,
  type KanoFeature,
  type KanoTableData,
} from "@/lib/kano-types";
import { FeatureModal } from "./FeatureModal";

const categoryRowClass: Record<KanoCategory, string> = {
  "must-have":
    "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100",
  performance:
    "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900 text-orange-900 dark:text-orange-100",
  delighter:
    "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900 text-purple-900 dark:text-purple-100",
};

const categoryDot: Record<KanoCategory, string> = {
  "must-have": "bg-[hsl(var(--kano-must))]",
  performance: "bg-[hsl(var(--kano-perf))]",
  delighter: "bg-[hsl(var(--kano-delight))]",
};

function ratingBadgeClass(rating: string, category: KanoCategory): string {
  if (!rating || rating.trim() === "" || rating === "N/A") {
    return "bg-muted text-muted-foreground";
  }
  if (rating === "Cannot Verify") {
    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
  if (category === "performance") {
    if (rating.endsWith("High")) return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100";
    if (rating.endsWith("Medium")) return "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100";
    if (rating.endsWith("Low")) return "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100";
  }
  if (rating === "Yes") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100";
  if (rating === "No") return "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100";
  if (rating === "Maybe") return "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100";
  return "bg-muted text-muted-foreground";
}

function ratingDisplay(rating: string): string {
  if (rating === "Yes") return "✓ Yes";
  if (rating === "No") return "✗ No";
  if (rating === "" || rating === "N/A") return "—";
  return rating;
}

interface KanoTableProps {
  tableData?: KanoTableData;
  isLoading?: boolean;
}

export function KanoTable({ tableData, isLoading = false }: KanoTableProps) {
  const [selected, setSelected] = useState<KanoFeature | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const onFeatureClick = useCallback((feature: KanoFeature) => {
    setSelected(feature);
    setModalOpen(true);
  }, []);

  const featuresByCategory = useMemo(() => {
    const map: Record<KanoCategory, KanoFeature[]> = {
      "must-have": [],
      performance: [],
      delighter: [],
    };
    for (const f of tableData?.features ?? []) {
      map[f.category].push(f);
    }
    return map;
  }, [tableData?.features]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card className="p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </Card>
      </div>
    );
  }

  if (!tableData || tableData.features.length === 0) {
    return (
      <Card className="p-10 text-center">
        <div className="text-4xl mb-3" aria-hidden="true">🔍</div>
        <h3 className="font-semibold text-lg mb-2">No analysis data yet</h3>
        <p className="text-sm text-muted-foreground">
          Rows will appear here as the Analyst streams them in.
        </p>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th scope="col" className="text-left p-4 font-semibold min-w-[16rem]">
                  Feature / Benefit
                </th>
                {tableData.products.map((product) => (
                  <th
                    key={product}
                    scope="col"
                    className="text-center p-4 font-semibold min-w-[8rem]"
                  >
                    {product}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.flatMap((category) => {
                const features = featuresByCategory[category];
                if (features.length === 0) return [];
                return [
                  <tr
                    key={`cat-${category}`}
                    className={`border-b-2 ${categoryRowClass[category]}`}
                  >
                    <td colSpan={tableData.products.length + 1} className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${categoryDot[category]}`}
                          aria-hidden="true"
                        />
                        <span className="font-mono font-semibold uppercase tracking-wide text-xs">
                          {CATEGORY_LABEL[category]}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={`About ${CATEGORY_LABEL[category]}`}
                              className="inline-flex"
                            >
                              <Info className="h-3.5 w-3.5 text-current opacity-60 hover:opacity-100" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {CATEGORY_DEFINITION[category]}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>,
                  ...features.map((feature) => (
                    <tr
                      key={feature.id}
                      className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => onFeatureClick(feature)}
                    >
                      <td className="p-4">
                        <div className="font-medium">{feature.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {feature.customerBenefit}
                        </div>
                      </td>
                      {tableData.products.map((product) => {
                        const rating = tableData.ratings[feature.id]?.[product] ?? "N/A";
                        const sources = tableData.sources[feature.id] ?? [];
                        return (
                          <td key={product} className="p-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${ratingBadgeClass(rating, category)}`}
                              title={sources.length > 0 ? `${sources.length} source(s)` : undefined}
                            >
                              {ratingDisplay(rating)}
                              {sources.length > 0 ? (
                                <span className="opacity-70" aria-hidden="true">
                                  ·
                                </span>
                              ) : null}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <FeatureModal
        feature={selected}
        tableData={tableData}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </TooltipProvider>
  );
}

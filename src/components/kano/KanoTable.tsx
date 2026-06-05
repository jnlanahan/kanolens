import { useMemo, useState, useCallback } from "react";
import { Info } from "lucide-react";

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

const categoryRibbonMod: Record<KanoCategory, string> = {
  "must-have": "ribbon--must-have",
  performance: "ribbon--performance",
  delighter: "ribbon--delighter",
};

interface KanoTableProps {
  tableData?: KanoTableData;
  isLoading?: boolean;
  /** When provided, row clicks call this instead of opening the built-in modal */
  onFeatureSelect?: (feature: KanoFeature) => void;
  /** Highlights the matching row (used with onFeatureSelect) */
  selectedFeatureId?: string;
}

export function KanoTable({
  tableData,
  isLoading = false,
  onFeatureSelect,
  selectedFeatureId,
}: KanoTableProps) {
  const [selected, setSelected] = useState<KanoFeature | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const onFeatureClick = useCallback(
    (feature: KanoFeature) => {
      if (onFeatureSelect) {
        onFeatureSelect(feature);
      } else {
        setSelected(feature);
        setModalOpen(true);
      }
    },
    [onFeatureSelect],
  );

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
        <div className="panel p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  if (!tableData || tableData.features.length === 0) {
    return (
      <div className="panel p-10 text-center">
        <div className="text-4xl mb-3" aria-hidden="true">🔍</div>
        <h3 className="text-lg mb-2">No analysis data yet</h3>
        <p className="text-sm text-muted-foreground">
          Rows will appear here as the Analyst streams them in.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="panel overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th scope="col" className="text-left p-4 font-semibold min-w-[16rem] text-xs uppercase tracking-wide">
                  Feature / Benefit
                </th>
                {tableData.products.map((product) => (
                  <th
                    key={product}
                    scope="col"
                    className="text-center p-4 font-semibold min-w-[7rem] text-xs uppercase tracking-wide"
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
                  <tr key={`cat-${category}`} role="row">
                    <td
                      colSpan={tableData.products.length + 1}
                      className="px-4 pt-5 pb-1"
                      role="rowheader"
                      aria-label={`${CATEGORY_LABEL[category]} features`}
                    >
                      <div className={`ribbon ${categoryRibbonMod[category]}`}>
                        <span className="ribbon__title">
                          <span className="ribbon__icon" aria-hidden="true" />
                          {CATEGORY_LABEL[category]}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={`About ${CATEGORY_LABEL[category]}`}
                                className="inline-flex opacity-50 hover:opacity-100"
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {CATEGORY_DEFINITION[category]}
                            </TooltipContent>
                          </Tooltip>
                        </span>
                        <span className="ribbon__def">{CATEGORY_DEFINITION[category]}</span>
                      </div>
                    </td>
                  </tr>,
                  ...features.map((feature) => (
                    <tr
                      key={feature.id}
                      className={`kano-row${selectedFeatureId === feature.id ? " kano-row--active" : ""}`}
                      onClick={() => onFeatureClick(feature)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onFeatureClick(feature);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${feature.name} — ${CATEGORY_LABEL[feature.category]}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{feature.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {feature.customerBenefit}
                        </div>
                      </td>
                      {tableData.products.map((product) => {
                        const rating = tableData.ratings[feature.id]?.[product] ?? "N/A";
                        return (
                          <td key={product} className="px-4 py-3 text-center">
                            <RatingChip
                              rating={rating}
                              hasSource={(tableData.sources[feature.id] ?? []).length > 0}
                            />
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
      </div>

      {/* Built-in modal — only used when no onFeatureSelect prop is given */}
      {!onFeatureSelect ? (
        <FeatureModal
          feature={selected}
          tableData={tableData}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      ) : null}
    </TooltipProvider>
  );
}

function RatingChip({ rating, hasSource }: { rating: string; hasSource: boolean }) {
  if (!rating || rating === "N/A" || rating === "") {
    return <span className="rating rating--na">—</span>;
  }
  if (rating === "Cannot Verify") {
    return <span className="rating rating--unknown">Unverified</span>;
  }
  if (rating === "Yes") {
    if (hasSource) {
      return <span className="rating rating--verified">Yes ✓</span>;
    }
    return <span className="rating rating--yes">Yes</span>;
  }
  if (rating === "No") return <span className="rating rating--no">No</span>;
  if (rating === "Maybe") return <span className="rating rating--maybe">Partial</span>;
  if (rating === "High" || rating === "Maybe High") {
    return <span className="rating rating--yes">{rating === "Maybe High" ? "~High" : "High"}</span>;
  }
  if (rating === "Medium" || rating === "Maybe Medium") {
    return <span className="rating rating--maybe">{rating === "Maybe Medium" ? "~Med" : "Med"}</span>;
  }
  if (rating === "Low" || rating === "Maybe Low") {
    return <span className="rating rating--no">{rating === "Maybe Low" ? "~Low" : "Low"}</span>;
  }
  return <span className="rating rating--na">{rating}</span>;
}

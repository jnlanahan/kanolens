import { useMemo, useState, useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type KanoCategory,
  type KanoFeature,
  type KanoTableData,
} from "@/lib/kano-types";
import { FeatureModal } from "./FeatureModal";

const categoryDot: Record<KanoCategory, string> = {
  "must-have": "hsl(var(--kano-must))",
  performance: "hsl(var(--kano-perf))",
  delighter: "hsl(var(--kano-delight))",
};

// Short editorial definitions shown inline in each category ribbon (matches the design).
const CATEGORY_RIBBON_DEF: Record<KanoCategory, string> = {
  "must-have": "Absence causes dissatisfaction; presence is merely expected.",
  performance: "More is better — satisfaction scales with how well it performs.",
  delighter: "Unexpected — presence delights; absence is never missed.",
};

interface KanoTableProps {
  tableData?: KanoTableData;
  isLoading?: boolean;
  isStreaming?: boolean;
  /** When provided, row clicks call this instead of opening the built-in modal */
  onFeatureSelect?: (feature: KanoFeature) => void;
  /** Highlights the matching row (used with onFeatureSelect) */
  selectedFeatureId?: string;
  /** Rows whose IDs appear in this set get a subtle highlight accent */
  highlightedFeatureIds?: Set<string>;
  /** Name of the user's own product — its column is highlighted as "YOU" */
  userProductName?: string | null;
}

export function KanoTable({
  tableData,
  isLoading = false,
  isStreaming = false,
  onFeatureSelect,
  selectedFeatureId,
  highlightedFeatureIds,
  userProductName,
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
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="panel p-6 space-y-3 rounded-[13px]">
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
      <div className="panel p-10 text-center rounded-[13px]">
        <div className="text-4xl mb-3" aria-hidden="true">🔍</div>
        <h3 className="text-lg mb-2">No analysis data yet</h3>
        <p className="text-sm text-muted-foreground">
          Rows will appear here as the Analyst streams them in.
        </p>
      </div>
    );
  }

  const products = tableData.products;
  const rowsDone = tableData.features.length;
  const isYouProduct = (product: string) =>
    userProductName != null && userProductName !== "" && product === userProductName;
  const hasYou = products.some(isYouProduct);
  const gridTemplateColumns = `300px repeat(${products.length}, minmax(96px, 1fr))`;

  return (
    <>
      <div className={`heatmap${isStreaming ? " ring-2 ring-dashed ring-[hsl(var(--kano-perf))] animate-pulse" : ""}`}>
        {isStreaming ? (
          <div className="flex items-center gap-2 px-5 py-2 border-b text-sm text-muted-foreground bg-muted/30">
            <span className="spin w-3.5 h-3.5 border-2 border-[hsl(var(--border-strong))] border-t-[hsl(var(--kano-perf))] rounded-full shrink-0" aria-hidden="true" />
            <span>Analyzing features… ({rowsDone} rows so far)</span>
          </div>
        ) : null}

        <div className="heatmap__scroll">
          {/* Header row */}
          <div className="heatmap__row heatmap__head" style={{ gridTemplateColumns }}>
            <div className="heatmap__head-feature">Feature / Benefit</div>
            {products.map((product) => {
              const you = isYouProduct(product);
              return (
                <div
                  key={product}
                  className={`heatmap__head-prod${you ? " heatmap__you-head" : ""}`}
                  title={product}
                >
                  {you ? (
                    <>
                      <div className="heatmap__you-name">{product}</div>
                      <div className="heatmap__you-tag">YOU</div>
                    </>
                  ) : (
                    product
                  )}
                </div>
              );
            })}
          </div>

          {/* Category ribbons + feature rows */}
          {CATEGORY_ORDER.flatMap((category) => {
            const features = featuresByCategory[category];
            if (features.length === 0) return [];
            return [
              <div key={`cat-${category}`} className="heatmap__cat">
                <span className="heatmap__cat-dot" style={{ background: categoryDot[category] }} aria-hidden="true" />
                <span className="heatmap__cat-label">{CATEGORY_LABEL[category]}</span>
                <span className="heatmap__cat-def">{CATEGORY_RIBBON_DEF[category]}</span>
              </div>,
              ...features.map((feature) => {
                const isHl = highlightedFeatureIds?.has(feature.id);
                const isActive = selectedFeatureId === feature.id;
                return (
                  <div
                    key={feature.id}
                    className={`heatmap__row heatmap__feat-row${isActive ? " heatmap__feat-row--active" : ""}${isHl ? " heatmap__feat-row--hl" : ""}`}
                    style={{ gridTemplateColumns }}
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
                    <div className="heatmap__feat-cell">
                      <div className="heatmap__feat-name">{feature.name}</div>
                      <div className="heatmap__feat-benefit">{feature.customerBenefit}</div>
                    </div>
                    {products.map((product) => {
                      const rating = tableData.ratings[feature.id]?.[product] ?? "N/A";
                      const justification = tableData.justifications?.[feature.id]?.[product];
                      const isEstimate = tableData.estimated?.[feature.id]?.[product] ?? false;
                      const featureSources = tableData.sources[feature.id] ?? [];
                      return (
                        <RatingCell
                          key={product}
                          rating={rating}
                          isEstimate={isEstimate}
                          isYou={isYouProduct(product)}
                          justification={justification}
                          sources={featureSources}
                          onChipClick={() => onFeatureClick(feature)}
                        />
                      );
                    })}
                  </div>
                );
              }),
            ];
          })}
        </div>

        {/* Legend */}
        <div className="heatmap__legend">
          <span className="heatmap__legend-item">
            <span className="heatmap__legend-sw" style={{ background: "hsl(var(--rate-yes-soft))" }} aria-hidden="true" />
            Yes ✓
          </span>
          <span className="heatmap__legend-item">
            <span className="heatmap__legend-sw" style={{ background: "hsl(var(--rate-maybe-soft))" }} aria-hidden="true" />
            Partial ◐
          </span>
          <span className="heatmap__legend-item">
            <span className="heatmap__legend-sw" style={{ background: "hsl(var(--rate-none-soft))" }} aria-hidden="true" />
            Unverified –
          </span>
          <span className="heatmap__legend-item">
            <span className="heatmap__legend-sw" style={{ background: "hsl(var(--rate-no-soft))" }} aria-hidden="true" />
            No ✕
          </span>
          {hasYou ? (
            <span className="heatmap__legend-item" style={{ marginLeft: "auto", color: "hsl(var(--brand-emerald))" }}>
              <span
                className="heatmap__legend-sw"
                style={{ background: "hsl(var(--brand-emerald) / 0.07)", boxShadow: "0 0 0 1.5px hsl(var(--brand-emerald) / 0.32)" }}
                aria-hidden="true"
              />
              Your product
            </span>
          ) : null}
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
    </>
  );
}

type Tone = "pos" | "mid" | "none" | "neg";

const TONE: Record<Tone, { color: string; soft: string }> = {
  pos: { color: "hsl(var(--rate-yes))", soft: "hsl(var(--rate-yes-soft))" },
  mid: { color: "hsl(var(--rate-maybe))", soft: "hsl(var(--rate-maybe-soft))" },
  none: { color: "hsl(var(--rate-unknown))", soft: "hsl(var(--rate-none-soft))" },
  neg: { color: "hsl(var(--destructive))", soft: "hsl(var(--rate-no-soft))" },
};

function ratingDisplay(rating: string): { label: string; glyph: string; tone: Tone } {
  if (!rating || rating === "N/A" || rating === "" || rating === "Cannot Verify")
    return { label: "Unverified", glyph: "–", tone: "none" };
  if (rating === "Yes") return { label: "Yes", glyph: "✓", tone: "pos" };
  if (rating === "No") return { label: "No", glyph: "✕", tone: "neg" };
  if (rating === "Maybe") return { label: "Partial", glyph: "◐", tone: "mid" };
  if (rating === "High" || rating === "Maybe High")
    return { label: rating === "Maybe High" ? "~High" : "High", glyph: "✓", tone: "pos" };
  if (rating === "Medium" || rating === "Maybe Medium")
    return { label: rating === "Maybe Medium" ? "~Med" : "Med", glyph: "◐", tone: "mid" };
  if (rating === "Low" || rating === "Maybe Low")
    return { label: rating === "Maybe Low" ? "~Low" : "Low", glyph: "✕", tone: "neg" };
  return { label: rating, glyph: "–", tone: "none" };
}

function RatingCell({
  rating,
  isEstimate,
  isYou,
  justification,
  sources,
  onChipClick,
}: {
  rating: string;
  isEstimate: boolean;
  isYou: boolean;
  justification?: string;
  sources: string[];
  onChipClick: () => void;
}) {
  const { label, glyph, tone } = ratingDisplay(rating);
  const { color, soft } = TONE[tone];
  // "Unverified" / "—" are genuine non-answers — never decorate them as estimates.
  const isAnswer = rating !== "" && rating !== "N/A" && rating !== "Cannot Verify";
  const showEst = isEstimate && isAnswer;
  const chipClass = `heatmap__chip${isYou ? " heatmap__you-chip" : ""}${showEst ? " heatmap__chip--est" : ""}`;
  const chipStyle = { color, background: soft } as const;

  const chipBody = (
    <>
      <span aria-hidden="true">{glyph}</span>
      {label}
      {showEst ? (
        <span className="rating__est" aria-label="estimated, not verified">✦</span>
      ) : null}
    </>
  );

  const hasContext = justification || sources.length > 0 || isEstimate;
  const cellClass = `heatmap__cell${isYou ? " heatmap__you-cell" : ""}`;

  if (!hasContext) {
    return (
      <div className={cellClass}>
        <span className={chipClass} style={chipStyle}>{chipBody}</span>
      </div>
    );
  }

  return (
    <div className={cellClass}>
      <Popover>
        <PopoverTrigger
          asChild
          onClick={(e) => {
            e.stopPropagation();
            onChipClick();
          }}
        >
          <button type="button" className={chipClass} style={chipStyle}>{chipBody}</button>
        </PopoverTrigger>
        <PopoverContent className="text-xs space-y-2" onClick={(e) => e.stopPropagation()}>
          {isEstimate ? (
            <p className="leading-snug font-medium text-[hsl(var(--gold))]">
              <span aria-hidden="true">✦</span> Best estimate — based on research, not confirmed by a citable source.
            </p>
          ) : null}
          {justification ? <p className="leading-snug">{justification}</p> : null}
          {sources.length > 0 ? (
            <div className="space-y-1 pt-1 border-t">
              {sources.map((url, i) => {
                let domain = url;
                try { domain = new URL(url).hostname.replace("www.", ""); } catch { /* keep full url */ }
                return (
                  <a
                    key={`${url}-${i}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-[hsl(var(--kano-perf))] hover:underline"
                  >
                    {domain}
                  </a>
                );
              })}
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

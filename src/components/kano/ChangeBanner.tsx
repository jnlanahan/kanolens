import { GitCompareArrows, ArrowRight } from "lucide-react";

import type { CellChange } from "@/lib/diff";

function shortRating(rating: string): string {
  if (!rating || rating === "N/A" || rating === "") return "—";
  if (rating === "Cannot Verify") return "Unverified";
  return rating;
}

/** Shown on a re-run report: what moved since the previous run. */
export function ChangeBanner({ changes }: { changes: CellChange[] }) {
  if (changes.length === 0) {
    return (
      <div className="rounded-[13px] border bg-muted/40 p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <GitCompareArrows className="h-4 w-4 shrink-0" aria-hidden="true" />
        No rating changes since the previous run.
      </div>
    );
  }

  const shown = changes.slice(0, 6);
  const extra = changes.length - shown.length;

  return (
    <div className="rounded-[13px] border border-[hsl(var(--kano-perf)/0.4)] bg-[hsl(var(--kano-perf)/0.06)] p-4 space-y-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        <GitCompareArrows className="h-4 w-4 shrink-0 text-[hsl(var(--kano-perf))]" aria-hidden="true" />
        {changes.length} change{changes.length === 1 ? "" : "s"} since the previous run
      </p>
      <ul className="flex flex-wrap gap-2">
        {shown.map((c) => (
          <li
            key={`${c.featureId}-${c.product}`}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs"
          >
            <span className="font-medium">{c.product}</span>
            <span className="text-muted-foreground">· {c.featureName}:</span>
            <span className="text-muted-foreground">{shortRating(c.from)}</span>
            <ArrowRight className="h-3 w-3 text-[hsl(var(--kano-perf))]" aria-hidden="true" />
            <span className="font-medium">{shortRating(c.to)}</span>
          </li>
        ))}
        {extra > 0 ? (
          <li className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground">
            +{extra} more
          </li>
        ) : null}
      </ul>
    </div>
  );
}

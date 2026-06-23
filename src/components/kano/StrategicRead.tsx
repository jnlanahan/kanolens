import { Lightbulb } from "lucide-react";

/**
 * The headline takeaway of a report — an opinionated, table-grounded strategic
 * read shown prominently above the matrix (not a muted footnote).
 */
export function StrategicRead({ summary }: { summary?: string }) {
  if (!summary?.trim()) return null;
  return (
    <div className="rounded-[13px] border border-[hsl(var(--gold)/0.35)] bg-[hsl(var(--gold)/0.06)] p-5 flex gap-3">
      <Lightbulb className="h-5 w-5 shrink-0 text-[hsl(var(--gold))] mt-0.5" aria-hidden="true" />
      <div className="space-y-1 min-w-0">
        <p className="eyebrow text-[hsl(var(--gold))]">Strategic read</p>
        <p className="text-[15px] leading-relaxed text-foreground/90">{summary}</p>
      </div>
    </div>
  );
}

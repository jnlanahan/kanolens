import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Share2, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { KanoTable } from "@/components/kano/KanoTable";
import { RefineChat } from "@/components/kano/RefineChat";
import { StepStrip } from "@/components/kano/StepStrip";
import { InsightsPanel, SignalStrip, detectInsights, type Insight } from "@/components/kano/InsightsPanel";
import { TLDRBanner } from "@/components/kano/TLDRBanner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { KanoTableData } from "@/lib/kano-types";

export const Route = createFileRoute("/report/$sessionId")({
  component: ReportPage,
});

function ReportPage() {
  const { sessionId } = Route.useParams();
  const queryClient = useQueryClient();
  const [hoveredInsight, setHoveredInsight] = useState<Insight | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const shareMutation = useMutation({
    mutationFn: () => api.enableShare(sessionId),
    onSuccess: ({ shareUrl }) => {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
      toast.success("Link copied to clipboard");
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    },
    onError: () => toast.error("Couldn't generate share link"),
  });

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
  });

  // Hoist data derivation above early returns so hooks are called unconditionally
  const analysis = sessionQuery.data?.analysis;
  const session = sessionQuery.data?.session;
  const scope = analysis?.scope;

  const table: KanoTableData | undefined = analysis?.tableData
    ? { ...analysis.tableData, sources: analysis.sources?.byFeatureId ?? {} }
    : undefined;

  const insights = useMemo(
    () => (table && scope ? detectInsights(table, scope.userProductName ?? null) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysis?.tableData, scope?.userProductName],
  );

  const highlightedFeatureIds = useMemo(
    () => (hoveredInsight ? new Set(hoveredInsight.affectedFeatureIds) : undefined),
    [hoveredInsight],
  );

  // Early returns AFTER all hooks
  if (sessionQuery.isLoading) {
    return (
      <div className="container max-w-[1280px] py-10 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="container max-w-3xl py-16 text-center space-y-3">
        <h2 className="text-xl">Couldn't load report</h2>
        <p className="text-sm text-muted-foreground">
          {sessionQuery.error instanceof Error ? sessionQuery.error.message : "Something went wrong."}
        </p>
        <Button onClick={() => sessionQuery.refetch()}>Retry</Button>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="container max-w-3xl py-16 text-center space-y-3">
        <h2 className="text-2xl">No report yet</h2>
        <p className="text-sm text-muted-foreground">
          The analysis hasn't finished, or finished without committing a table.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-[1240px] py-8 space-y-5">
      {/* Page header */}
      <header className="flex items-start justify-between gap-6">
        <div className="space-y-1 min-w-0">
          <p className="eyebrow">Analysis complete</p>
          <h1 className="text-[34px] leading-tight">{session?.title}</h1>
          {table.summary ? (
            <div className="max-w-3xl">
              <p className={`text-sm text-muted-foreground${summaryExpanded ? "" : " line-clamp-2"}`}>
                {table.summary}
              </p>
              {table.summary.length > 160 ? (
                <button
                  type="button"
                  className="text-xs text-[hsl(var(--gold))] hover:underline mt-0.5"
                  onClick={() => setSummaryExpanded((v) => !v)}
                >
                  {summaryExpanded ? "Show less" : "Show more"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => shareMutation.mutate()}
          disabled={shareMutation.isPending}
        >
          {shareCopied ? (
            <><Check className="h-3.5 w-3.5 mr-1.5" />Copied!</>
          ) : (
            <><Share2 className="h-3.5 w-3.5 mr-1.5" />Share</>
          )}
        </Button>
      </header>

      {/* Context strip */}
      {scope ? (
        <StepStrip
          productName={scope.userProductName}
          competitorCount={scope.products.length}
          featureCount={scope.features.length}
          updatedAt={session?.updatedAt ?? new Date().toISOString()}
        />
      ) : null}

      {/* Signal strip — counts by insight type */}
      {insights.length > 0 ? <SignalStrip insights={insights} /> : null}

      {/* Heatmap matrix — full width; row clicks open the built-in modal popup */}
      <KanoTable
        tableData={table}
        isLoading={false}
        highlightedFeatureIds={highlightedFeatureIds}
        userProductName={scope?.userProductName ?? null}
      />

      {/* Below the matrix: "What it means" insight list + sticky Refine rail */}
      <div className="report-bottom">
        <div className="min-w-0">
          {insights.length > 0 ? (
            <InsightsPanel insights={insights} onInsightHover={setHoveredInsight} />
          ) : null}
        </div>
        <aside className="report-bottom__rail">
          <div
            className="panel overflow-hidden flex flex-col rounded-[13px]"
            style={{ maxHeight: "calc(100vh - 100px)" }}
          >
            <RefineChat sessionId={sessionId} queryClient={queryClient} />
          </div>
        </aside>
      </div>

      {/* At-a-glance recap — actionable Steal / Watch / Skip buckets */}
      <TLDRBanner insights={insights} tableData={table} userProductName={scope?.userProductName ?? null} />
    </div>
  );
}

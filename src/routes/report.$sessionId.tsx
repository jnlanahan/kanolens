import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Share2, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { KanoTable } from "@/components/kano/KanoTable";
import { RefineChat } from "@/components/kano/RefineChat";
import { StepStrip } from "@/components/kano/StepStrip";
import { InsightsPanel, detectInsights, type Insight } from "@/components/kano/InsightsPanel";
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
    <div className="container max-w-[1280px] py-8 space-y-6">
      {/* Page header */}
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">Analysis complete</p>
          <h1 className="text-2xl">{session?.title}</h1>
          {table.summary ? (
            <p className="text-sm text-muted-foreground max-w-3xl">{table.summary}</p>
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

      {/* TL;DR summary banner */}
      <TLDRBanner insights={insights} tableData={table} userProductName={scope?.userProductName ?? null} />

      {/* Two-column layout: table + sticky rail */}
      <div className="overview-grid">
        {/* Left: table — row clicks open the built-in modal popup */}
        <div className="min-w-0">
          <KanoTable
            tableData={table}
            isLoading={false}
            highlightedFeatureIds={highlightedFeatureIds}
          />
        </div>

        {/* Right: sticky rail — strategic insights above refine chat */}
        <aside className="overview-rail">
          {insights.length > 0 && (
            <div className="panel p-3 overflow-y-auto shrink-0 max-h-[45%]">
              <InsightsPanel insights={insights} onInsightHover={setHoveredInsight} compact />
            </div>
          )}
          <div className="panel flex-1 overflow-hidden flex flex-col min-h-0">
            <RefineChat sessionId={sessionId} queryClient={queryClient} />
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { useMemo } from "react";

import { KanoTable } from "@/components/kano/KanoTable";
import { InsightsPanel, detectInsights, strategyToInsights } from "@/components/kano/InsightsPanel";
import { StrategicRead } from "@/components/kano/StrategicRead";
import { TLDRBanner } from "@/components/kano/TLDRBanner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { KanoTableData } from "@/lib/kano-types";

export const Route = createFileRoute("/share/$shareToken")({
  component: SharedReport,
});

function SharedReport() {
  const { shareToken } = Route.useParams();

  const query = useQuery({
    queryKey: ["share", shareToken],
    queryFn: () => api.getShare(shareToken),
    retry: false,
  });

  if (query.isLoading) {
    return (
      <div className="container max-w-[1280px] py-10 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (query.isError || !query.data?.tableData) {
    return (
      <div className="container max-w-3xl py-16 text-center space-y-4">
        <h2 className="text-xl">Analysis not found</h2>
        <p className="text-sm text-muted-foreground">
          This link may have expired or sharing may have been disabled.
        </p>
        <Button asChild className="btn-brand">
          <a href="/api/auth/google">Sign in to run your own <ArrowRight className="h-4 w-4 ml-1" /></a>
        </Button>
      </div>
    );
  }

  const { tableData: rawTableData, scope, sources, title } = query.data;

  const table: KanoTableData = {
    ...rawTableData!,
    sources: sources?.byFeatureId ?? {},
    sourceClaims: sources?.claimsByFeatureId ?? {},
  };

  return <SharedReportContent table={table} scope={scope} title={title} />;
}

function SharedReportContent({
  table,
  scope,
  title,
}: {
  table: KanoTableData;
  scope: { userProductName: string | null } | null;
  title: string;
}) {
  const insights = useMemo(
    () =>
      table.strategy
        ? strategyToInsights(table.strategy)
        : detectInsights(table, scope?.userProductName ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, scope?.userProductName],
  );

  return (
    <div className="container max-w-[1280px] py-8 space-y-6">
      {/* Read-only notice */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border bg-muted/40 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>Shared read-only analysis</span>
        </div>
        <Button asChild size="sm" className="btn-brand">
          <a href="/api/auth/google">
            Build your own <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </a>
        </Button>
      </div>

      {/* Page header */}
      <header className="space-y-1">
        <p className="eyebrow">Competitive analysis</p>
        <h1 className="text-2xl">{title}</h1>
      </header>

      {/* Strategic read */}
      <StrategicRead summary={table.strategy?.headline ?? table.summary} />

      {/* TL;DR banner */}
      <TLDRBanner insights={insights} tableData={table} userProductName={scope?.userProductName ?? null} />

      {/* Kano table — read-only (no feature selection handler) */}
      <KanoTable tableData={table} isLoading={false} userProductName={scope?.userProductName ?? null} />

      {/* Insights */}
      <InsightsPanel insights={insights} onInsightHover={() => {}} />

      {/* Footer CTA */}
      <div className="panel p-6 text-center space-y-3">
        <p className="text-sm font-medium">Want to analyze your own product?</p>
        <p className="text-xs text-muted-foreground">KanoLens builds a fully-cited Kano table in under a minute.</p>
        <Button asChild className="btn-brand">
          <Link to="/">
            Get started <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

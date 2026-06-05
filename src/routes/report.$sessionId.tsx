import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, FileText } from "lucide-react";
// MessageSquare used in rail tab button only
import { useState } from "react";

import { KanoTable } from "@/components/kano/KanoTable";
import { RefineChat } from "@/components/kano/RefineChat";
import { StepStrip } from "@/components/kano/StepStrip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { KanoTableData, KanoFeature } from "@/lib/kano-types";

export const Route = createFileRoute("/report/$sessionId")({
  component: ReportPage,
});

type RailTab = "refine" | "detail";

function ReportPage() {
  const { sessionId } = Route.useParams();
  const queryClient = useQueryClient();
  const [railTab, setRailTab] = useState<RailTab>("refine");
  const [selectedFeature, setSelectedFeature] = useState<KanoFeature | null>(null);

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
  });

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

  const analysis = sessionQuery.data?.analysis;
  const session = sessionQuery.data?.session;
  const scope = analysis?.scope;

  if (!analysis?.tableData) {
    return (
      <div className="container max-w-3xl py-16 text-center space-y-3">
        <h2 className="text-2xl">No report yet</h2>
        <p className="text-sm text-muted-foreground">
          The analysis hasn't finished, or finished without committing a table.
        </p>
      </div>
    );
  }

  const table: KanoTableData = {
    ...analysis.tableData,
    sources: analysis.sources?.byFeatureId ?? {},
  };

  function handleFeatureSelect(feature: KanoFeature) {
    setSelectedFeature(feature);
    setRailTab("detail");
  }

  return (
    <div className="container max-w-[1280px] py-8 space-y-6">
      {/* Page header */}
      <header className="space-y-1">
        <p className="eyebrow">Analysis complete</p>
        <h1 className="text-2xl">{session?.title}</h1>
        {table.summary ? (
          <p className="text-sm text-muted-foreground max-w-3xl">{table.summary}</p>
        ) : null}
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

      {/* Two-column overview */}
      <div className="overview-grid">
        {/* Left: table */}
        <div className="min-w-0">
          <KanoTable
            tableData={table}
            isLoading={false}
            onFeatureSelect={handleFeatureSelect}
            selectedFeatureId={selectedFeature?.id}
          />
        </div>

        {/* Right: sticky rail */}
        <aside className="overview-rail">
          {/* Tab switcher */}
          <div className="rail-switch">
            <button
              type="button"
              className={`rail-switch__btn${railTab === "refine" ? " rail-switch__btn--on" : ""}`}
              onClick={() => setRailTab("refine")}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Refine
            </button>
            <button
              type="button"
              className={`rail-switch__btn${railTab === "detail" ? " rail-switch__btn--on" : ""}`}
              onClick={() => setRailTab("detail")}
            >
              <FileText className="h-3.5 w-3.5" />
              Detail
            </button>
          </div>

          {/* Rail content */}
          <div className="panel flex-1 overflow-hidden flex flex-col">
            {railTab === "refine" ? (
              <RefineChat sessionId={sessionId} queryClient={queryClient} />
            ) : (
              <DetailPane feature={selectedFeature} tableData={table} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}


function DetailPane({ feature, tableData }: { feature: KanoFeature | null; tableData: KanoTableData }) {
  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center h-full min-h-[240px]">
        <p className="text-sm text-muted-foreground">Click any row to see the full breakdown.</p>
      </div>
    );
  }

  const sources = tableData.sources[feature.id] ?? [];
  const ratings = tableData.ratings[feature.id] ?? {};
  const justifications = tableData.justifications?.[feature.id] ?? {};

  const headClass = `detail__head detail__head--${feature.category}`;
  const catIcon = feature.category === "must-have" ? "◼" : feature.category === "performance" ? "▲" : "★";

  return (
    <div className="detail flex-1 overflow-hidden">
      <div className={headClass}>
        <span className="detail__head-icon" aria-hidden="true">{catIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="detail__head-cat">{feature.category.replace("-", " ")}</p>
          <p className="text-sm font-semibold leading-snug mt-0.5">{feature.name}</p>
        </div>
      </div>

      <div className="detail__body">
        {feature.customerBenefit ? (
          <div>
            <p className="detail__label">Customer benefit</p>
            <p className="text-sm leading-relaxed">{feature.customerBenefit}</p>
          </div>
        ) : null}

        {feature.description ? (
          <div>
            <p className="detail__label">Description</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        ) : null}

        {Object.keys(ratings).length > 0 ? (
          <div>
            <p className="detail__label">Competitive position</p>
            <div className="space-y-2">
              {Object.entries(ratings).map(([product, rating]) => (
                <div key={product} className="detail__stat">
                  <div>
                    <p className="text-xs font-semibold">{product}</p>
                    {justifications[product] ? (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {justifications[product]}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs font-medium shrink-0 ml-3">{rating}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {sources.length > 0 ? (
          <div>
            <p className="detail__label">Sources</p>
            <div className="space-y-1.5">
              {sources.map((url) => {
                let domain = url;
                try { domain = new URL(url).hostname.replace("www.", ""); } catch { /* keep full url */ }
                return (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail__source"
                  >
                    <span className="truncate">{domain}</span>
                  </a>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

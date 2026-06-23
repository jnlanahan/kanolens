import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { KanoTable } from "@/components/kano/KanoTable";
import { useAnalysisStream } from "@/hooks/useAnalysisStream";
import { api, type StreamEvent } from "@/lib/api";
import type { KanoFeature, KanoTableData, Rating } from "@/lib/kano-types";

export const Route = createFileRoute("/run/$sessionId")({
  component: RunAnalysis,
});

function RunAnalysis() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
  });

  const stream = useAnalysisStream(sessionId, true);

  const { table, statusText, rowsDone } = useMemo(
    () => buildTableFromEvents(stream.events, sessionQuery.data?.analysis?.scope),
    [stream.events, sessionQuery.data],
  );

  useEffect(() => {
    if (stream.status === "done") {
      const t = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
        navigate({ to: "/report/$sessionId", params: { sessionId } });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [stream.status, navigate, sessionId, queryClient]);

  const running = stream.status !== "done" && stream.status !== "error";

  // Tick once a second while running so the ETA stays fresh.
  const startRef = useRef<number | null>(null);
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    if (startRef.current == null) startRef.current = Date.now();
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (sessionQuery.isError) {
    return (
      <div className="container max-w-5xl py-16 text-center space-y-3">
        <h2 className="text-xl">Couldn't load session</h2>
        <p className="text-sm text-muted-foreground">
          {sessionQuery.error instanceof Error ? sessionQuery.error.message : "Something went wrong."}
        </p>
      </div>
    );
  }

  const totalFeatures = sessionQuery.data?.analysis?.scope?.features?.length ?? 0;
  const pct = totalFeatures > 0 ? Math.min(100, Math.round((rowsDone / totalFeatures) * 100)) : 0;

  let etaText: string | null = null;
  if (running && totalFeatures > 0 && startRef.current != null) {
    if (rowsDone > 0 && rowsDone < totalFeatures) {
      const perRow = (Date.now() - startRef.current) / rowsDone;
      const remaining = Math.max(1, Math.ceil(((totalFeatures - rowsDone) * perRow) / 1000));
      etaText = `~${remaining}s left`;
    } else if (rowsDone === 0) {
      etaText = "Estimating…";
    }
  }

  return (
    <div className="container max-w-5xl py-10 space-y-6">
      {/* Stepper */}
      <div className="stepper-wrap">
        <div className="flex items-center gap-1">
          <span className="stepper__node stepper__node--done">Context</span>
          <span className="stepper__line" />
          <span className="stepper__node stepper__node--done">Scope</span>
          <span className="stepper__line" />
          <span className="stepper__node stepper__node--active">
            <span className="w-2 h-2 rounded-full bg-current opacity-70" />
            Analyze
          </span>
        </div>
      </div>

      <header className="space-y-1">
        <p className="eyebrow">Step 3 of 3</p>
        <h1 className="text-2xl">Running analysis</h1>
        <p className="text-sm text-muted-foreground">
          Rows stream in as each feature is researched. Every rating is source-checked.
        </p>
      </header>

      {/* Status card */}
      <div className="panel p-4 space-y-3">
        <StatusLine status={stream.status} text={statusText} error={stream.error} />
        {running && totalFeatures > 0 ? (
          <div className="space-y-1">
            <meter className="bar" value={pct} max={100} aria-label="Analysis progress" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{rowsDone} of {totalFeatures} features</span>
              {etaText ? <span>{etaText}</span> : null}
            </div>
          </div>
        ) : null}
      </div>

      <KanoTable
        tableData={table}
        isLoading={false}
        isStreaming={stream.status !== "done" && stream.status !== "error"}
        userProductName={sessionQuery.data?.analysis?.scope?.userProductName ?? null}
      />
    </div>
  );
}

function StatusLine({
  status,
  text,
  error,
}: {
  status: ReturnType<typeof useAnalysisStream>["status"];
  text: string;
  error: string | null;
}) {
  if (status === "done") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-[hsl(var(--kano-perf))]" />
        <span>Analysis complete — taking you to the report…</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XCircle className="h-4 w-4" />
        <span>{error ?? "Something went wrong."}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="spin w-4 h-4 border-2 border-[hsl(var(--border-strong))] border-t-[hsl(var(--kano-perf))] rounded-full shrink-0" aria-hidden="true" />
      <span className="text-muted-foreground flex-1 truncate">{text}</span>
      <span className="stepper__node stepper__node--active text-[11px] py-0.5 px-2">{status}</span>
    </div>
  );
}

function buildTableFromEvents(
  events: StreamEvent[],
  scope: { products: string[]; userProductName: string | null; features: KanoFeature[] } | null | undefined,
): { table: KanoTableData | undefined; statusText: string; rowsDone: number } {
  if (!scope) return { table: undefined, statusText: "Connecting…", rowsDone: 0 };

  const products = scope.userProductName ? [...scope.products, scope.userProductName] : [...scope.products];
  const featuresOrdered: KanoFeature[] = [];
  const ratings: Record<string, Record<string, Rating>> = {};
  const justifications: Record<string, Record<string, string>> = {};
  const estimated: Record<string, Record<string, boolean>> = {};
  const confidence: Record<string, Record<string, "high" | "medium" | "low">> = {};
  const sources: Record<string, string[]> = {};
  const sourceClaims: Record<string, Record<string, string>> = {};
  let narration = "Researching…";

  for (const ev of events) {
    if (ev.type === "status" && ev.message) narration = ev.message;
    if (ev.type === "narration") narration = ev.text;
    if (ev.type === "row") {
      if (!ratings[ev.feature.id]) featuresOrdered.push(ev.feature);
      ratings[ev.feature.id] = ev.ratings as Record<string, Rating>;
      justifications[ev.feature.id] = ev.justifications ?? {};
      estimated[ev.feature.id] = ev.estimated ?? {};
      confidence[ev.feature.id] = ev.confidence ?? {};
      sources[ev.feature.id] = ev.sources;
      sourceClaims[ev.feature.id] = ev.sourceClaims ?? {};
    }
  }

  return {
    table: {
      products,
      features: featuresOrdered,
      ratings,
      justifications,
      estimated,
      confidence,
      sources,
      sourceClaims,
    },
    statusText: narration,
    rowsDone: featuresOrdered.length,
  };
}

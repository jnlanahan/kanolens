import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
  });

  const stream = useAnalysisStream(sessionId, true);

  const { table, statusText } = useMemo(
    () => buildTableFromEvents(stream.events, sessionQuery.data?.analysis?.scope),
    [stream.events, sessionQuery.data],
  );

  useEffect(() => {
    if (stream.status === "done") {
      const t = setTimeout(
        () => navigate({ to: "/report/$sessionId", params: { sessionId } }),
        800,
      );
      return () => clearTimeout(t);
    }
  }, [stream.status, navigate, sessionId]);

  return (
    <div className="container max-w-5xl py-10 space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 3 of 3</p>
        <h1 className="text-2xl font-semibold">Running analysis</h1>
        <p className="text-sm text-muted-foreground">
          Rows stream in as each feature is researched. Every rating is source-checked.
        </p>
      </header>

      <Card className="p-4">
        <StatusLine status={stream.status} text={statusText} error={stream.error} />
      </Card>

      <KanoTable tableData={table} isLoading={false} />
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
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <span className="text-muted-foreground">{text}</span>
      <Badge variant="secondary" className="ml-auto">
        {status}
      </Badge>
    </div>
  );
}

function buildTableFromEvents(
  events: StreamEvent[],
  scope: { products: string[]; userProductName: string | null; features: KanoFeature[] } | null | undefined,
): { table: KanoTableData | undefined; statusText: string } {
  if (!scope) return { table: undefined, statusText: "Connecting…" };

  const products = scope.userProductName ? [...scope.products, scope.userProductName] : [...scope.products];
  const featuresOrdered: KanoFeature[] = [];
  const ratings: Record<string, Record<string, Rating>> = {};
  const justifications: Record<string, Record<string, string>> = {};
  const sources: Record<string, string[]> = {};
  let narration = "Researching…";

  for (const ev of events) {
    if (ev.type === "status" && ev.message) narration = ev.message;
    if (ev.type === "narration") narration = ev.text;
    if (ev.type === "row") {
      if (!ratings[ev.feature.id]) featuresOrdered.push(ev.feature);
      ratings[ev.feature.id] = ev.ratings as Record<string, Rating>;
      justifications[ev.feature.id] = ev.justifications ?? {};
      sources[ev.feature.id] = ev.sources;
    }
  }

  return {
    table: {
      products,
      features: featuresOrdered,
      ratings,
      justifications,
      sources,
    },
    statusText: narration,
  };
}

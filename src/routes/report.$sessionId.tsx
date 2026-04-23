import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KanoTable } from "@/components/kano/KanoTable";
import { api } from "@/lib/api";
import type { KanoTableData } from "@/lib/kano-types";

export const Route = createFileRoute("/report/$sessionId")({
  component: ReportPage,
});

function ReportPage() {
  const { sessionId } = Route.useParams();
  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
  });

  if (sessionQuery.isLoading) {
    return (
      <div className="container max-w-5xl py-10 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const analysis = sessionQuery.data?.analysis;
  const session = sessionQuery.data?.session;

  if (!analysis?.tableData) {
    return (
      <div className="container max-w-3xl py-16 text-center space-y-3">
        <h2 className="text-2xl font-semibold">No report yet</h2>
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

  return (
    <div className="container max-w-5xl py-10 space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Report</p>
        <h1 className="text-2xl font-semibold">{session?.title}</h1>
        {table.summary ? (
          <p className="text-sm text-muted-foreground max-w-3xl">{table.summary}</p>
        ) : null}
      </header>

      <KanoTable tableData={table} isLoading={false} />

      <Card className="p-4 text-xs text-muted-foreground">
        Every rating is backed by a source URL or marked Cannot Verify. Click any feature for the
        full competitive breakdown and citation list.
      </Card>
    </div>
  );
}

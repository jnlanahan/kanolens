import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { KanoTable } from "@/components/kano/KanoTable";
import { InsightsPanel, SignalStrip, detectInsights } from "@/components/kano/InsightsPanel";
import { StrategicRead } from "@/components/kano/StrategicRead";
import { TLDRBanner } from "@/components/kano/TLDRBanner";
import { Button } from "@/components/ui/button";
import { demoAnalysis, DEMO_PRODUCT_NAME } from "@/data/demo-analysis";
import { useCurrentUser } from "@/hooks/useAuth";

export const Route = createFileRoute("/example")({
  component: ExampleReport,
});

function ExampleReport() {
  const me = useCurrentUser();
  const insights = useMemo(() => detectInsights(demoAnalysis, DEMO_PRODUCT_NAME), []);

  return (
    <div className="container max-w-[1240px] py-8 space-y-5">
      {/* Example banner */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border border-[hsl(var(--gold)/0.35)] bg-[hsl(var(--gold)/0.07)] text-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--gold))]" />
          <span>This is a live example — {DEMO_PRODUCT_NAME} vs. Linear, Jira &amp; Asana.</span>
        </div>
        <Button asChild size="sm" className="btn-brand">
          <a href={me.data ? "/new" : "/api/auth/google"}>
            Analyze your product <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </a>
        </Button>
      </div>

      <header className="space-y-1">
        <p className="eyebrow">Example analysis</p>
        <h1 className="text-[34px] leading-tight">{DEMO_PRODUCT_NAME} vs. competitors</h1>
      </header>

      {insights.length > 0 ? <SignalStrip insights={insights} /> : null}

      <StrategicRead summary={demoAnalysis.summary} />

      <KanoTable tableData={demoAnalysis} isLoading={false} userProductName={DEMO_PRODUCT_NAME} />

      {insights.length > 0 ? <InsightsPanel insights={insights} onInsightHover={() => {}} /> : null}

      <TLDRBanner insights={insights} tableData={demoAnalysis} userProductName={DEMO_PRODUCT_NAME} />

      {/* Footer CTA */}
      <div className="panel p-6 text-center space-y-3">
        <p className="text-sm font-medium">This took under a minute to generate.</p>
        <p className="text-xs text-muted-foreground">
          Drop in your product and KanoLens builds the same fully-cited table for you.
        </p>
        <Button asChild className="btn-brand">
          {me.data ? (
            <Link to="/new">Start an analysis <ArrowRight className="h-4 w-4 ml-1" /></Link>
          ) : (
            <a href="/api/auth/google">Sign in to get started <ArrowRight className="h-4 w-4 ml-1" /></a>
          )}
        </Button>
      </div>
    </div>
  );
}

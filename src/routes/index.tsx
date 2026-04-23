import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="container py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center space-y-6">
        <p className="inline-block text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Kano Model · Dan Olsen's benefits-focused framing
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          <span className="brand-gradient-text">See what sets you apart.</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Drop in a few competitor docs. KanoLens builds an interactive, fully-cited Kano
          comparison — Must-Haves, Performance Benefits, Delighters — in under a minute.
        </p>
        <div className="pt-2">
          <Button asChild size="lg" variant="brand">
            <Link to="/">
              Start an analysis <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-3">
        <FeatureCard
          title="Cited, not guessed"
          body="Every Yes/Maybe/No carries a source URL and access date. Unsupported claims are marked Cannot Verify."
        />
        <FeatureCard
          title="Benefits over features"
          body="Rows describe the customer benefit — saves time, reduces errors — not the raw feature."
        />
        <FeatureCard
          title="Streams as it builds"
          body="Watch rows populate live. Edit scope before the AI commits. No black boxes."
        />
      </section>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-6 space-y-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}

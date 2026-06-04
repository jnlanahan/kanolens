import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const me = useCurrentUser();
  const ctaHref = me.data ? "/new" : "/api/auth/google";

  return (
    <div className="container py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center space-y-6">
        {/* Medallion */}
        <div className="flex justify-center mb-2">
          <div className="medallion w-[72px] h-[72px]">
            <div className="medallion__ring">
              <div className="medallion__glass">
                <div className="medallion__spec" />
              </div>
            </div>
          </div>
        </div>

        <p className="eyebrow">
          Kano Model · Dan Olsen's benefits-focused framing
        </p>

        <h1 className="text-[clamp(34px,5vw,56px)] leading-[1.08]">
          See what sets{" "}
          <em className="grad-text">you apart.</em>
        </h1>

        <p className="text-lg text-muted-foreground">
          Drop in a few competitor docs. KanoLens builds an interactive,
          fully-cited Kano comparison — Must-Haves, Performance Benefits,
          Delighters — in under a minute.
        </p>

        <div className="flex justify-center gap-3 pt-2 flex-wrap">
          {me.data ? (
            <Button asChild size="lg" className="btn-brand">
              <Link to="/new">
                Start an analysis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="btn-brand">
              <a href={ctaHref}>
                Sign in to start <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </section>

      <section className="mt-20 grid gap-5 md:grid-cols-3">
        <FeatureCard
          icon={<Building2 />}
          eyebrow="Must-Have"
          title="Cited, not guessed"
          body="Every Yes/Maybe/No carries a source URL. Unsupported claims are marked Unverified."
        />
        <FeatureCard
          icon={<TrendingUp />}
          eyebrow="Performance"
          title="Benefits over features"
          body="Rows describe the customer benefit — saves time, reduces errors — not the raw feature."
        />
        <FeatureCard
          icon={<Sparkles />}
          eyebrow="Delighter"
          title="Streams as it builds"
          body="Watch rows populate live. Edit scope before the AI commits. No black boxes."
        />
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="panel lift p-6 space-y-3">
      <div className="feature-ic">{icon}</div>
      <p className="eyebrow">{eyebrow}</p>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

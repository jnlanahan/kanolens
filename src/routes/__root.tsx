import { useEffect, useState } from "react";
import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { LensLogo } from "@/components/brand/LensLogo";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { identifyUser, resetUser, trackEvent } from "@/lib/monitoring";

export const Route = createRootRoute({
  component: RootLayout,
});

function CreditPill({ runCredits, freeRunUsed }: { runCredits: number; freeRunUsed: boolean }) {
  if (runCredits > 0) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[hsl(var(--kano-perf)/0.15)] text-[hsl(var(--kano-perf))] border border-[hsl(var(--kano-perf)/0.3)]">
        {runCredits} {runCredits === 1 ? "run" : "runs"}
      </span>
    );
  }
  if (freeRunUsed) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-500/10 text-orange-600 border border-orange-500/20">
        0 runs
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border">
      1 free run
    </span>
  );
}

function BuyRunButton() {
  const [loading, setLoading] = useState(false);
  async function handleBuy() {
    setLoading(true);
    try {
      const { url } = await api.createCheckout();
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Couldn't start checkout — no URL returned.");
      }
    } catch (err) {
      toast.error("Checkout failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button size="sm" className="btn-brand shrink-0" onClick={() => void handleBuy()} disabled={loading}>
      {loading ? "Loading…" : "Buy a run — $5"}
    </Button>
  );
}

function RootLayout() {
  const { data: user, isLoading: loading } = useCurrentUser();
  const logout = useLogout();

  useEffect(() => {
    if (user) {
      identifyUser({ id: user.id, email: user.email ?? "" });
      trackEvent("signed_in");
    } else if (!loading) {
      resetUser();
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="topbar__brand">
            <LensLogo size={28} />
            <span className="topbar__wordmark">kanolens</span>
            <span className="topbar__sub">Kano Model</span>
          </Link>
          <div />
          <nav className="topbar__right">
            {user ? (
              <>
                <div className="topbar__nav">
                  <Link
                    to="/dashboard"
                    className="topnav"
                    activeProps={{ className: "topnav topnav--on" }}
                  >
                    Dashboard
                  </Link>
                </div>
                <div className="topbar__user">
                  <span className="topbar__avatar">
                    {user.email?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                    {user.email}
                  </span>
                  <CreditPill runCredits={user.runCredits} freeRunUsed={user.freeRunUsed} />
                  {user.freeRunUsed && user.runCredits === 0 ? <BuyRunButton /> : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                  >
                    Sign out
                  </Button>
                </div>
              </>
            ) : !loading ? (
              <a
                href="/api/auth/google"
                className="text-sm underline-offset-4 hover:underline"
              >
                Sign in with Google
              </a>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="footer">
        <span>KanoLens — See what sets you apart.</span>
      </footer>
    </div>
  );
}

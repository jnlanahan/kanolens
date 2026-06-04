import { Link, Outlet, createRootRoute } from "@tanstack/react-router";

import { LensLogo } from "@/components/brand/LensLogo";
import { Button } from "@/components/ui/button";
import { useAutoDevLogin, useLogout } from "@/hooks/useAuth";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const isDev = import.meta.env.DEV;
  const { user, loading } = useAutoDevLogin(isDev);
  const logout = useLogout();

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
        <Outlet />
      </main>
      <footer className="footer">
        <span>KanoLens — See what sets you apart.</span>
      </footer>
    </div>
  );
}

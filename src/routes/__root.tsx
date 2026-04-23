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
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <LensLogo size={28} />
            <span className="brand-gradient-text text-lg tracking-tight">kanolens</span>
          </Link>
          <nav className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </Link>
                <span className="text-sm text-muted-foreground">{user.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                >
                  Sign out
                </Button>
              </>
            ) : !loading ? (
              <a href="/api/auth/google" className="text-sm underline-offset-4 hover:underline">
                Sign in with Google
              </a>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        KanoLens — See what sets you apart.
      </footer>
    </div>
  );
}

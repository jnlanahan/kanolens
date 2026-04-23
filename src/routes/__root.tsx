import { Outlet, createRootRoute, Link } from "@tanstack/react-router";

import { LensLogo } from "@/components/brand/LensLogo";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <LensLogo size={28} />
            <span className="brand-gradient-text text-lg tracking-tight">kanolens</span>
          </Link>
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

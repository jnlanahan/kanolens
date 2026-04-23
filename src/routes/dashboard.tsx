import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useAuth";
import { api, type ApiSessionSummary } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const SESSIONS_KEY = ["sessions"] as const;

function Dashboard() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessions = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => (await api.listSessions()).sessions,
    enabled: Boolean(me.data),
  });

  const create = useMutation({
    mutationFn: () => api.createSession(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      navigate({ to: "/new", search: { sessionId: res.session.id } });
    },
    onError: (err) => toast.error("Couldn't create session", { description: String(err) }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
    onError: (err) => toast.error("Couldn't delete session", { description: String(err) }),
  });

  if (!me.data && !me.isLoading) {
    return (
      <div className="container py-16 text-center space-y-4">
        <h2 className="text-2xl font-semibold">Sign in required</h2>
        <Button asChild variant="brand">
          <a href="/api/auth/google">Sign in with Google</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your analyses</h1>
          <p className="text-sm text-muted-foreground">
            Pick up where you left off, or start a new competitive scan.
          </p>
        </div>
        <Button
          variant="brand"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          <Plus className="h-4 w-4" /> New analysis
        </Button>
      </div>

      {sessions.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (sessions.data?.length ?? 0) === 0 ? (
        <Card className="p-10 text-center">
          <h2 className="font-semibold mb-2">No analyses yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Start your first Kano competitive scan. Takes under a minute.
          </p>
          <Button variant="brand" onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="h-4 w-4" /> Start analysis
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sessions.data?.map((s) => (
            <li key={s.id}>
              <SessionCard
                session={s}
                onDelete={() => del.mutate(s.id)}
                disabled={del.isPending}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SessionCard({
  session,
  onDelete,
  disabled,
}: {
  session: ApiSessionSummary;
  onDelete: () => void;
  disabled: boolean;
}) {
  const destination = destinationForStatus(session);
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{session.title}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(session.updatedAt).toLocaleString()}
          </div>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <div className="flex items-center justify-between">
        <Button asChild size="sm" variant="outline">
          <Link to={destination.to} params={{ sessionId: session.id }}>
            {destination.label} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          disabled={disabled}
          aria-label="Delete analysis"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function destinationForStatus(s: ApiSessionSummary): {
  to: "/new" | "/scope/$sessionId" | "/run/$sessionId" | "/report/$sessionId";
  label: string;
} {
  switch (s.status) {
    case "draft":
    case "scoping":
      return { to: "/new", label: "Continue" };
    case "scoped":
      return { to: "/scope/$sessionId", label: "Review scope" };
    case "running":
      return { to: "/run/$sessionId", label: "Watch" };
    case "complete":
    case "error":
      return { to: "/report/$sessionId", label: "View report" };
  }
}

function StatusBadge({ status }: { status: ApiSessionSummary["status"] }) {
  const label: Record<ApiSessionSummary["status"], string> = {
    draft: "Draft",
    scoping: "Scoping",
    scoped: "Scoped",
    running: "Running",
    complete: "Complete",
    error: "Error",
  };
  const variant: Record<ApiSessionSummary["status"], "secondary" | "default" | "destructive"> = {
    draft: "secondary",
    scoping: "secondary",
    scoped: "default",
    running: "default",
    complete: "default",
    error: "destructive",
  };
  return <Badge variant={variant[status]}>{label[status]}</Badge>;
}

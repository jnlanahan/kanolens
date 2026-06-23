import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useAuth";
import { api, type ApiSessionSummary } from "@/lib/api";

const SearchSchema = z.object({
  payment: z.string().optional(),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: SearchSchema,
  component: Dashboard,
});

const SESSIONS_KEY = ["sessions"] as const;

function Dashboard() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { payment } = Route.useSearch();

  useEffect(() => {
    if (payment === "success") {
      toast.success("Payment successful — 1 analysis run added to your account.");
      void navigate({ to: "/dashboard", search: {}, replace: true });
    }
  }, [payment, navigate]);

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

  const reRun = useMutation({
    mutationFn: (id: string) => api.reRun(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      navigate({ to: "/scope/$sessionId", params: { sessionId: res.session.id } });
    },
    onError: (err) => toast.error("Couldn't re-run", { description: String(err) }),
  });

  if (!me.data && !me.isLoading) {
    return (
      <div className="container py-16 text-center space-y-4">
        <h2 className="text-2xl">Sign in required</h2>
        <Button asChild className="btn-brand">
          <a href="/api/auth/google">Sign in with Google</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Your workspace</p>
          <h1 className="text-2xl">Your analyses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick up where you left off, or start a new competitive scan.
          </p>
        </div>
        <Button
          className="btn-brand shrink-0"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          <Plus className="h-4 w-4" /> New analysis
        </Button>
      </div>

      {sessions.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (sessions.data?.length ?? 0) === 0 ? (
        <div className="panel p-10 text-center space-y-3">
          <h2 className="text-lg">No analyses yet</h2>
          <p className="text-sm text-muted-foreground">
            Start your first Kano competitive scan. Takes under a minute.
          </p>
          <Button className="btn-brand" onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="h-4 w-4" /> Start analysis
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {sessions.data?.map((s) => (
            <li key={s.id}>
              <SessionCard
                session={s}
                onDelete={() => del.mutate(s.id)}
                onReRun={() => reRun.mutate(s.id)}
                disabled={del.isPending || reRun.isPending}
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
  onReRun,
  disabled,
}: {
  session: ApiSessionSummary;
  onDelete: () => void;
  onReRun: () => void;
  disabled: boolean;
}) {
  const destination = destinationForStatus(session);
  const canReRun = session.status === "complete";
  return (
    <div className="panel lift p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{session.title}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{new Date(session.updatedAt).toLocaleString()}</span>
            {session.parentSessionId ? (
              <span className="inline-flex items-center gap-1 text-[hsl(var(--kano-perf))]">
                <RefreshCw className="h-3 w-3" /> re-run
              </span>
            ) : null}
          </div>
        </div>
        <StatusChip status={session.status} />
      </div>
      <div className="flex items-center justify-between">
        <Button asChild size="sm" className="btn-gold">
          <Link to={destination.to} params={{ sessionId: session.id }}>
            {destination.label} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          {canReRun ? (
            <button
              type="button"
              onClick={onReRun}
              disabled={disabled}
              aria-label="Re-run analysis"
              title="Re-run — compare against this analysis"
              className="text-muted-foreground hover:text-foreground disabled:opacity-40 p-1.5 rounded-md hover:bg-[hsl(var(--surface-muted))] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Delete analysis"
            className="text-muted-foreground hover:text-foreground disabled:opacity-40 p-1.5 rounded-md hover:bg-[hsl(var(--surface-muted))] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
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

const STATUS_LABEL: Record<ApiSessionSummary["status"], string> = {
  draft: "Draft",
  scoping: "Scoping",
  scoped: "Scoped",
  running: "Running",
  complete: "Complete",
  error: "Error",
};

const STATUS_CLASS: Record<ApiSessionSummary["status"], string> = {
  draft: "stepper__node",
  scoping: "stepper__node",
  scoped: "stepper__node stepper__node--active",
  running: "stepper__node stepper__node--active",
  complete: "stepper__node stepper__node--done",
  error: "stepper__node text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.08)]",
};

function StatusChip({ status }: { status: ApiSessionSummary["status"] }) {
  return (
    <span className={STATUS_CLASS[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}

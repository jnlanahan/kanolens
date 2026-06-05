import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api, type ApiScope, type ApiScopeFeature } from "@/lib/api";
import type { KanoCategory } from "@/lib/kano-types";

export const Route = createFileRoute("/scope/$sessionId")({
  component: ScopeReview,
});

function ScopeReview() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
  });

  const [scope, setScope] = useState<ApiScope | null>(null);

  useEffect(() => {
    if (sessionQuery.data?.analysis?.scope && !scope) {
      setScope(sessionQuery.data.analysis.scope);
    }
  }, [sessionQuery.data, scope]);

  const save = useMutation({
    mutationFn: async (next: ApiScope) => {
      await api.updateScope(sessionId, next);
      return next;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
  });

  const start = useMutation({
    mutationFn: async () => {
      if (scope) await api.updateScope(sessionId, scope);
      await api.startAnalysis(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      navigate({ to: "/run/$sessionId", params: { sessionId } });
    },
    onError: (err) => {
      const description =
        err instanceof ApiError ? err.detailMessage : err instanceof Error ? err.message : String(err);
      toast.error("Couldn't start analysis", { description });
    },
  });

  if (sessionQuery.isLoading || !scope) {
    return (
      <div className="container max-w-3xl py-10 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="container max-w-3xl py-16 text-center space-y-3">
        <h2 className="text-xl">Couldn't load scope</h2>
        <p className="text-sm text-muted-foreground">
          {sessionQuery.error instanceof Error ? sessionQuery.error.message : "Something went wrong."}
        </p>
        <Button onClick={() => sessionQuery.refetch()}>Retry</Button>
      </div>
    );
  }

  function update(updater: (s: ApiScope) => ApiScope) {
    setScope((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      save.mutate(next);
      return next;
    });
  }

  return (
    <div className="container max-w-3xl py-10 space-y-8">
      {/* Stepper */}
      <div className="stepper-wrap">
        <div className="flex items-center gap-1">
          <span className="stepper__node stepper__node--done">Context</span>
          <span className="stepper__line" />
          <span className="stepper__node stepper__node--active">
            <span className="w-2 h-2 rounded-full bg-current opacity-70" />
            Scope
          </span>
          <span className="stepper__line" />
          <span className="stepper__node">Analyze</span>
        </div>
      </div>

      <header className="space-y-1">
        <p className="eyebrow">Step 2 of 3</p>
        <h1 className="text-2xl">Review and adjust the scope</h1>
        <p className="text-sm text-muted-foreground">
          KanoLens proposed these competitors and features. Edit anything — then run the analysis.
        </p>
      </header>

      {/* Context card */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {scope.userProductName === null ? "Market scope" : "Your product"}
          </h2>
          {scope.userProductName === null ? (
            <button
              type="button"
              className="btn-gold px-3 py-1.5 rounded-[var(--radius-sm)] text-sm"
              onClick={() => update((s) => ({ ...s, userProductName: "My product" }))}
            >
              Add my product
            </button>
          ) : (
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => update((s) => ({ ...s, userProductName: null }))}
            >
              Remove my product
            </button>
          )}
        </div>
        <div className="panel p-4 space-y-3">
          {scope.userProductName !== null ? (
            <div className="space-y-1.5">
              <Label className="form-label" htmlFor="scope-product-name">Name</Label>
              <input
                id="scope-product-name"
                className="field"
                placeholder="e.g. Acme Tasks"
                value={scope.userProductName}
                onChange={(e) => update((s) => ({ ...s, userProductName: e.target.value }))}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label className="form-label" htmlFor="scope-target-customer">Target customer</Label>
            <input
              id="scope-target-customer"
              className="field"
              placeholder="e.g. eng leads at 50–500-person startups"
              value={scope.targetCustomer}
              onChange={(e) => update((s) => ({ ...s, targetCustomer: e.target.value }))}
            />
          </div>
        </div>
      </section>

      {/* Competitors */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Competitors ({scope.products.length})</h2>
          <button
            type="button"
            className="btn-gold px-3 py-1.5 rounded-[var(--radius-sm)] text-sm inline-flex items-center gap-1.5"
            onClick={() => update((s) => ({ ...s, products: [...s.products, "New competitor"] }))}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="panel p-2">
          {scope.products.map((name, i) => (
            <div key={i} className="step2-row px-2">
              <span
                className="avatar text-xs shrink-0 w-7 h-7 bg-[hsl(var(--brand-emerald))]"
                aria-hidden="true"
              >
                {name[0]?.toUpperCase() ?? "?"}
              </span>
              <input
                className="field flex-1"
                value={name}
                aria-label={`Competitor ${i + 1} name`}
                onChange={(e) =>
                  update((s) => {
                    const products = [...s.products];
                    products[i] = e.target.value;
                    return { ...s, products };
                  })
                }
              />
              <button
                type="button"
                aria-label="Remove competitor"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-[hsl(var(--surface-muted))] transition-colors shrink-0"
                onClick={() => update((s) => ({ ...s, products: s.products.filter((_, j) => j !== i) }))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Features / benefits */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Features / benefits ({scope.features.length})
          </h2>
          <button
            type="button"
            className="btn-gold px-3 py-1.5 rounded-[var(--radius-sm)] text-sm inline-flex items-center gap-1.5"
            onClick={() =>
              update((s) => ({
                ...s,
                features: [
                  ...s.features,
                  {
                    id: `custom-${Date.now()}`,
                    name: "New benefit",
                    description: "",
                    customerBenefit: "",
                    category: "must-have" as KanoCategory,
                  },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="panel p-2">
          {scope.features.map((feature, i) => (
            <FeatureRow
              key={feature.id}
              feature={feature}
              onChange={(next) =>
                update((s) => {
                  const features = [...s.features];
                  features[i] = next;
                  return { ...s, features };
                })
              }
              onRemove={() =>
                update((s) => ({ ...s, features: s.features.filter((_, j) => j !== i) }))
              }
            />
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {save.isPending ? (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> saving…
          </span>
        ) : null}
        <Button
          size="lg"
          className="btn-brand"
          disabled={start.isPending || scope.features.length === 0 || scope.products.length === 0}
          onClick={() => start.mutate()}
        >
          {start.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Starting…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Run analysis
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function FeatureRow({
  feature,
  onChange,
  onRemove,
}: {
  feature: ApiScopeFeature;
  onChange: (next: ApiScopeFeature) => void;
  onRemove: () => void;
}) {
  return (
    <div className="step2-row px-2 items-start py-3">
      <div className="flex-1 space-y-1.5 min-w-0">
        <input
          className="field font-medium"
          value={feature.name}
          onChange={(e) => onChange({ ...feature, name: e.target.value })}
          placeholder="Benefit name (what the user gets)"
        />
        <input
          className="field text-sm"
          value={feature.customerBenefit}
          onChange={(e) => onChange({ ...feature, customerBenefit: e.target.value })}
          placeholder="Customer benefit phrasing"
        />
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <CategoryPicker value={feature.category} onChange={(c) => onChange({ ...feature, category: c })} />
        <button
          type="button"
          aria-label="Remove benefit"
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-[hsl(var(--surface-muted))] transition-colors"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const CAT_LABEL: Record<KanoCategory, string> = {
  "must-have": "Must",
  performance: "Perf",
  delighter: "Delight",
};

function CategoryPicker({
  value,
  onChange,
}: {
  value: KanoCategory;
  onChange: (c: KanoCategory) => void;
}) {
  const order: KanoCategory[] = ["must-have", "performance", "delighter"];
  return (
    <div className="flex items-center gap-1">
      {order.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={`cat-pick cat-pick--${cat}${value === cat ? ` cat-pick--on` : ""}`}
        >
          {CAT_LABEL[cat]}
        </button>
      ))}
    </div>
  );
}

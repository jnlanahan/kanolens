import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 2 of 3</p>
        <h1 className="text-2xl font-semibold">Review and adjust the scope</h1>
        <p className="text-sm text-muted-foreground">
          KanoLens proposed these competitors and features. Edit anything — then run the
          analysis.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {scope.userProductName === null ? "Market scope" : "Your product"}
          </h2>
          {scope.userProductName === null ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => update((s) => ({ ...s, userProductName: "My product" }))}
            >
              Add my product to this analysis
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => update((s) => ({ ...s, userProductName: null }))}
            >
              Remove my product
            </Button>
          )}
        </div>
        <Card className="p-4 space-y-3">
          {scope.userProductName !== null ? (
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={scope.userProductName}
                onChange={(e) => update((s) => ({ ...s, userProductName: e.target.value }))}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Target customer</Label>
            <Input
              value={scope.targetCustomer}
              onChange={(e) => update((s) => ({ ...s, targetCustomer: e.target.value }))}
            />
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Competitors ({scope.products.length})</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              update((s) => ({ ...s, products: [...s.products, "New competitor"] }))
            }
          >
            <Plus className="h-4 w-4" /> Add competitor
          </Button>
        </div>
        <Card className="p-4 space-y-2">
          {scope.products.map((name, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={name}
                onChange={(e) =>
                  update((s) => {
                    const products = [...s.products];
                    products[i] = e.target.value;
                    return { ...s, products };
                  })
                }
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove competitor"
                onClick={() =>
                  update((s) => ({ ...s, products: s.products.filter((_, j) => j !== i) }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Features / benefits ({scope.features.length})</h2>
          <Button
            size="sm"
            variant="outline"
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
                    category: "must-have",
                  },
                ],
              }))
            }
          >
            <Plus className="h-4 w-4" /> Add benefit
          </Button>
        </div>
        <ul className="space-y-3">
          {scope.features.map((feature, i) => (
            <FeatureEditor
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
        </ul>
      </section>

      <div className="flex items-center justify-end gap-3">
        {save.isPending ? (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> saving…
          </span>
        ) : null}
        <Button
          variant="brand"
          size="lg"
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

function FeatureEditor({
  feature,
  onChange,
  onRemove,
}: {
  feature: ApiScopeFeature;
  onChange: (next: ApiScopeFeature) => void;
  onRemove: () => void;
}) {
  return (
    <li>
      <Card className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            <Input
              value={feature.name}
              onChange={(e) => onChange({ ...feature, name: e.target.value })}
              className="font-medium"
              placeholder="Benefit name (what the user gets)"
            />
            <Textarea
              rows={2}
              value={feature.customerBenefit}
              onChange={(e) => onChange({ ...feature, customerBenefit: e.target.value })}
              placeholder="Customer benefit phrasing — what does the user experience?"
            />
          </div>
          <div className="flex flex-col items-end gap-2">
            <CategoryPicker
              value={feature.category}
              onChange={(category) => onChange({ ...feature, category })}
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remove benefit"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </li>
  );
}

const CATEGORY_LABEL: Record<KanoCategory, string> = {
  "must-have": "Must-have",
  performance: "Performance",
  delighter: "Delighter",
};

const CATEGORY_VARIANT: Record<KanoCategory, "must" | "perf" | "delight"> = {
  "must-have": "must",
  performance: "perf",
  delighter: "delight",
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
          aria-pressed={value === cat}
          className={`rounded-full transition-all ${
            value === cat ? "ring-2 ring-offset-1 ring-ring" : "opacity-60 hover:opacity-90"
          }`}
        >
          <Badge variant={CATEGORY_VARIANT[cat]}>{CATEGORY_LABEL[cat]}</Badge>
        </button>
      ))}
    </div>
  );
}

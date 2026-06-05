import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useAuth";
import { ApiError, api } from "@/lib/api";

const SearchSchema = z.object({
  sessionId: z.string().optional(),
});

export const Route = createFileRoute("/new")({
  validateSearch: SearchSchema,
  component: NewAnalysis,
});

type Mode = "have-product" | "exploring-market";

function NewAnalysis() {
  const me = useCurrentUser();
  const { sessionId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>("have-product");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [competitors, setCompetitors] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const haveProduct = mode === "have-product";
      const name = haveProduct ? productName.trim() : null;
      let sid: string;
      if (sessionId) {
        sid = sessionId;
      } else {
        const created = await api.createSession(name ?? "Market scan");
        sid = created.session.id;
      }
      const competitorHints = competitors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      await api.proposeScope(sid, {
        userProductName: name ?? undefined,
        userProductDescription: description.trim(),
        targetCustomerHint: targetCustomer.trim() || undefined,
        competitorHints: competitorHints.length > 0 ? competitorHints : undefined,
      });
      return sid;
    },
    onSuccess: (sid) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      navigate({ to: "/scope/$sessionId", params: { sessionId: sid } });
    },
    onError: (err) => {
      const description =
        err instanceof ApiError ? err.detailMessage : err instanceof Error ? err.message : String(err);
      toast.error("Scope proposal failed", { description });
    },
  });

  const disabled =
    (mode === "have-product" && productName.trim().length < 1) ||
    description.trim().length < 10 ||
    submit.isPending;

  if (me.isLoading) {
    return (
      <div className="container max-w-2xl py-10 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!me.data) {
    return (
      <div className="container py-16 text-center">
        <Button asChild className="btn-brand">
          <a href="/api/auth/google">Sign in to start</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-1">
        <span className="stepper__node stepper__node--active">
          <span className="w-2 h-2 rounded-full bg-current opacity-70" />
          Context
        </span>
        <span className="stepper__line" />
        <span className="stepper__node">Scope</span>
        <span className="stepper__line" />
        <span className="stepper__node">Analyze</span>
      </div>

      <header className="space-y-1">
        <p className="eyebrow">Step 1 of 3</p>
        <h1 className="text-2xl">
          {mode === "have-product" ? "Tell us about your product" : "Tell us about the market"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Drop in context. KanoLens will propose a scope (competitors + features) for you to
          review before running the full analysis.
        </p>
      </header>

      <div className="panel p-6 space-y-5">
        <ModeToggle value={mode} onChange={setMode} />

        {mode === "have-product" ? (
          <div className="space-y-1.5">
            <Label className="form-label" htmlFor="productName">Your product name</Label>
            <input
              id="productName"
              className="field"
              placeholder="e.g. Acme Tasks"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              autoFocus
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="form-label" htmlFor="description">
            {mode === "have-product" ? "What does it do?" : "Describe the market or opportunity"}
          </Label>
          <textarea
            id="description"
            rows={6}
            className="field"
            placeholder={
              mode === "have-product"
                ? "e.g. A task tracker for engineering leads. Tightly integrated with GitHub and Slack. Differentiator: instant standup recaps from AI."
                : "e.g. Team retrospective tools for remote engineering teams. Looking at where the space is under-served and what would stand out."
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The more context, the sharper the scope. 100–400 words is a good range.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="form-label" htmlFor="targetCustomer">Target customer <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <input
            id="targetCustomer"
            className="field"
            placeholder="e.g. eng leads at 50–500-person startups"
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="form-label" htmlFor="competitors">Products to include <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <input
            id="competitors"
            className="field"
            placeholder="comma-separated, e.g. Linear, Jira, Asana"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank and KanoLens will propose 3–5 for you.
          </p>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            size="lg"
            className="btn-brand"
            disabled={disabled}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Proposing scope…
              </>
            ) : (
              "Propose scope"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModeToggle({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="space-y-2">
      <Label className="form-label">Do you already have a product?</Label>
      <div role="radiogroup" className="grid grid-cols-2 gap-2">
        <ModeOption
          label="Yes, I have a product"
          description="Compare your product against competitors."
          active={value === "have-product"}
          onClick={() => onChange("have-product")}
        />
        <ModeOption
          label="No, I'm exploring"
          description="Scope a market to see the competitive landscape."
          active={value === "exploring-market"}
          onClick={() => onChange("exploring-market")}
        />
      </div>
    </div>
  );
}

function ModeOption({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <label className={`mode-opt block w-full cursor-pointer${active ? " mode-opt--active" : ""}`}>
      <input
        type="radio"
        className="sr-only"
        checked={active}
        onChange={onClick}
      />
      <div className="flex items-center gap-2 mb-1">
        <span className={`mode-radio${active ? " mode-radio--on" : ""}`} aria-hidden="true">
          {active ? <Check className="h-2.5 w-2.5" /> : null}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground pl-[26px]">{description}</p>
    </label>
  );
}

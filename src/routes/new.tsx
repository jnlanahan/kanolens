import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const SearchSchema = z.object({
  sessionId: z.string().optional(),
});

export const Route = createFileRoute("/new")({
  validateSearch: SearchSchema,
  component: NewAnalysis,
});

function NewAnalysis() {
  const me = useCurrentUser();
  const { sessionId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [competitors, setCompetitors] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const sid = sessionId ?? (await api.createSession(productName.trim() || undefined)).session.id;
      const competitorHints = competitors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      await api.proposeScope(sid, {
        userProductName: productName.trim(),
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
    onError: (err) => toast.error("Scope proposal failed", { description: String(err) }),
  });

  const disabled =
    productName.trim().length < 1 || description.trim().length < 10 || submit.isPending;

  if (!me.data && !me.isLoading) {
    return (
      <div className="container py-16 text-center">
        <Button asChild variant="brand">
          <a href="/api/auth/google">Sign in to start</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 1 of 3</p>
        <h1 className="text-2xl font-semibold">Tell us about your product</h1>
        <p className="text-sm text-muted-foreground">
          Drop in context. KanoLens will propose a scope (competitors + features) for you to
          review before running the full analysis.
        </p>
      </header>

      <Card className="p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="productName">Your product name</Label>
          <Input
            id="productName"
            placeholder="e.g. Acme Tasks"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">What does it do?</Label>
          <Textarea
            id="description"
            rows={6}
            placeholder="e.g. A task tracker for engineering leads. Tightly integrated with GitHub and Slack. Differentiator: instant standup recaps from AI."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The more context, the sharper the scope. 100–400 words is a good range.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetCustomer">Target customer (optional)</Label>
          <Input
            id="targetCustomer"
            placeholder="e.g. eng leads at 50–500-person startups"
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="competitors">Competitors you already have in mind (optional)</Label>
          <Input
            id="competitors"
            placeholder="comma-separated, e.g. Linear, Jira, Asana"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank and KanoLens will propose 3–5 competitors for you.
          </p>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            variant="brand"
            size="lg"
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
      </Card>
    </div>
  );
}

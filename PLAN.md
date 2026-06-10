# KanoLens — Build Plan (June 10, 2026)

---

## Bug 0 — Webhook race condition (Sentry 1a735ca0) ⚠️ Do this first — involves money

**File**: `server/routes/payments.ts`

**Problem**: Stripe retries webhooks automatically. If two deliveries arrive close together, both pass the idempotency `SELECT` check before either has committed its `INSERT`, causing a duplicate-key crash and potentially double-crediting the user.

**Fix**: Replace the `SELECT` + plain `INSERT` (lines 80–97) with a single atomic `INSERT … ON CONFLICT DO NOTHING`. Only run the credit update if a row was actually written.

```ts
const inserted = await db
  .insert(schema.payments)
  .values({
    userId,
    stripeSessionId: session.id,
    amountCents: session.amount_total ?? 500,
    currency: session.currency ?? "usd",
  })
  .onConflictDoNothing()
  .returning({ id: schema.payments.id });

if (inserted.length === 0) return c.text("Already processed", 200);

await db
  .update(schema.users)
  .set({ runCredits: sql`${schema.users.runCredits} + 1` })
  .where(eq(schema.users.id, userId));
```

---

## Bug 1 — "No report available" flash after streaming completes

**File**: `src/routes/run.$sessionId.tsx`

**Problem**: The run page fetches `["session", sessionId]` during streaming and TanStack Query caches it. When streaming completes and the app navigates to the report page 800ms later, the report page reads that stale cache — which was fetched before `tableData` was saved to the DB — and shows "No report yet." Manual page refresh clears the cache and shows the real data.

**Fix**: Before navigating, invalidate the query cache so the report page always fetches fresh.

```ts
// Add useQueryClient import, then change the done-navigation effect:
const queryClient = useQueryClient();

useEffect(() => {
  if (stream.status === "done") {
    const t = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      navigate({ to: "/report/$sessionId", params: { sessionId } });
    }, 800);
    return () => clearTimeout(t);
  }
}, [stream.status, navigate, sessionId, queryClient]);
```

---

## Bug 2 — Duplicate React key warning on source URLs

**File**: `src/routes/report.$sessionId.tsx` line ~215 in `DetailPane`

**Problem**: Sources are mapped with `key={url}`. The same URL can appear twice, causing React's duplicate-key warning (visible in Sentry).

**Fix**: `key={`${url}-${i}`}` — include the loop index.

---

## Feature — Credits counter on every screen

### Step 1: Expose credits from the server
**File**: `server/routes/auth.ts` line 133

Add `runCredits` and `freeRunUsed` to the `/api/auth/me` response:
```ts
return c.json({
  user: { id, email, name, avatarUrl, runCredits: user.runCredits, freeRunUsed: user.freeRunUsed },
});
```

### Step 2: Update the client type
**File**: `src/hooks/useAuth.ts`

Add `runCredits: number` and `freeRunUsed: boolean` to the User type.

### Step 3: Credit pill in the header
**File**: `src/routes/__root.tsx`

Add a pill/badge in the `topbar__user` section (next to the avatar), always visible when logged in:
- `runCredits > 0` → green/blue pill: "2 runs"
- `freeRunUsed && runCredits === 0` → muted/orange pill: "0 runs"
- `!freeRunUsed` → muted pill: "1 free run"

### Step 4: Smarter locked message in RefineChat
**File**: `src/components/kano/RefineChat.tsx`

When `locked === "free_run_no_refine"` and `user.runCredits > 0`, change the message from "Start a new paid analysis ($5)" to "You have a run credit — start a new analysis to use it." (They already paid; no need to show the buy CTA again.)

---

## Feature — Click a rating chip to see the justification

**Problem**: The user wants to click an individual Yes/No/Maybe/High/Low chip in the table and see the reasoning behind that specific rating + the source URL.

**File**: `src/components/kano/KanoTable.tsx`

Wrap each rating chip in a shadcn `Popover` (click-to-open). The popover shows:
- The justification sentence for that product's rating on that feature
- The source domain(s) as links

`justifications` (keyed `featureId → productName → string`) and `sources` (keyed `featureId → string[]`) are already in `KanoTableData` — pass them down through the render loop to the chip component.

Clicking the chip should also fire `onFeatureClick` so the right-rail `DetailPane` updates too.

---

## Feature — Strategic insights panel with row highlighting

**New file**: `src/components/kano/InsightsPanel.tsx`  
**Wire up in**: `src/routes/report.$sessionId.tsx`

### Insight detection (pure client-side, no extra API calls)

Write a `detectInsights(tableData, userProductName): Insight[]` function. Insight type:

```ts
type Insight = {
  id: string;
  type: "risk" | "opportunity" | "gap" | "strength";
  title: string;
  body: string;
  affectedFeatureIds: string[];
};
```

Detection rules:

| Rule | Type | Example |
|------|------|---------|
| Performance Benefit where ≥75% of competitors have High/Yes | `risk` | "Trending to table stakes: Easy Integrations — 3/4 competitors already lead here" |
| Must-Have where your product has No or Cannot Verify | `gap` | "Critical gap: you're missing Real-time Alerts, which competitors treat as baseline" |
| Delighter where only one competitor has it (not you) | `opportunity` | "White space: only Competitor A has Custom Dashboards — room to differentiate" |
| Delighter where only you have it | `strength` | "Unique advantage: you're the only product with AI Summaries" |
| Must-Have where all products have Yes | `strength` | "Table stakes met: Real-time Sync is universally delivered — differentiate elsewhere" |

Your product = `scope.userProductName` or the last entry in `tableData.products`.

### Display

- Insight cards placed below the KanoTable (full width, spans both columns)
- Each card: icon + color by type (red=risk, yellow=gap, blue=opportunity, green=strength) + title + body + "Affects: [feature name]"

### Row highlighting

Add `highlightedFeatureIds?: Set<string>` prop to `KanoTable`. Highlighted rows get a subtle background/left-border accent.

In `report.$sessionId.tsx`: track `hoveredInsight` state. On insight card hover → set `highlightedFeatureIds` to that insight's `affectedFeatureIds`. Pass to `KanoTable`.

---

## Feature — "Still building" visual state during streaming

**Problem**: The table looks identical while streaming vs when complete, which is confusing.

**File**: `src/components/kano/KanoTable.tsx`

Add `isStreaming?: boolean` prop. When true:
- Show a banner at the top of the table: `[spinner] Analyzing features… (X of Y complete)`
- Apply a dashed animated ring to the outer table container (e.g., `ring-2 ring-dashed ring-[hsl(var(--kano-perf))]` with `animate-pulse`) so it's unmistakably "in progress"

**File**: `src/routes/run.$sessionId.tsx`

```tsx
<KanoTable
  tableData={table}
  isLoading={false}
  isStreaming={stream.status !== "done" && stream.status !== "error"}
/>
```

---

## Files to touch

| File | What changes |
|------|-------------|
| `server/routes/payments.ts` | Atomic `INSERT ON CONFLICT DO NOTHING` (Bug 0) |
| `server/routes/auth.ts` | Expose `runCredits`, `freeRunUsed` in `/me` |
| `src/hooks/useAuth.ts` | Add fields to User type |
| `src/routes/__root.tsx` | Credit pill in header |
| `src/routes/run.$sessionId.tsx` | Invalidate cache before navigate; pass `isStreaming` |
| `src/routes/report.$sessionId.tsx` | Fix duplicate key; wire InsightsPanel + row highlighting |
| `src/components/kano/KanoTable.tsx` | `isStreaming` banner; rating chip popovers; `highlightedFeatureIds` |
| `src/components/kano/RefineChat.tsx` | Contextual message when user has credits |
| `src/components/kano/InsightsPanel.tsx` | **New** — insight detection + card display |

---

## Verification checklist

- [ ] Run analysis end-to-end → report page shows table immediately (no "No report yet" flash)
- [ ] Open a report with sources → no duplicate-key warning in console
- [ ] Stripe test card 4242 4242 4242 4242 → credit pill in header updates without refresh
- [ ] Fire the webhook twice with the same session ID → second call returns 200, DB has one payment row, user has one credit (not two)
- [ ] Click a rating chip → popover shows justification + source
- [ ] Hover an insight card → correct table rows highlight
- [ ] During an active run → table has dashed animated border + "Analyzing…" banner; when done → banner gone

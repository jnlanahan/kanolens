# Handoff: KanoLens — "The Analyst's Brief" redesign

## Overview
This is a full visual redesign of KanoLens (the Kano-model competitive-analysis app). It re-skins every screen — Landing, Dashboard, the New → Scope → Run flow, and a new consolidated **Analysis Overview** — into a warm, editorial "research brief" aesthetic, and adds a **Refine chat** panel for editing the analysis in plain language.

## About the design files
The files in `design_src/` are **design references built as an HTML/React prototype** (plain JSX compiled in-browser with Babel, using the prototype's *own* `Button`/`Card`/`Icon` helpers and **Remix Icon**). They are **not** meant to be pasted into your codebase verbatim. Your app is **React + TypeScript + Tailwind + TanStack Router + shadcn/ui with lucide-react icons** — the job is to **recreate these designs using your existing primitives and patterns**, not to swap your stack.

The good news: the prototype was deliberately built on the **same token convention your app already uses** — every color is `hsl(var(--token))`, and the component class names mirror your `@layer components`. So ~80% of the look transfers by porting tokens + CSS, before you touch a single component.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions. Recreate pixel-faithfully with your shadcn components + Tailwind.

---

## Recommended transfer order (de-risked)
Do it in this order so the app keeps working at every step:

1. **Fonts** — load **Newsreader** (display/serif) + **Work Sans** (body). Add to `index.html` `<head>` or the top of `src/index.css`:
   ```css
   @import url("https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,420&family=Work+Sans:wght@400;500;600;700&display=swap");
   ```
2. **Tokens** — replace the values in your `src/index.css` `:root{}` with the ones in `design_src/tokens.css`. Keep your token *names*; only values change (they're the same names the prototype uses, e.g. `--background`, `--foreground`, `--border`, `--primary`, plus the Kano/rating tokens below). This alone re-skins the whole app.
3. **Component classes** — copy the rule blocks from `design_src/styles.css` into your `@layer components` (or a global stylesheet). These are plain classes (`.panel`, `.rating`, `.ribbon`, `.chat`, `.detail`, `.stepper__node`, `.topbar`, …) that your `.tsx` files reference by `className`.
4. **Screens, one at a time** — port each route/component visually (see file map). Verify after each.
5. **New pieces last** — the **Refine chat** and the **tabbed rail** are net-new; wire them after the static screens look right.

> Ship steps 1–3 first and the app is already 80% redesigned with near-zero structural risk. Steps 4–5 are where you map JSX → your `.tsx`.

---

## File map (prototype → your codebase)

| Prototype file / export | Your file | Notes |
|---|---|---|
| `tokens.css` `:root` | `src/index.css` `:root` | Replace values, keep names. |
| `styles.css` (class blocks) | `src/index.css` `@layer components` | Copy classes referenced by `className`. |
| `components.jsx` → `LensLogo` / `.lens-logo` | `src/components/brand/LensLogo.tsx` | Restyle to the new terracotta mark; structure already matches. |
| `components.jsx` → `RatingPill`, `CategoryRibbon` | `src/components/kano/KanoTable.tsx` (or split into small components) | **New rating semantics — see "Gotchas."** |
| `screens-output.jsx` → `KanoComparison` | `src/components/kano/KanoTable.tsx` | One continuous table; the floating Source column was removed. |
| `screens-output.jsx` → `FeatureDetail` | `src/components/kano/FeatureModal.tsx` | Now a **docked rail / tab**, not a modal (can stay a modal if you prefer — same content). |
| `screens-output.jsx` → `StepStrip` | new small component used by the Overview | The 3 context cards at the top of the Overview. |
| `screens-flow.jsx` → `Landing` | `src/routes/index.tsx` | |
| `screens-flow.jsx` → `Dashboard` | `src/routes/dashboard.tsx` | |
| `screens-flow.jsx` → `NewAnalysis` | `src/routes/new.tsx` | |
| `screens-flow.jsx` → `Scope` | `src/routes/scope.$sessionId.tsx` | |
| `screens-flow.jsx` → `Run` | `src/routes/run.$sessionId.tsx` | Streaming table reuses `KanoTable`. |
| `app.jsx` → `Overview` | `src/routes/report.$sessionId.tsx` (or a new `overview` route) | Consolidated surface: header + `StepStrip` + table + rail. |
| `app.jsx` → `RefineChat` | **new** `src/components/kano/RefineChat.tsx` | Net-new; wire to your AI backend. |
| `app.jsx` → `TopBar`, `Tweaks`; `data.js` | — | **Prototype-only. Do not ship.** `Tweaks` is a demo toggle; `data.js` is sample data; `TopBar` is just nav chrome — keep your real layout/data/routing. |

---

## Design tokens (exact values)

**Canvas & ink**
| Token | Value | Hex |
|---|---|---|
| `--background` | `42 28% 93%` | `#f3efe7` warm ivory |
| `--surface` / `--card` | `44 44% 99%` | `#fdfcf8` near-white |
| `--surface-muted` | `42 33% 95%` | inset/hover |
| `--foreground` | `32 19% 13%` | `#241f19` warm near-black |
| `--muted-foreground` | `33 11% 34%` | |
| `--subtle-foreground` | `36 9% 50%` | |
| `--border` | `40 24% 85%` | `#e5ddcf` hairline |
| `--border-strong` | `39 22% 77%` | |

**Brand & accents**
| Token | Value | Meaning |
|---|---|---|
| `--brand-emerald` (kept name) | `15 56% 46%` | **terracotta** brand `#b6532f` |
| `--brand-ink` | `16 62% 37%` | hover/press |
| `--brand-soft` | `19 52% 91%` | wash |
| `--gold` (kept name) | `33 13% 42%` | quiet eyebrow/label ink |
| `--destructive` | `8 52% 46%` | brick red |

**Kano categories** (curated trio: charcoal / teal / ochre)
| Token | Value |
|---|---|
| `--kano-must` / `--kano-must-soft` | `34 18% 24%` / `40 26% 90%` |
| `--kano-perf` / `--kano-perf-soft` | `170 40% 30%` / `162 26% 91%` |
| `--kano-delight` / `--kano-delight-soft` | `38 60% 42%` / `43 50% 90%` |

**Geometry / type / elevation**
- Radius: `--radius: 0.875rem` (14px card), `--radius-sm: 0.5rem` (8px), pill `9999px`.
- Fonts: `--font-display: "Newsreader", Georgia, serif` (headlines, weight 500), `--font-body: "Work Sans", system-ui, sans-serif`.
- Shadows are warm, soft, low: `--shadow-sm/md/lg` in `tokens.css`.

---

## Key design decisions to preserve

- **Headlines are serif (Newsreader), large.** Page titles ~40px, hero `clamp(34px,5vw,56px)`. The italic accent (e.g. "*you apart*") uses `.grad-text` (terracotta italic).
- **Ratings are low-chrome, not loud pills.** A rating reads as a small word + glyph; **verification is a tiny seal** (`verified-badge` icon) next to "Yes", *not* a separate green block.
  - `verified` → soft-teal chip + "Yes" + seal · `yes` → plain teal "Yes" · `maybe` → "Partial" (ochre) · `cannot-verify` → "Unverified" (gray) · `no` → "No" (muted brick) · `na` → "—".
- **No floating Source column.** Citations live only in the detail panel (removes the overlapping pop-out icon).
- **Category rows are ruled labels** (small color swatch + uppercase label + italic one-line definition), not filled gradient bands.
- **Refine chat** lives in a right-rail tab (`Refine` / `Detail`); clicking a table row flips to `Detail`.

---

## Gotchas — where it is NOT a 1:1 match (read before porting)

1. **Icons: Remix → lucide-react.** The prototype uses `ri-*` classes. Map to lucide (line weight):
   `check-line`→`Check`, `verified-badge-fill`→`BadgeCheck`/`ShieldCheck`, `contrast-2-line`(Partial)→`CircleDashed`/`Contrast`, `question-line`→`HelpCircle`, `close-line`→`X`, `arrow-up-line`→`ArrowUp`, `chat-3-line`→`MessageSquare`, `file-list-3-line`→`FileText`, `sparkling-2-line`→`Sparkles`, `download-2-line`→`Download`, `share-forward-line`→`Share2`, `bank-line`/`line-chart-line`/`sparkling-2-line` for the 3 Kano tiers.
2. **Primitives are a styling spec, not imports.** The prototype's `<Button>`, `<Card>`, `<Eyebrow>` are throwaway. Use **your shadcn `Button`/`Card`**; apply the look via the ported tokens/classes (`.panel`, `.btn-brand`, `.eyebrow`, etc.) or by extending your shadcn variants.
3. **Rating type changed — reconcile `kano-types.ts`.** The prototype distinguishes **`verified-yes` vs `yes`**. Decide how "verified" maps in your model: either (a) add a `verified: boolean` derived from "this Yes has a cited source," or (b) add a literal rating value. Also relabel display: `Maybe`→"Partial", `Cannot Verify`→"Unverified". Keep your underlying enum stable and map at the display layer if you don't want a data migration.
4. **The consolidated Overview is additive.** Your app has separate `new`/`scope`/`run`/`report` routes; the Overview merges context + table + rail onto one surface. Add it as the report/overview view — don't delete the step routes.
5. **`data.js`, `Tweaks`, `TopBar` are prototype scaffolding.** Don't ship them. Your real data, layout, and routing stay.
6. **Refine chat is a stub.** `RefineChat` renders a canned thread + an echoing composer. You must wire it to your AI endpoint and have responses emit **table mutations** (add/remove competitor, re-rate, etc.) against your real state.
7. **Tailwind arbitrary values** (`text-[40px]`, `gap-2.5`, …) are fine in your Tailwind; the **custom classes** must come from `styles.css`.

---

## Files in this bundle
- `design_src/` — the prototype source (`tokens.css`, `styles.css`, `components.jsx`, `screens-output.jsx`, `screens-flow.jsx`, `app.jsx`, `data.js`) and `KanoLens Redesign.html` (open in a browser to see the live target).
- `AGENT_PROMPT.md` — a ready-to-paste brief for your AI coding agent.

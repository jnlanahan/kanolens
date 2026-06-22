# Handoff: Market Scan report — "Scan heatmap" redesign

## Overview
A visual redesign of the **analysis report page** (`/report/$sessionId`). It keeps the existing
warm‑editorial look and feel but fixes four specific problems with the current page:

1. **Cramped / truncated competitor column headers** (e.g. "SYSTEMATI SITAWARE HEADQUAR…").
2. **The matrix is hard to scan** — you can't tell who leads at a glance.
3. **The insight cards** (tinted boxes with a colored left border and the same repeated body sentence).
4. **It feels generic / unrefined.**

The redesign turns the comparison table into a **heatmap** (every cell gets a soft background fill
by rating), highlights the user's own product column, replaces the tinted insight cards with a
**4‑tile signal strip + a ruled insight list**, and tidies spacing/typography throughout.

> **This is NOT a greenfield build.** The page already exists in the `kanolens` codebase. This is a
> **restyle of existing React components** using the **existing design tokens** in `src/index.css`.
> Do not introduce a new color system, new fonts, or a new component library. Almost every value
> below already exists as a CSS variable — prefer the variable over the raw hex.

## About the design files
The file in this bundle (`Market Scan — Heatmap.dc.html`) is a **design reference created in HTML** —
a prototype of the intended look and behavior, **not** production code to copy verbatim. It is built
in a small streaming-component runtime (`support.js`) and won't run as-is in the app. Recreate its
appearance in the existing React + TypeScript + Tailwind + shadcn/ui codebase using the established
patterns. A second file, `Market Scan Redesign — three directions.dc.html`, shows the two rejected
directions (A: refined editorial, C: benefit cards) for context only — **implement direction B (the
heatmap), which is the standalone file.**

## Fidelity
**High‑fidelity.** Final colors, typography, spacing, and layout. Recreate pixel‑for‑pixel using the
codebase's existing tokens and components. Where a measurement below is given in px, it is exact.

---

## Target files in the existing codebase
This redesign touches these files (paths relative to the repo root):

| File | What changes |
|---|---|
| `src/components/kano/KanoTable.tsx` | The big one. Table → heatmap grid: filled cells, glyphs, fixed‑width chips, fixed column headers, highlighted "you" column, restyled category ribbons + legend. |
| `src/components/kano/InsightsPanel.tsx` | Drop the tinted left‑border boxes. Render as a **ruled list** (mark + uppercase label + feature name + one specific sentence). Add a derived **signal strip** (counts by insight type). |
| `src/routes/report.$sessionId.tsx` | Layout: move the signal strip up under the header; matrix goes full‑width; insights ("What it means") + Refine rail sit **below** the matrix in a `1fr / 300px` grid. |
| `src/components/kano/StepStrip.tsx` | Minor — spacing/typography polish only; structure unchanged. |
| `src/index.css` | No new tokens required. Optionally add a couple of `--rate-*-soft` helpers (see Design Tokens). |

The Refine chat (`RefineChat.tsx`), `FeatureModal.tsx`, and the data layer (`lib/kano-types.ts`,
`lib/api.ts`) are **unchanged**.

---

## Screens / Views

### Report page (`/report/$sessionId`)
**Purpose:** Show the completed Kano competitive analysis — features × competitors, with the user's
product called out — plus strategic insights, and let the user refine the scan.

**Page layout (top → bottom), inside the existing `.topbar` + `max-width:1240px` container:**
1. **Header row** — eyebrow "ANALYSIS COMPLETE", `<h1>` title, summary paragraph (clamped, "Show more"), and a **Share** button pinned top‑right.
2. **Scope strip** — existing `StepStrip` (Product · Scope · Analyzed), warm inset panel.
3. **Signal strip** — 4 equal KPI tiles: `grid-template-columns: repeat(4, 1fr); gap: 13px`.
4. **Heatmap matrix** — full width, one rounded panel.
5. **Bottom grid** — `grid-template-columns: minmax(0,1fr) 300px; gap: 30px`. Left = "What it means" insight list; Right = sticky **Refine analysis** rail (`position: sticky; top: 78px`).

---

## Components — exact specs

### 1. Heatmap matrix
One panel: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 13px`, `overflow: hidden`.

**Grid:** every row (header row included) is its own CSS grid with the SAME template so columns align:
```
grid-template-columns: 300px repeat(6, minmax(0, 1fr));
```
(300px feature column + 6 equal competitor columns. `minmax(0,1fr)` is required so long names don't blow out the track.)

**Header row** — `background:#f7f2e8` (warm), `border-bottom:1px solid var(--border)`:
- Feature cell: padding `14px 14px 12px 20px`; text `Feature / Benefit`, 10.5px/600, `letter-spacing:.1em`, uppercase, `color:#857d70`, `align-self:end`.
- Each competitor cell: `align-self:end`, centered, padding `13px 5px 10px`, font 11px/500, `color:#6c645a`, `line-height:1.25`. **Split the vendor name across two lines** — brand on line 1, product on line 2 (e.g. `Scale AI` / `Thunderforge`, `Systematic` / `SitaWare`, `Palantir` / `Maven`, `Anduril` / `Lattice C2`, `Command AI` / `Prevail`). This is the fix for the truncation bug — never `line-clamp` a single long string into a narrow column.
- **The user's product column** (here "Onebrief", first column): `background: <accentTint>`, `border-bottom: 2px solid <accentLine>`; product name 11.5px/700 in `<accentLine>`; below it a 8.5px/600 `letter-spacing:.12em` "**YOU**" tag in `<accentLine>`. (`accentLine` = brand terracotta `var(--brand-emerald)` / `#b4502f` by default.)

**Category ribbon row** (Must‑have / Performance / Delighters), full width:
- `display:flex; align-items:center; gap:10px; padding:16px 20px 8px; background:#faf6ec; border-bottom:1px solid #ece6d9`.
- Leading square swatch 9×9px, `border-radius:2px`, color by category (`--kano-must` / `--kano-perf` / `--kano-delight`).
- Label 11px/600, uppercase, `letter-spacing:.1em`, `color:#4a4136`.
- Right‑aligned italic definition: Newsreader italic 12.5px, `color:#948b7d` (e.g. "Absence causes dissatisfaction; presence is merely expected.").

**Feature row** — `border-top:1px solid #f0ebdf`, columns per the grid:
- Feature cell: `padding:13px 20px 13px 20px` (comfortable) / `8px` vertical (compact); `align-self:center`.
  - Name: **Newsreader** 15px, `color:var(--foreground)`, `line-height:1.25`.
  - Benefit (toggle‑able): 11.5px, `color:#6c645a`, `margin-top:4px`, `line-height:1.45`.
- **Rating cell (the heatmap chip):** cell wrapper `padding:6px; display:flex; align-items:center; justify-content:center`. Inside, a full‑width chip:
  ```
  display:inline-flex; align-items:center; justify-content:center; gap:5px;
  width:100%; font-size:11.5px; font-weight:500 (600 for the "you" column);
  padding:7px 6px (comfortable) / 5px 6px (compact); border-radius:7px;
  color:<rating.color>; background:<rating.soft>;
  ```
  Chip content = `<glyph> <label>` (e.g. `✓ Yes`).
  - The **user‑product cell** additionally: wrapper `background:<accentTint>`; chip gets `box-shadow: 0 0 0 1.5px <accentRing>`.

**Rating → display mapping** (extend the existing `ratingDisplay()` in `KanoTable.tsx`):

| Data value (`KanoRating`) | Label | Glyph | Tone | Text color | Soft fill |
|---|---|---|---|---|---|
| `Yes` (+ source) | Yes | `✓` | positive | `var(--rate-yes)` `#2c6a5d` | `var(--kano-perf-soft)` `#e4ede9` |
| `Maybe` | Partial | `◐` | mid | `var(--rate-maybe)` `#9a6a26` | `#f4ebd6` |
| `Cannot Verify` / `""` / `N/A` | Unverified | `–` | none | `var(--rate-unknown)` `#a39a8c` | `#f1ede4` |
| `No` | No | `✕` | negative | `#a64a36` (≈`--rate-no`/`--destructive`) | `#f4ded5` |
| Performance `High` / `Maybe High` | High / ~High | `✓` | positive | as positive | as positive |
| Performance `Medium` / `Maybe Med` | Med / ~Med | `◐` | mid | as mid | as mid |
| Performance `Low` / `Maybe Low` | Low / ~Low | `✕` | negative | as negative | as negative |

Keep the existing **best‑estimate** treatment (the `✦` superscript + dimmed/dashed) on top of the chip for `estimated[featureId][product] === true`. Keep the source‑verified `✓` seal semantics you already have.

**Legend row** (matrix footer) — `background:#f7f2e8; border-top:1px solid var(--border); padding:13px 20px; font-size:11.5px; color:#857d70`. Four swatch+label pairs (16×13px rounded‑3px chips in each rating's soft fill): `Yes ✓`, `Partial ◐`, `Unverified –`, `No ✕`. Right‑aligned: a "Your product" swatch using `accentTint` + the `1.5px accentRing` shadow, label in `accentLine`.

### 2. Signal strip (replaces the tinted insight cards at the top)
4 tiles, `grid-template-columns: repeat(4,1fr); gap:13px`. Each tile: `background:var(--surface); border:1px solid var(--border); border-radius:11px; padding:14px 17px`.
- Big number: **Newsreader** 28px/500, colored by type, `line-height:1`.
- Inline label: 10.5px/600, uppercase, `letter-spacing:.12em`, same color.
- Sub‑caption below: 12px, `color:#857d70`, `margin-top:5px`.

| Tile | Derived from | Number color | Caption |
|---|---|---|---|
| **Gaps** | count of `type === "gap"` | `#9a6a26` (`--rate-maybe`) | "Must‑haves you can't verify" |
| **Risk** | count of `type === "risk"` | `#a64a36` | "A rival confirms it; you don't" |
| **Opening** | count of `type === "opportunity"` | `var(--brand-emerald)` `#b4502f` | "White‑space to differentiate" |
| **Strengths** | count of `type === "strength"` | `var(--kano-perf)` `#2c6a5d` | "Confirmed while rivals are unproven" |

Counts come straight from the existing `detectInsights()` output — group by `insight.type`.

### 3. Insight list — "What it means" (replaces `InsightsPanel` boxes)
Section eyebrow "WHAT IT MEANS" (11px/600, `letter-spacing:.16em`, uppercase, `color:#8a7a55`).
Each insight is a **ruled list row** (no card, no tint, no left border):
```
display:flex; align-items:flex-start; gap:14px; padding:14px 0; border-top:1px solid var(--border);
```
- **Label cell** — `flex:none; width:84px`: a small mark glyph + uppercase 9.5px/700 `letter-spacing:.1em` label, colored by type.
- **Feature name** — `flex:none; width:270px`: Newsreader 15.5px, `color:var(--foreground)`.
- **Note** — `flex:1 1 200px; min-width:180px`: 13px, `color:#6c645a`, `line-height:1.5`. **One specific sentence per insight** — not the generic repeated "You cannot verify this feature…". Write the body from the actual comparison (e.g. "Only SitaWare and Prevail confirm it — an open lane to differentiate.").

Marks/colors by type: `△` Gap `#9a6a26` · `▲` Risk `#a64a36` · `◆` Opening `#b4502f` · `✦` Strength `#2c6a5d`.

> **De‑duplicate the insight copy.** The current page emits the same sentence on every gap. In
> `detectInsights()`, give each insight a body derived from its own data (who leads, how many rivals,
> what to do) so no two rows read identically.

### 4. Refine rail
Existing `RefineChat`, restyled to a quiet panel: `background:var(--surface); border:1px solid var(--border); border-radius:13px; padding:16px 17px; position:sticky; top:78px`. Header = 28×28 rounded‑8px brand‑soft chip with a `✦`, then "Refine analysis" in Newsreader 16px. Suggestion chips: pill, `background:var(--surface-muted); border:1px solid var(--border); border-radius:99px; padding:5px 12px; font-size:12px`. Composer: input (`var(--surface-muted)` field) + 38×38 rounded‑9px brand send button with `→`.

---

## Interactions & behavior
- **Row / chip click** → opens the existing `FeatureModal` for that feature (unchanged behavior).
- **Insight hover** → keep the existing `onInsightHover` → `highlightedFeatureIds` wiring; on the heatmap, a highlighted feature row gets a subtle ring/`box-shadow` accent (reuse the current highlight, just ensure it reads against the filled cells — e.g. `box-shadow: inset 0 0 0 1.5px hsl(var(--brand-emerald)/.35)` on the row).
- **Share** → existing `enableShare` mutation + "Copied!" state.
- **Refine** → existing chat mutation flow.
- **Loading / error / empty** → keep existing `Skeleton` / error / "No report yet" states; restyle skeletons to match (rounded 12–13px panels).
- **Responsive:** below ~1120px, collapse the bottom `1fr/300px` grid to a single column (Refine rail moves under the insight list); the matrix should allow horizontal scroll rather than crushing the 6 competitor columns (`overflow-x:auto` on the matrix panel, min cell width ~96px).

## State management
No new global state. All data is the existing `KanoTableData` from `api.getSession`. New *derived* values only:
- `signalCounts` = `insights` grouped by `type` (compute with `useMemo`).
- Tweakable display options that exist in the prototype but are **optional** for production: `youAccent` (highlight color), `density` (comfortable/compact), `showBenefits` (toggle benefit subtitles). If you don't want user controls, hardcode: accent = brand terracotta, density = comfortable, benefits shown.

## Design tokens
Everything maps to existing `src/index.css` variables — **use the variables.** Hex values are reference only (resolved from the current `:root`).

**Surfaces / text / lines**
- Page background `var(--background)` `#f0ece1` · Panel `var(--surface)` `#fcfaf5` · Muted panel `var(--surface-muted)` `#f5f1e8`
- Warm header fill (matrix header/legend) `#f7f2e8`, ribbon fill `#faf6ec` (tints of `--background`; fine to inline)
- Text `var(--foreground)` `#28221c` · Muted `var(--muted-foreground)` `#6c645a` · Subtle `#857d70`/`#948b7d`
- Border `var(--border)` `#e3dbcb` · inner hairline `#f0ebdf` / `#ece6d9`
- Eyebrow/label gold `#8a7a55` (≈ `--gold`)

**Accent (brand) & ratings**
- Brand terracotta `var(--brand-emerald)` `#b4502f` — used for the "you" highlight, Opening insight, send button.
  - you‑tint `rgba(180,80,47,.07)`, you‑ring `rgba(180,80,47,.32)`.
- Positive `var(--rate-yes)`/`--kano-perf` `#2c6a5d`, soft `var(--kano-perf-soft)` `#e4ede9`
- Mid `var(--rate-maybe)` `#9a6a26`, soft `#f4ebd6`
- None `var(--rate-unknown)` `#a39a8c`, soft `#f1ede4`
- Negative `#a64a36` (≈ `--rate-no`/`--destructive`), soft `#f4ded5`

**Optional new helpers** (only if you'd rather not inline the soft fills): add
`--rate-yes-soft:162 26% 91%; --rate-maybe-soft:43 50% 90%; --rate-none-soft:42 30% 94%; --rate-no-soft:8 40% 91%;`.

**Type**
- Display: **Newsreader** (`--font-display`) 500 — h1 (34px), feature names (15px), insight feature (15.5px), KPI numbers (28px), ribbon definitions (italic 12.5px).
- Body: **Work Sans** (`--font-body`) — everything else. Eyebrows/labels 600, `letter-spacing` .1–.16em, uppercase.

**Radius / shadow** — panels 11–13px, chips 7px, swatches 2–3px, pills 9999px. Reuse `--shadow-sm`/`--shadow-md`.

**Spacing** — page padding `30px 28px 56px`; section gaps 14–26px; matrix cell padding 6px wrapper + 5–7px chip; ribbon padding `16px 20px 8px`.

## Assets
None. The lens logo is the existing CSS `.lens-logo` mark. All glyphs are Unicode (`✓ ◐ – ✕ △ ▲ ◆ ✦ →`) — or swap to your existing `lucide-react` icons if you prefer (e.g. `Check`, `CircleDashed`, `Minus`, `X`, `TrendingUp`, `AlertTriangle`, `Lightbulb`, `Zap`). Icons in the current `InsightsPanel`/`TLDRBanner` are lucide; staying with lucide is fine.

## Files in this bundle
- `Market Scan — Heatmap.dc.html` — the chosen design (direction B). **Implement this.**
- `Market Scan Redesign — three directions.dc.html` — A/B/C explorations, for context only.
- `README.md` — this document (self‑sufficient).

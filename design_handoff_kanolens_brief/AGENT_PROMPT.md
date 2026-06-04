# Paste this to your coding agent

You're porting a completed visual redesign into our existing app. **Read `README.md` in this folder first** — it has the file map, exact tokens, and the list of things that are NOT a 1:1 match. The design lives in `design_src/` as an HTML/React **prototype** (plain JSX + Babel + Remix Icon). Our app is **React + TypeScript + Tailwind + TanStack Router + shadcn/ui + lucide-react**. Recreate the design in OUR stack — do not paste the prototype's `.jsx` in, and do not change our stack.

## Hard rules (do not break these)
1. **Do not touch** routing, data fetching, TanStack Router files' loaders, `kano-types` logic, or our API/state layer except where step 5 below explicitly requires a display-level change.
2. **Use our shadcn primitives** (`Button`, `Card`, etc.) and **lucide-react** icons. The prototype's `<Button>/<Card>/<Icon>` and all `ri-*` classes are references only — map icons per the table in README.
3. **Keep our token names.** Only change token *values* in `src/index.css :root` to match `design_src/tokens.css`. Everything is `hsl(var(--token))`.
4. **Do not ship** `app.jsx`'s `Tweaks` or `TopBar`, or `data.js` — those are prototype scaffolding. Keep our real layout, nav, and data.
5. Work in the README's recommended order and **verify the app builds and renders after each step**. Commit per step.

## Do, in order
1. **Fonts:** add the Newsreader + Work Sans `@import` (in README) to `src/index.css`. Confirm `--font-display`/`--font-body` resolve.
2. **Tokens:** overwrite the values in our `src/index.css :root{}` with `design_src/tokens.css` values (names unchanged). Add the new Kano/rating/brand tokens that don't exist yet. Build + eyeball — the whole app should shift to warm ivory + terracotta.
3. **Component CSS:** copy the class blocks from `design_src/styles.css` into our `@layer components`. Resolve any name clashes in our favor; flag conflicts instead of silently overwriting our existing classes.
4. **Screens (one PR each, verify between):** Landing → Dashboard → New → Scope → Run → the consolidated Overview. Match layout, type scale, spacing, and the component treatments shown in the prototype, using our primitives.
5. **Ratings + types:** implement the new rating display — quiet word + glyph, with **verification shown as a small seal icon**, not a colored block. Reconcile `kano-types.ts`: decide whether "verified" is a derived boolean (a Yes with a cited source) or a new value, and map labels (`Maybe`→"Partial", `Cannot Verify`→"Unverified") at the display layer. Propose the approach before changing the enum.
6. **Remove the floating Source column** from the table; citations stay in the detail panel only.
7. **New: Refine chat.** Build `RefineChat` (right-rail tab `Refine` / `Detail`, see `app.jsx`). Render the thread + composer with our components, then wire `send()` to our AI endpoint. Responses should be able to **mutate the analysis** (add/remove competitor, re-rate a benefit) against our real state — confirm the mutation contract with me before wiring.

## When unsure
Ask before: changing the `Rating`/`KanoCategory` types, altering routes, or introducing new dependencies. Prefer mapping at the display layer over data migrations. If a prototype detail conflicts with an established pattern in our codebase, follow our pattern and note the deviation.

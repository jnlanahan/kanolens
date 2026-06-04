/* KanoLens prototype — Output / Overview screens */

/* ============ KANO COMPARISON TABLE ============ */
function KanoComparison({ products, features, selectedId, onSelect, editable = true }) {
  const cols = `minmax(230px, 1.6fr) repeat(${products.length}, minmax(108px, 1fr))`;
  const byCat = {};
  for (const c of CATEGORY_ORDER) byCat[c] = features.filter((f) => f.category === c);

  return (
    <Card className="overflow-hidden">
      {/* header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <div>
          <h2 className="text-[19px] font-semibold">Kano Model Comparison</h2>
          <p className="muted text-[13px] mt-0.5">Benefits grouped by category · every rating is source-checked</p>
        </div>
        {editable ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm"><Icon name="add-line" /> Add</Button>
            <Button variant="ghost" size="sm"><Icon name="subtract-line" /> Remove</Button>
            <Button variant="ghost" size="sm"><Icon name="arrow-up-down-line" /> Reorder</Button>
          </div>
        ) : null}
      </div>

      {/* column header */}
      <div className="kano-grid items-center px-5 py-3 border-b" style={{ gridTemplateColumns: cols, borderColor: "hsl(var(--border))" }}>
        <div className="eyebrow">Feature / Benefit</div>
        {products.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1.5">
            <Avatar product={p} size={26} />
            <span className="text-[11.5px] muted text-center leading-tight">{p.short}</span>
          </div>
        ))}
      </div>

      {/* category sections */}
      <div className="p-4 space-y-4">
        {CATEGORY_ORDER.map((cat) =>
          byCat[cat].length === 0 ? null : (
            <div key={cat} className="space-y-2">
              <CategoryRibbon category={cat} />
              <div>
                {byCat[cat].map((f) => (
                  <div
                    key={f.id}
                    className={`kano-grid kano-row ${selectedId === f.id ? "kano-row--active" : ""}`}
                    style={{ gridTemplateColumns: cols }}
                    onClick={() => onSelect(f)}
                  >
                    <div className="pr-4">
                      <div className="flex items-start gap-2">
                        <Icon name="arrow-right-s-line" className={`kano-chev ${selectedId === f.id ? "kano-chev--open" : ""}`} />
                        <div>
                          <div className="font-medium text-[14px] leading-snug">{f.name}</div>
                          <div className="muted text-[12.5px] leading-snug mt-0.5">{f.benefit}</div>
                        </div>
                      </div>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="flex justify-center items-center">
                        <RatingPill rating={f.ratings[p.id] || "na"} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </Card>
  );
}

/* ============ FEATURE DETAIL (docked rail or modal body) ============ */
function FeatureDetail({ feature, products, onClose }) {
  if (!feature) {
    return (
      <Card className="p-6 flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-3">
        <div className="lens-logo" style={{ width: 40, height: 40 }}><span className="lens-logo__glass" /></div>
        <p className="muted text-[13px] max-w-[200px]">Select any benefit to see the full competitive breakdown and citations.</p>
      </Card>
    );
  }
  const c = CATEGORY[feature.category];
  const positive = products.filter((p) => ["verified-yes", "yes"].includes(feature.ratings[p.id])).length;
  const pct = Math.round((positive / products.length) * 100);

  return (
    <Card className="detail flex-1 min-h-0">
      <div className={`detail__head detail__head--${feature.category}`}>
        <span className="detail__head-icon"><Icon name={c.icon} /></span>
        <div className="flex-1">
          <div className="detail__head-cat">{c.label}</div>
          <h3 className="text-[15px] font-semibold leading-snug mt-1">{feature.name}</h3>
        </div>
        {onClose ? (
          <button className="detail__close" onClick={onClose} aria-label="Close"><Icon name="close-line" /></button>
        ) : null}
      </div>

      <div className="detail__body">
        <div className="detail__stat">
          <div>
            <div className="text-[22px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>{positive}/{products.length}</div>
            <div className="subtle text-[11px] uppercase tracking-wide">Provide this</div>
          </div>
          <div className="detail__ring" style={{ "--p": pct }}>
            <span>{pct}%</span>
          </div>
        </div>

        <section>
          <h4 className="detail__label">Customer Benefit</h4>
          <p className="text-[13px] leading-relaxed">{feature.benefit}</p>
        </section>

        <section>
          <h4 className="detail__label">Feature Description</h4>
          <p className="muted text-[13px] leading-relaxed">{feature.description}</p>
        </section>

        <section>
          <h4 className="detail__label">Competitive Position</h4>
          <ul className="space-y-2.5 mt-1">
            {products.map((p) => (
              <li key={p.id} className="flex gap-2.5">
                <Avatar product={p} size={22} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{p.name}</span>
                    <RatingPill rating={feature.ratings[p.id] || "na"} />
                  </div>
                  <p className="muted text-[12px] leading-snug mt-0.5">{feature.position[p.id]}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {feature.sources.length ? (
          <section>
            <h4 className="detail__label">Sources</h4>
            <div className="space-y-1.5">
              {feature.sources.map((s, i) => (
                <a key={i} className="detail__source" href={s} target="_blank" rel="noreferrer">
                  <Icon name="links-line" />
                  <span className="truncate">{domainOf(s)}</span>
                  <Icon name="external-link-line" className="ml-auto opacity-60" />
                </a>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <h4 className="detail__label">Sources</h4>
            <div className="rating rating--unknown"><Icon name="alert-line" className="rating__icon" /> No verifiable source found</div>
          </section>
        )}
      </div>
    </Card>
  );
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "source"; }
}

/* ============ STEP STRIP (overview top) ============ */
function StepStrip({ products }) {
  const parallel = window.KANO.parallel;
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Step 1 */}
      <Card className="p-5 panel--gold">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow>Step 1 · Market &amp; User Context</Eyebrow>
          <Icon name="user-search-line" className="text-[15px]" style={{ color: "hsl(var(--gold))" }} />
        </div>
        <div className="space-y-3">
          <div>
            <div className="detail__label">Target customer</div>
            <div className="field field--static">Enterprise teams managing large, multi-source knowledge bases</div>
          </div>
          <div>
            <div className="detail__label">The opportunity</div>
            <div className="field field--static">A permission-aware context layer for AI across every internal tool.</div>
          </div>
        </div>
      </Card>

      {/* Step 2 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow>Step 2 · Competitive Refinement</Eyebrow>
          <Icon name="equalizer-line" className="text-[15px]" style={{ color: "hsl(var(--gold))" }} />
        </div>
        <ul className="space-y-1.5">
          {products.map((p, i) => (
            <li key={p.id} className="step2-row">
              <Avatar product={p} size={22} />
              <span className="text-[13px] font-medium flex-1">{p.name}</span>
              <span className="subtle text-[12px]">{p.features} features</span>
              <Icon name={i === products.length - 1 ? "checkbox-blank-circle-line" : "checkbox-circle-fill"}
                className="text-[15px]" style={{ color: i === products.length - 1 ? "hsl(var(--subtle-foreground))" : "hsl(var(--brand-emerald))" }} />
            </li>
          ))}
        </ul>
      </Card>

      {/* Step 3 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Eyebrow>Step 3 · Real-Time Parallel Analysis</Eyebrow>
          <Icon name="pulse-line" className="text-[15px]" style={{ color: "hsl(var(--gold))" }} />
        </div>
        <ul className="space-y-2.5">
          {parallel.map((row) => {
            const p = pmap[row.id];
            if (!p) return null;
            return (
              <li key={row.id} className="flex items-center gap-3">
                <span className="text-[12px] w-20 truncate" style={{ color: "hsl(var(--foreground))" }}>{p.short}</span>
                <div className="bar flex-1"><div className="bar__fill" style={{ width: `${row.pct}%` }} /></div>
                <span className="text-[12px] tabular-nums w-9 text-right muted">{row.pct}%</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

Object.assign(window, { KanoComparison, FeatureDetail, StepStrip, domainOf });

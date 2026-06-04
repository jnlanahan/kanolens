/* KanoLens prototype — flow screens: Landing, Dashboard, New, Scope, Run */

/* ---- shared step header ---- */
function StepHeader({ step, title, subtitle }) {
  return (
    <header className="space-y-2 mb-7">
      {step ? <Stepper current={step} /> : null}
      <h1 className="text-[28px] tracking-tight">{title}</h1>
      {subtitle ? <p className="muted text-[15px] max-w-2xl">{subtitle}</p> : null}
    </header>
  );
}

function Stepper({ current }) {
  const steps = ["Context", "Scope", "Analyze"];
  return (
    <div className="flex items-center gap-2 mb-1">
      {steps.map((s, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "todo";
        return (
          <React.Fragment key={s}>
            <div className={`stepper__node stepper__node--${state}`}>
              {state === "done" ? <Icon name="check-line" /> : n}
              <span>{s}</span>
            </div>
            {i < steps.length - 1 ? <div className="stepper__line" /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ============ LANDING ============ */
function Landing({ go }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <section className="text-center flex flex-col items-center gap-6">
        <LensMedallion size={92} />
        <Eyebrow>Kano Model · benefits-focused competitive analysis</Eyebrow>
        <h1 className="text-[clamp(34px,5vw,56px)] leading-[1.1] tracking-tight w-full max-w-3xl text-balance">
          See what sets <span className="grad-text">you apart</span>.
        </h1>
        <p className="muted text-[19px] leading-relaxed max-w-2xl">
          Drop in a few competitor docs. KanoLens builds an interactive, fully-cited Kano
          comparison — Must-Haves, Performance Benefits, Delighters — in under a minute.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <Button variant="brand" size="lg" onClick={() => go("new")}>
            Start an analysis <Icon name="arrow-right-line" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => go("overview")}>
            See an example
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 mt-16">
        {[
          { icon: "shield-check-line", title: "Cited, not guessed", body: "Every Yes / Maybe / No carries a source URL. Unsupported claims are flagged Cannot Verify." },
          { icon: "user-heart-line", title: "Benefits over features", body: "Rows describe the customer benefit — saves time, reduces risk — not the raw feature." },
          { icon: "loader-4-line", title: "Streams as it builds", body: "Watch rows populate live. Edit the scope before the AI commits. No black boxes." },
        ].map((f) => (
          <Card key={f.title} className="p-6 lift">
            <div className="feature-ic"><Icon name={f.icon} /></div>
            <h3 className="text-[16px] font-semibold mt-4 mb-1.5">{f.title}</h3>
            <p className="muted text-[13.5px] leading-relaxed">{f.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}

/* ============ DASHBOARD ============ */
function Dashboard({ go }) {
  const sessions = window.KANO.sessions;
  const statusMeta = {
    complete: { label: "Complete", tone: "verified" },
    running: { label: "Running", tone: "yes" },
    scoped: { label: "Scoped", tone: "maybe" },
    draft: { label: "Draft", tone: "na" },
  };
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[34px] tracking-tight">Your analyses</h1>
          <p className="muted text-[15px] mt-1">Pick up where you left off, or start a new competitive scan.</p>
        </div>
        <Button variant="brand" onClick={() => go("new")}><Icon name="add-line" /> New analysis</Button>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <Card className="p-5 lift cursor-pointer" onClick={() => go(s.status === "complete" ? "overview" : s.status === "running" ? "run" : "scope")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-[15px] truncate">{s.title}</div>
                  <div className="subtle text-[12px] mt-0.5">Updated {s.updated}</div>
                </div>
                <span className={`rating rating--${statusMeta[s.status].tone}`}>{statusMeta[s.status].label}</span>
              </div>
              <div className="divider my-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 subtle text-[12.5px]">
                  <span className="inline-flex items-center gap-1.5"><Icon name="apps-2-line" /> {s.products} products</span>
                  <span className="inline-flex items-center gap-1.5"><Icon name="list-check-2" /> {s.features} benefits</span>
                </div>
                <span className="link-ref">Open <Icon name="arrow-right-line" /></span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============ STEP 1 — NEW ============ */
function NewAnalysis({ go }) {
  const [mode, setMode] = React.useState("have-product");
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <StepHeader step={1} title="Tell us about your product"
        subtitle="Drop in context. KanoLens proposes a scope — competitors and benefits — for you to review before the full run." />
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="form-label">Do you already have a product?</label>
          <div className="grid grid-cols-2 gap-2.5">
            <ModeOption active={mode === "have-product"} onClick={() => setMode("have-product")}
              label="Yes, I have a product" desc="Compare yours against competitors." />
            <ModeOption active={mode === "exploring-market"} onClick={() => setMode("exploring-market")}
              label="No, I'm exploring" desc="Scope a market landscape." />
          </div>
        </div>

        {mode === "have-product" ? (
          <Field label="Your product name" placeholder="e.g. Mem" />
        ) : null}

        <div className="space-y-2">
          <label className="form-label">{mode === "have-product" ? "What does it do?" : "Describe the market or opportunity"}</label>
          <textarea className="field" rows={5}
            placeholder="e.g. A permission-aware AI context layer for enterprise teams. Connects every internal tool and only surfaces what each user is allowed to see." />
          <p className="subtle text-[12px]">The more context, the sharper the scope. 100–400 words is a good range.</p>
        </div>

        <Field label="Target customer (optional)" placeholder="e.g. enterprise knowledge teams, 500+ employees" />
        <div className="space-y-2">
          <Field label="Products to include (optional)" placeholder="comma-separated, e.g. Microsoft Copilot, Glean, Guru" />
          <p className="subtle text-[12px]">Leave blank and KanoLens proposes 3–5 for you.</p>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="brand" size="lg" onClick={() => go("scope")}>Propose scope <Icon name="arrow-right-line" /></Button>
        </div>
      </Card>
    </div>
  );
}

function ModeOption({ active, onClick, label, desc }) {
  return (
    <button type="button" onClick={onClick} className={`mode-opt ${active ? "mode-opt--active" : ""}`}>
      <div className="flex items-center gap-2">
        <span className={`mode-radio ${active ? "mode-radio--on" : ""}`}>{active ? <Icon name="check-line" /> : null}</span>
        <span className="text-[13.5px] font-medium">{label}</span>
      </div>
      <span className="subtle text-[12px] mt-1 block pl-7">{desc}</span>
    </button>
  );
}

function Field({ label, placeholder }) {
  return (
    <div className="space-y-2">
      <label className="form-label">{label}</label>
      <input className="field" placeholder={placeholder} />
    </div>
  );
}

/* ============ STEP 2 — SCOPE ============ */
function Scope({ go }) {
  const { products, features } = window.KANO;
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <StepHeader step={2} title="Review and adjust the scope"
        subtitle="KanoLens proposed these competitors and benefits. Edit anything — then run the analysis." />

      <section className="space-y-3 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px]">Competitors <span className="subtle font-normal">({products.length})</span></h2>
          <Button variant="outline" size="sm"><Icon name="add-line" /> Add competitor</Button>
        </div>
        <Card className="p-4 space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5">
              <Avatar product={p} size={24} />
              <input className="field flex-1" defaultValue={p.name} />
              <Button variant="ghost" size="icon"><Icon name="delete-bin-line" /></Button>
            </div>
          ))}
        </Card>
      </section>

      <section className="space-y-3 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px]">Benefits <span className="subtle font-normal">({features.length})</span></h2>
          <Button variant="outline" size="sm"><Icon name="add-line" /> Add benefit</Button>
        </div>
        <ul className="space-y-2.5">
          {features.map((f) => (
            <li key={f.id}>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <input className="field font-medium" defaultValue={f.name} />
                    <textarea className="field" rows={2} defaultValue={f.benefit} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <CategoryPicker value={f.category} />
                    <Button variant="ghost" size="icon"><Icon name="delete-bin-line" /></Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex justify-end">
        <Button variant="brand" size="lg" onClick={() => go("run")}><Icon name="play-fill" /> Run analysis</Button>
      </div>
    </div>
  );
}

function CategoryPicker({ value }) {
  const [v, setV] = React.useState(value);
  const short = { "must-have": "Must", performance: "Perf", delighter: "Delight" };
  return (
    <div className="flex items-center gap-1">
      {CATEGORY_ORDER.map((cat) => (
        <button key={cat} onClick={() => setV(cat)}
          className={`cat-pick cat-pick--${cat} ${v === cat ? "cat-pick--on" : ""}`}>
          {short[cat]}
        </button>
      ))}
    </div>
  );
}

/* ============ STEP 3 — RUN ============ */
function Run({ go, products, features }) {
  const [count, setCount] = React.useState(2);
  React.useEffect(() => {
    if (count >= features.length) {
      const t = setTimeout(() => go("overview"), 1100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c + 1), 900);
    return () => clearTimeout(t);
  }, [count, features.length, go]);

  const shown = features.slice(0, count);
  const done = count >= features.length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <StepHeader step={3} title="Running analysis"
        subtitle="Rows stream in as each benefit is researched in parallel. Every rating is source-checked." />

      <Card className="p-4 mb-5">
        <div className="flex items-center gap-3">
          {done ? <Icon name="checkbox-circle-fill" style={{ color: "hsl(var(--brand-emerald))", fontSize: 18 }} />
            : <Icon name="loader-4-line" className="spin" style={{ color: "hsl(var(--gold))", fontSize: 18 }} />}
          <span className="text-[14px]">{done ? "Analysis complete — opening the report…" : `Researching benefit ${count} of ${features.length}…`}</span>
          <div className="ml-auto flex items-center gap-3 w-64">
            <div className="bar flex-1"><div className="bar__fill" style={{ width: `${(count / features.length) * 100}%`, transition: "width .5s" }} /></div>
            <span className="subtle text-[12px] tabular-nums">{Math.round((count / features.length) * 100)}%</span>
          </div>
        </div>
      </Card>

      <KanoComparison products={products} features={shown} selectedId={null} onSelect={() => {}} editable={false} />
    </div>
  );
}

Object.assign(window, { Landing, Dashboard, NewAnalysis, Scope, Run, StepHeader, Stepper });

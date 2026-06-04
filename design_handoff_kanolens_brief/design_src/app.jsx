/* KanoLens prototype — app shell, overview screen, navigation, tweaks */

const { useState, useEffect } = React;

/* ============ TOP BAR ============ */
function TopBar({ screen, go }) {
  const navs = [
    { id: "landing", label: "Home" },
    { id: "dashboard", label: "Dashboard" },
    { id: "overview", label: "Example report" },
  ];
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <button className="topbar__brand" onClick={() => go("landing")}>
          <LensLogo size={30} />
          <span className="topbar__wordmark">kanolens</span>
          <span className="topbar__sub">Insight Platform</span>
        </button>

        <div className="topbar__center">
          <LensMedallion size={46} />
        </div>

        <div className="topbar__right">
          <nav className="topbar__nav">
            {navs.map((n) => (
              <button key={n.id} className={`topnav ${screen === n.id ? "topnav--on" : ""}`} onClick={() => go(n.id)}>
                {n.label}
              </button>
            ))}
          </nav>
          <div className="topbar__user">
            <span className="topbar__avatar">SM</span>
            <div className="leading-tight text-right">
              <div className="text-[13px] font-medium">Sarah Malik</div>
              <div className="subtle text-[11px]">Product Manager</div>
            </div>
            <Icon name="arrow-down-s-line" className="subtle" />
          </div>
        </div>
      </div>
    </header>
  );
}

/* ============ OVERVIEW (consolidated working surface) ============ */
function Overview() {
  const { products, features } = window.KANO;
  const [selected, setSelected] = useState(features[0]);
  const [tab, setTab] = useState("refine");

  const pickRow = (f) => { setSelected(f); setTab("detail"); };

  return (
    <div className="mx-auto max-w-[1280px] px-7 py-9">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <Eyebrow>Competitive brief · Enterprise</Eyebrow>
          <h1 className="text-[40px] leading-[1.05] mt-2">Analysis overview</h1>
          <p className="muted text-[15px] mt-2">AI context tools for enterprise · 4 competitors · 6 benefits · 14 cited sources</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline"><Icon name="download-2-line" /> Export</Button>
          <Button variant="brand"><Icon name="share-forward-line" /> Share brief</Button>
        </div>
      </div>

      <StepStrip products={products} />

      <div className="overview-grid mt-7">
        <div className="min-w-0">
          <KanoComparison products={products} features={features} selectedId={tab === "detail" ? selected?.id : null} onSelect={pickRow} />
        </div>
        <aside className="overview-rail">
          <div className="rail-switch">
            <button className={`rail-switch__btn ${tab === "refine" ? "rail-switch__btn--on" : ""}`} onClick={() => setTab("refine")}>
              <Icon name="chat-3-line" /> Refine
            </button>
            <button className={`rail-switch__btn ${tab === "detail" ? "rail-switch__btn--on" : ""}`} onClick={() => setTab("detail")}>
              <Icon name="file-list-3-line" /> Detail
            </button>
          </div>
          <div className="min-h-0 flex-1 flex flex-col">
            {tab === "detail"
              ? <FeatureDetail feature={selected} products={products} onClose={() => setTab("refine")} />
              : <RefineChat products={products} onJump={pickRow} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============ REFINE CHAT (the heart of the app) ============ */
function RefineChat({ products, onJump }) {
  const seed = [
    { who: "ai", text: "I built this brief from 14 cited sources across 4 competitors. Ask me to add or drop a competitor, adjust a benefit, or explain any rating — I’ll update the table live." },
    { who: "user", text: "Add Claude as a competitor." },
    { who: "ai", text: "Added Claude and researched all 6 benefits.", change: "Claude · 5 cited · 1 unverified" },
    { who: "user", text: "Why is Notion only Partial on permissions?" },
    { who: "ai", text: "Notion AI is workspace-scoped — it honors space membership but not granular per-page ACLs, so some restricted pages can surface in answers. Copilot and Glean enforce source-system permissions at retrieval time." },
  ];
  const [thread, setThread] = useState(seed);
  const [draft, setDraft] = useState("");
  const threadRef = React.useRef(null);
  React.useEffect(() => { const el = threadRef.current; if (el) el.scrollTop = el.scrollHeight; }, [thread]);

  const send = (text) => {
    const t = (text ?? draft).trim();
    if (!t) return;
    setDraft("");
    setThread((p) => [...p, { who: "user", text: t }]);
    setTimeout(() => {
      setThread((p) => [...p, { who: "ai", text: "On it — re-checking sources and updating the brief.", change: "Brief updated" }]);
    }, 550);
  };

  const suggests = ["Add a competitor", "Drop a benefit", "Explain a rating", "Find delighters"];

  return (
    <Card className="chat flex-1">
      <div className="chat__head">
        <span className="chat__head-mark"><Icon name="sparkling-2-line" /></span>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Refine analysis</div>
          <div className="subtle text-[11.5px]">Edit the brief in plain language</div>
        </div>
      </div>

      <div className="chat__thread" ref={threadRef}>
        {thread.map((m, i) => (
          <div key={i} className={`msg msg--${m.who}`}>
            <div className="msg__bubble">{m.text}</div>
            {m.change ? <span className="msg__change"><Icon name="check-line" /> {m.change}</span> : null}
          </div>
        ))}
      </div>

      <div className="chat__suggests">
        {suggests.map((s) => (
          <button key={s} className="chat__chip" onClick={() => send(s)}>{s}</button>
        ))}
      </div>

      <div className="chat__composer">
        <textarea
          className="chat__input" rows={1} placeholder="Refine the analysis…"
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button className="chat__send" onClick={() => send()} aria-label="Send"><Icon name="arrow-up-line" /></button>
      </div>
    </Card>
  );
}

/* ============ APP ROOT ============ */
function App() {
  const [screen, setScreen] = useState("overview");
  const { products, features } = window.KANO;
  const go = (s) => { setScreen(s); window.scrollTo({ top: 0, behavior: "instant" }); };

  let view;
  switch (screen) {
    case "landing": view = <Landing go={go} />; break;
    case "dashboard": view = <Dashboard go={go} />; break;
    case "new": view = <NewAnalysis go={go} />; break;
    case "scope": view = <Scope go={go} />; break;
    case "run": view = <Run go={go} products={products} features={features} />; break;
    case "overview":
    default: view = <Overview />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar screen={screen} go={go} />
      <main className="flex-1">{view}</main>
      <footer className="footer">
        <span>KanoLens — See what sets you apart.</span>
        <span className="subtle">© 2026 · Insight Platform Enterprise Edition</span>
      </footer>
      <Tweaks />
    </div>
  );
}

/* ============ TWEAKS ============ */
const TWEAK_DEFAULTS = { accent: "terracotta", rows: "ruled", head: "serif", density: "comfortable" };

function Tweaks() {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(() => {
    try { return { ...TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem("kano-tweaks") || "{}") }; }
    catch { return TWEAK_DEFAULTS; }
  });
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.accent = t.accent;
    r.dataset.rows = t.rows;
    r.dataset.head = t.head;
    r.dataset.density = t.density;
    localStorage.setItem("kano-tweaks", JSON.stringify(t));
  }, [t]);
  const set = (k, v) => setT((p) => ({ ...p, [k]: v }));

  return (
    <>
      <button className="tweaks-fab" onClick={() => setOpen((o) => !o)} aria-label="Tweaks">
        <Icon name="equalizer-3-line" />
      </button>
      {open ? (
        <div className="tweaks">
          <div className="tweaks__head">
            <span className="font-semibold text-[14px]">Tweaks</span>
            <button className="detail__close" onClick={() => setOpen(false)}><Icon name="close-line" /></button>
          </div>
          <TweakRow label="Brand accent" value={t.accent} onChange={(v) => set("accent", v)}
            options={[["terracotta", "Clay"], ["teal", "Teal"], ["ochre", "Ochre"]]} />
          <TweakRow label="Headings" value={t.head} onChange={(v) => set("head", v)}
            options={[["serif", "Serif"], ["sans", "Sans"]]} />
          <TweakRow label="Kano rows" value={t.rows} onChange={(v) => set("rows", v)}
            options={[["ruled", "Ruled"], ["tinted", "Tinted"]]} />
          <TweakRow label="Density" value={t.density} onChange={(v) => set("density", v)}
            options={[["comfortable", "Comfortable"], ["compact", "Compact"]]} />
        </div>
      ) : null}
    </>
  );
}

function TweakRow({ label, value, onChange, options }) {
  return (
    <div className="tweak-row">
      <div className="form-label mb-1.5">{label}</div>
      <div className="seg">
        {options.map(([v, l]) => (
          <button key={v} className={`seg__btn ${value === v ? "seg__btn--on" : ""}`} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

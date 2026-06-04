/* KanoLens prototype — sample scenario data (AI context tools) */
window.KANO = (function () {
  const products = [
    { id: "copilot", name: "Microsoft Copilot", short: "Copilot", color: "#3f6b62", letter: "C", features: 12 },
    { id: "glean",   name: "Glean",            short: "Glean",   color: "#9a6a3c", letter: "G", features: 8 },
    { id: "guru",    name: "Guru",             short: "Guru",    color: "#a8503a", letter: "Gu", features: 6 },
    { id: "notion",  name: "Notion AI",        short: "Notion",  color: "#545049", letter: "N", features: 4 },
  ];

  // The user's own product (optional column)
  const userProduct = { id: "mem", name: "Mem", short: "Mem", color: "#2c6a5d", letter: "M", features: 0 };

  const ratingMeta = {
    "verified-yes": { label: "Yes",        tone: "verified", icon: "check-line", verified: true },
    "yes":          { label: "Yes",        tone: "yes",      icon: "check-line" },
    "maybe":        { label: "Partial",    tone: "maybe",    icon: "contrast-2-line" },
    "cannot-verify":{ label: "Unverified", tone: "unknown",  icon: "question-line" },
    "no":           { label: "No",         tone: "no",       icon: "close-line" },
    "na":           { label: "—",          tone: "na",       icon: null },
  };

  const features = [
    {
      id: "f-permissions",
      category: "must-have",
      name: "Respects existing permissions",
      benefit: "AI only surfaces what each user is already allowed to see — no sensitive data leaks through answers.",
      description: "Enterprise permission inheritance so generated answers and citations never expose documents a user lacks access to. Enforced at retrieval time, not just display.",
      ratings: { copilot: "verified-yes", glean: "yes", guru: "yes", notion: "maybe" },
      position: {
        copilot: "Enforces Microsoft Graph permissions at query time — strongest enterprise posture.",
        glean: "Mirrors source-system ACLs across 100+ connectors.",
        guru: "Card-level verification, but coarser than document ACLs.",
        notion: "Workspace-scoped; granular per-page permissions are partial.",
      },
      sources: ["https://learn.microsoft.com/copilot/security", "https://glean.com/security"],
    },
    {
      id: "f-unified",
      category: "must-have",
      name: "Unified search across sources",
      benefit: "One answer pulls from every connected tool, so people stop hunting across a dozen apps.",
      description: "Federated retrieval over email, docs, chat, tickets and wikis with a single ranked result set and inline citations.",
      ratings: { copilot: "verified-yes", glean: "verified-yes", guru: "yes", notion: "no" },
      position: {
        copilot: "Deep across the Microsoft 365 estate; weaker outside it.",
        glean: "Breadth leader — 100+ connectors out of the box.",
        guru: "Strong in its own knowledge base; lighter federation.",
        notion: "Mostly limited to Notion-native content.",
      },
      sources: ["https://glean.com/product/search"],
    },
    {
      id: "f-no-leak",
      category: "performance",
      name: "Answer quality scales with sources",
      benefit: "Connect all your data sources without exposing them to unauthorized users through AI responses.",
      description: "Retrieval precision and answer grounding improve measurably as more high-quality sources are connected, without degrading latency.",
      ratings: { copilot: "verified-yes", glean: "yes", guru: "maybe", notion: "maybe" },
      position: {
        copilot: "Grounding quality rated highest in third-party evals.",
        glean: "Strong ranking; quality scales with connector coverage.",
        guru: "Good within curated cards; variable beyond them.",
        notion: "Adequate for workspace content; limited grounding.",
      },
      sources: ["https://example.com/eval-benchmark"],
    },
    {
      id: "f-realtime",
      category: "performance",
      name: "Real-time freshness",
      benefit: "Answers reflect what changed minutes ago, not last week's index.",
      description: "Incremental indexing keeps results current as documents change, with visible freshness indicators per citation.",
      ratings: { copilot: "yes", glean: "verified-yes", guru: "yes", notion: "maybe" },
      position: {
        copilot: "Near-real-time across M365.",
        glean: "Sub-minute incremental indexing.",
        guru: "Periodic refresh; verification nudges authors.",
        notion: "Eventually consistent within the workspace.",
      },
      sources: ["https://glean.com/product/indexing"],
    },
    {
      id: "f-integration",
      category: "delighter",
      name: "Zero-config custom integration",
      benefit: "Customers avoid costly custom integration work and get a unified content layer across all their existing tools quickly.",
      description: "Pre-built, permission-aware connectors mean a unified content layer ships in days, not the multi-month builds custom dev connectors require.",
      ratings: { copilot: "verified-yes", glean: "yes", guru: "maybe", notion: "cannot-verify" },
      position: {
        copilot: "Offers 700+ connectors including rich position.",
        glean: "85% complete vs competitor A, with rich coverage.",
        guru: "91% complete vs competitor A and any Notion AI.",
        notion: "Limited; integration breadth unverified.",
      },
      sources: ["https://example.com/connectors", "https://example.com/comparison"],
    },
    {
      id: "f-recaps",
      category: "delighter",
      name: "Proactive answer suggestions",
      benefit: "The tool surfaces the answer before anyone asks — in the flow of work.",
      description: "Context-aware nudges deliver likely-needed knowledge inside chat and docs without an explicit query.",
      ratings: { copilot: "yes", glean: "maybe", guru: "cannot-verify", notion: "cannot-verify" },
      position: {
        copilot: "Surfaces suggestions inside Teams and Office.",
        glean: "Limited proactive surfaces today.",
        guru: "Announced; availability unverified.",
        notion: "Not observed in product.",
      },
      sources: [],
    },
  ];

  const sessions = [
    { id: "s1", title: "AI context tools — enterprise", updated: "2 hours ago", status: "complete", products: 4, features: 6 },
    { id: "s2", title: "Retro tools for remote eng", updated: "Yesterday", status: "running", products: 5, features: 9 },
    { id: "s3", title: "Vector DB landscape", updated: "3 days ago", status: "scoped", products: 6, features: 0 },
    { id: "s4", title: "Note-taking, Q3 scan", updated: "Last week", status: "draft", products: 0, features: 0 },
  ];

  const parallel = [
    { id: "glean", pct: 85 },
    { id: "copilot", pct: 72 },
    { id: "guru", pct: 91 },
    { id: "notion", pct: 38 },
  ];

  return { products, userProduct, features, ratingMeta, sessions, parallel };
})();

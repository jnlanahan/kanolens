/* KanoLens prototype — shared primitives. Classes mirror the real .tsx drop-ins. */

/* ---------- Icon (Remix Icon line set) ---------- */
function Icon({ name, className = "" }) {
  return <i className={`ri-${name} ${className}`} aria-hidden="true" />;
}

/* ---------- Lens logo (small wordmark mark) ---------- */
function LensLogo({ size = 30 }) {
  return (
    <span
      className="lens-logo"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="lens-logo__glass" />
    </span>
  );
}

/* ---------- Jeweled lens medallion (header centerpiece) ---------- */
function LensMedallion({ size = 72 }) {
  return (
    <div className="medallion" style={{ width: size, height: size }} aria-hidden="true">
      <div className="medallion__ring">
        <div className="medallion__glass">
          <div className="medallion__spec" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Product avatar ---------- */
function Avatar({ product, size = 22 }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(150deg, ${product.color}, ${shade(product.color, -18)})`,
        fontSize: size * 0.42,
      }}
      title={product.name}
    >
      {product.letter}
    </span>
  );
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ---------- Button ---------- */
function Button({ variant = "default", size = "default", className = "", children, ...rest }) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-[hsl(var(--surface-alt))] text-foreground border border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--surface-muted))]",
    brand: "btn-brand text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-sm)] hover:brightness-105",
    gold: "btn-gold text-[hsl(164_40%_8%)] hover:brightness-105",
    outline: "border border-[hsl(var(--border-strong))] text-foreground hover:bg-[hsl(var(--surface-muted))]",
    ghost: "text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--surface-muted))]",
    subtle: "bg-[hsl(var(--surface-muted))] text-foreground hover:bg-[hsl(var(--surface-alt))]",
  };
  const sizes = {
    default: "h-10 px-4 text-sm",
    sm: "h-9 px-3 text-[13px]",
    lg: "h-12 px-7 text-[15px]",
    icon: "h-9 w-9",
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
function Card({ className = "", children, ...rest }) {
  return (
    <div className={`panel ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* ---------- Eyebrow / label ---------- */
function Eyebrow({ children, className = "" }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

/* ---------- Category metadata ---------- */
const CATEGORY = {
  "must-have": { label: "Must-Have", icon: "bank-line", varName: "kano-must", tag: "Expected — absence dissatisfies",
    def: "Essential. Missing them causes dissatisfaction; having them is merely expected." },
  performance: { label: "Performance", icon: "line-chart-line", varName: "kano-perf", tag: "Linear — more is better",
    def: "More is better. Satisfaction scales with how well this is delivered." },
  delighter: { label: "Delighter", icon: "sparkling-2-line", varName: "kano-delight", tag: "Unexpected — presence excites",
    def: "Unexpected. Absence doesn't hurt; presence creates excitement." },
};
const CATEGORY_ORDER = ["must-have", "performance", "delighter"];

/* ---------- Rating mark (verification = a small seal, not a loud pill) ---------- */
function RatingPill({ rating }) {
  const meta = window.KANO.ratingMeta[rating] || window.KANO.ratingMeta.na;
  return (
    <span className={`rating rating--${meta.tone}`} title={meta.verified ? "Verified against a cited source" : undefined}>
      {meta.icon ? <Icon name={meta.icon} className="rating__icon" /> : null}
      <span>{meta.label}</span>
      {meta.verified ? <Icon name="verified-badge-fill" className="rating__seal" /> : null}
    </span>
  );
}

/* ---------- Category row header (ruled, editorial) ---------- */
function CategoryRibbon({ category, source = true }) {
  const c = CATEGORY[category];
  return (
    <div className={`ribbon ribbon--${category}`}>
      <div className="ribbon__title">
        <span className="ribbon__icon" />
        <span>{c.label}</span>
      </div>
      {source ? <span className="ribbon__def">{c.tag}</span> : null}
    </div>
  );
}

/* ---------- Avatar legend (competitor chips) ---------- */
function ProductLegend({ products }) {
  return (
    <div className="legend">
      {products.map((p) => (
        <span className="legend__chip" key={p.id}>
          <Avatar product={p} size={20} />
          <span>{p.name}</span>
        </span>
      ))}
    </div>
  );
}

Object.assign(window, {
  Icon, LensLogo, LensMedallion, Avatar, Button, Card, Eyebrow,
  RatingPill, CategoryRibbon, ProductLegend, CATEGORY, CATEGORY_ORDER,
});

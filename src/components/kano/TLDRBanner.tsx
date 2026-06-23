import { useState } from "react";
import { ArrowRight, ShieldAlert, Sparkles, Minus } from "lucide-react";
import type { KanoTableData } from "@/lib/kano-types";
import type { Insight } from "./InsightsPanel";

interface TLDRBannerProps {
  insights: Insight[];
  tableData: KanoTableData;
  userProductName: string | null;
}

interface Column {
  key: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  headerClass: string;
  items: string[];
}

function computeIgnoreFeatures(tableData: KanoTableData): string[] {
  return tableData.features
    .filter((feature) => {
      const ratings = tableData.ratings[feature.id] ?? {};
      const products = tableData.products;
      if (products.length === 0) return false;
      const allUnverifiable = products.every(
        (p) => (ratings[p] ?? "") === "Cannot Verify" || (ratings[p] ?? "") === "",
      );
      const firstProduct = products[0];
      const firstRating = firstProduct != null ? (ratings[firstProduct] ?? "") : "";
      const allSame =
        products.length > 1 &&
        firstRating !== "" &&
        products.every((p) => (ratings[p] ?? "") === firstRating);
      return allUnverifiable || allSame;
    })
    .map((f) => f.name);
}

const MAX_VISIBLE = 3;

function BulletList({ items, colorClass }: { items: string[]; colorClass: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, MAX_VISIBLE);
  const extra = items.length - MAX_VISIBLE;

  return (
    <div className="space-y-1.5">
      {visible.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <ArrowRight className={`h-3 w-3 mt-0.5 shrink-0 ${colorClass}`} />
          <span className="text-xs leading-snug">{item}</span>
        </div>
      ))}
      {!expanded && extra > 0 && (
        <button
          type="button"
          className={`text-xs ${colorClass} opacity-70 hover:opacity-100 transition-opacity`}
          onClick={() => setExpanded(true)}
        >
          +{extra} more
        </button>
      )}
    </div>
  );
}

export function TLDRBanner({ insights, tableData, userProductName: _userProductName }: TLDRBannerProps) {
  const stealItems = insights
    .filter((i) => i.type === "opportunity")
    .map((i) => i.title.replace(/^(Steal this delighter|White space): /, ""));

  const watchItems = insights
    .filter((i) => i.type === "risk" || i.type === "gap")
    .map((i) => i.title.replace(/^(Trending to table stakes|Critical gap|Becoming a must-have): /, ""));

  // "Concede" insights (don't pursue) join the table-derived commoditized rows.
  const concedeItems = insights.filter((i) => i.type === "concede").map((i) => i.title);
  const ignoreItems = [...concedeItems, ...computeIgnoreFeatures(tableData)];

  const columns: Column[] = [
    {
      key: "steal",
      label: "Steal",
      icon: <Sparkles className="h-4 w-4" />,
      colorClass: "text-emerald-600",
      headerClass: "text-emerald-700",
      items: stealItems,
    },
    {
      key: "watch",
      label: "Watch Out",
      icon: <ShieldAlert className="h-4 w-4" />,
      colorClass: "text-red-500",
      headerClass: "text-red-700",
      items: watchItems,
    },
    {
      key: "ignore",
      label: "Skip for Now",
      icon: <Minus className="h-4 w-4" />,
      colorClass: "text-muted-foreground",
      headerClass: "text-muted-foreground",
      items: ignoreItems,
    },
  ];

  const hasAny = columns.some((col) => col.items.length > 0);
  if (!hasAny) return null;

  return (
    <div className="panel p-4 space-y-3">
      <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">At a glance</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {columns.map((col) => (
          <div key={col.key} className="space-y-2">
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${col.headerClass}`}>
              {col.icon}
              <span>{col.label}</span>
            </div>
            {col.items.length > 0 ? (
              <BulletList items={col.items} colorClass={col.colorClass} />
            ) : (
              <p className="text-xs text-muted-foreground italic">None detected</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { FileText, Users } from "lucide-react";

interface StepStripProps {
  productName: string | null;
  competitorCount: number;
  featureCount: number;
  updatedAt: string;
}

export function StepStrip({ productName, competitorCount, featureCount, updatedAt }: StepStripProps) {
  const date = new Date(updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const items = [
    { label: "Product", value: productName ?? "Market scan", icon: <FileText className="h-3.5 w-3.5 text-muted-foreground" /> },
    {
      label: "Scope",
      value: `${competitorCount} competitor${competitorCount !== 1 ? "s" : ""} · ${featureCount} benefit${featureCount !== 1 ? "s" : ""}`,
      icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />,
    },
    { label: "Analyzed", value: date, icon: null },
  ];

  return (
    <div className="panel--inset panel rounded-[11px] px-5 py-3 flex flex-wrap items-center gap-x-7 gap-y-1.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 text-sm min-w-0">
          {it.icon}
          <span className="eyebrow">{it.label}</span>
          <span className="font-medium truncate">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

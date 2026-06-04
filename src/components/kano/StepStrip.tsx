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

  return (
    <div className="grid grid-cols-3 gap-3">
      <StepCard
        eyebrow="Product"
        value={productName ?? "Market scan"}
        icon={<FileText className="h-3.5 w-3.5" />}
      />
      <StepCard
        eyebrow="Scope"
        value={`${competitorCount} competitor${competitorCount !== 1 ? "s" : ""} · ${featureCount} benefit${featureCount !== 1 ? "s" : ""}`}
        icon={<Users className="h-3.5 w-3.5" />}
      />
      <StepCard
        eyebrow="Analyzed"
        value={date}
        icon={null}
      />
    </div>
  );
}

function StepCard({ eyebrow, value, icon }: { eyebrow: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="panel--inset panel rounded-[var(--radius-sm)] px-4 py-3 space-y-1">
      <p className="eyebrow flex items-center gap-1.5">
        {icon}
        {eyebrow}
      </p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

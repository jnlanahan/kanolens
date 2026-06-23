import { CATEGORY_LABEL, CATEGORY_ORDER, type KanoTableData } from "@/lib/kano-types";

function escapeCell(value: string): string {
  // Wrap in quotes and double any embedded quotes if the cell needs escaping.
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Pivot a KanoTableData into a features × products CSV with a trailing sources column. */
export function toCsv(table: KanoTableData): string {
  const products = table.products;
  const header = ["Category", "Feature", "Customer benefit", ...products, "Sources"];
  const rows: string[][] = [header];

  for (const category of CATEGORY_ORDER) {
    const features = table.features.filter((f) => f.category === category);
    for (const feature of features) {
      const ratingCells = products.map((p) => {
        const rating = table.ratings[feature.id]?.[p] ?? "N/A";
        const isEst = table.estimated?.[feature.id]?.[p];
        return isEst ? `${rating} (estimate)` : rating;
      });
      const sources = (table.sources[feature.id] ?? []).join(" ; ");
      rows.push([
        CATEGORY_LABEL[category],
        feature.name,
        feature.customerBenefit,
        ...ratingCells,
        sources,
      ]);
    }
  }

  return rows.map((r) => r.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, table: KanoTableData): void {
  const blob = new Blob([toCsv(table)], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

import type { KanoTableData } from "./kano-types";

export interface CellChange {
  featureId: string;
  featureName: string;
  product: string;
  from: string;
  to: string;
}

// Treat all "no real answer" states as one bucket so we don't flag N/A ↔ blank noise.
function isUnknown(rating: string | undefined): boolean {
  return !rating || rating === "N/A" || rating === "";
}

/** Per-cell rating changes from a previous run to the current one. Only compares
 *  features and products that exist in both (by id / name). */
export function diffTables(prev: KanoTableData, curr: KanoTableData): CellChange[] {
  const changes: CellChange[] = [];
  for (const feature of curr.features) {
    const prevRatings = prev.ratings[feature.id];
    if (!prevRatings) continue; // feature didn't exist last time
    const currRatings = curr.ratings[feature.id] ?? {};
    for (const product of curr.products) {
      const from = prevRatings[product];
      const to = currRatings[product];
      if (from === undefined || to === undefined) continue;
      if (from === to) continue;
      if (isUnknown(from) && isUnknown(to)) continue;
      changes.push({ featureId: feature.id, featureName: feature.name, product, from, to });
    }
  }
  return changes;
}

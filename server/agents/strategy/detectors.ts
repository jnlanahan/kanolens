import type { TableJson } from "../../db/schema";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SignalKind =
  | "missing_musthave" // user verifiably lacks a must-have the field has
  | "unverified_musthave" // user's must-have status is unknown — a data gap, NOT a confirmed gap
  | "weak_musthave_category" // a "must-have" few competitors confirm → maybe mis-categorized
  | "musthave_edge" // user confirms a must-have rivals verifiably lack
  | "musthave_parity_met" // everyone has it → table stakes, neutral ground
  | "perf_open_high" // no product leads on a performance benefit → open territory
  | "perf_behind" // user trails a rival who leads on a performance benefit
  | "perf_lead" // user leads a performance benefit the field doesn't
  | "perf_table_stakes" // most rivals lead a performance benefit; user doesn't
  | "unique_delighter" // user has a delighter no rival confirms
  | "single_competitor_delighter" // only one rival has a delighter the user lacks → steal
  | "commoditizing_delighter"; // most rivals have a delighter → its delight is fading

export type Confidence = "high" | "medium" | "low";

export interface CandidateSignal {
  kind: SignalKind;
  featureIds: string[];
  /** Product/competitor names this signal references. */
  products: string[];
  /** 0–1 strategic importance, used to rank. */
  severity: number;
  /** Confidence in the underlying cells this signal rests on. */
  confidence: Confidence;
  /** A short, table-grounded factual statement (no recommendations). */
  evidence: string;
}

export interface MustHaveCoverage {
  held: number;
  total: number;
  missing: string[]; // feature names the user verifiably lacks
}

// ─── Rating classification (category-aware) ──────────────────────────────────────

const HELD = new Set(["Yes"]); // must-have / delighter present
const ABSENT = new Set(["No"]); // verified absent — a real gap
const UNKNOWN = new Set(["Cannot Verify", "N/A", ""]); // a data gap, never a fact
const PERF_LEAD = new Set(["High", "Maybe High"]);
const PERF_BEHIND = new Set(["Low", "Maybe Low"]);

function listNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ─── Confidence of a cell / signal ───────────────────────────────────────────────

function cellConfidence(table: TableJson, featureId: string, product: string): Confidence {
  const explicit = table.confidence?.[featureId]?.[product];
  if (explicit) return explicit;
  // Fallback for older tables without stored confidence.
  if (table.estimated?.[featureId]?.[product]) return "low";
  return "medium";
}

const CONF_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/** A signal is only as trustworthy as its weakest deciding cell. */
function weakestConfidence(
  table: TableJson,
  featureId: string,
  products: string[],
): Confidence {
  let worst: Confidence = "high";
  for (const p of products) {
    const c = cellConfidence(table, featureId, p);
    if (CONF_RANK[c] < CONF_RANK[worst]) worst = c;
  }
  return worst;
}

// ─── Detection ───────────────────────────────────────────────────────────────────

/**
 * Deterministic structural signals over a finished Kano table. No LLM, no recommendations —
 * just the facts a strategist needs, each tagged with severity + confidence + evidence.
 * Returns signals sorted by severity (descending).
 */
export function detectSignals(table: TableJson, userProduct: string | null): CandidateSignal[] {
  const signals: CandidateSignal[] = [];
  const hasUser = Boolean(userProduct && table.products.includes(userProduct));
  const competitors = table.products.filter((p) => p !== userProduct);

  const ratingOf = (fid: string, p: string): string => table.ratings[fid]?.[p] ?? "";

  for (const feature of table.features) {
    const fid = feature.id;
    const userRating = hasUser ? ratingOf(fid, userProduct!) : "";
    const compRatings = competitors.map((c) => ({ c, r: ratingOf(fid, c) }));

    if (feature.category === "must-have") {
      const confirmers = compRatings.filter((x) => HELD.has(x.r)).map((x) => x.c);
      const verifiedAbsent = compRatings.filter((x) => ABSENT.has(x.r)).map((x) => x.c);

      // Must-have validity: a real must-have shows broad adoption. If few confirm it,
      // it's probably mis-categorized — don't build a "gap" on it.
      const confirmRatio = competitors.length > 0 ? confirmers.length / competitors.length : 0;
      const looksLikeMustHave = confirmRatio >= 0.5;
      if (competitors.length >= 2 && !looksLikeMustHave) {
        signals.push({
          kind: "weak_musthave_category",
          featureIds: [fid],
          products: confirmers,
          severity: 0.4,
          confidence: weakestConfidence(table, fid, confirmers.length ? confirmers : competitors),
          evidence: `"${feature.name}" is labeled must-have but only ${confirmers.length}/${competitors.length} competitors confirm it — may be a delighter/performance benefit, not a baseline.`,
        });
      }

      if (hasUser && looksLikeMustHave) {
        if (ABSENT.has(userRating)) {
          // Verified missing must-have — the most important kind of insight.
          signals.push({
            kind: "missing_musthave",
            featureIds: [fid],
            products: confirmers,
            severity: 0.85 + Math.min(0.15, confirmRatio * 0.15),
            confidence: weakestConfidence(table, fid, [userProduct!, ...confirmers]),
            evidence: `You verifiably lack "${feature.name}" while ${confirmers.length}/${competitors.length} competitors confirm it — a baseline gap.`,
          });
        } else if (UNKNOWN.has(userRating)) {
          // Unknown ≠ missing. Flag as a data gap to confirm, not a settled gap.
          signals.push({
            kind: "unverified_musthave",
            featureIds: [fid],
            products: confirmers,
            severity: 0.5,
            confidence: "low",
            evidence: `Your status on the must-have "${feature.name}" is unverified while ${confirmers.length}/${competitors.length} rivals confirm it — verify before relying on it.`,
          });
        } else if (HELD.has(userRating) && verifiedAbsent.length > 0) {
          // Edge only from VERIFIED absence — never from a rival's Cannot Verify.
          signals.push({
            kind: "musthave_edge",
            featureIds: [fid],
            products: verifiedAbsent,
            severity: 0.4,
            confidence: weakestConfidence(table, fid, [userProduct!, ...verifiedAbsent]),
            evidence: `You confirm the baseline "${feature.name}" while ${listNames(verifiedAbsent)} verifiably ${verifiedAbsent.length === 1 ? "lacks" : "lack"} it.`,
          });
        }
      }

      // Table stakes met by all (including user) — neutral ground, low priority.
      if (table.products.every((p) => HELD.has(ratingOf(fid, p)))) {
        signals.push({
          kind: "musthave_parity_met",
          featureIds: [fid],
          products: [],
          severity: 0.1,
          confidence: weakestConfidence(table, fid, table.products),
          evidence: `Every product delivers "${feature.name}" — neutral ground.`,
        });
      }
    }

    if (feature.category === "performance") {
      const leaders = table.products.filter((p) => PERF_LEAD.has(ratingOf(fid, p)));
      const compLeaders = competitors.filter((c) => PERF_LEAD.has(ratingOf(fid, c)));
      const userLeads = hasUser && PERF_LEAD.has(userRating);

      // Nobody leads → open territory to seize.
      if (leaders.length === 0 && competitors.length > 0) {
        signals.push({
          kind: "perf_open_high",
          featureIds: [fid],
          products: [],
          severity: 0.6,
          confidence: weakestConfidence(table, fid, table.products),
          evidence: `No product leads on "${feature.name}" — open territory.`,
        });
      }

      if (hasUser && userLeads && compLeaders.length === 0) {
        signals.push({
          kind: "perf_lead",
          featureIds: [fid],
          products: [],
          severity: 0.55,
          confidence: weakestConfidence(table, fid, [userProduct!]),
          evidence: `You lead on "${feature.name}" while no rival does — a performance edge.`,
        });
      }

      if (hasUser && !userLeads && PERF_BEHIND.has(userRating) && compLeaders.length > 0) {
        signals.push({
          kind: "perf_behind",
          featureIds: [fid],
          products: compLeaders,
          severity: 0.55,
          confidence: weakestConfidence(table, fid, [userProduct!, ...compLeaders]),
          evidence: `You trail on "${feature.name}" while ${listNames(compLeaders)} ${compLeaders.length === 1 ? "leads" : "lead"}.`,
        });
      }

      // Most rivals lead and the user doesn't → it's becoming table stakes.
      if (
        hasUser &&
        !userLeads &&
        competitors.length > 0 &&
        compLeaders.length / competitors.length >= 0.75
      ) {
        signals.push({
          kind: "perf_table_stakes",
          featureIds: [fid],
          products: compLeaders,
          severity: 0.5,
          confidence: weakestConfidence(table, fid, compLeaders),
          evidence: `${compLeaders.length}/${competitors.length} rivals lead on "${feature.name}" while you don't — trending to table stakes.`,
        });
      }
    }

    if (feature.category === "delighter") {
      const having = competitors.filter((c) => HELD.has(ratingOf(fid, c)));
      const userHas = hasUser && HELD.has(userRating);

      if (hasUser && userHas && having.length === 0) {
        signals.push({
          kind: "unique_delighter",
          featureIds: [fid],
          products: [],
          severity: 0.6,
          confidence: weakestConfidence(table, fid, [userProduct!]),
          evidence: `You're the only product confirming "${feature.name}" — a unique delighter.`,
        });
      }

      if ((!hasUser || !userHas) && having.length === 1) {
        signals.push({
          kind: "single_competitor_delighter",
          featureIds: [fid],
          products: having,
          severity: hasUser && ABSENT.has(userRating) ? 0.58 : 0.5,
          confidence: weakestConfidence(table, fid, having),
          evidence: `Only ${having[0]} offers "${feature.name}"${hasUser && ABSENT.has(userRating) ? " and you confirm you don't" : ""} — white space.`,
        });
      }

      // Converging across the field → its delight factor is fading toward expected.
      if (competitors.length > 0 && having.length / competitors.length >= 0.6 && having.length >= 2) {
        signals.push({
          kind: "commoditizing_delighter",
          featureIds: [fid],
          products: having,
          severity: 0.4,
          confidence: weakestConfidence(table, fid, having),
          evidence: `${having.length}/${competitors.length} rivals offer "${feature.name}" — it's drifting from delighter toward expected.`,
        });
      }
    }
  }

  return signals.sort((a, b) => b.severity - a.severity);
}

/** Cross-row aggregate: how many baseline must-haves the user verifiably holds. */
export function mustHaveCoverage(table: TableJson, userProduct: string | null): MustHaveCoverage {
  if (!userProduct || !table.products.includes(userProduct)) {
    return { held: 0, total: 0, missing: [] };
  }
  const competitors = table.products.filter((p) => p !== userProduct);
  const mustHaves = table.features.filter((f) => f.category === "must-have");

  let held = 0;
  let total = 0;
  const missing: string[] = [];
  for (const f of mustHaves) {
    const confirmers = competitors.filter((c) => HELD.has(table.ratings[f.id]?.[c] ?? ""));
    const looksLikeMustHave = competitors.length === 0 || confirmers.length / competitors.length >= 0.5;
    if (!looksLikeMustHave) continue; // don't count shaky must-haves toward coverage
    total += 1;
    const userRating = table.ratings[f.id]?.[userProduct] ?? "";
    if (HELD.has(userRating)) held += 1;
    else if (ABSENT.has(userRating)) missing.push(f.name);
  }
  return { held, total, missing };
}

import { sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const sessionStatus = pgEnum("session_status", [
  "draft", // scope not yet proposed
  "scoping", // scope proposer running
  "scoped", // scope proposed, awaiting user confirmation
  "running", // analyst agent running
  "complete", // finalize_table called
  "error", // agent failed
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    googleSub: text("google_sub").unique(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    freeRunUsed: boolean("free_run_used").notNull().default(false),
    runCredits: integer("run_credits").notNull().default(0),
    isAdmin: boolean("is_admin").notNull().default(false),
  },
  (t) => [index("users_google_sub_idx").on(t.googleSub)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled analysis"),
    status: sessionStatus("status").notNull().default("draft"),
    errorMessage: text("error_message"),
    // Set when this session is a re-run of an earlier one — enables change-tracking.
    parentSessionId: uuid("parent_session_id").references((): AnyPgColumn => sessions.id, {
      onDelete: "set null",
    }),
    isPaidRun: boolean("is_paid_run").notNull().default(false),
    refinementsUsed: integer("refinements_used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => [index("sessions_user_idx").on(t.userId, t.createdAt)],
);

export interface ScopeJson {
  userProductName: string | null;
  userProductDescription: string;
  targetCustomer: string;
  products: string[];
  features: {
    id: string;
    name: string;
    description: string;
    customerBenefit: string;
    category: "must-have" | "performance" | "delighter";
  }[];
  rationale?: string;
  suggestedAdditionalCompetitors?: string[];
}

export interface TableJson {
  products: string[]; // includes the user's product at the end
  features: ScopeJson["features"];
  ratings: Record<string, Record<string, string>>;
  justifications: Record<string, Record<string, string>>;
  /** Per feature → per product: true when the rating is an unverified best-estimate. */
  estimated?: Record<string, Record<string, boolean>>;
  /** Per feature → per product trust signal derived from source verdicts. */
  confidence?: Record<string, Record<string, "high" | "medium" | "low">>;
  summary?: string;
  /** Ranked, synthesized strategy produced by the strategist after the table is built. */
  strategy?: Strategy;
}

export type StrategyInsightType = "gap" | "opportunity" | "risk" | "strength" | "concede";

export interface StrategyInsight {
  id: string;
  type: StrategyInsightType;
  title: string;
  rationale: string;
  priority: "critical" | "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  affectedFeatureIds: string[];
  /** Set by the validation loop (paid runs) when a hypothesis was checked against the web. */
  validation?: { verdict: "confirmed" | "refuted" | "unproven"; note: string };
}

export interface Strategy {
  /** The headline "strategic read" narrative. */
  headline: string;
  /** Insights ordered by priority (most important first). */
  insights: StrategyInsight[];
  mustHaveCoverage?: { held: number; total: number; missing: string[] };
}

export interface SourcesJson {
  byFeatureId: Record<string, string[]>;
  /** Per feature → source URL → the specific claim that URL backs (evidence trail). */
  claimsByFeatureId?: Record<string, Record<string, string>>;
}

export const analyses = pgTable("analyses", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  scope: jsonb("scope").$type<ScopeJson | null>(),
  tableData: jsonb("table_data").$type<TableJson | null>(),
  sources: jsonb("sources").$type<SourcesJson | null>(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  shareToken: uuid("share_token").notNull().defaultRandom(),
  shareEnabled: boolean("share_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Analysis = typeof analyses.$inferSelect;

import { sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    googleSub: text("google_sub").unique(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_google_sub_idx").on(t.googleSub)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled analysis"),
    status: sessionStatus("status").notNull().default("draft"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => [index("sessions_user_idx").on(t.userId, t.createdAt)],
);

export interface ScopeJson {
  userProductName: string;
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
}

export interface TableJson {
  products: string[]; // includes the user's product at the end
  features: ScopeJson["features"];
  ratings: Record<string, Record<string, string>>;
  justifications: Record<string, Record<string, string>>;
  summary?: string;
}

export interface SourcesJson {
  byFeatureId: Record<string, string[]>;
}

export const analyses = pgTable("analyses", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  scope: jsonb("scope").$type<ScopeJson | null>(),
  tableData: jsonb("table_data").$type<TableJson | null>(),
  sources: jsonb("sources").$type<SourcesJson | null>(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Analysis = typeof analyses.$inferSelect;

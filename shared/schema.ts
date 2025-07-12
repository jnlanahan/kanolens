import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analysis sessions to store ongoing competitive analysis
export const analysisSessions = pgTable("analysis_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  products: jsonb("products").notNull(), // Array of product names
  targetCustomer: text("target_customer"),
  features: jsonb("features").notNull(), // Array of feature objects
  status: varchar("status").notNull().default("in_progress"), // in_progress, completed
  currentStep: varchar("current_step").notNull().default("discovery"), // discovery, research, categorization, table, analysis
  chatHistory: jsonb("chat_history").notNull().default([]), // Array of chat messages
  tableData: jsonb("table_data"), // Kano table data
  sourceDocumentation: jsonb("source_documentation"), // Source citations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages for real-time chat interface
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: serial("session_id").notNull().references(() => analysisSessions.id),
  role: varchar("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Additional data like file uploads, progress indicators
  createdAt: timestamp("created_at").defaultNow(),
});

// Document uploads
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  sessionId: serial("session_id").notNull().references(() => analysisSessions.id),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: varchar("file_size").notNull(),
  content: text("content").notNull(), // Extracted text content
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertAnalysisSession = typeof analysisSessions.$inferInsert;
export type AnalysisSession = typeof analysisSessions.$inferSelect;

export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertDocument = typeof documents.$inferInsert;
export type Document = typeof documents.$inferSelect;

// Agent Evaluations table
export const agentEvaluations = pgTable("agent_evaluations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => analysisSessions.id, { onDelete: "cascade" }),
  agentName: varchar("agent_name", { length: 50 }).notNull(), // orchestrator, researcher, validator, analyst
  inputData: jsonb("input_data").notNull(),
  outputData: jsonb("output_data").notNull(),
  evaluation: jsonb("evaluation").notNull(), // {score, strengths, weaknesses, suggestions}
  promptVersion: varchar("prompt_version", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Feedback table
export const userFeedback = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: integer("session_id").references(() => analysisSessions.id, { onDelete: "cascade" }),
  messageId: integer("message_id").references(() => chatMessages.id, { onDelete: "cascade" }),
  feedbackType: varchar("feedback_type", { enum: ["thumbs_up", "thumbs_down"] }).notNull(),
  feedbackText: text("feedback_text"), // Optional detailed feedback
  context: jsonb("context"), // Store full context of what was shown
  createdAt: timestamp("created_at").defaultNow(),
});

// Prompt Versions table
export const promptVersions = pgTable("prompt_versions", {
  id: serial("id").primaryKey(),
  agentName: varchar("agent_name", { length: 50 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  changeReason: text("change_reason"),
  changedBy: varchar("changed_by"),
  performance: jsonb("performance"), // Track performance metrics
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Users table
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  role: varchar("role", { enum: ["admin", "super_admin"] }).default("admin"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertAgentEvaluation = typeof agentEvaluations.$inferInsert;
export type AgentEvaluation = typeof agentEvaluations.$inferSelect;

export type InsertUserFeedback = typeof userFeedback.$inferInsert;
export type UserFeedback = typeof userFeedback.$inferSelect;

export type InsertPromptVersion = typeof promptVersions.$inferInsert;
export type PromptVersion = typeof promptVersions.$inferSelect;

export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;

// Zod schemas for validation
export const insertAnalysisSessionSchema = createInsertSchema(analysisSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  features: z.array(z.any()).default([]),
  products: z.array(z.string()).default([]),
  chatHistory: z.array(z.any()).default([]),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertAgentEvaluationSchema = createInsertSchema(agentEvaluations).omit({
  id: true,
  createdAt: true,
});

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertPromptVersionSchema = createInsertSchema(promptVersions).omit({
  id: true,
  createdAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// API types for frontend
export interface KanoFeature {
  id: string;
  name: string;
  description: string;
  category: 'must-have' | 'performance' | 'delighter';
  customerBenefit: string;
}

export interface KanoTableData {
  products: string[];
  features: KanoFeature[];
  ratings: Record<string, Record<string, string>>; // feature_id -> product -> rating
  sources: Record<string, string[]>; // feature_id -> source URLs
}

export interface ChatMessageUI {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    step?: string;
    progress?: number;
    uploadedFiles?: string[];
  };
}

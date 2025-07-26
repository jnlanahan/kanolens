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

// User storage table - updated for JWT authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // Hashed password (null for OAuth users)
  authProvider: varchar("auth_provider").default("email"), // 'email' or 'google'
  emailVerified: boolean("email_verified").default(false),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  analysisCount: integer("analysis_count").default(0),
  maxAnalyses: integer("max_analyses").default(1),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

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

// Shared Analysis table for public sharing
export const sharedAnalyses = pgTable("shared_analyses", {
  id: serial("id").primaryKey(),
  shareId: varchar("share_id").unique().notNull(),
  sessionId: integer("session_id").references(() => analysisSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  title: varchar("title").notNull(),
  products: jsonb("products").notNull(),
  targetCustomer: text("target_customer"),
  tableData: jsonb("table_data").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  viewCount: integer("view_count").default(0),
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

export type InsertSharedAnalysis = typeof sharedAnalyses.$inferInsert;
export type SharedAnalysis = typeof sharedAnalyses.$inferSelect;

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
  justifications: Record<string, Record<string, string>>; // feature_id -> product -> detailed explanation
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

// Standardized analysis steps and status
export const ANALYSIS_STEPS = {
  DISCOVERY: 'discovery',
  RESEARCH: 'research',
  CATEGORIZATION: 'categorization', 
  TABLE_CREATION: 'table_creation',
  ANALYSIS: 'analysis',
  COMPLETED: 'completed',
  ERROR: 'error'
} as const;

export const ANALYSIS_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed', 
  FAILED: 'failed'
} as const;

export type AnalysisStep = typeof ANALYSIS_STEPS[keyof typeof ANALYSIS_STEPS];
export type AnalysisStatus = typeof ANALYSIS_STATUS[keyof typeof ANALYSIS_STATUS];

// Analysis limits types
export interface AnalysisLimits {
  current: number;
  max: number;
  isUnlimited: boolean;
  canCreateMore: boolean;
  remainingAnalyses: number;
}

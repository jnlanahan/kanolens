import {
  users,
  analysisSessions,
  chatMessages,
  documents,
  agentEvaluations,
  userFeedback,
  promptVersions,
  adminUsers,
  type User,
  type UpsertUser,
  type AnalysisSession,
  type InsertAnalysisSession,
  type ChatMessage,
  type InsertChatMessage,
  type Document,
  type InsertDocument,
  type AgentEvaluation,
  type InsertAgentEvaluation,
  type UserFeedback,
  type InsertUserFeedback,
  type PromptVersion,
  type InsertPromptVersion,
  type AdminUser,
  type InsertAdminUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Analysis session operations
  createAnalysisSession(session: InsertAnalysisSession): Promise<AnalysisSession>;
  getAnalysisSession(id: number): Promise<AnalysisSession | undefined>;
  getUserAnalysisSessions(userId: string): Promise<AnalysisSession[]>;
  updateAnalysisSession(id: number, updates: Partial<AnalysisSession>): Promise<AnalysisSession>;
  deleteAnalysisSession(id: number): Promise<void>;
  
  // Chat message operations
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getSessionChatMessages(sessionId: number): Promise<ChatMessage[]>;
  
  // Document operations
  uploadDocument(document: InsertDocument): Promise<Document>;
  getSessionDocuments(sessionId: number): Promise<Document[]>;
  
  // Agent evaluation operations
  createAgentEvaluation(evaluation: InsertAgentEvaluation): Promise<AgentEvaluation>;
  getSessionEvaluations(sessionId: number): Promise<AgentEvaluation[]>;
  getAgentEvaluations(agentName: string): Promise<AgentEvaluation[]>;
  
  // User feedback operations
  createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback>;
  getUserFeedback(userId: string): Promise<UserFeedback[]>;
  getSessionFeedback(sessionId: number): Promise<UserFeedback[]>;
  
  // Prompt version operations
  createPromptVersion(version: InsertPromptVersion): Promise<PromptVersion>;
  getActivePromptVersion(agentName: string): Promise<PromptVersion | undefined>;
  getPromptVersionHistory(agentName: string): Promise<PromptVersion[]>;
  updatePromptVersion(id: number, updates: Partial<PromptVersion>): Promise<PromptVersion>;
  
  // Admin operations
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  updateAdminLastLogin(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Analysis session operations
  async createAnalysisSession(sessionData: InsertAnalysisSession): Promise<AnalysisSession> {
    const [session] = await db
      .insert(analysisSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getAnalysisSession(id: number): Promise<AnalysisSession | undefined> {
    const [session] = await db
      .select()
      .from(analysisSessions)
      .where(eq(analysisSessions.id, id));
    return session;
  }

  async getUserAnalysisSessions(userId: string): Promise<AnalysisSession[]> {
    return await db
      .select()
      .from(analysisSessions)
      .where(eq(analysisSessions.userId, userId))
      .orderBy(desc(analysisSessions.updatedAt));
  }

  async updateAnalysisSession(id: number, updates: Partial<AnalysisSession>): Promise<AnalysisSession> {
    const [session] = await db
      .update(analysisSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(analysisSessions.id, id))
      .returning();
    return session;
  }

  async deleteAnalysisSession(id: number): Promise<void> {
    // Delete associated chat messages first (due to foreign key constraint)
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
    
    // Delete associated documents
    await db.delete(documents).where(eq(documents.sessionId, id));
    
    // Finally delete the session
    await db.delete(analysisSessions).where(eq(analysisSessions.id, id));
  }

  // Chat message operations
  async addChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getSessionChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  // Document operations
  async uploadDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(documentData)
      .returning();
    return document;
  }

  async getSessionDocuments(sessionId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.sessionId, sessionId))
      .orderBy(documents.uploadedAt);
  }
  
  // Agent evaluation operations
  async createAgentEvaluation(evaluationData: InsertAgentEvaluation): Promise<AgentEvaluation> {
    const [evaluation] = await db
      .insert(agentEvaluations)
      .values(evaluationData)
      .returning();
    return evaluation;
  }
  
  async getSessionEvaluations(sessionId: number): Promise<AgentEvaluation[]> {
    return await db
      .select()
      .from(agentEvaluations)
      .where(eq(agentEvaluations.sessionId, sessionId))
      .orderBy(agentEvaluations.createdAt);
  }
  
  async getAgentEvaluations(agentName: string): Promise<AgentEvaluation[]> {
    return await db
      .select()
      .from(agentEvaluations)
      .where(eq(agentEvaluations.agentName, agentName))
      .orderBy(desc(agentEvaluations.createdAt));
  }
  
  // User feedback operations
  async createUserFeedback(feedbackData: InsertUserFeedback): Promise<UserFeedback> {
    const [feedback] = await db
      .insert(userFeedback)
      .values(feedbackData)
      .returning();
    return feedback;
  }
  
  async getUserFeedback(userId: string): Promise<UserFeedback[]> {
    return await db
      .select()
      .from(userFeedback)
      .where(eq(userFeedback.userId, userId))
      .orderBy(desc(userFeedback.createdAt));
  }
  
  async getSessionFeedback(sessionId: number): Promise<UserFeedback[]> {
    return await db
      .select()
      .from(userFeedback)
      .where(eq(userFeedback.sessionId, sessionId))
      .orderBy(userFeedback.createdAt);
  }
  
  // Prompt version operations
  async createPromptVersion(versionData: InsertPromptVersion): Promise<PromptVersion> {
    // Deactivate all other versions for this agent
    await db
      .update(promptVersions)
      .set({ isActive: false })
      .where(eq(promptVersions.agentName, versionData.agentName));
      
    const [version] = await db
      .insert(promptVersions)
      .values(versionData)
      .returning();
    return version;
  }
  
  async getActivePromptVersion(agentName: string): Promise<PromptVersion | undefined> {
    const [version] = await db
      .select()
      .from(promptVersions)
      .where(and(
        eq(promptVersions.agentName, agentName),
        eq(promptVersions.isActive, true)
      ))
      .limit(1);
    return version;
  }
  
  async getPromptVersionHistory(agentName: string): Promise<PromptVersion[]> {
    return await db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.agentName, agentName))
      .orderBy(desc(promptVersions.createdAt));
  }
  
  async updatePromptVersion(id: number, updates: Partial<PromptVersion>): Promise<PromptVersion> {
    const [version] = await db
      .update(promptVersions)
      .set(updates)
      .where(eq(promptVersions.id, id))
      .returning();
    return version;
  }
  
  // Admin operations
  async createAdminUser(adminData: InsertAdminUser): Promise<AdminUser> {
    const [admin] = await db
      .insert(adminUsers)
      .values(adminData)
      .returning();
    return admin;
  }
  
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email));
    return admin;
  }
  
  async updateAdminLastLogin(id: string): Promise<void> {
    await db
      .update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, id));
  }
}

export const storage = new DatabaseStorage();

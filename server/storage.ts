import {
  users,
  analysisSessions,
  chatMessages,
  documents,
  agentEvaluations,
  userFeedback,
  promptVersions,
  adminUsers,
  sharedAnalyses,
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
  type SharedAnalysis,
  type InsertSharedAnalysis,
  ANALYSIS_STATUS,
  ANALYSIS_STEPS
} from "@shared/schema";
import { db, dbManager } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - JWT authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserAnalysisLimit(userId: string): Promise<{ current: number; max: number; canCreateNew: boolean }>;
  incrementUserAnalysisCount(userId: string): Promise<User>;
  decrementUserAnalysisCount(userId: string): Promise<User>;
  setUserAnalysisLimit(userId: string, maxAnalyses: number): Promise<User>;
  
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
  
  // Shared analysis operations
  createSharedAnalysis(sharedAnalysis: InsertSharedAnalysis): Promise<SharedAnalysis>;
  getSharedAnalysis(shareId: string): Promise<SharedAnalysis | undefined>;
  getUserSharedAnalyses(userId: string): Promise<SharedAnalysis[]>;
  updateSharedAnalysis(shareId: string, updates: Partial<SharedAnalysis>): Promise<SharedAnalysis>;
  incrementShareViewCount(shareId: string): Promise<void>;
  deleteSharedAnalysis(shareId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Helper method for transaction retry logic
  private async executeWithTransaction<T>(
    operation: (tx: any) => Promise<T>,
    maxRetries = 3,
    operationName = 'database operation'
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await db.transaction(operation);
      } catch (error) {
        console.error(`[Storage] Transaction attempt ${attempt} failed for ${operationName}:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`${operationName} failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, 10000);
        
        console.log(`[Storage] Retrying ${operationName} in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Helper method for retry logic without transactions
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    operationName = 'database operation'
  ): Promise<T> {
    return await dbManager.executeWithRetry(async () => {
      return await operation();
    }, maxRetries);
  }

  // User operations - JWT authentication
  async getUser(id: string): Promise<User | undefined> {
    return await this.executeWithRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    }, 3, 'getUser');
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await this.executeWithRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    }, 3, 'getUserByEmail');
  }

  async createUser(userData: UpsertUser): Promise<User> {
    return await this.executeWithTransaction(async (tx) => {
      // Generate a unique ID for the user
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const [user] = await tx
        .insert(users)
        .values({
          ...userData,
          id: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return user;
    });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    return await this.executeWithTransaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      
      if (!user) {
        throw new Error(`User ${id} not found`);
      }
      
      return user;
    });
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

  async getUserAnalysisLimit(userId: string): Promise<{ current: number; max: number; canCreateNew: boolean }> {
    return await this.executeWithRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }
      
      const current = user.analysisCount || 0;
      const max = user.maxAnalyses || 1;
      
      // Check if user is admin by email (unlimited access)
      const isAdmin = user.email?.toLowerCase() === 'jnlanahan@gmail.com';
      
      return {
        current,
        max: isAdmin ? -1 : max, // -1 means unlimited for admin
        canCreateNew: isAdmin || current < max
      };
    }, 3, 'getUserAnalysisLimit');
  }

  async incrementUserAnalysisCount(userId: string): Promise<User> {
    return await this.executeWithTransaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({ 
          analysisCount: sql`${users.analysisCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    }, 3, 'incrementUserAnalysisCount');
  }

  async decrementUserAnalysisCount(userId: string): Promise<User> {
    return await this.executeWithTransaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({ 
          analysisCount: sql`GREATEST(${users.analysisCount} - 1, 0)`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    }, 3, 'decrementUserAnalysisCount');
  }

  async setUserAnalysisLimit(userId: string, maxAnalyses: number): Promise<User> {
    return await this.executeWithTransaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({ 
          maxAnalyses,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    }, 3, 'setUserAnalysisLimit');
  }

  // Analysis session operations
  async createAnalysisSession(sessionData: InsertAnalysisSession): Promise<AnalysisSession> {
    return await this.executeWithTransaction(async (tx) => {
      const [session] = await tx
        .insert(analysisSessions)
        .values(sessionData)
        .returning();
      return session;
    }, 3, 'createAnalysisSession');
  }

  async getAnalysisSession(id: number): Promise<AnalysisSession | undefined> {
    try {
      const [session] = await db
        .select()
        .from(analysisSessions)
        .where(eq(analysisSessions.id, id));
      return session;
    } catch (error) {
      console.error('[Storage] getAnalysisSession failed:', error);
      throw error;
    }
  }

  async getUserAnalysisSessions(userId: string): Promise<AnalysisSession[]> {
    return await this.executeWithRetry(async () => {
      return await db
        .select()
        .from(analysisSessions)
        .where(eq(analysisSessions.userId, userId))
        .orderBy(desc(analysisSessions.updatedAt));
    }, 3, 'getUserAnalysisSessions');
  }

  async updateAnalysisSession(id: number, updates: Partial<AnalysisSession>): Promise<AnalysisSession> {
    return await this.executeWithTransaction(async (tx) => {
      // Validate session exists first
      const [existingSession] = await tx
        .select()
        .from(analysisSessions)
        .where(eq(analysisSessions.id, id));
      
      if (!existingSession) {
        throw new Error(`Session ${id} not found`);
      }

      const [session] = await tx
        .update(analysisSessions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(analysisSessions.id, id))
        .returning();
      
      return session;
    }, 3, 'updateAnalysisSession');
  }

  async deleteAnalysisSession(id: number): Promise<void> {
    return await this.executeWithTransaction(async (tx) => {
      // Get the session to find the user ID
      const [session] = await tx
        .select()
        .from(analysisSessions)
        .where(eq(analysisSessions.id, id));
      
      if (!session) {
        throw new Error(`Analysis session ${id} not found`);
      }

      // Delete associated chat messages first (due to foreign key constraint)
      await tx.delete(chatMessages).where(eq(chatMessages.sessionId, id));
      
      // Delete associated documents
      await tx.delete(documents).where(eq(documents.sessionId, id));
      
      // Delete associated shared analyses
      await tx.delete(sharedAnalyses).where(eq(sharedAnalyses.sessionId, id));
      
      // Finally delete the session
      await tx.delete(analysisSessions).where(eq(analysisSessions.id, id));
      
      // Decrement user's analysis count
      await tx
        .update(users)
        .set({ 
          analysisCount: sql`GREATEST(${users.analysisCount} - 1, 0)`,
          updatedAt: new Date()
        })
        .where(eq(users.id, session.userId));
    }, 3, 'deleteAnalysisSession');
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

  // Shared Analysis operations
  async createSharedAnalysis(sharedAnalysis: InsertSharedAnalysis): Promise<SharedAnalysis> {
    return await this.executeWithTransaction(async (tx) => {
      const [result] = await tx
        .insert(sharedAnalyses)
        .values(sharedAnalysis)
        .returning();
      return result;
    }, 3, 'create shared analysis');
  }

  async getSharedAnalysis(shareId: string): Promise<SharedAnalysis | undefined> {
    const results = await db
      .select()
      .from(sharedAnalyses)
      .where(and(
        eq(sharedAnalyses.shareId, shareId),
        eq(sharedAnalyses.isActive, true)
      ))
      .limit(1);
    return results[0];
  }

  async getUserSharedAnalyses(userId: string): Promise<SharedAnalysis[]> {
    return await db
      .select()
      .from(sharedAnalyses)
      .where(and(
        eq(sharedAnalyses.userId, userId),
        eq(sharedAnalyses.isActive, true)
      ))
      .orderBy(desc(sharedAnalyses.createdAt));
  }

  async updateSharedAnalysis(shareId: string, updates: Partial<SharedAnalysis>): Promise<SharedAnalysis> {
    return await this.executeWithTransaction(async (tx) => {
      const [result] = await tx
        .update(sharedAnalyses)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(sharedAnalyses.shareId, shareId))
        .returning();
      return result;
    }, 3, 'update shared analysis');
  }

  async incrementShareViewCount(shareId: string): Promise<void> {
    await db
      .update(sharedAnalyses)
      .set({ 
        viewCount: sql`${sharedAnalyses.viewCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(sharedAnalyses.shareId, shareId));
  }

  async deleteSharedAnalysis(shareId: string): Promise<void> {
    await db
      .delete(sharedAnalyses)
      .where(eq(sharedAnalyses.shareId, shareId));
  }
}

export const storage = new DatabaseStorage();

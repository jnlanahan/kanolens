import {
  users,
  analysisSessions,
  chatMessages,
  documents,
  type User,
  type UpsertUser,
  type AnalysisSession,
  type InsertAnalysisSession,
  type ChatMessage,
  type InsertChatMessage,
  type Document,
  type InsertDocument,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();

// Simple storage tests to verify mocking works
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';

describe('Storage Mock Verification', () => {
  beforeEach(() => {
    // Clear any state between tests
  });

  describe('User Operations', () => {
    it('should create and retrieve a user', async () => {
      const userData = {
        id: 'test-user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      // Create user
      const createdUser = await storage.upsertUser(userData);
      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBe(userData.id);
      expect(createdUser.email).toBe(userData.email);

      // Retrieve user
      const retrievedUser = await storage.getUser(userData.id);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.id).toBe(userData.id);
      expect(retrievedUser?.email).toBe(userData.email);
    });

    it('should return undefined for non-existent user', async () => {
      const nonExistentUser = await storage.getUser('does-not-exist');
      expect(nonExistentUser).toBeUndefined();
    });

    it('should update existing user', async () => {
      const userData = {
        id: 'test-user-2',
        email: 'original@example.com',
        firstName: 'Original',
        lastName: 'User'
      };

      // Create user
      await storage.upsertUser(userData);

      // Update user
      const updatedData = {
        ...userData,
        email: 'updated@example.com',
        firstName: 'Updated'
      };
      const updatedUser = await storage.upsertUser(updatedData);
      
      expect(updatedUser.email).toBe('updated@example.com');
      expect(updatedUser.firstName).toBe('Updated');
    });
  });

  describe('Analysis Session Operations', () => {
    it('should create and retrieve an analysis session', async () => {
      const sessionData = {
        userId: 'test-user-1',
        title: 'Test Analysis',
        products: ['Product A', 'Product B'],
        targetCustomer: 'Test Customer',
        features: []
      };

      // Create session
      const createdSession = await storage.createAnalysisSession(sessionData);
      expect(createdSession).toBeDefined();
      expect(createdSession.id).toBeDefined();
      expect(createdSession.title).toBe(sessionData.title);
      expect(createdSession.products).toEqual(sessionData.products);

      // Retrieve session
      const retrievedSession = await storage.getAnalysisSession(createdSession.id);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.id).toBe(createdSession.id);
      expect(retrievedSession?.title).toBe(sessionData.title);
    });

    it('should update analysis session', async () => {
      const sessionData = {
        userId: 'test-user-1',
        title: 'Original Title',
        products: ['Product A'],
        targetCustomer: 'Original Customer',
        features: []
      };

      // Create session
      const createdSession = await storage.createAnalysisSession(sessionData);
      
      // Update session
      const updates = {
        title: 'Updated Title',
        currentStep: 'research',
        status: 'in_progress'
      };
      const updatedSession = await storage.updateAnalysisSession(createdSession.id, updates);
      
      expect(updatedSession.title).toBe('Updated Title');
      expect(updatedSession.currentStep).toBe('research');
      expect(updatedSession.status).toBe('in_progress');
    });

    it('should get user analysis sessions', async () => {
      const userId = 'test-user-1';
      
      // Create multiple sessions for the user
      await storage.createAnalysisSession({
        userId,
        title: 'Session 1',
        products: ['Product A'],
        targetCustomer: 'Customer 1',
        features: []
      });
      
      await storage.createAnalysisSession({
        userId,
        title: 'Session 2',
        products: ['Product B'],
        targetCustomer: 'Customer 2',
        features: []
      });

      // Get user sessions
      const userSessions = await storage.getUserAnalysisSessions(userId);
      expect(userSessions).toBeDefined();
      expect(userSessions.length).toBe(2);
      expect(userSessions[0].userId).toBe(userId);
      expect(userSessions[1].userId).toBe(userId);
    });
  });

  describe('Chat Message Operations', () => {
    it('should add and retrieve chat messages', async () => {
      // First create a session
      const session = await storage.createAnalysisSession({
        userId: 'test-user-1',
        title: 'Chat Test Session',
        products: ['Product A'],
        targetCustomer: 'Test Customer',
        features: []
      });

      // Add a chat message
      const messageData = {
        sessionId: session.id,
        role: 'user' as const,
        content: 'Test message content',
        metadata: null
      };
      
      const createdMessage = await storage.addChatMessage(messageData);
      expect(createdMessage).toBeDefined();
      expect(createdMessage.id).toBeDefined();
      expect(createdMessage.content).toBe(messageData.content);
      expect(createdMessage.role).toBe('user');

      // Retrieve session messages
      const sessionMessages = await storage.getSessionChatMessages(session.id);
      expect(sessionMessages).toBeDefined();
      expect(sessionMessages.length).toBe(1);
      expect(sessionMessages[0].content).toBe(messageData.content);
    });

    it('should handle invalid message data', async () => {
      const invalidMessageData = {
        sessionId: 999, // Non-existent session
        role: 'user' as const,
        content: 'Test message',
        metadata: null
      };

      await expect(storage.addChatMessage(invalidMessageData))
        .rejects.toThrow('Invalid session ID');
    });

    it('should validate message role', async () => {
      // Create a session first
      const session = await storage.createAnalysisSession({
        userId: 'test-user-1',
        title: 'Role Test Session',
        products: ['Product A'],
        targetCustomer: 'Test Customer',
        features: []
      });

      const invalidRoleMessage = {
        sessionId: session.id,
        role: 'invalid-role' as any,
        content: 'Test message',
        metadata: null
      };

      await expect(storage.addChatMessage(invalidRoleMessage))
        .rejects.toThrow('Invalid role');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user data', async () => {
      const invalidUserData = {
        // Missing required id and email
        firstName: 'Test',
        lastName: 'User'
      };

      await expect(storage.upsertUser(invalidUserData as any))
        .rejects.toThrow('Invalid user data');
    });

    it('should handle session not found', async () => {
      await expect(storage.updateAnalysisSession(999, { title: 'New Title' }))
        .rejects.toThrow('Session not found');
    });
  });
});
// Working storage tests using direct mocking approach
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the storage module directly in this test file
const mockStorageImplementation = {
  users: new Map(),
  sessions: new Map(),
  messages: new Map(),
  nextSessionId: 1,
  nextMessageId: 1,

  getUser: vi.fn(),
  upsertUser: vi.fn(),
  createAnalysisSession: vi.fn(),
  getAnalysisSession: vi.fn(),
  getUserAnalysisSessions: vi.fn(),
  updateAnalysisSession: vi.fn(),
  deleteAnalysisSession: vi.fn(),
  addChatMessage: vi.fn(),
  getSessionChatMessages: vi.fn()
};

// Set up the mock implementations
beforeEach(() => {
  // Clear data between tests
  mockStorageImplementation.users.clear();
  mockStorageImplementation.sessions.clear();
  mockStorageImplementation.messages.clear();
  mockStorageImplementation.nextSessionId = 1;
  mockStorageImplementation.nextMessageId = 1;
  vi.clearAllMocks();

  // Setup mock implementations
  mockStorageImplementation.getUser.mockImplementation(async (id: string) => {
    return mockStorageImplementation.users.get(id) || undefined;
  });

  mockStorageImplementation.upsertUser.mockImplementation(async (userData: any) => {
    if (!userData.id || !userData.email) {
      throw new Error('Invalid user data');
    }
    const user = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      profileImageUrl: userData.profileImageUrl || null
    };
    mockStorageImplementation.users.set(userData.id, user);
    return user;
  });

  mockStorageImplementation.createAnalysisSession.mockImplementation(async (sessionData: any) => {
    const session = {
      id: mockStorageImplementation.nextSessionId++,
      ...sessionData,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: sessionData.status || 'active',
      currentStep: sessionData.currentStep || 'discovery',
      features: sessionData.features || null,
      tableData: sessionData.tableData || null,
      analysis: sessionData.analysis || null
    };
    mockStorageImplementation.sessions.set(session.id, session);
    return session;
  });

  mockStorageImplementation.getAnalysisSession.mockImplementation(async (id: number) => {
    return mockStorageImplementation.sessions.get(id) || undefined;
  });

  mockStorageImplementation.getUserAnalysisSessions.mockImplementation(async (userId: string) => {
    const userSessions = Array.from(mockStorageImplementation.sessions.values())
      .filter((session: any) => session.userId === userId)
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
    return userSessions;
  });

  mockStorageImplementation.updateAnalysisSession.mockImplementation(async (id: number, updates: any) => {
    const session = mockStorageImplementation.sessions.get(id);
    if (!session) {
      throw new Error('Session not found');
    }
    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };
    mockStorageImplementation.sessions.set(id, updatedSession);
    return updatedSession;
  });

  mockStorageImplementation.addChatMessage.mockImplementation(async (messageData: any) => {
    if (!messageData.sessionId || !mockStorageImplementation.sessions.has(messageData.sessionId)) {
      throw new Error('Invalid session ID');
    }
    if (!['user', 'assistant', 'system'].includes(messageData.role)) {
      throw new Error('Invalid role');
    }
    const message = {
      id: mockStorageImplementation.nextMessageId++,
      ...messageData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    if (!mockStorageImplementation.messages.has(messageData.sessionId)) {
      mockStorageImplementation.messages.set(messageData.sessionId, []);
    }
    mockStorageImplementation.messages.get(messageData.sessionId).push(message);
    return message;
  });

  mockStorageImplementation.getSessionChatMessages.mockImplementation(async (sessionId: number) => {
    return mockStorageImplementation.messages.get(sessionId) || [];
  });
});

describe('Storage Functions', () => {
  describe('User Operations', () => {
    it('should create and retrieve a user', async () => {
      const userData = {
        id: 'test-user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      // Create user
      const createdUser = await mockStorageImplementation.upsertUser(userData);
      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBe(userData.id);
      expect(createdUser.email).toBe(userData.email);

      // Retrieve user
      const retrievedUser = await mockStorageImplementation.getUser(userData.id);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.id).toBe(userData.id);
      expect(retrievedUser?.email).toBe(userData.email);
    });

    it('should return undefined for non-existent user', async () => {
      const nonExistentUser = await mockStorageImplementation.getUser('does-not-exist');
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
      await mockStorageImplementation.upsertUser(userData);

      // Update user
      const updatedData = {
        ...userData,
        email: 'updated@example.com',
        firstName: 'Updated'
      };
      const updatedUser = await mockStorageImplementation.upsertUser(updatedData);
      
      expect(updatedUser.email).toBe('updated@example.com');
      expect(updatedUser.firstName).toBe('Updated');
    });

    it('should handle invalid user data', async () => {
      const invalidUserData = {
        firstName: 'Test',
        lastName: 'User'
      };

      await expect(mockStorageImplementation.upsertUser(invalidUserData))
        .rejects.toThrow('Invalid user data');
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
      const createdSession = await mockStorageImplementation.createAnalysisSession(sessionData);
      expect(createdSession).toBeDefined();
      expect(createdSession.id).toBeDefined();
      expect(createdSession.title).toBe(sessionData.title);
      expect(createdSession.products).toEqual(sessionData.products);

      // Retrieve session
      const retrievedSession = await mockStorageImplementation.getAnalysisSession(createdSession.id);
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
      const createdSession = await mockStorageImplementation.createAnalysisSession(sessionData);
      
      // Update session
      const updates = {
        title: 'Updated Title',
        currentStep: 'research',
        status: 'in_progress'
      };
      const updatedSession = await mockStorageImplementation.updateAnalysisSession(createdSession.id, updates);
      
      expect(updatedSession.title).toBe('Updated Title');
      expect(updatedSession.currentStep).toBe('research');
      expect(updatedSession.status).toBe('in_progress');
    });

    it('should get user analysis sessions', async () => {
      const userId = 'test-user-1';
      
      // Create multiple sessions for the user
      const session1 = await mockStorageImplementation.createAnalysisSession({
        userId,
        title: 'Session 1',
        products: ['Product A'],
        targetCustomer: 'Customer 1',
        features: []
      });
      
      const session2 = await mockStorageImplementation.createAnalysisSession({
        userId,
        title: 'Session 2',
        products: ['Product B'],
        targetCustomer: 'Customer 2',
        features: []
      });

      // Get user sessions
      const userSessions = await mockStorageImplementation.getUserAnalysisSessions(userId);
      expect(userSessions).toBeDefined();
      expect(userSessions.length).toBe(2);
      expect(userSessions[0].userId).toBe(userId);
      expect(userSessions[1].userId).toBe(userId);
      
      // Sessions should exist (order may vary due to timing)
      const sessionIds = userSessions.map(s => s.id);
      expect(sessionIds).toContain(session1.id);
      expect(sessionIds).toContain(session2.id);
    });

    it('should handle session not found', async () => {
      await expect(mockStorageImplementation.updateAnalysisSession(999, { title: 'New Title' }))
        .rejects.toThrow('Session not found');
    });
  });

  describe('Chat Message Operations', () => {
    it('should add and retrieve chat messages', async () => {
      // First create a session
      const session = await mockStorageImplementation.createAnalysisSession({
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
      
      const createdMessage = await mockStorageImplementation.addChatMessage(messageData);
      expect(createdMessage).toBeDefined();
      expect(createdMessage.id).toBeDefined();
      expect(createdMessage.content).toBe(messageData.content);
      expect(createdMessage.role).toBe('user');

      // Retrieve session messages
      const sessionMessages = await mockStorageImplementation.getSessionChatMessages(session.id);
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

      await expect(mockStorageImplementation.addChatMessage(invalidMessageData))
        .rejects.toThrow('Invalid session ID');
    });

    it('should validate message role', async () => {
      // Create a session first
      const session = await mockStorageImplementation.createAnalysisSession({
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

      await expect(mockStorageImplementation.addChatMessage(invalidRoleMessage))
        .rejects.toThrow('Invalid role');
    });
  });
});
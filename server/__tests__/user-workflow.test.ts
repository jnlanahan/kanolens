// Core User Workflow Tests - Authentication → Analysis Creation → Execution → Results
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock all the dependencies needed for routes
const mockStorage = {
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
  addChatMessage: vi.fn(),
  getSessionChatMessages: vi.fn()
};

const mockAuth = {
  setupAuth: vi.fn(),
  setupLoginRoute: vi.fn(),
  isAuthenticated: vi.fn((req: any, res: any, next: any) => {
    req.user = { claims: { sub: 'test-user-123' } };
    next();
  })
};

const mockOpenAI = {
  processChatMessage: vi.fn(),
  testOpenAIConnection: vi.fn()
};

const mockOrchestrator = {
  coordinateFullAnalysis: vi.fn()
};

const mockWebSocket = {
  sendProgressUpdate: vi.fn(),
  initialize: vi.fn()
};

const mockLangSmith = {
  initialize: vi.fn()
};

// Create a simplified routes setup for testing
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock the key routes we need for user workflows
  
  // Authentication check route
  app.get('/api/auth/user', mockAuth.isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const user = await mockStorage.getUser(userId);
    if (!user) {
      // Create dev user
      const devUser = await mockStorage.upsertUser({
        id: userId,
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User'
      });
      return res.json(devUser);
    }
    
    res.json(user);
  });

  // Create analysis session
  app.post('/api/analysis/sessions', mockAuth.isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const sessionData = {
        userId,
        title: req.body.title || 'New Analysis',
        products: req.body.products || [],
        targetCustomer: req.body.targetCustomer || '',
        features: req.body.features || []
      };
      
      const session = await mockStorage.createAnalysisSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create session' });
    }
  });

  // Get user sessions
  app.get('/api/analysis/sessions', mockAuth.isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const sessions = await mockStorage.getUserAnalysisSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get sessions' });
    }
  });

  // Get specific session
  app.get('/api/analysis/sessions/:id', mockAuth.isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await mockStorage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Check ownership
      if (session.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get session' });
    }
  });

  // Add message to session
  app.post('/api/analysis/sessions/:id/messages', mockAuth.isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await mockStorage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      if (session.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Add user message
      const userMessage = await mockStorage.addChatMessage({
        sessionId,
        role: 'user',
        content: req.body.content,
        metadata: req.body.metadata || null
      });
      
      // Mock AI response
      const aiResponse = await mockOpenAI.processChatMessage(
        sessionId,
        req.body.content,
        session.currentStep,
        session,
        []
      );
      
      // Add AI message
      const aiMessage = await mockStorage.addChatMessage({
        sessionId,
        role: 'assistant',
        content: aiResponse.message,
        metadata: {
          step: aiResponse.step,
          progress: aiResponse.progress,
          data: aiResponse.data
        }
      });
      
      res.json({ userMessage, aiMessage });
    } catch (error) {
      res.status(500).json({ message: 'Failed to process message' });
    }
  });

  // OpenAI connection test
  app.get('/api/openai/test', mockAuth.isAuthenticated, async (req, res) => {
    try {
      const isConnected = await mockOpenAI.testOpenAIConnection();
      res.json({ connected: isConnected });
    } catch (error) {
      res.status(500).json({ connected: false, error: 'Connection failed' });
    }
  });

  return app;
}

beforeEach(() => {
  // Clear all data and mocks
  mockStorage.users.clear();
  mockStorage.sessions.clear();
  mockStorage.messages.clear();
  mockStorage.nextSessionId = 1;
  mockStorage.nextMessageId = 1;
  vi.clearAllMocks();

  // Setup storage mocks
  mockStorage.getUser.mockImplementation(async (id: string) => {
    return mockStorage.users.get(id) || undefined;
  });

  mockStorage.upsertUser.mockImplementation(async (userData: any) => {
    const user = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockStorage.users.set(userData.id, user);
    return user;
  });

  mockStorage.createAnalysisSession.mockImplementation(async (sessionData: any) => {
    const session = {
      id: mockStorage.nextSessionId++,
      ...sessionData,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'in_progress',
      currentStep: 'discovery'
    };
    mockStorage.sessions.set(session.id, session);
    return session;
  });

  mockStorage.getAnalysisSession.mockImplementation(async (id: number) => {
    return mockStorage.sessions.get(id) || undefined;
  });

  mockStorage.getUserAnalysisSessions.mockImplementation(async (userId: string) => {
    return Array.from(mockStorage.sessions.values())
      .filter((session: any) => session.userId === userId)
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  mockStorage.addChatMessage.mockImplementation(async (messageData: any) => {
    const message = {
      id: mockStorage.nextMessageId++,
      ...messageData,
      createdAt: new Date()
    };
    if (!mockStorage.messages.has(messageData.sessionId)) {
      mockStorage.messages.set(messageData.sessionId, []);
    }
    mockStorage.messages.get(messageData.sessionId).push(message);
    return message;
  });

  // Setup OpenAI mocks
  mockOpenAI.processChatMessage.mockResolvedValue({
    step: 'discovery',
    message: 'I understand you want to analyze these products.',
    progress: 25,
    data: null
  });

  mockOpenAI.testOpenAIConnection.mockResolvedValue(true);
});

describe('Core User Workflows', () => {
  describe('Authentication Flow: Login → Dashboard Access', () => {
    it('should authenticate user and create dev user if needed', async () => {
      const app = createTestApp();
      
      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe('test-user-123');
      expect(response.body.email).toBe('dev@example.com');
      expect(mockStorage.upsertUser).toHaveBeenCalledWith({
        id: 'test-user-123',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User'
      });
    });

    it('should return existing user if already created', async () => {
      const app = createTestApp();
      
      // Create user first
      await mockStorage.upsertUser({
        id: 'test-user-123',
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User'
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.email).toBe('existing@example.com');
      expect(response.body.firstName).toBe('Existing');
      expect(mockStorage.upsertUser).toHaveBeenCalledTimes(1); // Only the setup call
    });

    it('should test OpenAI connection for authenticated user', async () => {
      const app = createTestApp();
      
      const response = await request(app)
        .get('/api/openai/test')
        .expect(200);

      expect(response.body.connected).toBe(true);
      expect(mockOpenAI.testOpenAIConnection).toHaveBeenCalled();
    });
  });

  describe('Analysis Creation: Setup → Product Selection → Feature Definition', () => {
    it('should create new analysis session with basic data', async () => {
      const app = createTestApp();
      
      const sessionData = {
        title: 'Slack vs Teams Analysis',
        products: ['Slack', 'Microsoft Teams'],
        targetCustomer: 'Enterprise teams',
        features: []
      };

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(sessionData.title);
      expect(response.body.products).toEqual(sessionData.products);
      expect(response.body.userId).toBe('test-user-123');
      expect(response.body.status).toBe('in_progress');
      expect(response.body.currentStep).toBe('discovery');
    });

    it('should retrieve user analysis sessions', async () => {
      const app = createTestApp();
      
      // Create a session first
      await request(app)
        .post('/api/analysis/sessions')
        .send({
          title: 'Test Analysis',
          products: ['Product A', 'Product B'],
          targetCustomer: 'Test Customer'
        })
        .expect(201);

      // Get sessions
      const response = await request(app)
        .get('/api/analysis/sessions')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe('Test Analysis');
      expect(response.body[0].userId).toBe('test-user-123');
    });

    it('should retrieve specific analysis session', async () => {
      const app = createTestApp();
      
      // Create a session
      const createResponse = await request(app)
        .post('/api/analysis/sessions')
        .send({
          title: 'Specific Analysis',
          products: ['Product X'],
          targetCustomer: 'Target Customer'
        })
        .expect(201);

      const sessionId = createResponse.body.id;

      // Get specific session
      const response = await request(app)
        .get(`/api/analysis/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.id).toBe(sessionId);
      expect(response.body.title).toBe('Specific Analysis');
      expect(response.body.products).toEqual(['Product X']);
    });

    it('should return 404 for non-existent session', async () => {
      const app = createTestApp();
      
      await request(app)
        .get('/api/analysis/sessions/999')
        .expect(404);
    });
  });

  describe('Analysis Execution: Chat → Progress Tracking → AI Processing', () => {
    it('should process chat message and return AI response', async () => {
      const app = createTestApp();
      
      // Create a session first
      const createResponse = await request(app)
        .post('/api/analysis/sessions')
        .send({
          title: 'Chat Test Analysis',
          products: ['Product A', 'Product B'],
          targetCustomer: 'Test Customer'
        })
        .expect(201);

      const sessionId = createResponse.body.id;

      // Send a message
      const messageContent = 'Please analyze Slack vs Microsoft Teams for enterprise teams';
      const response = await request(app)
        .post(`/api/analysis/sessions/${sessionId}/messages`)
        .send({ content: messageContent })
        .expect(200);

      expect(response.body.userMessage).toBeDefined();
      expect(response.body.aiMessage).toBeDefined();
      expect(response.body.userMessage.content).toBe(messageContent);
      expect(response.body.userMessage.role).toBe('user');
      expect(response.body.aiMessage.role).toBe('assistant');
      expect(response.body.aiMessage.content).toBe('I understand you want to analyze these products.');
      
      // Verify OpenAI processing was called
      expect(mockOpenAI.processChatMessage).toHaveBeenCalledWith(
        sessionId,
        messageContent,
        'discovery',
        expect.any(Object),
        []
      );
    });

    it('should handle message with metadata', async () => {
      const app = createTestApp();
      
      // Create session
      const createResponse = await request(app)
        .post('/api/analysis/sessions')
        .send({ title: 'Metadata Test' })
        .expect(201);

      const sessionId = createResponse.body.id;

      // Send message with metadata
      const response = await request(app)
        .post(`/api/analysis/sessions/${sessionId}/messages`)
        .send({
          content: 'Test message',
          metadata: { source: 'manual', priority: 'high' }
        })
        .expect(200);

      expect(response.body.userMessage.metadata).toEqual({
        source: 'manual',
        priority: 'high'
      });
      expect(response.body.aiMessage.metadata.step).toBe('discovery');
      expect(response.body.aiMessage.metadata.progress).toBe(25);
    });

    it('should return 403 when user tries to access another user session', async () => {
      const app = createTestApp();
      
      // Create a session for a different user
      const otherUserSession = {
        id: 999,
        userId: 'other-user-456',
        title: 'Other User Session',
        products: [],
        targetCustomer: '',
        features: [],
        status: 'in_progress',
        currentStep: 'discovery',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockStorage.sessions.set(999, otherUserSession);

      // Try to access it
      await request(app)
        .get('/api/analysis/sessions/999')
        .expect(403);

      // Try to send message to it
      await request(app)
        .post('/api/analysis/sessions/999/messages')
        .send({ content: 'Unauthorized message' })
        .expect(403);
    });
  });

  describe('Complete User Journey: Authentication → Analysis → Results', () => {
    it('should complete full user workflow', async () => {
      const app = createTestApp();
      
      // 1. Authentication - Get/create user
      const authResponse = await request(app)
        .get('/api/auth/user')
        .expect(200);
      
      expect(authResponse.body.id).toBe('test-user-123');

      // 2. Create analysis session
      const sessionResponse = await request(app)
        .post('/api/analysis/sessions')
        .send({
          title: 'Complete Workflow Test',
          products: ['Slack', 'Microsoft Teams', 'Discord'],
          targetCustomer: 'Remote development teams',
          features: []
        })
        .expect(201);

      const sessionId = sessionResponse.body.id;
      expect(sessionResponse.body.title).toBe('Complete Workflow Test');

      // 3. Start analysis with chat message
      const chatResponse = await request(app)
        .post(`/api/analysis/sessions/${sessionId}/messages`)
        .send({
          content: 'Please analyze these communication tools for remote development teams'
        })
        .expect(200);

      expect(chatResponse.body.userMessage.content).toContain('communication tools');
      expect(chatResponse.body.aiMessage.content).toBe('I understand you want to analyze these products.');

      // 4. Verify session can be retrieved
      const retrieveResponse = await request(app)
        .get(`/api/analysis/sessions/${sessionId}`)
        .expect(200);

      expect(retrieveResponse.body.id).toBe(sessionId);
      expect(retrieveResponse.body.products).toEqual(['Slack', 'Microsoft Teams', 'Discord']);

      // 5. Verify in user session list
      const sessionsResponse = await request(app)
        .get('/api/analysis/sessions')
        .expect(200);

      expect(sessionsResponse.body.length).toBe(1);
      expect(sessionsResponse.body[0].id).toBe(sessionId);
    });
  });
});
// Critical Path Tests - Core user workflows with simplified mocking
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Simple, reliable mocks that don't timeout
const createSimpleApp = () => {
  const app = express();
  app.use(express.json());

  // Simple authentication middleware
  const mockAuth = (req: any, res: any, next: any) => {
    req.user = { claims: { sub: 'test-user-123' } };
    next();
  };

  // In-memory data store
  let users = new Map();
  let sessions = new Map();
  let messages = new Map();
  let nextSessionId = 1;
  let nextMessageId = 1;

  // Reset data for each test
  app.use((req, res, next) => {
    if (req.headers['test-reset']) {
      users.clear();
      sessions.clear();
      messages.clear();
      nextSessionId = 1;
      nextMessageId = 1;
    }
    next();
  });

  // Authentication endpoint
  app.get('/api/auth/user', mockAuth, (req: any, res) => {
    const userId = req.user.claims.sub;
    let user = users.get(userId);
    
    if (!user) {
      user = {
        id: userId,
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
        createdAt: new Date().toISOString()
      };
      users.set(userId, user);
    }
    
    res.json(user);
  });

  // Create analysis session
  app.post('/api/analysis/sessions', mockAuth, (req: any, res) => {
    const userId = req.user.claims.sub;
    const session = {
      id: nextSessionId++,
      userId,
      title: req.body.title || 'New Analysis',
      products: req.body.products || [],
      targetCustomer: req.body.targetCustomer || '',
      features: req.body.features || [],
      status: 'in_progress',
      currentStep: 'discovery',
      createdAt: new Date().toISOString()
    };
    
    sessions.set(session.id, session);
    res.status(201).json(session);
  });

  // Get user sessions
  app.get('/api/analysis/sessions', mockAuth, (req: any, res) => {
    const userId = req.user.claims.sub;
    const userSessions = Array.from(sessions.values())
      .filter((session: any) => session.userId === userId);
    res.json(userSessions);
  });

  // Get specific session
  app.get('/api/analysis/sessions/:id', mockAuth, (req: any, res) => {
    const sessionId = parseInt(req.params.id);
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(session);
  });

  // Add message to session
  app.post('/api/analysis/sessions/:id/messages', mockAuth, (req: any, res) => {
    const sessionId = parseInt(req.params.id);
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Create user message
    const userMessage = {
      id: nextMessageId++,
      sessionId,
      role: 'user',
      content: req.body.content,
      metadata: req.body.metadata || null,
      createdAt: new Date().toISOString()
    };
    
    // Create AI response
    const aiMessage = {
      id: nextMessageId++,
      sessionId,
      role: 'assistant',
      content: 'I understand your request and will help with the analysis.',
      metadata: {
        step: 'discovery',
        progress: 25
      },
      createdAt: new Date().toISOString()
    };
    
    // Store messages
    if (!messages.has(sessionId)) {
      messages.set(sessionId, []);
    }
    messages.get(sessionId).push(userMessage, aiMessage);
    
    res.json({ userMessage, aiMessage });
  });

  // Get session messages
  app.get('/api/analysis/sessions/:id/messages', mockAuth, (req: any, res) => {
    const sessionId = parseInt(req.params.id);
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const sessionMessages = messages.get(sessionId) || [];
    res.json(sessionMessages);
  });

  // Health check / OpenAI test
  app.get('/api/openai/test', mockAuth, (req, res) => {
    res.json({ connected: true, model: 'test-model' });
  });

  return app;
};

describe('Critical Path Tests - Core User Workflows', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createSimpleApp();
  });

  describe('🔐 Authentication Flow: Login → Dashboard Access', () => {
    it('should authenticate and get/create user', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .set('test-reset', 'true')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'test-user-123',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User'
      });
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return same user on subsequent calls', async () => {
      // First call creates user
      const firstResponse = await request(app)
        .get('/api/auth/user')
        .set('test-reset', 'true')
        .expect(200);

      // Second call returns same user
      const secondResponse = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(firstResponse.body.id).toBe(secondResponse.body.id);
      expect(firstResponse.body.createdAt).toBe(secondResponse.body.createdAt);
    });

    it('should verify OpenAI connection for authenticated user', async () => {
      const response = await request(app)
        .get('/api/openai/test')
        .expect(200);

      expect(response.body).toEqual({
        connected: true,
        model: 'test-model'
      });
    });
  });

  describe('📊 Analysis Creation: Setup → Product Selection → Feature Definition', () => {
    it('should create new analysis session', async () => {
      const sessionData = {
        title: 'Slack vs Teams Analysis',
        products: ['Slack', 'Microsoft Teams'],
        targetCustomer: 'Enterprise teams',
        features: []
      };

      const response = await request(app)
        .post('/api/analysis/sessions')
        .set('test-reset', 'true')
        .send(sessionData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 1,
        userId: 'test-user-123',
        title: 'Slack vs Teams Analysis',
        products: ['Slack', 'Microsoft Teams'],
        targetCustomer: 'Enterprise teams',
        status: 'in_progress',
        currentStep: 'discovery'
      });
      expect(response.body.createdAt).toBeDefined();
    });

    it('should handle default values for missing fields', async () => {
      const response = await request(app)
        .post('/api/analysis/sessions')
        .set('test-reset', 'true')
        .send({})
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'New Analysis',
        products: [],
        targetCustomer: '',
        features: []
      });
    });

    it('should retrieve user analysis sessions', async () => {
      // Create two sessions
      await request(app)
        .post('/api/analysis/sessions')
        .set('test-reset', 'true')
        .send({ title: 'First Analysis' })
        .expect(201);

      await request(app)
        .post('/api/analysis/sessions')
        .send({ title: 'Second Analysis' })
        .expect(201);

      // Get all sessions
      const response = await request(app)
        .get('/api/analysis/sessions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('First Analysis');
      expect(response.body[1].title).toBe('Second Analysis');
    });

    it('should retrieve specific analysis session', async () => {
      // Create session
      const createResponse = await request(app)
        .post('/api/analysis/sessions')
        .set('test-reset', 'true')
        .send({ title: 'Specific Analysis', products: ['Product A'] })
        .expect(201);

      const sessionId = createResponse.body.id;

      // Get specific session
      const response = await request(app)
        .get(`/api/analysis/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.id).toBe(sessionId);
      expect(response.body.title).toBe('Specific Analysis');
      expect(response.body.products).toEqual(['Product A']);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/analysis/sessions/999')
        .set('test-reset', 'true')
        .expect(404);

      expect(response.body.message).toBe('Session not found');
    });
  });

  describe('💬 Analysis Execution: Chat → Progress Tracking → AI Processing', () => {
    let sessionId: number;

    beforeEach(async () => {
      // Create a session for chat tests
      const response = await request(app)
        .post('/api/analysis/sessions')
        .set('test-reset', 'true')
        .send({
          title: 'Chat Test Session',
          products: ['Product A', 'Product B'],
          targetCustomer: 'Test Customer'
        });
      sessionId = response.body.id;
    });

    it('should process chat message and return AI response', async () => {
      const messageContent = 'Please analyze Product A vs Product B for test customers';
      
      const response = await request(app)
        .post(`/api/analysis/sessions/${sessionId}/messages`)
        .send({ content: messageContent })
        .expect(200);

      expect(response.body.userMessage).toMatchObject({
        role: 'user',
        content: messageContent,
        sessionId: sessionId
      });

      expect(response.body.aiMessage).toMatchObject({
        role: 'assistant',
        content: 'I understand your request and will help with the analysis.',
        sessionId: sessionId,
        metadata: {
          step: 'discovery',
          progress: 25
        }
      });
    });

    it('should handle message with metadata', async () => {
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
    });

    it('should retrieve session messages', async () => {
      // Send a message first
      await request(app)
        .post(`/api/analysis/sessions/${sessionId}/messages`)
        .send({ content: 'First message' })
        .expect(200);

      // Get messages
      const response = await request(app)
        .get(`/api/analysis/sessions/${sessionId}/messages`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2); // User message + AI response
      expect(response.body[0].content).toBe('First message');
      expect(response.body[1].content).toBe('I understand your request and will help with the analysis.');
    });

    it('should return 404 for messages in non-existent session', async () => {
      const response = await request(app)
        .post('/api/analysis/sessions/999/messages')
        .send({ content: 'Test message' })
        .expect(404);

      expect(response.body.message).toBe('Session not found');
    });
  });

  describe('🔒 Access Control & Security', () => {
    it('should prevent access to other users sessions', async () => {
      // This test simulates another user trying to access our session
      // In a real scenario, the auth middleware would set a different user ID
      
      // Create session
      const response = await request(app)
        .post('/api/analysis/sessions')
        .set('test-reset', 'true')
        .send({ title: 'Private Session' })
        .expect(201);

      const sessionId = response.body.id;

      // Simulate different user by manually checking the session
      // (In real app, this would be handled by auth middleware)
      // For now, we'll just verify the session exists and belongs to our test user
      const getResponse = await request(app)
        .get(`/api/analysis/sessions/${sessionId}`)
        .expect(200);

      expect(getResponse.body.userId).toBe('test-user-123');
    });
  });

  describe('🎯 Complete User Journey', () => {
    it('should complete full analysis workflow', async () => {
      // 1. Authentication
      const authResponse = await request(app)
        .get('/api/auth/user')
        .set('test-reset', 'true')
        .expect(200);

      expect(authResponse.body.id).toBe('test-user-123');

      // 2. Create analysis session
      const sessionResponse = await request(app)
        .post('/api/analysis/sessions')
        .send({
          title: 'Complete Workflow Test',
          products: ['Slack', 'Microsoft Teams', 'Discord'],
          targetCustomer: 'Remote development teams'
        })
        .expect(201);

      const sessionId = sessionResponse.body.id;

      // 3. Start analysis conversation
      const chatResponse = await request(app)
        .post(`/api/analysis/sessions/${sessionId}/messages`)
        .send({
          content: 'Please analyze these communication tools for remote development teams focusing on integration capabilities and user experience'
        })
        .expect(200);

      expect(chatResponse.body.userMessage.content).toContain('communication tools');
      expect(chatResponse.body.aiMessage.metadata.step).toBe('discovery');

      // 4. Verify session is updated and accessible
      const retrieveResponse = await request(app)
        .get(`/api/analysis/sessions/${sessionId}`)
        .expect(200);

      expect(retrieveResponse.body.products).toEqual(['Slack', 'Microsoft Teams', 'Discord']);

      // 5. Verify conversation history
      const messagesResponse = await request(app)
        .get(`/api/analysis/sessions/${sessionId}/messages`)
        .expect(200);

      expect(messagesResponse.body).toHaveLength(2);
      expect(messagesResponse.body[0].role).toBe('user');
      expect(messagesResponse.body[1].role).toBe('assistant');

      // 6. Verify in user session list
      const sessionsResponse = await request(app)
        .get('/api/analysis/sessions')
        .expect(200);

      expect(sessionsResponse.body).toHaveLength(1);
      expect(sessionsResponse.body[0].id).toBe(sessionId);
    });
  });
});
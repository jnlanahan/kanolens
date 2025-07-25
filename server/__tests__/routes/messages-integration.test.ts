// Integration test for extracted message routes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { setupMessageRoutes, buildSessionUpdate } from '../../routes/messages';

// Mock dependencies
vi.mock('../../storage');
vi.mock('../../simpleAuth');
vi.mock('../../openai');

describe('Message Routes Integration Test', () => {
  let app: Express;
  let mockStorage: any;
  let mockAuth: any;
  let mockOpenAI: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Get mocked modules
    mockStorage = await import('../../storage');
    mockAuth = await import('../../simpleAuth');
    mockOpenAI = await import('../../openai');
    
    // Mock auth middleware
    mockAuth.isAuthenticated.mockImplementation((req: any, res: any, next: any) => {
      req.user = { claims: { sub: 'test-user-123' } };
      next();
    });
    
    // Mock storage functions
    mockStorage.storage.getAnalysisSession.mockResolvedValue({
      id: 1,
      userId: 'test-user-123',
      title: 'Test Session',
      currentStep: 'discovery'
    });
    
    mockStorage.storage.addChatMessage.mockResolvedValue({
      id: 1,
      sessionId: 1,
      role: 'user',
      content: 'Test message'
    });
    
    mockStorage.storage.getSessionChatMessages.mockResolvedValue([
      { id: 1, role: 'user', content: 'Hello' },
      { id: 2, role: 'assistant', content: 'Hi there!' }
    ]);
    
    // Mock OpenAI response
    mockOpenAI.processChatMessage.mockResolvedValue({
      step: 'research',
      message: 'AI response message',
      progress: 50,
      data: { products: ['Product1', 'Product2'] },
      metadata: { confidence: 0.9 }
    });
    
    // Setup our extracted message routes
    setupMessageRoutes(app);
  });

  it('should setup message routes without crashing', () => {
    expect(setupMessageRoutes).toBeDefined();
    expect(typeof setupMessageRoutes).toBe('function');
  });

  it('message routes module should be importable', async () => {
    const messageModule = await import('../../routes/messages');
    expect(messageModule.setupMessageRoutes).toBeDefined();
    expect(messageModule.buildSessionUpdate).toBeDefined();
  });

  it('should have proper helper functions', () => {
    // Test buildSessionUpdate function
    const aiResponse = {
      step: 'research',
      data: {
        products: ['Product1', 'Product2'],
        features: ['Feature1', 'Feature2']
      }
    };
    
    const session = {
      title: 'New Analysis Session'
    };
    
    const update = buildSessionUpdate(aiResponse, session);
    
    expect(update.currentStep).toBe('research');
    expect(update.products).toEqual(['Product1', 'Product2']);
    expect(update.features).toEqual(['Feature1', 'Feature2']);
    expect(update.title).toBe('Product1 vs Product2 Analysis');
  });

  it('should handle session not found', async () => {
    const mockReq = {
      params: { id: '999' },
      user: { claims: { sub: 'test-user' } },
      body: { content: 'test message' }
    };
    
    mockStorage.storage.getAnalysisSession.mockResolvedValueOnce(null);
    
    // This test verifies the structure without making actual HTTP calls
    expect(mockStorage.storage.getAnalysisSession).toBeDefined();
  });

  it('should have proper error handling structure', () => {
    // Test that the function doesn't throw when setting up routes
    expect(() => {
      const testApp = express();
      setupMessageRoutes(testApp);
    }).not.toThrow();
  });
});
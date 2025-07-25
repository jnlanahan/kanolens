// Comprehensive test setup file
import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { dbManager } from '../db';
import { storage } from '../storage';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/kanolens_test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
process.env.SESSION_SECRET = 'test-session-secret';

// Global console mocking to reduce test noise
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: console.error, // Keep error for debugging
};

// Mock database and storage
vi.mock('../db', () => ({
  dbManager: {
    initialize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    client: {
      sql: vi.fn().mockResolvedValue([])
    }
  }
}));

vi.mock('../storage', () => {
  // Simple in-memory storage for tests
  const users = new Map();
  const sessions = new Map();
  const messages = new Map(); // sessionId -> array of messages
  let nextSessionId = 1;
  let nextMessageId = 1;

  return {
    storage: {
      getUser: vi.fn().mockImplementation(async (id: string) => {
        return users.get(id) || undefined;
      }),
      upsertUser: vi.fn().mockImplementation(async (userData: any) => {
        console.error('[Mock] upsertUser called with:', userData);
        if (!userData.id || !userData.email) {
          const error = new Error('Invalid user data');
          console.error('[Mock] upsertUser throwing error:', error);
          throw error;
        }
        const user = {
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date(),
          profileImageUrl: userData.profileImageUrl || null
        };
        users.set(userData.id, user);
        console.error('[Mock] upsertUser returning:', user);
        return user;
      }),
      createAnalysisSession: vi.fn().mockImplementation(async (sessionData: any) => {
        const session = {
          id: nextSessionId++,
          ...sessionData,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: sessionData.status || 'active',
          currentStep: sessionData.currentStep || 'discovery',
          features: sessionData.features || null,
          tableData: sessionData.tableData || null,
          analysis: sessionData.analysis || null
        };
        sessions.set(session.id, session);
        return session;
      }),
      getAnalysisSession: vi.fn().mockImplementation(async (id: number) => {
        return sessions.get(id) || undefined;
      }),
      getUserAnalysisSessions: vi.fn().mockImplementation(async (userId: string) => {
        const userSessions = Array.from(sessions.values())
          .filter(session => session.userId === userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return userSessions;
      }),
      updateAnalysisSession: vi.fn().mockImplementation(async (id: number, updates: any) => {
        const session = sessions.get(id);
        if (!session) {
          throw new Error('Session not found');
        }
        const updatedSession = {
          ...session,
          ...updates,
          updatedAt: new Date()
        };
        sessions.set(id, updatedSession);
        return updatedSession;
      }),
      deleteAnalysisSession: vi.fn().mockImplementation(async (id: number) => {
        const deleted = sessions.delete(id);
        if (messages.has(id)) {
          messages.delete(id);
        }
        return undefined;
      }),
      addChatMessage: vi.fn().mockImplementation(async (messageData: any) => {
        if (!messageData.sessionId || !sessions.has(messageData.sessionId)) {
          throw new Error('Invalid session ID');
        }
        if (!['user', 'assistant', 'system'].includes(messageData.role)) {
          throw new Error('Invalid role');
        }
        const message = {
          id: nextMessageId++,
          ...messageData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        if (!messages.has(messageData.sessionId)) {
          messages.set(messageData.sessionId, []);
        }
        messages.get(messageData.sessionId).push(message);
        return message;
      }),
      getSessionChatMessages: vi.fn().mockImplementation(async (sessionId: number) => {
        return messages.get(sessionId) || [];
      })
    }
  };
});

// Mock authentication
vi.mock('../simpleAuth', () => ({
  setupAuth: vi.fn(),
  setupLoginRoute: vi.fn(),
  isAuthenticated: vi.fn((req: any, res: any, next: any) => {
    // Mock authenticated user
    req.user = {
      claims: {
        sub: 'test-user-123'
      }
    };
    next();
  }),
  requireAuth: vi.fn((req: any, res: any, next: any) => {
    // Same behavior as isAuthenticated for testing
    req.user = {
      claims: {
        sub: 'test-user-123'
      }
    };
    next();
  })
}));

// Mock external AI services - using absolute path resolution
vi.mock('../openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  },
  searchProductInformation: vi.fn(),
  processChatMessage: vi.fn(),
  testOpenAIConnection: vi.fn().mockResolvedValue(true),
  conductCompetitiveResearch: vi.fn().mockResolvedValue({
    searchResults: {},
    actualSources: {}
  }),
  generateKanoTable: vi.fn().mockResolvedValue({
    success: true,
    message: "Table generation successful"
  })
}));

// Also mock using the exact import path from routes.ts
vi.mock('./openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  },
  searchProductInformation: vi.fn(),
  processChatMessage: vi.fn(),
  testOpenAIConnection: vi.fn().mockResolvedValue(true),
  conductCompetitiveResearch: vi.fn().mockResolvedValue({
    searchResults: {},
    actualSources: {}
  }),
  generateKanoTable: vi.fn().mockResolvedValue({
    success: true,
    message: "Table generation successful"
  })
}));

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}));

// Mock WebSocket functionality
vi.mock('../websocket', () => ({
  webSocketService: {
    sendProgressUpdate: vi.fn(),
    initialize: vi.fn(),
    getConnectionStatus: vi.fn().mockReturnValue({
      connectionCount: 0,
      activeSessions: 0,
      totalConnections: 0,
      maxConnections: 100,
      maxPerSession: 5,
      sessionDetails: []
    })
  }
}));

// Mock LangSmith
vi.mock('../langsmith', () => ({
  langSmithService: {
    initialize: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
    createWorkflowTrace: vi.fn().mockResolvedValue({
      id: 'mock-trace-id',
      url: 'https://mock-langsmith-url'
    })
  },
  withLangSmithTrace: vi.fn().mockImplementation((name, fn) => fn)
}));

// Mock AI Agents
vi.mock('../agents/researcher', () => {
  const mockResearchData = {
    products: [
      {
        name: 'Test Product',
        company: 'Test Company',
        targetMarket: 'Test Market',
        pricing: 'Test Pricing',
        features: [{ name: 'Test Feature', description: 'Test Description' }],
        uniqueDifferentiators: ['Test Differentiator'],
        marketPosition: 'Test Position'
      }
    ],
    featureSummary: {
      totalUniqueFeatures: 1,
      commonFeatures: ['Test Feature'],
      differentiatingFeatures: []
    }
  };

  const mockPerformResearch = vi.fn().mockResolvedValue(mockResearchData);
  
  return {
    ResearcherAgent: vi.fn().mockImplementation(() => ({
      performResearch: mockPerformResearch
    })),
    researcherAgent: {
      performResearch: mockPerformResearch
    }
  };
});

vi.mock('../agents/validator', () => ({
  ValidatorAgent: vi.fn().mockImplementation(() => ({
    categorizeFeatures: vi.fn().mockResolvedValue({
      categorizedFeatures: [
        {
          featureName: 'Test Feature',
          category: 'must-have',
          categoryRationale: 'Test rationale',
          productRatings: {
            'Test Product': { rating: 'High', justification: 'Test justification' }
          }
        }
      ]
    })
  })),
  validatorAgent: {
    categorizeFeatures: vi.fn().mockResolvedValue({
      categorizedFeatures: [
        {
          featureName: 'Test Feature',
          category: 'must-have',
          categoryRationale: 'Test rationale',
          productRatings: {
            'Test Product': { rating: 'High', justification: 'Test justification' }
          }
        }
      ]
    })
  }
}));

vi.mock('../agents/analyst', () => ({
  AnalystAgent: vi.fn().mockImplementation(() => ({
    analyzeKanoTable: vi.fn().mockResolvedValue({
      marketOverview: 'Test market overview',
      competitivePositioning: 'Test positioning',
      innovationOpportunities: ['Test opportunity'],
      recommendations: ['Test recommendation']
    })
  })),
  analystAgent: {
    analyzeKanoTable: vi.fn().mockResolvedValue({
      marketOverview: 'Test market overview',
      competitivePositioning: 'Test positioning',
      innovationOpportunities: ['Test opportunity'],
      recommendations: ['Test recommendation']
    })
  }
}));

vi.mock('../agents/evaluator', () => ({
  EvaluatorAgent: vi.fn().mockImplementation(() => ({
    evaluateAgent: vi.fn().mockResolvedValue({
      score: 85,
      strengths: ['Test strength'],
      weaknesses: ['Test weakness'],
      suggestions: ['Test suggestion'],
      qualityMetrics: {
        completeness: 90,
        accuracy: 85,
        clarity: 80
      }
    })
  })),
  evaluatorAgent: {
    evaluateAgent: vi.fn().mockResolvedValue({
      score: 85,
      strengths: ['Test strength'],
      weaknesses: ['Test weakness'],
      suggestions: ['Test suggestion'],
      qualityMetrics: {
        completeness: 90,
        accuracy: 85,
        clarity: 80
      }
    })
  }
}));

// Test setup with mocked dependencies
beforeAll(async () => {
  console.log('[Test Setup] Test environment initialized with mocks');
});

afterAll(async () => {
  console.log('[Test Setup] Test cleanup completed');
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Additional cleanup after each test
afterEach(() => {
  vi.resetAllMocks();
});

// Export test utilities
export const testUtils = {
  // Create a test user (using mocked storage)
  createTestUser: async (overrides = {}) => {
    const userData = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      ...overrides
    };
    
    // Use the mocked storage to create the user
    const { storage } = await import('../storage');
    return await storage.upsertUser(userData);
  },

  // Create a test analysis session (using mocked storage)
  createTestSession: async (userId = 'test-user-123', overrides = {}) => {
    const sessionData = {
      userId,
      title: 'Test Analysis Session',
      products: ['Product A', 'Product B'],
      targetCustomer: 'Test Customer',
      ...overrides
    };
    
    // Use the mocked storage to create the session
    const { storage } = await import('../storage');
    return await storage.createAnalysisSession(sessionData);
  },

  // Create a test chat message (using mocked storage)
  createTestMessage: async (sessionId: number, overrides = {}) => {
    const messageData = {
      sessionId,
      role: 'user' as const,
      content: 'Test message content',
      metadata: null,
      ...overrides
    };
    
    // Use the mocked storage to create the message
    const { storage } = await import('../storage');
    return await storage.addChatMessage(messageData);
  },

  // Mock AI response helper - simplified approach
  mockAIResponse: (response: any) => {
    // For now, just return a mock function that tests can use
    // The actual implementation will use the mocked processChatMessage
    return vi.fn().mockResolvedValue({
      message: 'Test AI response',
      step: 'discovery',
      progress: 25,
      data: null,
      metadata: null,
      ...response
    });
  },

  // Mock OpenAI chat completion - simplified approach
  mockOpenAIResponse: (response: any) => {
    return vi.fn().mockResolvedValue({
      choices: [{
        message: {
          content: 'Test response content',
          ...response.message
        }
      }],
      ...response
    });
  },

  // Create mock request/response objects for Express
  createMockReq: (overrides = {}) => ({
    user: { claims: { sub: 'test-user-123' } },
    body: {},
    params: {},
    query: {},
    ...overrides
  }),

  createMockRes: () => {
    const res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis()
    };
    return res;
  },

  // Wait for async operations to complete
  waitForPromises: () => new Promise(resolve => setImmediate(resolve))
};
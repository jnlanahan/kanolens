// Integration test for extracted auth routes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { setupAuthRoutes } from '../../routes/auth';

// Mock dependencies
vi.mock('../../storage');
vi.mock('../../openai');
vi.mock('../../simpleAuth');

describe('Auth Routes Integration Test', () => {
  let app: Express;
  let mockStorage: any;
  let mockOpenAI: any;
  let mockAuth: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Get mocked modules
    mockStorage = await import('../../storage');
    mockOpenAI = await import('../../openai');
    mockAuth = await import('../../simpleAuth');
    
    // Mock auth middleware to add user to request
    mockAuth.isAuthenticated.mockImplementation((req: any, res: any, next: any) => {
      req.user = { claims: { sub: 'test-user-123' } };
      next();
    });
    
    mockStorage.storage.getUser.mockResolvedValue({
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    });
    
    mockOpenAI.testOpenAIConnection.mockResolvedValue(true);
    
    // Setup our extracted auth routes
    setupAuthRoutes(app);
  });

  it('should setup auth routes without crashing', () => {
    expect(setupAuthRoutes).toBeDefined();
    expect(typeof setupAuthRoutes).toBe('function');
  });

  it('auth routes module should be importable', async () => {
    const authModule = await import('../../routes/auth');
    expect(authModule.setupAuthRoutes).toBeDefined();
  });

  it('should have proper error handling structure', () => {
    // Test that the function doesn't throw when setting up routes
    expect(() => {
      const testApp = express();
      setupAuthRoutes(testApp);
    }).not.toThrow();
  });
});
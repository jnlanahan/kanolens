// Integration test for extracted session routes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { setupSessionRoutes, validateSessionOwnership } from '../../routes/sessions';

// Mock dependencies
vi.mock('../../storage');
vi.mock('../../simpleAuth');
vi.mock('@shared/schema');

describe('Session Routes Integration Test', () => {
  let app: Express;
  let mockStorage: any;
  let mockAuth: any;
  let mockSchema: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Get mocked modules
    mockStorage = await import('../../storage');
    mockAuth = await import('../../simpleAuth');
    mockSchema = await import('@shared/schema');
    
    // Mock auth middleware
    mockAuth.isAuthenticated.mockImplementation((req: any, res: any, next: any) => {
      req.user = { claims: { sub: 'test-user-123' } };
      next();
    });
    
    // Mock schema
    mockSchema.insertAnalysisSessionSchema = {
      parse: vi.fn().mockImplementation((data) => data)
    };
    
    mockSchema.ANALYSIS_STEPS = {
      DISCOVERY: 'discovery',
      RESEARCH: 'research',
      CATEGORIZATION: 'categorization',
      ANALYSIS: 'analysis',
      TABLE_CREATION: 'table_creation'
    };
    
    // Mock storage functions
    mockStorage.storage.createAnalysisSession.mockResolvedValue({
      id: 1,
      userId: 'test-user-123',
      title: 'Test Session'
    });
    
    mockStorage.storage.getUserAnalysisSessions.mockResolvedValue([
      { id: 1, title: 'Session 1' },
      { id: 2, title: 'Session 2' }
    ]);
    
    mockStorage.storage.getAnalysisSession.mockResolvedValue({
      id: 1,
      userId: 'test-user-123',
      title: 'Test Session',
      currentStep: 'discovery'
    });
    
    // Setup our extracted session routes
    setupSessionRoutes(app);
  });

  it('should setup session routes without crashing', () => {
    expect(setupSessionRoutes).toBeDefined();
    expect(typeof setupSessionRoutes).toBe('function');
  });

  it('session routes module should be importable', async () => {
    const sessionModule = await import('../../routes/sessions');
    expect(sessionModule.setupSessionRoutes).toBeDefined();
    expect(sessionModule.validateSessionOwnership).toBeDefined();
  });

  it('should have proper helper functions', () => {
    // Test validateSessionOwnership function
    const session = { userId: 'user-123' };
    expect(validateSessionOwnership(session, 'user-123')).toBe(true);
    expect(validateSessionOwnership(session, 'different-user')).toBe(false);
    expect(validateSessionOwnership(null, 'user-123')).toBe(false);
  });

  it('should have proper error handling structure', () => {
    // Test that the function doesn't throw when setting up routes
    expect(() => {
      const testApp = express();
      setupSessionRoutes(testApp);
    }).not.toThrow();
  });
});
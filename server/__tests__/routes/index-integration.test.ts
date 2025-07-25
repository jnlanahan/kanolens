// Integration test for route registry
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { registerRoutes, setupAuthRoutes, setupSessionRoutes, setupMessageRoutes } from '../../routes/index';

// Mock dependencies
vi.mock('../../storage');
vi.mock('../../simpleAuth');
vi.mock('../../openai');
vi.mock('http');

describe('Route Registry Integration Test', () => {
  let app: Express;
  let mockStorage: any;
  let mockAuth: any;
  let mockHttp: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Get mocked modules
    mockStorage = await import('../../storage');
    mockAuth = await import('../../simpleAuth');
    mockHttp = await import('http');
    
    // Mock auth setup
    mockAuth.setupAuth.mockResolvedValue(undefined);
    mockAuth.setupLoginRoute.mockImplementation(() => {});
    mockAuth.isAuthenticated.mockImplementation((req: any, res: any, next: any) => {
      req.user = { claims: { sub: 'test-user-123' } };
      next();
    });
    
    // Mock storage
    mockStorage.storage.upsertUser.mockResolvedValue({
      id: 'dev-user-123',
      email: 'dev@example.com'
    });
    
    // Mock HTTP server
    mockHttp.createServer.mockReturnValue({
      listen: vi.fn(),
      close: vi.fn()
    });
  });

  it('should have all route setup functions available', () => {
    expect(registerRoutes).toBeDefined();
    expect(setupAuthRoutes).toBeDefined();
    expect(setupSessionRoutes).toBeDefined();
    expect(setupMessageRoutes).toBeDefined();
  });

  it('should register routes without crashing', async () => {
    // Set NODE_ENV to test to avoid dev user creation
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    
    try {
      const server = await registerRoutes(app);
      expect(server).toBeDefined();
      expect(mockAuth.setupAuth).toHaveBeenCalledWith(app);
      expect(mockAuth.setupLoginRoute).toHaveBeenCalledWith(app);
      expect(mockHttp.createServer).toHaveBeenCalledWith(app);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('should create dev user in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    try {
      await registerRoutes(app);
      expect(mockStorage.storage.upsertUser).toHaveBeenCalledWith({
        id: 'dev-user-123',
        email: 'dev@example.com',
        firstName: 'Development',
        lastName: 'User'
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('should handle errors gracefully during setup', async () => {
    // Mock a storage error
    mockStorage.storage.upsertUser.mockRejectedValueOnce(new Error('DB Error'));
    
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    try {
      // Should not throw even if user creation fails
      const server = await registerRoutes(app);
      expect(server).toBeDefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('route registry module should be importable', async () => {
    const routeModule = await import('../../routes/index');
    expect(routeModule.registerRoutes).toBeDefined();
    expect(routeModule.setupAuthRoutes).toBeDefined();
    expect(routeModule.setupSessionRoutes).toBeDefined();
    expect(routeModule.setupMessageRoutes).toBeDefined();
  });
});
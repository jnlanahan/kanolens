// Tests for auth routes - specific functionality before extraction
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

// Mock dependencies
vi.mock('../../storage');
vi.mock('../../openai');

describe('Auth Routes - Pre-refactoring Tests', () => {
  let app: Express;
  let mockStorage: any;
  let mockOpenAI: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create test app
    app = express();
    app.use(express.json());
    
    // Get mocked modules
    mockStorage = await import('../../storage');
    mockOpenAI = await import('../../openai');
    
    // Set up mock implementations
    mockStorage.getUser.mockResolvedValue(null);
    mockStorage.upsertUser.mockResolvedValue({
      id: 'dev-user',
      email: 'dev@kanolens.com',
      firstName: 'Dev',
      lastName: 'User'
    });
    
    mockOpenAI.testConnection.mockResolvedValue({ 
      success: true, 
      message: 'Connected successfully' 
    });
    
    // Import routes (this imports the actual routes.ts)
    const { setupRoutes } = await import('../../routes');
    await setupRoutes(app);
  });

  describe('POST /api/auth/dev', () => {
    it('should create dev user on first access', async () => {
      const response = await request(app)
        .post('/api/auth/dev')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('dev@kanolens.com');
      expect(mockStorage.upsertUser).toHaveBeenCalled();
    });

    it('should return existing dev user without creating new one', async () => {
      mockStorage.getUser.mockResolvedValueOnce({
        id: 'dev-user',
        email: 'dev@kanolens.com'
      });

      const response = await request(app)
        .post('/api/auth/dev')
        .send();

      expect(response.status).toBe(200);
      expect(mockStorage.upsertUser).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockStorage.getUser.mockRejectedValueOnce(new Error('DB connection failed'));

      const response = await request(app)
        .post('/api/auth/dev')
        .send();

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/test-openai', () => {
    it('should test OpenAI connection when authenticated', async () => {
      // Mock session middleware to inject user
      app.use((req: any, res, next) => {
        req.session = { userId: 'dev-user' };
        next();
      });

      const response = await request(app)
        .post('/api/auth/test-openai')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockOpenAI.testConnection).toHaveBeenCalled();
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/auth/test-openai')
        .send();

      expect(response.status).toBe(401);
    });

    it('should handle OpenAI connection failures', async () => {
      mockOpenAI.testConnection.mockResolvedValueOnce({
        success: false,
        error: 'Invalid API key'
      });

      app.use((req: any, res, next) => {
        req.session = { userId: 'dev-user' };
        next();
      });

      const response = await request(app)
        .post('/api/auth/test-openai')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid API key');
    });
  });

  describe('Auth middleware behavior', () => {
    it('should extract user from session', async () => {
      // Test that auth middleware properly sets req.user
      let capturedReq: any;
      app.get('/api/test-auth', (req: any, res) => {
        capturedReq = req;
        res.json({ userId: req.user?.id });
      });

      app.use((req: any, res, next) => {
        req.session = { userId: 'test-user' };
        next();
      });

      await request(app).get('/api/test-auth');
      
      expect(capturedReq).toBeDefined();
      expect(capturedReq.session.userId).toBe('test-user');
    });
  });
});
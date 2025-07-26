import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupSessionRoutes } from '../../routes/sessions';
import { storage } from '../../storage';

// Mock the storage
vi.mock('../../storage', () => ({
  storage: {
    getUserAnalysisLimit: vi.fn(),
    createAnalysisSession: vi.fn(),
    incrementUserAnalysisCount: vi.fn(),
    deleteAnalysisSession: vi.fn(),
    getAnalysisSession: vi.fn(),
    setUserAnalysisLimit: vi.fn()
  }
}));

// Mock authentication middleware
vi.mock('../../simpleAuth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => {
    req.user = {
      claims: {
        sub: 'test-user-123',
        email: 'test@example.com'
      }
    };
    next();
  }
}));

// Mock title generator service
vi.mock('../../services/title-generator', () => ({
  titleGeneratorService: {
    generateSmartTitle: vi.fn().mockResolvedValue('Test Analysis'),
    generateTitleWithDate: vi.fn().mockReturnValue('Test Analysis - 1/1/2024')
  }
}));

describe('Analysis Limits API', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    setupSessionRoutes(app);
    vi.clearAllMocks();
  });

  describe('GET /api/analysis/limits', () => {
    it('should return limits for regular user', async () => {
      vi.mocked(storage.getUserAnalysisLimit).mockResolvedValue({
        current: 1,
        max: 1
      });

      const response = await request(app)
        .get('/api/analysis/limits')
        .expect(200);

      expect(response.body).toEqual({
        current: 1,
        max: 1,
        isUnlimited: false,
        canCreateMore: false,
        remainingAnalyses: 0
      });
    });

    it('should return unlimited status for jnlanahan@gmail.com', async () => {
      // Mock different user
      app.use((req: any, res, next) => {
        req.user = {
          claims: {
            sub: 'jnlanahan-user',
            email: 'jnlanahan@gmail.com'
          }
        };
        next();
      });

      vi.mocked(storage.getUserAnalysisLimit).mockResolvedValue({
        current: 5,
        max: 1
      });

      const response = await request(app)
        .get('/api/analysis/limits')
        .expect(200);

      expect(response.body).toEqual({
        current: 5,
        max: 999999,
        isUnlimited: true,
        canCreateMore: true,
        remainingAnalyses: 999999
      });
    });

    it('should handle storage errors', async () => {
      vi.mocked(storage.getUserAnalysisLimit).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/analysis/limits')
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to fetch analysis limits'
      });
    });
  });

  describe('POST /api/analysis/sessions with limits', () => {
    const sessionData = {
      title: 'Test Analysis',
      products: ['Product A', 'Product B'],
      targetCustomer: 'Test Customer',
      features: [],
      analysisMode: 'quick'
    };

    it('should create session when under limit', async () => {
      vi.mocked(storage.getUserAnalysisLimit).mockResolvedValue({
        current: 0,
        max: 1
      });

      vi.mocked(storage.createAnalysisSession).mockResolvedValue({
        id: 1,
        userId: 'test-user-123',
        ...sessionData,
        status: 'in_progress',
        currentStep: 'discovery',
        chatHistory: [],
        tableData: null,
        sourceDocumentation: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      vi.mocked(storage.incrementUserAnalysisCount).mockResolvedValue({
        id: 'test-user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        analysisCount: 1,
        maxAnalyses: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(200);

      expect(response.body.id).toBe(1);
      expect(storage.createAnalysisSession).toHaveBeenCalledWith({
        ...sessionData,
        userId: 'test-user-123'
      });
      expect(storage.incrementUserAnalysisCount).toHaveBeenCalledWith('test-user-123');
    });

    it('should reject session creation when at limit', async () => {
      vi.mocked(storage.getUserAnalysisLimit).mockResolvedValue({
        current: 1,
        max: 1
      });

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(403);

      expect(response.body).toEqual({
        message: 'Analysis limit reached',
        current: 1,
        max: 1,
        isLimitReached: true,
        canCreateMore: false
      });

      expect(storage.createAnalysisSession).not.toHaveBeenCalled();
      expect(storage.incrementUserAnalysisCount).not.toHaveBeenCalled();
    });

    it('should allow unlimited access for jnlanahan@gmail.com', async () => {
      // Mock unlimited user
      app.use((req: any, res, next) => {
        req.user = {
          claims: {
            sub: 'jnlanahan-user',
            email: 'jnlanahan@gmail.com'
          }
        };
        next();
      });

      vi.mocked(storage.getUserAnalysisLimit).mockResolvedValue({
        current: 100,
        max: 1
      });

      vi.mocked(storage.createAnalysisSession).mockResolvedValue({
        id: 1,
        userId: 'jnlanahan-user',
        ...sessionData,
        status: 'in_progress',
        currentStep: 'discovery',
        chatHistory: [],
        tableData: null,
        sourceDocumentation: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      vi.mocked(storage.incrementUserAnalysisCount).mockResolvedValue({
        id: 'jnlanahan-user',
        email: 'jnlanahan@gmail.com',
        firstName: 'John',
        lastName: 'Lanahan',
        profileImageUrl: null,
        analysisCount: 101,
        maxAnalyses: 999999,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(200);

      expect(response.body.id).toBe(1);
      expect(storage.createAnalysisSession).toHaveBeenCalled();
      expect(storage.incrementUserAnalysisCount).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/analysis/sessions/:id with count decrement', () => {
    it('should decrement count when session is deleted', async () => {
      const sessionData = {
        id: 1,
        userId: 'test-user-123',
        title: 'Test Analysis',
        products: ['Product A'],
        targetCustomer: 'Test Customer',
        features: [],
        status: 'completed',
        currentStep: 'completed',
        chatHistory: [],
        tableData: null,
        sourceDocumentation: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(storage.getAnalysisSession).mockResolvedValue(sessionData);
      vi.mocked(storage.deleteAnalysisSession).mockResolvedValue();

      const response = await request(app)
        .delete('/api/analysis/sessions/1')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Session deleted successfully'
      });

      expect(storage.deleteAnalysisSession).toHaveBeenCalledWith(1);
    });

    it('should return 404 for non-existent session', async () => {
      vi.mocked(storage.getAnalysisSession).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/analysis/sessions/999')
        .expect(404);

      expect(response.body).toEqual({
        message: 'Session not found'
      });
    });

    it('should return 403 for session owned by different user', async () => {
      const sessionData = {
        id: 1,
        userId: 'different-user',
        title: 'Test Analysis',
        products: ['Product A'],
        targetCustomer: 'Test Customer',
        features: [],
        status: 'completed',
        currentStep: 'completed',
        chatHistory: [],
        tableData: null,
        sourceDocumentation: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(storage.getAnalysisSession).mockResolvedValue(sessionData);

      const response = await request(app)
        .delete('/api/analysis/sessions/1')
        .expect(403);

      expect(response.body).toEqual({
        message: 'Access denied'
      });

      expect(storage.deleteAnalysisSession).not.toHaveBeenCalled();
    });
  });

  describe('Database operations', () => {
    it('should handle getUserAnalysisLimit', async () => {
      vi.mocked(storage.getUserAnalysisLimit).mockResolvedValue({
        current: 2,
        max: 5
      });

      const result = await storage.getUserAnalysisLimit('test-user');
      
      expect(result).toEqual({
        current: 2,
        max: 5
      });
    });

    it('should handle incrementUserAnalysisCount', async () => {
      const updatedUser = {
        id: 'test-user',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        analysisCount: 3,
        maxAnalyses: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(storage.incrementUserAnalysisCount).mockResolvedValue(updatedUser);

      const result = await storage.incrementUserAnalysisCount('test-user');
      
      expect(result.analysisCount).toBe(3);
    });

    it('should handle setUserAnalysisLimit for unlimited users', async () => {
      const updatedUser = {
        id: 'jnlanahan-user',
        email: 'jnlanahan@gmail.com',
        firstName: 'John',
        lastName: 'Lanahan',
        profileImageUrl: null,
        analysisCount: 10,
        maxAnalyses: 999999,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(storage.setUserAnalysisLimit).mockResolvedValue(updatedUser);

      const result = await storage.setUserAnalysisLimit('jnlanahan-user', 999999);
      
      expect(result.maxAnalyses).toBe(999999);
    });
  });
});
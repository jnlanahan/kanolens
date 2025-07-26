import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { jwtAuthMiddleware } from '../../middleware/jwt-auth';

// Mock the auth service
vi.mock('../../services/auth-service', () => ({
  verifyToken: vi.fn(),
  extractUserIdFromToken: vi.fn(),
}));

// Mock the storage module
vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
  }
}));

describe('JWT Authentication Middleware', () => {
  let app: express.Application;
  let mockAuthService: any;
  let mockStorage: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create test app
    app = express();
    app.use(express.json());
    
    // Add protected route using JWT middleware
    app.get('/api/protected', jwtAuthMiddleware, (req: any, res) => {
      res.json({ 
        message: 'Access granted',
        userId: req.user.id,
        email: req.user.email
      });
    });
    
    // Get mocked modules
    const authModule = await import('../../services/auth-service');
    const storageModule = await import('../../storage');
    
    mockAuthService = authModule;
    mockStorage = storageModule.storage;
  });

  describe('Valid Token Authentication', () => {
    it('should allow access with valid JWT token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      // Mock token verification
      mockAuthService.verifyToken.mockReturnValue({
        userId: 'user-123',
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      });
      
      // Mock user retrieval
      mockStorage.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt-token-123');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Access granted',
        userId: 'user-123',
        email: 'test@example.com'
      });
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-jwt-token-123');
      expect(mockStorage.getUser).toHaveBeenCalledWith('user-123');
    });

    it('should extract user ID from token payload', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'another@example.com',
        firstName: 'Another',
        lastName: 'User'
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: 'user-456',
        type: 'access',
        sub: 'user-456'
      });
      
      mockStorage.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer another-valid-token');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('user-456');
      expect(mockStorage.getUser).toHaveBeenCalledWith('user-456');
    });
  });

  describe('Invalid Token Scenarios', () => {
    it('should reject request without Authorization header', async () => {
      const response = await request(app)
        .get('/api/protected');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Access denied. No token provided.'
      });
      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'InvalidFormat token-here');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Access denied. Invalid token format.'
      });
      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    });

    it('should reject request with Bearer but no token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Access denied. Invalid token format.'
      });
      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', async () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Access denied. Token expired'
      });
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('expired-token');
    });

    it('should reject request with invalid token signature', async () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-signature-token');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Access denied. Invalid token'
      });
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('invalid-signature-token');
    });

    it('should reject request with malformed token', async () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Token verification failed');
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer malformed.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Access denied. Token verification failed'
      });
    });
  });

  describe('User Not Found Scenarios', () => {
    it('should reject when token is valid but user not found in database', async () => {
      mockAuthService.verifyToken.mockReturnValue({
        userId: 'non-existent-user',
        type: 'access'
      });
      
      mockStorage.getUser.mockResolvedValue(null); // User not found

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-token-but-user-deleted');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Access denied. User not found.'
      });
      expect(mockStorage.getUser).toHaveBeenCalledWith('non-existent-user');
    });

    it('should handle database errors during user lookup', async () => {
      mockAuthService.verifyToken.mockReturnValue({
        userId: 'user-123',
        type: 'access'
      });
      
      mockStorage.getUser.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        message: 'Internal server error during authentication.'
      });
    });
  });

  describe('Token Type Validation', () => {
    it('should reject refresh tokens on access endpoints', async () => {
      mockAuthService.verifyToken.mockReturnValue({
        userId: 'user-123',
        type: 'refresh' // Wrong type
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer refresh-token-not-access');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Access denied. Invalid token type.'
      });
      expect(mockStorage.getUser).not.toHaveBeenCalled();
    });

    it('should accept access tokens', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: 'user-123',
        type: 'access' // Correct type
      });
      
      mockStorage.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer access-token');

      expect(response.status).toBe(200);
      expect(mockStorage.getUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Request Object Enhancement', () => {
    it('should add user object to request', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        analysisCount: 5,
        maxAnalyses: 10
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: 'user-123',
        type: 'access'
      });
      
      mockStorage.getUser.mockResolvedValue(mockUser);

      // Add a route that inspects the request object
      app.get('/api/user-info', jwtAuthMiddleware, (req: any, res) => {
        res.json({
          hasUser: !!req.user,
          userKeys: Object.keys(req.user || {}),
          userId: req.user?.id,
          userEmail: req.user?.email
        });
      });

      const response = await request(app)
        .get('/api/user-info')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        hasUser: true,
        userKeys: expect.arrayContaining(['id', 'email', 'firstName', 'lastName']),
        userId: 'user-123',
        userEmail: 'test@example.com'
      });
    });
  });
});
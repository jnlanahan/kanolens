import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupAuthRoutes } from '../../routes/auth';

// Mock the storage module
vi.mock('../../storage', () => ({
  storage: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  }
}));

// Mock the auth service
vi.mock('../../services/auth-service', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  generateToken: vi.fn(),
  validateEmail: vi.fn(),
  validatePasswordStrength: vi.fn(),
}));

describe('New Authentication Routes', () => {
  let app: express.Application;
  let mockStorage: any;
  let mockAuthService: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create test app
    app = express();
    app.use(express.json());
    
    // Setup auth routes
    setupAuthRoutes(app);
    
    // Get mocked modules
    const storageModule = await import('../../storage');
    const authModule = await import('../../services/auth-service');
    
    mockStorage = storageModule.storage;
    mockAuthService = authModule;
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    it('should register a new user with valid data', async () => {
      // Setup mocks
      mockAuthService.validateEmail.mockReturnValue(true);
      mockAuthService.validatePasswordStrength.mockReturnValue({ 
        isValid: true, 
        errors: [] 
      });
      mockStorage.getUserByEmail.mockResolvedValue(null); // User doesn't exist
      mockAuthService.hashPassword.mockResolvedValue('hashedPassword123');
      mockStorage.createUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date()
      });
      mockAuthService.generateToken.mockReturnValue('jwt-token-123');

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        },
        token: 'jwt-token-123'
      });
      expect(mockStorage.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashedPassword123',
        authProvider: 'email',
        emailVerified: false,
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should reject registration with invalid email', async () => {
      mockAuthService.validateEmail.mockReturnValue(false);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid email format'
      });
      expect(mockStorage.createUser).not.toHaveBeenCalled();
    });

    it('should reject registration with weak password', async () => {
      mockAuthService.validateEmail.mockReturnValue(true);
      mockAuthService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters long', 'Password must contain at least one uppercase letter']
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          password: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Password does not meet requirements',
        errors: ['Password must be at least 8 characters long', 'Password must contain at least one uppercase letter']
      });
      expect(mockStorage.createUser).not.toHaveBeenCalled();
    });

    it('should reject registration with duplicate email', async () => {
      mockAuthService.validateEmail.mockReturnValue(true);
      mockAuthService.validatePasswordStrength.mockReturnValue({ 
        isValid: true, 
        errors: [] 
      });
      mockStorage.getUserByEmail.mockResolvedValue({ 
        id: 'existing-user',
        email: 'test@example.com' 
      }); // User already exists

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        message: 'Email already registered'
      });
      expect(mockStorage.createUser).not.toHaveBeenCalled();
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing password, firstName, lastName
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Missing required fields'
      });
    });

    it('should handle database errors gracefully', async () => {
      mockAuthService.validateEmail.mockReturnValue(true);
      mockAuthService.validatePasswordStrength.mockReturnValue({ 
        isValid: true, 
        errors: [] 
      });
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockAuthService.hashPassword.mockResolvedValue('hashedPassword123');
      mockStorage.createUser.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        message: 'Failed to create user account'
      });
    });
  });

  describe('POST /api/auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      mockAuthService.validateEmail.mockReturnValue(true);
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(true);
      mockAuthService.generateToken.mockReturnValue('jwt-token-123');

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        },
        token: 'jwt-token-123'
      });
      expect(mockStorage.updateUser).toHaveBeenCalledWith('user-123', {
        lastLogin: expect.any(Date)
      });
    });

    it('should reject login with invalid email format', async () => {
      mockAuthService.validateEmail.mockReturnValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid email format'
      });
    });

    it('should reject login with non-existent email', async () => {
      mockAuthService.validateEmail.mockReturnValue(true);
      mockStorage.getUserByEmail.mockResolvedValue(null); // User not found

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Invalid email or password'
      });
    });

    it('should reject login with invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword123'
      };

      mockAuthService.validateEmail.mockReturnValue(true);
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(false); // Wrong password

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Invalid email or password'
      });
    });

    it('should return JWT token on successful login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      mockAuthService.validateEmail.mockReturnValue(true);
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(true);
      mockAuthService.generateToken.mockReturnValue('jwt-token-456');

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('jwt-token-456');
      expect(mockAuthService.generateToken).toHaveBeenCalledWith('user-123');
    });

    it('should handle missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Email and password are required'
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Logged out successfully'
      });
    });
  });
});
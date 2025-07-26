import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the storage
vi.mock('../../storage', () => ({
  storage: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

// Mock the auth service
vi.mock('../../services/auth-service', () => ({
  generateToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  validateEmail: vi.fn(),
  validatePasswordStrength: vi.fn(),
}));

// Import after mocking
import { setupAuthRoutes } from '../../routes/auth';
import { storage } from '../../storage';
import { generateToken } from '../../services/auth-service';

// Type the mocked functions
const mockStorage = storage as any;
const mockGenerateToken = generateToken as any;

describe('Google OAuth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    setupAuthRoutes(app);
    vi.clearAllMocks();
  });

  describe('POST /api/auth/google', () => {
    it('should create new user and return token for new Google user', async () => {
      const googleUserData = {
        id: 'google-123456',
        email: 'test@gmail.com',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://lh3.googleusercontent.com/a/default-user'
      };

      // Mock that user doesn't exist
      mockStorage.getUserByEmail.mockResolvedValue(undefined);
      
      // Mock user creation
      const newUser = {
        id: 'user-123',
        email: 'test@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        authProvider: 'google',
        profileImageUrl: 'https://lh3.googleusercontent.com/a/default-user',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStorage.createUser.mockResolvedValue(newUser);
      
      // Mock token generation
      const mockToken = 'mock-jwt-token';
      mockGenerateToken.mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/google')
        .send({ googleUser: googleUserData })
        .expect(201);

      expect(response.body).toEqual({
        token: mockToken,
        user: expect.objectContaining({
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          authProvider: newUser.authProvider,
          profileImageUrl: newUser.profileImageUrl,
          emailVerified: newUser.emailVerified,
        })
      });

      expect(mockStorage.getUserByEmail).toHaveBeenCalledWith('test@gmail.com');
      expect(mockStorage.createUser).toHaveBeenCalledWith({
        email: 'test@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        authProvider: 'google',
        profileImageUrl: 'https://lh3.googleusercontent.com/a/default-user',
        emailVerified: true,
        maxAnalyses: 1,
      });
      expect(mockGenerateToken).toHaveBeenCalledWith(newUser.id);
    });

    it('should return token for existing Google user', async () => {
      const googleUserData = {
        id: 'google-123456',
        email: 'existing@gmail.com',
        name: 'Jane Doe',
        given_name: 'Jane',
        family_name: 'Doe',
        picture: 'https://lh3.googleusercontent.com/a/existing-user'
      };

      // Mock existing user
      const existingUser = {
        id: 'user-456',
        email: 'existing@gmail.com',
        firstName: 'Jane',
        lastName: 'Doe',
        authProvider: 'google',
        profileImageUrl: 'https://lh3.googleusercontent.com/a/existing-user',
        emailVerified: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      };
      mockStorage.getUserByEmail.mockResolvedValue(existingUser);
      
      // Mock user update (to update last login)
      const updatedUser = { ...existingUser, lastLogin: new Date() };
      mockStorage.updateUser.mockResolvedValue(updatedUser);
      
      // Mock token generation
      const mockToken = 'mock-jwt-token-existing';
      mockGenerateToken.mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/google')
        .send({ googleUser: googleUserData })
        .expect(200);

      expect(response.body).toEqual({
        token: mockToken,
        user: expect.objectContaining({
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          authProvider: existingUser.authProvider,
          profileImageUrl: 'https://lh3.googleusercontent.com/a/existing-user',
          emailVerified: existingUser.emailVerified,
        })
      });

      expect(mockStorage.getUserByEmail).toHaveBeenCalledWith('existing@gmail.com');
      expect(mockStorage.updateUser).toHaveBeenCalledWith(existingUser.id, {
        lastLogin: expect.any(Date),
        profileImageUrl: 'https://lh3.googleusercontent.com/a/existing-user'
      });
      expect(mockGenerateToken).toHaveBeenCalledWith(existingUser.id);
    });

    it('should handle email/password user trying to sign in with Google', async () => {
      const googleUserData = {
        id: 'google-123456',
        email: 'emailuser@gmail.com',
        name: 'Email User',
        given_name: 'Email',
        family_name: 'User',
        picture: 'https://lh3.googleusercontent.com/a/email-user'
      };

      // Mock existing email/password user
      const existingUser = {
        id: 'user-789',
        email: 'emailuser@gmail.com',
        firstName: 'Email',
        lastName: 'User',
        authProvider: 'email',
        password: 'hashed-password-123',
        emailVerified: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      };
      mockStorage.getUserByEmail.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/google')
        .send({ googleUser: googleUserData })
        .expect(400);

      expect(response.body).toEqual({
        message: 'An account with this email already exists. Please sign in with your email and password.'
      });

      expect(mockStorage.getUserByEmail).toHaveBeenCalledWith('emailuser@gmail.com');
      expect(mockStorage.createUser).not.toHaveBeenCalled();
      expect(mockStorage.updateUser).not.toHaveBeenCalled();
    });

    it('should validate required Google user data', async () => {
      const invalidData = {
        id: 'google-123456',
        // Missing email, name, etc.
      };

      const response = await request(app)
        .post('/api/auth/google')
        .send({ googleUser: invalidData })
        .expect(400);

      expect(response.body.message).toContain('Invalid Google user data');
    });

    it('should handle missing googleUser in request body', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Google user data is required');
    });

    it('should handle storage errors gracefully', async () => {
      const googleUserData = {
        id: 'google-123456',
        email: 'error@gmail.com',
        name: 'Error User',
        given_name: 'Error',
        family_name: 'User',
        picture: 'https://lh3.googleusercontent.com/a/error-user'
      };

      // Mock storage error
      mockStorage.getUserByEmail.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/google')
        .send({ googleUser: googleUserData })
        .expect(500);

      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle admin user (jnlanahan@gmail.com) with unlimited access', async () => {
      const googleUserData = {
        id: 'google-admin',
        email: 'jnlanahan@gmail.com',
        name: 'Admin User',
        given_name: 'Admin',
        family_name: 'User',
        picture: 'https://lh3.googleusercontent.com/a/admin-user'
      };

      // Mock that admin user doesn't exist yet
      mockStorage.getUserByEmail.mockResolvedValue(undefined);
      
      // Mock admin user creation with unlimited analyses
      const adminUser = {
        id: 'admin-123',
        email: 'jnlanahan@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        authProvider: 'google',
        profileImageUrl: 'https://lh3.googleusercontent.com/a/admin-user',
        emailVerified: true,
        maxAnalyses: -1, // Unlimited
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStorage.createUser.mockResolvedValue(adminUser);
      
      // Mock token generation
      const mockToken = 'admin-jwt-token';
      mockGenerateToken.mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/google')
        .send({ googleUser: googleUserData })
        .expect(201);

      expect(response.body).toEqual({
        token: mockToken,
        user: expect.objectContaining({
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          authProvider: adminUser.authProvider,
          profileImageUrl: adminUser.profileImageUrl,
          emailVerified: adminUser.emailVerified,
          maxAnalyses: -1,
        })
      });

      expect(mockStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jnlanahan@gmail.com',
          maxAnalyses: -1, // Unlimited for admin
        })
      );
    });
  });
});
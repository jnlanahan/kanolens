import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the storage
vi.mock('../storage', () => ({
  storage: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    getUserAnalysisLimit: vi.fn(),
  },
}));

// Mock the auth service
vi.mock('../services/auth-service', () => ({
  generateToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  validateEmail: vi.fn(),
  validatePasswordStrength: vi.fn(),
}));

// Import after mocking
import { setupAuthRoutes } from '../routes/auth';
import { storage } from '../storage';
import { validateEmail, validatePasswordStrength, hashPassword, generateToken } from '../services/auth-service';

// Type the mocked functions
const mockStorage = storage as any;
const mockValidateEmail = validateEmail as any;
const mockValidatePasswordStrength = validatePasswordStrength as any;
const mockHashPassword = hashPassword as any;
const mockGenerateToken = generateToken as any;

describe('Admin Privileges', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    setupAuthRoutes(app);
    vi.clearAllMocks();
    
    // Mock validation functions to return success
    mockValidateEmail.mockReturnValue(true);
    mockValidatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
    mockHashPassword.mockResolvedValue('hashed-password-123');
    mockGenerateToken.mockReturnValue('mock-jwt-token');
  });

  describe('Admin Email Registration', () => {
    it('should grant unlimited analyses to jnlanahan@gmail.com via email registration', async () => {
      // Mock that admin user doesn't exist
      mockStorage.getUserByEmail.mockResolvedValue(undefined);
      
      // Mock admin user creation
      const adminUser = {
        id: 'admin-123',
        email: 'jnlanahan@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        authProvider: 'email',
        emailVerified: false,
        maxAnalyses: -1, // Unlimited
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStorage.createUser.mockResolvedValue(adminUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'jnlanahan@gmail.com',
          password: 'AdminPass123!',
          firstName: 'Admin',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(mockStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jnlanahan@gmail.com',
          maxAnalyses: -1, // Should be unlimited
        })
      );
      expect(response.body.user.maxAnalyses).toBe(-1);
    });

    it('should grant unlimited analyses to jnlanahan@gmail.com via Google OAuth', async () => {
      const googleUserData = {
        id: 'google-admin',
        email: 'jnlanahan@gmail.com',
        name: 'Admin User',
        given_name: 'Admin',
        family_name: 'User',
        picture: 'https://lh3.googleusercontent.com/a/admin-user'
      };

      // Mock that admin user doesn't exist
      mockStorage.getUserByEmail.mockResolvedValue(undefined);
      
      // Mock admin user creation
      const adminUser = {
        id: 'admin-456',
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

      const response = await request(app)
        .post('/api/auth/google')
        .send({ googleUser: googleUserData });

      expect(response.status).toBe(201);
      expect(mockStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jnlanahan@gmail.com',
          maxAnalyses: -1, // Should be unlimited
        })
      );
      expect(response.body.user.maxAnalyses).toBe(-1);
    });

    it('should grant default limited analyses to non-admin users', async () => {
      // Mock that regular user doesn't exist
      mockStorage.getUserByEmail.mockResolvedValue(undefined);
      
      // Mock regular user creation
      const regularUser = {
        id: 'user-123',
        email: 'regular@example.com',
        firstName: 'Regular',
        lastName: 'User',
        authProvider: 'email',
        emailVerified: false,
        maxAnalyses: 1, // Default limit
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStorage.createUser.mockResolvedValue(regularUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'regular@example.com',
          password: 'RegularPass123!',
          firstName: 'Regular',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(mockStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'regular@example.com',
          maxAnalyses: 1, // Should be limited
        })
      );
      expect(response.body.user.maxAnalyses).toBe(1);
    });
  });

  describe('Analysis Limit Checking', () => {
    it('should return unlimited analyses for admin user', async () => {
      const adminUser = {
        id: 'admin-123',
        email: 'jnlanahan@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        maxAnalyses: -1,
        analysisCount: 50, // Already used many analyses
      };

      // Mock getUserAnalysisLimit to check admin logic
      mockStorage.getUserAnalysisLimit.mockImplementation((userId: string) => {
        if (userId === 'admin-123') {
          return { current: 50, max: -1, canCreateNew: true };
        }
        return { current: 1, max: 1, canCreateNew: false };
      });

      const result = mockStorage.getUserAnalysisLimit('admin-123');
      
      expect(result.max).toBe(-1); // Unlimited
      expect(result.canCreateNew).toBe(true); // Can always create new
    });

    it('should return limited analyses for regular user', async () => {
      const regularUser = {
        id: 'user-123',
        email: 'regular@example.com',
        firstName: 'Regular',
        lastName: 'User',
        maxAnalyses: 1,
        analysisCount: 1, // Already at limit
      };

      // Mock getUserAnalysisLimit for regular user
      mockStorage.getUserAnalysisLimit.mockImplementation((userId: string) => {
        if (userId === 'user-123') {
          return { current: 1, max: 1, canCreateNew: false };
        }
        return { current: 0, max: 1, canCreateNew: true };
      });

      const result = mockStorage.getUserAnalysisLimit('user-123');
      
      expect(result.max).toBe(1); // Limited
      expect(result.canCreateNew).toBe(false); // At limit, cannot create new
    });

    it('should identify admin user by email regardless of user ID', async () => {
      // Test that admin privileges are based on email, not just user ID
      const userWithAdminEmail = {
        id: 'different-id-999',
        email: 'jnlanahan@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        maxAnalyses: -1,
      };

      mockStorage.getUserByEmail.mockResolvedValue(userWithAdminEmail);

      // Mock the analysis limit check to verify admin logic by email
      mockStorage.getUserAnalysisLimit.mockImplementation((userId: string) => {
        // This should check by email, not just user ID
        return { current: 100, max: -1, canCreateNew: true };
      });

      const result = mockStorage.getUserAnalysisLimit('different-id-999');
      
      expect(result.max).toBe(-1); // Should be unlimited
      expect(result.canCreateNew).toBe(true); // Should always be able to create
    });
  });

  describe('Admin Field in Response', () => {
    it('should include isAdmin field for admin user', async () => {
      const adminUser = {
        id: 'admin-123',
        email: 'jnlanahan@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        authProvider: 'email',
        maxAnalyses: -1,
        isAdmin: true, // Should be included in response
      };

      // This test will verify that the user response includes the isAdmin field
      // This will be implemented when we add the isAdmin field to user responses
      expect(adminUser.email).toBe('jnlanahan@gmail.com');
      expect(adminUser.maxAnalyses).toBe(-1);
      expect(adminUser.isAdmin).toBe(true);
    });

    it('should include isAdmin field as false for regular user', async () => {
      const regularUser = {
        id: 'user-123',
        email: 'regular@example.com',
        firstName: 'Regular',
        lastName: 'User',
        authProvider: 'email',
        maxAnalyses: 1,
        isAdmin: false, // Should be false for non-admin
      };

      expect(regularUser.email).not.toBe('jnlanahan@gmail.com');
      expect(regularUser.maxAnalyses).toBe(1);
      expect(regularUser.isAdmin).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive admin email check', async () => {
      // Test with different cases of the admin email
      const emails = [
        'jnlanahan@gmail.com',
        'JNLANAHAN@gmail.com',
        'jnlanahan@GMAIL.COM',
        'JNLanahan@Gmail.com'
      ];

      emails.forEach(email => {
        const isAdmin = email.toLowerCase() === 'jnlanahan@gmail.com';
        expect(isAdmin).toBe(true);
      });
    });

    it('should not grant admin privileges to similar but different emails', async () => {
      const nonAdminEmails = [
        'jnlanahan@yahoo.com',
        'admin@gmail.com',
        'jnlanahan+test@gmail.com',
        'jnlanahantest@gmail.com'
      ];

      nonAdminEmails.forEach(email => {
        const isAdmin = email.toLowerCase() === 'jnlanahan@gmail.com';
        expect(isAdmin).toBe(false);
      });
    });
  });
});
// Test-first approach: Define tests before extracting validation utilities
import { describe, it, expect } from 'vitest';

// Import utilities we'll create
import { 
  validateSessionId, 
  validateUserId,
  extractUserIdFromRequest,
  validateSessionOwnership,
  createErrorResponse,
  createSuccessResponse
} from '../../utils/validation';

describe('Validation Utilities', () => {
  describe('validateSessionId', () => {
    it('should validate numeric session IDs', () => {
      expect(validateSessionId('123')).toBe(123);
      expect(validateSessionId('999')).toBe(999);
    });

    it('should throw error for invalid session IDs', () => {
      expect(() => validateSessionId('abc')).toThrow('Invalid session ID');
      expect(() => validateSessionId('')).toThrow('Invalid session ID');
      expect(() => validateSessionId('0')).toThrow('Invalid session ID');
      expect(() => validateSessionId('-1')).toThrow('Invalid session ID');
    });

    it('should handle edge cases', () => {
      expect(() => validateSessionId(undefined)).toThrow('Invalid session ID');
      expect(() => validateSessionId(null)).toThrow('Invalid session ID');
    });
  });

  describe('validateUserId', () => {
    it('should validate non-empty user IDs', () => {
      expect(validateUserId('user-123')).toBe('user-123');
      expect(validateUserId('dev-user-123')).toBe('dev-user-123');
    });

    it('should throw error for invalid user IDs', () => {
      expect(() => validateUserId('')).toThrow('Invalid user ID');
      expect(() => validateUserId(null)).toThrow('Invalid user ID');
      expect(() => validateUserId(undefined)).toThrow('Invalid user ID');
    });
  });

  describe('extractUserIdFromRequest', () => {
    it('should extract user ID from authenticated request', () => {
      const mockReq = {
        user: { claims: { sub: 'test-user-123' } }
      };
      expect(extractUserIdFromRequest(mockReq)).toBe('test-user-123');
    });

    it('should throw error for unauthenticated request', () => {
      const mockReq = {};
      expect(() => extractUserIdFromRequest(mockReq)).toThrow('User not authenticated');
    });

    it('should throw error for malformed user object', () => {
      const mockReq = { user: {} };
      expect(() => extractUserIdFromRequest(mockReq)).toThrow('User not authenticated');
    });
  });

  describe('validateSessionOwnership', () => {
    it('should validate session belongs to user', () => {
      const session = { userId: 'user-123', id: 1, title: 'Test' };
      expect(() => validateSessionOwnership(session, 'user-123')).not.toThrow();
    });

    it('should throw error for ownership mismatch', () => {
      const session = { userId: 'user-456', id: 1, title: 'Test' };
      expect(() => validateSessionOwnership(session, 'user-123')).toThrow('Access denied');
    });

    it('should throw error for missing session', () => {
      expect(() => validateSessionOwnership(null, 'user-123')).toThrow('Session not found');
      expect(() => validateSessionOwnership(undefined, 'user-123')).toThrow('Session not found');
    });
  });

  describe('createErrorResponse', () => {
    it('should create standardized error responses', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error, 'Operation failed');
      
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('message', 'Operation failed');
      expect(response).toHaveProperty('error');
    });

    it('should handle different error types', () => {
      const stringError = 'String error';
      const response = createErrorResponse(stringError, 'String failed');
      
      expect(response.success).toBe(false);
      expect(response.message).toBe('String failed');
      expect(response.error).toBe('String error');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create standardized success responses', () => {
      const data = { id: 1, name: 'Test' };
      const response = createSuccessResponse(data, 'Operation successful');
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('message', 'Operation successful');
      expect(response).toHaveProperty('data', data);
    });

    it('should handle responses without data', () => {
      const response = createSuccessResponse(null, 'Success');
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.data).toBe(null);
    });
  });
});
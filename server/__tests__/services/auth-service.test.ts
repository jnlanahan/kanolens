import { describe, it, expect, beforeEach } from 'vitest';
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  verifyToken,
  generateRefreshToken 
} from '../../services/auth-service';

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // Salt should make each hash unique
    });

    it('should verify a correct password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      const isValid = await verifyPassword(password, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty password gracefully', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });

    it('should handle null password gracefully', async () => {
      await expect(hashPassword(null as any)).rejects.toThrow();
    });

    it('should handle invalid hash in verification', async () => {
      const password = 'TestPassword123!';
      const isValid = await verifyPassword(password, 'invalid-hash');
      
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    const testUserId = 'test-user-123';
    
    it('should generate a valid JWT token', () => {
      const token = generateToken(testUserId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify a valid JWT token', () => {
      const token = generateToken(testUserId);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should include correct expiration time', () => {
      const token = generateToken(testUserId);
      const decoded = verifyToken(token);
      const now = Math.floor(Date.now() / 1000);
      
      // Token should expire in about 24 hours (86400 seconds)
      expect(decoded.exp - decoded.iat).toBe(86400);
      expect(decoded.exp).toBeGreaterThan(now);
    });

    it('should reject an invalid JWT token', () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it('should reject a malformed JWT token', () => {
      const malformedToken = 'not-a-jwt-token';
      
      expect(() => verifyToken(malformedToken)).toThrow();
    });

    it('should generate a refresh token', () => {
      const refreshToken = generateRefreshToken(testUserId);
      
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3);
    });

    it('should generate refresh token with longer expiry', () => {
      const accessToken = generateToken(testUserId);
      const refreshToken = generateRefreshToken(testUserId);
      
      const accessDecoded = verifyToken(accessToken);
      const refreshDecoded = verifyToken(refreshToken);
      
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });

    it('should handle empty userId gracefully', () => {
      expect(() => generateToken('')).toThrow();
    });

    it('should handle null userId gracefully', () => {
      expect(() => generateToken(null as any)).toThrow();
    });
  });
});
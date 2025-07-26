import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h'; // 24 hours
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

// Salt rounds for bcrypt
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim() === '') {
    throw new Error('Password cannot be empty');
  }
  
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    // If comparison fails (e.g., invalid hash), return false
    return false;
  }
}

/**
 * Generate a JWT access token
 */
export function generateToken(userId: string): string {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID cannot be empty');
  }
  
  if (typeof userId !== 'string') {
    throw new Error('User ID must be a string');
  }

  const payload = {
    userId,
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'kanolens',
    subject: userId
  });
}

/**
 * Generate a JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID cannot be empty');
  }
  
  if (typeof userId !== 'string') {
    throw new Error('User ID must be a string');
  }

  const payload = {
    userId,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'kanolens',
    subject: userId
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): any {
  if (!token || token.trim() === '') {
    throw new Error('Token cannot be empty');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Length requirement
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be no more than 128 characters long');
  }

  // Character requirements
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Common weak password patterns
  const commonPasswords = [
    'password', 'Password', 'PASSWORD', 'password123', 'Password123',
    '12345678', '123456789', 'qwerty', 'qwerty123', 'admin', 'admin123',
    'welcome', 'welcome123', 'letmein', 'monkey', 'dragon', 'master'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    errors.push('Password contains common weak patterns and is not secure');
  }

  // Check for repeated characters (more than 3 in a row)
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password cannot contain more than 3 consecutive identical characters');
  }

  // Check for sequential patterns
  const sequences = [
    '123456', '654321', 'abcdef', 'fedcba', 'qwerty', 'ytrewq',
    'asdfgh', 'hgfdsa', 'zxcvbn', 'nbvcxz'
  ];
  
  if (sequences.some(seq => password.toLowerCase().includes(seq))) {
    errors.push('Password cannot contain common sequential patterns');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract user ID from JWT token
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    const decoded = verifyToken(token);
    return decoded.userId || null;
  } catch (error) {
    return null;
  }
}
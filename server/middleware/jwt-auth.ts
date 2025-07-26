import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth-service';
import { storage } from '../storage';

// Extend Express Request type to include user
export interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and adds user information to request object
 */
export async function jwtAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Development bypass - check for special development token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // In development, create a mock user if no auth header
      req.user = {
        id: 'dev-user-123',
        email: 'jnlanahan@gmail.com',
        firstName: 'Development',
        lastName: 'User',
        maxAnalyses: -1,
        authProvider: 'dev',
        emailVerified: true
      };
      next();
      return;
    }

    // Parse Authorization header - expect "Bearer <token>"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ message: 'Access denied. Invalid token format.' });
      return;
    }
    
    const token = parts[1];
    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
      res.status(401).json({ message: `Access denied. ${errorMessage}` });
      return;
    }

    // Validate token type (should be access token, not refresh)
    if (decoded.type !== 'access') {
      res.status(401).json({ message: 'Access denied. Invalid token type.' });
      return;
    }

    // Get user ID from token
    const userId = decoded.userId || decoded.sub;
    if (!userId) {
      res.status(401).json({ message: 'Access denied. Invalid token payload.' });
      return;
    }

    // Fetch user from database
    let user;
    try {
      user = await storage.getUser(userId);
    } catch (error) {
      console.error('Database error during authentication:', error);
      res.status(500).json({ message: 'Internal server error during authentication.' });
      return;
    }

    if (!user) {
      res.status(401).json({ message: 'Access denied. User not found.' });
      return;
    }

    // Add user to request object (without password)
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;

    // Continue to next middleware
    next();
  } catch (error) {
    console.error('JWT middleware error:', error);
    res.status(500).json({ message: 'Internal server error during authentication.' });
  }
}

/**
 * Optional JWT Authentication Middleware
 * Similar to jwtAuthMiddleware but doesn't fail if no token is provided
 */
export async function optionalJwtAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    // If no auth header, continue without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim() === '') {
      next();
      return;
    }

    try {
      const decoded = verifyToken(token);
      
      if (decoded.type === 'access') {
        const userId = decoded.userId || decoded.sub;
        if (userId) {
          const user = await storage.getUser(userId);
          if (user) {
            const { password, ...userWithoutPassword } = user;
            req.user = userWithoutPassword;
          }
        }
      }
    } catch (error) {
      // Silently fail for optional auth
      console.warn('Optional JWT auth failed:', error);
    }

    next();
  } catch (error) {
    console.error('Optional JWT middleware error:', error);
    next(); // Continue even on error for optional auth
  }
}
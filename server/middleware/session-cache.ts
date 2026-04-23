import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

interface CachedRequest extends Request {
  analysisSession?: any;
  user?: any;
}

// Simple request-scoped cache for analysis sessions
export const sessionCacheMiddleware = async (
  req: CachedRequest,
  res: Response,
  next: NextFunction
) => {
  // Only apply to routes with session ID parameter
  if (!req.params.id) {
    return next();
  }

  try {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }

    // Check if session is already cached in this request
    if (!req.analysisSession) {
      // Fetch session from storage
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      // Verify user owns this session
      if (req.user && session.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Cache the session on the request object
      req.analysisSession = session;
    }

    next();
  } catch (error) {
    console.error('Session cache middleware error:', error);
    res.status(500).json({ message: 'Failed to load session' });
  }
};

// Batch validation middleware for multiple sessions
export const batchSessionValidation = async (
  sessionIds: number[],
  userId: string
) => {
  // This could be optimized with a single query to fetch multiple sessions
  const sessions = await Promise.all(
    sessionIds.map(id => storage.getAnalysisSession(id))
  );

  return sessions.filter(
    session => session && session.userId === userId
  );
};
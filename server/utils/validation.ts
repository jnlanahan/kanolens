// Validation utilities extracted from routes.ts
// Created with test-first approach to ensure reliability

/**
 * Validates and converts session ID from string to number
 * @param sessionIdStr - Session ID as string (from req.params)
 * @returns Validated session ID as number
 * @throws Error if session ID is invalid
 */
export function validateSessionId(sessionIdStr: any): number {
  if (sessionIdStr === null || sessionIdStr === undefined || sessionIdStr === '') {
    throw new Error('Invalid session ID');
  }
  
  const sessionId = parseInt(sessionIdStr);
  
  if (isNaN(sessionId) || sessionId <= 0) {
    throw new Error('Invalid session ID');
  }
  
  return sessionId;
}

/**
 * Validates user ID
 * @param userId - User ID to validate
 * @returns Validated user ID
 * @throws Error if user ID is invalid
 */
export function validateUserId(userId: any): string {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Invalid user ID');
  }
  
  return userId;
}

/**
 * Extracts user ID from authenticated request
 * @param req - Express request object with user claims
 * @returns User ID from request
 * @throws Error if user is not authenticated
 */
export function extractUserIdFromRequest(req: any): string {
  if (!req.user || !req.user.claims || !req.user.claims.sub) {
    throw new Error('User not authenticated');
  }
  
  return validateUserId(req.user.claims.sub);
}

/**
 * Validates that a session belongs to a specific user
 * @param session - Session object to check
 * @param userId - User ID to verify ownership
 * @throws Error if session doesn't belong to user or session is missing
 */
export function validateSessionOwnership(session: any, userId: string): void {
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.userId !== userId) {
    throw new Error('Access denied');
  }
}

/**
 * Creates standardized error response object
 * @param error - Error object or string
 * @param message - User-friendly error message
 * @returns Standardized error response
 */
export function createErrorResponse(error: any, message: string) {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : String(error)
  };
}

/**
 * Creates standardized success response object
 * @param data - Response data
 * @param message - Success message
 * @returns Standardized success response
 */
export function createSuccessResponse(data: any, message: string) {
  return {
    success: true,
    message,
    data
  };
}
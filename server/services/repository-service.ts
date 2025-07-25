// Repository Service abstraction to encapsulate data access patterns
// Created with test-first approach for reliability

export interface RepositoryConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

export interface UserRepository {
  getById(id: string): Promise<any>;
  upsert(user: any): Promise<any>;
}

export interface AnalysisSessionRepository {
  create(session: any): Promise<any>;
  getById(id: number): Promise<any>;
  getByUserId(userId: string): Promise<any[]>;
  update(id: number, updates: any): Promise<any>;
  delete(id: number): Promise<void>;
}

export interface ChatMessageRepository {
  add(message: any): Promise<any>;
  getBySessionId(sessionId: number): Promise<any[]>;
}

export interface RepositoryService {
  users: UserRepository;
  analysisSessions: AnalysisSessionRepository;
  chatMessages: ChatMessageRepository;
}

/**
 * Creates a Repository service instance with dependency injection
 * @param storage - Storage implementation (for dependency injection)
 * @param config - Repository configuration
 * @returns Configured Repository service
 */
export function createRepositoryService(
  storage: any, 
  config: RepositoryConfig
): RepositoryService {
  if (!storage) {
    throw new Error('Invalid storage implementation');
  }
  
  if (!config) {
    throw new Error('Invalid configuration');
  }

  // Simple in-memory cache for user lookups
  const cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Cache helper functions
   */
  function getCached(key: string): any | null {
    if (!config.enableCaching) return null;
    
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < config.cacheTimeout) {
      return cached.data;
    }
    
    // Remove expired cache entry
    if (cached) {
      cache.delete(key);
    }
    
    return null;
  }

  function setCache(key: string, data: any): void {
    if (config.enableCaching) {
      cache.set(key, { data, timestamp: Date.now() });
    }
  }

  /**
   * Retry helper for storage operations
   */
  async function withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        if (config.enableLogging) {
          console.log(`[Repository] ${operationName} attempt ${attempt}/${config.retryAttempts}`);
        }
        
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (config.enableLogging) {
          console.error(`[Repository] ${operationName} attempt ${attempt} failed:`, error);
        }
        
        if (attempt < config.retryAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Repository operation failed after ${config.retryAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Validation helpers
   */
  function validateUser(user: any): void {
    if (!user || !user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      throw new Error('Invalid user data: id is required');
    }
    if (!user.email || typeof user.email !== 'string' || !user.email.includes('@')) {
      throw new Error('Invalid user data: valid email is required');
    }
    if (!user.firstName || typeof user.firstName !== 'string' || user.firstName.trim() === '') {
      throw new Error('Invalid user data: firstName is required');
    }
    if (!user.lastName || typeof user.lastName !== 'string' || user.lastName.trim() === '') {
      throw new Error('Invalid user data: lastName is required');
    }
  }

  function validateSession(session: any): void {
    if (!session || !session.userId || typeof session.userId !== 'string' || session.userId.trim() === '') {
      throw new Error('Invalid session data: userId is required');
    }
    if (!session.products || !Array.isArray(session.products) || session.products.length === 0) {
      throw new Error('Invalid session data: products array is required');
    }
    if (!session.targetCustomer || typeof session.targetCustomer !== 'string' || session.targetCustomer.trim() === '') {
      throw new Error('Invalid session data: targetCustomer is required');
    }
  }

  function validateMessage(message: any): void {
    if (!message || typeof message.sessionId !== 'number' || message.sessionId <= 0) {
      throw new Error('Invalid message data: valid sessionId is required');
    }
    if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
      throw new Error('Invalid message data: role must be user, assistant, or system');
    }
    if (!message.content || typeof message.content !== 'string' || message.content.trim() === '') {
      throw new Error('Invalid message data: content is required');
    }
  }

  return {
    users: {
      async getById(id: string): Promise<any> {
        const cacheKey = `user:${id}`;
        const cached = getCached(cacheKey);
        if (cached) {
          return cached;
        }

        const result = await withRetry(
          () => storage.getUser(id),
          `getUser(${id})`
        );

        if (result) {
          setCache(cacheKey, result);
        }

        return result;
      },

      async upsert(user: any): Promise<any> {
        validateUser(user);

        const result = await withRetry(
          () => storage.upsertUser(user),
          `upsertUser(${user.id})`
        );

        // Invalidate cache for this user
        if (config.enableCaching) {
          cache.delete(`user:${user.id}`);
        }

        return result;
      }
    },

    analysisSessions: {
      async create(session: any): Promise<any> {
        validateSession(session);

        return await withRetry(
          () => storage.createAnalysisSession(session),
          `createAnalysisSession(${session.userId})`
        );
      },

      async getById(id: number): Promise<any> {
        return await withRetry(
          () => storage.getAnalysisSession(id),
          `getAnalysisSession(${id})`
        );
      },

      async getByUserId(userId: string): Promise<any[]> {
        return await withRetry(
          () => storage.getUserAnalysisSessions(userId),
          `getUserAnalysisSessions(${userId})`
        );
      },

      async update(id: number, updates: any): Promise<any> {
        return await withRetry(
          () => storage.updateAnalysisSession(id, updates),
          `updateAnalysisSession(${id})`
        );
      },

      async delete(id: number): Promise<void> {
        return await withRetry(
          () => storage.deleteAnalysisSession(id),
          `deleteAnalysisSession(${id})`
        );
      }
    },

    chatMessages: {
      async add(message: any): Promise<any> {
        validateMessage(message);

        return await withRetry(
          () => storage.addChatMessage(message),
          `addChatMessage(${message.sessionId})`
        );
      },

      async getBySessionId(sessionId: number): Promise<any[]> {
        return await withRetry(
          () => storage.getSessionChatMessages(sessionId),
          `getSessionChatMessages(${sessionId})`
        );
      }
    }
  };
}
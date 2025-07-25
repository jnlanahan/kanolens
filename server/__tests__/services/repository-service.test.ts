// Test-first approach: Define tests for Repository service abstraction
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import service we'll create
import { 
  RepositoryService, 
  createRepositoryService,
  RepositoryConfig,
  UserRepository,
  AnalysisSessionRepository,
  ChatMessageRepository
} from '../../services/repository-service';

describe('Repository Service', () => {
  let repositoryService: RepositoryService;
  let mockStorage: any;

  beforeEach(() => {
    // Mock storage interface
    mockStorage = {
      getUser: vi.fn(),
      upsertUser: vi.fn(),
      createAnalysisSession: vi.fn(),
      getAnalysisSession: vi.fn(),
      getUserAnalysisSessions: vi.fn(),
      updateAnalysisSession: vi.fn(),
      deleteAnalysisSession: vi.fn(),
      addChatMessage: vi.fn(),
      getSessionChatMessages: vi.fn()
    };

    const config: RepositoryConfig = {
      enableCaching: true,
      cacheTimeout: 5000,
      retryAttempts: 3,
      enableLogging: true
    };

    repositoryService = createRepositoryService(mockStorage, config);
  });

  describe('createRepositoryService', () => {
    it('should create repository service with valid configuration', () => {
      expect(repositoryService).toBeDefined();
      expect(repositoryService.users).toBeDefined();
      expect(repositoryService.analysisSessions).toBeDefined();
      expect(repositoryService.chatMessages).toBeDefined();
    });

    it('should throw error for invalid storage', () => {
      expect(() => createRepositoryService(null, {} as RepositoryConfig)).toThrow('Invalid storage implementation');
    });

    it('should throw error for invalid configuration', () => {
      expect(() => createRepositoryService(mockStorage, null as any)).toThrow('Invalid configuration');
    });
  });

  describe('UserRepository', () => {
    let userRepo: UserRepository;

    beforeEach(() => {
      userRepo = repositoryService.users;
    });

    it('should get user by ID', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      mockStorage.getUser.mockResolvedValue(mockUser);

      const result = await userRepo.getById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockStorage.getUser).toHaveBeenCalledWith('user-123');
    });

    it('should handle user not found', async () => {
      mockStorage.getUser.mockResolvedValue(undefined);

      const result = await userRepo.getById('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should create or update user', async () => {
      const userData = { id: 'user-123', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      const mockUser = { ...userData, createdAt: new Date(), updatedAt: new Date() };
      mockStorage.upsertUser.mockResolvedValue(mockUser);

      const result = await userRepo.upsert(userData);

      expect(result).toEqual(mockUser);
      expect(mockStorage.upsertUser).toHaveBeenCalledWith(userData);
    });

    it('should validate user data before upsert', async () => {
      const invalidUser = { id: '', email: 'invalid' };

      await expect(userRepo.upsert(invalidUser)).rejects.toThrow('Invalid user data');
      expect(mockStorage.upsertUser).not.toHaveBeenCalled();
    });

    it('should retry on storage failures', async () => {
      const userData = { id: 'user-123', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      mockStorage.upsertUser
        .mockRejectedValueOnce(new Error('Database error'))
        .mockRejectedValueOnce(new Error('Connection error'))
        .mockResolvedValueOnce({ ...userData, createdAt: new Date(), updatedAt: new Date() });

      const result = await userRepo.upsert(userData);

      expect(result).toBeDefined();
      expect(mockStorage.upsertUser).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const userData = { id: 'user-123', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      mockStorage.upsertUser.mockRejectedValue(new Error('Persistent error'));

      await expect(userRepo.upsert(userData)).rejects.toThrow('Repository operation failed after 3 attempts');
      expect(mockStorage.upsertUser).toHaveBeenCalledTimes(3);
    });
  });

  describe('AnalysisSessionRepository', () => {
    let sessionRepo: AnalysisSessionRepository;

    beforeEach(() => {
      sessionRepo = repositoryService.analysisSessions;
    });

    it('should create analysis session', async () => {
      const sessionData = {
        userId: 'user-123',
        title: 'Test Analysis',
        products: ['Product A', 'Product B'],
        targetCustomer: 'Test Customer'
      };
      const mockSession = { id: 1, ...sessionData, createdAt: new Date(), updatedAt: new Date() };
      mockStorage.createAnalysisSession.mockResolvedValue(mockSession);

      const result = await sessionRepo.create(sessionData);

      expect(result).toEqual(mockSession);
      expect(mockStorage.createAnalysisSession).toHaveBeenCalledWith(sessionData);
    });

    it('should get session by ID', async () => {
      const mockSession = { id: 1, userId: 'user-123', title: 'Test' };
      mockStorage.getAnalysisSession.mockResolvedValue(mockSession);

      const result = await sessionRepo.getById(1);

      expect(result).toEqual(mockSession);
      expect(mockStorage.getAnalysisSession).toHaveBeenCalledWith(1);
    });

    it('should get user sessions', async () => {
      const mockSessions = [
        { id: 1, userId: 'user-123', title: 'Session 1' },
        { id: 2, userId: 'user-123', title: 'Session 2' }
      ];
      mockStorage.getUserAnalysisSessions.mockResolvedValue(mockSessions);

      const result = await sessionRepo.getByUserId('user-123');

      expect(result).toEqual(mockSessions);
      expect(mockStorage.getUserAnalysisSessions).toHaveBeenCalledWith('user-123');
    });

    it('should update session', async () => {
      const updates = { title: 'Updated Title' };
      const mockSession = { id: 1, userId: 'user-123', title: 'Updated Title' };
      mockStorage.updateAnalysisSession.mockResolvedValue(mockSession);

      const result = await sessionRepo.update(1, updates);

      expect(result).toEqual(mockSession);
      expect(mockStorage.updateAnalysisSession).toHaveBeenCalledWith(1, updates);
    });

    it('should delete session', async () => {
      mockStorage.deleteAnalysisSession.mockResolvedValue(undefined);

      await sessionRepo.delete(1);

      expect(mockStorage.deleteAnalysisSession).toHaveBeenCalledWith(1);
    });

    it('should validate session data before creation', async () => {
      const invalidSession = { userId: '', products: [] };

      await expect(sessionRepo.create(invalidSession)).rejects.toThrow('Invalid session data');
      expect(mockStorage.createAnalysisSession).not.toHaveBeenCalled();
    });
  });

  describe('ChatMessageRepository', () => {
    let messageRepo: ChatMessageRepository;

    beforeEach(() => {
      messageRepo = repositoryService.chatMessages;
    });

    it('should add chat message', async () => {
      const messageData = {
        sessionId: 1,
        role: 'user' as const,
        content: 'Test message',
        metadata: null
      };
      const mockMessage = { id: 1, ...messageData, createdAt: new Date(), updatedAt: new Date() };
      mockStorage.addChatMessage.mockResolvedValue(mockMessage);

      const result = await messageRepo.add(messageData);

      expect(result).toEqual(mockMessage);
      expect(mockStorage.addChatMessage).toHaveBeenCalledWith(messageData);
    });

    it('should get session messages', async () => {
      const mockMessages = [
        { id: 1, sessionId: 1, role: 'user', content: 'Hello' },
        { id: 2, sessionId: 1, role: 'assistant', content: 'Hi there' }
      ];
      mockStorage.getSessionChatMessages.mockResolvedValue(mockMessages);

      const result = await messageRepo.getBySessionId(1);

      expect(result).toEqual(mockMessages);
      expect(mockStorage.getSessionChatMessages).toHaveBeenCalledWith(1);
    });

    it('should validate message data before adding', async () => {
      const invalidMessage = { sessionId: 0, role: 'invalid', content: '' };

      await expect(messageRepo.add(invalidMessage)).rejects.toThrow('Invalid message data');
      expect(mockStorage.addChatMessage).not.toHaveBeenCalled();
    });

    it('should validate message role', async () => {
      const invalidMessage = { sessionId: 1, role: 'admin' as any, content: 'test', metadata: null };

      await expect(messageRepo.add(invalidMessage)).rejects.toThrow('Invalid message data');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      mockStorage.getUser.mockRejectedValue(new Error('Database connection failed'));

      await expect(repositoryService.users.getById('user-123')).rejects.toThrow('Repository operation failed after 3 attempts');
    });

    it('should handle transaction rollback scenarios', async () => {
      mockStorage.createAnalysisSession.mockRejectedValue(new Error('Transaction rolled back'));

      const sessionData = {
        userId: 'user-123',
        title: 'Test',
        products: ['Product A'],
        targetCustomer: 'Customer'
      };

      await expect(repositoryService.analysisSessions.create(sessionData)).rejects.toThrow('Repository operation failed after 3 attempts');
    });
  });

  describe('caching behavior', () => {
    it('should cache user lookups when enabled', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      mockStorage.getUser.mockResolvedValue(mockUser);

      // First call
      await repositoryService.users.getById('user-123');
      // Second call (should use cache)
      await repositoryService.users.getById('user-123');

      // Storage should only be called once due to caching
      expect(mockStorage.getUser).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache after timeout', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      mockStorage.getUser.mockResolvedValue(mockUser);

      // Create service with short cache timeout for testing
      const shortCacheService = createRepositoryService(mockStorage, {
        enableCaching: true,
        cacheTimeout: 10, // 10ms
        retryAttempts: 3,
        enableLogging: false
      });

      await shortCacheService.users.getById('user-123');
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 20));
      
      await shortCacheService.users.getById('user-123');

      expect(mockStorage.getUser).toHaveBeenCalledTimes(2);
    });
  });
});
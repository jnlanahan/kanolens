// Debug test to understand storage mock issues
import { describe, it, expect, vi } from 'vitest';

describe('Storage Mock Debug', () => {
  it('should import storage module', async () => {
    const storageModule = await import('../storage');
    console.log('Storage module keys:', Object.keys(storageModule));
    console.log('Storage object:', storageModule.storage);
    expect(storageModule).toBeDefined();
    expect(storageModule.storage).toBeDefined();
  });

  it('should have mocked storage functions', async () => {
    const { storage } = await import('../storage');
    
    // Use real console.log to see what's happening
    console.error('Storage functions:');
    console.error('  getUser:', typeof storage.getUser, vi.isMockFunction(storage.getUser));
    console.error('  upsertUser:', typeof storage.upsertUser, vi.isMockFunction(storage.upsertUser));
    console.error('  createAnalysisSession:', typeof storage.createAnalysisSession, vi.isMockFunction(storage.createAnalysisSession));
    
    expect(storage.getUser).toBeDefined();
    expect(storage.upsertUser).toBeDefined();
    expect(storage.createAnalysisSession).toBeDefined();
    expect(vi.isMockFunction(storage.getUser)).toBe(true);
  });

  it('should call mocked storage functions', async () => {
    const { storage } = await import('../storage');
    
    // Test simple calls
    const user = await storage.getUser('test-123');
    console.log('getUser result:', user);
    
    // Check if functions are being called
    expect(storage.getUser).toHaveBeenCalledWith('test-123');
  });

  it('should create a user with mocked upsertUser', async () => {
    const { storage } = await import('../storage');
    
    const userData = {
      id: 'test-user',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    };
    
    try {
      console.error('About to call upsertUser with:', userData);
      const result = await storage.upsertUser(userData);
      console.error('upsertUser result:', result);
      console.error('Result type:', typeof result);
      console.error('Is result null/undefined?', result === null, result === undefined);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.id).toBe(userData.id);
        expect(result.email).toBe(userData.email);
      }
    } catch (error) {
      console.error('upsertUser error:', error);
      throw error;
    }
  });
});
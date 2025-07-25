// Test with direct mocking instead of setup.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simple test without complex setup.ts mocking
describe('Basic Mock Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should work with simple direct mocks', async () => {
    // Create a simple mock storage
    const mockStorage = {
      getUser: vi.fn().mockResolvedValue({ id: 'test', email: 'test@example.com' }),
      upsertUser: vi.fn().mockResolvedValue({ id: 'test', email: 'test@example.com', firstName: 'Test' }),
      createAnalysisSession: vi.fn().mockResolvedValue({ id: 1, title: 'Test Session' }),
      getUserAnalysisSessions: vi.fn().mockResolvedValue([]),
      updateAnalysisSession: vi.fn().mockResolvedValue({ id: 1, title: 'Updated' }),
      addChatMessage: vi.fn().mockResolvedValue({ id: 1, content: 'Test' }),
      getSessionChatMessages: vi.fn().mockResolvedValue([])
    };

    // Test that the mock works
    const userData = { id: 'test', email: 'test@example.com', firstName: 'Test' };
    const result = await mockStorage.upsertUser(userData);
    
    expect(result).toBeDefined();
    expect(result.id).toBe('test');
    expect(mockStorage.upsertUser).toHaveBeenCalledWith(userData);
  });

  it('should work with mockResolvedValue', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    const result = await mockFn();
    expect(result).toBe('success');
  });

  it('should work with mockImplementation', async () => {
    const mockFn = vi.fn().mockImplementation(async (input: string) => {
      return `processed: ${input}`;
    });
    
    const result = await mockFn('test');
    expect(result).toBe('processed: test');
  });
});
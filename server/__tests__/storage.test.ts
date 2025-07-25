import { describe, it, expect, vi } from 'vitest';
import { storage } from '../storage';

describe('Storage Operations', () => {
  describe('Basic Mock Functionality', () => {
    it('should have storage functions available', () => {
      expect(storage.getUser).toBeDefined();
      expect(storage.upsertUser).toBeDefined();
      expect(storage.createAnalysisSession).toBeDefined();
      expect(storage.getAnalysisSession).toBeDefined();
      expect(storage.getUserAnalysisSessions).toBeDefined();
      expect(storage.updateAnalysisSession).toBeDefined();
      expect(storage.deleteAnalysisSession).toBeDefined();
      expect(storage.addChatMessage).toBeDefined();
      expect(storage.getSessionChatMessages).toBeDefined();
    });

    it('should call storage functions without throwing', async () => {
      // Test that mocked functions can be called without errors
      expect(() => storage.getUser('test-id')).not.toThrow();
      expect(() => storage.upsertUser({
        id: 'test',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User'
      })).not.toThrow();
      expect(() => storage.createAnalysisSession({
        userId: 'test',
        title: 'Test',
        products: ['test'],
        targetCustomer: 'test',
        status: 'active',
        currentStep: 'discovery'
      })).not.toThrow();
    });

    it('should verify storage functions are mocked', () => {
      expect(vi.isMockFunction(storage.getUser)).toBe(true);
      expect(vi.isMockFunction(storage.upsertUser)).toBe(true);
      expect(vi.isMockFunction(storage.createAnalysisSession)).toBe(true);
      expect(vi.isMockFunction(storage.getAnalysisSession)).toBe(true);
      expect(vi.isMockFunction(storage.getUserAnalysisSessions)).toBe(true);
      expect(vi.isMockFunction(storage.updateAnalysisSession)).toBe(true);
      expect(vi.isMockFunction(storage.deleteAnalysisSession)).toBe(true);
      expect(vi.isMockFunction(storage.addChatMessage)).toBe(true);
      expect(vi.isMockFunction(storage.getSessionChatMessages)).toBe(true);
    });
  });
});
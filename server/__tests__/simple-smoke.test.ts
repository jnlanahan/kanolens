// Simple smoke tests to verify basic functionality
import { describe, it, expect, vi } from 'vitest';

describe('Basic Smoke Tests', () => {
  it('should run basic JavaScript functionality', () => {
    expect(1 + 1).toBe(2);
    expect('hello'.toUpperCase()).toBe('HELLO');
  });

  it('should support Vitest mocking', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should support async operations', async () => {
    const asyncFn = vi.fn().mockResolvedValue('success');
    const result = await asyncFn();
    expect(result).toBe('success');
  });

  it('should support environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should support module imports', async () => {
    // Test that we can import Node.js modules
    const path = await import('path');
    const result = path.join('a', 'b');
    // Platform-agnostic test - just check it contains both parts
    expect(result).toContain('a');
    expect(result).toContain('b');
  });
});

describe('Mock Setup Verification', () => {
  it('should have console mocked', () => {
    expect(console.log).toBeDefined();
    expect(vi.isMockFunction(console.log)).toBe(true);
  });

  it('should have NODE_ENV set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have test API keys set', () => {
    expect(process.env.OPENAI_API_KEY).toBe('test-openai-key');
    expect(process.env.ANTHROPIC_API_KEY).toBe('test-anthropic-key');
  });
});
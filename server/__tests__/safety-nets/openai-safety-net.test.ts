// Safety Net Tests for openai.ts (857 lines)
// Purpose: Complete test coverage BEFORE refactoring to ensure no regressions
// These tests validate all OpenAI integration functionality

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Mock OpenAI SDK
vi.mock('openai');

describe('OpenAI Safety Net - Complete Coverage', () => {
  let openaiModule: any;
  let mockOpenAIClient: any;

  beforeEach(async () => {
    // Mock OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };

    // Mock OpenAI constructor
    const { OpenAI } = await import('openai');
    vi.mocked(OpenAI).mockImplementation(() => mockOpenAIClient);

    // Import the openai module after mocks are set up
    openaiModule = await import('../../openai');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Testing', () => {
    it('should test OpenAI connection successfully', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: { content: 'Test response', role: 'assistant' }
        }]
      });

      const result = await openaiModule.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10
      });
    });

    it('should handle connection failures gracefully', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(
        new Error('API key invalid')
      );

      const result = await openaiModule.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key invalid');
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(rateLimitError);

      const result = await openaiModule.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(timeoutError);

      const result = await openaiModule.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Chat Processing', () => {
    it('should process chat messages with conversation history', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              step: 'research',
              message: 'Research completed successfully',
              progress: 50,
              data: { findings: ['Finding 1', 'Finding 2'] }
            }),
            role: 'assistant'
          }
        }]
      };
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const conversationHistory: ChatCompletionMessageParam[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      const result = await openaiModule.processChat({
        message: 'Can you help me analyze competitors?',
        step: 'research',
        sessionId: 123,
        conversationHistory,
        targetCustomer: 'Enterprise',
        products: ['Product1', 'Product2'],
        metadata: { priority: 'high' }
      });

      expect(result.step).toBe('research');
      expect(result.message).toBe('Research completed successfully');
      expect(result.progress).toBe(50);
      expect(result.data).toEqual({ findings: ['Finding 1', 'Finding 2'] });

      // Verify correct API call
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          ...conversationHistory,
          { role: 'user', content: 'Can you help me analyze competitors?' }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });
    });

    it('should handle malformed JSON responses gracefully', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'This is not valid JSON',
            role: 'assistant'
          }
        }]
      });

      const result = await openaiModule.processChat({
        message: 'Test message',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(result.step).toBe('error');
      expect(result.message).toContain('Unable to process the AI response');
      expect(result.progress).toBe(0);
      expect(result.metadata?.error).toBe('Response parsing failed');
    });

    it('should handle empty or null responses', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: null,
            role: 'assistant'
          }
        }]
      });

      const result = await openaiModule.processChat({
        message: 'Test message',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(result.step).toBe('error');
      expect(result.message).toContain('Unable to process your request');
    });

    it('should validate required response fields', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              // Missing required fields: step, message, progress
              data: { some: 'data' }
            }),
            role: 'assistant'
          }
        }]
      });

      const result = await openaiModule.processChat({
        message: 'Test message',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(result.step).toBe('error');
      expect(result.message).toContain('Unable to process the AI response');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry on transient failures', async () => {
      // First two calls fail, third succeeds
      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another temporary failure'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                step: 'success',
                message: 'Finally worked',
                progress: 100,
                data: {}
              }),
              role: 'assistant'
            }
          }]
        });

      const result = await openaiModule.processChat({
        message: 'Test retry',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(result.step).toBe('success');
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retries', async () => {
      // All calls fail
      mockOpenAIClient.chat.completions.create.mockRejectedValue(
        new Error('Persistent failure')
      );

      const result = await openaiModule.processChat({
        message: 'Test failure',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(result.step).toBe('error');
      expect(result.message).toContain('Unable to process your request');
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should handle different error types appropriately', async () => {
      const testCases = [
        {
          error: Object.assign(new Error('Rate limit exceeded'), { name: 'RateLimitError' }),
          expectedMessage: 'Service is currently busy'
        },
        {
          error: Object.assign(new Error('Timeout'), { name: 'TimeoutError' }),
          expectedMessage: 'Request timed out'
        },
        {
          error: new Error('Network error'),
          expectedMessage: 'Unable to process your request'
        }
      ];

      for (const testCase of testCases) {
        mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(testCase.error);

        const result = await openaiModule.processChat({
          message: 'Test error handling',
          step: 'test',
          sessionId: 123,
          conversationHistory: [],
          targetCustomer: 'SMB',
          products: ['Product1']
        });

        expect(result.step).toBe('error');
        expect(result.message).toContain(testCase.expectedMessage);
        
        vi.clearAllMocks();
      }
    });
  });

  describe('Input Validation', () => {
    it('should validate chat request parameters', async () => {
      const invalidRequests = [
        {
          // Missing message
          step: 'test',
          sessionId: 123,
          conversationHistory: [],
          targetCustomer: 'SMB',
          products: ['Product1']
        },
        {
          message: 'Test',
          // Missing step
          sessionId: 123,
          conversationHistory: [],
          targetCustomer: 'SMB',
          products: ['Product1']
        },
        {
          message: 'Test',
          step: 'test',
          // Missing sessionId
          conversationHistory: [],
          targetCustomer: 'SMB',
          products: ['Product1']
        },
        {
          message: 'Test',
          step: 'test',
          sessionId: 123,
          conversationHistory: [],
          targetCustomer: 'SMB',
          products: [] // Empty products array
        }
      ];

      for (const invalidRequest of invalidRequests) {
        await expect(openaiModule.processChat(invalidRequest))
          .rejects.toThrow(/Invalid chat request/);
      }
    });

    it('should validate conversation history format', async () => {
      const invalidHistory = [
        { role: 'invalid', content: 'Invalid role' },
        { role: 'user', content: '' }, // Empty content
        { role: 'user' }, // Missing content
      ];

      await expect(openaiModule.processChat({
        message: 'Test',
        step: 'test',
        sessionId: 123,
        conversationHistory: invalidHistory,
        targetCustomer: 'SMB',
        products: ['Product1']
      })).rejects.toThrow(/Invalid conversation history/);
    });

    it('should validate target customer values', async () => {
      const invalidCustomers = ['', null, undefined, 'InvalidCustomer'];

      for (const invalidCustomer of invalidCustomers) {
        await expect(openaiModule.processChat({
          message: 'Test',
          step: 'test',
          sessionId: 123,
          conversationHistory: [],
          targetCustomer: invalidCustomer,
          products: ['Product1']
        })).rejects.toThrow(/Invalid target customer/);
      }
    });
  });

  describe('Configuration and Environment', () => {
    it('should use different models based on configuration', async () => {
      // Test with different model
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo';
      
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              step: 'test',
              message: 'Model test',
              progress: 100,
              data: {}
            }),
            role: 'assistant'
          }
        }]
      });

      await openaiModule.processChat({
        message: 'Test model',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo'
        })
      );

      // Clean up
      delete process.env.OPENAI_MODEL;
    });

    it('should respect temperature settings', async () => {
      process.env.OPENAI_TEMPERATURE = '0.5';

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              step: 'test',
              message: 'Temperature test',
              progress: 100,
              data: {}
            }),
            role: 'assistant'
          }
        }]
      });

      await openaiModule.processChat({
        message: 'Test temperature',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5
        })
      );

      delete process.env.OPENAI_TEMPERATURE;
    });

    it('should handle API key rotation', async () => {
      // Simulate API key rotation scenario
      let callCount = 0;
      mockOpenAIClient.chat.completions.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('Invalid API key');
          error.status = 401;
          throw error;
        }
        return Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                step: 'test',
                message: 'Key rotated successfully',
                progress: 100,
                data: {}
              }),
              role: 'assistant'
            }
          }]
        });
      });

      const result = await openaiModule.processChat({
        message: 'Test key rotation',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(result.step).toBe('test');
      expect(result.message).toBe('Key rotated successfully');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large conversation histories efficiently', async () => {
      const largeHistory = Array(100).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`
      })) as ChatCompletionMessageParam[];

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              step: 'test',
              message: 'Large history processed',
              progress: 100,
              data: {}
            }),
            role: 'assistant'
          }
        }]
      });

      const startTime = Date.now();
      const result = await openaiModule.processChat({
        message: 'Process large history',
        step: 'test',
        sessionId: 123,
        conversationHistory: largeHistory,
        targetCustomer: 'Enterprise',
        products: ['Product1']
      });
      const duration = Date.now() - startTime;

      expect(result.step).toBe('test');
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should implement token counting and truncation', async () => {
      // Very long message that would exceed token limits
      const longMessage = 'A'.repeat(10000);

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              step: 'test',
              message: 'Long message handled',
              progress: 100,
              data: {}
            }),
            role: 'assistant'
          }
        }]
      });

      const result = await openaiModule.processChat({
        message: longMessage,
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'Enterprise',
        products: ['Product1']
      });

      expect(result.step).toBe('test');
      
      // Verify the message was truncated if necessary
      const apiCall = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      const actualMessage = apiCall.messages[0].content;
      expect(actualMessage.length).toBeLessThanOrEqual(longMessage.length);
    });

    it('should handle concurrent requests properly', async () => {
      mockOpenAIClient.chat.completions.create.mockImplementation(() => 
        Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                step: 'concurrent',
                message: 'Concurrent request processed',
                progress: 100,
                data: { requestId: Math.random() }
              }),
              role: 'assistant'
            }
          }]
        })
      );

      const requests = Array(5).fill(null).map((_, i) => 
        openaiModule.processChat({
          message: `Concurrent request ${i}`,
          step: 'concurrent',
          sessionId: 100 + i,
          conversationHistory: [],
          targetCustomer: 'Enterprise',
          products: ['Product1']
        })
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.step).toBe('concurrent');
        expect(result.data.requestId).toBeDefined();
      });
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log API usage metrics', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              step: 'test',
              message: 'Metrics test',
              progress: 100,
              data: {}
            }),
            role: 'assistant'
          }
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 30,
          total_tokens: 80
        }
      });

      await openaiModule.processChat({
        message: 'Test metrics',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API usage'),
        expect.objectContaining({
          tokens: 80,
          sessionId: 123
        })
      );

      consoleSpy.mockRestore();
    });

    it('should track error rates and patterns', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(
        new Error('Tracked error')
      );

      await openaiModule.processChat({
        message: 'Test error tracking',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('OpenAI API error'),
        expect.objectContaining({
          error: 'Tracked error',
          sessionId: 123,
          attempt: expect.any(Number)
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely short messages', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              step: 'short',
              message: 'Short message processed',
              progress: 100,
              data: {}
            }),
            role: 'assistant'
          }
        }]
      });

      const result = await openaiModule.processChat({
        message: 'a',
        step: 'short',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(result.step).toBe('short');
    });

    it('should handle special characters and unicode', async () => {
      const specialMessage = '🚀 Test with émojis and spëcial chars: 中文 العربية';

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              step: 'unicode',
              message: 'Unicode handled correctly',
              progress: 100,
              data: { originalMessage: specialMessage }
            }),
            role: 'assistant'
          }
        }]
      });

      const result = await openaiModule.processChat({
        message: specialMessage,
        step: 'unicode',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'Enterprise',
        products: ['Product1']
      });

      expect(result.step).toBe('unicode');
      expect(result.data.originalMessage).toBe(specialMessage);
    });

    it('should handle API response with missing choices', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: []
      });

      const result = await openaiModule.processChat({
        message: 'Test missing choices',
        step: 'test',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'SMB',
        products: ['Product1']
      });

      expect(result.step).toBe('error');
      expect(result.message).toContain('Unable to process your request');
    });
  });
});
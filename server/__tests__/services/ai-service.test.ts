// Test-first approach: Define tests for AI service abstraction
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import service we'll create
import { 
  AIService, 
  createAIService,
  ChatRequest,
  ChatResponse,
  AIServiceConfig 
} from '../../services/ai-service';

describe('AI Service', () => {
  let aiService: AIService;
  let mockOpenAI: any;

  beforeEach(() => {
    // Mock OpenAI client
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };

    // Create service with mocked OpenAI
    const config: AIServiceConfig = {
      defaultModel: 'gpt-4o',
      searchModel: 'gpt-4o',
      maxRetries: 3,
      timeout: 30000
    };

    aiService = createAIService(mockOpenAI, config);
  });

  describe('createAIService', () => {
    it('should create AI service with valid configuration', () => {
      expect(aiService).toBeDefined();
      expect(typeof aiService.processChatMessage).toBe('function');
      expect(typeof aiService.testConnection).toBe('function');
    });

    it('should throw error for invalid configuration', () => {
      expect(() => createAIService(null, {} as AIServiceConfig)).toThrow('Invalid OpenAI client');
      expect(() => createAIService(mockOpenAI, null as any)).toThrow('Invalid configuration');
    });
  });

  describe('testConnection', () => {
    it('should test OpenAI connection successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test response' } }]
      });

      const result = await aiService.testConnection();
      
      expect(result).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10
      });
    });

    it('should handle connection failure gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const result = await aiService.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('processChatMessage', () => {
    const mockRequest: ChatRequest = {
      message: 'Tell me about Notion',
      step: 'discovery',
      sessionId: 123,
      conversationHistory: [],
      targetCustomer: 'Product Managers',
      products: ['Notion', 'Obsidian']
    };

    it('should process chat message and return structured response', async () => {
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              step: 'discovery',
              message: 'I can help analyze Notion features.',
              progress: 25,
              data: { products: ['Notion'] }
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      const response = await aiService.processChatMessage(mockRequest);

      expect(response).toEqual({
        step: 'discovery',
        message: 'I can help analyze Notion features.',
        progress: 25,
        data: { products: ['Notion'] }
      });
    });

    it('should handle malformed AI response gracefully', async () => {
      const mockOpenAIResponse = {
        choices: [{ message: { content: 'Invalid JSON response' } }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      const response = await aiService.processChatMessage(mockRequest);

      expect(response.step).toBe('error');
      expect(response.message).toContain('Unable to process');
    });

    it('should retry on API failures', async () => {
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ step: 'success', message: 'Success', progress: 100 }) } }]
        });

      const response = await aiService.processChatMessage(mockRequest);

      expect(response.step).toBe('success');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Persistent error'));

      const response = await aiService.processChatMessage(mockRequest);

      expect(response.step).toBe('error');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('validateChatRequest', () => {
    it('should validate required fields', () => {
      const invalidRequest = { message: '' } as ChatRequest;
      
      expect(() => aiService.processChatMessage(invalidRequest))
        .rejects.toThrow('Invalid chat request');
    });

    it('should accept valid request', async () => {
      const validRequest: ChatRequest = {
        message: 'Valid message',
        step: 'discovery',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'Users',
        products: ['Product A']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ step: 'test', message: 'test', progress: 0 }) } }]
      });

      await expect(aiService.processChatMessage(validRequest)).resolves.toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockOpenAI.chat.completions.create.mockRejectedValue(timeoutError);

      const response = await aiService.processChatMessage({
        message: 'test',
        step: 'discovery',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'Users',
        products: ['Product']
      });

      expect(response.step).toBe('error');
      expect(response.message).toBe('Request timed out. Please try again.');
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockOpenAI.chat.completions.create.mockRejectedValue(rateLimitError);

      const response = await aiService.processChatMessage({
        message: 'test',
        step: 'discovery',
        sessionId: 123,
        conversationHistory: [],
        targetCustomer: 'Users',
        products: ['Product']
      });

      expect(response.step).toBe('error');
      expect(response.message).toBe('Service is currently busy. Please wait a moment and try again.');
    });
  });
});
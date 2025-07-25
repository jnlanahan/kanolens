// AI Service abstraction to encapsulate OpenAI interactions
// Created with test-first approach for reliability

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface ChatRequest {
  message: string;
  step: string;
  sessionId: number;
  conversationHistory: ChatCompletionMessageParam[];
  targetCustomer: string;
  products: string[];
  metadata?: any;
}

export interface ChatResponse {
  step: string;
  message: string;
  progress: number;
  data: any;
  nextAction?: string;
  metadata?: any;
}

export interface AIServiceConfig {
  defaultModel: string;
  searchModel: string;
  maxRetries: number;
  timeout: number;
}

export interface AIService {
  processChatMessage(request: ChatRequest): Promise<ChatResponse>;
  testConnection(): Promise<boolean>;
  conductCompetitiveResearch?(products: string[], userProduct?: string): Promise<any>;
  generateKanoTable?(features: any[], products: string[], userProduct?: string): Promise<any>;
}

/**
 * Creates an AI service instance with dependency injection
 * @param openaiClient - OpenAI client instance
 * @param config - Service configuration
 * @returns Configured AI service
 */
export function createAIService(openaiClient: any, config: AIServiceConfig): AIService {
  if (!openaiClient) {
    throw new Error('Invalid OpenAI client');
  }
  
  if (!config) {
    throw new Error('Invalid configuration');
  }

  /**
   * Validates chat request parameters
   */
  function validateChatRequest(request: ChatRequest): void {
    if (!request.message || typeof request.message !== 'string' || request.message.trim() === '') {
      throw new Error('Invalid chat request: message is required');
    }
    
    if (!request.step || typeof request.step !== 'string') {
      throw new Error('Invalid chat request: step is required');
    }
    
    if (typeof request.sessionId !== 'number' || request.sessionId <= 0) {
      throw new Error('Invalid chat request: valid sessionId is required');
    }
    
    if (!Array.isArray(request.conversationHistory)) {
      throw new Error('Invalid chat request: conversationHistory must be an array');
    }
    
    if (!request.targetCustomer || typeof request.targetCustomer !== 'string') {
      throw new Error('Invalid chat request: targetCustomer is required');
    }
    
    if (!Array.isArray(request.products) || request.products.length === 0) {
      throw new Error('Invalid chat request: products array is required');
    }
  }

  /**
   * Handles different types of errors with appropriate retry logic
   */
  function getRetryDelay(attempt: number, error: any): number {
    if (error.name === 'RateLimitError') {
      return Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff for rate limits
    }
    
    if (error.name === 'TimeoutError') {
      return 1000 * attempt; // Linear backoff for timeouts
    }
    
    return 500 * attempt; // Default backoff
  }

  /**
   * Creates error response for failed requests
   */
  function createErrorResponse(error: any, originalRequest: ChatRequest): ChatResponse {
    let message = 'Unable to process your request at this time.';
    
    if (error.name === 'TimeoutError') {
      message = 'Request timed out. Please try again.';
    } else if (error.name === 'RateLimitError') {
      message = 'Service is currently busy. Please wait a moment and try again.';
    } else if (error.message?.includes('rate limit')) {
      message = 'Rate limit exceeded. Please try again in a moment.';
    } else if (error.message?.includes('timeout')) {
      message = 'Request timed out. Please try again.';
    }

    return {
      step: 'error',
      message,
      progress: 0,
      data: null,
      metadata: {
        error: error.message,
        errorType: error.name || 'UnknownError',
        originalStep: originalRequest.step
      }
    };
  }

  /**
   * Attempts to parse AI response with fallback handling
   */
  function parseAIResponse(content: string, originalRequest: ChatRequest): ChatResponse {
    try {
      const parsed = JSON.parse(content);
      
      // Validate required fields
      if (!parsed.step || !parsed.message || typeof parsed.progress !== 'number') {
        throw new Error('Invalid response format');
      }
      
      return {
        step: parsed.step,
        message: parsed.message,
        progress: parsed.progress,
        data: parsed.data || null,
        nextAction: parsed.nextAction,
        metadata: parsed.metadata
      };
    } catch (parseError) {
      console.error('[AIService] Failed to parse AI response:', parseError);
      
      return {
        step: 'error',
        message: 'Unable to process the AI response. Please try again.',
        progress: 0,
        data: null,
        metadata: {
          error: 'Response parsing failed',
          rawContent: content.substring(0, 200) // Log first 200 chars for debugging
        }
      };
    }
  }

  return {
    async testConnection(): Promise<boolean> {
      try {
        await openaiClient.chat.completions.create({
          model: config.defaultModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        });
        return true;
      } catch (error) {
        console.error('[AIService] Connection test failed:', error);
        return false;
      }
    },

    async processChatMessage(request: ChatRequest): Promise<ChatResponse> {
      validateChatRequest(request);

      let lastError: any;
      
      for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
        try {
          console.log(`[AIService] Processing chat message (attempt ${attempt}/${config.maxRetries})`);
          
          const response = await openaiClient.chat.completions.create({
            model: config.defaultModel,
            messages: [
              ...request.conversationHistory,
              { role: 'user', content: request.message }
            ],
            max_tokens: 2000,
            temperature: 0.7
          });

          if (!response.choices?.[0]?.message?.content) {
            throw new Error('Empty response from AI service');
          }

          return parseAIResponse(response.choices[0].message.content, request);

        } catch (error) {
          console.error(`[AIService] Attempt ${attempt} failed:`, error);
          lastError = error;

          if (attempt < config.maxRetries) {
            const delay = getRetryDelay(attempt, error);
            console.log(`[AIService] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      console.error(`[AIService] All ${config.maxRetries} attempts failed`);
      return createErrorResponse(lastError, request);
    }
  };
}
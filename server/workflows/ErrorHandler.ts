// Error recovery and retry logic for analysis workflows
import { ProgressUpdate } from "./ProgressTracker";

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ErrorContext {
  sessionId?: number;
  step: string;
  attempt: number;
  error: Error;
  startTime: Date;
}

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error, context: ErrorContext) => boolean;
  recover: (error: Error, context: ErrorContext) => Promise<any>;
}

export class ErrorHandler {
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Rate limit',
      'Service unavailable',
      'Temporary failure',
      'Network error'
    ]
  };

  private recoveryStrategies: RecoveryStrategy[] = [
    {
      name: 'API Rate Limit Recovery',
      canRecover: (error) => this.isRateLimitError(error),
      recover: async (error, context) => {
        console.log(`[ErrorHandler] Rate limit detected for session ${context.sessionId}, waiting...`);
        const delay = Math.min(60000, context.attempt * 15000); // Up to 1 minute
        await this.delay(delay);
        return { retryAfterDelay: true };
      }
    },
    {
      name: 'Network Connectivity Recovery',
      canRecover: (error) => this.isNetworkError(error),
      recover: async (error, context) => {
        console.log(`[ErrorHandler] Network error detected for session ${context.sessionId}, checking connectivity...`);
        // Could add actual connectivity check here
        const delay = Math.min(10000, context.attempt * 2000);
        await this.delay(delay);
        return { retryWithBackoff: true };
      }
    },
    {
      name: 'Service Unavailable Recovery',
      canRecover: (error) => this.isServiceUnavailableError(error),
      recover: async (error, context) => {
        console.log(`[ErrorHandler] Service unavailable for session ${context.sessionId}, implementing circuit breaker...`);
        const delay = Math.min(30000, context.attempt * 5000);
        await this.delay(delay);
        return { retryWithCircuitBreaker: true };
      }
    }
  ];

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext>,
    config?: Partial<RetryConfig>,
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const operationContext: ErrorContext = {
      sessionId: context.sessionId,
      step: context.step || 'unknown',
      attempt: 0,
      error: new Error('Not started'),
      startTime: new Date()
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
      operationContext.attempt = attempt;

      try {
        if (attempt > 1) {
          console.log(`[ErrorHandler] Retry attempt ${attempt}/${finalConfig.maxRetries} for ${operationContext.step}`);
          
          if (onProgress) {
            onProgress({
              step: operationContext.step as any,
              message: `Retrying ${operationContext.step} (attempt ${attempt}/${finalConfig.maxRetries})...`,
              progress: Math.max(0, ((attempt - 1) / finalConfig.maxRetries) * 10) // Small progress for retries
            });
          }
        }

        const result = await operation();
        
        if (attempt > 1) {
          console.log(`[ErrorHandler] Operation succeeded on attempt ${attempt} for session ${operationContext.sessionId}`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        operationContext.error = lastError;

        console.error(`[ErrorHandler] Attempt ${attempt} failed for ${operationContext.step}:`, lastError.message);

        // Check if error is retryable
        if (!this.isRetryableError(lastError, finalConfig)) {
          console.error(`[ErrorHandler] Non-retryable error for session ${operationContext.sessionId}:`, lastError.message);
          throw lastError;
        }

        // Try recovery strategies
        const recovery = await this.attemptRecovery(lastError, operationContext);
        if (recovery && recovery.skipRetry) {
          throw lastError;
        }

        // If this was the last attempt, throw the error
        if (attempt >= finalConfig.maxRetries) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, finalConfig);
        console.log(`[ErrorHandler] Waiting ${delay}ms before retry for session ${operationContext.sessionId}`);
        await this.delay(delay);
      }
    }

    // All retries exhausted
    console.error(`[ErrorHandler] All retries exhausted for session ${operationContext.sessionId}. Last error:`, lastError?.message);
    throw new Error(`Operation failed after ${finalConfig.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  private async attemptRecovery(error: Error, context: ErrorContext): Promise<any> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error, context)) {
        console.log(`[ErrorHandler] Attempting recovery strategy: ${strategy.name}`);
        try {
          const recovery = await strategy.recover(error, context);
          console.log(`[ErrorHandler] Recovery strategy ${strategy.name} completed`);
          return recovery;
        } catch (recoveryError) {
          console.warn(`[ErrorHandler] Recovery strategy ${strategy.name} failed:`, recoveryError);
        }
      }
    }
    return null;
  }

  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    return config.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) ||
      errorName.includes(retryableError.toLowerCase())
    );
  }

  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           error.name === 'RateLimitError';
  }

  private isNetworkError(error: Error): boolean {
    const networkErrorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    return networkErrorCodes.some(code => 
      error.message.includes(code) || error.name.includes(code)
    );
  }

  private isServiceUnavailableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('service unavailable') ||
           message.includes('502') ||
           message.includes('503') ||
           message.includes('504');
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(config.maxDelay, exponentialDelay + jitter);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker functionality
  private circuitBreakerStates: Map<string, {
    failures: number;
    lastFailure: Date;
    state: 'closed' | 'open' | 'half-open';
  }> = new Map();

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitKey: string,
    failureThreshold: number = 5,
    timeoutMs: number = 60000
  ): Promise<T> {
    const state = this.circuitBreakerStates.get(circuitKey) || {
      failures: 0,
      lastFailure: new Date(),
      state: 'closed' as const
    };

    // Check circuit breaker state
    if (state.state === 'open') {
      const timeSinceLastFailure = Date.now() - state.lastFailure.getTime();
      if (timeSinceLastFailure < timeoutMs) {
        throw new Error(`Circuit breaker open for ${circuitKey}. Try again in ${timeoutMs - timeSinceLastFailure}ms`);
      } else {
        state.state = 'half-open';
        console.log(`[ErrorHandler] Circuit breaker for ${circuitKey} moving to half-open state`);
      }
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker
      state.failures = 0;
      state.state = 'closed';
      this.circuitBreakerStates.set(circuitKey, state);
      
      return result;
    } catch (error) {
      state.failures++;
      state.lastFailure = new Date();
      
      if (state.failures >= failureThreshold) {
        state.state = 'open';
        console.error(`[ErrorHandler] Circuit breaker opened for ${circuitKey} after ${state.failures} failures`);
      }
      
      this.circuitBreakerStates.set(circuitKey, state);
      throw error;
    }
  }

  // Error reporting and analytics
  reportError(error: Error, context: ErrorContext): void {
    const errorReport = {
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      step: context.step,
      attempt: context.attempt,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      duration: Date.now() - context.startTime.getTime()
    };

    console.error('[ErrorHandler] Error Report:', errorReport);
    
    // Could integrate with error tracking service here
    // e.g., Sentry, Rollbar, etc.
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();
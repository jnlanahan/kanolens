// Enhanced Rate Limiter with Parallel Processing Optimization

export interface RequestOptions {
  priority?: 'high' | 'normal' | 'low';
  retryAttempts?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface QueuedRequest {
  id: string;
  fn: () => Promise<any>;
  options: RequestOptions;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  createdAt: number;
  attempts: number;
}

export class EnhancedRateLimiter {
  private requests: number[] = [];
  private requestQueue: QueuedRequest[] = [];
  private processing = false;
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxConcurrent: number;
  private activeRequests = 0;
  private stats = {
    totalRequests: 0,
    successful: 0,
    failed: 0,
    retried: 0,
    avgResponseTime: 0
  };

  constructor(
    maxRequests = 10, 
    windowMs = 60000, 
    maxConcurrent = 3
  ) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxConcurrent = maxConcurrent;
  }

  async executeRequest<T>(
    requestFn: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fn: requestFn,
        options: {
          priority: 'normal',
          retryAttempts: 3,
          timeout: 30000,
          ...options
        },
        resolve,
        reject,
        createdAt: Date.now(),
        attempts: 0
      };

      this.enqueueRequest(request);
      this.processQueue();
    });
  }

  private enqueueRequest(request: QueuedRequest): void {
    // Insert based on priority
    const priorityValues = { high: 3, normal: 2, low: 1 };
    const requestPriority = priorityValues[request.options.priority || 'normal'];
    
    let insertIndex = this.requestQueue.length;
    for (let i = 0; i < this.requestQueue.length; i++) {
      const queuePriority = priorityValues[this.requestQueue[i].options.priority || 'normal'];
      if (requestPriority > queuePriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.requestQueue.splice(insertIndex, 0, request);
    console.log(`[EnhancedRateLimiter] Queued request ${request.id} with priority ${request.options.priority}`);
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      if (!this.canMakeRequest()) {
        const waitTime = this.getWaitTime();
        console.log(`[EnhancedRateLimiter] Rate limit reached. Waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
        continue;
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.activeRequests++;
        this.executeQueuedRequest(request);
      }
    }

    this.processing = false;
  }

  private async executeQueuedRequest(request: QueuedRequest): Promise<void> {
    const startTime = Date.now();
    request.attempts++;
    this.stats.totalRequests++;

    try {
      console.log(`[EnhancedRateLimiter] Executing request ${request.id} (attempt ${request.attempts})`);
      
      // Add request to tracking
      this.requests.push(startTime);
      
      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), request.options.timeout);
      });
      
      const result = await Promise.race([
        request.fn(),
        timeoutPromise
      ]);
      
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, true);
      
      console.log(`[EnhancedRateLimiter] Request ${request.id} completed in ${responseTime}ms`);
      request.resolve(result);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, false);
      
      console.error(`[EnhancedRateLimiter] Request ${request.id} failed (attempt ${request.attempts}):`, error);
      
      // Retry logic
      if (request.attempts < (request.options.retryAttempts || 3)) {
        const retryDelay = this.calculateRetryDelay(request.attempts);
        console.log(`[EnhancedRateLimiter] Retrying request ${request.id} in ${retryDelay}ms`);
        
        this.stats.retried++;
        await this.sleep(retryDelay);
        
        // Re-queue with lower priority to avoid blocking new requests
        request.options.priority = 'low';
        this.enqueueRequest(request);
      } else {
        console.error(`[EnhancedRateLimiter] Request ${request.id} exhausted retry attempts`);
        request.reject(error);
      }
    } finally {
      this.activeRequests--;
      
      // Continue processing queue
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  private getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = this.requests[0];
    return (oldestRequest + this.windowMs) - Date.now() + 1000; // Add 1s buffer
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    const jitter = Math.random() * 1000;
    return baseDelay + jitter;
  }

  private updateStats(responseTime: number, success: boolean): void {
    if (success) {
      this.stats.successful++;
    } else {
      this.stats.failed++;
    }
    
    // Update average response time
    const totalCompleted = this.stats.successful + this.stats.failed;
    this.stats.avgResponseTime = ((this.stats.avgResponseTime * (totalCompleted - 1)) + responseTime) / totalCompleted;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public method to get current stats
  getStats() {
    return {
      ...this.stats,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      rateWindowUsage: this.requests.length,
      rateWindowLimit: this.maxRequests
    };
  }

  // Method to execute batch of requests with automatic batching
  async executeBatch<T>(
    requests: Array<() => Promise<T>>,
    options: RequestOptions & { batchSize?: number } = {}
  ): Promise<T[]> {
    const batchSize = options.batchSize || this.maxConcurrent;
    const results: T[] = [];
    
    console.log(`[EnhancedRateLimiter] Executing batch of ${requests.length} requests in batches of ${batchSize}`);
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map((requestFn, index) => 
        this.executeRequest(requestFn, {
          ...options,
          metadata: { ...options.metadata, batchIndex: Math.floor(i / batchSize), requestIndex: i + index }
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to be API-friendly
      if (i + batchSize < requests.length) {
        const delayBetweenBatches = Math.max(1000, this.windowMs / this.maxRequests);
        console.log(`[EnhancedRateLimiter] Waiting ${delayBetweenBatches}ms between batches`);
        await this.sleep(delayBetweenBatches);
      }
    }
    
    return results;
  }
}

// Create singleton instance
export const enhancedRateLimiter = new EnhancedRateLimiter();
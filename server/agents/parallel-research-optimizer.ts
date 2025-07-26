// Parallel Research Optimizer for Enhanced Agent Flow Performance

import { enhancedRateLimiter, RequestOptions } from './enhanced-rate-limiter';

export interface ParallelResearchOptions {
  maxConcurrentRequests?: number;
  batchSize?: number;
  prioritizeProducts?: string[]; // Products to research first
  timeoutMs?: number;
  retryAttempts?: number;
}

export interface ResearchBatch {
  products: string[];
  batchId: string;
  priority: 'high' | 'normal' | 'low';
  startTime: number;
  estimatedDuration: number;
}

export interface ResearchProgress {
  batchId: string;
  completed: number;
  total: number;
  currentProducts: string[];
  estimatedTimeRemaining: number;
  throughput: number; // requests per minute
}

export class ParallelResearchOptimizer {
  private readonly options: Required<ParallelResearchOptions>;
  private activeBatches = new Map<string, ResearchBatch>();
  private completedProducts = new Set<string>();
  
  constructor(options: ParallelResearchOptions = {}) {
    this.options = {
      maxConcurrentRequests: 3,
      batchSize: 5,
      prioritizeProducts: [],
      timeoutMs: 30000,
      retryAttempts: 3,
      ...options
    };
  }

  /**
   * Optimize research request ordering based on priority and batching strategy
   */
  async optimizeResearchFlow<T>(
    products: string[],
    researchFunction: (product: string) => Promise<T>,
    progressCallback?: (progress: ResearchProgress) => void
  ): Promise<T[]> {
    console.log(`[ParallelOptimizer] Optimizing research flow for ${products.length} products`);
    
    const startTime = Date.now();
    const batches = this.createOptimalBatches(products);
    const allResults: T[] = [];
    
    for (const batch of batches) {
      console.log(`[ParallelOptimizer] Processing batch ${batch.batchId} with ${batch.products.length} products`);
      
      const batchStartTime = Date.now();
      this.activeBatches.set(batch.batchId, { ...batch, startTime: batchStartTime });
      
      // Create research functions for this batch
      const batchFunctions = batch.products.map(product => 
        () => this.createResearchWrapper(product, researchFunction, batch.priority)
      );
      
      // Execute batch with enhanced rate limiting
      const batchResults = await enhancedRateLimiter.executeBatch(
        batchFunctions,
        {
          priority: batch.priority,
          retryAttempts: this.options.retryAttempts,
          timeout: this.options.timeoutMs,
          batchSize: this.options.batchSize,
          metadata: { batchId: batch.batchId }
        }
      );
      
      allResults.push(...batchResults);
      
      // Update progress
      batch.products.forEach(product => this.completedProducts.add(product));
      
      if (progressCallback) {
        const progress = this.calculateProgress(products, startTime);
        progressCallback(progress);
      }
      
      this.activeBatches.delete(batch.batchId);
      
      console.log(`[ParallelOptimizer] Batch ${batch.batchId} completed in ${Date.now() - batchStartTime}ms`);
    }
    
    const totalTime = Date.now() - startTime;
    const throughput = (products.length / totalTime) * 60000; // requests per minute
    
    console.log(`[ParallelOptimizer] Research flow completed: ${products.length} products in ${totalTime}ms (${throughput.toFixed(2)} products/min)`);
    
    return allResults;
  }

  /**
   * Create optimal batches based on product priority and API constraints
   */
  private createOptimalBatches(products: string[]): ResearchBatch[] {
    const batches: ResearchBatch[] = [];
    const { prioritizeProducts, batchSize } = this.options;
    
    // Separate prioritized and regular products
    const prioritizedProducts = products.filter(product => 
      prioritizeProducts.some(priority => 
        product.toLowerCase().includes(priority.toLowerCase())
      )
    );
    const regularProducts = products.filter(product => !prioritizedProducts.includes(product));
    
    // Create high priority batches
    if (prioritizedProducts.length > 0) {
      for (let i = 0; i < prioritizedProducts.length; i += batchSize) {
        const batchProducts = prioritizedProducts.slice(i, i + batchSize);
        batches.push({
          products: batchProducts,
          batchId: `high_${Math.floor(i / batchSize)}`,
          priority: 'high',
          startTime: 0,
          estimatedDuration: this.estimateBatchDuration(batchProducts.length, 'high')
        });
      }
    }
    
    // Create normal priority batches
    for (let i = 0; i < regularProducts.length; i += batchSize) {
      const batchProducts = regularProducts.slice(i, i + batchSize);
      batches.push({
        products: batchProducts,
        batchId: `normal_${Math.floor(i / batchSize)}`,
        priority: 'normal',
        startTime: 0,
        estimatedDuration: this.estimateBatchDuration(batchProducts.length, 'normal')
      });
    }
    
    console.log(`[ParallelOptimizer] Created ${batches.length} batches: ${prioritizedProducts.length} prioritized, ${regularProducts.length} regular products`);
    
    return batches;
  }

  /**
   * Wrapper function that adds monitoring and error handling to research functions
   */
  private async createResearchWrapper<T>(
    product: string,
    researchFunction: (product: string) => Promise<T>,
    priority: 'high' | 'normal' | 'low'
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      console.log(`[ParallelOptimizer] Starting research for ${product} (priority: ${priority})`);
      
      const result = await researchFunction(product);
      const duration = Date.now() - startTime;
      
      console.log(`[ParallelOptimizer] Completed research for ${product} in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[ParallelOptimizer] Research failed for ${product} after ${duration}ms:`, error);
      
      // For research failures, we'll throw but the enhanced rate limiter will handle retries
      throw new Error(`Research failed for ${product}: ${error.message}`);
    }
  }

  /**
   * Calculate current progress across all batches
   */
  private calculateProgress(allProducts: string[], startTime: number): ResearchProgress {
    const completed = this.completedProducts.size;
    const total = allProducts.length;
    const elapsed = Date.now() - startTime;
    const throughput = completed > 0 ? (completed / elapsed) * 60000 : 0;
    const remaining = total - completed;
    const estimatedTimeRemaining = throughput > 0 ? (remaining / throughput) * 60000 : 0;
    
    // Get currently processing products from active batches
    const currentProducts = Array.from(this.activeBatches.values())
      .flatMap(batch => batch.products)
      .filter(product => !this.completedProducts.has(product));
    
    return {
      batchId: Array.from(this.activeBatches.keys()).join(', ') || 'none',
      completed,
      total,
      currentProducts,
      estimatedTimeRemaining,
      throughput
    };
  }

  /**
   * Estimate duration for a batch based on historical data and product count
   */
  private estimateBatchDuration(productCount: number, priority: 'high' | 'normal' | 'low'): number {
    // Base time per product (in ms) - varies by priority due to timeout differences
    const baseTimePerProduct = {
      high: 15000,   // 15s per product for high priority
      normal: 20000, // 20s per product for normal
      low: 25000     // 25s per product for low priority
    };
    
    // Account for parallelization efficiency (diminishing returns)
    const parallelEfficiency = Math.min(1, this.options.maxConcurrentRequests / productCount);
    const adjustedTime = baseTimePerProduct[priority] * (1 - parallelEfficiency * 0.5);
    
    return productCount * adjustedTime;
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats() {
    const rateLimiterStats = enhancedRateLimiter.getStats();
    
    return {
      rateLimiter: rateLimiterStats,
      optimizer: {
        activeBatches: this.activeBatches.size,
        completedProducts: this.completedProducts.size,
        currentBatches: Array.from(this.activeBatches.values()).map(batch => ({
          batchId: batch.batchId,
          products: batch.products.length,
          priority: batch.priority,
          elapsed: Date.now() - batch.startTime
        }))
      }
    };
  }

  /**
   * Reset internal state for new research session
   */
  reset(): void {
    this.activeBatches.clear();
    this.completedProducts.clear();
    console.log('[ParallelOptimizer] State reset for new research session');
  }
}

// Export singleton instance
export const parallelResearchOptimizer = new ParallelResearchOptimizer();
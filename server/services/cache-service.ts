// Phase 5: Caching Service with Performance Validation
// In-memory caching layer with performance monitoring

interface CacheEntry<T = any> {
  value: T;
  expireAt: number;
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalEntries: number;
  memoryUsage: number;
}

interface CacheMetrics {
  hitRate: number;
  averageAccessTime: number;
  memoryEfficiency: number;
  evictionRate: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // Time to live in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableMetrics: boolean;
}

export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalEntries: 0,
    memoryUsage: 0
  };
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private accessTimes: number[] = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      cleanupInterval: config.cleanupInterval || 60 * 1000, // 1 minute
      enableMetrics: config.enableMetrics !== false
    };

    // Start cleanup timer
    this.startCleanup();
    
    console.log(`[Cache] Initialized with max size: ${this.config.maxSize}, default TTL: ${this.config.defaultTTL}ms`);
  }

  /**
   * Get value from cache
   */
  get<T = any>(key: string): T | undefined {
    const startTime = performance.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.recordAccessTime(performance.now() - startTime);
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.recordAccessTime(performance.now() - startTime);
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.recordAccessTime(performance.now() - startTime);

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T = any>(key: string, value: T, ttl?: number): void {
    const startTime = performance.now();
    const expireAt = Date.now() + (ttl || this.config.defaultTTL);
    
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      value,
      expireAt,
      accessCount: 0,
      lastAccessed: Date.now(),
      createdAt: Date.now()
    };

    this.cache.set(key, entry);
    this.stats.sets++;
    this.stats.totalEntries = this.cache.size;
    this.updateMemoryUsage();
    this.recordAccessTime(performance.now() - startTime);
  }

  /**
   * Get or set pattern - gets value if exists, otherwise sets and returns new value
   */
  async getOrSet<T = any>(
    key: string, 
    factory: () => Promise<T> | T, 
    ttl?: number
  ): Promise<T> {
    const existing = this.get<T>(key);
    if (existing !== undefined) {
      return existing;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.totalEntries = this.cache.size;
      this.updateMemoryUsage();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats.deletes += previousSize;
    this.stats.totalEntries = 0;
    this.updateMemoryUsage();
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      this.stats.evictions++;
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const averageAccessTime = this.accessTimes.length > 0 
      ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length 
      : 0;
    const memoryEfficiency = this.cache.size > 0 ? this.stats.hits / this.cache.size : 0;
    const evictionRate = this.stats.sets > 0 ? this.stats.evictions / this.stats.sets : 0;

    return {
      hitRate,
      averageAccessTime,
      memoryEfficiency,
      evictionRate
    };
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Get cache entry info for debugging
   */
  getEntryInfo(key: string): Partial<CacheEntry> | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    return {
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
      createdAt: entry.createdAt,
      expireAt: entry.expireAt
    };
  }

  /**
   * Warm up cache with multiple entries
   */
  async warmUp(entries: Array<{ key: string; factory: () => Promise<any> | any; ttl?: number }>): Promise<void> {
    console.log(`[Cache] Warming up cache with ${entries.length} entries...`);
    
    const promises = entries.map(async ({ key, factory, ttl }) => {
      try {
        const value = await factory();
        this.set(key, value, ttl);
      } catch (error) {
        console.error(`[Cache] Failed to warm up key "${key}":`, error);
      }
    });

    await Promise.all(promises);
    console.log(`[Cache] Warm up completed. Cache size: ${this.cache.size}`);
  }

  /**
   * Performance test for cache operations
   */
  async performanceTest(operations: number = 1000): Promise<{
    setTime: number;
    getTime: number;
    hitRate: number;
    memoryUsage: number;
  }> {
    console.log(`[Cache] Running performance test with ${operations} operations...`);
    
    const initialStats = this.getStats();
    const testKey = 'perf-test-';
    
    // Test SET performance
    const setStart = performance.now();
    for (let i = 0; i < operations; i++) {
      this.set(`${testKey}${i}`, `value-${i}`, 30000); // 30 second TTL
    }
    const setTime = performance.now() - setStart;

    // Test GET performance
    const getStart = performance.now();
    for (let i = 0; i < operations; i++) {
      this.get(`${testKey}${i}`);
    }
    const getTime = performance.now() - getStart;

    // Clean up test entries
    for (let i = 0; i < operations; i++) {
      this.delete(`${testKey}${i}`);
    }

    const finalStats = this.getStats();
    const newHits = finalStats.hits - initialStats.hits;
    const newRequests = (finalStats.hits + finalStats.misses) - (initialStats.hits + initialStats.misses);
    const hitRate = newRequests > 0 ? newHits / newRequests : 0;

    const result = {
      setTime,
      getTime,
      hitRate,
      memoryUsage: this.stats.memoryUsage
    };

    console.log(`[Cache] Performance test results:`, result);
    return result;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let evictedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expireAt) {
        this.cache.delete(key);
        evictedCount++;
        this.stats.evictions++;
      }
    }

    if (evictedCount > 0) {
      this.stats.totalEntries = this.cache.size;
      this.updateMemoryUsage();
      console.log(`[Cache] Cleaned up ${evictedCount} expired entries`);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | undefined;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.stats.totalEntries = this.cache.size;
      this.updateMemoryUsage();
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Record access time for performance metrics
   */
  private recordAccessTime(time: number): void {
    if (!this.config.enableMetrics) return;
    
    this.accessTimes.push(time);
    
    // Keep only recent access times (last 1000)
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-1000);
    }
  }

  /**
   * Update memory usage estimate
   */
  private updateMemoryUsage(): void {
    // Rough estimate of memory usage
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 chars
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 64; // Overhead for entry metadata
    }
    
    this.stats.memoryUsage = totalSize;
  }

  /**
   * Destroy cache service
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
    console.log('[Cache] Cache service destroyed');
  }
}

// Create default cache instance
export const defaultCache = new CacheService({
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
  enableMetrics: true
});

// Specialized cache instances for different use cases
export const sessionCache = new CacheService({
  maxSize: 500,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  enableMetrics: true
});

export const responseCache = new CacheService({
  maxSize: 200,
  defaultTTL: 2 * 60 * 1000, // 2 minutes
  cleanupInterval: 30 * 1000, // 30 seconds
  enableMetrics: true
});

export const analysisCache = new CacheService({
  maxSize: 100,
  defaultTTL: 60 * 60 * 1000, // 1 hour
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
  enableMetrics: true
});

console.log('[Cache] Cache services initialized');
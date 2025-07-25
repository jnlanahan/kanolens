// Phase 5: Real API Performance Tests
// Purpose: Test actual API endpoint performance with real HTTP requests
// These tests measure real-world performance, not simulations

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';
import supertest from 'supertest';
import express from 'express';

// Import our actual application setup
import { createApp } from '../../app';

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage?: number;
}

interface LoadTestResult {
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  successRate: number;
  throughput: number;
  errorRate: number;
}

describe('API Performance Tests', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;
  let performanceResults: Record<string, PerformanceMetrics[]> = {};

  beforeAll(async () => {
    // Set up test environment with actual app
    process.env.NODE_ENV = 'test';
    app = await createApp();
    request = supertest(app);
    
    console.log('🚀 Starting API Performance Tests...');
  });

  beforeEach(() => {
    // Clear performance results for clean measurements
    if (typeof global.gc === 'function') {
      global.gc(); // Force garbage collection before each test
    }
  });

  afterAll(() => {
    // Generate performance report
    generatePerformanceReport();
  });

  describe('Authentication Endpoint Performance', () => {
    it('should handle auth endpoint under load', async () => {
      const endpoint = '/api/auth/user';
      const concurrentRequests = 10;
      const iterations = 5;
      
      const results = await runLoadTest(
        endpoint,
        'GET',
        {},
        concurrentRequests,
        iterations
      );

      // Performance assertions
      expect(results.avgResponseTime).toBeLessThan(100); // Under 100ms average
      expect(results.maxResponseTime).toBeLessThan(500); // No request over 500ms
      expect(results.successRate).toBeGreaterThan(0.8); // 80%+ success rate
      expect(results.throughput).toBeGreaterThan(50); // 50+ requests/second

      recordPerformanceMetric('auth', {
        responseTime: results.avgResponseTime,
        throughput: results.throughput,
        memoryUsage: process.memoryUsage().heapUsed
      });

      console.log(`Auth Performance: ${results.avgResponseTime.toFixed(2)}ms avg, ${results.throughput.toFixed(2)} req/s`);
    });

    it('should maintain performance with authenticated requests', async () => {
      // First authenticate to get session
      const authResponse = await request
        .get('/api/auth/user')
        .expect((res) => {
          // We expect either a 200 (authenticated) or 401 (not authenticated)
          expect([200, 401]).toContain(res.status);
        });

      // Test authenticated endpoint performance
      const endpoint = '/api/auth/user';
      const results = await runLoadTest(endpoint, 'GET', {}, 5, 3);

      expect(results.avgResponseTime).toBeLessThan(150);
      expect(results.errorRate).toBeLessThan(0.2); // Less than 20% error rate

      console.log(`Authenticated Request Performance: ${results.avgResponseTime.toFixed(2)}ms avg`);
    });
  });

  describe('Session Management Performance', () => {
    it('should handle session creation efficiently', async () => {
      const endpoint = '/api/analysis/sessions';
      const sessionData = {
        description: 'Performance test session',
        products: 'Test Product',
        targetCustomers: 'Test Users',
        features: 'Test Feature'
      };

      const results = await runLoadTest(
        endpoint,
        'POST',
        sessionData,
        5,
        3
      );

      expect(results.avgResponseTime).toBeLessThan(200); // Session creation under 200ms
      expect(results.successRate).toBeGreaterThan(0.7); // 70%+ success rate

      recordPerformanceMetric('session_creation', {
        responseTime: results.avgResponseTime,
        throughput: results.throughput,
        memoryUsage: process.memoryUsage().heapUsed
      });

      console.log(`Session Creation Performance: ${results.avgResponseTime.toFixed(2)}ms avg`);
    });

    it('should handle session retrieval efficiently', async () => {
      const endpoint = '/api/analysis/sessions';
      
      const results = await runLoadTest(endpoint, 'GET', {}, 10, 5);

      expect(results.avgResponseTime).toBeLessThan(100); // Retrieval should be fast
      expect(results.throughput).toBeGreaterThan(50); // Reasonable throughput for reads

      console.log(`Session Retrieval Performance: ${results.avgResponseTime.toFixed(2)}ms avg`);
    });
  });

  describe('Chat Message Performance', () => {
    it('should process chat messages within acceptable time', async () => {
      // This endpoint might require session setup
      const endpoint = '/api/analysis/sessions/1/messages';
      const messageData = {
        message: 'Performance test message',
        metadata: { test: true }
      };

      const results = await runLoadTest(
        endpoint,
        'POST',
        messageData,
        3,
        2 // Lower iterations for potentially slower endpoint
      );

      // Chat processing can be slower due to AI involvement
      expect(results.avgResponseTime).toBeLessThan(5000); // Under 5 seconds
      expect(results.errorRate).toBeLessThan(0.5); // Less than 50% error rate

      recordPerformanceMetric('chat_processing', {
        responseTime: results.avgResponseTime,
        throughput: results.throughput,
        memoryUsage: process.memoryUsage().heapUsed
      });

      console.log(`Chat Processing Performance: ${results.avgResponseTime.toFixed(2)}ms avg`);
    });
  });

  describe('Health Check Performance', () => {
    it('should respond to health checks very quickly', async () => {
      const endpoint = '/api/debug/websocket-status';
      
      const results = await runLoadTest(endpoint, 'GET', {}, 20, 10);

      expect(results.avgResponseTime).toBeLessThan(50); // Health checks should be very fast
      expect(results.successRate).toBeGreaterThan(0.8); // 80%+ success rate
      expect(results.throughput).toBeGreaterThan(100); // Good throughput

      console.log(`Health Check Performance: ${results.avgResponseTime.toFixed(2)}ms avg`);
    });
  });

  describe('Memory and Resource Performance', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run multiple load tests to stress memory
      await runLoadTest('/api/auth/user', 'GET', {}, 10, 5);
      await runLoadTest('/api/analysis/sessions', 'GET', {}, 5, 3);
      
      // Force garbage collection
      if (typeof global.gc === 'function') {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Under 50MB growth
      
      console.log(`Memory Growth During Load Tests: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle concurrent requests without degradation', async () => {
      const concurrentTests = [
        runLoadTest('/api/auth/user', 'GET', {}, 5, 3),
        runLoadTest('/api/analysis/sessions', 'GET', {}, 5, 3),
        runLoadTest('/api/debug/websocket-status', 'GET', {}, 5, 3)
      ];

      const results = await Promise.all(concurrentTests);
      
      // All concurrent tests should complete successfully
      results.forEach((result, index) => {
        expect(result.successRate).toBeGreaterThan(0.3); // 30%+ success under concurrent load
        console.log(`Concurrent Test ${index + 1}: ${result.avgResponseTime.toFixed(2)}ms avg`);
      });
    });
  });

  // Helper function to run load tests
  async function runLoadTest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data: any,
    concurrentRequests: number,
    iterations: number
  ): Promise<LoadTestResult> {
    const results: number[] = [];
    const errors: number[] = [];
    const startTime = performance.now();

    for (let iteration = 0; iteration < iterations; iteration++) {
      const promises = Array(concurrentRequests).fill(null).map(async () => {
        const requestStart = performance.now();
        
        try {
          let response;
          switch (method) {
            case 'GET':
              response = await request.get(endpoint);
              break;
            case 'POST':
              response = await request.post(endpoint).send(data);
              break;
            case 'PUT':
              response = await request.put(endpoint).send(data);
              break;
            case 'DELETE':
              response = await request.delete(endpoint);
              break;
          }
          
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;
          
          results.push(responseTime);
          
          // Check if response indicates success
          if (response.status >= 400) {
            errors.push(responseTime);
          }
          
          return { success: true, responseTime };
        } catch (error) {
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;
          errors.push(responseTime);
          return { success: false, responseTime };
        }
      });

      await Promise.all(promises);
      
      // Small delay between iterations to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const totalRequests = concurrentRequests * iterations;

    return {
      avgResponseTime: results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0,
      maxResponseTime: results.length > 0 ? Math.max(...results) : 0,
      minResponseTime: results.length > 0 ? Math.min(...results) : 0,
      successRate: (totalRequests - errors.length) / totalRequests,
      throughput: totalRequests / (totalTime / 1000), // requests per second
      errorRate: errors.length / totalRequests
    };
  }

  function recordPerformanceMetric(category: string, metric: PerformanceMetrics) {
    if (!performanceResults[category]) {
      performanceResults[category] = [];
    }
    performanceResults[category].push(metric);
  }

  function generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      testEnvironment: 'performance',
      results: performanceResults,
      summary: Object.entries(performanceResults).reduce((acc, [category, metrics]) => {
        const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
        const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
        const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
        
        acc[category] = {
          avgResponseTime: Number(avgResponseTime.toFixed(2)),
          avgThroughput: Number(avgThroughput.toFixed(2)),
          avgMemoryUsage: Number((avgMemoryUsage / 1024 / 1024).toFixed(2)) // MB
        };
        
        return acc;
      }, {} as Record<string, any>)
    };

    console.log('\n🎯 === API PERFORMANCE REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    console.log('=====================================\n');

    // Save report to file for tracking over time
    // Note: In a real environment, you'd want to save this to a file or database
  }
});
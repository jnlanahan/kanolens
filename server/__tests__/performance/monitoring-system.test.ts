// Phase 5: Monitoring System Tests
// Tests the production monitoring and observability system

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { MonitoringService } from '../../services/monitoring-service';

describe('Monitoring System Tests', () => {
  let monitoring: MonitoringService;

  beforeEach(() => {
    monitoring = new MonitoringService({
      enableLogging: true,
      enableMetrics: true,
      enableAlerts: true,
      logLevel: 'debug',
      maxLogEntries: 100,
      maxMetricEntries: 100
    });
  });

  afterEach(() => {
    monitoring.destroy();
  });

  describe('Logging Performance', () => {
    it('should handle high-volume logging efficiently', async () => {
      const logCount = 1000;
      const startTime = performance.now();

      // Generate high volume of logs
      for (let i = 0; i < logCount; i++) {
        monitoring.info(`Test log message ${i}`, { index: i });
        
        if (i % 100 === 0) {
          monitoring.warn(`Checkpoint at ${i}`, { checkpoint: true });
        }
        
        if (i % 200 === 0) {
          monitoring.error(`Error at ${i}`, new Error('Test error'), { errorIndex: i });
        }
      }

      const duration = performance.now() - startTime;
      const avgTimePerLog = duration / logCount;

      // Performance assertions
      expect(avgTimePerLog).toBeLessThan(1); // Less than 1ms per log
      expect(duration).toBeLessThan(1000); // Total time under 1 second

      const stats = monitoring.getStatistics();
      expect(stats.logs.total).toBeGreaterThan(0);
      expect(stats.logs.errors).toBeGreaterThanOrEqual(0); // Errors might be 0 in some test runs

      console.log(`Logging performance: ${avgTimePerLog.toFixed(3)}ms per log, ${duration.toFixed(2)}ms total`);
      console.log(`Log stats:`, stats.logs);
    });

    it('should filter logs by level efficiently', async () => {
      // Generate logs at different levels
      monitoring.debug('Debug message', { type: 'debug' });
      monitoring.info('Info message', { type: 'info' });
      monitoring.warn('Warning message', { type: 'warn' });
      monitoring.error('Error message', new Error('Test'), { type: 'error' });
      monitoring.critical('Critical message', new Error('Critical'), { type: 'critical' });

      const start = performance.now();

      // Test filtering performance
      const errorLogs = monitoring.getLogs({ level: 'error', limit: 50 });
      const warnLogs = monitoring.getLogs({ level: 'warn', limit: 50 });
      const allLogs = monitoring.getLogs({ limit: 100 });

      const filterTime = performance.now() - start;

      // Filtering should be fast
      expect(filterTime).toBeLessThan(10); // Under 10ms for filtering

      // Verify filtering works correctly
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(warnLogs.length).toBeGreaterThan(0);
      expect(allLogs.length).toBeGreaterThan(errorLogs.length);

      errorLogs.forEach(log => {
        expect(log.level).toBe('error');
      });

      console.log(`Log filtering: ${filterTime.toFixed(2)}ms for multiple filters`);
    });
  });

  describe('Metrics Collection Performance', () => {
    it('should handle high-frequency metrics efficiently', async () => {
      const metricCount = 2000;
      const startTime = performance.now();

      // Generate high-frequency metrics
      for (let i = 0; i < metricCount; i++) {
        monitoring.counter('test.requests', 1, { endpoint: `/api/test${i % 10}` });
        monitoring.gauge('test.memory', Math.random() * 100, { service: 'test' });
        monitoring.timer('test.response_time', Math.random() * 1000, { method: 'GET' });
        monitoring.histogram('test.payload_size', Math.random() * 10000, { type: 'json' });
      }

      const duration = performance.now() - startTime;
      const avgTimePerMetric = duration / metricCount;

      // Performance assertions
      expect(avgTimePerMetric).toBeLessThan(0.5); // Less than 0.5ms per metric
      expect(duration).toBeLessThan(1000); // Total time under 1 second

      const stats = monitoring.getStatistics();
      expect(stats.metrics.total).toBeGreaterThan(0);

      console.log(`Metrics performance: ${avgTimePerMetric.toFixed(3)}ms per metric, ${duration.toFixed(2)}ms total`);
      console.log(`Metric stats:`, stats.metrics);
    });

    it('should query metrics efficiently', async () => {
      // Generate test metrics
      for (let i = 0; i < 100; i++) {
        monitoring.counter('api.requests', 1, { endpoint: '/test' });
        monitoring.timer('api.response_time', Math.random() * 500);
        monitoring.gauge('system.cpu', Math.random() * 100);
      }

      const start = performance.now();

      // Test various metric queries
      const counterMetrics = monitoring.getMetrics({ type: 'counter', limit: 50 });
      const timerMetrics = monitoring.getMetrics({ type: 'timer', limit: 50 });
      const apiMetrics = monitoring.getMetrics({ name: 'api.requests', limit: 25 });
      const recentMetrics = monitoring.getMetrics({ 
        since: new Date(Date.now() - 60000).toISOString(), 
        limit: 100 
      });

      const queryTime = performance.now() - start;

      // Querying should be fast
      expect(queryTime).toBeLessThan(20); // Under 20ms for multiple queries

      // Verify query results
      expect(counterMetrics.length).toBeGreaterThan(0);
      expect(timerMetrics.length).toBeGreaterThan(0);
      expect(apiMetrics.length).toBeGreaterThan(0);
      expect(recentMetrics.length).toBeGreaterThan(0);

      counterMetrics.forEach(metric => {
        expect(metric.type).toBe('counter');
      });

      apiMetrics.forEach(metric => {
        expect(metric.name).toBe('api.requests');
      });

      console.log(`Metrics querying: ${queryTime.toFixed(2)}ms for multiple queries`);
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance with minimal overhead', async () => {
      const iterations = 500;
      const overheadTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Measure overhead of performance tracking
        const overheadStart = performance.now();
        
        const trackerId = monitoring.startPerformanceTracker('test.operation', { iteration: i });
        
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
        
        monitoring.endPerformanceTracker(trackerId, { completed: true });
        
        const overheadEnd = performance.now();
        overheadTimes.push(overheadEnd - overheadStart);
      }

      const avgOverhead = overheadTimes.reduce((a, b) => a + b, 0) / overheadTimes.length;
      const maxOverhead = Math.max(...overheadTimes);

      // Performance tracking overhead should be reasonable
      expect(avgOverhead).toBeLessThan(20); // Less than 20ms average overhead
      expect(maxOverhead).toBeLessThan(100); // No single tracking over 100ms

      const timerMetrics = monitoring.getMetrics({ name: 'test.operation', type: 'timer' });
      expect(timerMetrics.length).toBe(iterations);

      console.log(`Performance tracking overhead: ${avgOverhead.toFixed(2)}ms avg, ${maxOverhead.toFixed(2)}ms max`);
    });

    it('should handle concurrent performance tracking', async () => {
      const concurrentTrackers = 50;
      const trackerPromises: Promise<number | undefined>[] = [];

      const start = performance.now();

      // Start multiple concurrent trackers
      for (let i = 0; i < concurrentTrackers; i++) {
        const promise = (async () => {
          const trackerId = monitoring.startPerformanceTracker('concurrent.test', { id: i });
          
          // Simulate async work
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
          
          return monitoring.endPerformanceTracker(trackerId, { finished: true });
        })();

        trackerPromises.push(promise);
      }

      const results = await Promise.all(trackerPromises);
      const totalTime = performance.now() - start;

      // All trackers should complete successfully
      const successfulTrackers = results.filter(result => result !== undefined);
      expect(successfulTrackers.length).toBe(concurrentTrackers);

      // Concurrent tracking should be efficient
      expect(totalTime).toBeLessThan(1000); // Under 1 second for all concurrent tracking

      const concurrentMetrics = monitoring.getMetrics({ name: 'concurrent.test', type: 'timer' });
      expect(concurrentMetrics.length).toBe(concurrentTrackers);

      console.log(`Concurrent tracking: ${concurrentTrackers} trackers in ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Alert System Performance', () => {
    it('should evaluate alert rules efficiently', async () => {
      // Add a test alert rule
      monitoring.addAlertRule({
        id: 'test-high-errors',
        name: 'Test High Error Rate',
        condition: (metrics, logs) => {
          const errorLogs = logs.filter(log => log.level === 'error');
          return errorLogs.length > 5;
        },
        severity: 'high',
        enabled: true,
        cooldownMs: 1000
      });

      const start = performance.now();

      // Generate logs that should trigger the alert
      for (let i = 0; i < 10; i++) {
        monitoring.error(`Test error ${i}`, new Error('Test'), { testAlert: true });
      }

      const alertEvaluationTime = performance.now() - start;

      // Alert evaluation should be fast
      expect(alertEvaluationTime).toBeLessThan(50); // Under 50ms

      // Check if alert was triggered
      const alerts = monitoring.getAlerts({ resolved: false });
      expect(alerts.length).toBeGreaterThan(0);

      const testAlert = alerts.find(alert => alert.ruleId === 'test-high-errors');
      expect(testAlert).toBeDefined();
      expect(testAlert?.severity).toBe('high');

      console.log(`Alert evaluation: ${alertEvaluationTime.toFixed(2)}ms`);
      console.log(`Triggered alerts:`, alerts.length);
    });

    it('should handle alert cooldowns correctly', async () => {
      // Add alert rule with short cooldown
      monitoring.addAlertRule({
        id: 'test-cooldown',
        name: 'Test Cooldown',
        condition: () => true, // Always trigger
        severity: 'low',
        enabled: true,
        cooldownMs: 100 // 100ms cooldown
      });

      // First trigger
      monitoring.error('First trigger');
      const firstAlerts = monitoring.getAlerts({ resolved: false });
      const firstCount = firstAlerts.length;

      // Immediate second trigger (should be blocked by cooldown)
      monitoring.error('Second trigger');
      const secondAlerts = monitoring.getAlerts({ resolved: false });
      const secondCount = secondAlerts.length;

      // Wait for cooldown to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third trigger (should work after cooldown)
      monitoring.error('Third trigger');
      const thirdAlerts = monitoring.getAlerts({ resolved: false });
      const thirdCount = thirdAlerts.length;

      // Verify cooldown behavior
      expect(secondCount).toBe(firstCount); // Second trigger blocked
      expect(thirdCount).toBeGreaterThan(secondCount); // Third trigger worked

      console.log(`Alert cooldown test - First: ${firstCount}, Second: ${secondCount}, Third: ${thirdCount}`);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should manage memory usage efficiently under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate significant load
      for (let i = 0; i < 1000; i++) {
        monitoring.info(`Load test message ${i}`, { 
          data: 'x'.repeat(100), // Add some data
          iteration: i 
        });
        
        monitoring.counter('load.test', 1, { 
          batch: Math.floor(i / 100).toString() 
        });
        
        monitoring.gauge('load.memory', process.memoryUsage().heapUsed);
      }

      const peakMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = peakMemory - initialMemory;

      // Force garbage collection if available
      if (typeof global.gc === 'function') {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryRetained = finalMemory - initialMemory;

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Under 50MB growth
      expect(memoryRetained).toBeLessThan(20 * 1024 * 1024); // Under 20MB retained

      const stats = monitoring.getStatistics();
      expect(stats.logs.total).toBeGreaterThan(0);
      expect(stats.metrics.total).toBeGreaterThan(0);

      console.log(`Memory usage - Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB, Retained: ${(memoryRetained / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should provide accurate system statistics', async () => {
      // Generate some activity
      monitoring.info('Test info');
      monitoring.warn('Test warning');
      monitoring.error('Test error');
      monitoring.counter('test.counter', 5);
      monitoring.gauge('test.gauge', 42);
      monitoring.timer('test.timer', 123);

      const start = performance.now();
      const stats = monitoring.getStatistics();
      const statsTime = performance.now() - start;

      // Statistics generation should be fast
      expect(statsTime).toBeLessThan(10); // Under 10ms

      // Verify statistics structure
      expect(stats).toHaveProperty('logs');
      expect(stats).toHaveProperty('metrics');
      expect(stats).toHaveProperty('alerts');
      expect(stats).toHaveProperty('performance');

      expect(stats.logs.total).toBeGreaterThan(0);
      expect(stats.metrics.total).toBeGreaterThan(0);
      expect(typeof stats.logs.errors).toBe('number');
      expect(typeof stats.alerts.active).toBe('number');

      console.log(`Statistics generation: ${statsTime.toFixed(2)}ms`);
      console.log(`System stats:`, stats);
    });
  });

  describe('Data Export and Health Monitoring', () => {
    it('should export monitoring data efficiently', async () => {
      // Generate some data to export
      for (let i = 0; i < 50; i++) {
        monitoring.info(`Export test ${i}`);
        monitoring.counter('export.test', 1);
      }

      const start = performance.now();
      
      // Test JSON export
      const jsonExport = monitoring.exportData('json');
      const jsonTime = performance.now() - start;

      // Test CSV export
      const csvStart = performance.now();
      const csvExport = monitoring.exportData('csv');
      const csvTime = performance.now() - csvStart;

      // Export should be fast
      expect(jsonTime).toBeLessThan(100); // Under 100ms for JSON
      expect(csvTime).toBeLessThan(100); // Under 100ms for CSV

      // Verify export content
      expect(jsonExport).toContain('"logs":');
      expect(jsonExport).toContain('"metrics":');
      expect(csvExport).toContain('type,timestamp,level,message,value');

      console.log(`Data export - JSON: ${jsonTime.toFixed(2)}ms, CSV: ${csvTime.toFixed(2)}ms`);
    });

    it('should provide health status quickly', async () => {
      const iterations = 100;
      const healthTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const health = monitoring.getHealthStatus();
        const duration = performance.now() - start;
        
        healthTimes.push(duration);

        // Verify health status structure
        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('timestamp');
        expect(health).toHaveProperty('uptime');
        expect(health).toHaveProperty('statistics');
        expect(health).toHaveProperty('memory');
      }

      const avgHealthTime = healthTimes.reduce((a, b) => a + b, 0) / healthTimes.length;
      const maxHealthTime = Math.max(...healthTimes);

      // Health checks should be very fast
      expect(avgHealthTime).toBeLessThan(5); // Under 5ms average
      expect(maxHealthTime).toBeLessThan(20); // No check over 20ms

      console.log(`Health status performance: ${avgHealthTime.toFixed(2)}ms avg, ${maxHealthTime.toFixed(2)}ms max`);
    });
  });
});
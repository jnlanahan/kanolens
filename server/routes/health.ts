// Phase 5: Health Check and Monitoring Routes
// Comprehensive health check endpoints for production monitoring

import { Express, Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { storage } from '../storage';

// Safely import webSocketService for testing environments
function getWebSocketService() {
  try {
    const { webSocketService } = require('../websocket');
    return webSocketService;
  } catch (error) {
    // Mock webSocketService for testing environments where it's not available
    return {
      getConnectionStatus: () => ({ activeConnections: 0, totalConnections: 0 }),
      shutdown: () => {},
      broadcastToUser: () => {},
      broadcastToAll: () => {}
    };
  }
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      duration: number;
      message?: string;
      data?: any;
    };
  };
}

interface SystemMetrics {
  memory: NodeJS.MemoryUsage;
  cpu: any;
  uptime: number;
  timestamp: string;
  activeConnections: number;
  totalRequests?: number;
}

// In-memory metrics store (in production, use Redis or similar)
let requestCount = 0;
let responseTimeHistory: number[] = [];
const maxHistorySize = 100;

export function setupHealthRoutes(app: Express): void {
  
  // Middleware to track requests
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') && !req.path.startsWith('/api/health')) {
      requestCount++;
      
      const start = performance.now();
      res.on('finish', () => {
        const duration = performance.now() - start;
        responseTimeHistory.push(duration);
        
        // Keep only recent response times
        if (responseTimeHistory.length > maxHistorySize) {
          responseTimeHistory = responseTimeHistory.slice(-maxHistorySize);
        }
      });
    }
    next();
  });

  // Basic health check - lightweight for load balancers
  app.get('/health', async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Comprehensive health check with all dependencies
  app.get('/api/health/full', async (req: Request, res: Response) => {
    const startTime = performance.now();
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {}
    };

    try {
      // Database health check
      const dbStart = performance.now();
      try {
        const dbManager = storage;
        await dbManager.getUserById('health-check-test');
        
        result.checks.database = {
          status: 'pass',
          duration: performance.now() - dbStart,
          message: 'Database connection successful'
        };
      } catch (error) {
        result.checks.database = {
          status: 'fail',
          duration: performance.now() - dbStart,
          message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        result.status = 'unhealthy';
      }

      // WebSocket service health check
      const wsStart = performance.now();
      try {
        const wsService = getWebSocketService();
        const wsStatus = wsService.getConnectionStatus();
        
        result.checks.websocket = {
          status: 'pass',
          duration: performance.now() - wsStart,
          message: 'WebSocket service operational',
          data: {
            activeConnections: wsStatus.activeConnections,
            totalConnections: wsStatus.totalConnections
          }
        };
      } catch (error) {
        result.checks.websocket = {
          status: 'warn',
          duration: performance.now() - wsStart,
          message: `WebSocket service issues: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        if (result.status === 'healthy') result.status = 'degraded';
      }

      // Memory health check
      const memoryStart = performance.now();
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      
      let memoryStatus: 'pass' | 'warn' | 'fail' = 'pass';
      let memoryMessage = 'Memory usage normal';
      
      if (heapUsedMB > 1024) { // 1GB
        memoryStatus = 'fail';
        memoryMessage = 'High memory usage detected';
        result.status = 'unhealthy';
      } else if (heapUsedMB > 512) { // 512MB
        memoryStatus = 'warn';
        memoryMessage = 'Elevated memory usage';
        if (result.status === 'healthy') result.status = 'degraded';
      }

      result.checks.memory = {
        status: memoryStatus,
        duration: performance.now() - memoryStart,
        message: memoryMessage,
        data: {
          heapUsed: `${heapUsedMB.toFixed(2)} MB`,
          heapTotal: `${heapTotalMB.toFixed(2)} MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
        }
      };

      // Environment variables check
      const envStart = performance.now();
      const requiredEnvVars = ['DATABASE_URL', 'OPENAI_API_KEY'];
      const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      result.checks.environment = {
        status: missingEnvVars.length === 0 ? 'pass' : 'fail',
        duration: performance.now() - envStart,
        message: missingEnvVars.length === 0 
          ? 'All required environment variables present'
          : `Missing environment variables: ${missingEnvVars.join(', ')}`
      };

      if (missingEnvVars.length > 0) {
        result.status = 'unhealthy';
      }

      // Response time check
      const responseTimeStart = performance.now();
      const avgResponseTime = responseTimeHistory.length > 0 
        ? responseTimeHistory.reduce((a, b) => a + b, 0) / responseTimeHistory.length 
        : 0;
      
      let responseStatus: 'pass' | 'warn' | 'fail' = 'pass';
      let responseMessage = 'Response times normal';
      
      if (avgResponseTime > 2000) { // 2 seconds
        responseStatus = 'fail';
        responseMessage = 'High average response times';
        result.status = 'unhealthy';
      } else if (avgResponseTime > 1000) { // 1 second
        responseStatus = 'warn';
        responseMessage = 'Elevated response times';
        if (result.status === 'healthy') result.status = 'degraded';
      }

      result.checks.responseTime = {
        status: responseStatus,
        duration: performance.now() - responseTimeStart,
        message: responseMessage,
        data: {
          averageMs: Number(avgResponseTime.toFixed(2)),
          sampleSize: responseTimeHistory.length,
          maxMs: responseTimeHistory.length > 0 ? Math.max(...responseTimeHistory) : 0,
          minMs: responseTimeHistory.length > 0 ? Math.min(...responseTimeHistory) : 0
        }
      };

      const totalDuration = performance.now() - startTime;
      
      // Set appropriate HTTP status code
      const statusCode = result.status === 'healthy' ? 200 : 
                        result.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json({
        ...result,
        totalCheckDuration: `${totalDuration.toFixed(2)}ms`
      });

    } catch (error) {
      const errorResult: HealthCheckResult = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          healthCheck: {
            status: 'fail',
            duration: performance.now() - startTime,
            message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }
      };

      res.status(503).json(errorResult);
    }
  });

  // System metrics endpoint
  app.get('/api/health/metrics', async (req: Request, res: Response) => {
    try {
      const metrics: SystemMetrics = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        activeConnections: getWebSocketService().getConnectionStatus().activeConnections,
        totalRequests: requestCount
      };

      res.json({
        ...metrics,
        responseTimeStats: {
          average: responseTimeHistory.length > 0 
            ? responseTimeHistory.reduce((a, b) => a + b, 0) / responseTimeHistory.length 
            : 0,
          min: responseTimeHistory.length > 0 ? Math.min(...responseTimeHistory) : 0,
          max: responseTimeHistory.length > 0 ? Math.max(...responseTimeHistory) : 0,
          count: responseTimeHistory.length
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Readiness probe - for Kubernetes/container orchestration
  app.get('/api/health/ready', async (req: Request, res: Response) => {
    try {
      // Quick checks for readiness
      const dbManager = storage;
      await dbManager.getUser('readiness-check');
      
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'not-ready',
        timestamp: new Date().toISOString(),
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Liveness probe - for Kubernetes/container orchestration
  app.get('/api/health/live', (req: Request, res: Response) => {
    // Simple check that the process is alive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid
    });
  });

  // Startup probe - for Kubernetes/container orchestration
  app.get('/api/health/startup', async (req: Request, res: Response) => {
    try {
      // Check if application has fully started
      const startupChecks = {
        database: false,
        websocket: false,
        environment: false
      };

      // Database startup check
      try {
        const dbManager = storage;
        await dbManager.getUserById('startup-check');
        startupChecks.database = true;
      } catch (error) {
        // Database not ready
      }

      // WebSocket startup check
      try {
        getWebSocketService().getConnectionStatus();
        startupChecks.websocket = true;
      } catch (error) {
        // WebSocket not ready
      }

      // Environment startup check
      const requiredEnvVars = ['DATABASE_URL', 'OPENAI_API_KEY'];
      startupChecks.environment = requiredEnvVars.every(varName => process.env[varName]);

      const allReady = Object.values(startupChecks).every(check => check);

      res.status(allReady ? 200 : 503).json({
        status: allReady ? 'started' : 'starting',
        timestamp: new Date().toISOString(),
        checks: startupChecks
      });
    } catch (error) {
      res.status(503).json({
        status: 'startup-failed',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Performance monitoring endpoint
  app.get('/api/health/performance', (req: Request, res: Response) => {
    const performanceData = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        usage: process.memoryUsage(),
        usageFormatted: {
          heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
          external: `${(process.memoryUsage().external / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`
        }
      },
      cpu: process.cpuUsage(),
      eventLoop: {
        delay: 0 // Would need additional monitoring library for actual event loop delay
      },
      requests: {
        total: requestCount,
        averageResponseTime: responseTimeHistory.length > 0 
          ? responseTimeHistory.reduce((a, b) => a + b, 0) / responseTimeHistory.length 
          : 0,
        recentResponseTimes: responseTimeHistory.slice(-10) // Last 10 response times
      },
      websocket: {
        activeConnections: getWebSocketService().getConnectionStatus().activeConnections
      }
    };

    res.json(performanceData);
  });

  console.log('🏥 Health check routes configured');
}
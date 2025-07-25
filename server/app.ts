// Extracted app creation for testing purposes
import './config'; // Load environment variables first
import express, { type Request, Response, NextFunction } from "express";
import { setupHealthRoutes } from "./routes/health";

export async function createApp(): Promise<express.Application> {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        // Only log in development or if explicitly enabled
        if (process.env.NODE_ENV === 'development' || process.env.ENABLE_LOGS === 'true') {
          console.log(logLine);
        }
      }
    });

    next();
  });

  // Register health routes first (no auth required)
  console.log('[Test App] Registering health check routes...');
  setupHealthRoutes(app);

  // Basic test routes for performance testing
  app.get('/api/auth/user', (req, res) => {
    res.json({ 
      id: 'test-user', 
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    });
  });

  app.get('/api/analysis/sessions', (req, res) => {
    res.json([
      { id: 1, description: 'Test session', createdAt: new Date().toISOString() }
    ]);
  });

  app.post('/api/analysis/sessions', (req, res) => {
    res.json({ 
      id: Math.floor(Math.random() * 1000),
      ...req.body,
      createdAt: new Date().toISOString()
    });
  });

  app.post('/api/analysis/sessions/:id/messages', (req, res) => {
    res.json({
      id: Math.floor(Math.random() * 1000),
      sessionId: req.params.id,
      message: req.body.message,
      response: 'Test AI response',
      createdAt: new Date().toISOString()
    });
  });

  app.get('/api/analysis/sessions/:id/messages', (req, res) => {
    res.json([
      { 
        id: 1, 
        sessionId: req.params.id,
        message: 'Test message',
        response: 'Test response',
        createdAt: new Date().toISOString()
      }
    ]);
  });

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    
    // Only throw in development to avoid crashing tests
    if (process.env.NODE_ENV === 'development') {
      throw err;
    }
  });

  return app;
}
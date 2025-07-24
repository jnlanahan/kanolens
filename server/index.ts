import './config'; // Load environment variables first
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const nodeEnv = process.env.NODE_ENV || 'development';
  // Enable Vite development server for live updates
  if (nodeEnv === "development") {
    console.log('[Server] Setting up Vite development server...');
    await setupVite(app, server);
  } else {
    console.log('[Server] Serving static files...');
    serveStatic(app);
  }

  // Serve the app on port 3004 (temporarily to avoid port conflict)
  // this serves both the API and the client.
  const port = process.env.PORT || 3006;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  
  const serverOptions: any = { port, host };
  
  // Only use reusePort in production (Linux/Railway)
  if (process.env.NODE_ENV === 'production') {
    serverOptions.reusePort = true;
  }
  
  const serverInstance = server.listen(serverOptions, () => {
    log(`serving on http://${host}:${port}`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    
    // Import webSocketService dynamically to avoid circular dependency
    import('./websocket').then(({ webSocketService }) => {
      webSocketService.shutdown();
    });
    
    serverInstance.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();

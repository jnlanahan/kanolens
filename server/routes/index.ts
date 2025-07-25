// Central route registry - combines all route modules
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, setupLoginRoute } from "../simpleAuth";
import { storage } from "../storage";

// Import route modules
import { setupAuthRoutes } from "./auth";
import { setupSessionRoutes } from "./sessions";
import { setupMessageRoutes } from "./messages";
import { setupAnalysisRoutes } from "./analysis";
import { setupExportRoutes } from "./export";
import { setupHealthRoutes } from "./health";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware first
  await setupAuth(app);
  
  // Setup login routes for development
  setupLoginRoute(app);

  // Ensure dev user exists in development mode
  if (process.env.NODE_ENV === 'development') {
    try {
      await storage.upsertUser({
        id: 'dev-user-123',
        email: 'dev@example.com',
        firstName: 'Development',
        lastName: 'User'
      });
      console.log('[Routes] Development user created/updated');
    } catch (error) {
      console.error('[Routes] Failed to create dev user:', error);
    }
  }

  // Register health routes first (no auth required)
  console.log('[Routes] Registering health check routes...');
  setupHealthRoutes(app);

  // Register all other route modules
  console.log('[Routes] Registering auth routes...');
  setupAuthRoutes(app);
  
  console.log('[Routes] Registering session routes...');
  setupSessionRoutes(app);
  
  console.log('[Routes] Registering message routes...');
  setupMessageRoutes(app);
  
  console.log('[Routes] Registering analysis routes...');
  setupAnalysisRoutes(app);
  
  console.log('[Routes] Registering export routes...');
  setupExportRoutes(app);
  
  // TODO: Add remaining route modules as they are extracted:
  // setupDebugRoutes(app);
  
  console.log('[Routes] All routes registered successfully');

  // Create HTTP server
  const server = createServer(app);
  return server;
}

// Export all route setup functions for testing
export {
  setupAuthRoutes,
  setupSessionRoutes,
  setupMessageRoutes,
  setupAnalysisRoutes,
  setupExportRoutes,
  setupHealthRoutes
};
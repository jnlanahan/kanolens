// Authentication routes
import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../simpleAuth";
import { testOpenAIConnection } from "../openai";

export function setupAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // For development mode, return mock user
      if (userId === 'dev-user-123') {
        return res.json({
          id: 'dev-user-123',
          email: 'dev@example.com',
          firstName: 'Development',
          lastName: 'User',
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // OpenAI connection test
  app.get('/api/openai/test', isAuthenticated, async (req, res) => {
    try {
      const isConnected = await testOpenAIConnection();
      res.json({ 
        connected: isConnected, 
        message: isConnected ? "OpenAI connection successful" : "OpenAI connection failed" 
      });
    } catch (error) {
      console.error("OpenAI test error:", error);
      res.status(500).json({ 
        connected: false, 
        message: "OpenAI connection test failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
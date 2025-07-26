// Analysis session management routes
import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuthMiddleware } from "../middleware/jwt-auth";
import { insertAnalysisSessionSchema, ANALYSIS_STEPS } from "@shared/schema";
import { ZodError } from "zod";
import { titleGeneratorService } from "../services/title-generator";

export function setupSessionRoutes(app: Express): void {
  // Get user analysis limits and usage
  app.get('/api/analysis/limits', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;
      
      const limits = await storage.getUserAnalysisLimit(userId);
      
      // Special handling for jnlanahan@gmail.com (unlimited)
      const isUnlimited = userEmail === 'jnlanahan@gmail.com';
      
      res.json({
        current: limits.current,
        max: isUnlimited ? 999999 : limits.max,
        isUnlimited,
        canCreateMore: isUnlimited || limits.current < limits.max,
        remainingAnalyses: isUnlimited ? 999999 : Math.max(0, limits.max - limits.current)
      });
    } catch (error) {
      console.error("Get analysis limits error:", error);
      res.status(500).json({ message: "Failed to fetch analysis limits" });
    }
  });
  // Phase 3: Generate smart title for analysis
  app.post('/api/analysis/generate-title', jwtAuthMiddleware, async (req: any, res) => {
    try {
      console.log("[Routes] Generating smart analysis title...");
      console.log("[Routes] Request body:", req.body);
      
      const { products, description, targetCustomers, role } = req.body;
      
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: "Products array is required" });
      }
      
      const smartTitle = await titleGeneratorService.generateSmartTitle({
        products,
        description,
        targetCustomers,
        role
      });
      
      const titleWithDate = titleGeneratorService.generateTitleWithDate(smartTitle);
      
      console.log("[Routes] Generated smart title:", titleWithDate);
      res.json({ 
        smartTitle,
        titleWithDate,
        fallback: false 
      });
    } catch (error) {
      console.error("[Routes] Title generation error:", error);
      
      // Fallback title generation
      const fallbackTitle = titleGeneratorService.generateTitleWithDate(
        req.body.products?.length === 1 
          ? `${req.body.products[0]} Analysis`
          : `Analysis ${new Date().toLocaleDateString()}`
      );
      
      res.json({ 
        smartTitle: fallbackTitle.split(' - ')[0],
        titleWithDate: fallbackTitle,
        fallback: true 
      });
    }
  });

  // Create new analysis session
  app.post('/api/analysis/sessions', jwtAuthMiddleware, async (req: any, res) => {
    try {
      console.log("[Routes] Creating analysis session...");
      const userId = req.user.id;
      const userEmail = req.user.email;
      console.log("[Routes] User ID:", userId);
      console.log("[Routes] User Email:", userEmail);
      console.log("[Routes] Request body:", req.body);
      
      // Check analysis limits before creating session
      const analysisLimits = await storage.getUserAnalysisLimit(userId);
      console.log("[Routes] Analysis limits:", analysisLimits);
      
      // Special handling for jnlanahan@gmail.com (unlimited)
      if (userEmail !== 'jnlanahan@gmail.com' && analysisLimits.current >= analysisLimits.max) {
        console.log("[Routes] User has reached analysis limit");
        return res.status(403).json({ 
          message: "Analysis limit reached", 
          current: analysisLimits.current,
          max: analysisLimits.max,
          isLimitReached: true,
          canCreateMore: false
        });
      }
      
      const sessionData = insertAnalysisSessionSchema.parse({
        ...req.body,
        userId,
      });
      console.log("[Routes] Parsed session data:", sessionData);

      const session = await storage.createAnalysisSession(sessionData);
      
      // Increment user's analysis count
      await storage.incrementUserAnalysisCount(userId);
      
      console.log("[Routes] Created session:", session);
      res.json(session);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[Routes] Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      console.error("[Routes] Create session error:", error);
      res.status(500).json({ message: "Failed to create analysis session" });
    }
  });

  // Get all sessions for current user
  app.get('/api/analysis/sessions', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getUserAnalysisSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get specific session by ID
  app.get('/api/analysis/sessions/:id', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if user owns this session
      if (session.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(session);
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Update session (typically title)
  app.put('/api/analysis/sessions/:id', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if user owns this session
      if (session.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { title } = req.body;
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: "Valid title is required" });
      }

      await storage.updateAnalysisSession(sessionId, { title: title.trim() });
      res.json({ message: "Session updated successfully" });
    } catch (error) {
      console.error("Update session error:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Delete specific session
  app.delete('/api/analysis/sessions/:id', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if user owns this session
      if (session.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteAnalysisSession(sessionId);
      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Delete session error:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Bulk delete all sessions for user
  app.delete('/api/analysis/sessions', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userSessions = await storage.getUserAnalysisSessions(userId);
      
      // Delete all sessions for this user
      for (const session of userSessions) {
        await storage.deleteAnalysisSession(session.id);
      }
      
      res.json({ message: `Deleted ${userSessions.length} sessions successfully` });
    } catch (error) {
      console.error("Bulk delete sessions error:", error);
      res.status(500).json({ message: "Failed to delete sessions" });
    }
  });

  // Get session progress
  app.get('/api/analysis/sessions/:id/progress', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Map internal steps to progress steps using standardized constants
      const stepMap = {
        [ANALYSIS_STEPS.DISCOVERY]: ANALYSIS_STEPS.DISCOVERY,
        [ANALYSIS_STEPS.RESEARCH]: ANALYSIS_STEPS.RESEARCH,
        [ANALYSIS_STEPS.CATEGORIZATION]: ANALYSIS_STEPS.CATEGORIZATION,
        [ANALYSIS_STEPS.ANALYSIS]: ANALYSIS_STEPS.ANALYSIS,
        [ANALYSIS_STEPS.TABLE_CREATION]: ANALYSIS_STEPS.TABLE_CREATION,
      };

      const currentStep = stepMap[session.currentStep as keyof typeof stepMap] || ANALYSIS_STEPS.DISCOVERY;
      
      // Calculate progress percentage based on step
      const progressMap = {
        [ANALYSIS_STEPS.DISCOVERY]: 0,
        [ANALYSIS_STEPS.RESEARCH]: 25,
        [ANALYSIS_STEPS.CATEGORIZATION]: 50,
        [ANALYSIS_STEPS.ANALYSIS]: 75,
        [ANALYSIS_STEPS.TABLE_CREATION]: 100,
      };

      const progress = progressMap[currentStep as keyof typeof progressMap] || 0;

      res.json({
        sessionId,
        currentStep,
        progress,
        hasResults: !!session.tableData,
        totalSteps: Object.keys(ANALYSIS_STEPS).length,
        stepName: currentStep.charAt(0).toUpperCase() + currentStep.slice(1),
      });
    } catch (error) {
      console.error("Get progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });
}

// Helper function to validate session ownership
export function validateSessionOwnership(session: any, userId: string): boolean {
  return !!(session && session.userId === userId);
}
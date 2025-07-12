import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  processChatMessage, 
  conductCompetitiveResearch, 
  generateKanoTable, 
  testOpenAIConnection 
} from "./openai";
import { 
  insertAnalysisSessionSchema, 
  insertChatMessageSchema,
  insertDocumentSchema 
} from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Analysis session routes
  app.post('/api/analysis/sessions', isAuthenticated, async (req: any, res) => {
    try {
      console.log("[Routes] Creating analysis session...");
      const userId = req.user.claims.sub;
      console.log("[Routes] User ID:", userId);
      console.log("[Routes] Request body:", req.body);
      
      const sessionData = insertAnalysisSessionSchema.parse({
        ...req.body,
        userId,
      });
      console.log("[Routes] Parsed session data:", sessionData);

      const session = await storage.createAnalysisSession(sessionData);
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

  app.get('/api/analysis/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getUserAnalysisSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get('/api/analysis/sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if user owns this session
      if (session.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(session);
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.put('/api/analysis/sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if user owns this session
      if (session.userId !== req.user.claims.sub) {
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

  app.delete('/api/analysis/sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if user owns this session
      if (session.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteAnalysisSession(sessionId);
      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Delete session error:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  app.delete('/api/analysis/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Chat message routes
  app.post('/api/analysis/sessions/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      console.log("[Routes] Processing chat message...");
      const sessionId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      console.log(`[Routes] Session ID: ${sessionId}, User ID: ${userId}`);
      console.log(`[Routes] Message content: ${req.body.content}`);
      
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        console.log("[Routes] Session not found");
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.userId !== userId) {
        console.log("[Routes] Access denied - user mismatch");
        return res.status(403).json({ message: "Access denied" });
      }

      console.log(`[Routes] Session found: ${session.title}, step: ${session.currentStep}`);

      // Add user message
      const userMessage = await storage.addChatMessage({
        sessionId,
        role: 'user',
        content: req.body.content,
        metadata: req.body.metadata || null,
      });
      console.log("[Routes] User message saved");

      // Get conversation history before processing
      const conversationHistory = await storage.getSessionChatMessages(sessionId);
      
      // Process with OpenAI using the 5-step Kano methodology
      console.log("[Routes] Calling OpenAI processChatMessage...");
      console.log("[Routes] Parameters:", {
        content: req.body.content,
        sessionId: sessionId,
        userId: userId,
        currentStep: session.currentStep,
        historyLength: conversationHistory.length
      });
      const aiResponse = await processChatMessage(
        sessionId,
        req.body.content,
        session.currentStep,
        session,
        conversationHistory
      );
      console.log("[Routes] OpenAI response received:", aiResponse);

      // Add AI response message
      const aiMessage = await storage.addChatMessage({
        sessionId,
        role: 'assistant',
        content: aiResponse.message,
        metadata: {
          step: aiResponse.step,
          progress: aiResponse.progress,
          data: aiResponse.data,
          ...(aiResponse.metadata || {}),
        },
      });

      // Update session with AI response data
      if (aiResponse.step !== session.currentStep || aiResponse.data) {
        const updateData: any = {
          currentStep: aiResponse.step,
        };
        
        if (aiResponse.data) {
          if (aiResponse.data.features) updateData.features = aiResponse.data.features;
          if (aiResponse.data.products) updateData.products = aiResponse.data.products;
          if (aiResponse.data.tableData) updateData.tableData = aiResponse.data.tableData;
          if (aiResponse.data.targetCustomer) updateData.targetCustomer = aiResponse.data.targetCustomer;
          
          // Auto-update title when products are identified (if still using generic title)
          if (aiResponse.data.products && Array.isArray(aiResponse.data.products) && aiResponse.data.products.length > 0) {
            const isGenericTitle = session.title.includes('Analysis ') || session.title.includes('New Analysis');
            if (isGenericTitle) {
              const productNames = aiResponse.data.products.slice(0, 3).join(' vs ');
              updateData.title = `${productNames} Analysis`;
            }
          }
          
          // Mark as completed if we reached table creation or analysis step
          if (aiResponse.step === 'table_creation' || aiResponse.step === 'analysis') {
            updateData.status = 'completed';
          }
        }
        
        await storage.updateAnalysisSession(sessionId, updateData);
      }

      res.json({
        userMessage,
        aiMessage,
        sessionUpdate: aiResponse.step !== session.currentStep || aiResponse.data ? {
          currentStep: aiResponse.step,
          data: aiResponse.data
        } : null
      });
    } catch (error) {
      console.error("Chat message error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.get('/api/analysis/sessions/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Session not found" });
      }

      const messages = await storage.getSessionChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Research and table generation routes
  app.post('/api/analysis/sessions/:id/research', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Session not found" });
      }

      const { products, userProduct } = req.body;
      const research = await conductCompetitiveResearch(products, userProduct);

      // Update session with research results
      await storage.updateAnalysisSession(sessionId, {
        features: research.features,
        sourceDocumentation: research.sources,
        currentStep: 'categorization',
      });

      res.json(research);
    } catch (error) {
      console.error("Research error:", error);
      res.status(500).json({ message: "Failed to conduct research" });
    }
  });

  app.post('/api/analysis/sessions/:id/generate-table', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Session not found" });
      }

      const { features, products, userProduct } = req.body;
      const tableData = await generateKanoTable(features, products, userProduct);

      // Update session with table data
      await storage.updateAnalysisSession(sessionId, {
        tableData,
        currentStep: 'analysis',
        status: 'completed',
      });

      res.json(tableData);
    } catch (error) {
      console.error("Table generation error:", error);
      res.status(500).json({ message: "Failed to generate table" });
    }
  });

  // Document upload routes
  app.post('/api/analysis/sessions/:id/documents', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Session not found" });
      }

      const documentData = insertDocumentSchema.parse({
        ...req.body,
        sessionId,
      });

      const document = await storage.uploadDocument(documentData);
      res.json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      console.error("Document upload error:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });
  
  // User feedback routes
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, messageId, feedbackType, feedbackText, context } = req.body;
      
      // Validate feedback type
      if (!['thumbs_up', 'thumbs_down'].includes(feedbackType)) {
        return res.status(400).json({ message: 'Invalid feedback type' });
      }
      
      // Create feedback record
      const feedback = await storage.createUserFeedback({
        userId,
        sessionId: sessionId ? parseInt(sessionId) : null,
        messageId: messageId ? parseInt(messageId) : null,
        feedbackType,
        feedbackText,
        context,
      });
      
      res.json({ 
        message: 'Feedback received successfully',
        feedbackId: feedback.id
      });
    } catch (error) {
      console.error('Feedback error:', error);
      res.status(500).json({ message: 'Failed to save feedback' });
    }
  });
  
  app.get('/api/feedback/session/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const feedback = await storage.getSessionFeedback(sessionId);
      res.json(feedback);
    } catch (error) {
      console.error('Get feedback error:', error);
      res.status(500).json({ message: 'Failed to fetch feedback' });
    }
  });
  
  // Admin routes (protected)
  app.get('/api/admin/evaluations', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin (you might want to implement proper admin check)
      const userId = req.user.claims.sub;
      // For now, let's allow all authenticated users to see evaluations for demo purposes
      // In production, you'd check against adminUsers table
      
      const { agentName, sessionId } = req.query;
      
      let evaluations;
      if (sessionId) {
        evaluations = await storage.getSessionEvaluations(parseInt(sessionId as string));
      } else if (agentName) {
        evaluations = await storage.getAgentEvaluations(agentName as string);
      } else {
        // Get recent evaluations
        evaluations = await storage.getAgentEvaluations('orchestrator');
      }
      
      res.json(evaluations);
    } catch (error) {
      console.error('Get evaluations error:', error);
      res.status(500).json({ message: 'Failed to fetch evaluations' });
    }
  });
  
  app.get('/api/admin/prompt-versions/:agentName', isAuthenticated, async (req: any, res) => {
    try {
      const agentName = req.params.agentName;
      const versions = await storage.getPromptVersionHistory(agentName);
      const activeVersion = await storage.getActivePromptVersion(agentName);
      
      res.json({
        versions,
        activeVersion
      });
    } catch (error) {
      console.error('Get prompt versions error:', error);
      res.status(500).json({ message: 'Failed to fetch prompt versions' });
    }
  });
  
  app.post('/api/admin/prompt-versions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { agentName, version, prompt, changeReason } = req.body;
      
      // Create new prompt version
      const newVersion = await storage.createPromptVersion({
        agentName,
        version,
        prompt,
        changeReason,
        changedBy: userId,
        isActive: true,
      });
      
      res.json({
        message: 'Prompt version created successfully',
        version: newVersion
      });
    } catch (error) {
      console.error('Create prompt version error:', error);
      res.status(500).json({ message: 'Failed to create prompt version' });
    }
  });

  // Test endpoint to manually trigger an evaluation (for development/testing)
  app.post('/api/admin/test-evaluation', isAuthenticated, async (req: any, res) => {
    try {
      const { evaluatorAgent } = await import('./agents/evaluator');
      
      // Create a test evaluation
      const mockInput = {
        mode: 'comprehensive',
        products: ['HeadshotPro', 'Dreamwave', 'Aragon.ai'],
        targetCustomer: 'young professionals'
      };
      
      const mockOutput = {
        research: { 
          features: ['AI Enhancement', 'Background Removal', 'Batch Processing'],
          sources: ['https://example.com/source1', 'https://example.com/source2']
        },
        analysis: 'Strategic analysis of AI photo enhancement tools for young professionals'
      };
      
      const evaluation = await evaluatorAgent.evaluateAgent({
        agentName: 'researcher',
        input: mockInput,
        output: mockOutput,
        context: {
          sessionId: 999,
          targetCustomer: 'young professionals',
          products: ['HeadshotPro', 'Dreamwave', 'Aragon.ai'],
          executionTime: 5000
        }
      });
      
      // Store evaluation in database
      await storage.createAgentEvaluation({
        sessionId: 999,
        agentName: 'researcher',
        inputData: mockInput,
        outputData: mockOutput,
        evaluation: evaluation,
        promptVersion: '1.0'
      });
      
      res.json({
        message: 'Test evaluation created successfully',
        evaluation: evaluation
      });
    } catch (error) {
      console.error('Test evaluation error:', error);
      res.status(500).json({ message: 'Failed to create test evaluation' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

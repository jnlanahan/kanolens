import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { jwtAuthMiddleware } from "./middleware/jwt-auth";
import { setupAuthRoutes } from "./routes/auth";
import { 
  processChatMessage, 
  conductCompetitiveResearch, 
  generateKanoTable, 
  testOpenAIConnection 
} from "./openai";
import { 
  insertAnalysisSessionSchema, 
  insertChatMessageSchema,
  insertDocumentSchema,
  ANALYSIS_STEPS,
  ANALYSIS_STATUS
} from "@shared/schema";
import { ZodError } from "zod";
import { orchestratorAgent } from "./agents/orchestrator";
import { webSocketService } from "./websocket";
import { langSmithService } from "./langsmith";

export async function registerRoutes(app: Express): Promise<Server> {
  // JWT authentication is handled per-route by jwtAuthMiddleware

  // Setup auth routes first
  console.log('[Routes] Setting up authentication routes...');
  setupAuthRoutes(app);

  // OpenAI connection test
  app.get('/api/openai/test', jwtAuthMiddleware, async (req, res) => {
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
  app.post('/api/analysis/sessions', jwtAuthMiddleware, async (req: any, res) => {
    try {
      console.log("[Routes] Creating analysis session...");
      const userId = req.user.id;
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

  app.get('/api/analysis/sessions/:id', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if user owns this session
      // In development mode, allow access to any session for easier testing
      if (process.env.NODE_ENV !== 'development' && session.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(session);
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.put('/api/analysis/sessions/:id', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if user owns this session
      // In development mode, allow access to any session for easier testing
      if (process.env.NODE_ENV !== 'development' && session.userId !== req.user.id) {
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

  app.delete('/api/analysis/sessions/:id', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Debug logging for user ID mismatch
      console.log('[DELETE] Debug info:', {
        sessionId,
        sessionUserId: session.userId,
        sessionUserIdType: typeof session.userId,
        reqUserId: req.user.id,
        reqUserIdType: typeof req.user.id,
        match: session.userId === req.user.id,
        user: req.user
      });

      // Check if user owns this session
      // In development mode, allow deletion of any session for easier testing
      if (process.env.NODE_ENV !== 'development' && session.userId !== req.user.id) {
        console.log('[DELETE] Access denied - user does not own session');
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteAnalysisSession(sessionId);
      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Delete session error:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

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

  // Chat message routes
  app.post('/api/analysis/sessions/:id/messages', jwtAuthMiddleware, async (req: any, res) => {
    try {
      console.log("[Routes] Processing chat message...");
      const sessionId = parseInt(req.params.id);
      const userId = req.user.id;
      
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
        historyLength: conversationHistory.length,
        metadata: req.body.metadata
      });
      const aiResponse = await processChatMessage(
        sessionId,
        req.body.content,
        session.currentStep,
        session,
        conversationHistory
      );
      console.log("[Routes] OpenAI response received:", {
        step: aiResponse.step,
        hasData: !!aiResponse.data,
        hasMetadata: !!aiResponse.metadata,
        message: aiResponse.message.substring(0, 100) + '...'
      });

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
          
          // Store metadata in chatHistory for now
          if (aiResponse.metadata) {
            const currentHistory = session.chatHistory || [];
            currentHistory.push({ metadata: aiResponse.metadata });
            updateData.chatHistory = currentHistory;
          }
          
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

  app.get('/api/analysis/sessions/:id/messages', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({ message: "Session not found" });
      }

      const messages = await storage.getSessionChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Test endpoint for multi-agent analysis
  app.post('/api/test/multi-agent', jwtAuthMiddleware, async (req, res) => {
    try {
      console.log("[Test] Starting multi-agent test");
      const { products, features, targetCustomer } = req.body;
      
      if (!products || !features || !targetCustomer) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Use a test session ID
      const testSessionId = 999999;
      
      // Test the orchestrator directly
      const result = await orchestratorAgent.coordinateFullAnalysis(
        products,
        features,
        targetCustomer,
        (update) => {
          console.log(`[Test Progress] ${update.step}: ${update.message} (${update.progress}%)`);
        },
        testSessionId
      );
      
      res.json({
        success: true,
        message: "Multi-agent analysis completed",
        result
      });
    } catch (error) {
      console.error("[Test] Multi-agent error:", error);
      res.status(500).json({ 
        success: false,
        message: "Multi-agent test failed",
        error: error.message 
      });
    }
  });

  // Research and table generation routes
  app.post('/api/analysis/sessions/:id/research', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
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

  app.post('/api/analysis/sessions/:id/generate-table', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
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
  app.post('/api/analysis/sessions/:id/documents', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
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
  app.post('/api/feedback', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
  
  app.get('/api/feedback/session/:sessionId', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
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
  app.get('/api/admin/evaluations', jwtAuthMiddleware, async (req: any, res) => {
    try {
      // Check if user is admin (you might want to implement proper admin check)
      const userId = req.user.id;
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
  
  app.get('/api/admin/prompt-versions/:agentName', jwtAuthMiddleware, async (req: any, res) => {
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
  
  app.post('/api/admin/prompt-versions', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
  app.post('/api/admin/test-evaluation', jwtAuthMiddleware, async (req: any, res) => {
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

  // API endpoint for generating suggestions (simplified workflow)
  app.post('/api/chat/suggestions', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const { orchestratorAgent } = await import('./agents/orchestrator');
      
      const input = {
        mode: 'suggestions' as const,
        formData: req.body,
        sessionId: 0 // Temporary session ID for suggestions
      };
      
      const suggestions = await orchestratorAgent.processSuggestions(input);
      
      res.json({
        products: suggestions.suggestedProducts.map(p => p.name),
        features: suggestions.suggestedFeatures,
        targetCustomer: req.body.targetCustomers,
        interpretation: suggestions.productInterpretation
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({ message: 'Failed to generate suggestions' });
    }
  });

  // API endpoint for validating manual inputs (simplified workflow)
  app.post('/api/chat/validate-inputs', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const { orchestratorAgent } = await import('./agents/orchestrator');
      
      const input = {
        mode: 'validation' as const,
        product: req.body.product,
        benefit: req.body.benefit,
        existingData: req.body.existingData,
        sessionId: 0 // Temporary session ID for validation
      };
      
      const validation = await orchestratorAgent.validateManualInput(input);
      
      res.json({
        isValid: validation.isValid,
        validatedProduct: validation.correctedProduct || req.body.product,
        message: validation.message,
        suggestions: validation.suggestions
      });
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({ message: 'Failed to validate inputs' });
    }
  });

  // WebSocket debug endpoint
  app.get('/api/debug/websocket-status', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const status = webSocketService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      console.error('WebSocket status error:', error);
      res.status(500).json({ message: 'Failed to get WebSocket status' });
    }
  });

  // LangSmith test endpoint
  app.post('/api/debug/test-langsmith', jwtAuthMiddleware, async (req: any, res) => {
    try {
      console.log('[LangSmith Test] Starting test trace...');
      
      // Create a test workflow trace
      const testTrace = await langSmithService.createWorkflowTrace(99999, {
        products: ['Test Product A', 'Test Product B'],
        features: ['Feature 1', 'Feature 2'],
        targetCustomer: 'Test Customer Segment'
      });

      if (!testTrace) {
        return res.json({
          success: false,
          message: 'LangSmith is disabled (no API key configured)',
          isEnabled: langSmithService.isReady()
        });
      }

      // Create a test agent trace
      const agentTrace = await langSmithService.traceAgent(testTrace, {
        agentName: 'test-agent',
        sessionId: 99999,
        input: { testQuery: 'Sample test input for LangSmith verification' },
        output: { testResult: 'Sample test output - LangSmith is working!' },
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        metadata: { testType: 'manual-verification', timestamp: new Date().toISOString() }
      });

      // Complete the workflow with test metrics
      await langSmithService.completeWorkflowTrace(testTrace, {
        testResults: 'LangSmith integration test completed successfully',
        verificationStatus: 'passed'
      }, {
        accuracy: 0.95,
        completeness: 1.0,
        latency: 1000
      });

      // Test evaluation submission
      if (agentTrace) {
        await langSmithService.evaluateAgent(agentTrace, {
          accuracy: 0.95,
          completeness: 1.0,
          relevance: 0.9,
          performance: 0.85
        }, 'test-evaluator');
      }

      console.log('[LangSmith Test] Test trace completed successfully');

      res.json({
        success: true,
        message: 'LangSmith test completed successfully! Check your LangSmith dashboard.',
        isEnabled: langSmithService.isReady(),
        traceId: testTrace.id,
        projectName: process.env.LANGCHAIN_PROJECT || 'kanolens-multi-agent',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[LangSmith Test] Test failed:', error);
      res.status(500).json({
        success: false,
        message: 'LangSmith test failed',
        error: error.message,
        isEnabled: langSmithService.isReady()
      });
    }
  });

  // Export and sharing endpoints
  app.post('/api/analysis/sessions/:id/export/pdf', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!session.tableData) {
        return res.status(400).json({ message: "No analysis data available for export" });
      }

      // TODO: Implement PDF generation
      const { generatePDFReport } = await import('./export/pdf');
      const pdfBuffer = await generatePDFReport(session);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${session.title} - Report.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF export error:', error);
      res.status(500).json({ message: 'Failed to generate PDF report' });
    }
  });

  app.post('/api/analysis/sessions/:id/export/powerpoint', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!session.tableData) {
        return res.status(400).json({ message: "No analysis data available for export" });
      }

      // TODO: Implement PowerPoint generation
      const { generatePowerPointSlides } = await import('./export/powerpoint');
      const pptxBuffer = await generatePowerPointSlides(session);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${session.title} - Slides.pptx"`);
      res.send(pptxBuffer);
    } catch (error) {
      console.error('PowerPoint export error:', error);
      res.status(500).json({ message: 'Failed to generate PowerPoint slides' });
    }
  });

  app.post('/api/analysis/sessions/:id/share', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!session.tableData) {
        return res.status(400).json({ message: "No analysis data available for sharing" });
      }

      // TODO: Implement share link generation
      const { generateShareLink } = await import('./export/share');
      const shareData = await generateShareLink(session);

      res.json({
        shareUrl: shareData.url,
        expiresAt: shareData.expiresAt,
        shareId: shareData.shareId
      });
    } catch (error) {
      console.error('Share link error:', error);
      res.status(500).json({ message: 'Failed to create share link' });
    }
  });

  // Public share route (no authentication required)
  app.get('/share/:shareId', async (req: any, res) => {
    try {
      const { shareId } = req.params;
      const { getSharedAnalysis } = await import('./export/share');
      const sharedData = await getSharedAnalysis(shareId);

      if (!sharedData) {
        return res.status(404).json({ message: "Shared analysis not found or expired" });
      }

      res.json(sharedData);
    } catch (error) {
      console.error('Shared analysis error:', error);
      res.status(500).json({ message: 'Failed to load shared analysis' });
    }
  });

  // Force regeneration of existing session with fresh analysis
  app.post('/api/analysis/sessions/:id/regenerate', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      console.log(`[Regenerate] Starting fresh analysis for session ${sessionId}`);
      
      // Extract products and features from session
      const products = Array.isArray(session.products) ? session.products : [];
      const targetCustomer = session.targetCustomer || 'Product Managers';
      const features = session.features || ['User Interface', 'AI Code Assistance', 'Real-Time Collaboration'];
      
      if (products.length === 0) {
        return res.status(400).json({ message: "No products found in session to regenerate" });
      }
      
      // Reset session to in-progress state
      await storage.updateAnalysisSession(sessionId, {
        status: ANALYSIS_STATUS.IN_PROGRESS,
        currentStep: ANALYSIS_STEPS.DISCOVERY,
        tableData: null // Clear old fallback data
      });
      
      // Return immediately
      res.json({ message: "Regeneration started", sessionId });
      
      // Start fresh analysis in background
      setImmediate(async () => {
        try {
          console.log(`[Regenerate] Starting background analysis for session ${sessionId}`);
          
          const progressCallback = async (update: any) => {
            try {
              console.log(`[Regenerate] Progress - Step: ${update.step}, Progress: ${update.progress}%`);
              
              await storage.updateAnalysisSession(sessionId, {
                currentStep: update.step,
              });
              
              webSocketService.broadcastProgress(sessionId, {
                step: update.step,
                message: update.message,
                progress: update.progress,
                data: update.data,
                sessionId: sessionId
              });
            } catch (error) {
              console.error('[Regenerate] Failed to update progress:', error);
            }
          };

          // Call the FIXED orchestrator
          const result = await orchestratorAgent.coordinateFullAnalysis(
            products,
            features,
            targetCustomer,
            progressCallback,
            sessionId,
            'quick'
          );

          console.log(`[Regenerate] Analysis complete for session ${sessionId}`);

          // Update session with fresh results
          await storage.updateAnalysisSession(sessionId, {
            tableData: result.tableData,
            status: ANALYSIS_STATUS.COMPLETED,
            currentStep: ANALYSIS_STEPS.COMPLETED,
            sourceDocumentation: result.sourceDocumentation || null
          });

          // Broadcast completion
          webSocketService.broadcastComplete(sessionId, {
            tableData: result.tableData,
            analysis: result.analysis,
            status: ANALYSIS_STATUS.COMPLETED
          });

          console.log(`[Regenerate] Session ${sessionId} regenerated successfully`);

        } catch (error) {
          console.error(`[Regenerate] Failed for session ${sessionId}:`, error);
          
          try {
            await storage.updateAnalysisSession(sessionId, {
              status: ANALYSIS_STATUS.FAILED,
              currentStep: ANALYSIS_STEPS.ERROR
            });
            
            webSocketService.broadcastProgress(sessionId, {
              step: 'error',
              message: 'Analysis failed - please try again',
              progress: 0,
              data: { error: error.message },
              sessionId: sessionId
            });
          } catch (updateError) {
            console.error(`[Regenerate] Failed to update error status:`, updateError);
          }
        }
      });
      
    } catch (error) {
      console.error("Regenerate session error:", error);
      res.status(500).json({ message: "Failed to regenerate session" });
    }
  });

  // Note: /api/analysis/suggestions endpoint moved to routes/analysis.ts

  app.post('/api/analysis/start', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log(`[Analysis Start] Request from user ${userId}:`, {
        products: req.body.products,
        targetCustomer: req.body.targetCustomers || req.body.targetCustomer,
        features: req.body.features,
        analysisMode: req.body.analysisMode
      });
      
      // Validate input data
      if (!req.body.products || !Array.isArray(req.body.products) || req.body.products.length === 0) {
        return res.status(400).json({ 
          message: 'Products array is required and must not be empty',
          error: 'INVALID_PRODUCTS'
        });
      }

      if (!req.body.targetCustomers && !req.body.targetCustomer) {
        return res.status(400).json({ 
          message: 'Target customer is required',
          error: 'INVALID_TARGET_CUSTOMER'
        });
      }
      
      // Create a new analysis session
      const session = await storage.createAnalysisSession({
        userId,
        title: `Analysis ${new Date().toLocaleDateString()}`,
        status: ANALYSIS_STATUS.IN_PROGRESS,
        currentStep: ANALYSIS_STEPS.DISCOVERY,
        products: req.body.products || [],
        targetCustomer: req.body.targetCustomers || req.body.targetCustomer,
        features: req.body.features || [],
        chatHistory: []
      });

      console.log(`[Analysis Start] Session created: ${session.id}`);

      // Return session ID immediately to user
      res.json({ 
        sessionId: session.id,
        status: 'started',
        message: 'Analysis started successfully'
      });

      // Start the multi-agent analysis in background with isolated error handling
      setImmediate(() => {
        (async () => {
          try {
          console.log(`[DEBUG] About to call orchestrator for session: ${session.id}`);
          console.log(`[DEBUG] Orchestrator request data:`, {
            products: req.body.products || [],
            features: req.body.features || [],
            targetCustomer: req.body.targetCustomers || req.body.targetCustomer || '',
            analysisMode: req.body.analysisMode || 'quick'
          });
          // Progress callback to update session in real-time
          const progressCallback = async (update: any) => {
            try {
              console.log(`[Analysis] Progress update - Step: ${update.step}, Progress: ${update.progress}%, Message: ${update.message}`);
              
              // Update database with granular progress tracking
              const updateData: any = {
                currentStep: update.step
              };
              
              // Store granular research progress if available
              if (update.step === 'research' && update.data && update.data.currentProduct) {
                updateData.researchProgress = update.progress;
              }
              
              await storage.updateAnalysisSession(session.id, updateData);
              
              // Broadcast to WebSocket clients
              webSocketService.broadcastProgress(session.id, {
                step: update.step,
                message: update.message,
                progress: update.progress,
                data: update.data,
                sessionId: session.id
              });
            } catch (error) {
              console.error('[Analysis] Failed to update progress:', error);
            }
          };

          // Call orchestrator directly to coordinate full analysis
          console.log(`[Analysis] About to call orchestrator for session ${session.id}`);
          console.log(`[Analysis] Request data:`, {
            products: req.body.products || [],
            features: req.body.features || [],
            targetCustomer: req.body.targetCustomers || req.body.targetCustomer || '',
            analysisMode: req.body.analysisMode || 'quick'
          });
          
          // Add timeout to prevent hanging processes
          const analysisPromise = orchestratorAgent.coordinateFullAnalysis(
            req.body.products || [],
            req.body.features || [],
            req.body.targetCustomers || req.body.targetCustomer || '',
            progressCallback,
            session.id,
            req.body.analysisMode || 'quick' // Default to quick mode
          );
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Analysis timeout after 10 minutes')), 600000)
          );
          
          const result = await Promise.race([analysisPromise, timeoutPromise]);

          console.log(`[DEBUG] Orchestrator result for session ${session.id}:`, result);
          console.log(`[Analysis] Analysis complete for session ${session.id}`);

          // Update session with final results
          await storage.updateAnalysisSession(session.id, {
            tableData: result.tableData,
            status: ANALYSIS_STATUS.COMPLETED,
            currentStep: ANALYSIS_STEPS.COMPLETED,
            sourceDocumentation: result.sourceDocumentation || null
          }).catch(err => console.error('[Analysis] Failed to save completion:', err));

          // Broadcast completion to WebSocket clients
          webSocketService.broadcastComplete(session.id, {
            tableData: result.tableData,
            analysis: result.analysis,
            status: ANALYSIS_STATUS.COMPLETED
          });

          console.log(`[Analysis] Session ${session.id} marked as completed`);

        } catch (error) {
          console.error(`[CRITICAL] Orchestrator failed for session ${session.id}:`, error);
          console.error(`[CRITICAL] Error type:`, error.constructor.name);
          console.error(`[CRITICAL] Error message:`, error.message);
          console.error(`[CRITICAL] Stack trace:`, error.stack);
          
          // Categorize the error
          let errorCategory = 'unknown';
          let userMessage = 'Analysis failed due to an unexpected error';
          
          if (error.message?.includes('PERPLEXITY') || error.message?.includes('API')) {
            errorCategory = 'api_failure';
            userMessage = 'Analysis failed due to external service unavailability. Please try again later.';
          } else if (error.message?.includes('timeout')) {
            errorCategory = 'timeout';
            userMessage = 'Analysis timed out. Please try again with fewer products or features.';
          } else if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
            errorCategory = 'auth_failure';
            userMessage = 'Authentication error occurred. Please refresh and try again.';
          } else if (error.message?.includes('Database') || error.message?.includes('storage')) {
            errorCategory = 'storage_failure';
            userMessage = 'Database error occurred. Please try again later.';
          }
          
          try {
            // Mark session as failed with detailed error info
            await storage.updateAnalysisSession(session.id, {
              status: ANALYSIS_STATUS.FAILED,
              currentStep: ANALYSIS_STEPS.ERROR,
            });
            
            // Broadcast detailed error to WebSocket clients
            webSocketService.broadcastError(session.id, {
              message: userMessage,
              step: 'error',
              error: error.message,
              errorCategory: errorCategory,
              sessionId: session.id,
              timestamp: new Date().toISOString()
            });
            
            console.log(`[Analysis] Session ${session.id} marked as failed with category: ${errorCategory}`);
          } catch (updateError) {
            console.error(`[Analysis] Failed to update session ${session.id} status:`, updateError);
          }

          // NO FALLBACK - Analysis must complete with real data or fail completely
          console.error(`[Analysis] Analysis failed completely for session ${session.id} - no fallback available`);
        }
        })().catch(bgError => {
          console.error(`[Background] Unhandled error in background analysis for session ${session.id}:`, bgError);
        });
      });

    } catch (error) {
      console.error('Start analysis error:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Check if this is a session creation error vs background process error
      if (error.message?.includes('createAnalysisSession') || error.message?.includes('database')) {
        res.status(500).json({ 
          message: 'Failed to create analysis session',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } else {
        // Don't return 500 for background process errors - session was created successfully
        console.error('[Analysis] Background process error - session creation succeeded but analysis may fail');
        if (!res.headersSent) {
          res.json({ 
            sessionId: null, // We don't have session ID in this catch block
            status: 'error',
            message: 'Failed to start analysis process'
          });
        }
      }
    }
  });

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
        [ANALYSIS_STEPS.TABLE_CREATION]: ANALYSIS_STEPS.ANALYSIS,  // Map table_creation to analysis for frontend
        [ANALYSIS_STEPS.ANALYSIS]: ANALYSIS_STEPS.ANALYSIS,
        [ANALYSIS_STEPS.COMPLETED]: ANALYSIS_STEPS.COMPLETED,
        [ANALYSIS_STEPS.ERROR]: ANALYSIS_STEPS.ERROR,
        'failed': ANALYSIS_STEPS.ERROR
      };

      // Calculate progress based on status first, then step using orchestrator's percentages
      let progress = 20; // Default for discovery (matches orchestrator)
      if (session.status === ANALYSIS_STATUS.COMPLETED) {
        progress = 100;
      } else if (session.status === ANALYSIS_STATUS.FAILED) {
        progress = 0;
      } else {
        // Calculate dynamic progress based on actual session state
        switch (session.currentStep) {
          case ANALYSIS_STEPS.DISCOVERY:
            progress = 20;
            break;
          case ANALYSIS_STEPS.RESEARCH:
            // Check if research has additional progress data
            progress = session.researchProgress || 30;
            break;
          case ANALYSIS_STEPS.CATEGORIZATION:
            progress = 60;
            break;
          case ANALYSIS_STEPS.TABLE_CREATION:
            progress = 80;
            break;
          case ANALYSIS_STEPS.ANALYSIS:
            progress = 90;
            break;
          default:
            progress = 20;
        }
      }

      res.json({
        currentStep: stepMap[session.currentStep as keyof typeof stepMap] || 'discovery',
        status: session.status,
        progress: progress
      });
    } catch (error) {
      console.error('Progress check error:', error);
      res.status(500).json({ message: 'Failed to check progress' });
    }
  });

  // Debug endpoint to check user sessions
  app.get('/api/debug/user-sessions', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getUserAnalysisSessions(userId);
      
      // For now, just show user sessions
      const allSessions = sessions;
      
      res.json({
        currentUser: {
          id: userId,
          idType: typeof userId,
          email: req.user.email,
          fullUser: req.user
        },
        userSessions: {
          count: sessions.length,
          sessions: sessions.slice(0, 5).map(s => ({
            id: s.id,
            userId: s.userId,
            userIdType: typeof s.userId,
            title: s.title,
            userIdMatches: s.userId === userId
          }))
        },
        allSessionsSample: allSessions.slice(0, 5).map(s => ({
          id: s.id,
          userId: s.userId,
          userIdType: typeof s.userId,
          title: s.title
        }))
      });
    } catch (error) {
      console.error('Debug user sessions error:', error);
      res.status(500).json({ message: 'Failed to debug user sessions' });
    }
  });

  // Debug endpoint for agent flow analysis
  app.post('/api/analysis/debug', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { products, targetCustomer } = req.body;

      if (!products || !targetCustomer) {
        return res.status(400).json({ message: 'Products and target customer are required' });
      }

      console.log('[Debug] Starting debug analysis for:', { products, targetCustomer });

      // Track all agent steps with detailed information
      const debugSteps: any[] = [];
      let stepCounter = 0;

      // Helper to record each agent step
      const recordStep = (agent: string, instruction: string, input?: any, output?: any, error?: string) => {
        const step = {
          agent,
          instruction,
          input,
          output,
          timestamp: new Date().toISOString(),
          status: error ? 'error' : 'completed',
          error,
          duration: Math.floor(Math.random() * 2000) + 500 // Mock duration for now
        };
        debugSteps.push(step);
        console.log(`[Debug] Step ${++stepCounter}: ${agent} - ${step.status}`);
        return step;
      };

      // Record orchestrator step
      recordStep(
        'orchestrator',
        'Coordinate multi-agent analysis workflow',
        { products, targetCustomer },
        { action: 'Initiating research phase' }
      );

      try {
        console.log('[Debug] Calling orchestrator with:', { 
          products, 
          targetCustomer, 
          featuresLength: 0,
          sessionId: -1,
          mode: 'quick'
        });
        
        // Run actual orchestrator analysis with detailed tracking
        const result = await orchestratorAgent.coordinateFullAnalysis(
          products,
          [], // Empty features for debug
          targetCustomer,
          (update: any) => {
            console.log('[Debug] Progress callback received:', update);
            recordStep(
              update.agent || 'progress',
              `Progress update: ${update.message}`,
              { step: update.step, progress: update.progress },
              { message: update.message, data: update.data }
            );
          },
          -1, // Debug session ID
          'quick' // Use quick mode for debug
        );

        // Record final result
        recordStep(
          'orchestrator',
          'Complete analysis coordination',
          { analysisMode: 'debug' },
          { 
            tableData: result.tableData, 
            analysis: result.analysis,
            featuresCount: result.tableData?.features?.length || 0,
            productsCount: result.tableData?.products?.length || 0
          }
        );

        res.json({
          sessionId: -1,
          steps: debugSteps,
          finalResult: result,
          environmentTest: {
            PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
            perplexityPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 12) + '...',
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
            NODE_ENV: process.env.NODE_ENV
          }
        });

      } catch (analysisError) {
        console.error('[Debug] Analysis error:', analysisError);
        recordStep(
          'orchestrator',
          'Analysis failed',
          { products, targetCustomer },
          null,
          analysisError.message
        );

        res.json({
          sessionId: -1,
          steps: debugSteps,
          finalResult: null,
          error: analysisError.message
        });
      }

    } catch (error) {
      console.error('[Debug] Debug endpoint error:', error);
      res.status(500).json({ 
        message: 'Debug analysis failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Comprehensive agent testing endpoint
  app.post('/api/analysis/test', jwtAuthMiddleware, async (req: any, res) => {
    try {
      console.log('[Test] Starting comprehensive agent testing...');
      
      // Test environment first
      const envTest = {
        agent: 'environment',
        test: 'Environment Variables Check',
        status: 'pass' as const,
        input: 'Environment variable check',
        output: {
          PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
          ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
          DATABASE_URL: !!process.env.DATABASE_URL,
          NODE_ENV: process.env.NODE_ENV
        },
        duration: 1,
        details: {
          perplexityKeyPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 8) + '...',
          openaiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 8) + '...'
        }
      };

      // Test Perplexity API directly
      let perplexityTest;
      try {
        console.log('[Test] Testing Perplexity API...');
        const startTime = Date.now();
        
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant. Be concise.'
              },
              {
                role: 'user',
                content: 'What are the main features of Notion? List 3 key features.'
              }
            ],
            max_tokens: 200,
            temperature: 0.2
          })
        });

        const data = await response.json();
        
        perplexityTest = {
          agent: 'perplexity',
          test: 'Direct Perplexity API Call',
          status: response.ok ? 'pass' as const : 'fail' as const,
          input: 'Test query about Notion features',
          output: response.ok ? data : null,
          error: !response.ok ? `HTTP ${response.status}: ${data.error || 'Unknown error'}` : undefined,
          duration: Date.now() - startTime,
          details: {
            responseStatus: response.status,
            contentLength: data.choices?.[0]?.message?.content?.length || 0,
            citations: data.citations?.length || 0,
            searchResults: data.search_results?.length || 0
          }
        };
      } catch (error) {
        perplexityTest = {
          agent: 'perplexity',
          test: 'Direct Perplexity API Call',
          status: 'error' as const,
          error: error.message,
          duration: 0
        };
      }

      const testResults = [envTest, perplexityTest];
      const passed = testResults.filter(r => r.status === 'pass').length;
      const failed = testResults.filter(r => r.status === 'fail').length;
      const errors = testResults.filter(r => r.status === 'error').length;

      const summary = {
        total: testResults.length,
        passed,
        failed,
        errors,
        success: failed === 0 && errors === 0
      };

      res.json({
        summary,
        testResults,
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
          hasOpenAIKey: !!process.env.OPENAI_API_KEY,
          perplexityKeyPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 8) + '...',
          openaiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 8) + '...'
        }
      });
    } catch (error) {
      console.error('[Test] Comprehensive testing failed:', error);
      res.status(500).json({
        message: 'Comprehensive testing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Comprehensive Perplexity API connection test
  app.post('/api/debug/test-perplexity', jwtAuthMiddleware, async (req: any, res) => {
    try {
      console.log('[Debug] Testing Perplexity API connection and configuration...');
      
      const tests = [];
      
      // Test 1: Environment Configuration
      const envTest = {
        test: 'Environment Configuration',
        status: 'pass',
        details: {
          hasApiKey: !!process.env.PERPLEXITY_API_KEY,
          keyPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 12) + '***' || 'Not configured',
          keyLength: process.env.PERPLEXITY_API_KEY?.length || 0
        }
      };
      
      if (!process.env.PERPLEXITY_API_KEY) {
        envTest.status = 'fail';
        envTest.details.error = 'PERPLEXITY_API_KEY not configured';
      }
      
      tests.push(envTest);
      
      // Test 2: Basic API Connection
      if (process.env.PERPLEXITY_API_KEY) {
        const { query = 'What are the main features of Notion? List 3 key features.' } = req.body;
        const startTime = Date.now();
        
        try {
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful research assistant. Provide detailed, factual information with sources when possible.'
                },
                {
                  role: 'user',
                  content: query
                }
              ],
              max_tokens: 500,
              temperature: 0.2
            })
          });

          const data = await response.json();
          const duration = Date.now() - startTime;
          
          const apiTest = {
            test: 'API Connection',
            status: response.ok ? 'pass' : 'fail',
            details: {
              status: response.status,
              duration,
              responseSize: JSON.stringify(data).length,
              hasContent: !!data.choices?.[0]?.message?.content,
              contentLength: data.choices?.[0]?.message?.content?.length || 0,
              hasCitations: !!data.citations,
              citationCount: data.citations?.length || 0,
              query
            }
          };
          
          if (!response.ok) {
            apiTest.details.error = `HTTP ${response.status}`;
            apiTest.details.apiError = data;
          } else {
            apiTest.details.content = data.choices?.[0]?.message?.content?.substring(0, 200) + '...';
          }
          
          tests.push(apiTest);
        } catch (apiError) {
          tests.push({
            test: 'API Connection',
            status: 'fail',
            details: {
              error: 'Network or parsing error',
              message: apiError.message,
              stack: apiError.stack
            }
          });
        }
      }
      
      // Test 3: Rate Limiting Check
      const rateLimitTest = {
        test: 'Rate Limiting',
        status: 'info',
        details: {
          message: 'Rate limiting configured with 10 requests per minute',
          strategy: 'Built-in rate limiter in researcher agent'
        }
      };
      tests.push(rateLimitTest);
      
      // Determine overall status
      const hasFailures = tests.some(test => test.status === 'fail');
      const overallStatus = hasFailures ? 'fail' : 'pass';
      
      console.log('[Debug] Perplexity API test completed:', { overallStatus, testCount: tests.length });
      
      res.json({
        status: overallStatus,
        message: hasFailures ? 'Perplexity API tests failed' : 'Perplexity API connection healthy',
        tests,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Debug] Perplexity test failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Perplexity test framework error',
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Simple Perplexity test endpoint - bypass all agent complexity (legacy endpoint)
  app.post('/api/perplexity-simple', jwtAuthMiddleware, async (req: any, res) => {
    try {
      console.log('[Perplexity-Simple] Testing direct Perplexity API call...');
      
      const { query = 'What are the main features of Notion? List 3 key features.' } = req.body;
      const startTime = Date.now();
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful research assistant. Provide detailed, factual information with sources when possible.'
            },
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: 500,
          temperature: 0.2
        })
      });

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      console.log('[Perplexity-Simple] Response received:', {
        status: response.status,
        contentLength: data.choices?.[0]?.message?.content?.length || 0,
        duration
      });

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          error: `Perplexity API error: ${response.status}`,
          details: data,
          duration
        });
      }

      res.json({
        success: true,
        query,
        response: data.choices?.[0]?.message?.content || 'No content received',
        fullResponse: data,
        metadata: {
          duration,
          citations: data.citations?.length || 0,
          searchResults: data.search_results?.length || 0,
          model: 'sonar',
          timestamp: new Date().toISOString()
        },
        environment: {
          hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
          keyPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 12) + '...'
        }
      });

    } catch (error) {
      console.error('[Perplexity-Simple] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test Perplexity API',
        details: error.message,
        environment: {
          hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
          keyPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 12) + '...'
        }
      });
    }
  });

  // Add debug endpoint to test orchestrator
  app.post('/api/debug/test-orchestrator', jwtAuthMiddleware, async (req, res) => {
    try {
      console.log('[Debug] Testing orchestrator directly...');
      
      const testRequest = {
        products: req.body.products || ['TestProduct'],
        features: req.body.features || [],
        targetCustomer: req.body.targetCustomer || 'Test Customer',
        analysisMode: req.body.analysisMode || 'quick'
      };
      
      console.log('[Debug] Test request:', testRequest);
      
      const progressUpdates = [];
      const callbacks = {
        onProgress: (update) => {
          console.log('[Debug] Progress:', update);
          progressUpdates.push(update);
        },
        onComplete: (result) => {
          console.log('[Debug] Complete:', result);
        },
        onError: (error) => {
          console.error('[Debug] Error:', error);
        }
      };
      
      console.log('[Debug] About to call orchestrator.coordinateFullAnalysis...');
      const startTime = Date.now();
      
      const result = await orchestratorAgent.coordinateFullAnalysis(
        testRequest.products,
        testRequest.features,
        testRequest.targetCustomer,
        callbacks.onProgress,
        -1, // test session ID
        testRequest.analysisMode
      );
      
      const duration = Date.now() - startTime;
      console.log('[Debug] Orchestrator completed successfully in', duration, 'ms');
      
      res.json({ 
        status: 'success', 
        message: 'Orchestrator test completed',
        duration,
        progressUpdates,
        result: {
          hasTableData: !!result?.tableData,
          tableDataLength: result?.tableData?.length || 0,
          hasSourceDocs: !!result?.sourceDocumentation,
          analysis: result?.analysis || null
        }
      });
      
    } catch (error) {
      console.error('[Debug] Orchestrator test failed:', error);
      console.error('[Debug] Error type:', error.constructor.name);
      console.error('[Debug] Error stack:', error.stack);
      
      res.status(500).json({ 
        status: 'error', 
        message: error.message,
        errorType: error.constructor.name,
        stack: error.stack 
      });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server - temporarily disabled to debug port conflicts
  try {
    webSocketService.initialize(httpServer);
    console.log('[WebSocket] Successfully initialized');
  } catch (error) {
    console.error('[WebSocket] Failed to initialize, continuing without WebSocket:', error.message);
  }
  
  return httpServer;
}

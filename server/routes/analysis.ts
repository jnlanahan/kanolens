// Analysis execution routes
import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuthMiddleware } from "../middleware/jwt-auth";
import { sessionCacheMiddleware } from "../middleware/session-cache";
import { conductCompetitiveResearch, generateKanoTable } from "../openai";
import { ANALYSIS_STEPS, ANALYSIS_STATUS } from "@shared/schema";
import { orchestratorAgent } from "../agents/orchestrator";
import { validatorAgent } from "../agents/validator";
import { analystAgent } from "../agents/analyst";
import { evaluatorAgent } from "../agents/evaluator";
import { titleGeneratorService } from "../services/title-generator";

export function setupAnalysisRoutes(app: Express): void {
  // Research endpoint for manual research triggering
  app.post('/api/analysis/sessions/:id/research', jwtAuthMiddleware, sessionCacheMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = req.analysisSession; // Use cached session

      const { products, userProduct } = req.body;
      const research = await conductCompetitiveResearch(products, userProduct);

      // Update session with research results
      await storage.updateAnalysisSession(sessionId, {
        features: research.features,
        sourceDocumentation: research.sources,
        currentStep: 'research'
      });

      res.json({ research });
    } catch (error) {
      console.error("Research error:", error);
      res.status(500).json({ message: "Failed to conduct research" });
    }
  });

  // Table generation endpoint
  app.post('/api/analysis/sessions/:id/generate-table', jwtAuthMiddleware, sessionCacheMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = req.analysisSession; // Use cached session

      const { features, products, userProduct } = req.body;
      const tableData = await generateKanoTable(features, products, userProduct);

      // Update session with table data
      await storage.updateAnalysisSession(sessionId, {
        tableData,
        currentStep: 'analysis',
        status: 'completed'
      });

      res.json({ tableData });
    } catch (error) {
      console.error("Table generation error:", error);
      res.status(500).json({ message: "Failed to generate table" });
    }
  });

  // Regenerate analysis for existing session
  app.post('/api/analysis/sessions/:id/regenerate', jwtAuthMiddleware, sessionCacheMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = req.analysisSession; // Use cached session
      
      console.log(`[Regenerate] Starting fresh analysis for session ${sessionId}`);
      
      // Extract products and features from session
      const products = Array.isArray(session.products) ? session.products : [];
      const targetCustomer = session.targetCustomer || 'Product Managers';
      const features = session.features || ['User Interface', 'AI Code Assistance', 'Real-Time Collaboration'];
      
      console.log(`[Regenerate] Analyzing: ${products.join(', ')} for ${targetCustomer}`);
      
      // Clear previous analysis data
      await storage.updateAnalysisSession(sessionId, {
        tableData: null,
        currentStep: ANALYSIS_STEPS.DISCOVERY,
        status: ANALYSIS_STATUS.IN_PROGRESS,
      });
      
      // Use orchestrator for comprehensive analysis
      const progressCallback = async (update: any) => {
        console.log(`[Regenerate] Progress update for session ${sessionId}:`, update);
        // Update session with progress
        await storage.updateAnalysisSession(sessionId, {
          currentStep: update.step,
          status: 'in_progress'
        });
      };

      const result = await orchestratorAgent.coordinateFullAnalysis(
        products,
        features,
        targetCustomer,
        progressCallback,
        sessionId
      );

      if (result.success) {
        // Update session with final results
        await storage.updateAnalysisSession(sessionId, {
          tableData: result.data.kanoTableData,
          researchData: result.data.researchData,
          validationResults: result.data.validationResults,
          currentStep: ANALYSIS_STEPS.TABLE_CREATION,
          status: ANALYSIS_STATUS.COMPLETED,
        });

        console.log(`[Regenerate] Analysis completed successfully for session ${sessionId}`);
        res.json({ 
          success: true, 
          message: "Analysis regenerated successfully",
          data: result.data
        });
      } else {
        console.error(`[Regenerate] Analysis failed for session ${sessionId}:`, result.error);
        res.status(500).json({ 
          success: false, 
          message: "Analysis regeneration failed",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Regenerate analysis error:", error);
      res.status(500).json({ message: "Failed to regenerate analysis" });
    }
  });

  // Test validator agent directly
  app.post('/api/analysis/test-validator', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const { researchData, targetCustomer } = req.body;
      
      console.log('[Test] Testing validator with research data');
      
      const result = await validatorAgent.validateResearch(researchData || {
        products: [
          {
            name: 'Slack',
            features: [
              {
                name: 'Messaging',
                description: 'Real-time chat functionality',
                benefit: 'Team communication',
                implementationDetails: 'WebSocket-based messaging'
              }
            ]
          }
        ]
      });
      
      res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('[Test] Validator test failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Test orchestrator directly
  app.post('/api/analysis/test-orchestrator', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const { products, features, targetCustomer } = req.body;
      
      console.log('[Test] Testing orchestrator with:', { products, features, targetCustomer });
      
      const progressUpdates: any[] = [];
      const progressCallback = async (update: any) => {
        console.log('[Test] Progress update:', update);
        progressUpdates.push(update);
      };
      
      const result = await orchestratorAgent.coordinateFullAnalysis(
        products,
        features || ['Test Feature'],
        targetCustomer || 'Test Customer',
        progressCallback,
        999 // test session ID
      );
      
      res.json({
        success: true,
        result,
        progressUpdates
      });
    } catch (error) {
      console.error('[Test] Orchestrator test failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Generate suggestions (linear flow)
  app.post('/api/analysis/suggestions', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const input = {
        mode: 'suggestions' as const,
        formData: req.body,
        sessionId: 0 // Temporary session ID for suggestions
      };
      
      const suggestions = await orchestratorAgent.processSuggestions(input);
      
      res.json({
        productInterpretation: suggestions.productInterpretation,
        suggestedProducts: suggestions.suggestedProducts,
        suggestedFeatures: suggestions.suggestedFeatures
      });
    } catch (error) {
      console.error("Suggestions error:", error);
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  // Note: /api/analysis/start endpoint moved to routes.ts for better validation

  // Debug analysis endpoint
  app.post('/api/analysis/debug', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { products, targetCustomer } = req.body;

      if (!products || !targetCustomer) {
        return res.status(400).json({ message: 'Products and target customer are required' });
      }

      console.log('[Debug] Starting debug analysis for:', { products, targetCustomer });

      // Create temporary debug session
      const debugSession = await storage.createAnalysisSession({
        userId,
        title: `Debug Analysis - ${products.join(', ')}`,
        status: ANALYSIS_STATUS.IN_PROGRESS,
        currentStep: ANALYSIS_STEPS.DISCOVERY,
        products: Array.isArray(products) ? products : [products],
        targetCustomer,
        userProduct: 'Debug Product'
      });

      // Run debug analysis
      const progressCallback = async (update: any) => {
        console.log(`[Debug] Progress update for session ${debugSession.id}:`, update);
        // Update session with progress
        await storage.updateAnalysisSession(debugSession.id, {
          currentStep: update.step,
          status: 'in_progress'
        });
      };

      const result = await orchestratorAgent.coordinateFullAnalysis(
        debugSession.products,
        ['Feature Analysis', 'Competitive Research', 'Market Position'],
        targetCustomer,
        progressCallback,
        debugSession.id
      );

      res.json({
        debug: true,
        sessionId: debugSession.id,
        products,
        targetCustomer,
        result: result.success ? result.data : { error: result.error }
      });
    } catch (error) {
      console.error('Debug analysis error:', error);
      res.status(500).json({ message: 'Debug analysis failed' });
    }
  });

  // Multi-agent test endpoint
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
      const progressCallback = async (update: any) => {
        console.log(`[MultiAgentTest] Progress update:`, update);
      };

      const result = await orchestratorAgent.coordinateFullAnalysis(
        products,
        features,
        targetCustomer,
        progressCallback,
        testSessionId
      );

      res.json({
        test: 'multi-agent',
        input: { products, features, targetCustomer },
        result: result.success ? result.data : { error: result.error },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Multi-agent test error:", error);
      res.status(500).json({ message: "Multi-agent test failed" });
    }
  });

  // Comprehensive analysis test endpoint
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
        timestamp: new Date().toISOString(),
        duration: 0
      };

      // Test each agent component
      const tests = [envTest];
      
      // Add orchestrator test
      try {
        const testProducts = ['TestProduct1', 'TestProduct2'];
        const testFeatures = ['Feature1', 'Feature2'];
        const testCustomer = 'Product Managers';
        
        const progressCallback = async (update: any) => {
          console.log(`[ComprehensiveTest] Progress update:`, update);
        };

        const startTime = Date.now();
        const orchestratorResult = await orchestratorAgent.coordinateFullAnalysis(
          testProducts,
          testFeatures,
          testCustomer,
          progressCallback,
          999998 // Test session ID
        );
        const duration = Date.now() - startTime;

        tests.push({
          agent: 'orchestrator',
          test: 'Full Analysis Coordination',
          status: orchestratorResult.success ? 'pass' as const : 'fail' as const,
          input: { products: testProducts, features: testFeatures, targetCustomer: testCustomer },
          output: orchestratorResult.success ? 'Analysis completed' : orchestratorResult.error,
          timestamp: new Date().toISOString(),
          duration
        });
      } catch (error) {
        tests.push({
          agent: 'orchestrator',
          test: 'Full Analysis Coordination',
          status: 'fail' as const,
          input: 'Orchestrator test',
          output: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          duration: 0
        });
      }

      const summary = {
        total: tests.length,
        passed: tests.filter(t => t.status === 'pass').length,
        failed: tests.filter(t => t.status === 'fail').length,
        timestamp: new Date().toISOString()
      };

      res.json({
        summary,
        tests,
        success: summary.failed === 0
      });
    } catch (error) {
      console.error('Analysis test error:', error);
      res.status(500).json({ message: 'Analysis testing failed' });
    }
  });

  // Title generation endpoint
  app.post('/api/analysis/generate-title', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const { products, description, targetCustomers, role } = req.body;

      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: 'Products array is required' });
      }

      const generatedTitle = await titleGeneratorService.generateSmartTitle({
        products,
        description,
        targetCustomers,
        role
      });

      const titleWithDate = titleGeneratorService.generateTitleWithDate(generatedTitle);

      res.json({
        title: generatedTitle,
        titleWithDate,
        success: true
      });
    } catch (error) {
      console.error('Title generation error:', error);
      res.status(500).json({ message: 'Failed to generate title' });
    }
  });

  // Update session title endpoint
  app.put('/api/analysis/sessions/:id/title', jwtAuthMiddleware, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { title } = req.body;
      
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ message: 'Title is required' });
      }

      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({ message: "Session not found" });
      }

      const updatedSession = await storage.updateAnalysisSession(sessionId, {
        title: title.trim()
      });

      res.json({
        session: updatedSession,
        success: true
      });
    } catch (error) {
      console.error('Title update error:', error);
      res.status(500).json({ message: 'Failed to update title' });
    }
  });
}

// Helper function to validate analysis request
export function validateAnalysisRequest(req: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!req.body.products || !Array.isArray(req.body.products) || req.body.products.length === 0) {
    errors.push('Products array is required and must not be empty');
  }
  
  if (!req.body.targetCustomer || typeof req.body.targetCustomer !== 'string') {
    errors.push('Target customer is required and must be a string');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
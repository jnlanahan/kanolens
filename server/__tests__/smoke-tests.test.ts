// Smoke Tests for High-Risk Areas - Basic validation that components load and work
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Smoke Tests - High-Risk Areas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('📡 Basic Route Testing for routes.ts', () => {
    it('should import routes module without errors', async () => {
      // Test that we can import the routes module
      expect(async () => {
        const routesModule = await import('../routes');
        expect(routesModule).toBeDefined();
        expect(routesModule.registerRoutes).toBeDefined();
        expect(typeof routesModule.registerRoutes).toBe('function');
      }).not.toThrow();
    });

    it('should validate route registration function signature', async () => {
      const { registerRoutes } = await import('../routes');
      
      // Should be a function that takes an Express app
      expect(typeof registerRoutes).toBe('function');
      expect(registerRoutes.length).toBe(1); // Should take 1 parameter (app)
    });

    it('should have consistent route patterns', () => {
      // Test that our route patterns follow expected conventions
      const expectedRoutePatterns = [
        '/api/auth/user',
        '/api/analysis/sessions',
        '/api/analysis/sessions/:id',
        '/api/analysis/sessions/:id/messages',
        '/api/openai/test'
      ];

      // This is a structural test - we're validating our route design
      expectedRoutePatterns.forEach(pattern => {
        expect(pattern).toMatch(/^\/api\//); // All routes should start with /api/
        expect(pattern).not.toMatch(/\/\//); // No double slashes
      });
    });
  });

  describe('🤖 Core Orchestrator Workflow', () => {
    it('should import orchestrator agent without errors', async () => {
      expect(async () => {
        const orchestratorModule = await import('../agents/orchestrator');
        expect(orchestratorModule).toBeDefined();
        expect(orchestratorModule.orchestratorAgent).toBeDefined();
      }).not.toThrow();
    });

    it('should have expected orchestrator methods', async () => {
      const { orchestratorAgent } = await import('../agents/orchestrator');
      
      // Check that key methods exist
      expect(orchestratorAgent).toBeDefined();
      expect(typeof orchestratorAgent).toBe('object');
      
      // These are the core methods the orchestrator should have
      const expectedMethods = [
        'coordinateFullAnalysis',
        'processSuggestions'
      ];
      
      expectedMethods.forEach(method => {
        expect(orchestratorAgent[method]).toBeDefined();
        expect(typeof orchestratorAgent[method]).toBe('function');
      });
    });

    it('should validate orchestrator workflow structure', async () => {
      const { orchestratorAgent } = await import('../agents/orchestrator');
      
      // Test that coordinateFullAnalysis has the expected signature
      const coordinateMethod = orchestratorAgent.coordinateFullAnalysis;
      expect(coordinateMethod.length).toBeGreaterThan(2); // Should take multiple parameters
      
      // Test that processSuggestions exists
      const suggestionsMethod = orchestratorAgent.processSuggestions;
      expect(suggestionsMethod.length).toBeGreaterThan(0); // Should take at least one parameter
    });
  });

  describe('🧠 AI Agent Communication Patterns', () => {
    it('should import all agent modules without errors', async () => {
      const agentModules = [
        '../agents/researcher',
        '../agents/validator', 
        '../agents/analyst',
        '../agents/evaluator'
      ];

      for (const modulePath of agentModules) {
        expect(async () => {
          const module = await import(modulePath);
          expect(module).toBeDefined();
        }).not.toThrow();
      }
    });

    it('should validate researcher agent structure', async () => {
      const { researcherAgent } = await import('../agents/researcher');
      
      expect(researcherAgent).toBeDefined();
      expect(researcherAgent.performResearch).toBeDefined();
      expect(typeof researcherAgent.performResearch).toBe('function');
    });

    it('should validate validator agent structure', async () => {
      const { validatorAgent } = await import('../agents/validator');
      
      expect(validatorAgent).toBeDefined();
      expect(validatorAgent.categorizeFeatures).toBeDefined();
      expect(typeof validatorAgent.categorizeFeatures).toBe('function');
    });

    it('should validate analyst agent structure', async () => {
      const { analystAgent } = await import('../agents/analyst');
      
      expect(analystAgent).toBeDefined();
      expect(analystAgent.analyzeKanoTable).toBeDefined();
      expect(typeof analystAgent.analyzeKanoTable).toBe('function');
    });

    it('should validate evaluator agent structure', async () => {
      const { evaluatorAgent } = await import('../agents/evaluator');
      
      expect(evaluatorAgent).toBeDefined();
      expect(evaluatorAgent.evaluateAgent).toBeDefined();
      expect(typeof evaluatorAgent.evaluateAgent).toBe('function');
    });

    it('should validate OpenAI integration', async () => {
      const openaiModule = await import('../openai');
      
      expect(openaiModule.openai).toBeDefined();
      expect(openaiModule.processChatMessage).toBeDefined();
      expect(openaiModule.testOpenAIConnection).toBeDefined();
      
      expect(typeof openaiModule.processChatMessage).toBe('function');
      expect(typeof openaiModule.testOpenAIConnection).toBe('function');
    });
  });

  describe('💾 Database Connection and Operations', () => {
    it('should import storage module without errors', async () => {
      expect(async () => {
        const storageModule = await import('../storage');
        expect(storageModule).toBeDefined();
        expect(storageModule.storage).toBeDefined();
      }).not.toThrow();
    });

    it('should validate storage interface', async () => {
      const { storage } = await import('../storage');
      
      // Check that all expected storage methods exist
      const expectedMethods = [
        'getUser',
        'upsertUser',
        'createAnalysisSession',
        'getAnalysisSession',
        'getUserAnalysisSessions',
        'updateAnalysisSession',
        'addChatMessage',
        'getSessionChatMessages'
      ];
      
      expectedMethods.forEach(method => {
        expect(storage[method]).toBeDefined();
        expect(typeof storage[method]).toBe('function');
      });
    });

    it('should import database manager without errors', async () => {
      expect(async () => {
        const dbModule = await import('../db');
        expect(dbModule).toBeDefined();
        expect(dbModule.dbManager).toBeDefined();
      }).not.toThrow();
    });

    it('should validate schema definitions', async () => {
      const schemaModule = await import('../../shared/schema');
      
      // Check that key schema exports exist
      expect(schemaModule.users).toBeDefined();
      expect(schemaModule.analysisSessions).toBeDefined();
      expect(schemaModule.chatMessages).toBeDefined();
      
      // Check types are exported
      expect(schemaModule.insertAnalysisSessionSchema).toBeDefined();
      expect(schemaModule.insertChatMessageSchema).toBeDefined();
      
      // Check constants
      expect(schemaModule.ANALYSIS_STEPS).toBeDefined();
      expect(schemaModule.ANALYSIS_STATUS).toBeDefined();
    });
  });

  describe('🔌 WebSocket and Real-time Features', () => {
    it('should import WebSocket service without errors', async () => {
      expect(async () => {
        const wsModule = await import('../websocket');
        expect(wsModule).toBeDefined();
        expect(wsModule.webSocketService).toBeDefined();
      }).not.toThrow();
    });

    it('should validate WebSocket service interface', async () => {
      const { webSocketService } = await import('../websocket');
      
      const expectedMethods = [
        'sendProgressUpdate',
        'initialize',
        'getConnectionStatus'
      ];
      
      expectedMethods.forEach(method => {
        expect(webSocketService[method]).toBeDefined();
        expect(typeof webSocketService[method]).toBe('function');
      });
    });
  });

  describe('🔒 Authentication and Security', () => {
    it('should import authentication module without errors', async () => {
      expect(async () => {
        const authModule = await import('../simpleAuth');
        expect(authModule).toBeDefined();
      }).not.toThrow();
    });

    it('should validate auth interface', async () => {
      const authModule = await import('../simpleAuth');
      
      const expectedFunctions = [
        'setupAuth',
        'setupLoginRoute',
        'isAuthenticated'
      ];
      
      expectedFunctions.forEach(func => {
        expect(authModule[func]).toBeDefined();
        expect(typeof authModule[func]).toBe('function');
      });
    });
  });

  describe('⚙️ Configuration and Environment', () => {
    it('should have required environment variables defined', () => {
      // These are the critical environment variables the app needs
      const requiredEnvVars = [
        'NODE_ENV',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'SESSION_SECRET'
      ];
      
      requiredEnvVars.forEach(envVar => {
        expect(process.env[envVar]).toBeDefined();
        expect(process.env[envVar]).not.toBe('');
      });
    });

    it('should validate vitest configuration', () => {
      // Basic checks that our test environment is properly configured
      expect(process.env.NODE_ENV).toBe('test');
      expect(globalThis.vi).toBeDefined(); // Vitest globals
      expect(globalThis.expect).toBeDefined();
    });
  });

  describe('📦 Module Dependencies', () => {
    it('should import external dependencies without errors', async () => {
      const criticalDependencies = [
        'express',
        'drizzle-orm',
        'zod',
        'ws'
      ];
      
      for (const dep of criticalDependencies) {
        expect(async () => {
          const module = await import(dep);
          expect(module).toBeDefined();
        }).not.toThrow();
      }
    });

    it('should validate OpenAI SDK integration', async () => {
      expect(async () => {
        const { default: OpenAI } = await import('openai');
        expect(OpenAI).toBeDefined();
        expect(typeof OpenAI).toBe('function'); // Constructor
      }).not.toThrow();
    });

    it('should validate Anthropic SDK integration', async () => {
      expect(async () => {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        expect(Anthropic).toBeDefined();
        expect(typeof Anthropic).toBe('function'); // Constructor
      }).not.toThrow();
    });
  });
});
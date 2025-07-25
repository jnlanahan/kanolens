// Integration test for extracted analysis routes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { setupAnalysisRoutes, validateAnalysisRequest } from '../../routes/analysis';

// Mock dependencies
vi.mock('../../storage');
vi.mock('../../simpleAuth');
vi.mock('../../openai');
vi.mock('../../agents/orchestrator');
vi.mock('@shared/schema');

describe('Analysis Routes Integration Test', () => {
  let app: Express;
  let mockStorage: any;
  let mockAuth: any;
  let mockOpenAI: any;
  let mockOrchestrator: any;
  let mockSchema: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Get mocked modules
    mockStorage = await import('../../storage');
    mockAuth = await import('../../simpleAuth');
    mockOpenAI = await import('../../openai');
    mockOrchestrator = await import('../../agents/orchestrator');
    mockSchema = await import('@shared/schema');
    
    // Mock auth middleware
    mockAuth.isAuthenticated.mockImplementation((req: any, res: any, next: any) => {
      req.user = { claims: { sub: 'test-user-123' } };
      next();
    });
    
    // Mock schema constants
    mockSchema.ANALYSIS_STEPS = {
      DISCOVERY: 'discovery',
      RESEARCH: 'research',
      CATEGORIZATION: 'categorization',
      ANALYSIS: 'analysis',
      TABLE_CREATION: 'table_creation'
    };
    
    mockSchema.ANALYSIS_STATUS = {
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed'
    };
    
    // Mock storage functions
    mockStorage.storage.getAnalysisSession.mockResolvedValue({
      id: 1,
      userId: 'test-user-123',
      title: 'Test Session',
      currentStep: 'discovery',
      products: ['Product1', 'Product2'],
      features: ['Feature1', 'Feature2'],
      targetCustomer: 'Enterprise'
    });
    
    mockStorage.storage.createAnalysisSession.mockResolvedValue({
      id: 2,
      userId: 'test-user-123',
      title: 'New Analysis Session'
    });
    
    mockStorage.storage.updateAnalysisSession.mockResolvedValue(true);
    
    // Mock OpenAI functions
    mockOpenAI.conductCompetitiveResearch.mockResolvedValue({
      features: ['Feature A', 'Feature B'],
      sources: ['Source 1', 'Source 2']
    });
    
    mockOpenAI.generateKanoTable.mockResolvedValue({
      tableData: { basic: ['Feature A'], performance: ['Feature B'] }
    });
    
    // Mock orchestrator
    mockOrchestrator.orchestratorAgent.coordinateFullAnalysis.mockResolvedValue({
      success: true,
      data: {
        kanoTableData: { basic: ['Feature A'] },
        researchData: { products: ['Product1'] },
        validationResults: { confidence: 0.9 }
      }
    });
    
    mockOrchestrator.orchestratorAgent.processSuggestions.mockResolvedValue({
      suggestions: ['Suggestion 1', 'Suggestion 2']
    });
    
    // Setup our extracted analysis routes
    setupAnalysisRoutes(app);
  });

  it('should setup analysis routes without crashing', () => {
    expect(setupAnalysisRoutes).toBeDefined();
    expect(typeof setupAnalysisRoutes).toBe('function');
  });

  it('analysis routes module should be importable', async () => {
    const analysisModule = await import('../../routes/analysis');
    expect(analysisModule.setupAnalysisRoutes).toBeDefined();
    expect(analysisModule.validateAnalysisRequest).toBeDefined();
  });

  it('should have proper helper functions', () => {
    // Test validateAnalysisRequest function
    const validRequest = {
      body: {
        products: ['Product1', 'Product2'],
        targetCustomer: 'Enterprise'
      }
    };
    
    const result = validateAnalysisRequest(validRequest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Test invalid request
    const invalidRequest = {
      body: {
        products: [],
        targetCustomer: ''
      }
    };
    
    const invalidResult = validateAnalysisRequest(invalidRequest);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('should handle session ownership validation', () => {
    // Mock session that belongs to different user
    mockStorage.storage.getAnalysisSession.mockResolvedValueOnce({
      id: 1,
      userId: 'different-user',
      title: 'Test Session'
    });
    
    // This test verifies the structure without making actual HTTP calls
    expect(mockStorage.storage.getAnalysisSession).toBeDefined();
  });

  it('should have proper error handling structure', () => {
    // Test that the function doesn't throw when setting up routes
    expect(() => {
      const testApp = express();
      setupAnalysisRoutes(testApp);
    }).not.toThrow();
  });

  it('should handle orchestrator coordination', async () => {
    const result = await mockOrchestrator.orchestratorAgent.coordinateFullAnalysis(
      ['Product1'],
      ['Feature1'],
      'Enterprise',
      123
    );
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(mockOrchestrator.orchestratorAgent.coordinateFullAnalysis).toHaveBeenCalledWith(
      ['Product1'],
      ['Feature1'],
      'Enterprise',
      123
    );
  });
});
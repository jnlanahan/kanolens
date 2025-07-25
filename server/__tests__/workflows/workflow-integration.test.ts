// Integration test for extracted workflow components
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisWorkflow } from '../../workflows/AnalysisWorkflow';
import { ProgressTracker } from '../../workflows/ProgressTracker';
import { ErrorHandler } from '../../workflows/ErrorHandler';

// Mock dependencies
vi.mock('../../agents/researcher');
vi.mock('../../agents/validator');
vi.mock('../../agents/analyst');
vi.mock('../../agents/evaluator');
vi.mock('../../storage');
vi.mock('../../langsmith');
vi.mock('../../websocket');

describe('Workflow Components Integration Test', () => {
  let analysisWorkflow: AnalysisWorkflow;
  let progressTracker: ProgressTracker;
  let errorHandler: ErrorHandler;
  let mockAgents: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create workflow instances
    analysisWorkflow = new AnalysisWorkflow();
    progressTracker = new ProgressTracker();
    errorHandler = new ErrorHandler();

    // Mock agents
    mockAgents = {
      researcher: await import('../../agents/researcher'),
      validator: await import('../../agents/validator'),
      analyst: await import('../../agents/analyst'),
      evaluator: await import('../../agents/evaluator'),
      langsmith: await import('../../langsmith'),
      websocket: await import('../../websocket')
    };

    // Setup agent mocks
    mockAgents.researcher.researcherAgent.performResearch.mockResolvedValue({
      products: [
        { name: 'Product1', features: ['Feature A', 'Feature B'] },
        { name: 'Product2', features: ['Feature C', 'Feature D'] }
      ]
    });

    mockAgents.validator.validatorAgent.validateData.mockResolvedValue({
      success: true,
      validatedData: { products: ['Product1', 'Product2'] }
    });

    mockAgents.analyst.analystAgent.categorizeFeatures.mockResolvedValue({
      success: true,
      kanoCategories: {
        basic: ['Feature A'],
        performance: ['Feature B'],
        excitement: ['Feature C']
      }
    });

    mockAgents.analyst.analystAgent.generateKanoTable.mockResolvedValue({
      success: true,
      tableData: { basic: ['Feature A'], performance: ['Feature B'] }
    });

    // Mock LangSmith
    mockAgents.langsmith.langSmithService.createWorkflowTrace.mockResolvedValue({
      end: vi.fn()
    });

    mockAgents.langsmith.withLangSmithTrace.mockImplementation(
      (name: string, input: any, operation: () => Promise<any>) => operation()
    );

    // Mock WebSocket
    mockAgents.websocket.webSocketService.broadcastProgress.mockImplementation(() => {});
    mockAgents.websocket.webSocketService.broadcastComplete.mockImplementation(() => {});
    mockAgents.websocket.webSocketService.broadcastError.mockImplementation(() => {});
  });

  describe('AnalysisWorkflow', () => {
    it('should be importable and instantiable', () => {
      expect(AnalysisWorkflow).toBeDefined();
      expect(analysisWorkflow).toBeInstanceOf(AnalysisWorkflow);
    });

    it('should validate analysis input correctly', () => {
      // Valid input
      expect(() => {
        analysisWorkflow.validateAnalysisInput(['Product1', 'Product2'], ['Feature1'], 'Enterprise');
      }).not.toThrow();

      // Invalid input - empty products
      expect(() => {
        analysisWorkflow.validateAnalysisInput([], ['Feature1'], 'Enterprise');
      }).toThrow('Products array cannot be empty');

      // Invalid input - empty target customer
      expect(() => {
        analysisWorkflow.validateAnalysisInput(['Product1'], ['Feature1'], '');
      }).toThrow('Target customer must be specified');
    });

    it('should coordinate full analysis successfully', async () => {
      const mockProgress = vi.fn();
      
      const result = await analysisWorkflow.coordinateFullAnalysis(
        ['Product1', 'Product2'],
        ['Feature1', 'Feature2'],
        'Enterprise',
        mockProgress,
        123
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.researchData).toBeDefined();
      expect(result.data?.validationResults).toBeDefined();
      expect(result.data?.kanoCategories).toBeDefined();
      expect(result.data?.kanoTableData).toBeDefined();

      // Verify progress updates were called
      expect(mockProgress).toHaveBeenCalled();
      
      // Verify all agents were called
      expect(mockAgents.researcher.researcherAgent.performResearch).toHaveBeenCalled();
      expect(mockAgents.validator.validatorAgent.validateData).toHaveBeenCalled();
      expect(mockAgents.analyst.analystAgent.categorizeFeatures).toHaveBeenCalled();
      expect(mockAgents.analyst.analystAgent.generateKanoTable).toHaveBeenCalled();
    });

    it('should handle analysis failures gracefully', async () => {
      // Mock research failure
      mockAgents.researcher.researcherAgent.performResearch.mockRejectedValueOnce(
        new Error('Research API failed')
      );

      const mockProgress = vi.fn();
      
      const result = await analysisWorkflow.coordinateFullAnalysis(
        ['Product1'],
        ['Feature1'],
        'Enterprise',
        mockProgress,
        124
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Research API failed');
    });
  });

  describe('ProgressTracker', () => {
    it('should be importable and instantiable', () => {
      expect(ProgressTracker).toBeDefined();
      expect(progressTracker).toBeInstanceOf(ProgressTracker);
    });

    it('should create and manage progress sessions', () => {
      const sessionId = 123;
      const state = progressTracker.createSession(sessionId);

      expect(state).toBeDefined();
      expect(state.sessionId).toBe(sessionId);
      expect(state.progress).toBe(0);
      expect(state.currentStep).toBe('discovery');

      const retrievedState = progressTracker.getState(sessionId);
      expect(retrievedState).toBe(state);
    });

    it('should update progress correctly', () => {
      const sessionId = 124;
      progressTracker.createSession(sessionId);

      progressTracker.updateProgress(sessionId, {
        step: 'research',
        message: 'Starting research',
        progress: 25
      });

      const state = progressTracker.getState(sessionId);
      expect(state?.currentStep).toBe('research');
      expect(state?.progress).toBe(25);
      expect(state?.updates).toHaveLength(1);
    });

    it('should calculate step progress correctly', () => {
      expect(progressTracker.getStepProgress('discovery')).toBe(0);
      expect(progressTracker.getStepProgress('research')).toBe(25);
      expect(progressTracker.getStepProgress('categorization')).toBe(50);
      expect(progressTracker.getStepProgress('analysis')).toBe(75);
      expect(progressTracker.getStepProgress('table_creation')).toBe(90);
    });

    it('should create progress callbacks', () => {
      const sessionId = 125;
      progressTracker.createSession(sessionId);

      const callback = progressTracker.createProgressCallback(sessionId);
      expect(typeof callback).toBe('function');

      callback({
        step: 'research',
        message: 'Test callback',
        progress: 30
      });

      const state = progressTracker.getState(sessionId);
      expect(state?.progress).toBe(30);
    });
  });

  describe('ErrorHandler', () => {
    it('should be importable and instantiable', () => {
      expect(ErrorHandler).toBeDefined();
      expect(errorHandler).toBeInstanceOf(ErrorHandler);
    });

    it('should execute operations with retry on failure', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success');
      });

      const result = await errorHandler.executeWithRetry(
        operation,
        { step: 'test', sessionId: 126 },
        { maxRetries: 3, initialDelay: 10 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        errorHandler.executeWithRetry(
          operation,
          { step: 'test', sessionId: 127 },
          { maxRetries: 2, initialDelay: 10 }
        )
      ).rejects.toThrow('Operation failed after 2 attempts');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle circuit breaker functionality', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service failure'));

      // Exhaust circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandler.executeWithCircuitBreaker(operation, 'test-service', 5, 1000);
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should now be open
      await expect(
        errorHandler.executeWithCircuitBreaker(operation, 'test-service', 5, 1000)
      ).rejects.toThrow('Circuit breaker open');
    });

    it('should handle non-retryable errors immediately', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Invalid input'));

      await expect(
        errorHandler.executeWithRetry(
          operation,
          { step: 'test', sessionId: 128 },
          { maxRetries: 3, retryableErrors: ['Temporary failure'] }
        )
      ).rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Workflow Integration', () => {
    it('should work together in analysis workflow', async () => {
      const sessionId = 129;
      const progressCallback = progressTracker.createProgressCallback(sessionId);
      
      // Use error handler with analysis workflow
      const result = await errorHandler.executeWithRetry(
        () => analysisWorkflow.coordinateFullAnalysis(
          ['Product1'],
          ['Feature1'],
          'Enterprise',
          progressCallback,
          sessionId
        ),
        { step: 'full_analysis', sessionId },
        { maxRetries: 2, initialDelay: 10 }
      );

      expect(result.success).toBe(true);
      
      const progressState = progressTracker.getState(sessionId);
      expect(progressState?.updates.length).toBeGreaterThan(0);
    });
  });
});
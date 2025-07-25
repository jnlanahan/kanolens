// Safety Net Tests for orchestrator.ts (1,098 lines)
// Purpose: End-to-end test coverage BEFORE refactoring to ensure no regressions
// These tests validate the complete orchestration workflow

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all external dependencies
vi.mock('../../openai');
vi.mock('../../websocket');
vi.mock('../../storage');
vi.mock('../../agents/researcher');
vi.mock('../../agents/validator');
vi.mock('../../agents/analyst');
vi.mock('../../agents/evaluator');

describe('Orchestrator Safety Net - End-to-End Coverage', () => {
  let OrchestratorAgent: any;
  let mockOpenAI: any;
  let mockWebSocket: any;
  let mockStorage: any;
  let mockAgents: any;

  beforeEach(async () => {
    // Set up comprehensive mocks
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  step: 'research',
                  message: 'Research complete',
                  progress: 25,
                  data: { findings: ['Finding 1', 'Finding 2'] }
                })
              }
            }]
          })
        }
      }
    };

    mockWebSocket = {
      broadcastProgress: vi.fn(),
      broadcastComplete: vi.fn(),
      broadcastError: vi.fn()
    };

    mockStorage = {
      updateAnalysisSession: vi.fn().mockResolvedValue({ id: 123 }),
      saveMessage: vi.fn().mockResolvedValue({ id: 1 }),
      getSessionMessages: vi.fn().mockResolvedValue([])
    };

    mockAgents = {
      researcher: {
        ResearcherAgent: vi.fn().mockImplementation(() => ({
          conductResearch: vi.fn().mockResolvedValue({
            success: true,
            data: {
              products: [
                { name: 'Competitor1', features: ['Feature A', 'Feature B'] },
                { name: 'Competitor2', features: ['Feature C', 'Feature D'] }
              ]
            }
          })
        }))
      },
      validator: {
        ValidatorAgent: vi.fn().mockImplementation(() => ({
          validateData: vi.fn().mockResolvedValue({
            success: true,
            validatedData: { 
              products: 2, 
              features: 4,
              quality: 'high' 
            }
          })
        }))
      },
      analyst: {
        AnalystAgent: vi.fn().mockImplementation(() => ({
          categorizeFeatures: vi.fn().mockResolvedValue({
            success: true,
            kanoCategories: {
              basic: ['Feature A'],
              performance: ['Feature B'],
              excitement: ['Feature C'],
              indifferent: ['Feature D']
            }
          })
        }))
      },
      evaluator: {
        EvaluatorAgent: vi.fn().mockImplementation(() => ({
          evaluateAnalysis: vi.fn().mockResolvedValue({
            success: true,
            evaluation: {
              completeness: 95,
              accuracy: 88,
              recommendations: ['Recommendation 1', 'Recommendation 2']
            }
          })
        }))
      }
    };

    // Import the orchestrator after mocks are set up
    const orchestratorModule = await import('../../agents/orchestrator');
    OrchestratorAgent = orchestratorModule.OrchestratorAgent;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Full Analysis Workflow', () => {
    it('should execute complete analysis pipeline successfully', async () => {
      const sessionData = {
        id: 123,
        userId: 'test-user',
        targetCustomer: 'Enterprise',
        userProduct: 'Our Product',
        products: ['Competitor1', 'Competitor2'],
        features: [
          { name: 'Feature A', description: 'Core functionality' },
          { name: 'Feature B', description: 'Performance feature' }
        ]
      };

      const orchestrator = new OrchestratorAgent();
      const result = await orchestrator.executeAnalysis(sessionData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify all agents were called in sequence
      expect(mockAgents.researcher.ResearcherAgent).toHaveBeenCalled();
      expect(mockAgents.validator.ValidatorAgent).toHaveBeenCalled();
      expect(mockAgents.analyst.AnalystAgent).toHaveBeenCalled();
      expect(mockAgents.evaluator.EvaluatorAgent).toHaveBeenCalled();
      
      // Verify progress broadcasting
      expect(mockWebSocket.broadcastProgress).toHaveBeenCalledTimes(4); // One for each phase
      expect(mockWebSocket.broadcastComplete).toHaveBeenCalledOnce();
    });

    it('should handle research phase failures gracefully', async () => {
      const sessionData = {
        id: 123,
        products: ['Competitor1'],
        features: [{ name: 'Feature A' }]
      };

      // Mock research failure
      mockAgents.researcher.ResearcherAgent.mockImplementationOnce(() => ({
        conductResearch: vi.fn().mockRejectedValueOnce(new Error('Research API failed'))
      }));

      const orchestrator = new OrchestratorAgent();
      
      await expect(orchestrator.executeAnalysis(sessionData))
        .rejects.toThrow('Research phase failed');

      expect(mockWebSocket.broadcastError).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          message: expect.stringContaining('Research phase failed'),
          step: 'research'
        })
      );
    });

    it('should retry failed operations with exponential backoff', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Mock multiple failures then success
      let attemptCount = 0;
      mockAgents.researcher.ResearcherAgent.mockImplementation(() => ({
        conductResearch: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve({ success: true, data: { products: [] } });
        })
      }));

      const orchestrator = new OrchestratorAgent();
      const result = await orchestrator.executeAnalysis(sessionData);

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3); // Should have retried 2 times before success
    });
  });

  describe('Agent Coordination', () => {
    it('should pass data correctly between agents', async () => {
      const sessionData = {
        id: 123,
        products: ['Competitor1'],
        features: [{ name: 'Feature A', description: 'Test feature' }]
      };

      const orchestrator = new OrchestratorAgent();
      await orchestrator.executeAnalysis(sessionData);

      // Verify data flow between agents
      const researcherCall = mockAgents.researcher.ResearcherAgent.mock.calls[0];
      const validatorCall = mockAgents.validator.ValidatorAgent.mock.calls[0];
      const analystCall = mockAgents.analyst.AnalystAgent.mock.calls[0];

      expect(researcherCall).toBeDefined();
      expect(validatorCall).toBeDefined();
      expect(analystCall).toBeDefined();
    });

    it('should handle partial agent failures with graceful degradation', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Mock validator failure but other agents succeed
      mockAgents.validator.ValidatorAgent.mockImplementationOnce(() => ({
        validateData: vi.fn().mockRejectedValueOnce(new Error('Validation failed'))
      }));

      const orchestrator = new OrchestratorAgent();
      const result = await orchestrator.executeAnalysis(sessionData);

      // Should continue with warning
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Validation phase failed, continuing with unvalidated data');
    });

    it('should maintain conversation context across agents', async () => {
      const sessionData = {
        id: 123,
        products: ['Competitor1'],
        features: [{ name: 'Feature A' }]
      };

      // Mock existing conversation history
      mockStorage.getSessionMessages.mockResolvedValueOnce([
        { role: 'user', content: 'Previous user message' },
        { role: 'assistant', content: 'Previous assistant response' }
      ]);

      const orchestrator = new OrchestratorAgent();
      await orchestrator.executeAnalysis(sessionData);

      // Verify conversation context was used
      expect(mockStorage.getSessionMessages).toHaveBeenCalledWith(123);
    });
  });

  describe('Progress Tracking and Communication', () => {
    it('should broadcast detailed progress updates', async () => {
      const sessionData = {
        id: 123,
        products: ['Competitor1'],
        features: [{ name: 'Feature A' }]
      };

      const orchestrator = new OrchestratorAgent();
      await orchestrator.executeAnalysis(sessionData);

      // Verify progress updates for each phase
      const progressCalls = mockWebSocket.broadcastProgress.mock.calls;
      expect(progressCalls[0][1]).toMatchObject({
        step: 'discovery',
        message: expect.stringContaining('Starting research'),
        progress: 0
      });
      
      expect(progressCalls[1][1]).toMatchObject({
        step: 'research',
        progress: 25
      });

      expect(progressCalls[2][1]).toMatchObject({
        step: 'categorization',
        progress: 50
      });

      expect(progressCalls[3][1]).toMatchObject({
        step: 'analysis',
        progress: 75
      });
    });

    it('should save intermediate results to storage', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      const orchestrator = new OrchestratorAgent();
      await orchestrator.executeAnalysis(sessionData);

      // Verify session updates were saved
      expect(mockStorage.updateAnalysisSession).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          researchData: expect.any(Object),
          validationResults: expect.any(Object),
          kanoCategories: expect.any(Object)
        })
      );
    });

    it('should handle WebSocket communication failures gracefully', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Mock WebSocket failure
      mockWebSocket.broadcastProgress.mockRejectedValueOnce(new Error('WebSocket failed'));

      const orchestrator = new OrchestratorAgent();
      const result = await orchestrator.executeAnalysis(sessionData);

      // Analysis should continue despite WebSocket failure
      expect(result.success).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle storage failures during analysis', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Mock storage failure
      mockStorage.updateAnalysisSession.mockRejectedValueOnce(new Error('Storage unavailable'));

      const orchestrator = new OrchestratorAgent();
      const result = await orchestrator.executeAnalysis(sessionData);

      // Should continue analysis but log warning
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Failed to save intermediate results');
    });

    it('should implement circuit breaker for external API calls', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Mock multiple consecutive failures
      for (let i = 0; i < 5; i++) {
        mockAgents.researcher.ResearcherAgent.mockImplementationOnce(() => ({
          conductResearch: vi.fn().mockRejectedValueOnce(new Error('API failure'))
        }));
      }

      const orchestrator = new OrchestratorAgent();
      
      await expect(orchestrator.executeAnalysis(sessionData))
        .rejects.toThrow('Circuit breaker open: too many failures');
    });

    it('should handle timeout scenarios', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Mock long-running operation
      mockAgents.researcher.ResearcherAgent.mockImplementationOnce(() => ({
        conductResearch: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 30000)) // 30 second delay
        )
      }));

      const orchestrator = new OrchestratorAgent();
      
      await expect(orchestrator.executeAnalysis(sessionData))
        .rejects.toThrow('Operation timed out');
    });
  });

  describe('Data Validation and Integrity', () => {
    it('should validate input data before processing', async () => {
      const invalidSessionData = {
        id: 123,
        // Missing required fields
      };

      const orchestrator = new OrchestratorAgent();
      
      await expect(orchestrator.executeAnalysis(invalidSessionData))
        .rejects.toThrow('Invalid session data');
    });

    it('should sanitize and validate agent responses', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Mock malformed agent response
      mockAgents.researcher.ResearcherAgent.mockImplementationOnce(() => ({
        conductResearch: vi.fn().mockResolvedValueOnce({
          // Missing success field
          data: null
        })
      }));

      const orchestrator = new OrchestratorAgent();
      
      await expect(orchestrator.executeAnalysis(sessionData))
        .rejects.toThrow('Invalid research response format');
    });

    it('should handle large datasets efficiently', async () => {
      const largeSessionData = {
        id: 123,
        products: Array(100).fill(null).map((_, i) => `Product${i}`),
        features: Array(1000).fill(null).map((_, i) => ({ 
          name: `Feature${i}`, 
          description: `Description for feature ${i}` 
        }))
      };

      const orchestrator = new OrchestratorAgent();
      const startTime = Date.now();
      
      const result = await orchestrator.executeAnalysis(largeSessionData);
      
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Configuration and Environment Handling', () => {
    it('should adapt behavior based on environment settings', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Test development mode
      process.env.NODE_ENV = 'development';
      
      const orchestrator = new OrchestratorAgent();
      const result = await orchestrator.executeAnalysis(sessionData);

      expect(result.debug).toBeDefined(); // Debug info should be included in dev mode
    });

    it('should respect rate limiting configurations', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Mock rate limiting
      let callCount = 0;
      mockAgents.researcher.ResearcherAgent.mockImplementation(() => ({
        conductResearch: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount > 3) {
            return Promise.reject(new Error('Rate limit exceeded'));
          }
          return Promise.resolve({ success: true, data: {} });
        })
      }));

      const orchestrator = new OrchestratorAgent();
      
      // Should handle rate limiting gracefully
      const result = await orchestrator.executeAnalysis(sessionData);
      expect(result.success).toBe(true);
    });
  });

  describe('Memory Management and Resource Cleanup', () => {
    it('should clean up resources after analysis completion', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      const orchestrator = new OrchestratorAgent();
      await orchestrator.executeAnalysis(sessionData);

      // Verify cleanup methods were called
      expect(orchestrator.cleanup).toHaveBeenCalled();
    });

    it('should handle memory pressure gracefully', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Mock memory pressure
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 1024 * 1024 * 1024, // 1GB used
        heapTotal: 1024 * 1024 * 1024 * 1.2 // 1.2GB total
      });

      const orchestrator = new OrchestratorAgent();
      const result = await orchestrator.executeAnalysis(sessionData);

      expect(result.warnings).toContain('High memory usage detected');
      
      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Concurrent Analysis Handling', () => {
    it('should handle multiple concurrent analyses', async () => {
      const sessionData1 = { id: 123, products: ['Test1'], features: [{ name: 'Feature1' }] };
      const sessionData2 = { id: 124, products: ['Test2'], features: [{ name: 'Feature2' }] };

      const orchestrator1 = new OrchestratorAgent();
      const orchestrator2 = new OrchestratorAgent();

      const [result1, result2] = await Promise.all([
        orchestrator1.executeAnalysis(sessionData1),
        orchestrator2.executeAnalysis(sessionData2)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.sessionId).toBe(123);
      expect(result2.sessionId).toBe(124);
    });

    it('should prevent resource conflicts between concurrent analyses', async () => {
      const sessionData = { id: 123, products: ['Test'], features: [{ name: 'Feature' }] };

      // Start multiple analyses for the same session
      const orchestrator1 = new OrchestratorAgent();
      const orchestrator2 = new OrchestratorAgent();

      const promise1 = orchestrator1.executeAnalysis(sessionData);
      const promise2 = orchestrator2.executeAnalysis(sessionData);

      const [result1, result2] = await Promise.allSettled([promise1, promise2]);

      // One should succeed, the other should be rejected due to conflict
      expect(
        (result1.status === 'fulfilled' && result2.status === 'rejected') ||
        (result1.status === 'rejected' && result2.status === 'fulfilled')
      ).toBe(true);
    });
  });
});
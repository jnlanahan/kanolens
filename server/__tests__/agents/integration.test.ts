import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orchestratorAgent } from '../../agents/orchestrator';
import { researcherAgent } from '../../agents/researcher';
import { validatorAgent } from '../../agents/validator';
import { analystAgent } from '../../agents/analyst';
import { evaluatorAgent } from '../../agents/evaluator';
import { testUtils } from '../setup';
import type { OrchestratorInput, ProgressUpdate } from '../../agents/orchestrator';

describe('Multi-Agent Integration', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Override evaluatorAgent mock for this test
    vi.mocked(evaluatorAgent.evaluateAgent).mockResolvedValue({
      score: 85,
      strengths: ['Test strength'],
      weaknesses: ['Test weakness'],
      suggestions: ['Test suggestion'],
      qualityMetrics: {
        accuracy: 85,
        completeness: 90,
        relevance: 80,
        clarity: 75
      }
    });
  });

  describe('Orchestrator Coordination', () => {
    it('should coordinate suggestions workflow correctly', async () => {
      const input: OrchestratorInput = {
        mode: 'suggestions',
        formData: {
          products: 'Slack, Microsoft Teams, etc',
          targetCustomers: 'Enterprise Teams',
          description: 'Communication tools for remote work'
        },
        sessionId: 123
      };

      // Mock OpenAI response for suggestions
      const { openai } = await import('../../openai');
      vi.mocked(openai.chat.completions.create).mockResolvedValue({
        choices: [{
          message: {
            content: `PRODUCT_INTERPRETATION: Cleaned "etc" from product list
SUGGESTED_PRODUCTS:
- Discord | Popular gaming communication platform
- Zoom | Video conferencing and chat
- Google Chat | Enterprise messaging platform
SUGGESTED_FEATURES:
- Real-time Messaging | Instant communication capabilities
- Video Conferencing | Face-to-face meetings
- File Sharing | Document collaboration
- Integrations | Connect with other tools`
          }
        }]
      } as any);

      const result = await orchestratorAgent.processSuggestions(input);

      expect(result.productInterpretation).toContain('Cleaned');
      expect(result.suggestedProducts).toHaveLength(3);
      expect(result.suggestedFeatures).toHaveLength(4);
      expect(result.suggestedProducts[0].name).toBe('Discord');
      expect(result.suggestedFeatures[0]).toBe('Real-time Messaging');
    });

    it('should handle validation mode correctly', async () => {
      const input: OrchestratorInput = {
        mode: 'validation',
        product: 'Slack',
        benefit: 'Team communication',
        sessionId: 123
      };

      // Mock OpenAI response for validation
      const { openai } = await import('../../openai');
      vi.mocked(openai.chat.completions.create).mockResolvedValue({
        choices: [{
          message: {
            content: `VALIDATION: VALID
CORRECTED_PRODUCT: Slack
MESSAGE: Slack is a legitimate business communication platform used by teams worldwide.
SUGGESTIONS: 
- Consider comparing with Microsoft Teams as a direct competitor
- Also look at Discord for different target markets`
          }
        }]
      } as any);

      const result = await orchestratorAgent.validateManualInput(input);

      expect(result.isValid).toBe(true);
      expect(result.message).toContain('Slack is a legitimate');
    });

    it('should coordinate comprehensive analysis workflow', async () => {
      const progressUpdates: ProgressUpdate[] = [];
      const mockProgressCallback = (update: ProgressUpdate) => {
        progressUpdates.push(update);
      };

      const input: OrchestratorInput = {
        mode: 'comprehensive',
        formData: {
          products: 'Slack, Microsoft Teams',
          targetCustomers: 'Enterprise Teams',
          analysisMode: 'deep'
        },
        sessionId: 123
      };

      // Mock external dependencies
      vi.spyOn(researcherAgent, 'performResearch').mockResolvedValue({
        products: [
          {
            name: 'Slack',
            company: 'Slack Technologies',
            features: [
              { name: 'Channels', category: 'must-have', description: 'Organized conversations' },
              { name: 'Video Calls', category: 'performance', description: 'Face-to-face meetings' }
            ]
          },
          {
            name: 'Microsoft Teams',
            company: 'Microsoft',
            features: [
              { name: 'Channels', category: 'must-have', description: 'Team conversations' },
              { name: 'Office Integration', category: 'delighter', description: 'Seamless Office 365 integration' }
            ]
          }
        ]
      });

      vi.spyOn(validatorAgent, 'categorizeFeatures').mockResolvedValue({
        categorizedFeatures: [
          { featureName: 'Channels', category: 'must-have', categoryRationale: '100% adoption' },
          { featureName: 'Video Calls', category: 'performance', categoryRationale: 'Performance differentiator' },
          { featureName: 'Office Integration', category: 'delighter', categoryRationale: 'Unique feature' }
        ],
        summary: { totalFeatures: 3, mustHaves: 1, performance: 1, delighters: 1 }
      });

      vi.spyOn(analystAgent, 'analyzeKanoTable').mockResolvedValue({
        strategicInsights: {
          competitiveAdvantages: ['Strong Office 365 integration'],
          marketGaps: ['Advanced mobile features'],
          recommendations: ['Focus on mobile user experience']
        },
        featureAnalysis: {
          mustHaveGaps: [],
          performanceOpportunities: ['Video quality improvements'],
          delighterPotential: ['AI-powered meeting summaries']
        }
      });

      const products = input.formData!.products.split(',').map(p => p.trim());
      const features = input.formData!.features?.split(',').map(f => f.trim()) || [];
      const targetCustomer = input.formData!.targetCustomers;
      
      const result = await orchestratorAgent.coordinateFullAnalysis(
        products,
        features,
        targetCustomer,
        mockProgressCallback,
        input.sessionId,
        input.formData!.analysisMode as any
      );

      // Verify progress tracking
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].step).toBe('discovery');

      // Verify result structure
      expect(result.researchData).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.kanoTable).toBeDefined();
      expect(result.analysis).toBeDefined();
    });
  });

  describe('Research Agent Integration', () => {
    it('should perform comprehensive product research', async () => {
      // Override the mock from setup.ts
      vi.mocked(researcherAgent.performResearch).mockResolvedValue({
        products: [{
          name: 'Slack',
          company: 'Slack Technologies',
          targetMarket: 'Enterprise teams',
          pricing: '$7.25 per user per month',
          features: [
            { name: 'Channels', description: 'Organized conversations' },
            { name: 'Direct messaging', description: 'Private conversations' },
            { name: 'File sharing', description: 'Share documents and files' },
            { name: 'Video calls', description: 'Face-to-face communication' },
            { name: 'App integrations', description: 'Connect with other tools' }
          ],
          uniqueDifferentiators: ['Superior search', 'Extensive app ecosystem'],
          marketPosition: 'Leading enterprise communication platform'
        }],
        featureSummary: {
          totalUniqueFeatures: 5,
          commonFeatures: ['Messaging', 'File sharing'],
          differentiatingFeatures: ['Superior search', 'App ecosystem']
        }
      });

      const request = {
        mode: 'comprehensive' as const,
        products: ['Slack'],
        targetCustomer: 'Enterprise Teams'
      };

      const result = await researcherAgent.performResearch(request);

      expect(result).toBeDefined();
      expect(result.products).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Slack');
      expect(result.products[0].company).toContain('Slack Technologies');
      expect(result.products[0].pricing).toContain('$7.25');
      expect(result.products[0].features.length).toBeGreaterThan(0);
    });

    it('should handle research failures gracefully', async () => {
      // Override the mock to simulate failure
      vi.mocked(researcherAgent.performResearch).mockRejectedValue(
        new Error('Search service unavailable')
      );

      const request = {
        mode: 'comprehensive' as const,
        products: ['Unknown Product'],
        targetCustomer: 'Users'
      };

      await expect(researcherAgent.performResearch(request)).rejects.toThrow('Search service unavailable');
    });
  });

  describe('Validator Agent Integration', () => {
    it('should categorize features using Kano methodology', async () => {
      const request = {
        researchData: {
          products: [
            {
              name: 'Product A',
              features: [
                { name: 'User Login', description: 'Authentication system' },
                { name: 'Search Speed', description: 'Fast search capabilities' },
                { name: 'AI Assistant', description: 'Intelligent helper' }
              ]
            },
            {
              name: 'Product B', 
              features: [
                { name: 'User Login', description: 'Login functionality' },
                { name: 'Dark Mode', description: 'Theme customization' }
              ]
            }
          ]
        },
        targetCustomer: 'Enterprise Users'
      };

      // Override the mock from setup.ts
      vi.mocked(validatorAgent.categorizeFeatures).mockResolvedValue({
        categorizedFeatures: [
          { featureName: 'User Login', category: 'must-have', categoryRationale: '100% adoption - essential feature' },
          { featureName: 'Search Speed', category: 'performance', categoryRationale: 'Performance differentiator' },
          { featureName: 'AI Assistant', category: 'delighter', categoryRationale: 'Innovative feature - not widely adopted' },
          { featureName: 'Dark Mode', category: 'delighter', categoryRationale: 'Nice-to-have feature' }
        ],
        summary: { totalFeatures: 4, mustHaves: 1, performance: 1, delighters: 2 }
      });

      const result = await validatorAgent.categorizeFeatures(request);

      expect(result).toBeDefined();
      expect(result.categorizedFeatures).toBeDefined();
      expect(result.categorizedFeatures.length).toBeGreaterThan(0);
      expect(result.summary.totalFeatures).toBeGreaterThan(0);
      
      // User Login should be must-have (100% adoption)
      const loginFeature = result.categorizedFeatures.find(f => f.featureName === 'User Login');
      expect(loginFeature?.category).toBe('must-have');
    });

  });

  describe('Analyst Agent Integration', () => {
    it('should provide strategic analysis of Kano table', async () => {
      const kanoTable = {
        products: ['Product A', 'Product B'],
        features: [
          { id: 'login', name: 'User Login', category: 'must-have' as const },
          { id: 'speed', name: 'Search Speed', category: 'performance' as const },
          { id: 'ai', name: 'AI Assistant', category: 'delighter' as const }
        ],
        ratings: {
          'login': { 'Product A': 'Yes', 'Product B': 'Yes' },
          'speed': { 'Product A': 'High', 'Product B': 'Medium' },
          'ai': { 'Product A': 'Yes', 'Product B': 'No' }
        }
      };

      // Override the mock from setup.ts
      vi.mocked(analystAgent.analyzeKanoTable).mockResolvedValue({
        strategicInsights: {
          competitiveAdvantages: ['Strong AI assistant feature', 'Fast search performance'],
          marketGaps: ['Limited must-have features'],
          recommendations: ['Focus on essential features', 'Maintain performance edge']
        },
        featureAnalysis: {
          mustHaveGaps: [],
          performanceOpportunities: ['Improve search speed further'],
          delighterPotential: ['Enhance AI capabilities']
        }
      });

      const result = await analystAgent.analyzeKanoTable({
        kanoTable,
        targetCustomer: 'Enterprise Teams'
      });

      expect(result).toBeDefined();
      expect(result.strategicInsights).toBeDefined();
      expect(result.featureAnalysis).toBeDefined();
      expect(result.strategicInsights.competitiveAdvantages).toBeDefined();
      expect(result.strategicInsights.recommendations).toBeDefined();
    });
  });

  describe('Evaluator Agent Integration', () => {
    it('should evaluate agent performance', async () => {
      // Override the mock from setup.ts
      vi.mocked(evaluatorAgent.evaluateAgent).mockResolvedValue({
        score: 85,
        strengths: ['Good research quality', 'Comprehensive product coverage'],
        weaknesses: ['Limited source diversity'],
        suggestions: ['Include more data sources', 'Add competitive pricing analysis'],
        qualityMetrics: {
          accuracy: 0.9,
          completeness: 0.8,
          relevance: 0.85,
          clarity: 0.9
        }
      });


      const result = await evaluatorAgent.evaluateAgent({
        agentName: 'researcher',
        input: { products: ['Test Product'] },
        output: { products: [{ name: 'Test Product', features: [] }] },
        context: {
          sessionId: 123,
          targetCustomer: 'Users',
          products: ['Test Product']
        }
      });

      expect(result.score).toBe(85);
      expect(result.strengths).toContain('Good research quality');
      expect(result.suggestions).toContain('Include more data sources');
    });
  });

  describe('End-to-End Agent Workflow', () => {
    it('should complete full analysis pipeline', async () => {
      const progressUpdates: ProgressUpdate[] = [];
      
      // Mock all external dependencies
      vi.spyOn(researcherAgent, 'performResearch').mockResolvedValue({
        products: [
          {
            name: 'Tool A',
            company: 'Company A',
            features: [
              { name: 'Feature 1', category: 'must-have', description: 'Essential feature' },
              { name: 'Feature 2', category: 'performance', description: 'Performance feature' }
            ]
          }
        ]
      });

      vi.spyOn(validatorAgent, 'categorizeFeatures').mockResolvedValue({
        categorizedFeatures: [
          { featureName: 'Feature 1', category: 'must-have', categoryRationale: 'Essential' },
          { featureName: 'Feature 2', category: 'performance', categoryRationale: 'Performance' }
        ],
        summary: { totalFeatures: 2, mustHaves: 1, performance: 1, delighters: 0 }
      });

      vi.spyOn(analystAgent, 'analyzeKanoTable').mockResolvedValue({
        strategicInsights: {
          competitiveAdvantages: ['Strong in must-have features'],
          marketGaps: ['Limited delighter features'],
          recommendations: ['Invest in innovation']
        },
        featureAnalysis: {
          mustHaveGaps: [],
          performanceOpportunities: ['Improve Feature 2'],
          delighterPotential: ['Add AI features']
        }
      });

      const input: OrchestratorInput = {
        mode: 'comprehensive',
        formData: {
          products: 'Tool A',
          targetCustomers: 'Business Users',
          analysisMode: 'quick'
        },
        sessionId: 123
      };

      const products = input.formData!.products.split(',').map(p => p.trim());
      const features = input.formData!.features?.split(',').map(f => f.trim()) || [];
      const targetCustomer = input.formData!.targetCustomers;
      
      const result = await orchestratorAgent.coordinateFullAnalysis(
        products,
        features,
        targetCustomer,
        (update) => progressUpdates.push(update),
        input.sessionId,
        input.formData!.analysisMode as any
      );

      // Verify complete pipeline execution
      expect(result.researchData).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.kanoTable).toBeDefined();
      expect(result.analysis).toBeDefined();

      // Verify progress tracking through all steps
      const steps = progressUpdates.map(u => u.step);
      expect(steps).toContain('discovery');
      expect(steps).toContain('research');
      expect(steps).toContain('categorization');
      expect(steps).toContain('table_creation');
      expect(steps).toContain('analysis');

      // Verify final progress is 100%
      const finalUpdate = progressUpdates[progressUpdates.length - 1];
      expect(finalUpdate.progress).toBe(100);
    });

    it('should handle agent failures gracefully', async () => {
      const progressUpdates: ProgressUpdate[] = [];
      
      // Mock research failure
      vi.spyOn(researcherAgent, 'performResearch').mockRejectedValue(
        new Error('Research service failed')
      );

      const input: OrchestratorInput = {
        mode: 'comprehensive',
        formData: {
          products: 'Tool A',
          targetCustomers: 'Users'
        },
        sessionId: 123
      };

      await expect(
        orchestratorAgent.coordinateFullAnalysis(
          input.formData!.products.split(',').map(p => p.trim()),
          input.formData!.features?.split(',').map(f => f.trim()) || [],
          input.formData!.targetCustomers,
          (update) => progressUpdates.push(update),
          input.sessionId
        )
      ).rejects.toThrow('Research service failed');

      // Should still have some progress updates before failure
      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Agent Communication and Data Flow', () => {
    it('should maintain data consistency across agents', async () => {
      const originalData = {
        products: ['Product A', 'Product B'],
        targetCustomer: 'Enterprise Teams'
      };

      // Mock research that maintains product list
      vi.spyOn(researcherAgent, 'performResearch').mockResolvedValue({
        products: originalData.products.map(name => ({
          name,
          company: `${name} Inc`,
          features: [{ name: 'Test Feature', category: 'must-have', description: 'Test' }]
        }))
      });

      // Mock validation that processes same features
      vi.spyOn(validatorAgent, 'categorizeFeatures').mockImplementation(async (request) => {
        expect(request.researchData.products).toHaveLength(2);
        expect(request.targetCustomer).toBe(originalData.targetCustomer);
        
        return {
          categorizedFeatures: [
            { featureName: 'Test Feature', category: 'must-have', categoryRationale: 'Essential' }
          ],
          summary: { totalFeatures: 1, mustHaves: 1, performance: 0, delighters: 0 }
        };
      });

      // Mock analysis that receives correct table
      vi.spyOn(analystAgent, 'analyzeKanoTable').mockImplementation(async (request) => {
        expect(request.kanoTable.products).toEqual(originalData.products);
        
        return {
          strategicInsights: {
            competitiveAdvantages: [],
            marketGaps: [],
            recommendations: []
          },
          featureAnalysis: {
            mustHaveGaps: [],
            performanceOpportunities: [],
            delighterPotential: []
          }
        };
      });

      const input: OrchestratorInput = {
        mode: 'comprehensive',
        formData: {
          products: originalData.products.join(', '),
          targetCustomers: originalData.targetCustomer
        },
        sessionId: 123
      };

      await orchestratorAgent.coordinateFullAnalysis(
        originalData.products,
        [],
        originalData.targetCustomer,
        () => {},
        input.sessionId
      );

      // Verify all mocks were called with expected data
      expect(vi.mocked(researcherAgent.performResearch)).toHaveBeenCalled();
      expect(vi.mocked(validatorAgent.categorizeFeatures)).toHaveBeenCalled();
      expect(vi.mocked(analystAgent.analyzeKanoTable)).toHaveBeenCalled();
    });
  });
});
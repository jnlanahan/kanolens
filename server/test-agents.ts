// Comprehensive Agent Testing Script
import { researcherAgent } from './agents/researcher';
import { validatorAgent } from './agents/validator';
import { analystAgent } from './agents/analyst';
import { evaluatorAgent } from './agents/evaluator';
import { orchestratorAgent } from './agents/orchestrator';

interface TestResult {
  agent: string;
  test: string;
  status: 'pass' | 'fail' | 'error';
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
  details?: any;
}

export class AgentTester {
  private results: TestResult[] = [];

  // Test environment variables
  async testEnvironment(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const envVars = {
        PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
        DATABASE_URL: !!process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV
      };

      const missingKeys = Object.entries(envVars)
        .filter(([key, value]) => key !== 'NODE_ENV' && !value)
        .map(([key]) => key);

      const result: TestResult = {
        agent: 'environment',
        test: 'Environment Variables Check',
        status: missingKeys.length === 0 ? 'pass' : 'fail',
        input: 'Environment variable check',
        output: envVars,
        duration: Date.now() - startTime,
        details: {
          missingKeys,
          perplexityKeyPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 8) + '...',
          openaiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 8) + '...'
        }
      };

      if (missingKeys.length > 0) {
        result.error = `Missing environment variables: ${missingKeys.join(', ')}`;
      }

      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        agent: 'environment',
        test: 'Environment Variables Check',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
      this.results.push(result);
      return result;
    }
  }

  // Test Perplexity API directly
  async testPerplexityAPI(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('[Test] Testing Perplexity API directly...');
      
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
      
      const result: TestResult = {
        agent: 'perplexity',
        test: 'Direct Perplexity API Call',
        status: response.ok ? 'pass' : 'fail',
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

      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        agent: 'perplexity',
        test: 'Direct Perplexity API Call',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
      this.results.push(result);
      return result;
    }
  }

  // Test Researcher Agent
  async testResearcher(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('[Test] Testing Researcher Agent...');
      
      const input = {
        products: ['Notion', 'Obsidian'],
        targetCustomer: 'Knowledge workers'
      };

      const output = await researcherAgent.gatherCompetitiveIntelligence(
        input.products,
        input.targetCustomer
      );

      const result: TestResult = {
        agent: 'researcher',
        test: 'Competitive Intelligence Research',
        status: 'pass',
        input,
        output,
        duration: Date.now() - startTime,
        details: {
          productsResearched: output.products?.length || 0,
          totalFeatures: output.products?.reduce((sum, p) => sum + (p.features?.length || 0), 0) || 0,
          hasRealContent: output.products?.some(p => 
            p.features?.some(f => f.description && f.description.length > 50)
          ) || false
        }
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        agent: 'researcher',
        test: 'Competitive Intelligence Research',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
      this.results.push(result);
      return result;
    }
  }

  // Test Validator Agent
  async testValidator(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('[Test] Testing Validator Agent...');
      
      // Create mock research data for testing
      const mockResearchData = {
        products: [
          {
            name: 'Notion',
            features: [
              {
                name: 'Real-time collaboration',
                description: 'Multiple users can edit documents simultaneously with live updates',
                benefit: 'Improves team productivity and reduces conflicts',
                implementationDetails: 'WebSocket-based real-time synchronization'
              },
              {
                name: 'AI writing assistant',
                description: 'AI-powered content generation and editing suggestions',
                benefit: 'Speeds up content creation and improves writing quality',
                implementationDetails: 'Integration with GPT models for content assistance'
              }
            ]
          },
          {
            name: 'Obsidian',
            features: [
              {
                name: 'Local file storage',
                description: 'All notes stored as markdown files locally',
                benefit: 'Complete data ownership and offline access',
                implementationDetails: 'Plain markdown files in local filesystem'
              }
            ]
          }
        ]
      };

      const input = {
        researchData: mockResearchData,
        targetCustomer: 'Knowledge workers'
      };

      const output = await validatorAgent.categorizeFeatures(input);

      const result: TestResult = {
        agent: 'validator',
        test: 'Feature Categorization',
        status: 'pass',
        input,
        output,
        duration: Date.now() - startTime,
        details: {
          totalFeatures: output.categorizedFeatures?.length || 0,
          mustHaves: output.summary?.mustHaves || 0,
          performance: output.summary?.performance || 0,
          delighters: output.summary?.delighters || 0,
          hasRealRatings: output.categorizedFeatures?.some(f => 
            Object.values(f.productRatings || {}).some(r => r.rating !== 'Medium')
          ) || false
        }
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        agent: 'validator',
        test: 'Feature Categorization',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
      this.results.push(result);
      return result;
    }
  }

  // Test Analyst Agent
  async testAnalyst(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('[Test] Testing Analyst Agent...');
      
      // Create mock categorized features for testing
      const mockCategorizedFeatures = [
        {
          featureName: 'Real-time collaboration',
          genericDescription: 'Multiple users can edit simultaneously',
          category: 'performance' as const,
          categoryRationale: 'Performance feature where quality impacts satisfaction',
          productRatings: {
            'Notion': {
              rating: 'High' as const,
              justification: 'Excellent real-time collaboration features',
              sources: ['Notion product research'],
              flags: []
            },
            'Obsidian': {
              rating: 'Low' as const,
              justification: 'Limited collaboration features',
              sources: ['Obsidian research'],
              flags: []
            }
          }
        }
      ];

      const input = {
        categorizedFeatures: mockCategorizedFeatures,
        products: ['Notion', 'Obsidian'],
        targetCustomer: 'Knowledge workers'
      };

      const output = await analystAgent.generateKanoTable(input);

      const result: TestResult = {
        agent: 'analyst',
        test: 'Kano Table Generation',
        status: 'pass',
        input,
        output,
        duration: Date.now() - startTime,
        details: {
          hasTableData: !!output.tableData,
          featuresCount: output.tableData?.features?.length || 0,
          productsCount: output.tableData?.products?.length || 0,
          hasRatings: Object.keys(output.tableData?.ratings || {}).length > 0,
          hasSources: Object.keys(output.tableData?.sources || {}).length > 0
        }
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        agent: 'analyst',
        test: 'Kano Table Generation',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
      this.results.push(result);
      return result;
    }
  }

  // Test Orchestrator Integration
  async testOrchestrator(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('[Test] Testing Orchestrator Integration...');
      
      const input = {
        products: ['Notion'],
        features: [],
        targetCustomer: 'Knowledge workers'
      };

      let progressUpdates: any[] = [];
      const progressCallback = (update: any) => {
        progressUpdates.push(update);
        console.log(`[Test] Progress: ${update.message}`);
      };

      const output = await orchestratorAgent.coordinateFullAnalysis(
        input.products,
        input.features,
        input.targetCustomer,
        progressCallback,
        -999, // Test session ID
        'quick'
      );

      const result: TestResult = {
        agent: 'orchestrator',
        test: 'Full Analysis Coordination',
        status: 'pass',
        input,
        output,
        duration: Date.now() - startTime,
        details: {
          progressUpdates: progressUpdates.length,
          hasTableData: !!output.tableData,
          featuresFound: output.tableData?.features?.length || 0,
          hasAnalysis: !!output.analysis,
          progressSteps: progressUpdates.map(u => u.step || u.message)
        }
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        agent: 'orchestrator',
        test: 'Full Analysis Coordination',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
      this.results.push(result);
      return result;
    }
  }

  // Run all tests
  async runAllTests(): Promise<TestResult[]> {
    console.log('[AgentTester] Starting comprehensive agent testing...');
    this.results = [];

    // Test in order of dependency
    await this.testEnvironment();
    await this.testPerplexityAPI();
    await this.testResearcher();
    await this.testValidator();
    await this.testAnalyst();
    await this.testOrchestrator();

    console.log('[AgentTester] All tests completed:', this.results.length);
    return this.results;
  }

  // Get test summary
  getTestSummary() {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const errors = this.results.filter(r => r.status === 'error').length;

    return {
      total: this.results.length,
      passed,
      failed,
      errors,
      success: failed === 0 && errors === 0
    };
  }
}

export const agentTester = new AgentTester();
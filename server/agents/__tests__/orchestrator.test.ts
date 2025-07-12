import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrchestratorAgent } from '../orchestrator';
import { openai } from '../../openai';

// Mock OpenAI
vi.mock('../../openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  },
  searchProductInformation: vi.fn()
}));

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent;

  beforeEach(() => {
    orchestrator = new OrchestratorAgent();
    vi.clearAllMocks();
  });

  describe('processSuggestions', () => {
    it('should clean product list and generate suggestions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: `PRODUCT_INTERPRETATION: Cleaned "V0" to "v0", removed "etc"
SUGGESTED_PRODUCTS:
- Cursor | AI-powered code editor for developers
- Replit | Online IDE with AI assistance
- GitHub Copilot | AI pair programmer
SUGGESTED_FEATURES:
- AI Code Generation | Automatically generates code from natural language
- Real-time Collaboration | Multiple users can code together
- Integrated Debugging | Built-in debugging tools
- Version Control | Git integration for code management`
          }
        }]
      };

      vi.mocked(openai.chat.completions.create).mockResolvedValue(mockResponse as any);

      const input = {
        mode: 'suggestions' as const,
        formData: {
          products: 'V0, Vercel, etc',
          targetCustomers: 'Developers',
          description: 'Compare AI coding tools'
        },
        sessionId: 1
      };

      const result = await orchestrator.processSuggestions(input);

      expect(result.productInterpretation).toBe('Cleaned "V0" to "v0", removed "etc"');
      expect(result.suggestedProducts).toHaveLength(3);
      expect(result.suggestedProducts[0]).toEqual({
        name: 'Cursor',
        reason: 'AI-powered code editor for developers'
      });
      expect(result.suggestedFeatures).toHaveLength(4);
      expect(result.suggestedFeatures[0]).toBe('AI Code Generation');
    });

    it('should handle empty or invalid product names', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: `PRODUCT_INTERPRETATION: No valid products provided
SUGGESTED_PRODUCTS:
- Jira | Leading project management tool
- Asana | Work management platform
- Monday.com | Visual project tracking
SUGGESTED_FEATURES:
- Task Management | Create and assign tasks
- Team Collaboration | Share updates and communicate`
          }
        }]
      };

      vi.mocked(openai.chat.completions.create).mockResolvedValue(mockResponse as any);

      const input = {
        mode: 'suggestions' as const,
        formData: {
          products: 'etc, more, others',
          targetCustomers: 'Product Managers',
          description: 'Project management tools'
        },
        sessionId: 1
      };

      const result = await orchestrator.processSuggestions(input);

      expect(result.productInterpretation).toBe('No valid products provided');
      expect(result.suggestedProducts).toHaveLength(3);
      expect(result.suggestedFeatures).toHaveLength(2);
    });
  });

  describe('coordinateFullAnalysis', () => {
    it('should coordinate all phases and track progress', async () => {
      const progressUpdates: any[] = [];
      const onProgress = vi.fn((update) => progressUpdates.push(update));

      const products = ['Jira', 'Asana', 'Monday.com'];
      const features = ['Task Management', 'Reporting', 'Integrations'];
      const targetCustomer = 'Product Managers';

      const result = await orchestrator.coordinateFullAnalysis(
        products,
        features,
        targetCustomer,
        onProgress
      );

      // Check progress updates
      expect(onProgress).toHaveBeenCalledTimes(5);
      expect(progressUpdates[0]).toEqual({
        step: 'discovery',
        message: 'Initial setup complete. Starting comprehensive research...',
        progress: 20
      });
      expect(progressUpdates[4]).toEqual({
        step: 'analysis',
        message: 'Generating strategic insights...',
        progress: 90
      });

      // Check result structure
      expect(result).toHaveProperty('tableData');
      expect(result).toHaveProperty('analysis');
      expect(result.tableData).toHaveProperty('products', products);
      expect(result.tableData).toHaveProperty('features');
      expect(result.tableData).toHaveProperty('ratings');
      expect(result.analysis).toHaveProperty('marketOverview');
      expect(result.analysis).toHaveProperty('recommendations');
    });
  });

  describe('cleanProductList', () => {
    it('should remove filter words and clean product names', () => {
      // Access private method through any type casting for testing
      const cleanMethod = (orchestrator as any).cleanProductList.bind(orchestrator);
      
      const input = 'Jira, Asana, etc, Monday.com, more, Trello, others';
      const result = cleanMethod(input);
      
      expect(result).toEqual(['Jira', 'Asana', 'Monday.com', 'Trello']);
    });
  });

  describe('parseSuggestionResponse', () => {
    it('should correctly parse AI response into structured data', () => {
      // Access private method through any type casting for testing
      const parseMethod = (orchestrator as any).parseSuggestionResponse.bind(orchestrator);
      
      const content = `PRODUCT_INTERPRETATION: Fixed typos and removed invalid entries
SUGGESTED_PRODUCTS:
- Product A | Great for small teams
- Product B | Enterprise solution
SUGGESTED_FEATURES:
- Feature 1 | Description of feature 1
- Feature 2 | Description of feature 2`;

      const result = parseMethod(content);
      
      expect(result.productInterpretation).toBe('Fixed typos and removed invalid entries');
      expect(result.suggestedProducts).toHaveLength(2);
      expect(result.suggestedFeatures).toEqual(['Feature 1', 'Feature 2']);
    });
  });
});
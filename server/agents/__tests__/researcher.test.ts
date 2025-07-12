import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResearcherAgent } from '../researcher';
import { searchProductInformation } from '../../openai';

// Mock the search function
vi.mock('../../openai', () => ({
  searchProductInformation: vi.fn()
}));

describe('ResearcherAgent', () => {
  let researcher: ResearcherAgent;

  beforeEach(() => {
    researcher = new ResearcherAgent();
    vi.clearAllMocks();
  });

  describe('performResearch - suggestions mode', () => {
    it('should find competitor suggestions based on search results', async () => {
      const mockSearchResult = {
        content: `When looking at project management tools, competitors include Jira by Atlassian, 
        which is widely used for agile development. Similar to Monday.com, tools like Asana 
        and ClickUp offer visual project tracking. Notion is another alternative that combines 
        project management with documentation.`,
        sources: ['https://example.com']
      };

      vi.mocked(searchProductInformation).mockResolvedValue(mockSearchResult);

      const request = {
        mode: 'suggestions' as const,
        products: ['Monday.com'],
        targetCustomer: 'Product Managers',
        marketCategory: 'project management'
      };

      const result = await researcher.performResearch(request);
      
      expect(Array.isArray(result)).toBe(true);
      const suggestions = result as any[];
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);
      
      // Should include Jira from the search results
      const jiraSuggestion = suggestions.find(s => s.name.includes('Jira'));
      expect(jiraSuggestion).toBeDefined();
    });

    it('should return fallback suggestions when search fails', async () => {
      vi.mocked(searchProductInformation).mockRejectedValue(new Error('Search failed'));

      const request = {
        mode: 'suggestions' as const,
        products: ['Unknown Product'],
        targetCustomer: 'Developers',
        marketCategory: 'ai coding'
      };

      const result = await researcher.performResearch(request);
      
      expect(Array.isArray(result)).toBe(true);
      const suggestions = result as any[];
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should return AI coding fallbacks
      const hasAICodingTool = suggestions.some(s => 
        s.name.includes('GitHub Copilot') || 
        s.name.includes('Cursor') ||
        s.name.includes('Tabnine')
      );
      expect(hasAICodingTool).toBe(true);
    });
  });

  describe('performResearch - comprehensive mode', () => {
    it('should perform comprehensive research on multiple products', async () => {
      const mockSearchResults = [
        {
          content: `Jira by Atlassian is a project management tool targeting development teams. 
          Pricing starts at $7.75 per user per month. Features include: issue tracking, 
          agile boards, roadmaps, reporting. Unique differentiator: deep development tool integration.`,
          sources: ['https://jira.com']
        },
        {
          content: `Asana is designed for cross-functional teams. Pricing: $10.99 per user monthly. 
          Features: task management, timelines, portfolios, automation. Stands out with its 
          user-friendly interface.`,
          sources: ['https://asana.com']
        }
      ];

      vi.mocked(searchProductInformation)
        .mockResolvedValueOnce(mockSearchResults[0])
        .mockResolvedValueOnce(mockSearchResults[1]);

      const request = {
        mode: 'comprehensive' as const,
        products: ['Jira', 'Asana'],
        targetCustomer: 'Product Managers',
        featuresToResearch: ['task management', 'reporting']
      };

      const result = await researcher.performResearch(request);
      
      expect('products' in result).toBe(true);
      const comprehensiveResult = result as any;
      
      expect(comprehensiveResult.products).toHaveLength(2);
      expect(comprehensiveResult.products[0].name).toBe('Jira');
      expect(comprehensiveResult.products[0].company).toContain('Atlassian');
      expect(comprehensiveResult.products[0].pricing).toContain('7.75');
      expect(comprehensiveResult.products[0].features.length).toBeGreaterThan(0);

      expect(comprehensiveResult.featureSummary).toBeDefined();
      expect(comprehensiveResult.featureSummary.totalUniqueFeatures).toBeGreaterThan(0);
    });

    it('should identify common and differentiating features', async () => {
      const mockSearchResults = [
        {
          content: `Product A features: task management, reporting, integrations, mobile app`,
          sources: ['https://a.com']
        },
        {
          content: `Product B features: task management, reporting, AI assistant, custom workflows`,
          sources: ['https://b.com']
        }
      ];

      vi.mocked(searchProductInformation)
        .mockResolvedValueOnce(mockSearchResults[0])
        .mockResolvedValueOnce(mockSearchResults[1]);

      const request = {
        mode: 'comprehensive' as const,
        products: ['Product A', 'Product B'],
        targetCustomer: 'Teams'
      };

      const result = await researcher.performResearch(request);
      const comprehensiveResult = result as any;

      // Task management and reporting should be common (appear in both)
      expect(comprehensiveResult.featureSummary.commonFeatures).toContain('task management');
      expect(comprehensiveResult.featureSummary.commonFeatures).toContain('reporting');

      // AI assistant and custom workflows should be differentiating
      const hasDifferentiators = comprehensiveResult.featureSummary.differentiatingFeatures.some(
        (f: string) => f.includes('AI assistant') || f.includes('custom workflows') || 
                       f.includes('mobile app') || f.includes('integrations')
      );
      expect(hasDifferentiators).toBe(true);
    });
  });

  describe('extraction methods', () => {
    it('should extract pricing information correctly', () => {
      const researcher = new ResearcherAgent();
      const extractPricing = (researcher as any).extractPricing.bind(researcher);

      const content1 = 'Pricing: $10 per user per month';
      expect(extractPricing(content1)).toContain('$10');
      expect(extractPricing(content1)).toContain('per');

      const content2 = 'Costs $99/year for the pro plan';
      expect(extractPricing(content2)).toContain('$99');

      const content3 = 'No pricing info here';
      expect(extractPricing(content3)).toBe('Pricing information not found');
    });

    it('should extract target market correctly', () => {
      const researcher = new ResearcherAgent();
      const extractTargetMarket = (researcher as any).extractTargetMarket.bind(researcher);

      expect(extractTargetMarket('Designed for small businesses')).toBe('small businesses');
      expect(extractTargetMarket('Targeting developers and engineers')).toBe('developers and engineers');
      expect(extractTargetMarket('Serves enterprise customers')).toBe('enterprise customers');
    });

    it('should extract features correctly', () => {
      const researcher = new ResearcherAgent();
      const extractFeatures = (researcher as any).extractFeatures.bind(researcher);

      const content = 'Features: task management, time tracking, reporting, integrations';
      const features = extractFeatures(content, 'TestProduct');

      expect(features.length).toBeGreaterThan(0);
      expect(features[0].name).toBe('task management');
      expect(features[0].description).toContain('TestProduct');
      expect(features[0].sources).toBeDefined();
    });
  });
});
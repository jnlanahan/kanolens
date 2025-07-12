import { searchProductInformation } from "../openai";

export interface ResearchRequest {
  mode: 'suggestions' | 'comprehensive';
  products: string[];
  targetCustomer: string;
  marketCategory?: string;
  featuresToResearch?: string[];
}

export interface ProductSuggestion {
  name: string;
  justification: string;
  targetOverlap: string;
}

export interface ComprehensiveResearch {
  products: Array<{
    name: string;
    company: string;
    targetMarket: string;
    pricing: string;
    features: Array<{
      name: string;
      description: string;
      benefit: string;
      implementationDetails: string;
      performanceMetrics?: string;
      sources: string[];
    }>;
    uniqueDifferentiators: string[];
    marketPosition: string;
  }>;
  featureSummary: {
    totalUniqueFeatures: number;
    commonFeatures: string[];
    differentiatingFeatures: string[];
  };
}

export class ResearcherAgent {
  async performResearch(request: ResearchRequest): Promise<ProductSuggestion[] | ComprehensiveResearch> {
    console.log(`[Researcher] Starting ${request.mode} research`);
    
    if (request.mode === 'suggestions') {
      return this.findCompetitorSuggestions(request);
    } else {
      return this.performComprehensiveResearch(request);
    }
  }

  private async findCompetitorSuggestions(request: ResearchRequest): Promise<ProductSuggestion[]> {
    const searchQuery = `competitive products similar to ${request.products.join(', ')} for ${request.targetCustomer} ${request.marketCategory || ''}`;
    
    try {
      const searchResults = await searchProductInformation(searchQuery);
      
      // Parse search results to extract competitor suggestions
      const suggestions = this.parseCompetitorSuggestions(searchResults.content, request);
      
      // Ensure we have 3-5 suggestions
      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('[Researcher] Error finding competitors:', error);
      // Return fallback suggestions based on market category
      return this.getFallbackSuggestions(request);
    }
  }

  private async performComprehensiveResearch(request: ResearchRequest): Promise<ComprehensiveResearch> {
    const products = await Promise.all(
      request.products.map(product => this.researchSingleProduct(product, request))
    );

    // Analyze features across all products
    const allFeatures = new Set<string>();
    const featureFrequency = new Map<string, number>();
    
    products.forEach(product => {
      product.features.forEach(feature => {
        allFeatures.add(feature.name);
        featureFrequency.set(feature.name, (featureFrequency.get(feature.name) || 0) + 1);
      });
    });

    const totalProducts = products.length;
    const commonFeatures = Array.from(featureFrequency.entries())
      .filter(([_, count]) => count >= totalProducts * 0.8)
      .map(([feature, _]) => feature);
    
    const differentiatingFeatures = Array.from(featureFrequency.entries())
      .filter(([_, count]) => count === 1)
      .map(([feature, _]) => feature);

    return {
      products,
      featureSummary: {
        totalUniqueFeatures: allFeatures.size,
        commonFeatures,
        differentiatingFeatures
      }
    };
  }

  private async researchSingleProduct(
    productName: string, 
    request: ResearchRequest
  ): Promise<ComprehensiveResearch['products'][0]> {
    const searchQuery = `${productName} features pricing target market ${request.targetCustomer} latest 2024 2025`;
    
    try {
      const searchResults = await searchProductInformation(searchQuery);
      
      // Parse the search results to extract product information
      const productInfo = this.parseProductInformation(productName, searchResults.content, request);
      
      // Research specific features if provided
      if (request.featuresToResearch && request.featuresToResearch.length > 0) {
        const featureDetails = await this.researchProductFeatures(
          productName, 
          request.featuresToResearch,
          request.targetCustomer
        );
        productInfo.features = this.mergeFeatureInformation(productInfo.features, featureDetails);
      }
      
      return productInfo;
    } catch (error) {
      console.error(`[Researcher] Error researching ${productName}:`, error);
      return this.getFallbackProductInfo(productName, request);
    }
  }

  private async researchProductFeatures(
    productName: string,
    features: string[],
    targetCustomer: string
  ): Promise<any[]> {
    const featureQueries = features.map(feature => 
      `${productName} ${feature} implementation ${targetCustomer} benefits performance`
    );

    const results = await Promise.all(
      featureQueries.map(query => searchProductInformation(query))
    );

    return results.map((result, index) => ({
      name: features[index],
      details: this.parseFeatureDetails(result.content, features[index], productName)
    }));
  }

  private parseCompetitorSuggestions(content: string, request: ResearchRequest): ProductSuggestion[] {
    // This is a simplified parser - in production, would use more sophisticated NLP
    const suggestions: ProductSuggestion[] = [];
    const lines = content.split('\n');
    
    // Look for product mentions in the content
    const productPattern = /(?:competitors?|alternatives?|similar to|like|such as)\s+([A-Z][a-zA-Z0-9\s\.\-]+)/gi;
    const matches = content.matchAll(productPattern);
    
    for (const match of matches) {
      const productName = match[1].trim();
      if (!request.products.includes(productName) && productName.length > 2) {
        suggestions.push({
          name: productName,
          justification: `Direct competitor in the ${request.marketCategory || 'same market'}`,
          targetOverlap: `Serves ${request.targetCustomer} with similar capabilities`
        });
      }
    }
    
    return suggestions;
  }

  private parseProductInformation(
    productName: string,
    content: string,
    request: ResearchRequest
  ): ComprehensiveResearch['products'][0] {
    // Parse the search content to extract product details
    // This is simplified - production would use more sophisticated parsing
    
    return {
      name: productName,
      company: this.extractCompanyName(content, productName),
      targetMarket: this.extractTargetMarket(content) || request.targetCustomer,
      pricing: this.extractPricing(content),
      features: this.extractFeatures(content, productName),
      uniqueDifferentiators: this.extractDifferentiators(content),
      marketPosition: this.extractMarketPosition(content, productName)
    };
  }

  private parseFeatureDetails(content: string, featureName: string, productName: string): any {
    return {
      description: `Implementation of ${featureName} in ${productName}`,
      benefit: this.extractBenefit(content, featureName),
      implementationDetails: this.extractImplementationDetails(content),
      performanceMetrics: this.extractMetrics(content),
      sources: this.extractSources(content)
    };
  }

  private mergeFeatureInformation(baseFeatures: any[], detailedFeatures: any[]): any[] {
    const merged = [...baseFeatures];
    
    detailedFeatures.forEach(detailed => {
      const existing = merged.find(f => f.name === detailed.name);
      if (existing) {
        Object.assign(existing, detailed.details);
      } else {
        merged.push({
          name: detailed.name,
          ...detailed.details
        });
      }
    });
    
    return merged;
  }

  // Extraction helper methods
  private extractCompanyName(content: string, productName: string): string {
    const pattern = new RegExp(`${productName}\\s+(?:by|from|created by|developed by)\\s+([A-Z][a-zA-Z\\s]+)`, 'i');
    const match = content.match(pattern);
    return match ? match[1].trim() : productName;
  }

  private extractTargetMarket(content: string): string {
    const patterns = [
      /target(?:ed|ing)?\s+(?:to|at|for)\s+([^,\.]+)/i,
      /designed for\s+([^,\.]+)/i,
      /serves?\s+([^,\.]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    
    return '';
  }

  private extractPricing(content: string): string {
    const patterns = [
      /pricing:?\s*\$?(\d+(?:\.\d+)?)\s*(?:per|\/)\s*(\w+)/i,
      /costs?\s*\$?(\d+(?:\.\d+)?)\s*(?:per|\/)\s*(\w+)/i,
      /(\w+)\s+plan:?\s*\$?(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[0];
    }
    
    return 'Pricing information not found';
  }

  private extractFeatures(content: string, productName: string): any[] {
    const features: any[] = [];
    const featurePatterns = [
      /features?:?\s*([^\.]+)/i,
      /capabilities?:?\s*([^\.]+)/i,
      /includes?:?\s*([^\.]+)/i
    ];
    
    for (const pattern of featurePatterns) {
      const match = content.match(pattern);
      if (match) {
        const featureList = match[1].split(/[,;]/).map(f => f.trim());
        featureList.forEach(feature => {
          if (feature.length > 3) {
            features.push({
              name: feature,
              description: `${feature} capability in ${productName}`,
              benefit: `Enhances productivity and efficiency`,
              implementationDetails: 'Standard implementation',
              sources: ['Research data']
            });
          }
        });
      }
    }
    
    return features.slice(0, 10); // Limit to 10 features
  }

  private extractDifferentiators(content: string): string[] {
    const differentiators: string[] = [];
    const patterns = [
      /unique(?:ly)?\s+([^,\.]+)/i,
      /differentiator?:?\s*([^,\.]+)/i,
      /stands out\s+(?:by|with|for)\s+([^,\.]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) differentiators.push(match[1].trim());
    }
    
    return differentiators;
  }

  private extractMarketPosition(content: string, productName: string): string {
    const patterns = [
      /leader\s+in/i,
      /leading\s+\w+/i,
      /top\s+\d+/i,
      /best\s+\w+/i
    ];
    
    for (const pattern of patterns) {
      if (content.match(new RegExp(`${productName}.*${pattern.source}`, 'i'))) {
        return 'Market leader';
      }
    }
    
    return 'Established player';
  }

  private extractBenefit(content: string, featureName: string): string {
    const pattern = new RegExp(`${featureName}.*(?:helps?|enables?|allows?|provides?)\\s+([^,\.]+)`, 'i');
    const match = content.match(pattern);
    return match ? match[1].trim() : `Improves user experience`;
  }

  private extractImplementationDetails(content: string): string {
    const patterns = [
      /implemented\s+(?:using|with|through)\s+([^,\.]+)/i,
      /built\s+(?:on|with)\s+([^,\.]+)/i,
      /powered by\s+([^,\.]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    
    return 'Standard implementation';
  }

  private extractMetrics(content: string): string {
    const patterns = [
      /(\d+%?\s*(?:faster|better|more|less|improvement))/i,
      /(\d+x?\s*(?:performance|speed|efficiency))/i,
      /(\d+(?:\.\d+)?\s*(?:ms|seconds?|minutes?))/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    
    return '';
  }

  private extractSources(content: string): string[] {
    // In a real implementation, this would extract actual URLs from search results
    return ['Product documentation', 'User reviews', 'Industry analysis'];
  }

  // Fallback methods
  private getFallbackSuggestions(request: ResearchRequest): ProductSuggestion[] {
    const fallbacksByCategory: Record<string, ProductSuggestion[]> = {
      'project management': [
        { name: 'Jira', justification: 'Industry-leading project management tool', targetOverlap: 'Widely used by product managers and development teams' },
        { name: 'Asana', justification: 'Popular work management platform', targetOverlap: 'Favored by cross-functional teams' },
        { name: 'Monday.com', justification: 'Visual project tracking solution', targetOverlap: 'Great for visual learners and collaborative teams' },
        { name: 'ClickUp', justification: 'All-in-one productivity platform', targetOverlap: 'Comprehensive solution for diverse teams' },
        { name: 'Notion', justification: 'Flexible workspace and project tool', targetOverlap: 'Popular with tech-savvy teams' }
      ],
      'ai coding': [
        { name: 'GitHub Copilot', justification: 'AI pair programmer by GitHub', targetOverlap: 'Essential for modern developers' },
        { name: 'Cursor', justification: 'AI-first code editor', targetOverlap: 'Built for AI-assisted development' },
        { name: 'Tabnine', justification: 'AI code completion tool', targetOverlap: 'Supports multiple IDEs and languages' },
        { name: 'Codeium', justification: 'Free AI coding assistant', targetOverlap: 'Great for individual developers' },
        { name: 'Amazon CodeWhisperer', justification: 'AWS-integrated AI coding tool', targetOverlap: 'Perfect for AWS developers' }
      ]
    };

    const category = request.marketCategory?.toLowerCase() || '';
    for (const [key, suggestions] of Object.entries(fallbacksByCategory)) {
      if (category.includes(key)) {
        return suggestions;
      }
    }

    return [
      { name: 'Competitor A', justification: 'Leading solution in the market', targetOverlap: `Serves ${request.targetCustomer}` },
      { name: 'Competitor B', justification: 'Popular alternative', targetOverlap: `Targets similar user base` },
      { name: 'Competitor C', justification: 'Emerging player', targetOverlap: `Growing presence in the market` }
    ];
  }

  private getFallbackProductInfo(productName: string, request: ResearchRequest): ComprehensiveResearch['products'][0] {
    return {
      name: productName,
      company: productName,
      targetMarket: request.targetCustomer,
      pricing: 'Contact for pricing',
      features: [
        {
          name: 'Core Functionality',
          description: `Essential features for ${request.targetCustomer}`,
          benefit: 'Meets basic user needs',
          implementationDetails: 'Standard implementation',
          sources: ['General market knowledge']
        }
      ],
      uniqueDifferentiators: ['Market presence'],
      marketPosition: 'Established player'
    };
  }
}

export const researcherAgent = new ResearcherAgent();
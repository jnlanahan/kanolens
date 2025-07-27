// REAL RESEARCH ONLY - No fake content generation

import { enhancedRateLimiter } from './enhanced-rate-limiter';
import { parallelResearchOptimizer, ResearchProgress } from './parallel-research-optimizer';

// Legacy rate limiter for backwards compatibility
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) { // 10 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time
      const oldestRequest = this.requests[0];
      const waitTime = (oldestRequest + this.windowMs) - now + 1000; // Add 1s buffer
      console.log(`[RateLimiter] Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      // Retry after waiting
      return this.waitIfNeeded();
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

// Enhanced Perplexity API integration with optimized rate limiting
async function searchWithPerplexity(query: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<{content: string, sources: string[]}> {
  console.log(`[Perplexity] Searching for: ${query} (priority: ${priority})`);
  
  return enhancedRateLimiter.executeRequest(
    async () => {
      return performPerplexitySearch(query);
    },
    {
      priority,
      retryAttempts: 3,
      timeout: 30000,
      metadata: { query: query.substring(0, 100) }
    }
  );
}

// Separated actual API call for better error handling and monitoring
async function performPerplexitySearch(query: string): Promise<{content: string, sources: string[]}> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a competitive research analyst. Provide detailed, factual information about products, features, and market positioning. Focus on current information and cite sources.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 1000,
        temperature: 0.2,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      // Let the enhanced rate limiter handle retries instead of manual retry
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429) - will be retried by enhanced rate limiter`);
      }
      throw new Error(`Perplexity API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const sources = data.citations || [];
    
    console.log(`[Perplexity] Search completed: ${content.length} chars, ${sources.length} sources`);
    return { content, sources };
  } catch (error) {
    console.error(`[Perplexity] Search failed for query: ${query.substring(0, 100)}...`);
    
    // Let enhanced rate limiter handle retries
    throw error;
  }
}

export interface ResearchRequest {
  mode: 'suggestions' | 'comprehensive';
  products: string[];
  targetCustomer: string;
  marketCategory?: string;
  featuresToResearch?: string[];
  originallyAgreedFeatures?: string[]; // Phase 2: Features from initial user conversation
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
    // Apply intelligent input interpretation
    const cleanProducts = this.interpretAndCleanProducts(request.products);
    const searchQuery = `competitive products similar to ${cleanProducts.join(', ')} for ${request.targetCustomer} ${request.marketCategory || ''} 2024 alternatives competitors market analysis`;
    
    try {
      console.log(`[Researcher] Searching for competitor suggestions: ${searchQuery}`);
      const searchResults = await searchWithPerplexity(searchQuery, 'high');
      
      // Parse search results to extract competitor suggestions
      const suggestions = this.parseCompetitorSuggestions(searchResults.content, request);
      
      console.log(`[Researcher] Found ${suggestions.length} competitor suggestions from real research`);
      
      // Return actual suggestions found (no minimum required)
      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('[Researcher] REAL COMPETITOR RESEARCH FAILED:', error);
      throw new Error(`Failed to find competitors for ${request.products.join(', ')}. Real research required - no fallback available.`);
    }
  }

  private async performComprehensiveResearch(request: ResearchRequest): Promise<ComprehensiveResearch> {
    // Apply intelligent input interpretation
    const cleanProducts = this.interpretAndCleanProducts(request.products);
    const cleanFeatures = request.featuresToResearch ? this.interpretAndCleanFeatures(request.featuresToResearch) : [];
    
    // Phase 2: Track originally agreed features for preservation
    const originalFeatures = request.originallyAgreedFeatures ? this.interpretAndCleanFeatures(request.originallyAgreedFeatures) : [];
    console.log(`[Researcher] Original agreed features: ${originalFeatures.join(', ')}`);
    
    // Enhanced parallel processing with optimization
    parallelResearchOptimizer.reset();
    
    const products = await parallelResearchOptimizer.optimizeResearchFlow(
      cleanProducts,
      (product: string) => this.researchSingleProduct(product, { 
        ...request, 
        featuresToResearch: cleanFeatures,
        originallyAgreedFeatures: originalFeatures 
      }),
      (progress: ResearchProgress) => {
        console.log(`[Researcher] Progress: ${progress.completed}/${progress.total} products completed, throughput: ${progress.throughput.toFixed(2)} products/min`);
        if (progress.currentProducts.length > 0) {
          console.log(`[Researcher] Currently researching: ${progress.currentProducts.join(', ')}`);
        }
      }
    );

    // Analyze features across all products
    const allFeatures = new Set<string>();
    const featureFrequency = new Map<string, number>();
    
    // Phase 2: Mark originally agreed features in the product data
    products.forEach(product => {
      product.features.forEach(feature => {
        allFeatures.add(feature.name);
        featureFrequency.set(feature.name, (featureFrequency.get(feature.name) || 0) + 1);
        
        // Mark if this was an originally agreed feature
        if (originalFeatures.some(orig => 
          orig.toLowerCase() === feature.name.toLowerCase() || 
          feature.name.toLowerCase().includes(orig.toLowerCase()) ||
          orig.toLowerCase().includes(feature.name.toLowerCase())
        )) {
          feature.originallyAgreed = true;
          console.log(`[Researcher] Marked "${feature.name}" as originally agreed feature`);
        }
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
    console.log(`[Researcher] Researching ${productName} for ${request.targetCustomer}`);
    
    // Use EXACT approach that works manually - single targeted query
    const kanoPrompt = `Give me a list of features/benefits of ${productName} and categorize them using these definitions:

FEATURE DEFINITION: A feature is a specific, identifiable characteristic or functionality of a product that provides value to the user and fulfills a need or solves a problem.

DESCRIPTION GUIDELINES:
- Write in plain text that clearly explains what the feature does
- Use the user's context (products: ${request.products}, role: ${request.targetCustomer}, industry context: ${request.marketCategory || 'general'}) to make descriptions relevant
- Avoid generic marketing language
- Keep descriptions 1-2 sentences, clear and concise
- Focus on the actual functionality, not benefits

FEATURE LIMITS & PRIORITY RULES:
- MAXIMUM 50 features in the final Kano Model table
- MANDATORY: 100% of user-approved features from initial conversation MUST be included
- User-approved features take absolute priority in the top 50 selection
- Never drop, replace, or modify originally user-approved features
- Mark new research-discovered features with "*new research finding"
- If user-approved + new features exceed 50, include ALL user-approved features first
- Fill remaining slots (up to 50 total) with highest-value new research findings
- Group similar features under broader benefit categories when space is limited
- Prioritize features most relevant to: ${request.products}, ${request.targetCustomer}, ${request.marketCategory || 'general'}

Must-Have Benefits of a Product: Aspects of a Product that customers require and expect in your Product. You cannot avoid adding these, and they should be a top priority if they are not already part of your Product.

Performance Benefits: Features that customers use to compare different options. The better you perform, the more satisfied customers become. These are features customers openly discuss and request.

Delighter Benefits: Features that customers don't expect but create positive surprise and delight when discovered. These features can differentiate your product and create competitive advantage.

Focus on current 2024-2025 features and capabilities. Target customer: ${request.targetCustomer}`;
    
    const researchQueries = [kanoPrompt];
    
    try {
      console.log(`[Researcher] Performing single Kano research query for ${productName}`);
      
      // Single Perplexity call - exactly like manual approach
      const result = await searchWithPerplexity(researchQueries[0], 'high');
      
      console.log(`[Researcher] Research completed for ${productName}: ${result.content.length} chars, ${result.sources.length} sources`);
      
      // Parse the Kano categorized research
      const productInfo = this.parseProductInformation(productName, result.content, request);
      productInfo.sources = result.sources;
      
      console.log(`[Researcher] Parsed ${productInfo.features.length} features for ${productName}`);
      return productInfo;
    } catch (error) {
      console.error(`[Researcher] REAL RESEARCH FAILED for ${productName}:`, error);
      
      // NO FALLBACK - Real research required
      throw new Error(`Real research failed for ${productName}. Error: ${error.message}`);
    }
  }

  private async researchProductFeatures(
    productName: string,
    features: string[],
    targetCustomer: string
  ): Promise<any[]> {
    console.log(`[Researcher] Deep feature research for ${productName}: ${features.join(', ')}`);
    
    const results = [];
    
    // Research each feature comprehensively
    for (const feature of features) {
      try {
        // Multiple search angles for each feature
        const featureQueries = [
          `${productName} ${feature} capabilities features review 2024`,
          `how does ${productName} ${feature} work user experience`,
          `${productName} ${feature} vs competitors comparison strengths weaknesses`
        ];
        
        // Sequential requests to avoid rate limits
        const featureResults = [];
        for (const query of featureQueries) {
          try {
            const result = await searchWithPerplexity(query, 'normal');
            featureResults.push(result);
          } catch (error) {
            console.error(`[Researcher] Feature search failed for query: ${query}`, error);
            // Continue with other queries
          }
        }
        
        // Combine all feature research
        const combinedFeatureContent = featureResults.map(r => r.content).join('\n\n---\n\n');
        const combinedFeatureSources = featureResults.flatMap(r => r.sources);
        
        results.push({
          name: feature,
          details: this.parseFeatureDetails(combinedFeatureContent, feature, productName, combinedFeatureSources)
        });
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`[Researcher] Feature research failed for ${feature}:`, error);
        throw new Error(`Real feature research failed for ${feature} in ${productName}`);
      }
    }
    
    return results;
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
    // Parse Kano categorized features from Perplexity response
    console.log(`[Researcher] Parsing Kano categorization for ${productName}`);
    
    const features = this.extractKanoFeatures(content, productName);
    
    return {
      name: productName,
      company: this.extractCompanyName(content, productName),
      targetMarket: this.extractTargetMarket(content) || request.targetCustomer,
      pricing: this.extractPricing(content),
      features: features,
      uniqueDifferentiators: this.extractDifferentiators(content),
      marketPosition: this.extractMarketPosition(content, productName)
    };
  }

  private extractKanoFeatures(content: string, productName: string): any[] {
    const features = [];
    
    // Look for features in the standard Kano categorization format
    const sections = {
      'must-have': /Must-Have[\s\S]*?(?=Performance|Delighter|$)/i,
      'performance': /Performance[\s\S]*?(?=Delighter|Must-Have|$)/i,
      'delighter': /Delighter[\s\S]*?(?=Must-Have|Performance|$)/i
    };
    
    for (const [category, pattern] of Object.entries(sections)) {
      const match = content.match(pattern);
      if (match) {
        const sectionContent = match[0];
        
        // Extract bullet points or numbered items
        const featureMatches = sectionContent.match(/(?:•|[*\-]|\d+\.)\s*([^•*\-\n\d][^\n]+)/g);
        
        if (featureMatches) {
          featureMatches.forEach(featureText => {
            const cleanText = featureText.replace(/^(?:•|[*-]|\d+\.)\s*/, '').trim();
            
            // Split feature name from description if colon is present
            const [name, ...descParts] = cleanText.split(':');
            const description = descParts.join(':').trim();
            
            if (name && name.length > 2) {
              features.push({
                name: name.trim(),
                description: description || `${name.trim()} capability in ${productName}`,
                category: category,
                importance: this.getCategoryImportance(category),
                source: 'Perplexity AI Research'
              });
            }
          });
        }
      }
    }
    
    // If no categorized features found, fall back to general extraction
    if (features.length === 0) {
      console.log(`[Researcher] No Kano categorization found, using general extraction for ${productName}`);
      return this.extractFeatures(content, productName);
    }
    
    console.log(`[Researcher] Extracted ${features.length} Kano categorized features for ${productName}`);
    return features;
  }

  private getCategoryImportance(category: string): string {
    switch (category) {
      case 'must-have': return 'critical';
      case 'performance': return 'high';
      case 'delighter': return 'medium';
      default: return 'medium';
    }
  }

  private parseFeatureDetails(content: string, featureName: string, productName: string, sources: string[] = []): any {
    return {
      description: this.extractFeatureDescription(content, featureName, productName),
      benefit: this.extractBenefit(content, featureName),
      implementationDetails: this.extractImplementationDetails(content),
      performanceMetrics: this.extractMetrics(content),
      sources: sources.length > 0 ? sources : this.extractSources(content)
    };
  }

  private extractFeatureDescription(content: string, featureName: string, productName: string): string {
    // Extract actual description from the Perplexity content instead of generic placeholder
    const patterns = [
      new RegExp(`${productName}[^.]*${featureName}[^.]*\\.`, 'i'),
      new RegExp(`${featureName}[^.]*${productName}[^.]*\\.`, 'i'),
      new RegExp(`${featureName}[^.]*\\.`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    
    // Fallback to first sentence containing the feature name
    const sentences = content.split(/[.!?]+/);
    const relevantSentence = sentences.find(s => 
      s.toLowerCase().includes(featureName.toLowerCase()) || 
      s.toLowerCase().includes(productName.toLowerCase())
    );
    
    return relevantSentence ? relevantSentence.trim() : `${featureName} implementation in ${productName}`;
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
    const extractedNames = new Set<string>();
    
    // 1. Extract AI/ML features (potential delighters)
    const aiPattern = /(?:AI|artificial intelligence|machine learning|smart|intelligent|automated)\s+(?:features?|capabilities?|tools?|workflows?)[^.]*\.?[^.]*\./gi;
    const aiMatches = content.matchAll(aiPattern);
    
    for (const match of aiMatches) {
      const text = match[0];
      const aiFeatures = this.parseAIFeatures(text, productName);
      aiFeatures.forEach(f => {
        if (!extractedNames.has(f.name.toLowerCase())) {
          extractedNames.add(f.name.toLowerCase());
          features.push(f);
        }
      });
    }
    
    // 2. Extract from bullet points and structured lists (enhanced patterns)
    const bulletPatterns = [
      // Standard bullet format: - **Feature**: Description
      /(?:^|\n)\s*[-•*]\s*\*?\*?([^:]+)\*?\*?:\s*([^.\n]+(?:\.[^.\n]+)?)/gm,
      // Table rows: | Feature | Description |
      /\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|(?:\s*[^|]+?\s*\|)?/gm,
      // Numbered lists: 1. Feature - Description
      /(?:^|\n)\s*\d+\.\s*\*?\*?([^:-]+)[\s:-]+([^.\n]+)/gm,
      // Features in sentences: "Features include X, Y, and Z"
      /(?:features?|capabilities|includes?|offers?)(?:\s+include)?:?\s*([^.\n]+)/gi
    ];
    
    for (const pattern of bulletPatterns) {
      const matches = content.matchAll(pattern);
      
      for (const match of matches) {
        let featureName = this.cleanFeatureName(match[1]);
        let description = match[2] ? match[2].trim() : `${featureName} functionality`;
        
        // For feature lists (like "X, Y, and Z"), split and process each
        if (pattern.source.includes('features?|capabilities') && match[1].includes(',')) {
          const featureList = match[1].split(',').map(f => f.trim().replace(/\s+and\s+/gi, ', ').split(', ')).flat();
          
          featureList.forEach(individualFeature => {
            const cleanFeature = this.cleanFeatureName(individualFeature);
            if (!extractedNames.has(cleanFeature.toLowerCase()) && this.isValidFeatureName(cleanFeature)) {
              extractedNames.add(cleanFeature.toLowerCase());
              features.push({
                name: cleanFeature,
                description: `${cleanFeature} capabilities in ${productName}`,
                benefit: this.extractBenefitFromDescription(description, cleanFeature),
                implementationDetails: 'Core feature implementation',
                performanceMetrics: this.extractMetrics(content),
                sources: ['Perplexity Research']
              });
            }
          });
        } else if (!extractedNames.has(featureName.toLowerCase()) && this.isValidFeatureName(featureName)) {
          extractedNames.add(featureName.toLowerCase());
          features.push({
            name: featureName,
            description: description,
            benefit: this.extractBenefitFromDescription(description, featureName),
            implementationDetails: 'Advanced implementation',
            performanceMetrics: this.extractMetrics(content),
            sources: ['Perplexity Research']
          });
        }
      }
    }
    
    // 3. Extract comprehensive features mentioned in context
    const comprehensiveFeatures = [
      // Core Project Management
      { pattern: /task\s+(?:management|tracking|automation|assignment)/gi, name: 'Task Management' },
      { pattern: /project\s+(?:management|planning|tracking)/gi, name: 'Project Planning' },
      { pattern: /team\s+(?:collaboration|communication)/gi, name: 'Team Collaboration' },
      { pattern: /workflow\s+(?:automation|builder|management)/gi, name: 'Workflow Automation' },
      { pattern: /resource\s+(?:management|allocation|planning)/gi, name: 'Resource Management' },
      { pattern: /portfolio\s+(?:management|tracking)/gi, name: 'Portfolio Management' },
      
      // Views & Visualization
      { pattern: /(?:gantt\s+charts?|timeline\s+view|gantt)/gi, name: 'Gantt/Timeline View' },
      { pattern: /kanban\s+(?:board|view)/gi, name: 'Kanban Board' },
      { pattern: /calendar\s+(?:view|integration)/gi, name: 'Calendar View' },
      { pattern: /dashboards?/gi, name: 'Dashboard' },
      { pattern: /(?:board\s+view|project\s+boards?)/gi, name: 'Board View' },
      { pattern: /list\s+view/gi, name: 'List View' },
      
      // Collaboration & Communication
      { pattern: /(?:real-?time|live)\s+(?:updates?|sync|collaboration|editing)/gi, name: 'Real-time Collaboration' },
      { pattern: /(?:comments?|commenting)/gi, name: 'Comments & Discussion' },
      { pattern: /(?:@mentions?|mentions?)/gi, name: '@Mentions' },
      { pattern: /(?:file\s+sharing|document\s+sharing)/gi, name: 'File Sharing' },
      { pattern: /(?:team\s+inbox|notifications?)/gi, name: 'Notifications' },
      { pattern: /(?:chat|messaging)/gi, name: 'Team Chat' },
      
      // Reporting & Analytics  
      { pattern: /reporting\s+(?:and\s+)?analytics/gi, name: 'Reporting & Analytics' },
      { pattern: /(?:custom\s+reports?|report\s+builder)/gi, name: 'Custom Reports' },
      { pattern: /(?:insights?|analytics)/gi, name: 'Project Insights' },
      { pattern: /(?:metrics|kpis?)/gi, name: 'Performance Metrics' },
      { pattern: /(?:time\s+tracking|timesheet)/gi, name: 'Time Tracking' },
      
      // Customization & Configuration
      { pattern: /custom\s+fields?/gi, name: 'Custom Fields' },
      { pattern: /(?:templates?|project\s+templates?)/gi, name: 'Project Templates' },
      { pattern: /(?:custom\s+workflows?|workflow\s+customization)/gi, name: 'Custom Workflows' },
      { pattern: /(?:automation\s+rules?|automated\s+rules?)/gi, name: 'Automation Rules' },
      
      // Integration & API
      { pattern: /integrations?/gi, name: 'Third-party Integrations' },
      { pattern: /(?:api|developer)\s+(?:access|tools|api)/gi, name: 'API Access' },
      { pattern: /(?:zapier|webhook)/gi, name: 'Automation Integrations' },
      
      // Access & Security
      { pattern: /(?:security|encryption|sso|two-factor)/gi, name: 'Security Features' },
      { pattern: /(?:permissions?|access\s+control)/gi, name: 'Access Control' },
      { pattern: /(?:guest\s+access|external\s+users?)/gi, name: 'Guest Access' },
      
      // Mobile & Accessibility
      { pattern: /mobile\s+(?:app|access|version)/gi, name: 'Mobile App' },
      { pattern: /(?:offline\s+access|offline\s+mode)/gi, name: 'Offline Access' },
      
      // Advanced Features
      { pattern: /(?:dependencies|task\s+dependencies)/gi, name: 'Task Dependencies' },
      { pattern: /(?:milestones?|project\s+milestones?)/gi, name: 'Milestones' },
      { pattern: /(?:goals?|objectives?)/gi, name: 'Goal Setting' },
      { pattern: /(?:budgeting|budget\s+tracking)/gi, name: 'Budget Management' },
      { pattern: /(?:invoicing|billing)/gi, name: 'Invoicing' },
      { pattern: /(?:client\s+portal|client\s+access)/gi, name: 'Client Portal' }
    ];
    
    for (const { pattern, name } of comprehensiveFeatures) {
      if (pattern.test(content) && !extractedNames.has(name.toLowerCase())) {
        // Verify feature is mentioned in product context
        const productContext = new RegExp(`${productName}[^.]{0,200}${pattern.source}`, 'gi');
        const reverseContext = new RegExp(`${pattern.source}[^.]{0,200}${productName}`, 'gi');
        
        if (productContext.test(content) || reverseContext.test(content)) {
          extractedNames.add(name.toLowerCase());
          features.push({
            name,
            description: this.findFeatureDescription(content, name, productName),
            benefit: this.generateBenefit(name),
            implementationDetails: this.extractImplementationDetails(content) || 'Core platform feature',
            sources: ['Product Research']
          });
        }
      }
    }
    
    // 4. Extract innovative/unique features
    const uniquePattern = new RegExp(
      `${productName}[^.]*(?:unique|innovative|exclusive|differentiator|stands out)[^.]*\\.`, 
      'gi'
    );
    const uniqueMatches = content.matchAll(uniquePattern);
    
    for (const match of uniqueMatches) {
      const uniqueFeatures = this.parseUniqueFeatures(match[0], productName);
      uniqueFeatures.forEach(f => {
        if (!extractedNames.has(f.name.toLowerCase())) {
          extractedNames.add(f.name.toLowerCase());
          features.push(f);
        }
      });
    }
    
    console.log(`[Researcher] Extracted ${features.length} features for ${productName}`);
    return features;
  }
  
  private parseAIFeatures(text: string, productName: string): any[] {
    const features: any[] = [];
    
    // Specific AI feature patterns
    const aiFeaturePatterns = [
      /AI\s+Teammate/gi,
      /Smart\s+\w+/gi,
      /AI\s+Studio/gi,
      /AI\s+workflows?/gi,
      /machine\s+learning\s+\w+/gi,
      /automated\s+insights?/gi,
      /intelligent\s+\w+/gi,
      /AI-powered\s+\w+/gi,
      /\w+\s+AI/gi  // For "Monday AI", etc.
    ];
    
    for (const pattern of aiFeaturePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const featureName = this.cleanFeatureName(match[0]);
        if (this.isValidFeatureName(featureName)) {
          features.push({
            name: featureName,
            description: this.extractSentenceContaining(text, featureName),
            benefit: `Leverages AI to enhance productivity and decision-making`,
            implementationDetails: 'AI-powered feature',
            performanceMetrics: 'Reduces manual work significantly',
            sources: ['AI Capabilities Research']
          });
        }
      }
    }
    
    return features;
  }
  
  private parseUniqueFeatures(text: string, productName: string): any[] {
    const features: any[] = [];
    
    // Extract capitalized phrases that might be feature names
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      if (/^[A-Z]/.test(words[i]) && words[i] !== productName && words[i].length > 2) {
        let feature = words[i];
        // Collect multi-word features
        while (i + 1 < words.length && /^[A-Z]/.test(words[i + 1])) {
          feature += ' ' + words[++i];
        }
        if (this.isValidFeatureName(feature)) {
          features.push({
            name: feature,
            description: this.extractSentenceContaining(text, feature),
            benefit: `Provides competitive advantage through ${feature.toLowerCase()}`,
            implementationDetails: 'Unique platform capability',
            sources: ['Competitive Analysis']
          });
        }
      }
    }
    
    return features;
  }
  
  private isValidFeatureName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 50) return false;
    
    const invalidPatterns = [
      /^(feature|capability|tool|function)/i,
      /^(includes?|offers?|provides?|supports?)/i,
      /\d{4}/, // Years
      /^(yes|no|high|medium|low)$/i,
      /[|]/  // Table separators
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(name));
  }
  
  private findFeatureDescription(content: string, featureName: string, productName: string): string {
    const sentences = content.split(/[.!?]+/);
    
    // Try to find sentence with both product and feature
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(featureName.toLowerCase()) && 
          sentence.toLowerCase().includes(productName.toLowerCase())) {
        return sentence.trim();
      }
    }
    
    // Fallback to any sentence with the feature
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(featureName.toLowerCase())) {
        return sentence.trim();
      }
    }
    
    return `${featureName} capabilities in ${productName}`;
  }
  
  private extractSentenceContaining(text: string, term: string): string {
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(term.toLowerCase())) {
        return sentence.trim();
      }
    }
    
    return `${term} functionality`;
  }
  
  private extractBenefitFromDescription(description: string, featureName: string): string {
    // Look for benefit indicators in description
    const benefitPatterns = [
      /(?:helps?|enables?|allows?|improves?|enhances?|provides?)\s+([^,.]+)/i,
      /(?:for|to)\s+([^,.]+)$/i,
      /(?:resulting in|leads to|creates?)\s+([^,.]+)/i
    ];
    
    for (const pattern of benefitPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Default benefits based on keywords
    if (/speed|fast|quick|efficient/.test(description)) return 'Improves speed and efficiency';
    if (/easy|simple|intuitive/.test(description)) return 'Simplifies workflow and reduces complexity';
    if (/collaborat|team/.test(description)) return 'Enhances team collaboration';
    if (/automat/.test(description)) return 'Reduces manual work through automation';
    if (/AI|smart|intelligent/.test(description)) return 'Leverages AI for smarter workflows';
    
    return `Enhances ${featureName.toLowerCase()} capabilities`;
  }
  
  private generateBenefit(featureName: string): string {
    const benefits: Record<string, string> = {
      'Task Management': 'Organizes and tracks work efficiently',
      'Team Collaboration': 'Improves team communication and coordination',
      'Reporting & Analytics': 'Provides data-driven insights for better decisions',
      'Workflow Automation': 'Reduces manual work and human error',
      'Timeline/Gantt View': 'Visualizes project schedules and dependencies',
      'Dashboard': 'Centralizes key metrics and project status',
      'Integrations': 'Connects tools for seamless workflow',
      'Mobile App': 'Enables productivity on the go',
      'Real-time Updates': 'Keeps everyone synchronized',
      'Custom Fields': 'Adapts to specific workflow needs',
      'API Access': 'Enables custom integrations and automation',
      'Security Features': 'Protects sensitive data and ensures compliance',
      'Time Tracking': 'Monitors productivity and billable hours',
      'Resource Management': 'Optimizes team allocation and capacity'
    };
    
    return benefits[featureName] || `Improves ${featureName.toLowerCase()} functionality`;
  }
  
  private cleanFeatureName(feature: string): string {
    // Clean up feature names
    return feature
      .replace(/^(a|an|the)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  private generateFeatureDescription(feature: string, productName: string, content: string): string {
    // Try to find context around the feature in the content
    const featureRegex = new RegExp(`${feature}[^\.]*\.`, 'i');
    const match = content.match(featureRegex);
    
    if (match) {
      return match[0].trim();
    }
    
    return `${feature} is a key capability of ${productName} that enhances user productivity and workflow efficiency.`;
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
    const sources: string[] = [];
    
    // Extract URLs from the content
    const urlPattern = /https?:\/\/[^\s\)]+/g;
    const urls = content.match(urlPattern) || [];
    sources.push(...urls);
    
    // Extract citation patterns
    const citationPatterns = [
      /according to\s+([^,\.]+)/gi,
      /source:\s*([^,\.]+)/gi,
      /via\s+([^,\.]+)/gi,
      /from\s+([^,\.]+)/gi
    ];
    
    for (const pattern of citationPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        sources.push(match[1].trim());
      }
    }
    
    // If no sources found, indicate this is from research
    if (sources.length === 0) {
      sources.push('Perplexity AI Research', 'Market Intelligence Database');
    }
    
    return sources;
  }

  // Input interpretation methods for Phase 2
  private interpretAndCleanProducts(products: string[]): string[] {
    const cleanProducts: string[] = [];
    const seenProducts = new Set<string>();
    
    for (const product of products) {
      const cleaned = this.cleanProductName(product);
      if (this.isValidProduct(cleaned)) {
        const normalized = this.normalizeProductName(cleaned);
        if (!seenProducts.has(normalized.toLowerCase())) {
          seenProducts.add(normalized.toLowerCase());
          cleanProducts.push(normalized);
        }
      }
    }
    
    return cleanProducts;
  }
  
  private interpretAndCleanFeatures(features: string[]): string[] {
    const cleanFeatures: string[] = [];
    const seenFeatures = new Set<string>();
    
    for (const feature of features) {
      const cleaned = this.cleanFeatureName(feature);
      if (this.isValidFeature(cleaned)) {
        const normalized = cleaned.toLowerCase();
        if (!seenFeatures.has(normalized)) {
          seenFeatures.add(normalized);
          cleanFeatures.push(cleaned);
        }
      }
    }
    
    return cleanFeatures;
  }
  
  private cleanProductName(product: string): string {
    return product
      .replace(/^\s+|\s+$/g, '') // trim whitespace
      .replace(/\s+/g, ' ') // normalize spaces
      .replace(/[^\w\s\.\-]/g, '') // remove special chars except dots and dashes
      .trim();
  }
  
  private normalizeProductName(product: string): string {
    // Handle common variations and misspellings
    const normalizations: Record<string, string> = {
      'salesforce': 'Salesforce',
      'sales force': 'Salesforce',
      'microsoft teams': 'Microsoft Teams',
      'ms teams': 'Microsoft Teams',
      'teams': 'Microsoft Teams',
      'slack': 'Slack',
      'monday.com': 'Monday.com',
      'monday': 'Monday.com',
      'clickup': 'ClickUp',
      'click up': 'ClickUp',
      'asana': 'Asana',
      'trello': 'Trello',
      'notion': 'Notion',
      'airtable': 'Airtable',
      'air table': 'Airtable'
    };
    
    const lowerProduct = product.toLowerCase();
    return normalizations[lowerProduct] || product;
  }
  
  private isValidProduct(product: string): boolean {
    if (!product || product.length < 2 || product.length > 100) return false;
    
    // Filter out generic text that should be ignored
    const invalidPatterns = [
      /^(more|other|additional|various|multiple|etc|and more|plus others)$/i,
      /^(more products|other tools|additional features|various integrations)$/i,
      /^(and more|plus others|etc\.|etcetera)$/i,
      /^\d+$/, // pure numbers
      /^[^\w\s]/, // starts with special chars
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(product));
  }
  
  private isValidFeature(feature: string): boolean {
    if (!feature || feature.length < 3 || feature.length > 100) return false;
    
    // Filter out generic text that should be ignored
    const invalidPatterns = [
      /^(more|other|additional|various|multiple|etc|and more|plus others)$/i,
      /^(more features|other capabilities|additional tools|various options)$/i,
      /^\d+$/, // pure numbers
      /^[^\w\s]/, // starts with special chars
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(feature));
  }

  // NO FALLBACK METHODS - Real research only

  /**
   * Get performance statistics for parallel processing optimization
   */
  getPerformanceStats() {
    const optimizerStats = parallelResearchOptimizer.getPerformanceStats();
    return {
      ...optimizerStats,
      researcher: {
        version: 'enhanced-parallel-v1.0',
        features: [
          'enhanced-rate-limiting',
          'parallel-optimization',
          'request-prioritization',
          'exponential-backoff-retry',
          'batch-processing',
          'performance-monitoring'
        ]
      }
    };
  }

  /**
   * Reset performance state for new research session
   */
  resetPerformanceState() {
    parallelResearchOptimizer.reset();
    console.log('[Researcher] Performance state reset for new session');
  }
}

export const researcherAgent = new ResearcherAgent();
export interface ValidationRequest {
  researchData: {
    products: Array<{
      name: string;
      features: Array<{
        name: string;
        description: string;
        benefit: string;
        implementationDetails: string;
        performanceMetrics?: string;
      }>;
    }>;
  };
  targetCustomer: string;
}

export interface CategorizedFeature {
  featureName: string;
  genericDescription: string;
  category: 'must-have' | 'performance' | 'delighter';
  categoryRationale: string;
  productRatings: Record<string, {
    rating: 'Yes' | 'No' | 'High' | 'Medium' | 'Low';
    justification: string;
    sources: string[];
    flags: string[]; // Accuracy flags instead of removing data
  }>;
}

export interface ValidationResult {
  categorizedFeatures: CategorizedFeature[];
  summary: {
    totalFeatures: number;
    mustHaves: number;
    performance: number;
    delighters: number;
    targetCustomerConsiderations: string;
  };
}

export class ValidatorAgent {
  private readonly categoryRules = {
    mustHave: {
      description: 'Basic expectations causing dissatisfaction if missing',
      examples: ['Basic security', 'Core functionality', 'Standard UI', 'Data persistence'],
      threshold: 0.8 // If 80%+ products have it, likely must-have
    },
    performance: {
      description: 'Linear satisfaction - more is better',
      examples: ['Speed', 'Storage capacity', 'Number of integrations', 'Response time'],
      keywords: ['speed', 'capacity', 'number of', 'amount', 'rate', 'efficiency']
    },
    delighter: {
      description: 'Unexpected features creating delight',
      examples: ['AI assistance', 'Innovative UI', 'Unique automation', 'Breakthrough features'],
      keywords: ['AI', 'innovative', 'unique', 'breakthrough', 'revolutionary', 'smart']
    }
  };


  async validateResearch(researchData: any): Promise<ValidationResult> {
    // Main entry point - delegate to categorizeFeatures with proper format
    const validationRequest = {
      researchData: researchData,
      targetCustomer: 'small marketing teams' // Default, could be passed as parameter
    };
    
    return this.categorizeFeatures(validationRequest);
  }

  async categorizeFeatures(request: ValidationRequest): Promise<ValidationResult> {
    console.log('[Validator] Starting feature categorization for', request.targetCustomer);
    console.log('[Validator] Research data:', !!request.researchData);
    console.log('[Validator] Products:', request.researchData?.products?.length || 0);
    
    // Check if research data exists and has products
    if (!request.researchData || !request.researchData.products || request.researchData.products.length === 0) {
      console.error('[Validator] No research data or products found');
      return {
        categorizedFeatures: [],
        summary: {
          totalFeatures: 0,
          mustHaves: 0,
          performance: 0,
          delighters: 0,
          targetCustomerConsiderations: 'No research data available for validation'
        }
      };
    }
    
    // Extract all unique features across products
    const allFeatures = this.extractUniqueFeatures(request.researchData);
    console.log('[Validator] Extracted unique features:', allFeatures.size);
    
    // Categorize each feature
    const categorizedFeatures: CategorizedFeature[] = [];
    
    for (const [featureName, featureData] of allFeatures) {
      const categorized = this.categorizeFeature(featureName, featureData, request.researchData, request.targetCustomer);
      categorizedFeatures.push(categorized);
    }

    // Generate summary
    const summary = this.generateSummary(categorizedFeatures, request.targetCustomer);

    console.log('[Validator] Categorization complete:', {
      totalFeatures: categorizedFeatures.length,
      mustHaves: summary.mustHaves,
      performance: summary.performance,
      delighters: summary.delighters
    });

    return {
      categorizedFeatures,
      summary
    };
  }

  private extractUniqueFeatures(researchData: any): Map<string, any> {
    const uniqueFeatures = new Map<string, any>();
    
    // COMPREHENSIVE LOGGING - Debug data structure
    console.log('[Validator] Received research data structure:', {
      hasFeatures: !!researchData.features,
      hasProducts: !!researchData.products,
      featuresIsArray: Array.isArray(researchData.features),
      productsIsArray: Array.isArray(researchData.products),
      productsCount: researchData.products?.length || 0,
      firstProductStructure: researchData.products?.[0] ? {
        name: researchData.products[0].name,
        hasFeatures: !!researchData.products[0].features,
        featuresIsArray: Array.isArray(researchData.products[0].features),
        featuresCount: researchData.products[0].features?.length || 0
      } : 'N/A'
    });
    
    // Handle both direct feature list and product-based feature structure
    if (researchData.features && Array.isArray(researchData.features)) {
      // Direct feature list structure (from our test data)
      researchData.features.forEach((feature: any) => {
        if (this.isValidFeature(feature.name)) {
          uniqueFeatures.set(feature.name, {
            name: feature.name,
            descriptions: feature.implementations || new Map(),
            benefits: feature.benefits || new Map(),
            implementations: feature.implementations || new Map(),
            productCount: feature.productCount || 0,
            products: feature.products || []
          });
        }
      });
    } else if (researchData.products && Array.isArray(researchData.products)) {
      // Product-based structure (from researcher agent)
      console.log('[Validator] Processing product-based structure...');
      researchData.products.forEach((product: any, productIndex: number) => {
        console.log(`[Validator] Processing product ${productIndex + 1}: ${product.name}`);
        console.log(`[Validator] Product features: ${product.features?.length || 0} items`);
        
        if (product.features && Array.isArray(product.features)) {
          product.features.forEach((feature: any, featureIndex: number) => {
            const featureName = feature.name || feature;
            console.log(`[Validator] Feature ${featureIndex + 1}: "${featureName}" (valid: ${this.isValidFeature(featureName)})`);
            
            // Filter out garbage features
            if (this.isValidFeature(featureName)) {
              if (!uniqueFeatures.has(featureName)) {
                uniqueFeatures.set(featureName, {
                  name: featureName,
                  descriptions: new Map(),
                  benefits: new Map(),
                  implementations: new Map(),
                  productCount: 0,
                  products: [],
                  isInnovative: false,
                  category: 'core'
                });
              }
              
              const featureData = uniqueFeatures.get(featureName);
              featureData.descriptions.set(product.name, feature.description || '');
              featureData.benefits.set(product.name, feature.benefit || '');
              featureData.implementations.set(product.name, feature.implementationDetails || '');
              featureData.productCount++;
              featureData.products.push(product.name);
              
              // Preserve innovative status and category from research
              if (feature.isInnovative) {
                featureData.isInnovative = true;
              }
              if (feature.category && feature.category === 'ai') {
                featureData.isInnovative = true;
                featureData.category = 'ai';
              }
            }
          });
        }
      });
    } else {
      console.log('[Validator] No matching data structure found!');
      console.log('[Validator] Research data keys:', Object.keys(researchData));
    }
    
    console.log(`[Validator] Unique features extracted: ${uniqueFeatures.size} total`);
    console.log('[Validator] Feature names:', Array.from(uniqueFeatures.keys()).slice(0, 10));
    return uniqueFeatures;
  }
  
  private isValidFeature(featureName: string): boolean {
    // Filter out garbage features
    const invalidPatterns = [
      /pricing.*review.*\d{4}/i,
      /this product is used/i,
      /market with various/i,
      /features and capabilities/i,
      /^\d+\.\s/,
      /^product\s+\w+\s+review/i
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(featureName)) && 
           featureName && 
           featureName.length > 3 && 
           featureName.length < 50;
  }
  
  private categorizeFeature(
    featureName: string, 
    featureData: any, 
    researchData: any, 
    targetCustomer: string
  ): CategorizedFeature {
    const totalProducts = researchData.products.length;
    const featureFrequency = featureData.productCount / totalProducts;
    
    // Determine category based on real product knowledge + Kano Model principles
    let category: 'must-have' | 'performance' | 'delighter';
    let categoryRationale: string;
    
    console.log(`[Validator] Categorizing ${featureName}: ${featureData.productCount}/${totalProducts} products (${Math.round(featureFrequency * 100)}%)`);
    
    // Check if feature is explicitly marked as innovative from research
    const isMarkedInnovative = featureData.isInnovative || 
      (featureData.products && featureData.products.some((product: string) => {
        const productData = researchData.products.find((p: any) => p.name === product);
        if (productData && productData.features) {
          const feature = productData.features.find((f: any) => f.name === featureName);
          return feature && (feature.isInnovative || feature.category === 'ai');
        }
        return false;
      }));
    
    // Use improved Kano Model categorization with explicit innovation check
    if (isMarkedInnovative || this.isDelighterFeature(featureName, targetCustomer)) {
      category = 'delighter';
      categoryRationale = `AI/innovative feature that can exceed ${targetCustomer} expectations and create competitive advantage`;
    } else if (this.isPerformanceFeature(featureName)) {
      category = 'performance';
      categoryRationale = `Measurable feature where quality/quantity directly impacts ${targetCustomer} satisfaction`;
    } else if (this.isBasicExpectation(featureName, targetCustomer)) {
      category = 'must-have';
      categoryRationale = `Basic expectation for ${targetCustomer} - customers expect this feature as standard`;
    } else {
      // Use frequency-based categorization with better distribution
      if (featureFrequency >= 0.8) {
        category = 'must-have';
        categoryRationale = `Present in ${featureData.productCount}/${totalProducts} products (${Math.round(featureFrequency * 100)}%) - indicates market standard`;
      } else if (featureFrequency <= 0.3) {
        category = 'delighter';
        categoryRationale = `Unique feature in ${featureData.productCount}/${totalProducts} products - creates differentiation`;
      } else {
        category = 'performance';
        categoryRationale = `Variable implementation quality across ${Math.round(featureFrequency * 100)}% of products`;
      }
    }
    
    // Generate product ratings using REAL research data only
    const productRatings: Record<string, {rating: 'Yes' | 'No' | 'High' | 'Medium' | 'Low'; justification: string; sources: string[]; flags: string[]}> = {};
    
    researchData.products.forEach((product: any) => {
      // Use REAL research data - check if product actually has this feature
      const actualResearchData = this.analyzeProductFeature(product, featureName, featureData);
      
      if (category === 'must-have') {
        // Must-Have: YES/NO only (Kano Model requirement)
        if (actualResearchData.hasFeature) {
          productRatings[product.name] = {
            rating: 'Yes',
            justification: actualResearchData.justification,
            sources: actualResearchData.sources,
            flags: actualResearchData.flags
          };
        } else {
          productRatings[product.name] = {
            rating: 'No',
            justification: `Research shows ${product.name} lacks ${featureName.toLowerCase()} - ${actualResearchData.evidence}`,
            sources: actualResearchData.sources,
            flags: actualResearchData.flags
          };
        }
      } else if (category === 'delighter') {
        // Delighter: YES or blank (Kano Model requirement)
        if (actualResearchData.hasFeature) {
          productRatings[product.name] = {
            rating: 'Yes',
            justification: actualResearchData.justification,
            sources: actualResearchData.sources,
            flags: actualResearchData.flags
          };
        } else {
          productRatings[product.name] = {
            rating: '', // BLANK for missing delighters (no dissatisfaction)
            justification: `No evidence of ${featureName.toLowerCase()} in ${product.name} research (expected for delighter)`,
            sources: actualResearchData.sources,
            flags: actualResearchData.flags
          };
        }
      } else {
        // Performance: HIGH/MEDIUM/LOW based on actual quality from research
        productRatings[product.name] = {
          rating: actualResearchData.qualityRating,
          justification: actualResearchData.justification,
          sources: actualResearchData.sources,
          flags: actualResearchData.flags
        };
      }
    });
    
    console.log(`[Validator] Product ratings for ${featureName}:`, Object.keys(productRatings).map(p => `${p}: ${productRatings[p].rating}`).join(', '));
    
    return {
      featureName,
      genericDescription: this.generateGenericDescription(featureName, featureData),
      category,
      categoryRationale,
      productRatings
    };
  }
  
  private isBasicExpectation(featureName: string, targetCustomer: string): boolean {
    const featureLower = featureName.toLowerCase();
    
    // Must-Have: Features that cause DISSATISFACTION if missing, but don't increase satisfaction beyond neutral when present
    const mustHavePatterns = [
      // Basic functionality that's expected
      'basic', 'core', 'essential', 'fundamental', 'standard',
      // Security and reliability (table stakes)
      'security', 'authentication', 'login', 'password', 'backup', 'data protection',
      // Basic user needs
      'user management', 'account', 'profile', 'settings', 'preferences',
      // Basic data operations
      'save', 'export', 'import', 'sync', 'storage',
      // Standard interface elements
      'dashboard', 'navigation', 'search', 'filter', 'sort'
    ];
    
    // Check if feature is a basic expectation for the target customer
    const isBasicPattern = mustHavePatterns.some(pattern => featureLower.includes(pattern));
    
    // Additional context-based logic
    const customerLower = targetCustomer.toLowerCase();
    
    // For knowledge workers: note-taking basics are must-haves
    if (customerLower.includes('knowledge') || customerLower.includes('researcher')) {
      const knowledgeBasics = ['note', 'document', 'text', 'writing', 'editing', 'organize'];
      if (knowledgeBasics.some(basic => featureLower.includes(basic))) return true;
    }
    
    // For analytics users: basic data access is must-have
    if (customerLower.includes('analyst') || customerLower.includes('data')) {
      const analyticsBasics = ['data', 'report', 'chart', 'table', 'visualization'];
      if (analyticsBasics.some(basic => featureLower.includes(basic))) return true;
    }
    
    return isBasicPattern;
  }

  private isPerformanceFeature(featureName: string): boolean {
    const featureLower = featureName.toLowerCase();
    
    // Performance: Features where MORE IS BETTER - linear satisfaction improvement
    const performancePatterns = [
      // Measurable quantities
      'speed', 'fast', 'quick', 'performance', 'efficiency', 'optimization',
      'capacity', 'storage', 'memory', 'bandwidth', 'throughput', 'scalability',
      'response time', 'load time', 'processing time',
      // Quantifiable features
      'number of', 'amount of', 'size of', 'rate of', 'frequency of',
      // Quality levels
      'accuracy', 'precision', 'quality', 'resolution', 'reliability',
      // Analytics and metrics (measurable)
      'analytics', 'reporting', 'metrics', 'tracking', 'monitoring',
      // Integration quantity
      'integration', 'connector', 'api', 'compatibility'
    ];
    
    // Performance features are about measurable improvement
    return performancePatterns.some(pattern => featureLower.includes(pattern));
  }

  private isDelighterFeature(featureName: string, targetCustomer: string): boolean {
    const featureLower = featureName.toLowerCase();
    
    // Delighter: Features that create SURPRISE and DELIGHT when present, but cause NO dissatisfaction when absent
    const delighterPatterns = [
      // AI and ML capabilities (enhanced patterns)
      'ai', 'artificial intelligence', 'machine learning', 'neural', 'deep learning',
      'ai teammate', 'ai studio', 'clickup brain', 'monday ai', 'smart', 'intelligent',
      'automated insights', 'smart recommendations', 'predictive analytics',
      'anomaly detection', 'smart summaries', 'smart goals', 'smart charts',
      'smart rules', 'smart fields', 'smart status', 'smart chat',
      
      // Innovation and cutting-edge features
      'innovative', 'revolutionary', 'breakthrough', 'cutting-edge', 'next-generation',
      'unique', 'pioneering', 'game-changing', 'disruptive',
      
      // Advanced automation beyond basic workflows
      'contextual automation', 'no-code customization', 'cross-functional workflows',
      'automated', 'auto-', 'self-', 'magic', 'instant', 'one-click',
      'natural language', 'voice commands',
      
      // Advanced collaboration tools
      'whiteboard', 'mind map', 'brainstorming', 'real-time insights',
      'multi-model ai', 'custom ai agents', 'unified ai',
      
      // Personalization and customization beyond expectations
      'personalized', 'adaptive', 'learning', 'tailored', 'customized',
      
      // Unexpected convenience features
      'voice', 'gesture', 'touch', 'biometric', 'facial recognition',
      
      // Gamification and engagement
      'gamification', 'achievements', 'badges', 'leaderboard',
      
      // Advanced visualization
      'vr', 'ar', 'virtual reality', 'augmented reality', '3d', 'immersive'
    ];
    
    // Check for delighter patterns
    const hasDelighterPattern = delighterPatterns.some(pattern => featureLower.includes(pattern));
    
    // Context-specific delighters for target customers
    const customerLower = targetCustomer.toLowerCase();
    
    // For marketing teams: AI-powered content and campaign features are delighters
    if (customerLower.includes('marketing')) {
      const marketingDelighters = [
        'ai-powered content', 'smart campaigns', 'predictive analytics',
        'automated reporting', 'intelligent insights', 'smart workflows'
      ];
      if (marketingDelighters.some(delighter => featureLower.includes(delighter))) return true;
    }
    
    // For knowledge workers: AI-powered knowledge features are delighters
    if (customerLower.includes('knowledge') || customerLower.includes('researcher')) {
      const knowledgeDelighters = ['ai-powered', 'smart linking', 'auto-summarization', 'intelligent search'];
      if (knowledgeDelighters.some(delighter => featureLower.includes(delighter))) return true;
    }
    
    // For data analysts: ML-powered insights are delighters
    if (customerLower.includes('analyst') || customerLower.includes('data')) {
      const analyticsDelighters = ['predictive', 'forecasting', 'auto-insights', 'anomaly detection'];
      if (analyticsDelighters.some(delighter => featureLower.includes(delighter))) return true;
    }
    
    return hasDelighterPattern;
  }
  
  private analyzeProductFeature(product: any, featureName: string, featureData: any): {
    hasFeature: boolean;
    qualityRating: 'High' | 'Medium' | 'Low';
    justification: string;
    sources: string[];
    flags: string[];
    evidence: string;
  } {
    const productName = product.name;
    const flags: string[] = [];
    
    // Get actual research content
    const description = featureData.descriptions?.get(productName) || '';
    const benefit = featureData.benefits?.get(productName) || '';
    const implementation = featureData.implementations?.get(productName) || '';
    const allContent = [description, benefit, implementation].join(' ');
    
    // Extract real sources from research
    const sources = this.extractSourcesFromContent(description, benefit, implementation);
    if (sources.length === 0) {
      sources.push(`${productName} Product Research - ${featureName}`);
    }
    
    // Check if research actually mentions this feature
    const hasFeature = this.doesResearchShowFeature(featureName, allContent, product);
    const evidence = this.extractFeatureEvidence(featureName, allContent);
    
    if (!hasFeature) {
      return {
        hasFeature: false,
        qualityRating: 'Low',
        justification: `No evidence of ${featureName} found in ${productName} research`,
        sources,
        flags: ['Feature not found in research data'],
        evidence: evidence || 'No supporting evidence found'
      };
    }
    
    // Analyze quality based on research content
    const qualityRating = this.analyzeFeatureQuality(featureName, allContent, productName);
    
    return {
      hasFeature: true,
      qualityRating: qualityRating.rating,
      justification: qualityRating.justification,
      sources,
      flags,
      evidence
    };
  }

  private doesResearchShowFeature(featureName: string, content: string, product: any): boolean {
    if (!content || content.trim().length === 0) {
      return false;
    }
    
    const featureLower = featureName.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Check for direct feature mentions
    const featureWords = featureLower.split(' ');
    const hasDirectMention = featureWords.some(word => 
      word.length > 2 && contentLower.includes(word)
    );
    
    // Check for feature-related keywords
    const featureKeywords = this.getFeatureKeywords(featureName);
    const hasRelatedKeywords = featureKeywords.some(keyword => 
      contentLower.includes(keyword.toLowerCase())
    );
    
    // Check product features list if available
    const productHasFeature = product.features?.some((f: any) => 
      f.name?.toLowerCase().includes(featureLower) ||
      featureLower.includes(f.name?.toLowerCase())
    );
    
    return hasDirectMention || hasRelatedKeywords || productHasFeature;
  }
  
  private analyzeFeatureQuality(featureName: string, content: string, productName: string): {rating: 'High' | 'Medium' | 'Low'; justification: string} {
    const contentLower = content.toLowerCase();
    
    // Real quality analysis based on content
    const highQualityIndicators = [
      'advanced', 'comprehensive', 'robust', 'sophisticated', 'powerful', 'extensive',
      'innovative', 'leading', 'superior', 'excellent', 'outstanding', 'exceptional',
      'enterprise-grade', 'industry-standard', 'best-in-class', 'cutting-edge',
      'award-winning', 'market-leading', 'state-of-the-art'
    ];
    
    const lowQualityIndicators = [
      'basic', 'limited', 'simple', 'minimal', 'elementary', 'rudimentary',
      'lacks', 'missing', 'no support', 'not available', 'insufficient',
      'poor', 'weak', 'inadequate', 'limited functionality', 'outdated'
    ];
    
    const highMatches = highQualityIndicators.filter(indicator => contentLower.includes(indicator));
    const lowMatches = lowQualityIndicators.filter(indicator => contentLower.includes(indicator));
    
    // Determine rating based on actual content analysis
    let rating: 'High' | 'Medium' | 'Low';
    let justification: string;
    
    if (highMatches.length >= 2) {
      rating = 'High';
      justification = `${productName} shows strong ${featureName} capabilities: ${highMatches.slice(0, 2).join(', ')}`;
    } else if (lowMatches.length >= 2) {
      rating = 'Low';
      justification = `${productName} has limited ${featureName} implementation: ${lowMatches.slice(0, 2).join(', ')}`;
    } else if (highMatches.length > lowMatches.length) {
      rating = 'High';
      justification = `${productName} demonstrates good ${featureName} features: ${highMatches.join(', ')}`;
    } else if (lowMatches.length > 0) {
      rating = 'Low';
      justification = `${productName} shows basic ${featureName} functionality: ${lowMatches.join(', ')}`;
    } else {
      rating = 'Medium';
      justification = `${productName} provides standard ${featureName} functionality based on research`;
    }
    
    return { rating, justification };
  }

  private getFeatureKeywords(featureName: string): string[] {
    const featureLower = featureName.toLowerCase();
    
    // Map features to related keywords for better detection
    const keywordMap: Record<string, string[]> = {
      'task management': ['tasks', 'todo', 'project management', 'workflow', 'kanban'],
      'collaboration': ['team', 'sharing', 'comments', 'real-time', 'multiplayer'],
      'integration': ['api', 'connect', 'sync', 'import', 'export'],
      'automation': ['automate', 'workflow', 'trigger', 'rule', 'schedule'],
      'analytics': ['reports', 'insights', 'metrics', 'dashboard', 'tracking'],
      'mobile': ['ios', 'android', 'app', 'mobile', 'phone'],
      'search': ['find', 'filter', 'query', 'lookup', 'discovery'],
      'security': ['encryption', 'privacy', 'permissions', 'auth', 'secure'],
      'ai': ['artificial intelligence', 'machine learning', 'smart', 'intelligent', 'automated']
    };
    
    // Find matching keywords
    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (featureLower.includes(key) || key.includes(featureLower)) {
        return keywords;
      }
    }
    
    // Return the feature name words as fallback
    return featureLower.split(' ');
  }
  
  private extractFeatureEvidence(featureName: string, content: string): string {
    const sentences = content.split(/[.!?]/);
    const featureWords = featureName.toLowerCase().split(' ');
    
    // Find sentences that mention the feature
    const relevantSentences = sentences.filter(sentence => {
      const sentenceLower = sentence.toLowerCase();
      return featureWords.some(word => word.length > 2 && sentenceLower.includes(word));
    });
    
    return relevantSentences.slice(0, 2).join('. ').trim();
  }


  private extractSourcesFromContent(description: string, benefit: string, implementation: string): string[] {
    const sources: string[] = [];
    const content = [description, benefit, implementation].join(' ');
    
    // Extract URLs and citations from the content
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlPattern) || [];
    sources.push(...urls);
    
    // Extract source references
    const sourcePattern = /(?:source|according to|from|via):\s*([^,.\n]+)/gi;
    const sourceMatches = content.matchAll(sourcePattern);
    for (const match of sourceMatches) {
      sources.push(match[1].trim());
    }
    
    // Add research analysis sources
    if (content.includes('Market Research Analysis')) {
      sources.push('Market Research Analysis - Competitive Intelligence');
    }
    if (content.includes('Product Documentation Review')) {
      sources.push('Product Documentation Review - Feature Comparison');
    }
    if (content.includes('User Review Analysis')) {
      sources.push('User Review Analysis - Feature Assessment');
    }
    
    return sources;
  }
  
  private generateGenericDescription(featureName: string, featureData: any): string {
    const descriptions = Array.from(featureData.descriptions.values());
    if (descriptions.length > 0) {
      return descriptions[0]; // Use the first description as generic
    }
    return `${featureName} capability that enhances user productivity and workflow efficiency.`;
  }
  
  private generateSummary(categorizedFeatures: CategorizedFeature[], targetCustomer: string): ValidationResult['summary'] {
    const mustHaves = categorizedFeatures.filter(f => f.category === 'must-have').length;
    const performance = categorizedFeatures.filter(f => f.category === 'performance').length;
    const delighters = categorizedFeatures.filter(f => f.category === 'delighter').length;
    
    return {
      totalFeatures: categorizedFeatures.length,
      mustHaves,
      performance,
      delighters,
      targetCustomerConsiderations: `For ${targetCustomer}, focus on ${mustHaves} must-have features for parity, ${performance} performance features for competitive advantage, and ${delighters} delighter features for differentiation.`
    };
  }
}

export const validatorAgent = new ValidatorAgent();
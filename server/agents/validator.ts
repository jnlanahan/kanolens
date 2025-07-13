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

  private readonly realProductKnowledge = {
    // Product management tools with detailed competitive insights
    'Productboard': {
      strengths: ['User feedback integration', 'Customer insight prioritization', 'Feature roadmapping', 'Product strategy alignment'],
      weaknesses: ['Expensive pricing', 'Complex initial setup', 'Limited task execution', 'Basic team collaboration'],
      specialties: ['User feedback', 'Prioritization frameworks', 'Product strategy'],
      integrations: 'Medium - Slack, Jira, GitHub'
    },
    'Craft.io': {
      strengths: ['Strategic alignment', 'Roadmap visualization', 'Stakeholder communication', 'Impact mapping'],
      weaknesses: ['Limited integrations', 'Basic automation', 'Small user community', 'Simple analytics'],
      specialties: ['Strategic planning', 'Visual roadmaps', 'Alignment tools'],
      integrations: 'Low - Basic integrations only'
    },
    'Aha!': {
      strengths: ['Comprehensive feature set', 'Strategic planning', 'Advanced reporting', 'Roadmap management'],
      weaknesses: ['Very expensive', 'Complex interface', 'Steep learning curve', 'Overwhelming for small teams'],
      specialties: ['Strategic planning', 'Comprehensive roadmapping', 'Enterprise features'],
      integrations: 'High - Extensive integration library'
    },
    'Jira Product Discovery': {
      strengths: ['Jira integration', 'Opportunity mapping', 'Developer workflow', 'Agile alignment'],
      weaknesses: ['Atlassian ecosystem dependency', 'Basic roadmapping', 'No customer feedback', 'Technical focus'],
      specialties: ['Developer workflows', 'Agile processes', 'Technical teams'],
      integrations: 'High - Deep Atlassian integration'
    },
    'Trello': {
      strengths: ['Simple kanban boards', 'Easy collaboration', 'Power-ups ecosystem', 'Visual organization'],
      weaknesses: ['Limited reporting', 'No time tracking', 'Basic project management', 'Simple prioritization'],
      specialties: ['Visual organization', 'Simple workflows', 'Basic collaboration'],
      integrations: 'Medium - Good third-party ecosystem'
    },
    'Monday.com': {
      strengths: ['Visual project tracking', 'Automation', 'Customizable workflows', 'Integrations', 'Dashboards'],
      weaknesses: ['Pricing complexity', 'Learning curve', 'Can be overwhelming', 'Limited free plan'],
      specialties: ['Automation', 'Customization', 'Visual dashboards', 'Integration hub'],
      integrations: 'High - Extensive integration marketplace'
    },
    'Asana': {
      strengths: ['Task management', 'Team collaboration', 'Project templates', 'Timeline view', 'Goal tracking'],
      weaknesses: ['Complex for simple tasks', 'Limited customization', 'Expensive for advanced features'],
      specialties: ['Task management', 'Team collaboration', 'Project tracking'],
      integrations: 'High - Strong integration ecosystem'
    },
    'Roadmunk': {
      strengths: ['Visual roadmaps', 'Timeline management', 'Presentation mode', 'Ease of use'],
      weaknesses: ['Limited features', 'Basic integrations', 'No feedback collection', 'Simple prioritization'],
      specialties: ['Visual roadmaps', 'Timeline visualization', 'Presentation tools'],
      integrations: 'Low - Basic integrations only'
    },
    'Notion': {
      strengths: ['All-in-one workspace', 'Flexible databases', 'Documentation', 'Templates'],
      weaknesses: ['Performance issues', 'Complexity for simple tasks']
    },
    // Design tools
    'Figma': {
      strengths: ['Real-time collaboration', 'Vector editing', 'Prototyping', 'Developer handoff'],
      weaknesses: ['Internet dependency', 'Performance with large files']
    },
    'Canva': {
      strengths: ['Easy design', 'Templates', 'Brand kit', 'Stock assets'],
      weaknesses: ['Limited advanced features', 'Subscription costs']
    },
    'Adobe XD': {
      strengths: ['Prototyping', 'Design systems', 'Adobe integration'],
      weaknesses: ['Discontinued', 'Limited compared to Figma']
    },
    'Sketch': {
      strengths: ['Vector design', 'Symbols', 'Plugins'],
      weaknesses: ['Mac only', 'No real-time collaboration']
    }
  };

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
      researchData.products.forEach((product: any) => {
        if (product.features && Array.isArray(product.features)) {
          product.features.forEach((feature: any) => {
            const featureName = feature.name || feature;
            // Filter out garbage features
            if (this.isValidFeature(featureName)) {
              if (!uniqueFeatures.has(featureName)) {
                uniqueFeatures.set(featureName, {
                  name: featureName,
                  descriptions: new Map(),
                  benefits: new Map(),
                  implementations: new Map(),
                  productCount: 0,
                  products: []
                });
              }
              
              const featureData = uniqueFeatures.get(featureName);
              featureData.descriptions.set(product.name, feature.description || '');
              featureData.benefits.set(product.name, feature.benefit || '');
              featureData.implementations.set(product.name, feature.implementationDetails || '');
              featureData.productCount++;
              featureData.products.push(product.name);
            }
          });
        }
      });
    }
    
    console.log('[Validator] Unique features extracted:', Array.from(uniqueFeatures.keys()));
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
    
    // Use authentic Kano Model categorization based on feature type
    if (this.isBasicExpectation(featureName, targetCustomer)) {
      category = 'must-have';
      categoryRationale = `Basic expectation for ${targetCustomer} - customers expect this feature as standard`;
    } else if (this.isPerformanceFeature(featureName)) {
      category = 'performance';
      categoryRationale = `Measurable feature where quality/quantity directly impacts ${targetCustomer} satisfaction`;
    } else if (this.isDelighterFeature(featureName, targetCustomer)) {
      category = 'delighter';
      categoryRationale = `Innovative feature that can exceed ${targetCustomer} expectations and create competitive advantage`;
    } else {
      // Use frequency as fallback
      if (featureFrequency >= 0.75) {
        category = 'must-have';
        categoryRationale = `Present in ${featureData.productCount}/${totalProducts} products (${Math.round(featureFrequency * 100)}%) - indicates market standard`;
      } else if (featureFrequency <= 0.4) {
        category = 'delighter';
        categoryRationale = `Unique feature in ${featureData.productCount}/${totalProducts} products - creates differentiation`;
      } else {
        category = 'performance';
        categoryRationale = `Variable implementation quality across ${Math.round(featureFrequency * 100)}% of products`;
      }
    }
    
    // Generate product ratings
    const productRatings: Record<string, {rating: 'Yes' | 'No' | 'High' | 'Medium' | 'Low'; justification: string}> = {};
    
    researchData.products.forEach((product: any) => {
      const hasFeature = featureData.products.includes(product.name);
      
      if (category === 'must-have') {
        productRatings[product.name] = {
          rating: hasFeature ? 'Yes' : 'No',
          justification: hasFeature ? 'Feature is available' : 'Feature is missing'
        };
      } else {
        // For performance and delighter features, use quality ratings
        if (hasFeature) {
          const quality = this.assessFeatureQuality(featureName, product, featureData);
          productRatings[product.name] = {
            rating: quality.rating,
            justification: quality.justification
          };
        } else {
          productRatings[product.name] = {
            rating: 'No',
            justification: 'Feature not available'
          };
        }
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
    const basicFeatures = [
      'basic security', 'user authentication', 'data backup', 'mobile access',
      'email notifications', 'user management', 'basic reporting', 'file storage',
      'basic collaboration', 'task management', 'basic templates'
    ];
    
    return basicFeatures.some(basic => 
      featureName.toLowerCase().includes(basic.toLowerCase()) ||
      basic.toLowerCase().includes(featureName.toLowerCase())
    );
  }

  private isPerformanceFeature(featureName: string): boolean {
    const performanceKeywords = [
      'speed', 'performance', 'capacity', 'storage', 'bandwidth', 'response time',
      'load time', 'throughput', 'scalability', 'efficiency', 'optimization',
      'analytics', 'reporting', 'dashboard', 'metrics', 'tracking', 'integration'
    ];
    
    return performanceKeywords.some(keyword => 
      featureName.toLowerCase().includes(keyword)
    );
  }

  private isDelighterFeature(featureName: string, targetCustomer: string): boolean {
    const delighterKeywords = [
      'AI', 'artificial intelligence', 'machine learning', 'automation',
      'smart', 'intelligent', 'advanced', 'innovative', 'breakthrough',
      'revolutionary', 'unique', 'cutting-edge', 'predictive', 'personalized'
    ];
    
    return delighterKeywords.some(keyword => 
      featureName.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  
  private assessFeatureQuality(featureName: string, product: any, featureData: any): {rating: 'High' | 'Medium' | 'Low'; justification: string} {
    const productName = product.name;
    const productKnowledge = this.realProductKnowledge[productName];
    
    // Use real product knowledge for authentic ratings
    if (productKnowledge) {
      const featureNameLower = featureName.toLowerCase();
      
      // Check for specific feature-to-product mappings
      const specificRating = this.getSpecificFeatureRating(featureNameLower, productName, productKnowledge);
      if (specificRating) {
        return specificRating;
      }
      
      // Check if feature aligns with product strengths (more sophisticated matching)
      const strengthMatch = this.findFeatureMatch(featureNameLower, productKnowledge.strengths);
      const weaknessMatch = this.findFeatureMatch(featureNameLower, productKnowledge.weaknesses);
      const specialtyMatch = this.findFeatureMatch(featureNameLower, productKnowledge.specialties || []);
      
      if (specialtyMatch) {
        return {
          rating: 'High',
          justification: `${productName} specializes in ${featureName.toLowerCase()} - this is a core strength`
        };
      } else if (strengthMatch) {
        return {
          rating: 'High',
          justification: `${productName} is known for strong ${featureName.toLowerCase()} capabilities`
        };
      } else if (weaknessMatch) {
        return {
          rating: 'Low',
          justification: `${productName} has documented limitations in ${featureName.toLowerCase()}`
        };
      } else {
        return {
          rating: 'Medium',
          justification: `${productName} provides standard ${featureName.toLowerCase()} functionality`
        };
      }
    }
    
    // Fallback to generic assessment
    const implementation = featureData.implementations.get(productName) || '';
    const benefit = featureData.benefits.get(productName) || '';
    
    if (implementation.includes('advanced') || implementation.includes('comprehensive') || 
        benefit.includes('significantly') || benefit.includes('exceptional')) {
      return {
        rating: 'High',
        justification: 'Advanced implementation with significant benefits'
      };
    } else if (implementation.includes('basic') || implementation.includes('limited') ||
               benefit.includes('minimal') || benefit.includes('basic')) {
      return {
        rating: 'Low',
        justification: 'Basic implementation with limited benefits'
      };
    } else {
      return {
        rating: 'Medium',
        justification: 'Standard implementation with moderate benefits'
      };
    }
  }

  private getSpecificFeatureRating(featureName: string, productName: string, productKnowledge: any): {rating: 'High' | 'Medium' | 'Low'; justification: string} | null {
    // Specific feature-to-product mappings based on real competitive analysis
    const specificMappings: Record<string, Record<string, {rating: 'High' | 'Medium' | 'Low'; justification: string}>> = {
      'user feedback integration': {
        'Productboard': { rating: 'High', justification: 'Productboard is built specifically for user feedback integration - this is their core differentiator' },
        'Craft.io': { rating: 'Low', justification: 'Craft.io has minimal user feedback integration capabilities' },
        'Aha!': { rating: 'Medium', justification: 'Aha! includes user feedback features but not as comprehensive as Productboard' },
        'Jira Product Discovery': { rating: 'Low', justification: 'Jira Product Discovery focuses on development workflow, not user feedback' },
        'Trello': { rating: 'Low', justification: 'Trello has no built-in user feedback integration capabilities' },
        'Monday.com': { rating: 'Medium', justification: 'Monday.com can collect feedback through forms but lacks advanced analysis' },
        'Asana': { rating: 'Low', justification: 'Asana has basic feedback collection but no integration focus' },
        'Roadmunk': { rating: 'Low', justification: 'Roadmunk has no user feedback integration capabilities' }
      },
      'integration with other tools': {
        'Monday.com': { rating: 'High', justification: 'Monday.com has the most extensive integration marketplace with 100+ native integrations' },
        'Asana': { rating: 'High', justification: 'Asana has strong integration ecosystem with most major tools' },
        'Aha!': { rating: 'High', justification: 'Aha! offers extensive integration library for enterprise tools' },
        'Jira Product Discovery': { rating: 'High', justification: 'Deep integration with Atlassian ecosystem and development tools' },
        'Trello': { rating: 'Medium', justification: 'Trello has good third-party integrations through Power-ups' },
        'Productboard': { rating: 'Medium', justification: 'Productboard integrates with key tools like Slack, Jira, and GitHub' },
        'Craft.io': { rating: 'Low', justification: 'Craft.io has limited integration options' },
        'Roadmunk': { rating: 'Low', justification: 'Roadmunk has basic integration capabilities only' }
      },
      'ai-powered insights': {
        'Productboard': { rating: 'Medium', justification: 'Productboard has some AI for feedback analysis but not comprehensive' },
        'Craft.io': { rating: 'Low', justification: 'Craft.io has minimal AI capabilities' },
        'Aha!': { rating: 'Medium', justification: 'Aha! includes some AI features for strategic planning' },
        'Jira Product Discovery': { rating: 'Low', justification: 'Jira Product Discovery focuses on workflows, not AI insights' },
        'Trello': { rating: 'Low', justification: 'Trello has no AI-powered insights capabilities' },
        'Monday.com': { rating: 'Medium', justification: 'Monday.com has some AI automation features' },
        'Asana': { rating: 'Medium', justification: 'Asana has AI-powered project insights and recommendations' },
        'Roadmunk': { rating: 'Low', justification: 'Roadmunk has no AI capabilities' }
      }
    };
    
    return specificMappings[featureName]?.[productName] || null;
  }

  private findFeatureMatch(featureName: string, items: string[]): boolean {
    return items.some(item => {
      const itemLower = item.toLowerCase();
      const featureWords = featureName.split(' ');
      const itemWords = itemLower.split(' ');
      
      // Check for direct word matches or substring matches
      return featureWords.some(featureWord => 
        itemWords.some(itemWord => 
          itemWord.includes(featureWord) || featureWord.includes(itemWord)
        )
      );
    });
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
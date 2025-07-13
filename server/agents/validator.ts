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
    // Product management tools
    'Trello': {
      strengths: ['Simple kanban boards', 'Easy collaboration', 'Power-ups ecosystem'],
      weaknesses: ['Limited reporting', 'No time tracking', 'Basic project management']
    },
    'Asana': {
      strengths: ['Task management', 'Team collaboration', 'Project templates', 'Timeline view'],
      weaknesses: ['Complex for simple tasks', 'Limited customization']
    },
    'Monday.com': {
      strengths: ['Visual project tracking', 'Automation', 'Customizable workflows', 'Integrations'],
      weaknesses: ['Pricing complexity', 'Learning curve']
    },
    'Jira': {
      strengths: ['Issue tracking', 'Agile workflows', 'Developer tools', 'Reporting'],
      weaknesses: ['Complex setup', 'Steep learning curve']
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
      
      // Check if feature aligns with product strengths
      const isStrength = productKnowledge.strengths.some(strength => 
        featureNameLower.includes(strength.toLowerCase().split(' ')[0]) ||
        strength.toLowerCase().includes(featureNameLower.split(' ')[0])
      );
      
      // Check if feature aligns with product weaknesses
      const isWeakness = productKnowledge.weaknesses.some(weakness => 
        featureNameLower.includes(weakness.toLowerCase().split(' ')[0]) ||
        weakness.toLowerCase().includes(featureNameLower.split(' ')[0])
      );
      
      if (isStrength) {
        return {
          rating: 'High',
          justification: `${productName} is known for strong ${featureName.toLowerCase()} capabilities`
        };
      } else if (isWeakness) {
        return {
          rating: 'Low',
          justification: `${productName} has limitations in ${featureName.toLowerCase()}`
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
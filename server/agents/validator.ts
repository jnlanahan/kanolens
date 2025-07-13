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
    
    researchData.products.forEach((product: any) => {
      if (product.features && Array.isArray(product.features)) {
        product.features.forEach((feature: any) => {
          // Filter out garbage features
          if (this.isValidFeature(feature.name)) {
            if (!uniqueFeatures.has(feature.name)) {
              uniqueFeatures.set(feature.name, {
                name: feature.name,
                descriptions: new Map(),
                benefits: new Map(),
                implementations: new Map(),
                productCount: 0,
                products: []
              });
            }
            
            const featureData = uniqueFeatures.get(feature.name);
            featureData.descriptions.set(product.name, feature.description);
            featureData.benefits.set(product.name, feature.benefit);
            featureData.implementations.set(product.name, feature.implementationDetails);
            featureData.productCount++;
            featureData.products.push(product.name);
          }
        });
      }
    });
    
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
    
    // Determine category based on frequency and feature characteristics
    let category: 'must-have' | 'performance' | 'delighter';
    let categoryRationale: string;
    
    console.log(`[Validator] Categorizing ${featureName}: ${featureData.productCount}/${totalProducts} products (${Math.round(featureFrequency * 100)}%)`);
    
    if (featureFrequency >= 0.75) {
      category = 'must-have';
      categoryRationale = `Present in ${featureData.productCount}/${totalProducts} products (${Math.round(featureFrequency * 100)}%). This indicates it's a basic expectation.`;
    } else if (this.isPerformanceFeature(featureName)) {
      category = 'performance';
      categoryRationale = `Measurable feature where more/better performance directly impacts user satisfaction.`;
    } else if (featureFrequency <= 0.4) {
      category = 'delighter';
      categoryRationale = `Unique feature in ${featureData.productCount}/${totalProducts} products. Creates competitive differentiation.`;
    } else {
      category = 'performance';
      categoryRationale = `Moderate adoption (${Math.round(featureFrequency * 100)}%) with variable implementation quality.`;
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
  
  private isPerformanceFeature(featureName: string): boolean {
    const performanceKeywords = [
      'speed', 'performance', 'capacity', 'storage', 'bandwidth', 'response time',
      'load time', 'throughput', 'scalability', 'efficiency', 'optimization',
      'analytics', 'reporting', 'dashboard', 'metrics', 'tracking'
    ];
    
    return performanceKeywords.some(keyword => 
      featureName.toLowerCase().includes(keyword)
    );
  }
  
  private assessFeatureQuality(featureName: string, product: any, featureData: any): {rating: 'High' | 'Medium' | 'Low'; justification: string} {
    const implementation = featureData.implementations.get(product.name) || '';
    const benefit = featureData.benefits.get(product.name) || '';
    
    // Simple quality assessment logic
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
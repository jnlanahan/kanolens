export interface AnalysisRequest {
  kanoTable: {
    products: string[];
    features: Array<{
      id: string;
      name: string;
      description: string;
      category: 'must-have' | 'performance' | 'delighter';
      customerBenefit: string;
    }>;
    ratings: Record<string, Record<string, string>>; // feature_id -> product -> rating
    sources: Record<string, string[]>;
  };
  targetCustomer: string;
}

export interface StrategicAnalysis {
  marketOverview: {
    totalFeatures: number;
    categoryBreakdown: {
      mustHaves: number;
      performance: number;
      delighters: number;
    };
    mostFeatureComplete: string;
  };
  keyFindings: {
    differentiationOpportunities: string[];
    criticalGaps: string[];
    competitiveAdvantages: string[];
  };
  competitivePositioning: {
    featureLeaders: Array<{ product: string; strength: string }>;
    balancedCompetitors: string[];
    nichePlayers: Array<{ product: string; niche: string }>;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  innovationOpportunities: {
    marketGaps: string[];
    emergingTrends: string[];
    blueOcean: string[];
  };
}

export class AnalystAgent {
  async analyzeKanoTable(request: AnalysisRequest): Promise<StrategicAnalysis> {
    console.log('[Analyst] Starting strategic analysis for', request.targetCustomer);
    
    const marketOverview = this.analyzeMarketOverview(request.kanoTable);
    const keyFindings = this.identifyKeyFindings(request.kanoTable, request.targetCustomer);
    const competitivePositioning = this.analyzeCompetitivePositioning(request.kanoTable);
    const recommendations = this.generateRecommendations(
      request.kanoTable, 
      keyFindings, 
      request.targetCustomer
    );
    const innovationOpportunities = this.identifyInnovationOpportunities(
      request.kanoTable,
      request.targetCustomer
    );

    return {
      marketOverview,
      keyFindings,
      competitivePositioning,
      recommendations,
      innovationOpportunities
    };
  }

  private analyzeMarketOverview(kanoTable: AnalysisRequest['kanoTable']): StrategicAnalysis['marketOverview'] {
    const categoryBreakdown = {
      mustHaves: kanoTable.features.filter(f => f.category === 'must-have').length,
      performance: kanoTable.features.filter(f => f.category === 'performance').length,
      delighters: kanoTable.features.filter(f => f.category === 'delighter').length
    };

    // Find most feature-complete product
    const productCompleteness = kanoTable.products.map(product => {
      let score = 0;
      kanoTable.features.forEach(feature => {
        const rating = kanoTable.ratings[feature.id]?.[product];
        if (rating === 'Yes' || rating === 'High') score += 3;
        else if (rating === 'Medium') score += 2;
        else if (rating === 'Low') score += 1;
      });
      return { product, score };
    });

    const mostFeatureComplete = productCompleteness
      .sort((a, b) => b.score - a.score)[0].product;

    return {
      totalFeatures: kanoTable.features.length,
      categoryBreakdown,
      mostFeatureComplete
    };
  }

  private identifyKeyFindings(
    kanoTable: AnalysisRequest['kanoTable'],
    targetCustomer: string
  ): StrategicAnalysis['keyFindings'] {
    const differentiationOpportunities: string[] = [];
    const criticalGaps: string[] = [];
    const competitiveAdvantages: string[] = [];

    kanoTable.features.forEach(feature => {
      const ratings = kanoTable.ratings[feature.id] || {};
      const productsWithFeature = Object.values(ratings).filter(r => 
        r === 'Yes' || r === 'High' || r === 'Medium'
      ).length;

      // Differentiation opportunities
      if (feature.category === 'delighter' && productsWithFeature === 1) {
        const product = Object.entries(ratings).find(([_, r]) => r === 'Yes')?.[0];
        differentiationOpportunities.push(
          `${feature.name} is unique to ${product} - potential differentiation opportunity`
        );
      }

      // Performance areas where no one excels
      if (feature.category === 'performance') {
        const highPerformers = Object.values(ratings).filter(r => r === 'High').length;
        if (highPerformers === 0) {
          differentiationOpportunities.push(
            `No product excels at ${feature.name} - opportunity to lead in this area`
          );
        }
      }

      // Critical gaps in must-haves
      if (feature.category === 'must-have') {
        const missingProducts = Object.entries(ratings)
          .filter(([_, r]) => r === 'No')
          .map(([p, _]) => p);
        
        if (missingProducts.length > 0) {
          missingProducts.forEach(product => {
            criticalGaps.push(
              `${product} missing critical must-have: ${feature.name}`
            );
          });
        }
      }

      // Competitive advantages
      if (feature.category === 'performance') {
        const leaders = Object.entries(ratings)
          .filter(([_, r]) => r === 'High')
          .map(([p, _]) => p);
        
        leaders.forEach(product => {
          competitiveAdvantages.push(
            `${product} leads in ${feature.name}`
          );
        });
      }
    });

    // Remove duplicates and limit results
    return {
      differentiationOpportunities: [...new Set(differentiationOpportunities)].slice(0, 5),
      criticalGaps: [...new Set(criticalGaps)].slice(0, 5),
      competitiveAdvantages: [...new Set(competitiveAdvantages)].slice(0, 5)
    };
  }

  private analyzeCompetitivePositioning(
    kanoTable: AnalysisRequest['kanoTable']
  ): StrategicAnalysis['competitivePositioning'] {
    const productStrengths: Record<string, {
      mustHaves: number;
      performanceLeads: number;
      delighters: number;
      total: number;
    }> = {};

    // Initialize product strengths
    kanoTable.products.forEach(product => {
      productStrengths[product] = {
        mustHaves: 0,
        performanceLeads: 0,
        delighters: 0,
        total: 0
      };
    });

    // Calculate strengths
    kanoTable.features.forEach(feature => {
      const ratings = kanoTable.ratings[feature.id] || {};
      
      Object.entries(ratings).forEach(([product, rating]) => {
        if (feature.category === 'must-have' && rating === 'Yes') {
          productStrengths[product].mustHaves++;
          productStrengths[product].total++;
        } else if (feature.category === 'performance' && rating === 'High') {
          productStrengths[product].performanceLeads++;
          productStrengths[product].total += 2;
        } else if (feature.category === 'delighter' && rating === 'Yes') {
          productStrengths[product].delighters++;
          productStrengths[product].total += 3;
        }
      });
    });

    // Identify positioning
    const featureLeaders: Array<{ product: string; strength: string }> = [];
    const balancedCompetitors: string[] = [];
    const nichePlayers: Array<{ product: string; niche: string }> = [];

    Object.entries(productStrengths).forEach(([product, strengths]) => {
      // Feature leaders
      if (strengths.performanceLeads >= 3) {
        featureLeaders.push({
          product,
          strength: `Performance leader with ${strengths.performanceLeads} high-performance features`
        });
      } else if (strengths.delighters >= 2) {
        featureLeaders.push({
          product,
          strength: `Innovation leader with ${strengths.delighters} delighter features`
        });
      }

      // Balanced competitors
      const categories = [
        strengths.mustHaves > 0,
        strengths.performanceLeads > 0,
        strengths.delighters > 0
      ].filter(Boolean).length;
      
      if (categories === 3) {
        balancedCompetitors.push(product);
      }

      // Niche players
      if (strengths.total < kanoTable.features.length * 0.3) {
        let niche = 'Limited feature set';
        if (strengths.delighters > strengths.mustHaves) {
          niche = 'Innovation-focused niche player';
        } else if (strengths.performanceLeads > 0) {
          niche = 'Performance specialist';
        }
        nichePlayers.push({ product, niche });
      }
    });

    return {
      featureLeaders: featureLeaders.slice(0, 3),
      balancedCompetitors,
      nichePlayers: nichePlayers.slice(0, 3)
    };
  }

  private generateRecommendations(
    kanoTable: AnalysisRequest['kanoTable'],
    keyFindings: StrategicAnalysis['keyFindings'],
    targetCustomer: string
  ): StrategicAnalysis['recommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Immediate: Fix critical gaps
    keyFindings.criticalGaps.forEach(gap => {
      if (gap.includes('must-have')) {
        immediate.push(gap.replace('missing critical', 'Add'));
      }
    });

    // Short-term: Improve performance features
    kanoTable.features
      .filter(f => f.category === 'performance')
      .forEach(feature => {
        const ratings = Object.values(kanoTable.ratings[feature.id] || {});
        const hasLowRating = ratings.some(r => r === 'Low');
        if (hasLowRating) {
          shortTerm.push(`Improve ${feature.name} performance to match competitors`);
        }
      });

    // Long-term: Innovation opportunities
    keyFindings.differentiationOpportunities.forEach(opp => {
      if (opp.includes('unique to')) {
        longTerm.push(`Consider implementing ${opp.split(' is unique')[0]} for differentiation`);
      } else if (opp.includes('No product excels')) {
        longTerm.push(`Invest in becoming the leader in ${opp.match(/at (.+) -/)?.[1] || 'this area'}`);
      }
    });

    // Add generic recommendations if lists are empty
    if (immediate.length === 0) {
      immediate.push(`Ensure all must-have features for ${targetCustomer} are implemented`);
    }
    if (shortTerm.length === 0) {
      shortTerm.push(`Optimize performance features to exceed competitor benchmarks`);
    }
    if (longTerm.length === 0) {
      longTerm.push(`Develop innovative features that delight ${targetCustomer}`);
    }

    return {
      immediate: immediate.slice(0, 3),
      shortTerm: shortTerm.slice(0, 3),
      longTerm: longTerm.slice(0, 3)
    };
  }

  private identifyInnovationOpportunities(
    kanoTable: AnalysisRequest['kanoTable'],
    targetCustomer: string
  ): StrategicAnalysis['innovationOpportunities'] {
    const marketGaps: string[] = [];
    const emergingTrends: string[] = [];
    const blueOcean: string[] = [];

    // Market gaps - features no one has
    const allPossibleFeatures = [
      'AI-powered automation',
      'Real-time collaboration',
      'Advanced analytics',
      'Mobile-first design',
      'Voice interface',
      'Blockchain integration',
      'AR/VR capabilities',
      'Predictive insights'
    ];

    const existingFeatures = kanoTable.features.map(f => f.name.toLowerCase());
    allPossibleFeatures.forEach(possibleFeature => {
      if (!existingFeatures.some(ef => ef.includes(possibleFeature.toLowerCase()))) {
        marketGaps.push(`${possibleFeature} not offered by any competitor`);
      }
    });

    // Emerging trends - delighters that might become must-haves
    kanoTable.features
      .filter(f => f.category === 'delighter')
      .forEach(feature => {
        const adoption = Object.values(kanoTable.ratings[feature.id] || {})
          .filter(r => r === 'Yes').length;
        
        if (adoption >= kanoTable.products.length * 0.5) {
          emergingTrends.push(
            `${feature.name} gaining adoption - may become must-have for ${targetCustomer}`
          );
        }
      });

    // Blue ocean - combining features in new ways
    const performanceFeatures = kanoTable.features.filter(f => f.category === 'performance');
    const delighterFeatures = kanoTable.features.filter(f => f.category === 'delighter');
    
    if (performanceFeatures.length > 0 && delighterFeatures.length > 0) {
      blueOcean.push(
        `Combine ${performanceFeatures[0].name} with ${delighterFeatures[0].name} for unique value proposition`
      );
    }

    // Add generic opportunities if needed
    if (marketGaps.length === 0) {
      marketGaps.push(`Explore unaddressed needs of ${targetCustomer}`);
    }
    if (emergingTrends.length === 0) {
      emergingTrends.push(`Monitor feature adoption patterns in the market`);
    }
    if (blueOcean.length === 0) {
      blueOcean.push(`Create new category by reimagining existing features`);
    }

    return {
      marketGaps: marketGaps.slice(0, 3),
      emergingTrends: emergingTrends.slice(0, 3),
      blueOcean: blueOcean.slice(0, 3)
    };
  }
}

export const analystAgent = new AnalystAgent();
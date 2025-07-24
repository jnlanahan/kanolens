import { config } from 'dotenv';

// Load environment variables
config();

console.log('=== FULL AGENT WORKFLOW TEST ===');
console.log('Testing the complete agent workflow\n');

// Import only the necessary functions to avoid DB dependencies
async function searchWithPerplexity(query: string): Promise<{content: string, sources: string[]}> {
  console.log(`\n[Perplexity] Searching for: ${query}`);
  
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
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const sources = data.citations || [];
    
    console.log(`[Perplexity] Search completed: ${content.length} chars, ${sources.length} sources`);
    return { content, sources };
  } catch (error) {
    console.error(`[Perplexity] Search failed:`, error);
    throw error;
  }
}

// Simulate the Researcher Agent
async function simulateResearcher() {
  console.log('\n=== STEP 1: RESEARCHER AGENT ===');
  
  const products = ['Asana', 'Monday.com'];
  const researchResults = {
    products: [] as any[]
  };

  for (const product of products) {
    console.log(`\nResearching ${product}...`);
    
    try {
      // Search for product features
      const featureSearch = await searchWithPerplexity(
        `${product} product features task automation team collaboration reporting capabilities 2024`
      );
      
      // Parse features from content
      const features = extractFeaturesFromContent(featureSearch.content, product);
      
      researchResults.products.push({
        name: product,
        company: product,
        targetMarket: 'small marketing teams',
        pricing: 'Various plans',
        features: features,
        uniqueDifferentiators: [],
        marketPosition: 'Market leader'
      });
      
    } catch (error) {
      console.error(`Failed to research ${product}:`, error);
    }
  }

  console.log('\n--- RESEARCHER OUTPUT ---');
  console.log(JSON.stringify(researchResults, null, 2));
  
  return researchResults;
}

// Extract features from Perplexity content
function extractFeaturesFromContent(content: string, productName: string): any[] {
  const features = [];
  
  // Look for common features mentioned in the content
  const featureKeywords = [
    'task automation', 'team collaboration', 'reporting', 
    'workflow', 'integration', 'dashboard', 'project management',
    'timeline', 'calendar', 'notifications', 'mobile app'
  ];
  
  for (const keyword of featureKeywords) {
    if (content.toLowerCase().includes(keyword)) {
      features.push({
        name: keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: `${keyword} capabilities in ${productName}`,
        benefit: `Enhances productivity through ${keyword}`,
        implementationDetails: 'Core platform feature',
        sources: ['Perplexity research']
      });
    }
  }
  
  return features;
}

// Simulate the Validator Agent
function simulateValidator(researchData: any) {
  console.log('\n\n=== STEP 2: VALIDATOR AGENT ===');
  
  const uniqueFeatures = new Map<string, any>();
  
  // Extract unique features
  researchData.products.forEach((product: any) => {
    product.features.forEach((feature: any) => {
      if (!uniqueFeatures.has(feature.name)) {
        uniqueFeatures.set(feature.name, {
          name: feature.name,
          productCount: 0,
          products: []
        });
      }
      
      const featureData = uniqueFeatures.get(feature.name);
      featureData.productCount++;
      featureData.products.push(product.name);
    });
  });
  
  // Categorize features
  const categorizedFeatures: any[] = [];
  const totalProducts = researchData.products.length;
  
  for (const [featureName, featureData] of uniqueFeatures) {
    const frequency = featureData.productCount / totalProducts;
    
    let category: string;
    let categoryRationale: string;
    
    if (frequency >= 0.8) {
      category = 'must-have';
      categoryRationale = `Present in ${featureData.productCount}/${totalProducts} products - market standard`;
    } else if (frequency <= 0.3) {
      category = 'delighter';
      categoryRationale = `Unique feature creating differentiation`;
    } else {
      category = 'performance';
      categoryRationale = `Variable implementation across products`;
    }
    
    // Generate product ratings
    const productRatings: any = {};
    researchData.products.forEach((product: any) => {
      const hasFeature = product.features.some((f: any) => f.name === featureName);
      
      if (category === 'must-have') {
        productRatings[product.name] = {
          rating: hasFeature ? 'Yes' : 'No',
          justification: hasFeature ? `${product.name} includes ${featureName}` : `${product.name} lacks ${featureName}`,
          sources: ['Research data']
        };
      } else if (category === 'performance') {
        productRatings[product.name] = {
          rating: hasFeature ? 'High' : 'Low',
          justification: `${product.name} ${hasFeature ? 'provides strong' : 'has limited'} ${featureName}`,
          sources: ['Research data']
        };
      } else {
        productRatings[product.name] = {
          rating: hasFeature ? 'Yes' : '',
          justification: hasFeature ? `${product.name} offers ${featureName} as a differentiator` : '',
          sources: ['Research data']
        };
      }
    });
    
    categorizedFeatures.push({
      featureName,
      genericDescription: `${featureName} functionality`,
      category,
      categoryRationale,
      productRatings
    });
  }
  
  const validationResult = {
    categorizedFeatures,
    summary: {
      totalFeatures: categorizedFeatures.length,
      mustHaves: categorizedFeatures.filter(f => f.category === 'must-have').length,
      performance: categorizedFeatures.filter(f => f.category === 'performance').length,
      delighters: categorizedFeatures.filter(f => f.category === 'delighter').length,
      targetCustomerConsiderations: 'Focus on must-haves for parity and delighters for differentiation'
    }
  };
  
  console.log('\n--- VALIDATOR OUTPUT ---');
  console.log(JSON.stringify(validationResult, null, 2));
  
  return validationResult;
}

// Simulate the Evaluator Agent
function simulateEvaluator(validatedData: any) {
  console.log('\n\n=== STEP 3: EVALUATOR AGENT ===');
  
  const kanoFeatures = validatedData.categorizedFeatures.map((feature: any) => {
    // Convert to Kano analysis format
    return {
      id: feature.featureName.toLowerCase().replace(/\s+/g, '-'),
      name: feature.featureName,
      description: feature.genericDescription,
      category: feature.category,
      categoryRationale: feature.categoryRationale,
      customerImpact: getCustomerImpact(feature.category),
      developmentEffort: 'Medium', // Would be analyzed by AI
      priority: getPriority(feature.category),
      marketInsights: {
        competitiveAdvantage: feature.category === 'delighter' ? 'High' : 'Medium',
        marketTrend: 'Growing importance',
        customerDemand: feature.category === 'must-have' ? 'Essential' : 'Desired'
      },
      implementation: {
        products: Object.entries(feature.productRatings).map(([product, rating]: [string, any]) => ({
          name: product,
          hasFeature: rating.rating === 'Yes' || rating.rating === 'High',
          quality: rating.rating,
          details: rating.justification
        }))
      }
    };
  });
  
  const kanoAnalysis = {
    features: kanoFeatures,
    summary: {
      totalAnalyzed: kanoFeatures.length,
      byCategory: {
        'must-have': kanoFeatures.filter((f: any) => f.category === 'must-have').length,
        'performance': kanoFeatures.filter((f: any) => f.category === 'performance').length,
        'delighter': kanoFeatures.filter((f: any) => f.category === 'delighter').length
      },
      recommendations: [
        'Prioritize must-have features for market parity',
        'Invest in delighter features for competitive advantage',
        'Optimize performance features based on customer feedback'
      ]
    }
  };
  
  console.log('\n--- EVALUATOR OUTPUT ---');
  console.log(JSON.stringify(kanoAnalysis, null, 2));
  
  return kanoAnalysis;
}

function getCustomerImpact(category: string): string {
  switch (category) {
    case 'must-have':
      return 'Dissatisfaction if missing';
    case 'performance':
      return 'Satisfaction increases with quality';
    case 'delighter':
      return 'Delight when present, no dissatisfaction if missing';
    default:
      return 'Moderate impact';
  }
}

function getPriority(category: string): string {
  switch (category) {
    case 'must-have':
      return 'Critical';
    case 'performance':
      return 'High';
    case 'delighter':
      return 'Strategic';
    default:
      return 'Medium';
  }
}

// Run the complete workflow
async function runFullWorkflow() {
  try {
    console.log('Starting full agent workflow test...');
    console.log('Perplexity API Key:', process.env.PERPLEXITY_API_KEY ? 'Configured' : 'NOT CONFIGURED');
    
    // Step 1: Research
    const researchData = await simulateResearcher();
    
    // Step 2: Validate
    const validatedData = simulateValidator(researchData);
    
    // Step 3: Evaluate
    const kanoAnalysis = simulateEvaluator(validatedData);
    
    console.log('\n\n=== WORKFLOW COMPLETE ===');
    console.log('Total features analyzed:', kanoAnalysis.features.length);
    console.log('Categories:', kanoAnalysis.summary.byCategory);
    
  } catch (error) {
    console.error('\n\n=== WORKFLOW FAILED ===');
    console.error('Error:', error);
  }
}

// Run the test
runFullWorkflow().then(() => {
  console.log('\n\n=== ALL TESTS COMPLETE ===');
  process.exit(0);
}).catch(error => {
  console.error('\n\n=== FATAL ERROR ===');
  console.error(error);
  process.exit(1);
});
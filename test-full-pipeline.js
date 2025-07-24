import { config } from 'dotenv';
config();

console.log('=== TESTING FULL PIPELINE WITHOUT DATABASE ===\n');

// Import agents directly
import { researcherAgent } from './server/agents/researcher.ts';
import { validatorAgent } from './server/agents/validator.ts';

async function testFullPipeline() {
  try {
    console.log('🔍 Step 1: Research Phase');
    
    const researchRequest = {
      mode: 'comprehensive',
      products: ['V0', 'Replit'],
      targetCustomer: 'Product Managers',
      marketCategory: 'Development Tools',
      featuresToResearch: ['User Interface', 'AI Code Assistance'],
      analysisMode: 'quick'
    };
    
    const researchData = await researcherAgent.performResearch(researchRequest);
    console.log(`✅ Research complete: ${researchData.products?.length} products, first has ${researchData.products?.[0]?.features?.length} features\n`);
    
    console.log('🔍 Step 2: Validation Phase');
    
    const validationRequest = {
      researchData: researchData,
      targetCustomer: 'Product Managers'
    };
    
    const validationData = await validatorAgent.validateResearch(validationRequest);
    console.log(`✅ Validation complete: ${validationData.categorizedFeatures?.length} categorized features\n`);
    
    console.log('🔍 Step 3: Check Results Quality');
    
    if (validationData.categorizedFeatures && validationData.categorizedFeatures.length > 0) {
      const firstFeature = validationData.categorizedFeatures[0];
      console.log('Sample feature:', firstFeature.featureName);
      console.log('Category:', firstFeature.category);
      
      // Check product ratings
      const productNames = Object.keys(firstFeature.productRatings || {});
      console.log('Products with ratings:', productNames);
      
      if (productNames.length > 0) {
        const firstProduct = productNames[0];
        const rating = firstFeature.productRatings[firstProduct];
        console.log(`\nSample rating for ${firstProduct}:`);
        console.log('Rating:', rating.rating);
        console.log('Justification:', rating.justification?.substring(0, 100) + '...');
        console.log('Has sources:', rating.sources?.length > 0);
        
        if (rating.justification?.includes('configure PERPLEXITY_API_KEY')) {
          console.log('❌ ISSUE: Still showing fallback message');
        } else if (rating.justification?.includes('No specific data available')) {
          console.log('❌ ISSUE: Generic justification, no real data');
        } else {
          console.log('✅ SUCCESS: Real justification from research data');
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('Research worked:', !!researchData.products);
    console.log('Validation worked:', !!validationData.categorizedFeatures);
    console.log('Rich data present:', validationData.categorizedFeatures?.[0]?.productRatings?.[Object.keys(validationData.categorizedFeatures[0].productRatings)[0]]?.justification?.length > 50);
    
  } catch (error) {
    console.error('❌ Pipeline failed:', error.message);
    console.error('Stack:', error.stack?.substring(0, 500));
  }
}

testFullPipeline();
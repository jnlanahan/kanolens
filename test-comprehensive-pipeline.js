import { config } from 'dotenv';
import { researcherAgent } from './server/agents/researcher.ts';
import { validatorAgent } from './server/agents/validator.ts';

config();

console.log('=== COMPREHENSIVE PIPELINE TEST ===\n');

async function testFullPipeline() {
  try {
    console.log('🔬 PHASE 1: Testing Researcher Agent');
    console.log('=' .repeat(50));
    
    const researchRequest = {
      mode: 'comprehensive',
      products: ['Notion', 'Obsidian'],
      targetCustomer: 'Knowledge Workers',
      marketCategory: 'Note Taking Tools',
      featuresToResearch: ['User Interface', 'Note Organization'],
      analysisMode: 'deep' // Test deep mode specifically
    };
    
    console.log('Research Request:', researchRequest);
    
    const researchData = await researcherAgent.performResearch(researchRequest);
    
    console.log('\n📊 RESEARCH RESULTS:');
    console.log(`Products: ${researchData.products?.length || 0}`);
    
    if (researchData.products && researchData.products.length > 0) {
      researchData.products.forEach((product, i) => {
        console.log(`Product ${i + 1}: ${product.name} - ${product.features?.length || 0} features`);
        
        if (product.features && product.features.length >= 3) {
          console.log('Sample features with details:');
          product.features.slice(0, 3).forEach(feature => {
            console.log(`  • ${feature.name}`);
            console.log(`    Description: ${feature.description?.substring(0, 80)}...`);
            console.log(`    Benefit: ${feature.benefit?.substring(0, 60)}...`);
            console.log(`    Implementation: ${feature.implementationDetails?.substring(0, 60)}...`);
          });
        }
      });
    }
    
    console.log('\n🔬 PHASE 2: Testing Validator Agent');
    console.log('=' .repeat(50));
    
    const validationRequest = {
      researchData: researchData,
      targetCustomer: 'Knowledge Workers',
      products: ['Notion', 'Obsidian']
    };
    
    const validationData = await validatorAgent.validateResearch(validationRequest);
    
    console.log('\n📊 VALIDATION RESULTS:');
    console.log(`Categorized features: ${validationData.categorizedFeatures?.length || 0}`);
    
    if (validationData.categorizedFeatures && validationData.categorizedFeatures.length > 0) {
      // Show category breakdown
      const categories = validationData.categorizedFeatures.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {});
      console.log('Category breakdown:', categories);
      
      // Check sample feature with product ratings
      const sampleFeature = validationData.categorizedFeatures[0];
      console.log(`\nSample feature: ${sampleFeature.featureName}`);
      console.log(`Category: ${sampleFeature.category}`);
      console.log(`Rationale: ${sampleFeature.categoryRationale}`);
      console.log(`Has product ratings: ${!!sampleFeature.productRatings}`);
      
      if (sampleFeature.productRatings) {
        Object.keys(sampleFeature.productRatings).forEach(product => {
          const rating = sampleFeature.productRatings[product];
          console.log(`\n${product} rating:`, {
            rating: rating.rating,
            justificationLength: rating.justification?.length || 0,
            justificationPreview: rating.justification?.substring(0, 80) + '...',
            sources: rating.sources?.length || 0,
            flags: rating.flags?.length || 0
          });
          
          // Check for fallback indicators
          if (rating.justification?.includes('configure PERPLEXITY_API_KEY')) {
            console.log('❌ ISSUE: Fallback justification detected in validator output!');
          } else if (rating.justification?.includes('No specific data available')) {
            console.log('⚠️ WARNING: Generic justification from validator');
          } else {
            console.log('✅ SUCCESS: Rich justification from validator');
          }
        });
      }
    }
    
    console.log('\n🎯 PIPELINE ANALYSIS:');
    console.log('=' .repeat(50));
    
    const researchFeatureCount = researchData.products?.[0]?.features?.length || 0;
    const validatedFeatureCount = validationData.categorizedFeatures?.length || 0;
    
    console.log(`Research extracted: ${researchFeatureCount} features`);
    console.log(`Validator processed: ${validatedFeatureCount} features`);
    
    if (researchFeatureCount === 0) {
      console.log('❌ CRITICAL: Researcher extracted no features!');
    } else if (validatedFeatureCount === 0) {
      console.log('❌ CRITICAL: Validator processed no features!');  
    } else if (validatedFeatureCount < researchFeatureCount / 2) {
      console.log('⚠️ WARNING: Validator significantly reduced feature count');
      console.log(`Lost ${researchFeatureCount - validatedFeatureCount} features in validation`);
    } else {
      console.log('✅ SUCCESS: Feature pipeline working normally');
    }
    
    // Check for AI features specifically
    const aiFeatures = validationData.categorizedFeatures?.filter(f => 
      f.category === 'delighter' && 
      (f.featureName.toLowerCase().includes('ai') || 
       f.featureName.toLowerCase().includes('smart'))
    ) || [];
    
    console.log(`AI/Smart features identified: ${aiFeatures.length}`);
    if (aiFeatures.length > 0) {
      aiFeatures.forEach(feature => {
        console.log(`  • ${feature.featureName} (${feature.category})`);
      });
    }
    
    return {
      researchFeatures: researchFeatureCount,
      validatedFeatures: validatedFeatureCount,
      aiFeatures: aiFeatures.length,
      hasRichData: validationData.categorizedFeatures?.[0]?.productRatings?.[Object.keys(validationData.categorizedFeatures[0].productRatings)[0]]?.justification?.length > 50
    };
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
    console.error('Stack:', error.stack);
    return { error: error.message };
  }
}

testFullPipeline().then(result => {
  console.log('\n🏁 FINAL RESULTS:', result);
  
  if (result.error) {
    console.log('\n🔧 NEXT STEPS: Fix the error above before proceeding');
  } else if (!result.hasRichData) {
    console.log('\n🔧 NEXT STEPS: Rich data not flowing through - check validator justification generation');
  } else {
    console.log('\n✅ PIPELINE IS WORKING: Rich data flows from research to validation');
    console.log('🔧 NEXT STEPS: Test the orchestrator buildKanoTable method');
  }
});
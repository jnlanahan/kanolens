import { config } from 'dotenv';
import { researcherAgent } from './server/agents/researcher.ts';
import { validatorAgent } from './server/agents/validator.ts';

config();

console.log('=== TESTING COMPLETE FIXED PIPELINE ===\n');

async function testCompleteFix() {
  try {
    console.log('🔬 PHASE 1: Real Researcher Test');
    console.log('=' .repeat(40));
    
    const researchRequest = {
      mode: 'comprehensive',
      products: ['Notion', 'Obsidian'],
      targetCustomer: 'Knowledge Workers',
      marketCategory: 'Note Taking Tools',
      featuresToResearch: ['User Interface', 'Note Organization'],
      analysisMode: 'deep'
    };
    
    const researchData = await researcherAgent.performResearch(researchRequest);
    console.log(`✅ Research: ${researchData.products?.length} products, ${researchData.products?.[0]?.features?.length} features for first product`);
    
    console.log('\n🔬 PHASE 2: Fixed Validator Test');
    console.log('=' .repeat(40));
    
    // Use the CORRECTED validator API
    const validationData = await validatorAgent.validateResearch(researchData);
    console.log(`✅ Validation: ${validationData.categorizedFeatures?.length} features categorized`);
    
    if (validationData.categorizedFeatures && validationData.categorizedFeatures.length > 0) {
      // Category breakdown
      const categories = validationData.categorizedFeatures.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {});
      console.log('Categories:', categories);
      
      // Check sample justifications
      const sampleFeature = validationData.categorizedFeatures[0];
      const firstProduct = Object.keys(sampleFeature.productRatings || {})[0];
      const sampleJustification = sampleFeature.productRatings?.[firstProduct]?.justification;
      
      console.log(`\nSample: ${sampleFeature.featureName} (${sampleFeature.category})`);
      console.log(`Justification: "${sampleJustification?.substring(0, 80)}..."`);
      
      if (sampleJustification?.includes('configure PERPLEXITY_API_KEY')) {
        console.log('❌ ISSUE: Still showing fallback message');
        return { success: false, issue: 'fallback' };
      } else if (sampleJustification?.includes('No specific data available')) {
        console.log('⚠️ WARNING: Generic justification');
        return { success: true, warning: 'generic' };
      } else {
        console.log('✅ SUCCESS: Rich justification from real research');
        return { 
          success: true, 
          featureCount: validationData.categorizedFeatures.length,
          categories,
          hasRichData: true
        };
      }
    }
    
    return { success: false, issue: 'no_features' };
    
  } catch (error) {
    console.error('❌ Complete test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testCompleteFix().then(result => {
  console.log('\n🏁 COMPLETE PIPELINE TEST RESULTS:');
  console.log('=' .repeat(50));
  
  if (result.success && result.hasRichData) {
    console.log('🎉 PIPELINE COMPLETELY FIXED!');
    console.log(`✅ Features: ${result.featureCount}`);
    console.log(`✅ Categories:`, result.categories);
    console.log('✅ Rich justifications from real Perplexity research');
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Clear cached fallback sessions from database');
    console.log('2. Test the complete orchestrator');
    console.log('3. Verify frontend display');
  } else if (result.success && result.warning) {
    console.log('⚠️ PIPELINE MOSTLY WORKING');
    console.log('🔧 Need to improve justification generation');
  } else {
    console.log('❌ PIPELINE STILL HAS ISSUES');
    console.log('🔧 Issue:', result.issue || result.error);
  }
});
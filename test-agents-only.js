import { config } from 'dotenv';

config();

console.log('=== TESTING AGENTS WITHOUT DATABASE ===\n');

async function testAgentsOnly() {
  try {
    console.log('🔬 Testing researcher and validator agents directly...\n');
    
    // Dynamic imports to avoid database initialization
    const { researcherAgent } = await import('./server/agents/researcher.ts');
    const { validatorAgent } = await import('./server/agents/validator.ts');
    
    const researchRequest = {
      mode: 'comprehensive',
      products: ['Notion', 'Obsidian'],
      targetCustomer: 'Knowledge Workers',
      marketCategory: 'Note Taking Tools',
      featuresToResearch: ['User Interface', 'Note Organization'],
      analysisMode: 'deep'
    };
    
    console.log('📊 PHASE 1: Research data extraction');
    console.log('Products:', researchRequest.products.join(', '));
    console.log('Features to research:', researchRequest.featuresToResearch.join(', '));
    console.log('Analysis mode:', researchRequest.analysisMode);
    console.log();
    
    const researchData = await researcherAgent.performResearch(researchRequest);
    console.log(`✅ Research complete:`);
    console.log(`  Products: ${researchData.products?.length || 0}`);
    console.log(`  Features found for first product: ${researchData.products?.[0]?.features?.length || 0}`);
    
    if (!researchData.products || researchData.products.length === 0) {
      console.log('❌ No research data extracted');
      return { success: false, issue: 'no_research_data' };
    }
    
    console.log('\n🔬 PHASE 2: Data validation and categorization');
    
    // Use the CORRECTED validator API
    const validationData = await validatorAgent.validateResearch(researchData);
    console.log(`✅ Validation complete:`);
    console.log(`  Features categorized: ${validationData.categorizedFeatures?.length || 0}`);
    
    if (!validationData.categorizedFeatures || validationData.categorizedFeatures.length === 0) {
      console.log('❌ No features categorized by validator');
      return { success: false, issue: 'no_categorized_features' };
    }
    
    // Category breakdown
    const categories = validationData.categorizedFeatures.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {});
    console.log('  Category breakdown:', categories);
    
    // Check sample justifications
    const sampleFeature = validationData.categorizedFeatures[0];
    const firstProduct = Object.keys(sampleFeature.productRatings || {})[0];
    const sampleJustification = sampleFeature.productRatings?.[firstProduct]?.justification;
    
    console.log(`\n📝 Sample feature analysis:`);
    console.log(`  Feature: ${sampleFeature.featureName}`);
    console.log(`  Category: ${sampleFeature.category}`);
    console.log(`  Product: ${firstProduct}`);
    console.log(`  Rating: ${sampleFeature.productRatings?.[firstProduct]?.rating || 'unknown'}`);
    console.log(`  Justification: "${sampleJustification?.substring(0, 100)}..."`);
    
    if (sampleJustification?.includes('configure PERPLEXITY_API_KEY')) {
      console.log('\n❌ CRITICAL ISSUE: Still showing fallback message');
      console.log('The agents are still using old code with fallback data generation.');
      return { success: false, issue: 'fallback_still_present' };
    } else if (sampleJustification?.includes('No specific data available')) {
      console.log('\n⚠️ WARNING: Generic justification detected');
      console.log('Research may be limited or API responses are generic.');
      return { success: true, warning: 'generic_responses', featureCount: validationData.categorizedFeatures.length, categories };
    } else if (sampleJustification && sampleJustification.length > 50) {
      console.log('\n✅ SUCCESS: Rich justification from real research!');
      console.log('The agent pipeline is working with detailed data.');
      return { 
        success: true, 
        featureCount: validationData.categorizedFeatures.length,
        categories,
        hasRichData: true,
        sampleJustification: sampleJustification.substring(0, 200)
      };
    } else {
      console.log('\n⚠️ WARNING: Short or missing justification');
      return { success: false, issue: 'poor_justification' };
    }
    
  } catch (error) {
    console.error('❌ Agent test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

testAgentsOnly().then(result => {
  console.log('\n🏁 AGENT-ONLY TEST RESULTS:');
  console.log('='.repeat(50));
  
  if (result.success && result.hasRichData) {
    console.log('🎉 AGENTS ARE WORKING PERFECTLY!');
    console.log(`✅ Features extracted and categorized: ${result.featureCount}`);
    console.log(`✅ Categories:`, result.categories);
    console.log('✅ Rich justifications from real Perplexity research');
    console.log(`✅ Sample: "${result.sampleJustification}..."`);
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. The core agents are fixed and working');
    console.log('2. Test the full orchestrator (with database connection)');
    console.log('3. Clear cached sessions from the UI');
    console.log('4. Create a fresh analysis session');
  } else if (result.success && result.warning) {
    console.log('⚠️ AGENTS MOSTLY WORKING');
    console.log(`✅ Features: ${result.featureCount}`);
    console.log(`✅ Categories:`, result.categories);
    console.log('⚠️ Issue: Generic responses detected');
    console.log('🔧 May need to improve Perplexity prompts or check API responses');
  } else {
    console.log('❌ AGENTS STILL HAVE ISSUES');
    console.log(`🔧 Issue: ${result.issue || result.error}`);
    
    if (result.issue === 'fallback_still_present') {
      console.log('\n💡 SOLUTION: The server is running old code.');
      console.log('Stop the server (Ctrl+C) and restart it (npm run dev)');
    } else if (result.issue === 'no_categorized_features') {
      console.log('\n💡 SOLUTION: Validator API mismatch still exists.');
      console.log('Check the validator agent method calls in orchestrator.');
    }
  }
});
import { config } from 'dotenv';
import { researcherAgent } from './server/agents/researcher.ts';

config();

console.log('=== TESTING RESEARCHER WITH DIFFERENT MODES ===\n');

async function testResearcherMode(analysisMode, researchMode) {
  console.log(`\n🔬 TESTING: analysisMode='${analysisMode}', researchMode='${researchMode}'`);
  console.log('=' .repeat(50));
  
  try {
    const researchRequest = {
      mode: researchMode,
      products: ['Notion', 'Obsidian'],
      targetCustomer: 'Knowledge Workers',
      marketCategory: 'Note Taking Tools',
      featuresToResearch: ['User Interface', 'Note Organization'],
      analysisMode: analysisMode
    };
    
    console.log('Request:', researchRequest);
    console.log('\n📊 Starting research...');
    
    const result = await researcherAgent.performResearch(researchRequest);
    
    console.log(`\n✅ Research complete!`);
    console.log(`Products researched: ${result.products?.length || 0}`);
    
    if (result.products && result.products.length > 0) {
      result.products.forEach((product, i) => {
        console.log(`\nProduct ${i + 1}: ${product.name}`);
        console.log(`  Features found: ${product.features?.length || 0}`);
        
        if (product.features && product.features.length > 0) {
          console.log('  Sample features:');
          product.features.slice(0, 3).forEach(feature => {
            console.log(`    - ${feature.name}: ${feature.description?.substring(0, 60)}...`);
          });
        }
      });
    }
    
    // Look for signs of fallback or real data
    const firstProduct = result.products?.[0];
    const sampleFeature = firstProduct?.features?.[0];
    
    if (sampleFeature?.description?.includes('requires proper research') || 
        sampleFeature?.description?.includes('configure PERPLEXITY_API_KEY')) {
      console.log('❌ ISSUE: Researcher returning fallback data');
      return { success: false, mode: analysisMode, issue: 'fallback' };
    } else if (firstProduct?.features?.length > 10) {
      console.log('✅ SUCCESS: Rich research data obtained');
      return { success: true, mode: analysisMode, featureCount: firstProduct.features.length };
    } else {
      console.log('⚠️ WARNING: Limited features extracted');
      return { success: true, mode: analysisMode, featureCount: firstProduct?.features?.length || 0, warning: 'limited' };
    }
    
  } catch (error) {
    console.error(`❌ Research failed:`, error.message);
    return { success: false, mode: analysisMode, error: error.message };
  }
}

async function testModeImpact() {
  console.log('🎯 Testing if analysisMode affects researcher behavior...\n');
  
  const results = [];
  
  // Test different analysis modes with same research mode
  const testCases = [
    { analysisMode: 'express', researchMode: 'basic' },
    { analysisMode: 'quick', researchMode: 'comprehensive' }, 
    { analysisMode: 'deep', researchMode: 'comprehensive' }
  ];
  
  for (const testCase of testCases) {
    const result = await testResearcherMode(testCase.analysisMode, testCase.researchMode);
    results.push(result);
    
    // Wait between tests
    if (testCase !== testCases[testCases.length - 1]) {
      console.log('\n⏱️ Waiting 20 seconds...');
      await new Promise(resolve => setTimeout(resolve, 20000));
    }
  }
  
  console.log('\n\n📈 RESEARCHER MODE COMPARISON:');
  console.log('=' .repeat(60));
  
  results.forEach(result => {
    console.log(`\n${result.mode.toUpperCase()} MODE:`);
    console.log(`  Success: ${result.success ? '✅' : '❌'}`);
    console.log(`  Features: ${result.featureCount || 'N/A'}`);
    if (result.error) console.log(`  Error: ${result.error}`);
    if (result.warning) console.log(`  Warning: ${result.warning}`);
    if (result.issue) console.log(`  Issue: ${result.issue}`);
  });
  
  // Analysis
  const deepResult = results.find(r => r.mode === 'deep');
  const quickResult = results.find(r => r.mode === 'quick');
  
  if (deepResult && !deepResult.success) {
    console.log('\n❌ DEEP MODE ISSUE IDENTIFIED!');
    console.log('The deep analysis mode is failing in the researcher.');
  } else if (deepResult && deepResult.featureCount < quickResult?.featureCount) {
    console.log('\n⚠️ DEEP MODE EXTRACTING FEWER FEATURES!');
    console.log('Deep mode should extract more features, not fewer.');
  } else {
    console.log('\n🤔 RESEARCHER MODES WORKING NORMALLY');
    console.log('Issue may be downstream in validator or orchestrator.');
  }
}

testModeImpact();
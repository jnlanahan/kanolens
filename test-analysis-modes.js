import { config } from 'dotenv';
import { orchestratorAgent } from './server/agents/orchestrator.ts';

config();

console.log('=== TESTING ALL ANALYSIS MODES ===\n');

async function testAnalysisMode(mode, testName) {
  console.log(`\n🔬 TESTING ${mode.toUpperCase()} MODE (${testName})`);
  console.log('=' .repeat(50));
  
  try {
    const products = ['Notion', 'Obsidian'];
    const features = ['User Interface', 'Note Organization', 'Collaboration'];
    const targetCustomer = 'Knowledge Workers';
    
    console.log(`Input: ${products.join(' vs ')} for ${targetCustomer}`);
    console.log(`Features: ${features.join(', ')}`);
    console.log(`Mode: ${mode}`);
    
    const progressUpdates = [];
    
    const result = await orchestratorAgent.coordinateFullAnalysis(
      products,
      features,
      targetCustomer,
      (update) => {
        const msg = `[${update.step.toUpperCase()}] ${update.message} (${update.progress}%)`;
        console.log(msg);
        progressUpdates.push({
          step: update.step,
          message: update.message,
          progress: update.progress,
          timestamp: Date.now()
        });
      },
      999999, // Test session ID
      mode
    );
    
    console.log(`\n📊 ${mode.toUpperCase()} MODE RESULTS:`);
    console.log(`Features found: ${result.tableData?.features?.length || 0}`);
    console.log(`Products: ${result.tableData?.products?.length || 0}`);
    
    // Check for fallback vs real data
    const sampleSource = result.tableData?.sources?.[Object.keys(result.tableData.sources)[0]]?.[0];
    const sampleJustification = result.tableData?.justifications?.[Object.keys(result.tableData.justifications)[0]]?.[products[0]];
    
    console.log(`Sample source: ${sampleSource?.substring(0, 60)}...`);
    console.log(`Sample justification: ${sampleJustification?.substring(0, 80)}...`);
    
    const isFallback = sampleSource?.includes('PERPLEXITY_API_KEY') || 
                     sampleJustification?.includes('configure PERPLEXITY_API_KEY');
    
    if (isFallback) {
      console.log('❌ ISSUE: Using fallback data, not real research!');
    } else {
      console.log('✅ SUCCESS: Real research data generated!');
    }
    
    // Show feature breakdown by category
    if (result.tableData?.features) {
      const categories = result.tableData.features.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Feature breakdown:', categories);
    }
    
    // Check ratings quality
    if (result.tableData?.ratings) {
      const ratings = result.tableData.ratings;
      const ratingCounts = {};
      let detailedJustifications = 0;
      
      Object.keys(ratings).forEach(featureId => {
        Object.keys(ratings[featureId]).forEach(product => {
          const rating = ratings[featureId][product];
          ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
          
          const justification = result.tableData?.justifications?.[featureId]?.[product];
          if (justification && justification.length > 50 && !justification.includes('No specific data')) {
            detailedJustifications++;
          }
        });
      });
      
      console.log('Rating distribution:', ratingCounts);
      console.log('Detailed justifications:', detailedJustifications);
    }
    
    return {
      mode,
      success: !isFallback,
      featureCount: result.tableData?.features?.length || 0,
      progressSteps: progressUpdates.length,
      detailLevel: sampleJustification?.length || 0
    };
    
  } catch (error) {
    console.error(`❌ ${mode.toUpperCase()} MODE FAILED:`, error.message);
    return {
      mode,
      success: false,
      error: error.message
    };
  }
}

async function runModeComparison() {
  console.log('🎯 Testing all analysis modes to identify differences...\n');
  
  const results = [];
  
  // Test each mode
  for (const mode of ['express', 'quick', 'deep']) {
    const result = await testAnalysisMode(mode, `${mode} analysis test`);
    results.push(result);
    
    // Wait between tests to avoid rate limits
    if (mode !== 'deep') {
      console.log('\n⏱️ Waiting 30 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  console.log('\n\n📈 MODE COMPARISON RESULTS:');
  console.log('=' .repeat(60));
  
  results.forEach(result => {
    console.log(`\n${result.mode.toUpperCase()} MODE:`);
    console.log(`  Success: ${result.success ? '✅' : '❌'}`);
    console.log(`  Features: ${result.featureCount}`);
    console.log(`  Progress Steps: ${result.progressSteps}`);
    console.log(`  Detail Level: ${result.detailLevel} chars`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  // Analysis
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n🎯 SUMMARY:`);
  console.log(`Successful modes: ${successful.map(r => r.mode).join(', ')}`);
  console.log(`Failed modes: ${failed.map(r => r.mode).join(', ')}`);
  
  if (successful.length === 0) {
    console.log('\n❌ ALL MODES FAILED - Core pipeline issue!');
    console.log('🔧 Need to fix fundamental research/orchestration problem');
  } else if (failed.some(f => f.mode === 'deep')) {
    console.log('\n⚠️ DEEP MODE has specific issues!');
    console.log('🔧 Deep mode configuration may be causing problems');
  } else {
    console.log('\n✅ Modes working - issue may be in frontend/data serving');
  }
}

runModeComparison();
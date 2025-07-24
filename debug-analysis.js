import { config } from 'dotenv';
import { orchestratorAgent } from './server/agents/orchestrator.ts';

config();

console.log('=== DEBUGGING ANALYSIS FLOW ===\n');

async function debugAnalysis() {
  try {
    console.log('🔍 Testing actual analysis flow...\n');
    
    const products = ['V0', 'Replit', 'Cursor'];
    const features = ['User-Friendly Interface', 'AI Code Suggestions', 'Real-Time Collaboration'];
    const targetCustomer = 'Product Managers';
    
    console.log('Input:');
    console.log('- Products:', products);
    console.log('- Features:', features);  
    console.log('- Target Customer:', targetCustomer);
    console.log('\n📊 Starting analysis...\n');
    
    const progressUpdates = [];
    
    const result = await orchestratorAgent.coordinateFullAnalysis(
      products,
      features,
      targetCustomer,
      (update) => {
        progressUpdates.push(update);
        console.log(`[${update.step.toUpperCase()}] ${update.message} (${update.progress}%)`);
        if (update.data?.error) {
          console.log('  ❌ Error:', update.data.error);
        }
      },
      999999, // Test session ID
      'quick'
    );
    
    console.log('\n✅ Analysis completed!');
    console.log('\n📋 Progress Steps:');
    progressUpdates.forEach(update => {
      console.log(`  ${update.step}: ${update.message}`);
    });
    
    console.log('\n📊 Final Results:');
    console.log('Features found:', result.tableData?.features?.length || 0);
    console.log('Products:', result.tableData?.products?.length || 0);
    
    // Check if we got real data or fallback
    if (result.tableData?.sources && Object.keys(result.tableData.sources).length > 0) {
      const firstFeatureId = Object.keys(result.tableData.sources)[0];
      const sources = result.tableData.sources[firstFeatureId];
      console.log('\n🔗 Sample sources:', sources[0]);
      
      if (sources[0]?.includes('PERPLEXITY_API_KEY')) {
        console.log('❌ ISSUE: Using fallback analysis, not real research!');
      } else {
        console.log('✅ SUCCESS: Using real research data!');
      }
    }
    
    // Check justifications
    if (result.tableData?.justifications) {
      const firstFeatureId = Object.keys(result.tableData.justifications)[0];
      const firstProduct = Object.keys(result.tableData.justifications[firstFeatureId])[0];
      const justification = result.tableData.justifications[firstFeatureId][firstProduct];
      
      console.log('\n📝 Sample justification:');
      console.log(`"${justification}"`);
      
      if (justification.includes('No specific data available')) {
        console.log('❌ ISSUE: Generic justification, research may have failed');
      } else if (justification.includes('configure PERPLEXITY_API_KEY')) {
        console.log('❌ ISSUE: Fallback message, Perplexity research failed');
      } else {
        console.log('✅ SUCCESS: Detailed justification from research');
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    console.error('Stack:', error.stack);
  }
}

debugAnalysis();
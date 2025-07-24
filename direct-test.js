import { config } from 'dotenv';
import { orchestratorAgent } from './server/agents/orchestrator.ts';

config();

console.log('=== DIRECT ORCHESTRATOR TEST ===\n');

async function directTest() {
  try {
    console.log('🚀 Testing the fixed orchestrator directly (no API/database)...\n');
    
    const products = ['V0', 'Replit', 'Cursor'];
    const features = ['AI-Driven Design Suggestions', 'Code Generation', 'Collaborative Editing'];
    const targetCustomer = 'Product Managers';
    
    console.log('Products:', products.join(', '));
    console.log('Features:', features.join(', '));
    console.log('Mode: deep');
    console.log('\n📊 Starting analysis...\n');
    
    const result = await orchestratorAgent.coordinateFullAnalysis(
      products,
      features,
      targetCustomer,
      (update) => {
        console.log(`[${update.step}] ${update.message} (${update.progress}%)`);
      },
      999999, // Test session ID
      'deep'
    );
    
    console.log('\n✅ Analysis complete!');
    console.log(`Features found: ${result.tableData?.features?.length || 0}`);
    console.log(`Products: ${result.tableData?.products?.length || 0}`);
    
    // Check the quality of results
    if (result.tableData?.justifications) {
      const firstFeatureId = Object.keys(result.tableData.justifications)[0];
      const firstProduct = products[0];
      const sampleJustification = result.tableData.justifications[firstFeatureId]?.[firstProduct];
      
      console.log('\n📝 Sample justification:');
      console.log(`Feature: ${firstFeatureId}`);
      console.log(`Product: ${firstProduct}`);
      console.log(`Justification: "${sampleJustification?.substring(0, 150)}..."`);
      
      if (sampleJustification?.includes('configure PERPLEXITY_API_KEY')) {
        console.log('\n❌ STILL SHOWING FALLBACK DATA!');
        console.log('The orchestrator is still using old code.');
      } else if (sampleJustification?.includes('No specific data available')) {
        console.log('\n⚠️ Generic justification - research may be limited');
      } else {
        console.log('\n✅ SUCCESS! Rich justification from real research!');
        
        // Show feature breakdown
        const categories = result.tableData.features.reduce((acc, f) => {
          acc[f.category] = (acc[f.category] || 0) + 1;
          return acc;
        }, {});
        
        console.log('\nFeature breakdown:', categories);
        console.log('\n🎉 THE FIX IS WORKING!');
        console.log('Now you need to create a new session through the UI to see these results.');
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nThis error will help diagnose the issue.');
    return { error: error.message };
  }
}

directTest();
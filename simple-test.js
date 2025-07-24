import { config } from 'dotenv';
import { researcherAgent } from './server/agents/researcher.ts';

config();

console.log('=== SIMPLE RESEARCHER TEST ===\n');

async function testResearcher() {
  try {
    console.log('🔍 Testing researcher agent directly...\n');
    
    const researchRequest = {
      mode: 'comprehensive',
      products: ['V0', 'Replit'],
      targetCustomer: 'Product Managers',
      marketCategory: 'Development Tools',
      featuresToResearch: ['User Interface', 'AI Code Assistance'],
      analysisMode: 'quick'
    };
    
    console.log('Input:', researchRequest);
    console.log('\n📊 Starting research...\n');
    
    const result = await researcherAgent.performResearch(researchRequest);
    
    console.log('\n✅ Research completed!');
    console.log('\nProducts researched:', result.products?.length || 0);
    
    if (result.products && result.products.length > 0) {
      const firstProduct = result.products[0];
      console.log('\nFirst product:', firstProduct.name);
      console.log('Features found:', firstProduct.features?.length || 0);
      
      if (firstProduct.features && firstProduct.features.length > 0) {
        console.log('\nSample features:');
        firstProduct.features.slice(0, 3).forEach(feature => {
          console.log(`- ${feature.name}: ${feature.description?.substring(0, 50)}...`);
        });
        console.log('✅ SUCCESS: Real research data obtained!');
      } else {
        console.log('❌ ISSUE: No features extracted from research');
      }
    } else {
      console.log('❌ ISSUE: No products researched');
    }
    
  } catch (error) {
    console.error('❌ Research failed:', error.message);
    
    if (error.message.includes('Perplexity')) {
      console.log('\n🔧 This looks like a Perplexity API issue');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      console.log('\n🔧 This looks like a network connectivity issue');
    }
  }
}

testResearcher();
import { config } from 'dotenv';
import { researcherAgent } from './server/agents/researcher.ts';

config();

console.log('=== DEBUGGING RESEARCHER OUTPUT STRUCTURE ===\n');

async function debugResearcherOutput() {
  try {
    console.log('🔬 Running minimal researcher test...');
    
    const researchRequest = {
      mode: 'comprehensive',
      products: ['Notion'],
      targetCustomer: 'Knowledge Workers',
      marketCategory: 'Note Taking Tools',
      featuresToResearch: ['User Interface'],
      analysisMode: 'quick'
    };
    
    const result = await researcherAgent.performResearch(researchRequest);
    
    console.log('\n📊 RESEARCHER OUTPUT STRUCTURE:');
    console.log('Main keys:', Object.keys(result));
    console.log('Has products:', !!result.products);
    console.log('Products is array:', Array.isArray(result.products));
    console.log('Products length:', result.products?.length || 0);
    
    if (result.products && result.products.length > 0) {
      const firstProduct = result.products[0];
      console.log('\nFirst product structure:');
      console.log('Product keys:', Object.keys(firstProduct));
      console.log('Product name:', firstProduct.name);
      console.log('Has features:', !!firstProduct.features);
      console.log('Features is array:', Array.isArray(firstProduct.features));
      console.log('Features length:', firstProduct.features?.length || 0);
      
      if (firstProduct.features && firstProduct.features.length > 0) {
        const firstFeature = firstProduct.features[0];
        console.log('\nFirst feature structure:');
        console.log('Feature keys:', Object.keys(firstFeature));
        console.log('Feature name:', firstFeature.name);
        console.log('Feature description length:', firstFeature.description?.length || 0);
        console.log('Has benefit:', !!firstFeature.benefit);
        console.log('Has implementationDetails:', !!firstFeature.implementationDetails);
      }
    }
    
    // Test JSON serialization/deserialization (like what happens in real flow)
    console.log('\n🔬 Testing JSON serialization...');
    const serialized = JSON.stringify(result);
    const deserialized = JSON.parse(serialized);
    
    console.log('After JSON round-trip:');
    console.log('Still has products:', !!deserialized.products);
    console.log('First product name after JSON:', deserialized.products?.[0]?.name);
    console.log('First product features count after JSON:', deserialized.products?.[0]?.features?.length || 0);
    
    return result;
    
  } catch (error) {
    console.error('❌ Researcher debug failed:', error.message);
    return { error: error.message };
  }
}

debugResearcherOutput().then(result => {
  if (result.error) {
    console.log('\n🔧 ERROR:', result.error);
  } else {
    console.log('\n✅ RESEARCHER OUTPUT CAPTURED');
    console.log('🔧 Now we can see exactly what structure the validator should expect');
  }
});
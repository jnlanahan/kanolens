#!/usr/bin/env npx tsx

import { researcherAgent } from './server/agents/researcher';

async function testResearcher() {
  console.log('🧪 Testing Researcher Agent\n');

  const testRequest = {
    mode: 'comprehensive' as const,
    products: ['Productboard', 'Trello', 'Monday.com'],
    targetCustomer: 'Product Managers',
    marketCategory: 'Product Management Tools',
    featuresToResearch: ['User Feedback Integration', 'Task Management', 'AI-Powered Insights', 'Team Collaboration', 'Integration with Other Tools']
  };

  try {
    console.log('🔍 Starting research...');
    const result = await researcherAgent.performResearch(testRequest);
    
    console.log('\n📊 Research Results:\n');
    
    if ('products' in result) {
      console.log(`Total Products Researched: ${result.products.length}`);
      console.log(`Feature Summary: ${result.featureSummary.totalUniqueFeatures} unique features found`);
      console.log(`Common Features: ${result.featureSummary.commonFeatures.length}`);
      console.log(`Differentiating Features: ${result.featureSummary.differentiatingFeatures.length}\n`);

      result.products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product.company})`);
        console.log(`   Target Market: ${product.targetMarket}`);
        console.log(`   Pricing: ${product.pricing}`);
        console.log(`   Market Position: ${product.marketPosition}`);
        console.log(`   Features (${product.features.length}):`);
        
        product.features.slice(0, 5).forEach((feature, fIndex) => {
          console.log(`     ${fIndex + 1}. ${feature.name}`);
          console.log(`        Description: ${feature.description.substring(0, 100)}...`);
          console.log(`        Benefit: ${feature.benefit.substring(0, 80)}...`);
          console.log(`        Implementation: ${feature.implementationDetails.substring(0, 60)}...`);
          if (feature.sources && feature.sources.length > 0) {
            console.log(`        Sources: ${feature.sources.slice(0, 2).join(', ')}`);
          }
        });
        
        if (product.features.length > 5) {
          console.log(`     ... and ${product.features.length - 5} more features`);
        }
        
        console.log(`   Unique Differentiators: ${product.uniqueDifferentiators.join(', ')}\n`);
      });

      console.log('\n🔍 Analysis of Research Quality:\n');
      
      // Analyze research quality issues
      const productsWithGenericFeatures = result.products.filter(product => 
        product.features.some(feature => 
          feature.description.includes('enhances user productivity') ||
          feature.description.includes('capability that enhances') ||
          feature.description === `${feature.name} functionality in ${product.name}`
        )
      );

      const productsWithFallbackData = result.products.filter(product =>
        product.features.some(feature => 
          feature.sources.includes('Platform analysis') ||
          feature.sources.includes('General market knowledge')
        )
      );

      console.log(`Products with generic feature descriptions: ${productsWithGenericFeatures.length}`);
      console.log(`Products using fallback data: ${productsWithFallbackData.length}`);

      if (productsWithGenericFeatures.length > 0) {
        console.log('\nProducts with generic descriptions:');
        productsWithGenericFeatures.forEach(product => {
          const genericFeatures = product.features.filter(feature =>
            feature.description.includes('enhances user productivity') ||
            feature.description.includes('capability that enhances')
          );
          console.log(`- ${product.name}: ${genericFeatures.length} generic features`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Research test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testResearcher();
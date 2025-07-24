import { config } from 'dotenv';
import { validatorAgent } from './server/agents/validator.ts';

config();

console.log('=== TESTING VALIDATOR ONLY ===\n');

async function testValidator() {
  try {
    // Create mock research data that matches what researcher produces
    const mockResearchData = {
      products: [
        {
          name: 'Notion',
          features: [
            {
              name: 'AI Writing Assistant',
              description: 'AI-powered writing suggestions and content generation',
              benefit: 'Helps users write better content faster',
              implementationDetails: 'Integrated AI that suggests edits and generates text',
              isInnovative: true,
              category: 'ai'
            },
            {
              name: 'Block-based Editor',
              description: 'Modular content blocks for flexible document creation',
              benefit: 'Allows users to create rich, structured documents',
              implementationDetails: 'Drag-and-drop interface with various block types'
            },
            {
              name: 'Database Integration',
              description: 'Spreadsheet-database hybrid for data management',
              benefit: 'Combines notes with structured data storage',
              implementationDetails: 'Relational database features within note-taking interface'
            }
          ]
        },
        {
          name: 'Obsidian',
          features: [
            {
              name: 'Graph View',
              description: 'Visual representation of note connections and relationships',
              benefit: 'Helps users understand knowledge connections',
              implementationDetails: 'Interactive network graph of linked notes'
            },
            {
              name: 'Markdown Support',
              description: 'Native markdown editing and rendering',
              benefit: 'Standardized formatting that works across platforms',
              implementationDetails: 'Real-time markdown parsing and preview'
            },
            {
              name: 'Plugin Ecosystem',
              description: 'Extensive community-driven plugin marketplace',
              benefit: 'Customizable functionality to fit any workflow',
              implementationDetails: 'JavaScript-based plugin architecture'
            }
          ]
        }
      ]
    };
    
    console.log('🔬 Testing validator with mock research data...');
    console.log('Mock data structure:', {
      hasProducts: !!mockResearchData.products,
      productCount: mockResearchData.products?.length,
      firstProductFeatures: mockResearchData.products?.[0]?.features?.length,
      secondProductFeatures: mockResearchData.products?.[1]?.features?.length
    });
    
    // validateResearch expects just the research data directly
    const result = await validatorAgent.validateResearch(mockResearchData);
    
    console.log('\n📊 VALIDATION RESULTS:');
    console.log(`Features processed: ${result.categorizedFeatures?.length || 0}`);
    
    if (result.categorizedFeatures && result.categorizedFeatures.length > 0) {
      console.log('\n✅ SUCCESS: Validator processed features!');
      
      result.categorizedFeatures.forEach((feature, i) => {
        console.log(`\nFeature ${i + 1}: ${feature.featureName}`);
        console.log(`  Category: ${feature.category}`);
        console.log(`  Has ratings: ${!!feature.productRatings}`);
        
        if (feature.productRatings) {
          Object.keys(feature.productRatings).forEach(product => {
            const rating = feature.productRatings[product];
            console.log(`  ${product}: ${rating.rating} - "${rating.justification?.substring(0, 60)}..."`);
          });
        }
      });
    } else {
      console.log('❌ FAILED: Validator processed no features');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Validator test failed:', error.message);
    return { error: error.message };
  }
}

testValidator().then(result => {
  if (result.error) {
    console.log('\n🔧 ERROR:', result.error);
  } else if (result.categorizedFeatures?.length > 0) {
    console.log('\n✅ VALIDATOR IS WORKING');
    console.log('🔧 NEXT: Test with real researcher data');
  } else {
    console.log('\n❌ VALIDATOR NOT WORKING');
    console.log('🔧 NEXT: Debug the extractUniqueFeatures method');
  }
});
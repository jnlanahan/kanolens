#!/usr/bin/env npx tsx

import { validatorAgent } from './server/agents/validator';

async function testValidator() {
  console.log('🧪 Testing Validator Agent with Sample Data\n');

  const testRequest = {
    researchData: {
      products: [
        {
          name: 'Productboard',
          features: [
            {
              name: 'User Feedback Integration',
              description: 'Comprehensive user feedback collection and analysis with sentiment analysis',
              benefit: 'Deep customer insights for product decisions',
              implementationDetails: 'Advanced ML-powered feedback processing with real-time dashboards'
            },
            {
              name: 'Task Management',
              description: 'Basic task tracking and assignment functionality',
              benefit: 'Organize work and track progress',
              implementationDetails: 'Standard task lists with basic notifications'
            },
            {
              name: 'AI-Powered Insights',
              description: 'Machine learning algorithms that analyze user behavior and predict needs',
              benefit: 'Predictive analytics for better product decisions',
              implementationDetails: 'Advanced AI models with pattern recognition'
            }
          ]
        },
        {
          name: 'Trello',
          features: [
            {
              name: 'Task Management',
              description: 'Simple kanban boards for task organization',
              benefit: 'Visual task organization',
              implementationDetails: 'Basic drag-and-drop interface with cards'
            },
            {
              name: 'Team Collaboration',
              description: 'Comment and mention system for team communication',
              benefit: 'Enhanced team coordination',
              implementationDetails: 'Basic commenting with @mentions'
            }
          ]
        },
        {
          name: 'Monday.com',
          features: [
            {
              name: 'Task Management',
              description: 'Advanced project management with automation workflows',
              benefit: 'Streamlined project execution',
              implementationDetails: 'Sophisticated automation engine with custom triggers'
            },
            {
              name: 'Team Collaboration',
              description: 'Comprehensive team communication tools',
              benefit: 'Enhanced team productivity',
              implementationDetails: 'Integrated chat, file sharing, and real-time updates'
            },
            {
              name: 'Integration with Other Tools',
              description: 'Extensive marketplace with 100+ native integrations',
              benefit: 'Seamless workflow connectivity',
              implementationDetails: 'Native API integrations with real-time data sync'
            }
          ]
        }
      ]
    },
    targetCustomer: 'Product Managers'
  };

  try {
    const result = await validatorAgent.categorizeFeatures(testRequest);
    
    console.log('📊 Validation Results:\n');
    console.log(`Total Features: ${result.summary.totalFeatures}`);
    console.log(`Must-Haves: ${result.summary.mustHaves}`);
    console.log(`Performance: ${result.summary.performance}`);
    console.log(`Delighters: ${result.summary.delighters}\n`);

    console.log('🔍 Feature Categorization Details:\n');
    
    result.categorizedFeatures.forEach((feature, index) => {
      console.log(`${index + 1}. ${feature.featureName}`);
      console.log(`   Category: ${feature.category}`);
      console.log(`   Rationale: ${feature.categoryRationale}`);
      console.log(`   Product Ratings:`);
      
      Object.entries(feature.productRatings).forEach(([product, rating]) => {
        console.log(`     ${product}: ${rating.rating} - ${rating.justification}`);
        if (rating.flags && rating.flags.length > 0) {
          console.log(`     Flags: ${rating.flags.join(', ')}`);
        }
      });
      console.log('');
    });

    // Analyze the "everything showing as yes" problem
    console.log('🚨 Analysis of Differentiation Issues:\n');
    
    const allYesFeatures = result.categorizedFeatures.filter(feature => 
      Object.values(feature.productRatings).every(rating => rating.rating === 'Yes')
    );
    
    const allSameRatingFeatures = result.categorizedFeatures.filter(feature => {
      const ratings = Object.values(feature.productRatings).map(r => r.rating);
      return new Set(ratings).size === 1;
    });

    console.log(`Features with all "Yes" ratings: ${allYesFeatures.length}`);
    console.log(`Features with identical ratings across products: ${allSameRatingFeatures.length}`);
    
    if (allSameRatingFeatures.length > 0) {
      console.log('\nFeatures lacking differentiation:');
      allSameRatingFeatures.forEach(feature => {
        const rating = Object.values(feature.productRatings)[0].rating;
        console.log(`- ${feature.featureName}: All products rated "${rating}"`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testValidator();
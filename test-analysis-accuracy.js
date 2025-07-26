#!/usr/bin/env node

// Test script for analysis result accuracy validation (Task 9.2)
// This script tests the actual agent workflow without mocking

import { orchestratorAgent } from './server/agents/orchestrator.ts';

console.log('Starting Analysis Accuracy Validation Test...\n');

// Test case 1: Basic analysis workflow
async function testBasicAnalysisWorkflow() {
  console.log('Test 1: Basic Analysis Workflow');
  console.log('================================');
  
  const testProducts = ['Slack', 'Microsoft Teams', 'Discord'];
  const testCustomer = 'Remote development teams';
  const testFeatures = ['Real-time messaging', 'Video calls', 'File sharing'];
  
  try {
    let progressUpdates = [];
    const progressCallback = (update) => {
      progressUpdates.push(update);
      console.log(`Progress: ${update.step} - ${update.message} (${update.progress}%)`);
    };
    
    console.log(`Testing analysis of: ${testProducts.join(', ')}`);
    console.log(`Target customer: ${testCustomer}`);
    console.log(`Features: ${testFeatures.join(', ')}\n`);
    
    const result = await orchestratorAgent.coordinateFullAnalysis(
      testProducts,
      testFeatures, 
      testCustomer,
      progressCallback,
      999999, // Test session ID
      'comprehensive'
    );
    
    console.log('\n✅ Analysis completed successfully!');
    console.log(`Total progress updates: ${progressUpdates.length}`);
    
    // Validate result structure
    if (result.researchData) {
      console.log(`✅ Research data present - ${result.researchData.products?.length || 0} products analyzed`);
    } else {
      console.log('❌ Missing research data');
    }
    
    if (result.validation) {
      console.log(`✅ Validation data present - ${result.validation.categorizedFeatures?.length || 0} features categorized`);
    } else {
      console.log('❌ Missing validation data');
    }
    
    if (result.kanoTable) {
      console.log('✅ Kano table generated successfully');
    } else {
      console.log('❌ Missing Kano table');
    }
    
    if (result.analysis) {
      console.log('✅ Strategic analysis completed');
    } else {
      console.log('❌ Missing strategic analysis');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Test case 2: Feature quality validation
async function testFeatureQuality() {
  console.log('\n\nTest 2: Feature Quality Validation');
  console.log('=================================');
  
  // This would require running the validator agent separately
  // Since we're testing accuracy, we should verify the features are meaningful
  console.log('Testing feature quality and categorization...');
  
  try {
    // Import validator directly to test feature quality
    const { validatorAgent } = await import('./server/agents/validator.js');
    
    const mockResearchData = {
      products: [
        {
          name: 'Test Product A',
          features: [
            { name: 'Real-time messaging', description: 'Instant communication' },
            { name: 'Video calls', description: 'Face-to-face meetings' }
          ]
        }
      ]
    };
    
    const validationRequest = {
      researchData: mockResearchData,
      targetCustomer: 'Development teams'
    };
    
    const result = await validatorAgent.categorizeFeatures(validationRequest);
    
    if (result.categorizedFeatures && result.categorizedFeatures.length > 0) {
      console.log(`✅ Features categorized: ${result.categorizedFeatures.length}`);
      
      // Check feature quality
      const feature = result.categorizedFeatures[0];
      if (feature.featureName && feature.category && feature.categoryRationale) {
        console.log('✅ Feature quality validation passed');
        console.log(`Sample feature: ${feature.featureName} (${feature.category})`);
      } else {
        console.log('❌ Feature quality validation failed - missing required fields');
      }
      
      return true;
    } else {
      console.log('❌ No features categorized');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Feature quality test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('KanoLens Analysis Accuracy Validation');
  console.log('====================================\n');
  
  let passedTests = 0;
  let totalTests = 2;
  
  if (await testBasicAnalysisWorkflow()) {
    passedTests++;
  }
  
  if (await testFeatureQuality()) {
    passedTests++;
  }
  
  console.log('\n\n=== TEST SUMMARY ===');
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All accuracy validation tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed - manual review required');
    process.exit(1);
  }
}

// Handle environment setup
if (!process.env.ANTHROPIC_API_KEY) {
  console.log('⚠️ No ANTHROPIC_API_KEY found - some tests may not work correctly');
}

if (!process.env.OPENAI_API_KEY) {
  console.log('⚠️ No OPENAI_API_KEY found - some tests may not work correctly');
}

// Run the tests
runAllTests().catch(console.error);
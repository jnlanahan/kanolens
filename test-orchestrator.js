// Quick test script to validate orchestrator intelligence with ambiguous inputs
import { orchestratorAgent } from './server/agents/orchestrator.js';

async function testOrchestratorIntelligence() {
  console.log('=== Testing Orchestrator Intelligence ===\n');
  
  // Test 1: Ambiguous input with "more", abbreviations, and categories
  console.log('Test 1: Ambiguous input interpretation');
  const testInput1 = {
    mode: 'suggestions',
    formData: {
      description: 'Small marketing team needs project management tools to coordinate campaigns and track deliverables',
      products: 'Monday.com, MS Teams, more collaboration tools',
      targetCustomers: 'marketing managers and coordinators',
      features: 'task tracking, team collaboration, reporting, more analytics'
    },
    sessionId: 999999 // Test session
  };

  try {
    const result1 = await orchestratorAgent.processSuggestions(testInput1);
    console.log('✅ Orchestrator Response:');
    console.log('Product Interpretation:', result1.productInterpretation);
    console.log('Suggested Products:', result1.suggestedProducts);
    console.log('Suggested Features:', result1.suggestedFeatures.slice(0, 5));
    
    // Judge the response
    console.log('\n🧑‍⚖️ JUDGE EVALUATION:');
    
    // Check if it handled "more collaboration tools" intelligently
    const handledMoreIntelligently = result1.productInterpretation.toLowerCase().includes('more') || 
                                   result1.suggestedProducts.length > 0;
    console.log('- Handled "more collaboration tools" intelligently:', handledMoreIntelligently ? '✅ PASS' : '❌ FAIL');
    
    // Check if it expanded "MS Teams" correctly
    const expandedMSTeams = result1.productInterpretation.toLowerCase().includes('microsoft teams') ||
                           result1.productInterpretation.toLowerCase().includes('teams');
    console.log('- Expanded "MS Teams" correctly:', expandedMSTeams ? '✅ PASS' : '❌ FAIL');
    
    // Check if suggestions are contextually relevant to marketing teams
    const marketingRelevant = result1.suggestedProducts.some(p => 
      p.reason.toLowerCase().includes('marketing') || 
      p.reason.toLowerCase().includes('campaign') ||
      p.reason.toLowerCase().includes('team')
    );
    console.log('- Suggestions relevant to marketing context:', marketingRelevant ? '✅ PASS' : '❌ FAIL');
    
    // Check if feature suggestions include analytics as requested
    const hasAnalytics = result1.suggestedFeatures.some(f => 
      f.toLowerCase().includes('analytics') || 
      f.toLowerCase().includes('reporting') ||
      f.toLowerCase().includes('metrics')
    );
    console.log('- Included analytics/reporting features:', hasAnalytics ? '✅ PASS' : '❌ FAIL');
    
  } catch (error) {
    console.error('❌ Test 1 Failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  
  // Test 2: Manual input validation with typos and categories
  console.log('\nTest 2: Manual input validation intelligence');
  const testInput2 = {
    mode: 'validation',
    product: 'Salesforc', // Intentional typo
    benefit: 'CRM features',
    existingData: {
      products: ['Monday.com', 'Microsoft Teams'],
      targetCustomer: 'marketing managers',
      description: 'Small marketing team coordination tools'
    },
    sessionId: 999999
  };

  try {
    const result2 = await orchestratorAgent.validateManualInput(testInput2);
    console.log('✅ Validation Response:');
    console.log('Valid:', result2.isValid);
    console.log('Corrected Product:', result2.correctedProduct);
    console.log('Message:', result2.message);
    console.log('Suggestions:', result2.suggestions);
    
    // Judge the response
    console.log('\n🧑‍⚖️ JUDGE EVALUATION:');
    
    // Check if it corrected the typo intelligently
    const correctedTypo = result2.correctedProduct?.toLowerCase().includes('salesforce');
    console.log('- Corrected "Salesforc" to "Salesforce":', correctedTypo ? '✅ PASS' : '❌ FAIL');
    
    // Check if reasoning shows intelligent interpretation
    const intelligentReasoning = result2.message.length > 20 && 
                               result2.message.toLowerCase().includes('correct');
    console.log('- Provided intelligent reasoning:', intelligentReasoning ? '✅ PASS' : '❌ FAIL');
    
  } catch (error) {
    console.error('❌ Test 2 Failed:', error.message);
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testOrchestratorIntelligence().catch(console.error);
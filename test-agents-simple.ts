#!/usr/bin/env tsx

// Simple test to verify agents are working
import 'dotenv/config';

console.log('Testing agent configuration...\n');

// Test 1: Check API Keys
console.log('1. Checking API Keys:');
console.log('   - OpenAI:', process.env.OPENAI_API_KEY ? '✓ Present' : '✗ Missing');
console.log('   - Anthropic:', process.env.ANTHROPIC_API_KEY ? '✓ Present' : '✗ Missing');
console.log('   - Perplexity:', process.env.PERPLEXITY_API_KEY ? '✓ Present' : '✗ Missing');

// Test 2: Test Orchestrator Agent directly
console.log('\n2. Testing Orchestrator Agent:');
try {
  const { orchestratorAgent } = await import('./server/agents/orchestrator');
  console.log('   - Agent imported successfully ✓');
  
  // Test a simple coordination without full analysis
  const testResult = await orchestratorAgent.coordinateFullAnalysis(
    ['Test Product A', 'Test Product B'],
    [{ name: 'Feature 1', description: 'Test feature' }],
    'Test Customers',
    (update) => {
      console.log(`   - Progress: ${update.step} - ${update.message} (${update.progress}%)`);
    },
    999999 // Test session ID
  );
  
  console.log('   - Analysis completed successfully ✓');
  console.log('   - Result has products:', !!testResult.products);
  console.log('   - Result has features:', !!testResult.features);
  console.log('   - Result has tableData:', !!testResult.tableData);
} catch (error) {
  console.error('   - Error:', error.message);
}

// Test 3: Test Individual Agents
console.log('\n3. Testing Individual Agents:');

// Test Researcher
try {
  const { researcherAgent } = await import('./server/agents/researcher');
  console.log('   - Researcher Agent imported ✓');
} catch (error) {
  console.error('   - Researcher Agent error:', error.message);
}

// Test Validator
try {
  const { validatorAgent } = await import('./server/agents/validator');
  console.log('   - Validator Agent imported ✓');
} catch (error) {
  console.error('   - Validator Agent error:', error.message);
}

// Test Analyst
try {
  const { analystAgent } = await import('./server/agents/analyst');
  console.log('   - Analyst Agent imported ✓');
} catch (error) {
  console.error('   - Analyst Agent error:', error.message);
}

console.log('\nTest complete.');
process.exit(0);
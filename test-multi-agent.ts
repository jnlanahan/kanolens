#!/usr/bin/env tsx

import { orchestratorAgent } from './server/agents/orchestrator';
import { researcherAgent } from './server/agents/researcher';
import { validatorAgent } from './server/agents/validator';
import { analystAgent } from './server/agents/analyst';
import { evaluatorAgent } from './server/agents/evaluator';

async function testMultiAgentWorkflow() {
  console.log('\n🚀 Testing Multi-Agent Workflow\n');

  const products = ['GitHub Copilot', 'Cursor', 'Tabnine'];
  const features = ['Code completion', 'Error detection', 'Refactoring suggestions'];
  const targetCustomer = 'Software developers';
  const sessionId = 999; // Test session ID

  try {
    // Test 1: Orchestrator Agent - Suggestions
    console.log('1️⃣ Testing Orchestrator Agent - Suggestions...');
    const suggestionsResult = await orchestratorAgent.processSuggestions({
      mode: 'suggestions',
      formData: {
        description: 'AI code completion tools',
        products: products.join(', '),
        targetCustomers: targetCustomer,
        features: features.join(', ')
      },
      sessionId
    });
    console.log('✅ Suggestions generated:', suggestionsResult);

    // Test 2: Full Multi-Agent Analysis
    console.log('\n2️⃣ Testing Full Multi-Agent Analysis...');
    
    const progressCallback = (update: any) => {
      console.log(`📊 Progress: ${update.step} - ${update.message} (${update.progress}%)`);
    };

    const analysisResult = await orchestratorAgent.coordinateFullAnalysis(
      products,
      features,
      targetCustomer,
      progressCallback,
      sessionId
    );

    console.log('\n✅ Analysis Complete!');
    console.log('Table Data:', JSON.stringify(analysisResult.tableData, null, 2));
    console.log('Strategic Analysis:', JSON.stringify(analysisResult.strategicAnalysis, null, 2));

    // Test 3: Individual Agent Tests
    console.log('\n3️⃣ Testing Individual Agents...');

    // Test Researcher
    console.log('\n🔍 Testing Researcher Agent...');
    const researchResult = await researcherAgent.research({
      products,
      features,
      targetCustomer,
      sessionId
    });
    console.log('Research results:', researchResult.productFeatures.length, 'features found');

    // Test Validator
    console.log('\n✅ Testing Validator Agent...');
    const validationResult = await validatorAgent.validateAndCategorize({
      products,
      features: researchResult.productFeatures,
      targetCustomer,
      sessionId
    });
    console.log('Validation complete:', validationResult.features.length, 'features categorized');

    // Test Analyst
    console.log('\n📈 Testing Analyst Agent...');
    const analysisInput = {
      kanoTable: {
        products: validationResult.products,
        features: validationResult.features,
        ratings: validationResult.ratings,
        sources: validationResult.sources
      },
      targetCustomer
    };
    const strategicAnalysis = await analystAgent.analyzeKanoTable(analysisInput);
    console.log('Strategic analysis complete');

    // Test Evaluator
    console.log('\n🎯 Testing Evaluator Agent...');
    const evaluationResult = await evaluatorAgent.evaluateAgent({
      agentName: 'orchestrator',
      input: { products, features, targetCustomer },
      output: suggestionsResult,
      context: {
        sessionId,
        targetCustomer,
        products,
        executionTime: 1500
      }
    });
    console.log('Evaluation score:', evaluationResult.score);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testMultiAgentWorkflow();
import { ResearcherAgent } from './server/agents/researcher';
import { ValidatorAgent } from './server/agents/validator';
import { EvaluatorAgent } from './server/agents/evaluator';
import { OrchestratorAgent } from './server/agents/orchestrator';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('=== AGENT WORKFLOW TEST ===');
console.log('Testing each agent step by step\n');

// Test data
const testRequest = {
  mode: 'comprehensive' as const,
  products: ['Asana', 'Monday.com'],
  targetCustomer: 'small marketing teams',
  marketCategory: 'project management software',
  featuresToResearch: ['task automation', 'team collaboration', 'reporting']
};

async function testResearcher() {
  console.log('\n=== STEP 1: RESEARCHER AGENT ===');
  console.log('Testing with request:', JSON.stringify(testRequest, null, 2));
  
  const researcher = new ResearcherAgent();
  
  try {
    console.log('\nStarting research...');
    const startTime = Date.now();
    
    const researchResults = await researcher.performResearch(testRequest);
    
    const endTime = Date.now();
    console.log(`\nResearch completed in ${(endTime - startTime) / 1000}s`);
    
    console.log('\n--- RESEARCH RESULTS ---');
    console.log(JSON.stringify(researchResults, null, 2));
    
    return researchResults;
  } catch (error) {
    console.error('\nRESEARCHER ERROR:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function testValidator(researchData: any) {
  console.log('\n\n=== STEP 2: VALIDATOR AGENT ===');
  console.log('Validating research data...');
  
  const validator = new ValidatorAgent();
  
  try {
    const startTime = Date.now();
    
    const validatedData = await validator.validateResearch(researchData);
    
    const endTime = Date.now();
    console.log(`\nValidation completed in ${(endTime - startTime) / 1000}s`);
    
    console.log('\n--- VALIDATION RESULTS ---');
    console.log(JSON.stringify(validatedData, null, 2));
    
    return validatedData;
  } catch (error) {
    console.error('\nVALIDATOR ERROR:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function testEvaluator(validatedData: any) {
  console.log('\n\n=== STEP 3: EVALUATOR AGENT ===');
  console.log('Evaluating features for Kano analysis...');
  
  const evaluator = new EvaluatorAgent();
  
  try {
    const startTime = Date.now();
    
    const kanoAnalysis = await evaluator.performKanoAnalysis(validatedData);
    
    const endTime = Date.now();
    console.log(`\nEvaluation completed in ${(endTime - startTime) / 1000}s`);
    
    console.log('\n--- KANO ANALYSIS RESULTS ---');
    console.log(JSON.stringify(kanoAnalysis, null, 2));
    
    return kanoAnalysis;
  } catch (error) {
    console.error('\nEVALUATOR ERROR:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function testFullWorkflow() {
  console.log('\n\n=== FULL WORKFLOW TEST (ORCHESTRATOR) ===');
  
  const orchestrator = new OrchestratorAgent();
  
  try {
    const startTime = Date.now();
    
    const finalResults = await orchestrator.performAnalysis(testRequest);
    
    const endTime = Date.now();
    console.log(`\nFull workflow completed in ${(endTime - startTime) / 1000}s`);
    
    console.log('\n--- FINAL ORCHESTRATED RESULTS ---');
    console.log(JSON.stringify(finalResults, null, 2));
    
    return finalResults;
  } catch (error) {
    console.error('\nORCHESTRATOR ERROR:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function runStepByStepTest() {
  try {
    // Test Researcher
    const researchData = await testResearcher();
    
    // Only continue if research succeeded
    if (researchData && researchData.products) {
      // Test Validator
      const validatedData = await testValidator(researchData);
      
      // Only continue if validation succeeded
      if (validatedData && validatedData.products) {
        // Test Evaluator
        const kanoAnalysis = await testEvaluator(validatedData);
        
        console.log('\n\n=== INDIVIDUAL TESTS COMPLETE ===');
        console.log('Now testing full orchestrated workflow...');
        
        // Test full workflow
        await testFullWorkflow();
      }
    }
    
  } catch (error) {
    console.error('\n\n=== TEST FAILED ===');
    console.error('Error:', error.message);
  }
}

// Run the test
console.log('Starting agent workflow test...');
console.log('Perplexity API Key:', process.env.PERPLEXITY_API_KEY ? 'Configured' : 'NOT CONFIGURED');

runStepByStepTest().then(() => {
  console.log('\n\n=== ALL TESTS COMPLETE ===');
  process.exit(0);
}).catch(error => {
  console.error('\n\n=== FATAL ERROR ===');
  console.error(error);
  process.exit(1);
});
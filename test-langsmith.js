import dotenv from 'dotenv';
import { Client, RunTree } from 'langsmith';

// Load environment variables FIRST
dotenv.config();

async function testLangSmith() {
  console.log('🧪 Testing LangSmith Integration...');
  console.log('🔍 Environment Check:');
  console.log('  - LANGCHAIN_API_KEY present:', !!process.env.LANGCHAIN_API_KEY);
  console.log('  - LANGCHAIN_API_KEY length:', process.env.LANGCHAIN_API_KEY?.length || 0);
  console.log('  - LANGCHAIN_PROJECT:', process.env.LANGCHAIN_PROJECT);
  console.log('  - LANGCHAIN_ENDPOINT:', process.env.LANGCHAIN_ENDPOINT);
  // Test direct LangSmith client creation
  if (!process.env.LANGCHAIN_API_KEY) {
    console.log('❌ LangSmith is not configured (API key missing)');
    console.log('💡 Set LANGCHAIN_API_KEY in your .env file to enable LangSmith');
    return;
  }

  console.log('✅ LANGCHAIN_API_KEY found, creating LangSmith client...');
  
  const client = new Client({
    apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
    apiKey: process.env.LANGCHAIN_API_KEY,
  });
  
  console.log('✅ LangSmith client created successfully!');

  try {
    console.log('🚀 Creating test workflow trace...');
    
    // Create a test workflow trace directly
    const testTrace = new RunTree({
      name: "langsmith-integration-test",
      project_name: process.env.LANGCHAIN_PROJECT || "kanolens-multi-agent",
      inputs: {
        products: ['ChatGPT', 'Claude', 'Gemini'],
        features: ['Text Generation', 'Code Writing', 'Image Analysis'],
        targetCustomer: 'AI Developers',
        testMode: true,
        timestamp: new Date().toISOString()
      },
      run_type: "chain",
      extra: {
        metadata: {
          testType: "manual-integration-test",
          component: "langsmith-direct-test"
        }
      }
    });

    await testTrace.postRun();

    console.log('✅ Workflow trace created successfully!');
    console.log('📍 Trace ID:', testTrace.id);

    // Create a child agent trace
    console.log('🤖 Creating test agent trace...');
    const agentTrace = new RunTree({
      name: "test-researcher-agent",
      project_name: process.env.LANGCHAIN_PROJECT || "kanolens-multi-agent",
      inputs: { 
        query: 'Test LangSmith integration for KanoLens',
        mode: 'verification' 
      },
      outputs: { 
        result: 'LangSmith integration is working correctly!',
        status: 'success',
        timestamp: new Date().toISOString()
      },
      run_type: "llm",
      start_time: Date.now() - 2000,
      end_time: Date.now(),
      parent_run: testTrace,
      extra: {
        metadata: { 
          testType: 'integration-verification',
          component: 'langsmith-direct-test',
          agentName: 'test-researcher'
        }
      }
    });

    await agentTrace.postRun();
    console.log('✅ Agent trace created successfully!');

    // Complete the workflow with final results
    console.log('🏁 Completing workflow trace...');
    testTrace.end_time = Date.now();
    testTrace.outputs = {
      testResults: {
        status: 'passed',
        message: 'LangSmith integration verified successfully',
        components: ['workflow-trace', 'agent-trace']
      },
      metrics: {
        accuracy: 1.0,
        completeness: 1.0,
        latency: 2000,
        testScore: 100
      }
    };

    await testTrace.patchRun();
    console.log('✅ Workflow trace completed!');

    console.log('\n🎉 LangSmith Integration Test PASSED!');
    console.log('📊 Project:', process.env.LANGCHAIN_PROJECT || 'kanolens-multi-agent');
    console.log('🌐 Dashboard: https://smith.langchain.com/');
    console.log('\nYou should see the test traces in your LangSmith dashboard under the project:', process.env.LANGCHAIN_PROJECT || 'kanolens-multi-agent');

  } catch (error) {
    console.error('❌ LangSmith Integration Test FAILED:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testLangSmith().then(() => {
  console.log('\n✨ Test completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
// Simple Perplexity API test script
import dotenv from 'dotenv';
dotenv.config();

async function testPerplexity() {
  console.log('🔍 Testing Perplexity API directly...');
  console.log('Environment check:');
  console.log('- PERPLEXITY_API_KEY:', !!process.env.PERPLEXITY_API_KEY);
  console.log('- Key prefix:', process.env.PERPLEXITY_API_KEY?.substring(0, 12) + '...');
  
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error('❌ PERPLEXITY_API_KEY not found in environment');
    return;
  }

  try {
    const startTime = Date.now();
    console.log('\n📡 Making API request...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful research assistant. Provide detailed, factual information about software products.'
          },
          {
            role: 'user',
            content: 'What are the key features of Notion that make it popular among knowledge workers? List the top 5 features with brief explanations.'
          }
        ],
        max_tokens: 500,
        temperature: 0.2
      })
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Request completed in ${duration}ms`);
    console.log('📊 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', response.status);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      return;
    }

    const data = await response.json();
    
    console.log('\n✅ SUCCESS! Perplexity API is working');
    console.log('📈 Response metadata:');
    console.log('- Content length:', data.choices?.[0]?.message?.content?.length || 0, 'characters');
    console.log('- Citations:', data.citations?.length || 0);
    console.log('- Search results:', data.search_results?.length || 0);
    console.log('- Model used:', data.model);
    
    console.log('\n📝 Response content:');
    console.log('=' .repeat(50));
    console.log(data.choices?.[0]?.message?.content || 'No content received');
    console.log('=' .repeat(50));
    
    if (data.citations && data.citations.length > 0) {
      console.log('\n📚 Sources:');
      data.citations.forEach((citation, index) => {
        console.log(`${index + 1}. ${citation}`);
      });
    }

    console.log('\n🎯 Full API Response (for debugging):');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error testing Perplexity API:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testPerplexity().then(() => {
  console.log('\n✨ Test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
});
import { config } from 'dotenv';

// Load environment variables
config();

console.log('=== DETAILED PERPLEXITY RESULTS TEST ===\n');

async function searchWithPerplexity(query: string): Promise<{content: string, sources: string[]}> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SEARCHING FOR: ${query}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a competitive research analyst. Provide detailed, factual information about products, features, and market positioning. Focus on current information and cite sources.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 1000,
        temperature: 0.2,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const sources = data.citations || [];
    
    console.log('FULL PERPLEXITY RESPONSE:');
    console.log('-'.repeat(80));
    console.log(content);
    console.log('-'.repeat(80));
    console.log('\nSOURCES:', sources);
    console.log('\nCONTENT LENGTH:', content.length, 'characters');
    
    return { content, sources };
  } catch (error) {
    console.error(`Search failed:`, error);
    throw error;
  }
}

async function runDetailedTest() {
  // Test 1: Feature-specific search for Asana
  await searchWithPerplexity(
    'Asana AI features automation smart features 2024 2025 machine learning capabilities'
  );
  
  // Wait to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Comprehensive competitor analysis
  await searchWithPerplexity(
    'project management software comparison Asana Monday.com ClickUp unique features delighters innovative capabilities 2024'
  );
}

runDetailedTest().then(() => {
  console.log('\n\n=== TEST COMPLETE ===');
  process.exit(0);
}).catch(error => {
  console.error('\n\n=== ERROR ===');
  console.error(error);
  process.exit(1);
});
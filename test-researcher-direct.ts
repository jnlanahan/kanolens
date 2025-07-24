import { config } from 'dotenv';

// Load environment variables
config();

console.log('=== DIRECT PERPLEXITY RESEARCH TEST ===');
console.log('Perplexity API Key:', process.env.PERPLEXITY_API_KEY ? 'Configured' : 'NOT CONFIGURED');

// Direct Perplexity search function (copied from researcher.ts to avoid imports)
async function searchWithPerplexity(query: string): Promise<{content: string, sources: string[]}> {
  console.log(`\n[Perplexity] Searching for: ${query}`);
  
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

    console.log(`[Perplexity] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Perplexity] API error response:`, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Perplexity] Response received:`, JSON.stringify(data, null, 2));
    
    const content = data.choices[0]?.message?.content || '';
    const sources = data.citations || [];
    
    console.log(`[Perplexity] Search completed: ${content.length} chars, ${sources.length} sources`);
    return { content, sources };
  } catch (error) {
    console.error(`[Perplexity] Search failed:`, error);
    throw error;
  }
}

// Test queries that would be used by the researcher
async function runResearchTests() {
  const testQueries = [
    // Competitor suggestions query
    'competitive products similar to Asana, Monday.com for small marketing teams project management software 2024 alternatives competitors market analysis',
    
    // Product overview queries
    'Asana product overview features pricing plans 2024 2025',
    'Asana reviews Reddit discussions user complaints pros cons',
    'Asana vs competitors comparison small marketing teams market analysis',
    
    // Feature-specific queries
    'Asana task automation capabilities features review 2024',
    'how does Asana team collaboration work user experience',
    'Asana reporting vs competitors comparison strengths weaknesses'
  ];

  console.log(`\nWill test ${testQueries.length} research queries\n`);

  for (let i = 0; i < testQueries.length; i++) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST ${i + 1} of ${testQueries.length}`);
    console.log(`${'='.repeat(80)}`);
    
    try {
      const result = await searchWithPerplexity(testQueries[i]);
      
      console.log('\n--- SEARCH RESULTS ---');
      console.log('Content length:', result.content.length);
      console.log('Sources found:', result.sources.length);
      console.log('\nFirst 500 chars of content:');
      console.log(result.content.substring(0, 500) + '...');
      
      if (result.sources.length > 0) {
        console.log('\nSources:', result.sources);
      }
      
      // Add delay to avoid rate limiting
      if (i < testQueries.length - 1) {
        console.log('\nWaiting 2 seconds before next query...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error('\nERROR in test query:', error.message);
    }
  }
}

// Run the tests
runResearchTests().then(() => {
  console.log('\n\n=== ALL TESTS COMPLETE ===');
  process.exit(0);
}).catch(error => {
  console.error('\n\n=== FATAL ERROR ===');
  console.error(error);
  process.exit(1);
});
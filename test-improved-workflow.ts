import { config } from 'dotenv';

config();

console.log('=== TESTING IMPROVED WORKFLOW ===\n');

async function searchWithPerplexity(query: string): Promise<{content: string, sources: string[]}> {
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

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const sources = data.citations || [];
    
    return { content, sources };
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}

// Test the improved research workflow
async function testImprovedWorkflow() {
  console.log('1. Searching for AI features in project management tools...\n');
  
  const aiSearch = await searchWithPerplexity(
    'AI features machine learning project management software Asana Monday ClickUp 2024 2025 smart automation intelligent capabilities'
  );
  
  console.log('AI SEARCH RESULTS:');
  console.log('-'.repeat(50));
  console.log(aiSearch.content);
  console.log('\nSOURCES:', aiSearch.sources);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n\n2. Searching for unique innovative features...\n');
  
  const innovationSearch = await searchWithPerplexity(
    'unique innovative features project management software 2024 breakthrough capabilities delighters competitive advantages whiteboard mind maps AI assistants'
  );
  
  console.log('INNOVATION SEARCH RESULTS:');
  console.log('-'.repeat(50));
  console.log(innovationSearch.content);
  console.log('\nSOURCES:', innovationSearch.sources);
  
  // Extract features from the content
  console.log('\n\n3. FEATURE EXTRACTION DEMO:');
  console.log('='.repeat(60));
  
  const combinedContent = `${aiSearch.content}\n\n${innovationSearch.content}`;
  
  // Look for AI features
  console.log('\nAI FEATURES FOUND:');
  const aiPattern = /(?:AI|artificial intelligence|machine learning|smart|intelligent)\s+(?:features?|capabilities?|tools?|workflows?|assistant|teammate)[^.]*\./gi;
  const aiMatches = combinedContent.matchAll(aiPattern);
  
  for (const match of aiMatches) {
    console.log(`- ${match[0].trim()}`);
  }
  
  // Look for bullet-pointed features
  console.log('\nBULLET-POINTED FEATURES:');
  const bulletPattern = /(?:^|\n)\s*[-•*]\s*\*?\*?([^:]+)\*?\*?:\s*([^.\n]+)/gm;
  const bulletMatches = combinedContent.matchAll(bulletPattern);
  
  let bulletCount = 0;
  for (const match of bulletMatches) {
    if (bulletCount < 10) { // Limit output
      const featureName = match[1].trim().replace(/^\*+|\*+$/g, '');
      const description = match[2].trim();
      console.log(`- ${featureName}: ${description}`);
      bulletCount++;
    }
  }
  
  // Look for innovation keywords
  console.log('\nINNOVATIVE FEATURES (with innovation keywords):');
  const innovativeKeywords = ['unique', 'innovative', 'exclusive', 'breakthrough', 'cutting-edge', 'first', 'revolutionary'];
  const sentences = combinedContent.split(/[.!?]+/);
  
  let innovativeCount = 0;
  for (const sentence of sentences) {
    if (innovativeCount < 5) {
      const hasInnovativeKeyword = innovativeKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      );
      
      if (hasInnovativeKeyword && sentence.length > 20) {
        console.log(`- ${sentence.trim()}`);
        innovativeCount++;
      }
    }
  }
  
  console.log('\n\n4. FEATURE CATEGORIZATION PREVIEW:');
  console.log('='.repeat(60));
  
  // Categorize the features we found
  const features = [];
  
  // AI features would be categorized as delighters
  for (const match of combinedContent.matchAll(aiPattern)) {
    const text = match[0].trim();
    if (text.length > 10) {
      features.push({
        name: text.substring(0, 30) + '...',
        category: 'DELIGHTER',
        reason: 'AI/ML capability - creates surprise and delight'
      });
      if (features.filter(f => f.category === 'DELIGHTER').length >= 3) break;
    }
  }
  
  // Standard features would be must-haves or performance
  const standardFeatures = [
    { name: 'Task Management', category: 'MUST-HAVE', reason: 'Basic expectation' },
    { name: 'Team Collaboration', category: 'MUST-HAVE', reason: 'Basic expectation' },
    { name: 'Reporting & Analytics', category: 'PERFORMANCE', reason: 'More/better reporting = higher satisfaction' },
    { name: 'Integrations', category: 'PERFORMANCE', reason: 'More integrations = higher satisfaction' }
  ];
  
  features.push(...standardFeatures);
  
  // Display categorization
  const categories = ['MUST-HAVE', 'PERFORMANCE', 'DELIGHTER'];
  
  categories.forEach(category => {
    const categoryFeatures = features.filter(f => f.category === category);
    if (categoryFeatures.length > 0) {
      console.log(`\n${category} FEATURES (${categoryFeatures.length}):`);
      categoryFeatures.forEach(f => {
        console.log(`  • ${f.name}`);
        console.log(`    Reason: ${f.reason}`);
      });
    }
  });
}

testImprovedWorkflow().then(() => {
  console.log('\n\n=== IMPROVED WORKFLOW TEST COMPLETE ===');
  console.log('The workflow now:');
  console.log('✓ Extracts AI features as potential delighters');
  console.log('✓ Finds bullet-pointed features with descriptions');
  console.log('✓ Identifies innovative capabilities');
  console.log('✓ Categorizes features using Kano Model principles');
  process.exit(0);
}).catch(error => {
  console.error('\n\n=== ERROR ===');
  console.error(error);
  process.exit(1);
});
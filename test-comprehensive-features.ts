import { config } from 'dotenv';

config();

console.log('=== TESTING COMPREHENSIVE FEATURE EXTRACTION ===\n');

// Sample Perplexity content with diverse feature types
const sampleContent = `
Asana is a comprehensive project management platform that offers:

**Key Features:**
- Task Management: Assign, track, and manage tasks across projects
- Timeline View: Gantt chart functionality for project planning
- Dashboard: Real-time project insights and analytics
- Team Collaboration: Comments, @mentions, and file sharing
- Custom Fields: Tailor projects to your workflow needs
- Mobile App: Full iOS and Android functionality
- Integrations: 200+ third-party app connections
- Guest Access: Invite external stakeholders
- Time Tracking: Built-in timesheet capabilities
- Templates: Pre-built project templates
- Security Features: Enterprise-grade security and compliance

**AI Capabilities (2024-2025):**
- Smart Summaries: AI-generated project status updates
- AI Teammate: Automated task assignment and workflow orchestration
- Smart Goals: AI-assisted goal setting and tracking

**Advanced Features:**
Asana provides milestone tracking, task dependencies, portfolio management, and custom workflows. The platform includes automated rules, resource allocation, and budget tracking capabilities.

**Collaboration Tools:**
Real-time editing, team inbox, notifications, and document sharing make team coordination seamless.
`;

// Test the improved extraction
function testComprehensiveExtraction() {
  console.log('Testing comprehensive feature extraction...\n');
  
  const extractedFeatures = extractAllFeatureTypes(sampleContent, 'Asana');
  
  console.log(`Found ${extractedFeatures.length} total features:\n`);
  
  // Group by type
  const byType = extractedFeatures.reduce((acc: any, feature: any) => {
    const type = feature.category || 'standard';
    if (!acc[type]) acc[type] = [];
    acc[type].push(feature);
    return acc;
  }, {});
  
  Object.entries(byType).forEach(([type, features]: [string, any]) => {
    console.log(`${type.toUpperCase()} FEATURES (${features.length}):`);
    features.forEach((f: any) => {
      const innovative = f.isInnovative ? ' 🤖' : '';
      console.log(`• ${f.name}${innovative}`);
      console.log(`  Description: ${f.description.substring(0, 80)}...`);
    });
    console.log();
  });
  
  // Show distribution
  const aiCount = extractedFeatures.filter((f: any) => f.isInnovative).length;
  const standardCount = extractedFeatures.length - aiCount;
  
  console.log('FEATURE DISTRIBUTION:');
  console.log(`• AI/Innovative Features: ${aiCount} (${Math.round(aiCount/extractedFeatures.length*100)}%)`);
  console.log(`• Standard Features: ${standardCount} (${Math.round(standardCount/extractedFeatures.length*100)}%)`);
  
  return extractedFeatures;
}

function extractAllFeatureTypes(content: string, productName: string): any[] {
  const features: any[] = [];
  const extractedNames = new Set<string>();
  
  console.log('Step 1: AI Features...');
  // AI features
  const aiPattern = /(?:AI|artificial intelligence|smart|intelligent)\s+(?:features?|capabilities?|teammate|summaries|goals)/gi;
  const aiMatches = content.matchAll(aiPattern);
  
  for (const match of aiMatches) {
    const featureName = cleanFeatureName(match[0]);
    if (!extractedNames.has(featureName.toLowerCase())) {
      extractedNames.add(featureName.toLowerCase());
      features.push({
        name: featureName,
        description: extractSentenceContaining(content, featureName),
        category: 'ai',
        isInnovative: true
      });
    }
  }
  console.log(`Found ${features.filter(f => f.category === 'ai').length} AI features`);
  
  console.log('Step 2: Bullet Point Features...');
  // Bullet points and structured lists
  const bulletPatterns = [
    /(?:^|\n)\s*[-•*]\s*\*?\*?([^:]+)\*?\*?:\s*([^.\n]+)/gm,
    /\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm
  ];
  
  let bulletCount = 0;
  for (const pattern of bulletPatterns) {
    const matches = content.matchAll(pattern);
    
    for (const match of matches) {
      const featureName = cleanFeatureName(match[1]);
      const description = match[2] ? match[2].trim() : `${featureName} functionality`;
      
      if (!extractedNames.has(featureName.toLowerCase()) && isValidFeatureName(featureName)) {
        extractedNames.add(featureName.toLowerCase());
        features.push({
          name: featureName,
          description: description,
          category: categorizeFeature(featureName, description),
          isInnovative: isInnovativeFeature(featureName, description)
        });
        bulletCount++;
      }
    }
  }
  console.log(`Found ${bulletCount} bullet point features`);
  
  console.log('Step 3: Standard Features...');
  // Standard feature patterns
  const standardFeatures = [
    { pattern: /task\s+(?:management|tracking)/gi, name: 'Task Management' },
    { pattern: /team\s+collaboration/gi, name: 'Team Collaboration' },
    { pattern: /dashboard/gi, name: 'Dashboard' },
    { pattern: /timeline\s+view/gi, name: 'Timeline View' },
    { pattern: /mobile\s+app/gi, name: 'Mobile App' },
    { pattern: /integrations?/gi, name: 'Integrations' },
    { pattern: /security\s+features/gi, name: 'Security Features' },
    { pattern: /custom\s+fields/gi, name: 'Custom Fields' },
    { pattern: /time\s+tracking/gi, name: 'Time Tracking' },
    { pattern: /templates?/gi, name: 'Templates' },
    { pattern: /milestones?/gi, name: 'Milestones' },
    { pattern: /dependencies/gi, name: 'Task Dependencies' },
    { pattern: /portfolio\s+management/gi, name: 'Portfolio Management' },
    { pattern: /budget\s+tracking/gi, name: 'Budget Tracking' },
    { pattern: /resource\s+allocation/gi, name: 'Resource Allocation' }
  ];
  
  let standardCount = 0;
  for (const { pattern, name } of standardFeatures) {
    if (pattern.test(content) && !extractedNames.has(name.toLowerCase())) {
      extractedNames.add(name.toLowerCase());
      features.push({
        name: name,
        description: findFeatureDescription(content, name, productName),
        category: 'standard',
        isInnovative: false
      });
      standardCount++;
    }
  }
  console.log(`Found ${standardCount} standard features`);
  
  return features;
}

function cleanFeatureName(name: string): string {
  return name.trim()
    .replace(/^\*+|\*+$/g, '')
    .replace(/^[-•]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidFeatureName(name: string): boolean {
  return name && name.length >= 3 && name.length <= 50 &&
    !/^(feature|capability|tool|yes|no)$/i.test(name);
}

function categorizeFeature(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  if (/ai|smart|intelligent/.test(text)) return 'ai';
  if (/dashboard|chart|view/.test(text)) return 'visualization';
  if (/collaborat|team/.test(text)) return 'collaboration';
  return 'standard';
}

function isInnovativeFeature(name: string, description: string): boolean {
  const text = `${name} ${description}`.toLowerCase();
  return /ai|smart|intelligent|automated|innovative/.test(text);
}

function extractSentenceContaining(text: string, term: string): string {
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(term.toLowerCase())) {
      return sentence.trim();
    }
  }
  return `${term} functionality`;
}

function findFeatureDescription(content: string, featureName: string, productName: string): string {
  const sentences = content.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(featureName.toLowerCase())) {
      return sentence.trim();
    }
  }
  
  return `${featureName} capabilities in ${productName}`;
}

// Run the test
testComprehensiveExtraction();
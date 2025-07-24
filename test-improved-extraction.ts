import { config } from 'dotenv';
import { ImprovedResearcherAgent } from './server/agents/researcher-improved';

// Load environment variables
config();

console.log('=== IMPROVED FEATURE EXTRACTION TEST ===\n');

// Simulate Perplexity response for testing
const samplePerplexityResponse = `
Asana has significantly enhanced its AI capabilities in both 2024 and 2025, focusing on automation, smart features, and machine learning to improve project management efficiency. Here's a detailed overview of these advancements:

## Asana AI Features in 2024

- **Asana AI Teammate**: This feature allows companies to create customized "bots" that can automate tasks, orchestrate complex workflows, and answer employee questions throughout projects. It uses stored information about past projects and team relationships to assign work to people with the right skills. It can also proactively reach out to employees to gather missing data and suggest workflow edits.

## Asana AI Features in 2025

- **Smart Summaries**: Automatically summarize task, project, and portfolio activity into digestible updates.
- **Smart Fields**: Suggest custom fields for new projects based on context, improving consistency across projects.
- **Smart Status Updates**: Draft status reports by scanning tasks, milestones, and blockers, speeding up communication and highlighting project risks early.
- **AI Studio**: Launching in June 2025, AI Studio allows users to create custom AI workflows. This includes AI-generated custom field updates, new request assessments, or task follow-up, reducing manual follow-up.

## Standard Features

Asana provides comprehensive task management with real-time collaboration, timeline views, and dashboard capabilities. The platform includes workflow automation through its Rules feature, allowing teams to automate repetitive tasks. Integration support connects with over 200+ tools including Slack, Google Drive, and Microsoft Teams.

| Feature Category | Asana Capabilities |
|-----------------|-------------------|
| Task Management | Advanced task tracking with dependencies, subtasks, and custom fields |
| Collaboration Tools | Real-time updates, comments, @mentions, and team inbox |
| Visualization | Timeline, Calendar, Board, and List views |
| Reporting & Analytics | Custom dashboards and portfolio management |
| Mobile Access | Full-featured iOS and Android apps |
| Security | Enterprise-grade security with SSO, 2FA, and encryption |
`;

const mondayResponse = `
Monday.com stands out with its visual workflow flexibility and innovative features:

- **Visual Workflow Builder**: Highly customizable boards with 200+ templates
- **Automation Center**: No-code automation with 250+ pre-built recipes
- **Monday AI**: AI-powered assistant for generating formulas, content, and insights
- **WorkOS Platform**: Developer platform for building custom apps and integrations
- **Dashboard Widgets**: 20+ visualization widgets for real-time insights
- **Collaborative Docs**: Built-in document collaboration with real-time editing

The platform excels in visual project management with color-coded boards, custom workflows, and extensive automation capabilities that reduce manual work by up to 70%.
`;

async function testImprovedExtraction() {
  const researcher = new ImprovedResearcherAgent();
  
  console.log('=== TESTING ASANA FEATURE EXTRACTION ===\n');
  
  // Test extraction for Asana
  const asanaFeatures = (researcher as any).extractFeaturesFromPerplexityContent(
    samplePerplexityResponse, 
    'Asana'
  );
  
  console.log(`Extracted ${asanaFeatures.length} features from Asana content:\n`);
  
  // Group by category
  const byCategory = asanaFeatures.reduce((acc: any, feature: any) => {
    const cat = feature.category || 'uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {});
  
  // Display features by category
  Object.entries(byCategory).forEach(([category, features]: [string, any]) => {
    console.log(`\n${category.toUpperCase()} FEATURES (${features.length}):`);
    console.log('='.repeat(50));
    
    features.forEach((f: any) => {
      console.log(`\n- ${f.name}${f.isInnovative ? ' ⚡ (INNOVATIVE)' : ''}`);
      console.log(`  Description: ${f.description.substring(0, 100)}...`);
      console.log(`  Benefit: ${f.benefit}`);
    });
  });
  
  console.log('\n\n=== TESTING MONDAY.COM FEATURE EXTRACTION ===\n');
  
  // Test extraction for Monday.com
  const mondayFeatures = (researcher as any).extractFeaturesFromPerplexityContent(
    mondayResponse, 
    'Monday.com'
  );
  
  console.log(`Extracted ${mondayFeatures.length} features from Monday.com content:\n`);
  
  // Display innovative features
  const innovativeFeatures = mondayFeatures.filter((f: any) => f.isInnovative);
  console.log(`\nINNOVATIVE/DELIGHTER FEATURES (${innovativeFeatures.length}):`);
  console.log('='.repeat(50));
  
  innovativeFeatures.forEach((f: any) => {
    console.log(`\n- ${f.name} ⚡`);
    console.log(`  Description: ${f.description}`);
    console.log(`  Category: ${f.category}`);
  });
  
  // Summary
  console.log('\n\n=== EXTRACTION SUMMARY ===');
  console.log(`Asana: ${asanaFeatures.length} total features`);
  console.log(`  - AI/Innovative: ${asanaFeatures.filter((f: any) => f.isInnovative).length}`);
  console.log(`  - Core: ${asanaFeatures.filter((f: any) => f.category === 'core').length}`);
  console.log(`  - Automation: ${asanaFeatures.filter((f: any) => f.category === 'automation').length}`);
  
  console.log(`\nMonday.com: ${mondayFeatures.length} total features`);
  console.log(`  - AI/Innovative: ${mondayFeatures.filter((f: any) => f.isInnovative).length}`);
  console.log(`  - Visualization: ${mondayFeatures.filter((f: any) => f.category === 'visualization').length}`);
}

testImprovedExtraction().then(() => {
  console.log('\n\n=== TEST COMPLETE ===');
  process.exit(0);
}).catch(error => {
  console.error('\n\n=== ERROR ===');
  console.error(error);
  process.exit(1);
});
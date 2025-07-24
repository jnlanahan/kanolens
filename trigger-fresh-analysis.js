import { config } from 'dotenv';
import { storage } from './server/storage.ts';
import { orchestratorAgent } from './server/agents/orchestrator.ts';

config();

console.log('=== TRIGGERING FRESH ANALYSIS ===\n');

async function triggerFreshAnalysis() {
  try {
    console.log('🔍 Finding sessions with fallback data and running fresh analysis...\n');
    
    // Get all sessions for the dev user
    const sessions = await storage.getUserAnalysisSessions('dev-user-123');
    console.log(`Found ${sessions.length} sessions\n`);
    
    let processedCount = 0;
    
    for (const session of sessions) {
      // Check if session has tableData with fallback content
      if (session.tableData && 
          JSON.stringify(session.tableData).includes('PERPLEXITY_API_KEY')) {
        
        console.log(`\n🚀 Processing session ${session.id}: "${session.title}"`);
        
        try {
          // Extract products and features from the session
          const products = Array.isArray(session.products) ? session.products : [];
          const targetCustomer = session.targetCustomer || 'Product Managers';
          
          // Get feature names from existing fallback data for fresh analysis
          const features = session.tableData?.features?.map((f: any) => f.name) || [
            'User Interface', 'Real-Time Collaboration', 'AI Code Assistance'
          ];
          
          console.log(`  Products: ${products.join(', ')}`);
          console.log(`  Features: ${features.slice(0, 3).join(', ')}... (${features.length} total)`);
          console.log(`  Target: ${targetCustomer}`);
          
          if (products.length === 0) {
            console.log('  ⚠️ No products found, skipping...');
            continue;
          }
          
          console.log('  📊 Running fresh analysis...');
          
          // Run the fixed orchestrator
          const result = await orchestratorAgent.coordinateFullAnalysis(
            products,
            features,
            targetCustomer,
            (update) => {
              console.log(`    [${update.step}] ${update.message} (${update.progress}%)`);
            },
            session.id,
            'quick'
          );
          
          // Update the session with fresh data
          await storage.updateAnalysisSession(session.id, {
            tableData: result.tableData,
            status: 'completed',
            currentStep: 'completed'
          });
          
          console.log(`  ✅ Fresh analysis complete!`);
          console.log(`  📈 Found ${result.tableData?.features?.length} features with real research data`);
          
          // Check if we got real data
          const sampleJustification = result.tableData?.justifications?.[Object.keys(result.tableData.justifications)[0]]?.[products[0]];
          if (sampleJustification && !sampleJustification.includes('configure PERPLEXITY_API_KEY')) {
            console.log('  🎉 SUCCESS: Real justifications generated from Perplexity research!');
          } else {
            console.log('  ⚠️ WARNING: Still showing fallback data');
          }
          
          processedCount++;
          
        } catch (analysisError) {
          console.error(`  ❌ Analysis failed for session ${session.id}:`, analysisError.message);
        }
        
        // Add delay between analyses to avoid rate limits
        if (sessions.length > 1) {
          console.log('  ⏱️ Waiting 30 seconds before next analysis...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }
    }
    
    console.log(`\n🎊 COMPLETE! Processed ${processedCount} sessions`);
    console.log('\nYour sessions now have fresh analysis data with real Perplexity research!');
    console.log('Reload your browser to see the detailed justifications in cell popups.');
    
  } catch (error) {
    console.error('❌ Failed to trigger fresh analysis:', error);
    console.error('Stack:', error.stack);
  }
}

triggerFreshAnalysis();
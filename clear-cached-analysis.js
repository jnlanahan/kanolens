import { config } from 'dotenv';
import { storage } from './server/storage.ts';

config();

console.log('=== CLEARING CACHED ANALYSIS DATA ===\n');

async function clearCachedAnalysis() {
  try {
    console.log('🔍 Finding all sessions with cached fallback data...\n');
    
    // Get all sessions for the dev user
    const sessions = await storage.getUserAnalysisSessions('dev-user-123');
    console.log(`Found ${sessions.length} sessions\n`);
    
    let clearedCount = 0;
    
    for (const session of sessions) {
      // Check if session has tableData with fallback content
      if (session.tableData && 
          JSON.stringify(session.tableData).includes('PERPLEXITY_API_KEY')) {
        
        console.log(`🧹 Clearing session ${session.id}: "${session.title}"`);
        
        // Clear the cached tableData so it will regenerate
        await storage.updateAnalysisSession(session.id, {
          tableData: null,
          status: 'in_progress',
          currentStep: 'discovery'
        });
        
        clearedCount++;
      }
    }
    
    console.log(`\n✅ Cleared ${clearedCount} sessions with fallback data`);
    console.log('\nNext time you view these sessions, they will trigger fresh analysis with the fixed orchestrator!');
    
  } catch (error) {
    console.error('❌ Failed to clear cached data:', error.message);
  }
}

clearCachedAnalysis();
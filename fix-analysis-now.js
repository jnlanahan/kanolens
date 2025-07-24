import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

console.log('=== FIXING YOUR ANALYSIS ISSUE NOW ===\n');

async function fixAnalysisNow() {
  try {
    console.log('🎯 Step 1: Get your existing sessions...\n');
    
    const sessionsResponse = await fetch('http://localhost:3000/api/analysis/sessions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!sessionsResponse.ok) {
      throw new Error(`Failed to get sessions: ${sessionsResponse.status}`);
    }
    
    const sessions = await sessionsResponse.json();
    console.log(`Found ${sessions.length} existing sessions\n`);
    
    // Find sessions with fallback data
    let regeneratedCount = 0;
    
    for (const session of sessions) {
      if (session.tableData && JSON.stringify(session.tableData).includes('PERPLEXITY_API_KEY')) {
        console.log(`🔄 Regenerating session ${session.id}: "${session.title}"`);
        
        // Call the new regenerate endpoint
        const regenerateResponse = await fetch(`http://localhost:3000/api/analysis/sessions/${session.id}/regenerate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (regenerateResponse.ok) {
          console.log(`   ✅ Regeneration started for session ${session.id}`);
          regeneratedCount++;
        } else {
          console.log(`   ❌ Failed to regenerate session ${session.id}`);
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (regeneratedCount === 0) {
      console.log('🆕 No sessions found with fallback data. Creating a fresh analysis...\n');
      
      // Create a brand new analysis
      const analysisData = {
        products: ['V0', 'Replit', 'Cursor'],
        targetCustomer: 'Product Managers', 
        features: ['User Interface', 'AI Code Assistance', 'Real-Time Collaboration'],
        analysisMode: 'quick'
      };
      
      const startResponse = await fetch('http://localhost:3000/api/analysis/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisData)
      });
      
      if (startResponse.ok) {
        const result = await startResponse.json();
        console.log(`✅ New analysis started! Session ID: ${result.sessionId}`);
        console.log(`🌐 Go to: http://localhost:3000/analysis/${result.sessionId}/progress`);
        regeneratedCount = 1;
      }
    }
    
    if (regeneratedCount > 0) {
      console.log(`\n🎉 SUCCESS! ${regeneratedCount} analysis(es) started with the FIXED orchestrator!`);
      console.log('\n⏳ Analyses are running in the background using real Perplexity research...');
      console.log('📱 You can watch progress in your browser');
      console.log('✨ Cell popups will now show detailed justifications instead of generic messages');
      console.log('\nWait 2-3 minutes for completion, then refresh your browser!');
    }
    
  } catch (error) {
    console.error('❌ Failed to fix analysis:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure your dev server is running:');
      console.log('   npm run dev');
    }
  }
}

fixAnalysisNow();
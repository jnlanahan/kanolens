import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

console.log('=== FORCING FRESH ANALYSIS VIA API ===\n');

async function forceFreshAnalysis() {
  try {
    console.log('🚀 Creating fresh analysis via API...\n');
    
    // Define your products and features
    const analysisData = {
      products: ['V0', 'Replit', 'Cursor'],
      targetCustomer: 'Product Managers', 
      features: ['User Interface', 'AI Code Assistance', 'Real-Time Collaboration'],
      analysisMode: 'quick'
    };
    
    console.log('Analysis Request:');
    console.log('- Products:', analysisData.products.join(', '));
    console.log('- Target Customer:', analysisData.targetCustomer);
    console.log('- Features:', analysisData.features.join(', '));
    console.log('- Analysis Mode:', analysisData.analysisMode);
    
    // Call the API endpoint directly (assumes dev server running on 3000)
    console.log('\n📡 Calling /api/analysis/start...');
    
    const response = await fetch('http://localhost:3000/api/analysis/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Dev mode should bypass auth, but add headers just in case
        'Authorization': 'Bearer dev-token'
      },
      body: JSON.stringify(analysisData)
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('\n✅ Analysis started!');
    console.log('Session ID:', result.sessionId);
    
    console.log('\n⏳ Analysis is running in the background...');
    console.log('🌐 Go to: http://localhost:3000/analysis/' + result.sessionId + '/progress');
    console.log('📊 Or check: http://localhost:3000/analysis/' + result.sessionId + '/results');
    console.log('\n✨ This should now show REAL research data with detailed justifications!');
    
  } catch (error) {
    console.error('❌ Failed to force fresh analysis:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure your dev server is running:');
      console.log('   cd "S:\\Vibe Coding Folder\\kanolens"');
      console.log('   npm run dev');
    }
  }
}

forceFreshAnalysis();
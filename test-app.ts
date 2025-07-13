#!/usr/bin/env tsx

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name: string, endpoint: string, options: any = {}) {
  try {
    log(`\nTesting ${name}...`, 'blue');
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log(`✅ ${name} - Status: ${response.status}`, 'green');
      console.log('Response:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      log(`❌ ${name} - Status: ${response.status}`, 'red');
      console.log('Error:', data);
      return { success: false, error: data };
    }
  } catch (error) {
    log(`❌ ${name} - Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🚀 Starting KanoLens Application Tests', 'yellow');
  
  // Test 1: Check if server is running
  const healthCheck = await testEndpoint('Health Check', '/api/auth/user');
  
  // Test 2: Test suggestions endpoint
  const suggestionsTest = await testEndpoint('Suggestions Endpoint', '/api/chat/suggestions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'AI code completion tools',
      products: 'GitHub Copilot, Cursor, Replit AI',
      targetCustomers: 'Software developers',
      features: 'Code completion, error detection'
    })
  });
  
  // Test 3: Test validation endpoint
  const validationTest = await testEndpoint('Validation Endpoint', '/api/chat/validate-inputs', {
    method: 'POST',
    body: JSON.stringify({
      product: 'Tabnine',
      benefit: 'AI-powered code completion',
      existingData: {
        products: ['GitHub Copilot', 'Cursor'],
        features: ['Code completion'],
        targetCustomer: 'Developers'
      }
    })
  });
  
  // Test 4: Create analysis session (requires auth)
  const sessionTest = await testEndpoint('Create Analysis Session', '/api/analysis/sessions', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Analysis',
      products: ['GitHub Copilot', 'Cursor', 'Tabnine'],
      targetCustomer: 'Software developers'
    })
  });
  
  if (sessionTest.success) {
    const sessionId = sessionTest.data.id;
    
    // Test 5: Send analysis message
    const analysisTest = await testEndpoint('Start Analysis', `/api/analysis/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'Start analysis',
        metadata: {
          products: ['GitHub Copilot', 'Cursor', 'Tabnine'],
          features: ['Code completion', 'Error detection', 'Refactoring'],
          targetCustomer: 'Software developers',
          useMultiAgent: true
        }
      })
    });
    
    // Test 6: Check messages
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const messagesTest = await testEndpoint('Get Messages', `/api/analysis/sessions/${sessionId}/messages`);
    
    // Test 7: Check session status
    const sessionStatusTest = await testEndpoint('Get Session Status', `/api/analysis/sessions/${sessionId}`);
  }
  
  log('\n✅ Tests completed!', 'yellow');
}

// Run tests
runTests().catch(console.error);
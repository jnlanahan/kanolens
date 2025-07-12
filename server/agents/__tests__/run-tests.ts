#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

console.log('🧪 Running Multi-Agent System Tests...\n');

const testFiles = [
  'orchestrator.test.ts',
  'researcher.test.ts', 
  'validator.test.ts',
  'analyst.test.ts'
];

async function runTest(file: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n📋 Testing ${file}...`);
    
    const testPath = path.join(__dirname, file);
    const vitest = spawn('npx', ['vitest', 'run', testPath], {
      stdio: 'inherit',
      shell: true
    });

    vitest.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${file} passed`);
        resolve(true);
      } else {
        console.log(`❌ ${file} failed`);
        resolve(false);
      }
    });
  });
}

async function runAllTests() {
  const results: boolean[] = [];
  
  for (const file of testFiles) {
    const passed = await runTest(file);
    results.push(passed);
  }
  
  console.log('\n📊 Test Summary:');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r).length}`);
  console.log(`Failed: ${results.filter(r => !r).length}`);
  
  if (results.every(r => r)) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
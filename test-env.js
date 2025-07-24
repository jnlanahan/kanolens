import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
const result = dotenv.config();

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Successfully loaded .env file');
  console.log('Environment variables found:', Object.keys(result.parsed || {}));
  
  // Check DATABASE_URL specifically
  if (process.env.DATABASE_URL) {
    console.log('\nDATABASE_URL is set');
    console.log('First 50 chars:', process.env.DATABASE_URL.substring(0, 50) + '...');
  } else {
    console.log('\nDATABASE_URL is NOT set');
  }
}

// Also try to read the file directly
try {
  const envContent = readFileSync('.env', 'utf-8');
  console.log('\n.env file content (first 200 chars):');
  console.log(envContent.substring(0, 200) + '...');
  
  // Check for common issues
  if (envContent.includes('\r\n')) {
    console.log('\nWarning: File has Windows line endings (CRLF)');
  }
  if (envContent.startsWith('\uFEFF')) {
    console.log('\nWarning: File has BOM (Byte Order Mark) - this can cause issues!');
  }
} catch (err) {
  console.error('Could not read .env file directly:', err.message);
}
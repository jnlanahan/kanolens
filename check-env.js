import { readFileSync } from 'fs';

try {
  const content = readFileSync('.env', 'utf-8');
  
  console.log('=== .env File Analysis ===\n');
  
  // Check file properties
  console.log('File size:', content.length, 'bytes');
  console.log('Number of lines:', content.split('\n').length);
  
  // Check for BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    console.log('\n⚠️  WARNING: File has BOM (Byte Order Mark) - this will cause issues!');
  }
  
  // Check line endings
  if (content.includes('\r\n')) {
    console.log('Line endings: Windows (CRLF)');
  } else if (content.includes('\n')) {
    console.log('Line endings: Unix (LF)');
  }
  
  // Parse lines
  console.log('\n=== Parsing Lines ===\n');
  const lines = content.split(/\r?\n/);
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    
    console.log(`Line ${index + 1}: "${line}"`);
    
    // Check for = sign
    if (!line.includes('=')) {
      console.log('  ⚠️  Missing = sign');
      return;
    }
    
    // Check for spaces around =
    if (line.includes(' =') || line.includes('= ')) {
      console.log('  ⚠️  Spaces around = sign (this might cause issues)');
    }
    
    // Parse key and value
    const equalIndex = line.indexOf('=');
    const key = line.substring(0, equalIndex);
    const value = line.substring(equalIndex + 1);
    
    console.log(`  Key: "${key}"`);
    console.log(`  Value length: ${value.length} chars`);
    
    if (key === 'DATABASE_URL' && value) {
      // Validate DATABASE_URL format
      if (!value.startsWith('postgresql://')) {
        console.log('  ⚠️  DATABASE_URL should start with postgresql://');
      }
      
      // Check for common issues
      const passwordMatch = value.match(/:([^@]+)@/);
      if (passwordMatch) {
        const password = passwordMatch[1];
        if (password.includes('@') || password.includes(':') || password.includes('/')) {
          console.log('  ⚠️  Password contains unencoded special characters');
        }
      }
    }
  });
  
  // Try to parse with dotenv
  console.log('\n=== Testing dotenv parsing ===\n');
  
  const envVars = {};
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex);
        const value = trimmed.substring(equalIndex + 1);
        envVars[key] = value;
      }
    }
  });
  
  console.log('Parsed variables:', Object.keys(envVars));
  
  if (envVars.DATABASE_URL) {
    console.log('\nDATABASE_URL found!');
    console.log('First 60 chars:', envVars.DATABASE_URL.substring(0, 60) + '...');
  } else {
    console.log('\n❌ DATABASE_URL not found in parsed variables');
  }
  
} catch (err) {
  console.error('Error reading .env file:', err.message);
}
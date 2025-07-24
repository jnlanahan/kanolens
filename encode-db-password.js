// Database password encoder - only encodes necessary characters
const password = process.argv[2];

if (!password) {
  console.log('Usage: node encode-db-password.js "your-password-here"');
  process.exit(1);
}

// Only encode characters that actually break database URLs
function encodeDatabasePassword(pwd) {
  return pwd
    .replace(/@/g, '%40')
    .replace(/#/g, '%23')
    .replace(/\$/g, '%24')
    .replace(/!/g, '%21')
    .replace(/&/g, '%26')
    .replace(/\*/g, '%2A')
    .replace(/\+/g, '%2B')
    .replace(/:/g, '%3A')
    .replace(/;/g, '%3B')
    .replace(/=/g, '%3D')
    .replace(/\?/g, '%3F')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D')
    .replace(/\//g, '%2F')
    .replace(/\\/g, '%5C')
    .replace(/ /g, '%20');
}

const encoded = encodeDatabasePassword(password);
const fullyEncoded = encodeURIComponent(password);

console.log('\nOriginal password:', password);
console.log('Database-safe encoding:', encoded);
console.log('Full encoding (for comparison):', fullyEncoded);

if (encoded !== fullyEncoded) {
  console.log('\nNote: The database-safe version is less aggressive than full URL encoding.');
  console.log('Commas, parentheses, and other safe characters are preserved.');
}

console.log('\nYour connection string should be:');
console.log(`DATABASE_URL=postgresql://postgres.xobpbazajvrxmumorkxc:${encoded}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`);
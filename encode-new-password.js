// Helper to encode your new Supabase password
const password = process.argv[2];

if (!password) {
  console.log('Usage: node encode-new-password.js "your-new-password"');
  process.exit(1);
}

// Show which characters need encoding
const specialChars = ['*', '!', '<', '>', '@', '#', '$', '&', '+', '/', ':', ';', '=', '?', '[', ']'];
const foundSpecial = specialChars.filter(char => password.includes(char));

if (foundSpecial.length > 0) {
  console.log('Found special characters that need encoding:', foundSpecial.join(', '));
}

// Encode special characters for PostgreSQL URLs
const encoded = password
  .replace(/\*/g, '%2A')
  .replace(/!/g, '%21')
  .replace(/</g, '%3C')
  .replace(/>/g, '%3E')
  .replace(/@/g, '%40')
  .replace(/#/g, '%23')
  .replace(/\$/g, '%24')
  .replace(/&/g, '%26')
  .replace(/\+/g, '%2B')
  .replace(/\//g, '%2F')
  .replace(/:/g, '%3A')
  .replace(/;/g, '%3B')
  .replace(/=/g, '%3D')
  .replace(/\?/g, '%3F')
  .replace(/\[/g, '%5B')
  .replace(/\]/g, '%5D')
  .replace(/ /g, '%20');

console.log('\nOriginal password:', password);
console.log('Encoded password:', encoded);

// For Transaction pooler (port 6543)
console.log('\n=== For Transaction Pooler ===');
console.log('DATABASE_URL=postgresql://postgres.xobpbazajvrxmumorkxc:' + encoded + '@aws-0-us-east-2.pooler.supabase.com:6543/postgres');

// For Session pooler (might work better)
console.log('\n=== For Session Pooler ===');
console.log('DATABASE_URL=postgresql://postgres.xobpbazajvrxmumorkxc:' + encoded + '@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true');

// For Direct connection (fallback option)
console.log('\n=== For Direct Connection (if pooler fails) ===');
console.log('DATABASE_URL=postgresql://postgres:' + encoded + '@db.xobpbazajvrxmumorkxc.supabase.co:5432/postgres');
// Simple script to URL-encode your Supabase password
// Usage: node encode-password.js "your-password-here"

const password = process.argv[2];

if (!password) {
  console.log('Usage: node encode-password.js "your-password-here"');
  console.log('Example: node encode-password.js "MyP@ss#123!"');
  process.exit(1);
}

const encoded = encodeURIComponent(password);
console.log('\nOriginal password:', password);
console.log('URL-encoded password:', encoded);
console.log('\nYour full connection string should be:');
console.log(`postgresql://postgres.xobpbazajvrxmumorkxc:${encoded}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`);
// Your actual password without the brackets
const password = '8ik,1qaz*2AIK<!QAZ';  // Assuming %2A is * and %21 is !

console.log('Original password:', password);

// Encode special characters
const encoded = password
  .replace(/</g, '%3C')   // < becomes %3C
  .replace(/!/g, '%21')   // ! becomes %21
  .replace(/\*/g, '%2A'); // * becomes %2A

console.log('Properly encoded:', encoded);

console.log('\nYour DATABASE_URL should be:');
console.log(`DATABASE_URL=postgresql://postgres.xobpbazajvrxmumorkxc:${encoded}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`);

// Also show if your current version had the brackets
console.log('\nIf you currently have brackets in your .env, remove them:');
console.log('WRONG: [8ik,1qaz%2AIK<%21QAZ]');
console.log('RIGHT:', encoded);
// Your password appears to be partially encoded already
// Let's fix it properly

const password = '[8ik,1qaz*2AIK<!QAZ]';  // Original password with * and ! instead of %2A and %21

console.log('Original password:', password);

// Encode only what needs to be encoded for PostgreSQL URLs
const encoded = password
  .replace(/\[/g, '%5B')  // [ becomes %5B
  .replace(/\]/g, '%5D')  // ] becomes %5D
  .replace(/</g, '%3C')   // < becomes %3C
  .replace(/!/g, '%21')   // ! becomes %21
  .replace(/\*/g, '%2A'); // * becomes %2A

console.log('Properly encoded:', encoded);

console.log('\nYour DATABASE_URL should be:');
console.log(`DATABASE_URL=postgresql://postgres.xobpbazajvrxmumorkxc:${encoded}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`);
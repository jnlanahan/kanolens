import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('DATABASE_URL not found in environment');
    return;
  }

  console.log('Testing connection to Supabase...');
  console.log('Connection string format check:');
  
  // Parse the connection string
  try {
    const url = new URL(dbUrl);
    console.log('- Protocol:', url.protocol);
    console.log('- Username:', url.username);
    console.log('- Host:', url.hostname);
    console.log('- Port:', url.port);
    console.log('- Database:', url.pathname.slice(1));
    console.log('- Password length:', url.password.length, 'chars');
    console.log('- Password preview:', url.password.substring(0, 5) + '...');
  } catch (e) {
    console.error('Invalid URL format:', e.message);
  }

  // Try to connect
  try {
    console.log('\nAttempting connection...');
    const sql = postgres(dbUrl, {
      ssl: 'require',  // Supabase requires SSL
      max: 1,
      timeout: 10
    });

    // Test query
    const result = await sql`SELECT current_database(), current_user, version()`;
    console.log('✅ Connection successful!');
    console.log('Database:', result[0].current_database);
    console.log('User:', result[0].current_user);
    
    await sql.end();
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    if (error.message.includes('SCRAM')) {
      console.log('\nThis is an authentication error. Possible causes:');
      console.log('1. Password has special characters that need different encoding');
      console.log('2. Wrong password');
      console.log('3. Using wrong connection string (direct vs pooler)');
    }
  }
};

testConnection();
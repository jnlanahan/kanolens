import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Verify required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const importantEnvVars = ['PERPLEXITY_API_KEY', 'OPENAI_API_KEY'];

// Check absolutely required variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    console.error('Please check your .env file');
    process.exit(1);
  }
}

// Check important variables and warn
for (const envVar of importantEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Missing important environment variable: ${envVar}`);
    console.warn('   Some features may not work correctly');
  } else {
    console.log(`✅ ${envVar} loaded (${process.env[envVar].substring(0, 10)}...)`);
  }
}

export const config = {
  databaseUrl: process.env.DATABASE_URL!,
  openaiApiKey: process.env.OPENAI_API_KEY,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'default-dev-secret',
};
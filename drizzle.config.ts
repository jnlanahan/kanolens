import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Build database configuration
let dbCredentials;

if (process.env.DATABASE_URL) {
  // Use connection string if provided
  dbCredentials = {
    url: process.env.DATABASE_URL,
  };
} else if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD) {
  // Use individual PostgreSQL environment variables
  dbCredentials = {
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: true,
  };
} else {
  throw new Error("Either DATABASE_URL or PG* environment variables (PGHOST, PGUSER, PGPASSWORD) must be set in .env file");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials,
});

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

class DatabaseManager {
  private client: any;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy = true;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.initializeClient();
    this.startHealthCheck();
  }

  private initializeClient() {
    try {
      console.log('[DB] Initializing database connection...');
      
      const connectionConfig = {
        max: 20,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        onnotice: () => {}, // Suppress notices
        onnotify: () => {}, // Suppress notifications
        retry: 3,
        onlisten: () => console.log('[DB] Database connection established'),
        onclose: () => {
          console.warn('[DB] Database connection closed');
          this.isHealthy = false;
        },
        onerror: (error: any) => {
          console.error('[DB] Database connection error:', error);
          this.isHealthy = false;
        }
      };

      if (process.env.DATABASE_URL) {
        this.client = postgres(process.env.DATABASE_URL, connectionConfig);
      } else if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD) {
        this.client = postgres({
          host: process.env.PGHOST,
          port: parseInt(process.env.PGPORT || '5432'),
          database: process.env.PGDATABASE || 'postgres',
          username: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          ssl: 'require',
          ...connectionConfig
        });
      } else {
        throw new Error(
          "Either DATABASE_URL or PG* environment variables (PGHOST, PGUSER, PGPASSWORD) must be set"
        );
      }

      console.log('[DB] Database client initialized successfully');
      this.reconnectAttempts = 0;
      
    } catch (error) {
      console.error('[DB] Failed to initialize database client:', error);
      throw error;
    }
  }

  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.client`SELECT 1 as health_check`;
        
        if (!this.isHealthy) {
          console.log('[DB] Database connection restored');
          this.isHealthy = true;
          this.reconnectAttempts = 0;
        }
      } catch (error) {
        console.error('[DB] Health check failed:', error);
        this.isHealthy = false;
        
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          console.log(`[DB] Attempting to reconnect... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
          
          try {
            this.initializeClient();
          } catch (reconnectError) {
            console.error('[DB] Reconnection failed:', reconnectError);
          }
        } else {
          console.error('[DB] Max reconnection attempts reached. Database unavailable.');
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  getClient() {
    if (!this.isHealthy) {
      throw new Error('Database is currently unavailable. Please try again later.');
    }
    return this.client;
  }

  isConnectionHealthy(): boolean {
    return this.isHealthy;
  }

  async executeWithRetry<T>(operation: (client: any) => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = this.getClient();
        return await operation(client);
      } catch (error) {
        console.error(`[DB] Operation attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Database operation failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[DB] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.client) {
      await this.client.end();
    }
    console.log('[DB] Database connection shutdown complete');
  }
}

// Global database manager instance
const dbManager = new DatabaseManager();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('[DB] Received SIGINT, shutting down database connection...');
  await dbManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[DB] Received SIGTERM, shutting down database connection...');
  await dbManager.shutdown();
  process.exit(0);
});

// Create a wrapper around the db that handles retries
const createDbProxy = () => {
  const client = dbManager.getClient();
  return drizzle(client, { schema });
};

// For now, use direct client to avoid circular dependency issues
export const db = drizzle(dbManager.getClient(), { schema });
export { dbManager };
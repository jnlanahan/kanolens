// Configuration Service abstraction to centralize environment variable handling
// Created with test-first approach for reliability

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
}

export interface APIConfig {
  openai: {
    apiKey: string;
    maskedKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  anthropic: {
    apiKey: string;
    maskedKey: string;
    model: string;
    maxTokens: number;
  };
  perplexity: {
    apiKey: string;
    maskedKey: string;
    model: string;
  };
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  session: {
    secret: string;
    secure: boolean;
    maxAge: number;
  };
}

export interface AppConfig {
  environment: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  websocket: {
    maxConnections: number;
    maxConnectionsPerSession: number;
    cleanupInterval: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface ConfigService {
  database: DatabaseConfig;
  api: APIConfig;
  server: ServerConfig;
  app: AppConfig;
  updateAppConfig(updates: Partial<AppConfig>): void;
  onConfigChange(callback: (section: string, updates: any) => void): void;
  toJSON(): any;
}

/**
 * Creates a Configuration service instance
 * @returns Configured Configuration service
 */
export function createConfigService(): ConfigService {
  const changeCallbacks: Array<(section: string, updates: any) => void> = [];

  /**
   * Validation helpers
   */
  function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  function parsePort(value: string | undefined, defaultPort: number): number {
    if (!value) return defaultPort;
    
    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
      throw new Error(`Invalid PORT value: ${value}`);
    }
    return parsed;
  }

  function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
    
    throw new Error(`Invalid boolean value for ${value}`);
  }

  function maskApiKey(key: string): string {
    if (key.length <= 7) return '***';
    return key.substring(0, 7) + '***';
  }

  function parseDatabaseUrl(url: string): Omit<DatabaseConfig, 'url' | 'pool'> {
    try {
      const parsed = new URL(url);
      
      if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
        throw new Error('Only PostgreSQL URLs are supported');
      }
      
      return {
        host: parsed.hostname || 'localhost',
        port: parsed.port ? parseInt(parsed.port) : 5432,
        database: parsed.pathname.slice(1) || '',
        username: parsed.username || '',
        password: parsed.password || ''
      };
    } catch (error) {
      throw new Error(`Invalid DATABASE_URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function validateLogLevel(level: string): 'debug' | 'info' | 'warn' | 'error' {
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      return level as 'debug' | 'info' | 'warn' | 'error';
    }
    throw new Error(`Invalid log level: ${level}`);
  }

  /**
   * Build configuration objects
   */
  const databaseUrl = requireEnv('DATABASE_URL');
  const dbParts = parseDatabaseUrl(databaseUrl);
  
  const database: DatabaseConfig = {
    url: databaseUrl,
    ...dbParts,
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    }
  };

  const api: APIConfig = {
    openai: {
      apiKey: requireEnv('OPENAI_API_KEY'),
      maskedKey: maskApiKey(requireEnv('OPENAI_API_KEY')),
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000')
    },
    anthropic: {
      apiKey: requireEnv('ANTHROPIC_API_KEY'),
      maskedKey: maskApiKey(requireEnv('ANTHROPIC_API_KEY')),
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4000')
    },
    perplexity: {
      apiKey: requireEnv('PERPLEXITY_API_KEY'),
      maskedKey: maskApiKey(requireEnv('PERPLEXITY_API_KEY')),
      model: process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-small-128k-online'
    }
  };

  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const server: ServerConfig = {
    port: parsePort(process.env.PORT, 3000),
    host: process.env.HOST || 'localhost',
    cors: {
      enabled: true,
      origins: process.env.CORS_ORIGINS 
        ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
        : isDevelopment 
          ? ['http://localhost:3000', 'http://localhost:5173']
          : []
    },
    session: {
      secret: requireEnv('SESSION_SECRET'),
      secure: isProduction,
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000') // 24 hours
    }
  };

  let app: AppConfig = {
    environment: process.env.NODE_ENV || 'development',
    logLevel: validateLogLevel(process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')),
    enableMetrics: parseBoolean(process.env.ENABLE_METRICS, isProduction),
    websocket: {
      maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '100'),
      maxConnectionsPerSession: parseInt(process.env.WS_MAX_PER_SESSION || '5'),
      cleanupInterval: parseInt(process.env.WS_CLEANUP_INTERVAL || '300000') // 5 minutes
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100')
    }
  };

  return {
    database,
    api,
    server,
    app,

    updateAppConfig(updates: Partial<AppConfig>): void {
      // Validate updates
      if (updates.logLevel && !['debug', 'info', 'warn', 'error'].includes(updates.logLevel)) {
        throw new Error(`Invalid log level: ${updates.logLevel}`);
      }

      // Apply updates
      app = { ...app, ...updates };

      // Notify callbacks
      changeCallbacks.forEach(callback => {
        try {
          callback('app', updates);
        } catch (error) {
          console.error('Config change callback error:', error);
        }
      });
    },

    onConfigChange(callback: (section: string, updates: any) => void): void {
      changeCallbacks.push(callback);
    },

    toJSON(): any {
      return {
        database: {
          ...database,
          password: '***', // Mask password
          url: database.url.replace(/:([^@:]+)@/, ':***@') // Mask password in URL
        },
        api: {
          openai: {
            ...api.openai,
            apiKey: api.openai.maskedKey
          },
          anthropic: {
            ...api.anthropic,
            apiKey: api.anthropic.maskedKey
          },
          perplexity: {
            ...api.perplexity,
            apiKey: api.perplexity.maskedKey
          }
        },
        server: {
          ...server,
          session: {
            ...server.session,
            secret: '***' // Mask session secret
          }
        },
        app
      };
    }
  };
}
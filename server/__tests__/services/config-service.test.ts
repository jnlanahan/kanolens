// Test-first approach: Define tests for Configuration service abstraction
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import service we'll create
import { 
  ConfigService, 
  createConfigService,
  DatabaseConfig,
  APIConfig,
  ServerConfig,
  AppConfig
} from '../../services/config-service';

describe('Config Service', () => {
  let configService: ConfigService;
  let originalEnv: any;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.PORT = '3006';

    configService = createConfigService();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createConfigService', () => {
    it('should create config service successfully', () => {
      expect(configService).toBeDefined();
      expect(configService.database).toBeDefined();
      expect(configService.api).toBeDefined();
      expect(configService.server).toBeDefined();
      expect(configService.app).toBeDefined();
    });

    it('should validate all required environment variables', () => {
      // Remove required env var
      delete process.env.DATABASE_URL;
      
      expect(() => createConfigService()).toThrow('Missing required environment variable: DATABASE_URL');
    });

    it('should provide default values for optional variables', () => {
      delete process.env.PORT;
      
      const service = createConfigService();
      expect(service.server.port).toBe(3000); // Default port
    });
  });

  describe('DatabaseConfig', () => {
    it('should parse database configuration correctly', () => {
      const dbConfig = configService.database;
      
      expect(dbConfig.url).toBe('postgresql://test:test@localhost:5432/test_db');
      expect(dbConfig.host).toBe('localhost');
      expect(dbConfig.port).toBe(5432);
      expect(dbConfig.database).toBe('test_db');
      expect(dbConfig.username).toBe('test');
      expect(dbConfig.password).toBe('test');
    });

    it('should handle database URL without password', () => {
      process.env.DATABASE_URL = 'postgresql://user@localhost:5432/db';
      
      const service = createConfigService();
      const dbConfig = service.database;
      
      expect(dbConfig.username).toBe('user');
      expect(dbConfig.password).toBe('');
    });

    it('should validate database URL format', () => {
      process.env.DATABASE_URL = 'invalid-url';
      
      expect(() => createConfigService()).toThrow('Invalid DATABASE_URL format');
    });

    it('should provide connection pool settings', () => {
      const dbConfig = configService.database;
      
      expect(typeof dbConfig.pool).toBe('object');
      expect(dbConfig.pool.min).toBeGreaterThanOrEqual(0);
      expect(dbConfig.pool.max).toBeGreaterThan(dbConfig.pool.min);
    });
  });

  describe('APIConfig', () => {
    it('should configure API keys correctly', () => {
      const apiConfig = configService.api;
      
      expect(apiConfig.openai.apiKey).toBe('test-openai-key');
      expect(apiConfig.anthropic.apiKey).toBe('test-anthropic-key');
      expect(apiConfig.perplexity.apiKey).toBe('test-perplexity-key');
    });

    it('should provide API configuration with defaults', () => {
      const apiConfig = configService.api;
      
      expect(apiConfig.openai.model).toBe('gpt-4o');
      expect(apiConfig.openai.maxTokens).toBe(2000);
      expect(apiConfig.openai.temperature).toBe(0.7);
      expect(apiConfig.openai.timeout).toBe(30000);
    });

    it('should validate API key presence', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => createConfigService()).toThrow('Missing required environment variable: OPENAI_API_KEY');
    });

    it('should mask API keys in logs', () => {
      const apiConfig = configService.api;
      
      expect(apiConfig.openai.maskedKey).toBe('test-op***');
      expect(apiConfig.anthropic.maskedKey).toBe('test-an***');
      expect(apiConfig.perplexity.maskedKey).toBe('test-pe***');
    });
  });

  describe('ServerConfig', () => {
    it('should configure server settings correctly', () => {
      const serverConfig = configService.server;
      
      expect(serverConfig.port).toBe(3006);
      expect(serverConfig.host).toBe('localhost');
      expect(serverConfig.cors.enabled).toBe(true);
      expect(Array.isArray(serverConfig.cors.origins)).toBe(true);
    });

    it('should handle production environment settings', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGINS = 'https://app.example.com,https://api.example.com';
      
      const service = createConfigService();
      const serverConfig = service.server;
      
      expect(serverConfig.cors.origins).toEqual(['https://app.example.com', 'https://api.example.com']);
    });

    it('should configure session settings', () => {
      const serverConfig = configService.server;
      
      expect(serverConfig.session.secret).toBe('test-session-secret');
      expect(serverConfig.session.secure).toBe(false); // test environment
      expect(typeof serverConfig.session.maxAge).toBe('number');
    });
  });

  describe('AppConfig', () => {
    it('should configure application settings', () => {
      const appConfig = configService.app;
      
      expect(appConfig.environment).toBe('test');
      expect(appConfig.logLevel).toBe('debug'); // test environment
      expect(appConfig.enableMetrics).toBe(false); // test environment
    });

    it('should configure WebSocket settings', () => {
      const appConfig = configService.app;
      
      expect(appConfig.websocket.maxConnections).toBeGreaterThan(0);
      expect(appConfig.websocket.maxConnectionsPerSession).toBeGreaterThan(0);
      expect(appConfig.websocket.cleanupInterval).toBeGreaterThan(0);
    });

    it('should configure rate limiting', () => {
      const appConfig = configService.app;
      
      expect(appConfig.rateLimit.windowMs).toBeGreaterThan(0);
      expect(appConfig.rateLimit.maxRequests).toBeGreaterThan(0);
    });
  });

  describe('environment-specific behavior', () => {
    it('should handle development environment', () => {
      process.env.NODE_ENV = 'development';
      
      const service = createConfigService();
      
      expect(service.app.logLevel).toBe('debug');
      expect(service.server.cors.origins).toContain('http://localhost:3000');
      expect(service.app.enableMetrics).toBe(false);
    });

    it('should handle production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'warn';
      process.env.ENABLE_METRICS = 'true';
      
      const service = createConfigService();
      
      expect(service.app.logLevel).toBe('warn');
      expect(service.app.enableMetrics).toBe(true);
      expect(service.server.session.secure).toBe(true);
    });
  });

  describe('validation and type safety', () => {
    it('should validate port numbers', () => {
      process.env.PORT = 'invalid';
      
      expect(() => createConfigService()).toThrow('Invalid PORT value');
    });

    it('should validate boolean environment variables', () => {
      process.env.ENABLE_METRICS = 'maybe';
      
      expect(() => createConfigService()).toThrow('Invalid boolean value for ENABLE_METRICS');
    });

    it('should provide type-safe configuration access', () => {
      const config = configService;
      
      // TypeScript should enforce these types
      expect(typeof config.server.port).toBe('number');
      expect(typeof config.app.enableMetrics).toBe('boolean');
      expect(typeof config.api.openai.apiKey).toBe('string');
    });
  });

  describe('configuration updates', () => {
    it('should allow runtime configuration updates', () => {
      const originalLogLevel = configService.app.logLevel;
      
      configService.updateAppConfig({ logLevel: 'error' });
      
      expect(configService.app.logLevel).toBe('error');
      expect(configService.app.logLevel).not.toBe(originalLogLevel);
    });

    it('should validate configuration updates', () => {
      expect(() => {
        configService.updateAppConfig({ logLevel: 'invalid' as any });
      }).toThrow('Invalid log level');
    });

    it('should emit events on configuration changes', () => {
      const changeHandler = vi.fn();
      configService.onConfigChange(changeHandler);
      
      configService.updateAppConfig({ logLevel: 'error' });
      
      expect(changeHandler).toHaveBeenCalledWith('app', { logLevel: 'error' });
    });
  });

  describe('configuration serialization', () => {
    it('should serialize configuration for logging', () => {
      const serialized = configService.toJSON();
      
      expect(serialized).toHaveProperty('database');
      expect(serialized).toHaveProperty('api');
      expect(serialized).toHaveProperty('server');
      expect(serialized).toHaveProperty('app');
      
      // API keys should be masked
      expect(serialized.api.openai.apiKey).toBe('test-op***');
    });

    it('should exclude sensitive data from serialization', () => {
      const serialized = configService.toJSON();
      
      expect(serialized.database.password).toBe('***');
      expect(serialized.server.session.secret).toBe('***');
    });
  });
});
# ADR-002: Service Layer Architecture with Dependency Injection

## Status
Accepted

## Context
During Phase 2 of our refactoring strategy, we needed to extract business logic from massive route files (1,749 lines) and create reusable, testable service abstractions. The existing code mixed routing, business logic, and data access in single files.

## Decision
We adopted a **Service Layer Architecture with Dependency Injection** to create clean separation between concerns and enable comprehensive testing.

### Core Services Implemented:
1. **AI Service** - OpenAI client abstraction with retry logic
2. **WebSocket Service** - Real-time communication abstraction
3. **Repository Service** - Database operations with retry logic
4. **Config Service** - Type-safe environment variable management
5. **Cache Service** - High-performance in-memory caching
6. **Monitoring Service** - Production observability and alerting

## Architecture Principles

### 1. Dependency Injection Pattern
```typescript
// Service Factory Pattern
export function createAIService(options: AIServiceOptions = {}) {
  return new AIService({
    apiKey: options.apiKey || process.env.OPENAI_API_KEY,
    model: options.model || 'gpt-4o-mini',
    timeout: options.timeout || 30000,
    retries: options.retries || 3
  });
}

// Usage in routes
const aiService = createAIService();
```

### 2. Interface-Based Design
```typescript
interface AIServiceInterface {
  processChat(message: string, sessionId: string): Promise<ChatResponse>;
  testConnection(): Promise<boolean>;
  shutdown(): void;
}

interface CacheServiceInterface {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
}
```

### 3. Error Handling Standards
```typescript
// Standardized error response pattern
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Retry logic with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  // Implementation with exponential backoff
}
```

## Implementation Details

### AI Service Architecture
```typescript
export class AIService implements AIServiceInterface {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async processChat(message: string, sessionId: string): Promise<ChatResponse> {
    return await withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: message }],
        temperature: 0.7
      });
      return this.parseResponse(response);
    }, this.config.retries);
  }
}
```

### WebSocket Service Architecture
```typescript
export class WebSocketService implements WebSocketServiceInterface {
  private wss: WebSocketServer;
  private connections: Map<string, WebSocket[]>;

  constructor(config: WebSocketConfig) {
    this.wss = new WebSocketServer(config);
    this.connections = new Map();
  }

  broadcastToUser(userId: string, message: any): void {
    const userConnections = this.connections.get(userId) || [];
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}
```

### Cache Service Architecture
```typescript
export class CacheService implements CacheServiceInterface {
  private cache: Map<string, CacheEntry>;
  private metrics: CacheMetrics;

  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const existing = this.get<T>(key);
    if (existing !== undefined) {
      this.metrics.hits++;
      return existing;
    }
    
    this.metrics.misses++;
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}
```

## Service Integration Patterns

### 1. Cross-Service Communication
```typescript
// Services communicate through well-defined interfaces
export class AnalysisWorkflow {
  constructor(
    private aiService: AIServiceInterface,
    private cacheService: CacheServiceInterface,
    private monitoringService: MonitoringServiceInterface
  ) {}

  async processAnalysis(sessionId: string): Promise<AnalysisResult> {
    const trackerId = this.monitoringService.startPerformanceTracker('analysis');
    
    try {
      // Try cache first
      const cached = await this.cacheService.getOrSet(
        `analysis:${sessionId}`,
        () => this.performAnalysis(sessionId),
        3600 // 1 hour TTL
      );
      
      return cached;
    } finally {
      this.monitoringService.endPerformanceTracker(trackerId);
    }
  }
}
```

### 2. Configuration Management
```typescript
export class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadAndValidateConfig();
  }

  private loadAndValidateConfig(): AppConfig {
    const requiredVars = ['DATABASE_URL', 'OPENAI_API_KEY'];
    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
      database: {
        url: process.env.DATABASE_URL!,
        poolSize: parseInt(process.env.DB_POOL_SIZE || '10')
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY!,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
      }
    };
  }
}
```

## Testing Strategy

### 1. Service Unit Testing
```typescript
describe('AIService', () => {
  let aiService: AIService;
  let mockOpenAI: jest.MockedClass<typeof OpenAI>;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    } as any;

    aiService = new AIService({
      client: mockOpenAI,
      retries: 3,
      timeout: 5000
    });
  });

  it('should process chat with retry logic', async () => {
    // Test retry mechanism
    mockOpenAI.chat.completions.create
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce(mockResponse);

    const result = await aiService.processChat('test message', 'session-1');
    
    expect(result).toBeDefined();
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
  });
});
```

### 2. Integration Testing
```typescript
describe('Cross-Service Integration', () => {
  it('should handle service-to-service communication', async () => {
    const aiService = createAIService();
    const cacheService = createCacheService();
    const workflow = new AnalysisWorkflow(aiService, cacheService);

    const result = await workflow.processAnalysis('test-session');
    
    expect(result).toBeDefined();
    expect(cacheService.getMetrics().hitRate).toBeGreaterThan(0);
  });
});
```

## Performance Characteristics

### Service Performance Benchmarks
- **AI Service**: 3-second timeout with 3 retries
- **Cache Service**: Sub-millisecond operations (GET: <0.5ms, SET: <1ms)
- **WebSocket Service**: Handles 100+ concurrent connections
- **Repository Service**: Connection pooling with 10 max connections

### Memory Management
- **Cache Service**: LRU eviction with configurable max size
- **WebSocket Service**: Automatic cleanup of dead connections
- **AI Service**: Request/response streaming for large payloads

## Migration Impact

### Before Service Layer
```typescript
// Mixed concerns in route handler
app.post('/api/analysis', async (req, res) => {
  // Validation logic
  const { sessionId, message } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  // AI service call
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: message }]
  });

  // Database operations
  const db = new DatabaseManager();
  await db.saveAnalysis(sessionId, response);

  res.json({ result: response });
});
```

### After Service Layer
```typescript
// Clean separation of concerns
app.post('/api/analysis', async (req, res) => {
  try {
    const validationResult = validationService.validateAnalysisRequest(req.body);
    if (!validationResult.success) {
      return res.status(400).json(validationResult.error);
    }

    const result = await analysisWorkflow.processAnalysis(req.body);
    res.json(result);
  } catch (error) {
    const errorResponse = errorHandlingService.handleError(error);
    res.status(errorResponse.status).json(errorResponse);
  }
});
```

## Consequences

### Positive
- **Testability**: Each service can be tested in isolation
- **Reusability**: Services used across multiple route modules
- **Maintainability**: Clear separation of concerns
- **Scalability**: Services can be optimized independently
- **Configuration**: Type-safe environment variable management

### Negative
- **Complexity**: More abstraction layers to understand
- **Initial Overhead**: Time investment to build service layer
- **Learning Curve**: Team needs to understand dependency injection

### Neutral
- **File Count**: More files but each with focused responsibility
- **Test Coverage**: More comprehensive but requires more test maintenance

## Alternatives Considered

### Direct Database/API Calls in Routes
- **Rejected**: Mixed concerns, difficult to test
- **Risk**: Tight coupling between infrastructure and business logic

### Singleton Services
- **Rejected**: Difficult to test, hidden dependencies
- **Risk**: Global state management issues

### Framework-Heavy Approach (e.g., NestJS)
- **Rejected**: Too much framework overhead for current team size
- **Risk**: Learning curve and migration complexity

## Future Considerations

### Service Mesh Architecture
For future scaling, consider:
- Microservices decomposition
- Service discovery mechanisms
- Circuit breaker patterns
- Distributed tracing

### Message Queue Integration
For async processing:
- Redis/RabbitMQ for job queues
- Event-driven architecture
- Saga patterns for distributed transactions

## References
- [Service Layer Testing Documentation](./TESTING_STRATEGY.md)
- [Performance Benchmarks](../server/__tests__/performance/)
- [Configuration Management Guide](./DEPLOYMENT_GUIDE.md)

---

*Created: July 24, 2025*  
*Status: Accepted and Implemented*  
*Impact: High - Fundamental architecture change*
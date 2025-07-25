# KanoLens Testing Strategy

## Overview

KanoLens follows a comprehensive testing strategy that enabled safe refactoring of 10,000+ lines of code from 15% to 80%+ test coverage. This document outlines our testing philosophy, patterns, and best practices.

## Testing Philosophy

### Test-Driven Refactoring Approach
1. **Testing enables refactoring** - Tests provide safety nets for structural changes
2. **Test before refactor** - Always create tests before modifying existing code
3. **Incremental coverage** - Build test coverage systematically across phases
4. **Real behavior testing** - Test actual functionality, not implementation details

### Testing Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /______\
                /        \
               / Integration \
              /______________\
             /                \
            /   Unit Tests      \
           /____________________\
```

- **Unit Tests (70%)**: Individual functions and components
- **Integration Tests (20%)**: Service interactions and API endpoints
- **E2E Tests (10%)**: Complete user workflows

## Test Categories

### 1. Unit Tests
Test individual functions, components, and services in isolation.

**Examples:**
- Service method testing
- Utility function validation
- Component behavior testing
- Error handling scenarios

### 2. Integration Tests
Test interactions between different parts of the system.

**Examples:**
- API endpoint testing
- Database operations
- Service-to-service communication
- WebSocket message handling

### 3. Component Tests
Test React components with user interactions.

**Examples:**
- Form submission workflows
- State management
- Event handling
- Accessibility features

### 4. Performance Tests
Test system performance under various conditions.

**Examples:**
- API response times
- Database query performance
- Memory usage patterns
- Concurrent operation handling

### 5. Safety Net Tests
Comprehensive tests for code about to be refactored.

**Examples:**
- Monster file protection
- Critical path validation
- Regression prevention
- Baseline establishment

## Testing Tools and Setup

### Backend Testing Stack
```json
{
  "test-runner": "vitest",
  "assertions": "vitest/expect",
  "mocking": "vitest mocks",
  "coverage": "@vitest/coverage-v8",
  "http-testing": "supertest"
}
```

### Frontend Testing Stack
```json
{
  "test-runner": "vitest",
  "component-testing": "@testing-library/react",
  "user-interactions": "@testing-library/user-event",
  "dom-testing": "@testing-library/jest-dom",
  "environment": "jsdom"
}
```

### Configuration Files
- `vitest.config.ts` - Main test configuration
- `vitest.backend.config.ts` - Backend-specific settings
- `test-setup.ts` - Global test setup for frontend

## Testing Patterns

### 1. Direct Mocking Pattern
```typescript
// ✅ Good: Direct mocking in test
describe('AIService', () => {
  const mockOpenAI = {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(mockResponse)
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process chat message', async () => {
    const aiService = new AIService({ client: mockOpenAI });
    const result = await aiService.processChat('test message', 'session-1');
    
    expect(result).toBeDefined();
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});
```

### 2. Service Factory Pattern
```typescript
// ✅ Good: Testable service factory
export function createAIService(options: AIServiceOptions = {}) {
  return new AIService({
    client: options.client || new OpenAI(),
    retries: options.retries || 3,
    timeout: options.timeout || 30000
  });
}

// In tests
const mockClient = { /* mock implementation */ };
const aiService = createAIService({ client: mockClient });
```

### 3. Component Testing Pattern
```typescript
// ✅ Good: Behavior-focused component testing
describe('AnalysisForm', () => {
  it('allows submission when required fields are filled', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();
    
    render(<AnalysisForm onSubmit={mockOnSubmit} />);
    
    await user.type(screen.getByLabelText(/Products to Compare/i), 'Canva, Figma');
    await user.type(screen.getByLabelText(/Target Customers/i), 'Small businesses');
    await user.click(screen.getByRole('button', { name: /Start Analysis/i }));
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      products: 'Canva, Figma',
      targetCustomers: 'Small businesses'
    });
  });
});
```

### 4. Integration Testing Pattern
```typescript
// ✅ Good: Real HTTP testing
describe('Session API Integration', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    app = await createApp();
    request = supertest(app);
  });

  it('should create analysis session', async () => {
    const sessionData = {
      description: 'Test analysis',
      products: 'Product A, Product B',
      targetCustomers: 'Test users'
    };

    const response = await request
      .post('/api/analysis/sessions')
      .send(sessionData)
      .expect(201);

    expect(response.body.sessionId).toBeDefined();
    expect(response.body.status).toBe('created');
  });
});
```

### 5. Performance Testing Pattern
```typescript
// ✅ Good: Performance validation
describe('Cache Performance', () => {
  it('should perform operations within acceptable time', async () => {
    const cache = new CacheService({ maxSize: 1000 });
    const iterations = 1000;

    const setStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      cache.set(`key-${i}`, `value-${i}`);
    }
    const setTime = performance.now() - setStart;
    const avgSetTime = setTime / iterations;

    expect(avgSetTime).toBeLessThan(1); // Less than 1ms per SET
    
    const metrics = cache.getMetrics();
    expect(metrics.hitRate).toBeGreaterThan(0.95); // 95%+ hit rate
  });
});
```

## Test Organization

### Directory Structure
```
server/__tests__/
├── README.md                    # Testing standards and patterns
├── setup.ts                     # Global test setup
├── simple-smoke.test.ts         # Basic environment tests
├── routes/                      # Route integration tests
│   ├── auth-integration.test.ts
│   ├── sessions-integration.test.ts
│   └── messages-integration.test.ts
├── services/                    # Service unit tests
│   ├── ai-service.test.ts
│   ├── cache-service.test.ts
│   └── websocket-service.test.ts
├── utils/                       # Utility function tests
│   └── validation.test.ts
├── workflows/                   # Workflow component tests
│   └── workflow-structure.test.ts
├── performance/                 # Performance test suites
│   ├── api-performance.test.ts
│   ├── cache-performance.test.ts
│   └── database-performance.test.ts
└── safety-nets/                # Pre-refactoring safety tests
    ├── routes-safety-net.test.ts
    ├── orchestrator-safety-net.test.ts
    └── openai-safety-net.test.ts

client/__tests__/
├── components/                  # Component tests
│   └── Workflow/
│       └── WorkflowStepsRefactored.test.tsx
└── features/                    # Feature-based tests
    └── analysis/
        └── components/
            ├── AnalysisForm.test.tsx
            └── ProgressTracker.test.tsx
```

### Test Naming Conventions
```typescript
// ✅ Good: Descriptive test names
describe('AIService Chat Processing', () => {
  it('should process chat message and return AI response', () => {});
  it('should retry on rate limit errors', () => {});
  it('should handle timeout errors gracefully', () => {});
  it('should validate session ID before processing', () => {});
});

// ✅ Good: Component behavior descriptions
describe('AnalysisForm Component', () => {
  describe('Form Validation', () => {
    it('prevents submission when required fields are empty', () => {});
    it('allows submission when required fields are filled', () => {});
    it('displays validation errors for invalid input', () => {});
  });

  describe('Form Interaction', () => {
    it('updates form data when user types in fields', () => {});
    it('calls onSubmit with correct data structure', () => {});
    it('shows loading state during submission', () => {});
  });
});
```

## Test Data Management

### Mock Data Patterns
```typescript
// ✅ Good: Reusable mock factories
export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-123',
  description: 'Test analysis',
  products: ['Product A', 'Product B'],
  targetCustomers: 'Test users',
  status: 'active',
  createdAt: new Date().toISOString(),
  ...overrides
});

export const createMockAIResponse = (overrides: Partial<AIResponse> = {}): AIResponse => ({
  content: 'Test AI response',
  role: 'assistant',
  metadata: { confidence: 0.95 },
  ...overrides
});
```

### Environment Setup
```typescript
// test-setup.ts
beforeEach(() => {
  // Reset environment variables for each test
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'test://localhost/test';
  process.env.OPENAI_API_KEY = 'test-key';
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
```

## Coverage Requirements

### Minimum Coverage Targets
- **Overall Coverage**: 80%+
- **Critical Paths**: 100%
- **New Code**: 90%+
- **Service Layer**: 95%+
- **Route Handlers**: 85%+

### Coverage Exclusions
```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'node_modules/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/coverage/**',
        '**/dist/**',
        '**/*.old.*'
      ]
    }
  }
});
```

## Continuous Integration

### Test Automation
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run lint
      - run: npm run typecheck
```

### Quality Gates
- All tests must pass before merge
- Coverage must not decrease below 80%
- No linting errors allowed
- Type checking must pass

## Common Patterns

### Testing Async Operations
```typescript
// ✅ Good: Proper async testing
it('should handle async operations correctly', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
});

// ✅ Good: Testing with waitFor
it('should update UI after async operation', async () => {
  render(<Component />);
  
  fireEvent.click(screen.getByRole('button'));
  
  await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

### Testing Error Scenarios
```typescript
// ✅ Good: Comprehensive error testing
it('should handle service errors gracefully', async () => {
  const mockService = {
    processData: vi.fn().mockRejectedValue(new Error('Service error'))
  };

  const result = await processWithService(mockService);
  
  expect(result.success).toBe(false);
  expect(result.error).toContain('Service error');
});
```

### Testing Real-time Features
```typescript
// ✅ Good: WebSocket testing
it('should handle real-time updates', async () => {
  const mockWebSocket = {
    send: vi.fn(),
    addEventListener: vi.fn(),
    readyState: WebSocket.OPEN
  };

  const service = new WebSocketService(mockWebSocket);
  service.broadcastToUser('user-123', { type: 'progress', value: 50 });

  expect(mockWebSocket.send).toHaveBeenCalledWith(
    JSON.stringify({ type: 'progress', value: 50 })
  );
});
```

## Performance Testing

### Benchmarking Pattern
```typescript
describe('Performance Benchmarks', () => {
  it('should meet response time requirements', async () => {
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      times.push(performance.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
    const maxTime = Math.max(...times);

    expect(avgTime).toBeLessThan(100); // 100ms average
    expect(maxTime).toBeLessThan(500);  // 500ms max
  });
});
```

### Load Testing
```typescript
describe('Load Testing', () => {
  it('should handle concurrent requests', async () => {
    const concurrentRequests = 10;
    const promises = Array(concurrentRequests).fill(null).map(() => 
      request.get('/api/health')
    );

    const results = await Promise.all(promises);
    
    results.forEach(result => {
      expect(result.status).toBe(200);
    });
  });
});
```

## Debugging Tests

### Common Issues and Solutions

#### Test Timeouts
```typescript
// ❌ Bad: Long running operations without timeout
it('should process data', async () => {
  await veryLongOperation(); // May timeout
});

// ✅ Good: Explicit timeout or mocking
it('should process data', async () => {
  const mockOperation = vi.fn().mockResolvedValue('result');
  const result = await processWithMock(mockOperation);
  expect(result).toBe('result');
}, 10000); // 10 second timeout if needed
```

#### Mock Issues
```typescript
// ❌ Bad: Global mocks that leak between tests
beforeAll(() => {
  global.fetch = vi.fn();
});

// ✅ Good: Clean mocks for each test
beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

#### Component Testing Issues
```typescript
// ❌ Bad: Testing implementation details
expect(component.state.isLoading).toBe(true);

// ✅ Good: Testing user-visible behavior
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

## Best Practices

### DO
- Write tests before refactoring existing code
- Use descriptive test names that explain behavior
- Test user-visible behavior, not implementation details
- Mock external dependencies consistently
- Clean up after each test
- Use factories for test data creation
- Test error scenarios and edge cases
- Measure and validate performance requirements

### DON'T
- Test implementation details
- Write tests that depend on other tests
- Use global state that leaks between tests
- Ignore failing tests
- Skip testing error scenarios
- Test multiple concerns in a single test
- Use hardcoded timeouts without justification
- Commit tests that are flaky or unreliable

## References

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Architecture Decisions](./ADR_001_TEST_DRIVEN_REFACTORING.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

### Test Examples
- [Backend Tests](../server/__tests__/)
- [Component Tests](../client/__tests__/)
- [Performance Tests](../server/__tests__/performance/)

### External Resources
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

*Last Updated: July 24, 2025*  
*Test Coverage: 80%+*  
*Strategy Version: 2.0*
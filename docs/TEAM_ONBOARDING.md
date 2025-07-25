# KanoLens Team Onboarding Guide

## Welcome to KanoLens! 🎯

This guide will help you get up to speed with our AI-powered competitive analysis platform. KanoLens has been systematically refactored using a test-driven approach, resulting in a clean, maintainable codebase with 80%+ test coverage.

## Project Overview

### What is KanoLens?
KanoLens is an AI-powered competitive analysis platform that helps businesses understand their competitive landscape using the Kano Model methodology. The platform orchestrates multiple AI agents to research, validate, analyze, and evaluate competitive data.

### Key Features
- **Multi-Agent AI System**: Researcher, Validator, Analyst, and Evaluator agents
- **Real-time Analysis**: WebSocket-powered progress tracking
- **Kano Model Integration**: Advanced competitive analysis methodology
- **Export Capabilities**: PDF and PowerPoint generation
- **Performance Optimized**: Sub-second response times with caching

### Technology Stack
```
Frontend:  React + TypeScript + Vite + TailwindCSS
Backend:   Node.js + Express + TypeScript
Database:  PostgreSQL (via Supabase)
AI:        OpenAI GPT-4o-mini
Testing:   Vitest + React Testing Library
Deployment: Railway / Vercel
```

## Architecture Overview

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │───▶│  Express API    │───▶│   AI Agents     │
│                 │    │                 │    │                 │
│ • WorkflowSteps │    │ • Route Modules │    │ • Researcher    │
│ • ProgressTracker│   │ • Service Layer │    │ • Validator     │
│ • Export Tools  │    │ • WebSocket Hub │    │ • Analyst       │
└─────────────────┘    └─────────────────┘    │ • Evaluator     │
                                               └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Database      │
                       │                 │
                       │ • Sessions      │
                       │ • Messages      │
                       │ • Analysis Data │
                       └─────────────────┘
```

### Service Layer Architecture
Our service layer provides clean abstractions for:
- **AI Service**: OpenAI client with retry logic and error handling
- **WebSocket Service**: Real-time communication management
- **Repository Service**: Database operations with connection pooling
- **Cache Service**: High-performance in-memory caching (LRU eviction)
- **Monitoring Service**: Production observability and alerting
- **Config Service**: Type-safe environment variable management

## Development Environment Setup

### Prerequisites Checklist
- [ ] Node.js 18.x+ installed
- [ ] npm 9.x+ installed
- [ ] Git configured with your credentials
- [ ] Access to company OpenAI API key
- [ ] Access to Supabase project (or local PostgreSQL)
- [ ] Code editor with TypeScript support (VS Code recommended)

### Quick Start (5 minutes)
```bash
# 1. Clone and setup
git clone https://github.com/your-org/kanolens.git
cd kanolens
npm install

# 2. Environment setup
cp .env.example .env.local
# Edit .env.local with your configuration (see below)

# 3. Verify setup
npm run check-env

# 4. Start development
npm run dev
```

### Environment Configuration
Create `.env.local` with these variables:
```bash
# Database (get from team lead)
DATABASE_URL=postgresql://user:password@host:port/kanolens_dev
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# AI Services (get from team lead)
OPENAI_API_KEY=sk-your-dev-key
OPENAI_MODEL=gpt-4o-mini

# Development settings
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug
```

### Verification Steps
```bash
# Check all systems
npm run check-env        # Environment variables
npm test                 # Run test suite
npm run lint            # Code quality
npm run typecheck       # TypeScript validation
npm run dev             # Start development servers

# Open in browser
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
# API Health: http://localhost:3001/health
```

## Codebase Overview

### Project Structure
```
kanolens/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Chat/              # Chat interface components
│   │   │   ├── KanoTable/         # Analysis results table
│   │   │   ├── Workflow/          # Main workflow components
│   │   │   └── ui/                # Shadcn/ui components
│   │   ├── features/              # Feature-based architecture
│   │   │   └── analysis/          # Analysis workflow features
│   │   │       └── components/    # Feature-specific components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Utilities and configurations
│   │   └── pages/                 # Page components
│   └── __tests__/                 # Frontend tests
├── server/                          # Express backend
│   ├── agents/                    # AI agent implementations
│   │   ├── researcher.ts          # Product research agent
│   │   ├── validator.ts           # Data validation agent
│   │   ├── analyst.ts             # Analysis processing agent
│   │   └── evaluator.ts           # Final evaluation agent
│   ├── routes/                    # Route modules (Phase 3 refactor)
│   │   ├── auth.ts                # Authentication routes
│   │   ├── sessions.ts            # Session management
│   │   ├── messages.ts            # Chat messaging
│   │   ├── analysis.ts            # Analysis operations
│   │   ├── export.ts              # PDF/PowerPoint export
│   │   └── health.ts              # Health check endpoints
│   ├── services/                  # Service layer (Phase 2 refactor)
│   │   ├── ai-service.ts          # OpenAI abstraction
│   │   ├── websocket-service.ts   # Real-time communication
│   │   ├── repository-service.ts  # Database operations
│   │   ├── cache-service.ts       # Caching layer
│   │   ├── monitoring-service.ts  # Observability
│   │   └── config-service.ts      # Configuration management
│   ├── workflows/                 # Workflow components (Phase 3 refactor)
│   │   ├── AnalysisWorkflow.ts    # Main analysis orchestration
│   │   ├── ProgressTracker.ts     # Progress tracking logic
│   │   └── ErrorHandler.ts       # Error handling and recovery
│   ├── utils/                     # Utility functions
│   └── __tests__/                 # Backend tests
├── docs/                            # Documentation (Phase 6)
│   ├── API_DOCUMENTATION.md       # Complete API reference
│   ├── TESTING_STRATEGY.md        # Testing patterns and best practices
│   ├── DEPLOYMENT_GUIDE.md        # Setup and deployment procedures
│   ├── ADR_001_TEST_DRIVEN_REFACTORING.md  # Architecture decisions
│   ├── ADR_002_SERVICE_LAYER_ARCHITECTURE.md
│   └── TEAM_ONBOARDING.md         # This file
└── shared/                          # Shared TypeScript types
    └── schema.ts                   # Database and API schemas
```

### Key Design Patterns

#### 1. Service Layer Pattern
All business logic is abstracted into services with dependency injection:
```typescript
// ✅ Good: Service factory pattern
export function createAIService(options: AIServiceOptions = {}) {
  return new AIService({
    client: options.client || new OpenAI(),
    retries: options.retries || 3,
    timeout: options.timeout || 30000
  });
}

// Usage in routes
const aiService = createAIService();
const result = await aiService.processChat(message, sessionId);
```

#### 2. Component Composition Pattern
React components are built with composition and reusability:
```typescript
// ✅ Good: Composable components
<WorkflowStepsRefactored onAnalysisComplete={handleComplete}>
  <AnalysisForm onSubmit={handleFormSubmit} />
  <ProgressTracker sessionId={sessionId} />
  <SuggestionsReview onUpdate={handleSuggestions} />
</WorkflowStepsRefactored>
```

#### 3. Error Handling Pattern
Consistent error handling across all services:
```typescript
// ✅ Good: Standardized error responses
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

## Development Workflow

### Git Workflow
```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes with frequent commits
git add .
git commit -m "feat: add user authentication validation"

# 3. Run quality checks before push
npm test                # All tests must pass
npm run lint           # No linting errors
npm run typecheck      # No TypeScript errors

# 4. Push and create PR
git push -u origin feature/your-feature-name
# Create PR via GitHub/GitLab
```

### Commit Message Format
```bash
# Format: type(scope): description
feat(auth): add session validation middleware
fix(cache): resolve memory leak in LRU eviction
docs(api): update endpoint documentation
test(components): add edge case tests for AnalysisForm
refactor(services): extract database retry logic
```

### Code Review Checklist
- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript types are correct (`npm run typecheck`)
- [ ] New features have tests
- [ ] API changes are documented
- [ ] Performance impact considered
- [ ] Security implications reviewed

## Testing Approach

### Our Testing Philosophy
KanoLens follows a **Test-Driven Refactoring** approach where tests enable safe code changes:

1. **Test before refactor** - Always create tests before modifying code
2. **Behavior over implementation** - Test what users see, not internal details
3. **Comprehensive coverage** - Aim for 80%+ coverage on all new code
4. **Real testing** - Use actual HTTP requests and component interactions

### Testing Patterns You'll Use

#### Component Testing
```typescript
// ✅ Good: Test user behavior
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

#### Service Testing
```typescript
// ✅ Good: Test service behavior with mocks
describe('AIService', () => {
  it('should retry on rate limit errors', async () => {
    const mockClient = {
      chat: { completions: { create: vi.fn() } }
    };
    
    mockClient.chat.completions.create
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockResolvedValueOnce(mockResponse);

    const aiService = createAIService({ client: mockClient, retries: 3 });
    const result = await aiService.processChat('test message', 'session-1');
    
    expect(result).toBeDefined();
    expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
  });
});
```

#### Integration Testing
```typescript
// ✅ Good: Test real HTTP endpoints
describe('Session API', () => {
  it('should create and retrieve sessions', async () => {
    const sessionData = {
      description: 'Test analysis',
      products: 'Product A, Product B',
      targetCustomers: 'Test users'
    };

    // Create session
    const createResponse = await request
      .post('/api/analysis/sessions')
      .send(sessionData)
      .expect(201);

    const sessionId = createResponse.body.sessionId;
    expect(sessionId).toBeDefined();

    // Retrieve session
    const getResponse = await request
      .get(`/api/analysis/sessions/${sessionId}`)
      .expect(200);

    expect(getResponse.body.session.products).toEqual(['Product A', 'Product B']);
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test files
npm test -- AnalysisForm.test.tsx
npm test -- services/ai-service.test.ts

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Debug tests
npm test -- --inspect-brk
```

## Common Tasks

### Adding a New API Endpoint
```typescript
// 1. Add route to appropriate module
// server/routes/analysis.ts
router.post('/api/analysis/new-feature', async (req, res) => {
  try {
    const result = await analysisService.processNewFeature(req.body);
    res.json(result);
  } catch (error) {
    const errorResponse = errorHandlingService.handleError(error);
    res.status(errorResponse.status).json(errorResponse);
  }
});

// 2. Add service method
// server/services/analysis-service.ts
async processNewFeature(data: NewFeatureRequest): Promise<NewFeatureResponse> {
  const trackerId = this.monitoring.startPerformanceTracker('new-feature');
  try {
    // Implementation
    return result;
  } finally {
    this.monitoring.endPerformanceTracker(trackerId);
  }
}

// 3. Add tests
// server/__tests__/routes/analysis-integration.test.ts
describe('New Feature Endpoint', () => {
  it('should process new feature request', async () => {
    const response = await request
      .post('/api/analysis/new-feature')
      .send(testData)
      .expect(200);
    
    expect(response.body.result).toBeDefined();
  });
});

// 4. Update API documentation
// docs/API_DOCUMENTATION.md
```

### Adding a New React Component
```typescript
// 1. Create component with TypeScript
// client/src/components/NewFeature/NewFeature.tsx
interface NewFeatureProps {
  data: FeatureData;
  onAction: (action: string) => void;
}

export function NewFeature({ data, onAction }: NewFeatureProps) {
  // Implementation
  return <div>...</div>;
}

// 2. Add tests first (TDD approach)
// client/__tests__/components/NewFeature.test.tsx
describe('NewFeature Component', () => {
  it('should render feature data correctly', () => {
    render(<NewFeature data={mockData} onAction={mockFn} />);
    expect(screen.getByText('Expected Content')).toBeInTheDocument();
  });
});

// 3. Export from index
// client/src/components/index.ts
export { NewFeature } from './NewFeature/NewFeature';
```

### Adding a New Service
```typescript
// 1. Create service interface
// server/services/new-service.ts
interface NewServiceInterface {
  processData(input: InputType): Promise<OutputType>;
  healthCheck(): Promise<boolean>;
}

export class NewService implements NewServiceInterface {
  constructor(private config: NewServiceConfig) {}
  
  async processData(input: InputType): Promise<OutputType> {
    // Implementation with error handling
  }
}

// 2. Create factory function
export function createNewService(options: NewServiceOptions = {}) {
  return new NewService({
    timeout: options.timeout || 30000,
    retries: options.retries || 3
  });
}

// 3. Add comprehensive tests
// server/__tests__/services/new-service.test.ts
describe('NewService', () => {
  let newService: NewService;
  
  beforeEach(() => {
    newService = createNewService({ timeout: 5000 });
  });
  
  it('should process data successfully', async () => {
    const result = await newService.processData(testInput);
    expect(result).toBeDefined();
  });
});
```

## Performance Considerations

### Frontend Performance
- **Bundle Size**: Target <2MB total bundle size
- **Code Splitting**: Use lazy loading for routes
- **Memoization**: Use React.memo for expensive components
- **State Management**: Use React Query for server state

### Backend Performance
- **Caching**: Cache responses for 5+ minutes when possible
- **Database**: Use connection pooling and indexed queries
- **AI Requests**: Implement retry logic with exponential backoff
- **Monitoring**: Track all operations >100ms

### Performance Testing
```typescript
// Add performance tests for new features
describe('Performance Tests', () => {
  it('should respond within acceptable time', async () => {
    const start = performance.now();
    await yourOperation();
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000); // 1 second max
  });
});
```

## Debugging Guide

### Frontend Debugging
```bash
# React DevTools in browser
# Redux DevTools for state inspection

# Console debugging
console.log('Debug info:', { data, state });

# Network tab for API calls
# Sources tab for breakpoints
```

### Backend Debugging
```bash
# Enable debug logging
DEBUG=kanolens:* npm run dev

# Node.js inspector
node --inspect server/index.js
# Open chrome://inspect in Chrome

# API testing
curl -X POST http://localhost:3001/api/test-endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Common Issues and Solutions

#### "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check import paths are correct
# Use absolute imports with @/ prefix
```

#### Database connection issues
```bash
# Test connection manually
npm run db:test

# Check environment variables
echo $DATABASE_URL

# Verify database is running
psql $DATABASE_URL -c "SELECT 1;"
```

#### OpenAI API issues
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check rate limits in logs
# Implement exponential backoff
```

## Team Resources

### Documentation
- **API Reference**: [docs/API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Testing Guide**: [docs/TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- **Deployment**: [docs/DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Architecture Decisions**: [docs/ADR_001_TEST_DRIVEN_REFACTORING.md](./ADR_001_TEST_DRIVEN_REFACTORING.md)

### Development Tools
- **Code Editor**: VS Code with TypeScript, ESLint, Prettier extensions
- **Database**: Supabase Dashboard for database management
- **API Testing**: Insomnia/Postman collections (ask team lead)
- **Monitoring**: Application health dashboard at `/api/health/full`

### Team Communication
- **Daily Standups**: [Time and location]
- **Code Reviews**: All PRs require review
- **Architecture Discussions**: [Slack channel or meeting]
- **Emergency Contact**: [On-call information]

### Getting Help
1. **Documentation First**: Check relevant docs in `/docs/`
2. **Search Codebase**: Use VS Code search or `grep` to find examples
3. **Ask Team**: [Team Slack channel or contact]
4. **Create Issues**: For bugs or feature requests

## Your First Week Goals

### Day 1-2: Environment & Understanding
- [ ] Complete development environment setup
- [ ] Run all tests successfully
- [ ] Explore codebase structure
- [ ] Read architecture documentation
- [ ] Complete first small task (bug fix or documentation improvement)

### Day 3-4: Code Contribution
- [ ] Create first feature branch
- [ ] Implement small feature or improvement
- [ ] Write tests for your changes
- [ ] Submit first pull request
- [ ] Address code review feedback

### Day 5: Integration & Planning
- [ ] Attend team meetings and standups
- [ ] Understand current sprint goals
- [ ] Plan larger feature contribution
- [ ] Set up monitoring and debugging tools
- [ ] Review team processes and workflows

## Advanced Topics

Once you're comfortable with the basics, explore these advanced areas:

### AI Agent Architecture
- Study the multi-agent system in `/server/agents/`
- Understand prompt engineering patterns
- Learn about AI agent orchestration workflows

### Performance Optimization
- Review caching strategies in `/server/services/cache-service.ts`
- Understand bundle optimization in `vite.config.ts`
- Study performance test patterns in `/server/__tests__/performance/`

### Production Deployment
- Learn Kubernetes configuration in `/k8s/`
- Understand health check patterns in `/server/routes/health.ts`
- Study monitoring and observability setup

### Testing Strategies
- Master test-driven development patterns
- Learn performance testing techniques
- Understand integration test design

## Next Steps

Welcome to the team! Your first priority should be getting the development environment running and understanding our codebase structure. Don't hesitate to ask questions - we're here to help you succeed.

**Remember**: KanoLens was built with a test-driven approach that prioritizes safety and reliability. Always write tests for your changes and follow our established patterns.

---

*Last Updated: July 24, 2025*  
*Team Lead: [Contact Information]*  
*Next Onboarding Review: [Schedule follow-up]*
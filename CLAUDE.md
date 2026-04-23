# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
- `npm run dev` - Start development server (port 3006)
- `npm run dev:clean` - Kill processes and start clean dev server
- `npm run build` - Build for production (Vite + ESBuild)
- `npm run start` - Start production server

### Testing
- `npm run test` - Run all tests (Vitest)
- `npm run test:frontend` - Run frontend tests only (client/ directory)
- `npm run test:backend` - Run backend tests only (server/ directory)  
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Type Checking & Quality
- `npm run check` - TypeScript type checking
- `npm run build:analyze` - Build and analyze bundle size
- `npm run analyze-bundle` - Bundle analysis only

### Database
- `npm run db:push` - Push schema changes to database (Drizzle)

### Process Management (Windows)
- `npm run kill-processes` - Stop all Node processes
- `npm run health-check` - Check if server is responding
- `npm run port-check` - Check port 3006 usage

## Architecture Overview

KanoLens is an AI-powered competitive analysis platform that uses the Kano Model framework. It features a multi-agent analysis system with specialized AI agents working in sequence.

### Full-Stack Structure
- **Frontend**: React + TypeScript + Vite (client/)
- **Backend**: Express.js + TypeScript (server/)
- **Database**: PostgreSQL with Drizzle ORM (shared/schema.ts)
- **AI Integration**: OpenAI + Anthropic APIs with LangSmith tracing
- **Authentication**: JWT-based with Google OAuth support

### Multi-Agent System
The core analysis workflow uses 5 specialized agents:
1. **Orchestrator** - Coordinates the entire workflow and manages progress
2. **Researcher** - Gathers product data and features using web search
3. **Validator** - Categorizes features into Kano model categories
4. **Analyst** - Generates strategic insights and recommendations  
5. **Evaluator** - Assesses agent performance and accuracy

Agent workflow sequence: Orchestrator → Researcher → Validator → Analyst → Evaluator

### Key Directories
- `client/src/` - React frontend components and pages
- `server/` - Express backend with routes, agents, and services
- `server/agents/` - AI agent implementations
- `server/routes/` - API route modules (auth, analysis, sessions, etc.)
- `shared/` - Database schema and shared types
- `docs/` - Architecture and planning documentation

### Database Schema
Uses Drizzle ORM with PostgreSQL. Key tables:
- `users` - User authentication and analysis limits
- `sessions` - Session storage for authentication
- `passwordResetTokens` - Password reset functionality
- Analysis data stored in JSON format

### Configuration
- Environment variables for database connection (DATABASE_URL or PG* vars)
- Separate Vitest configs for frontend/backend testing
- TypeScript path aliases: `@/*` for client/src, `@shared/*` for shared

### Testing Strategy
- Frontend tests use JSDOM environment with React Testing Library
- Backend tests use Node environment with supertest
- Coverage thresholds set at 80% for all metrics
- Separate test suites for agents, routes, services, and workflows

## Important Implementation Notes

### Agent System Rules
- Kano model compliance: 100% of user-approved features, max 50 in final table
- Progress tracking with real-time WebSocket updates
- LangSmith integration for AI tracing and monitoring

### Authentication Flow
- JWT-based authentication with refresh tokens
- Google OAuth integration available
- Development mode auto-creates dev user

### Development Environment
- Uses tsx for TypeScript execution in development
- Vite dev server for hot module replacement
- Express serves both API and static files
- WebSocket service for real-time updates

### Performance Considerations
- Bundle analysis available via `npm run analyze-bundle`
- Caching service for AI responses (server/services/cache-service.ts)
- Enhanced rate limiting on AI API endpoints
- Rate limiting on web API endpoints
- Graceful shutdown handling for WebSocket connections
- Parallel processing optimization for agent workflows

## REFACTORING RULES - ZERO TOLERANCE POLICY

### CRITICAL REQUIREMENTS
- **NEVER CREATE STUBS OR PLACEHOLDERS** - This is a TOTAL FAILURE
- **PRESERVE ALL FUNCTIONALITY** - Any missing functionality = complete failure
- **NO IMPROVEMENTS OR ENHANCEMENTS** - Only restructure, don't add features
- **MOVE CODE, DON'T REWRITE** - Transfer existing logic intact

### TESTING REQUIREMENTS
- Run tests after EVERY change
- If tests fail, immediately fix before proceeding
- Create tests if none exist before refactoring

### VALIDATION PROCESS
- Before declaring success, verify all original functionality works
- Check that all edge cases are preserved
- Confirm no performance regressions

### LINTING AND TYPE CHECKING
When completing a task, MUST run these commands if available:
- `npm run check` - Check for type errors
- Fix any issues before considering the task complete

## Important Files and Conventions

### Project Structure Notes
- Uses ES modules (type: "module" in package.json)
- TypeScript with path aliases: `@/*` → client/src/, `@shared/*` → shared/
  - Example: `import { Button } from "@/components/ui/button"`
  - Example: `import { users } from "@shared/schema"`
- Separate Vitest configurations for frontend (jsdom) and backend (node)
- Windows-specific process management commands available
- Development uses tsx for TypeScript execution

### AI Integration
- LangSmith tracing integrated for monitoring AI agent performance
- OpenAI and Anthropic APIs configured with rate limiting
- Caching layer for AI responses to improve performance
- Enhanced rate limiting for AI endpoints to prevent quota exhaustion

### Single Test Execution
- Frontend single test: `npx vitest run --config vitest.config.ts path/to/test.test.tsx`
- Backend single test: `npx vitest run --config vitest.backend.config.ts path/to/test.test.ts`
- Watch mode for single test: Add `--watch` flag to above commands
- Test setup files: `test-setup.ts` (frontend), `server/__tests__/setup.ts` (backend)

### Bundle Analysis
- Production bundle analyzer available via `npm run build:analyze`
- Separate analyze command: `npm run analyze-bundle`
- Results saved to `reports/` directory with timestamps
- Manual chunk splitting configured for vendor libraries, UI components, routing, and utils
- Optimized asset naming with hash-based cache busting

### Environment Setup
- PostgreSQL database required (local or cloud)
- Environment variables: DATABASE_URL or individual PG_* variables
- Development auto-creates dev user for testing
- WebSocket service runs alongside HTTP server on same port (3006)
- Real-time progress updates via WebSocket connections
- Graceful WebSocket shutdown handling implemented

### Testing Coverage Requirements
- 80% threshold for all metrics (branches, functions, lines, statements)
- Frontend tests in client/__tests__/ with React Testing Library + JSDOM
- Backend tests in server/__tests__/ with Node environment + supertest
- Agent-specific tests in server/agents/__tests__/ for AI workflow validation

## Development Guidelines

### File Creation Policy
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
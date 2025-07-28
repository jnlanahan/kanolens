# KanoLens Architectural Diagrams

This directory contains comprehensive architectural diagrams for the KanoLens system, providing visual representations of the system's structure, data flow, and deployment architecture.

## Diagram Overview

### 1. Database Schema Diagram (`database-schema-diagram.svg`)
- **Purpose**: Visual representation of the PostgreSQL database structure
- **Contents**: 
  - All 9 database tables with fields and relationships
  - Primary keys, foreign keys, and indexes
  - Data types and constraints
  - Relationship mappings between entities

**Key Tables**:
- `users` - User authentication and profile data
- `analysis_sessions` - Core analysis workflow state
- `chat_messages` - Real-time chat interface data
- `agent_evaluations` - AI agent performance tracking
- `user_feedback` - User interaction feedback
- `shared_analyses` - Public sharing functionality
- `documents` - File upload and content storage
- `password_reset_tokens` - Security token management
- `sessions` - Session management for authentication

### 2. API Architecture Diagram (`api-architecture-diagram.svg`)
- **Purpose**: Layered view of the Express.js API architecture
- **Contents**:
  - Frontend Layer (React components)
  - API Gateway Layer (middleware, authentication, rate limiting)
  - API Routes Layer (REST endpoints)
  - Service Layer (business logic, AI services)
  - Data Layer (database, external APIs)

**Key API Endpoints**:
- Authentication: `/api/auth/*` (login, register, OAuth)
- Analysis: `/api/analysis/*` (start, suggestions, regenerate)
- Sessions: `/api/sessions/*` (CRUD operations)
- Messages: `/api/messages/*` (chat interface)
- Export: `/api/export/*` (PDF, PowerPoint, sharing)
- Health: `/api/health` (system monitoring)

### 3. System Deployment Diagram (`system-deployment-diagram.svg`)
- **Purpose**: Infrastructure and deployment architecture
- **Contents**:
  - Production Environment (frontend, backend, database, cache)
  - Development Environment (local setup, testing)
  - External AI Services (OpenAI, Claude, Perplexity, Google OAuth)
  - CI/CD Pipeline (GitHub Actions, testing, deployment)

**Deployment Components**:
- **Production**: Vite build, Express.js backend, PostgreSQL, Redis cache
- **Development**: Local dev servers, test database, testing suite
- **External**: OpenAI GPT-4o/o1, Claude (Anthropic), Perplexity AI, Google OAuth
- **CI/CD**: Automated testing, build pipeline, deployment, monitoring

### 4. Data Flow Diagram (`data-flow-diagram.svg`)
- **Purpose**: End-to-end analysis workflow and data movement
- **Contents**:
  - 7-step analysis process flow
  - Multi-agent coordination patterns
  - Database layer interactions
  - Real-time communication (WebSocket)
  - External API integrations

**Analysis Workflow**:
1. **User Input** - Analysis setup form with products and features
2. **Orchestrator Agent** (OpenAI GPT-4o) - Workflow coordination
3. **Research Agent** (Perplexity AI) - Product research and feature discovery
4. **Validator Agent** (Claude) - Kano categorization and quality control
5. **Analyst Agent** (OpenAI o1) - Strategic analysis and recommendations
6. **Evaluator Agent** (OpenAI GPT-4o) - Performance evaluation
7. **Final Output** - Interactive Kano Model analysis with export options

## Multi-Agent Architecture

The system employs a sophisticated 5-agent architecture:

- **Orchestrator**: Coordinates the entire analysis workflow, manages progress, and handles user interactions
- **Researcher**: Conducts comprehensive product research using Perplexity AI for real-time web data
- **Validator**: Uses Claude (Anthropic) for Kano Model categorization and quality validation
- **Analyst**: Employs OpenAI o1 for deep strategic analysis and competitive insights
- **Evaluator**: Monitors and evaluates agent performance for continuous improvement

## Technology Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- Radix UI components
- Real-time WebSocket communication

### Backend
- Express.js with TypeScript
- Drizzle ORM for database operations
- JWT authentication with Google OAuth
- WebSocket for real-time updates
- Rate limiting and security middleware

### Database
- PostgreSQL with SSL encryption
- Automated backups and high availability
- Connection pooling for performance
- Redis for caching and session storage

### AI Services
- **OpenAI**: GPT-4o (Orchestrator, Evaluator), o1 (Analyst)
- **Anthropic**: Claude (Validator)
- **Perplexity**: Research Agent with citations

### Deployment
- Production: Managed hosting with auto-scaling
- CI/CD: GitHub Actions with automated testing
- Monitoring: Health checks and performance tracking
- Security: HTTPS/SSL, environment-based configuration

## Usage

These diagrams serve multiple purposes:

1. **Development Reference**: Understanding system architecture for new developers
2. **Documentation**: Visual documentation for stakeholders and users
3. **Planning**: Architecture planning for future enhancements
4. **Debugging**: System troubleshooting and issue resolution
5. **Onboarding**: Team member onboarding and training

## File Formats

All diagrams are provided in SVG format for:
- Scalability without quality loss
- Web browser compatibility
- Easy integration into documentation
- Version control friendly (text-based)

## Maintenance

These diagrams should be updated when:
- Database schema changes occur
- New API endpoints are added
- Deployment architecture evolves
- Agent workflow modifications are made
- External service integrations change

For questions or updates to these diagrams, please refer to the main project documentation or contact the development team.

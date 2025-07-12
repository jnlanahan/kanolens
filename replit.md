# KanoLens Project Documentation

## Overview
KanoLens is an AI-powered competitive analysis platform that transforms complex product research into actionable insights using advanced machine learning and semantic search technologies. The platform helps users analyze competitors using the Kano Model framework to categorize features as Must-have, Performance, or Delighter features.

## Recent Changes
- **January 2025**: Multi-agent architecture implementation complete
  - Successfully implemented 4-agent architecture with specialized roles:
    - Agent 1: Orchestrator (OpenAI GPT-4o) - Form processing, coordination, progress tracking
    - Agent 2: Researcher (Perplexity AI) - Market research for products and features
    - Agent 3: Validator (Claude/Anthropic) - Kano categorization and feature rating
    - Agent 4: Analyst (OpenAI o1) - Strategic analysis and recommendations
  - Created comprehensive test suite for all agents with proper test coverage
  - Integrated multi-agent system into existing openai.ts without frontend changes
  - Maintained exact same UI/UX while backend now uses multi-agent coordination
  - Added progress tracking through multi-agent workflow
  - All agents work together seamlessly to produce comprehensive Kano analysis

## Project Architecture

### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Shadcn/ui with Tailwind CSS
- **Styling**: Tailwind CSS with custom glass morphism effects

### Backend
- **Server**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth
- **AI Integration** (Multi-Agent System Implemented):
  - OpenAI GPT-4o - Orchestrator agent for coordination and synthesis
  - Perplexity AI - Research agent for market intelligence gathering
  - Anthropic Claude - Validator agent for Kano categorization
  - OpenAI o1 - Analyst agent for strategic insights and recommendations

### Key Features
1. **Competitive Analysis**: AI-powered analysis of products and features
2. **Kano Model Categorization**: Automatic categorization of features into Must-have, Performance, and Delighter
3. **Progress Tracking**: Real-time progress tracking with visual indicators
4. **Session Management**: Multiple analysis sessions with persistent storage
5. **Interactive Chat Interface**: Conversational UI for gathering requirements
6. **Visual Kano Table**: Interactive table showing competitive analysis results

### Multi-Agent Architecture (Implemented)
The application now uses a sophisticated multi-agent system with the following agents:

1. **Orchestrator Agent (OpenAI GPT-4o)**
   - Primary interface with users
   - Coordinates other agents
   - Synthesizes final outputs
   - Validates completeness

2. **Research Agent (Perplexity AI)**
   - Conducts online research
   - Gathers product information
   - Provides citations
   - Focuses on factual data

3. **Validation Agent (Claude/Anthropic)**
   - Validates research accuracy
   - Checks for completeness
   - Identifies biases
   - Ensures quality

4. **Analysis Agent (OpenAI o1)**
   - Strategic analysis
   - Gap identification
   - Competitive recommendations
   - Feature prioritization

5. **Evaluator Agent (OpenAI GPT-4o)**
   - Evaluates agent performance asynchronously
   - Provides quality metrics and scoring
   - Identifies improvement opportunities
   - Suggests prompt optimizations

## User Preferences
- Simple, non-technical language in user interactions
- Visual representations for complex concepts
- Clear progress indicators during analysis
- Actionable insights with strategic recommendations

## Development Guidelines
- Use in-memory storage for development, PostgreSQL for production
- Follow the established component patterns in the codebase
- Maintain the glass morphism design language throughout
- Ensure all AI responses are properly formatted and user-friendly
- Keep the chat interface intuitive and conversational

## API Keys Required
- `OPENAI_API_KEY` - For GPT-4o and o1 models
- `PERPLEXITY_API_KEY` - For research agent (planned)
- `ANTHROPIC_API_KEY` - For validation agent (planned)

## Future Enhancements
- Implementation of the multi-agent system
- Real-time collaboration features
- Export functionality for analysis results
- Advanced filtering and sorting for Kano tables
- Integration with additional data sources
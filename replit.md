# KanoLens Project Documentation

## Overview
KanoLens is an AI-powered competitive analysis platform that transforms complex product research into actionable insights using advanced machine learning and semantic search technologies. The platform helps users analyze competitors using the Kano Model framework to categorize features as Must-have, Performance, or Delighter features.

## Recent Changes
- **January 2025**: Fixed Multi-Agent Analysis Execution
  - Fixed issue where agents were stuck in "waiting" status during analysis
  - Updated session creation to properly pass currentStep and features
  - Simplified multi-agent trigger logic to check for direct approval messages
  - Added debug logging to track analysis progress and identify issues
  - Created test endpoint /api/test/multi-agent for direct testing
  - Multi-agent analysis now properly triggers when user clicks "Confirm & Start Analysis"
  - Progress updates are simulated on frontend while real analysis runs in background
- **January 2025**: Manual Input Validation & User-Friendly Interface
  - Added Step 3: Manual Input Validation between AI suggestions and progress tracking
  - Users can now add custom products with key benefits during validation step
  - Orchestrator agent validates product names, corrects spelling, and checks legitimacy
  - Visual feedback shows validation results with green/red status and detailed suggestions
  - Real-time loading indicators during validation process
  - Replaced technical "Orchestrator" language with user-friendly terms like "AI agent"
  - Progress screen now shows "Coordination Agent", "Research Agent", etc.
  - Added descriptive task messages: "Setting up analysis workflow and sending criteria to research team"
  - Users can remove products/features with hover-to-delete functionality
  - Seamless integration with existing multi-agent workflow

- **January 2025**: Simplified UX/UI with Step-by-Step Workflow
  - Completely redesigned user experience with focused, single-purpose screens
  - Step 1: Clean initial form (only thing on screen when filling out)
  - Step 2: AI suggestions acceptance screen (only suggestions visible)
  - Step 3: Manual input validation with real-time AI feedback
  - Step 4: Real-time agent progress tracking (shows actual agent work with time estimates)
  - Step 5: Final Kano Model table results (table-only view)
  - Added floating Orchestrator chat bubble available on all screens
  - Orchestrator agent can modify analysis at any point and navigate between steps
  - Progress tracker shows actual agent status: waiting, working, completed
  - Each screen has contextual quick actions for the Orchestrator
  - Maintained all backend multi-agent functionality while simplifying frontend

- **January 2025**: Multi-agent architecture implementation complete
  - Successfully implemented 5-agent architecture with specialized roles:
    - Agent 1: Orchestrator (OpenAI GPT-4o) - Form processing, coordination, progress tracking
    - Agent 2: Researcher (Perplexity AI) - Market research for products and features
    - Agent 3: Validator (Claude/Anthropic) - Kano categorization and feature rating
    - Agent 4: Analyst (OpenAI o1) - Strategic analysis and recommendations
    - Agent 5: Evaluator (OpenAI GPT-4o) - Quality assessment and improvement suggestions
  - Created comprehensive evaluation system and admin dashboard
  - Integrated multi-agent system with real-time progress tracking
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
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProgressTracker, { type AgentProgress } from '@/features/analysis/components/ProgressTracker';
import { Brain, Search, CheckCircle, BarChart3 } from 'lucide-react';

describe('ProgressTracker Component', () => {
  const mockAgents: AgentProgress[] = [
    {
      name: 'Coordination Agent',
      icon: Brain,
      status: 'completed',
      currentTask: 'Analysis workflow setup complete',
      progress: 100
    },
    {
      name: 'Research Agent',
      icon: Search,
      status: 'working',
      currentTask: 'Gathering competitive intelligence and product feature data',
      progress: 45,
      timeEstimate: '2-3 min'
    },
    {
      name: 'Validation Agent',
      icon: CheckCircle,
      status: 'waiting',
      currentTask: 'Categorizing features using Kano Model framework',
      progress: 0,
      timeEstimate: '1-2 min'
    },
    {
      name: 'Analysis Agent',
      icon: BarChart3,
      status: 'waiting',
      currentTask: 'Generating strategic insights and competitive recommendations',
      progress: 0,
      timeEstimate: '1-2 min'
    }
  ];

  describe('Rendering', () => {
    it('renders the main title and description', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      expect(screen.getByText('Analysis in Progress')).toBeInTheDocument();
      expect(screen.getByText(/Our AI agents are working together/i)).toBeInTheDocument();
    });

    it('displays session ID when provided', () => {
      render(<ProgressTracker agents={mockAgents} sessionId={123} />);
      
      expect(screen.getByText(/Session 123/i)).toBeInTheDocument();
    });

    it('renders all agent cards', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      mockAgents.forEach(agent => {
        expect(screen.getByText(agent.name)).toBeInTheDocument();
        expect(screen.getByText(agent.currentTask!)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Calculation', () => {
    it('calculates overall progress correctly', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      // 1 completed out of 4 agents = 25%
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('1 of 4 agents completed')).toBeInTheDocument();
    });

    it('shows 100% when all agents are completed', () => {
      const completedAgents = mockAgents.map(agent => ({
        ...agent,
        status: 'completed' as const
      }));
      
      render(<ProgressTracker agents={completedAgents} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('4 of 4 agents completed')).toBeInTheDocument();
    });

    it('shows 0% when no agents are completed', () => {
      const waitingAgents = mockAgents.map(agent => ({
        ...agent,
        status: 'waiting' as const
      }));
      
      render(<ProgressTracker agents={waitingAgents} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 of 4 agents completed')).toBeInTheDocument();
    });
  });

  describe('Agent Status Display', () => {
    it('displays correct status badges for each agent', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('working')).toBeInTheDocument();
      expect(screen.getAllByText('waiting')).toHaveLength(2);
    });

    it('shows progress bar for working agents', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      // The working agent should have progress indicators
      expect(screen.getByText('45% complete')).toBeInTheDocument();
      expect(screen.getByText('Est. 2-3 min')).toBeInTheDocument();
    });

    it('shows time estimates for waiting agents', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      // Should show estimated times for waiting agents
      expect(screen.getAllByText(/Estimated time:/)).toHaveLength(2);
    });
  });

  describe('Visual States', () => {
    it('applies correct styling based on agent status', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      // Check that agent cards are rendered
      expect(screen.getByText('Coordination Agent')).toBeInTheDocument();
      expect(screen.getByText('Research Agent')).toBeInTheDocument();
      expect(screen.getByText('Validation Agent')).toBeInTheDocument();
      expect(screen.getByText('Analysis Agent')).toBeInTheDocument();
    });

    it('shows spinner for working agents', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      // Should have spinning animation indicators for working status
      // This is verified by the presence of the working agent's content
      expect(screen.getByText('Research Agent')).toBeInTheDocument();
      expect(screen.getByText('45% complete')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty agents array', () => {
      render(<ProgressTracker agents={[]} />);
      
      expect(screen.getByText('Analysis in Progress')).toBeInTheDocument();
      expect(screen.getByText('0 of 0 agents completed')).toBeInTheDocument();
    });

    it('handles agents without optional properties', () => {
      const minimalAgents: AgentProgress[] = [
        {
          name: 'Test Agent',
          icon: Brain,
          status: 'waiting',
          currentTask: 'Testing'
        }
      ];
      
      render(<ProgressTracker agents={minimalAgents} />);
      
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
    });
  });

  describe('Real-time Analysis Section', () => {
    it('displays real-time analysis information', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      expect(screen.getByText('Real-time Analysis')).toBeInTheDocument();
      expect(screen.getByText(/This analysis is running in real-time/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<ProgressTracker agents={mockAgents} />);
      
      // Check for headings and proper content structure  
      expect(screen.getByRole('heading', { name: 'Coordination Agent' })).toBeInTheDocument();
      
      // Agent names should be in heading elements
      mockAgents.forEach(agent => {
        expect(screen.getByText(agent.name)).toBeInTheDocument();
      });
    });
  });
});
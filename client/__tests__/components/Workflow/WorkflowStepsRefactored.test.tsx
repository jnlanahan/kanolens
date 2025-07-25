import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkflowStepsRefactored from '@/components/Workflow/WorkflowStepsRefactored';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the extracted components to simplify testing
vi.mock('@/features/analysis/components/AnalysisForm', () => ({
  default: ({ onFormSubmit, onOpenArchitecture, isLoading }: any) => (
    <div data-testid="analysis-form">
      <h1>Analysis Form</h1>
      <button onClick={() => onFormSubmit({ 
        description: 'Test', 
        products: 'Product A', 
        targetCustomers: 'Test Users', 
        features: 'Feature A' 
      })}>
        Submit Form
      </button>
      {onOpenArchitecture && (
        <button onClick={onOpenArchitecture}>Open Architecture</button>
      )}
      {isLoading && <span>Loading...</span>}
    </div>
  )
}));

vi.mock('@/features/analysis/components/SuggestionsReview', () => ({
  default: ({ suggestions, onProceed, onBack }: any) => (
    <div data-testid="suggestions-review">
      <h1>Suggestions Review</h1>
      <p>Products: {suggestions.originalProducts.join(', ')}</p>
      <button onClick={() => onProceed({
        products: ['Product A', 'Product B'],
        features: ['Feature 1'],
        targetCustomer: 'Test Users'
      })}>
        Proceed
      </button>
      <button onClick={onBack}>Back</button>
    </div>
  )
}));

vi.mock('@/features/analysis/components/ProgressTracker', () => ({
  default: ({ agents, sessionId }: any) => (
    <div data-testid="progress-tracker">
      <h1>Progress Tracker</h1>
      <p>Session: {sessionId}</p>
      <p>Agents: {agents.length}</p>
      {agents.map((agent: any, i: number) => (
        <div key={i}>
          <span>{agent.name}: {agent.status}</span>
        </div>
      ))}
    </div>
  )
}));

vi.mock('@/components/Workflow/OrchestratorChat', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="orchestrator-chat">
      <h1>Orchestrator Chat</h1>
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

vi.mock('@/components/KanoTable/KanoTable', () => ({
  default: ({ data }: { data: any }) => (
    <div data-testid="kano-table">
      <h1>Kano Table</h1>
      <p>Data: {JSON.stringify(data)}</p>
    </div>
  )
}));

describe('WorkflowStepsRefactored Component', () => {
  const mockOnAnalysisComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    
    // Default successful responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/chat/suggestions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            products: ['Product B', 'Product C'],
            features: ['Feature 1', 'Feature 2'],
            targetCustomer: 'Enterprise Users'
          })
        });
      }
      
      if (url.includes('/api/analysis/sessions') && !url.includes('messages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 123 })
        });
      }
      
      if (url.includes('messages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Step Navigation', () => {
    it('starts with the analysis form step', () => {
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      expect(screen.getByTestId('analysis-form')).toBeInTheDocument();
      expect(screen.getByText('Analysis Form')).toBeInTheDocument();
    });

    it('navigates to suggestions step after form submission', async () => {
      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Submit the form
      await user.click(screen.getByText('Submit Form'));
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-review')).toBeInTheDocument();
        expect(screen.getByText('Suggestions Review')).toBeInTheDocument();
      });
    });

    it('navigates to progress step after suggestions completion', async () => {
      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Go through form submission to reach suggestions
      await user.click(screen.getByText('Submit Form'));
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-review')).toBeInTheDocument();
      });
      
      // Proceed from suggestions
      await user.click(screen.getByText('Proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('progress-tracker')).toBeInTheDocument();
        expect(screen.getByText('Progress Tracker')).toBeInTheDocument();
      });
    });

    it('can navigate back from suggestions to form', async () => {
      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Go to suggestions step
      await user.click(screen.getByText('Submit Form'));
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-review')).toBeInTheDocument();
      });
      
      // Go back to form
      await user.click(screen.getByText('Back'));
      
      expect(screen.getByTestId('analysis-form')).toBeInTheDocument();
    });
  });

  describe('Chat Integration', () => {
    it('can open and close the orchestrator chat', async () => {
      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Open chat from form
      await user.click(screen.getByText('Open Architecture'));
      
      expect(screen.getByTestId('orchestrator-chat')).toBeInTheDocument();
      
      // Close chat
      await user.click(screen.getByText('Close'));
      
      expect(screen.queryByTestId('orchestrator-chat')).not.toBeInTheDocument();
    });
  });

  describe('Analysis Flow', () => {
    it('starts analysis when reaching progress step', async () => {
      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Go through the full flow to progress step
      await user.click(screen.getByText('Submit Form'));
      
      await waitFor(() => {
        expect(screen.getByTestId('suggestions-review')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('progress-tracker')).toBeInTheDocument();
        expect(mockFetch).toHaveBeenCalledWith('/api/analysis/sessions', expect.any(Object));
      });
    });

    it('displays session ID in progress tracker', async () => {
      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Navigate to progress step
      await user.click(screen.getByText('Submit Form'));
      await waitFor(() => screen.getByTestId('suggestions-review'));
      await user.click(screen.getByText('Proceed'));
      
      await waitFor(() => {
        expect(screen.getByText('Session: 123')).toBeInTheDocument();
      });
    });

    it('shows all 4 agents in progress tracker', async () => {
      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Navigate to progress step
      await user.click(screen.getByText('Submit Form'));
      await waitFor(() => screen.getByTestId('suggestions-review'));
      await user.click(screen.getByText('Proceed'));
      
      await waitFor(() => {
        expect(screen.getByText('Agents: 4')).toBeInTheDocument();
        // Check that all agents are present (status may vary as analysis starts)
        expect(screen.getByText('Coordination Agent', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('Research Agent', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('Validation Agent', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('Analysis Agent', { exact: false })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles form submission errors gracefully', async () => {
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 500
        })
      );

      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      await user.click(screen.getByText('Submit Form'));
      
      // Should handle error and remain on form step
      await waitFor(() => {
        expect(screen.getByTestId('analysis-form')).toBeInTheDocument();
      });
    });

    it('handles session creation errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/chat/suggestions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ products: [], features: [], targetCustomer: 'Test' })
          });
        }
        if (url.includes('/api/analysis/sessions') && !url.includes('messages')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Server Error')
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Navigate to progress step to trigger session creation
      await user.click(screen.getByText('Submit Form'));
      await waitFor(() => screen.getByTestId('suggestions-review'));
      await user.click(screen.getByText('Proceed'));
      
      // Should handle session creation error
      await waitFor(() => {
        expect(screen.getByTestId('progress-tracker')).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to AnalysisForm', () => {
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Verify AnalysisForm is rendered with expected buttons
      expect(screen.getByText('Submit Form')).toBeInTheDocument();
      expect(screen.getByText('Open Architecture')).toBeInTheDocument();
    });

    it('passes suggestions data to SuggestionsReview', async () => {
      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      await user.click(screen.getByText('Submit Form'));
      
      await waitFor(() => {
        expect(screen.getByText('Products: Product A')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during form submission', async () => {
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ products: [], features: [], targetCustomer: 'Test' })
        }), 100))
      );

      const user = userEvent.setup();
      render(<WorkflowStepsRefactored onAnalysisComplete={mockOnAnalysisComplete} />);
      
      await user.click(screen.getByText('Submit Form'));
      
      // Should show loading state briefly
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
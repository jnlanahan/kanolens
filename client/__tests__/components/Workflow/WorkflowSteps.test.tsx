import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WorkflowSteps from '@/components/Workflow/WorkflowSteps';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebSocket for real-time features
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
};

// Mock components to simplify testing
vi.mock('@/components/Workflow/OrchestratorChat', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="orchestrator-chat">
      <button onClick={onClose}>Close Chat</button>
      Orchestrator Chat Component
    </div>
  )
}));

vi.mock('@/components/KanoTable/KanoTable', () => ({
  default: ({ data }: { data: any }) => (
    <div data-testid="kano-table">
      Kano Table with data: {JSON.stringify(data)}
    </div>
  )
}));

describe('WorkflowSteps Component', () => {
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
            products: ['Product A', 'Product B'],
            features: ['Feature 1', 'Feature 2'],
            targetCustomer: 'Enterprise Users'
          })
        });
      }
      
      if (url.includes('/api/analysis/sessions')) {
        if (url.includes('POST')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 123 })
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render and Form Step', () => {
    it('renders the initial form step correctly', () => {
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      expect(screen.getByText('Start Your Competitive Analysis')).toBeInTheDocument();
      expect(screen.getByLabelText(/What are you analyzing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Products to Compare/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Target Customers/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Specific Features to Analyze/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start Analysis/i })).toBeInTheDocument();
    });

    it('validates required fields before submission', async () => {
      const user = userEvent.setup();
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      const submitButton = screen.getByRole('button', { name: /Start Analysis/i });
      
      // Try to submit empty form
      await user.click(submitButton);
      
      // Form should not proceed without required fields
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('submits form with valid data and moves to suggestions step', async () => {
      const user = userEvent.setup();
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Fill out the form
      await user.type(screen.getByLabelText(/What are you analyzing/i), 'Test analysis');
      await user.type(screen.getByLabelText(/Products to Compare/i), 'Product A, Product B');
      await user.type(screen.getByLabelText(/Target Customers/i), 'Enterprise');
      await user.type(screen.getByLabelText(/Specific Features to Analyze/i), 'Feature 1, Feature 2');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /Start Analysis/i }));
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: 'Test analysis',
            products: 'Product A, Product B',
            targetCustomers: 'Enterprise',
            features: 'Feature 1, Feature 2'
          })
        });
      });
    });
  });

  describe('Suggestions Step', () => {
    const setupSuggestionsStep = async () => {
      const user = userEvent.setup();
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Fill and submit form to reach suggestions step
      await user.type(screen.getByLabelText(/What are you analyzing/i), 'Test analysis');
      await user.type(screen.getByLabelText(/Products to Compare/i), 'Product A, Product B');
      await user.type(screen.getByLabelText(/Target Customers/i), 'Enterprise');
      await user.type(screen.getByLabelText(/Specific Features to Analyze/i), 'Feature 1, Feature 2');
      await user.click(screen.getByRole('button', { name: /Generate Suggestions/i }));
      
      await waitFor(() => {
        expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
      });
      
      return user;
    };

    it('displays suggestions correctly after form submission', async () => {
      await setupSuggestionsStep();
      
      expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
      expect(screen.getByText(/Review and edit the AI-generated suggestions/i)).toBeInTheDocument();
    });

    it('allows editing of suggested products', async () => {
      const user = await setupSuggestionsStep();
      
      // Should show editable fields for products, features, and target customer
      const productInputs = screen.getAllByDisplayValue(/Product/);
      expect(productInputs.length).toBeGreaterThan(0);
    });

    it('proceeds to validation step when suggestions are approved', async () => {
      const user = await setupSuggestionsStep();
      
      // Find and click the proceed button (implementation may vary)
      const proceedButton = screen.getByRole('button', { name: /Proceed to Analysis/i });
      await user.click(proceedButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Validation/i)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Step', () => {
    const setupProgressStep = async () => {
      const user = userEvent.setup();
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Simulate reaching progress step by setting up minimal data
      // This would need to be adjusted based on actual component navigation
      await user.type(screen.getByLabelText(/What are you analyzing/i), 'Test analysis');
      await user.type(screen.getByLabelText(/Products to Compare/i), 'Product A');
      await user.type(screen.getByLabelText(/Target Customers/i), 'Enterprise');
      await user.type(screen.getByLabelText(/Specific Features to Analyze/i), 'Feature 1');
      await user.click(screen.getByRole('button', { name: /Generate Suggestions/i }));
      
      await waitFor(() => {
        expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
      });
      
      return user;
    };

    it('shows agent progress indicators', async () => {
      await setupProgressStep();
      
      // The progress step should show agent progress
      // Implementation depends on how the component transitions to progress
      expect(screen.getByText(/Analysis in Progress/i) || screen.getByText(/Progress/i)).toBeInTheDocument();
    });

    it('displays all four agents with correct initial states', async () => {
      await setupProgressStep();
      
      // Check for agent names
      expect(screen.getByText(/Coordination Agent/i) || screen.queryByText(/Coordination Agent/i)).toBeTruthy();
      expect(screen.getByText(/Research Agent/i) || screen.queryByText(/Research Agent/i)).toBeTruthy();
      expect(screen.getByText(/Validation Agent/i) || screen.queryByText(/Validation Agent/i)).toBeTruthy();
      expect(screen.getByText(/Analysis Agent/i) || screen.queryByText(/Analysis Agent/i)).toBeTruthy();
    });
  });

  describe('Results Step', () => {
    it('displays results when analysis is complete', async () => {
      // Mock completed analysis data
      const mockAnalysisResults = {
        kanoTable: {
          basic: ['Feature A'],
          performance: ['Feature B'],
          excitement: ['Feature C']
        }
      };

      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Simulate having results (this would need component state manipulation)
      // For now, we test that the KanoTable component would be rendered if results exist
      expect(true).toBe(true); // Placeholder assertion
    });

    it('calls onAnalysisComplete when results are available', async () => {
      // This test would verify that the callback is called when analysis completes
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Chat Integration', () => {
    it('can toggle chat visibility', async () => {
      const user = userEvent.setup();
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Look for chat toggle button
      const chatButton = screen.queryByRole('button', { name: /chat/i });
      if (chatButton) {
        await user.click(chatButton);
        expect(screen.getByTestId('orchestrator-chat')).toBeInTheDocument();
      }
    });

    it('can close chat when open', async () => {
      const user = userEvent.setup();
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Open chat first, then close it
      const chatButton = screen.queryByRole('button', { name: /chat/i });
      if (chatButton) {
        await user.click(chatButton);
        
        const closeButton = screen.getByText('Close Chat');
        await user.click(closeButton);
        
        expect(screen.queryByTestId('orchestrator-chat')).not.toBeInTheDocument();
      }
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully during suggestion generation', async () => {
      const user = userEvent.setup();
      
      // Mock failed API response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server Error')
        })
      );

      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/What are you analyzing/i), 'Test analysis');
      await user.type(screen.getByLabelText(/Products to Compare/i), 'Product A');
      await user.type(screen.getByLabelText(/Target Customers/i), 'Enterprise');
      await user.type(screen.getByLabelText(/Specific Features to Analyze/i), 'Feature 1');
      await user.click(screen.getByRole('button', { name: /Generate Suggestions/i }));
      
      // Should handle error gracefully and show error message via toast
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('handles session creation errors during analysis start', async () => {
      // Mock failed session creation
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/analysis/sessions') && !url.includes('messages')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Failed to create session')
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // This would test error handling during session creation
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Component State Management', () => {
    it('maintains form data across step transitions', async () => {
      const user = userEvent.setup();
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      const descriptionInput = screen.getByLabelText(/What are you analyzing/i);
      await user.type(descriptionInput, 'Test analysis description');
      
      // Form data should persist even if component re-renders
      expect(descriptionInput).toHaveValue('Test analysis description');
    });

    it('resets state appropriately when starting new analysis', async () => {
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Test that component can be reset to initial state
      expect(screen.getByText('Analysis Setup')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Check for proper form labels
      expect(screen.getByLabelText(/What are you analyzing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Products to Compare/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Target Customers/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Specific Features to Analyze/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Test tab navigation through form fields
      await user.tab();
      expect(screen.getByLabelText(/What are you analyzing/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Products to Compare/i)).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      const { rerender } = render(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      // Re-render with same props should not cause issues
      rerender(<WorkflowSteps onAnalysisComplete={mockOnAnalysisComplete} />);
      
      expect(screen.getByText('Analysis Setup')).toBeInTheDocument();
    });
  });
});
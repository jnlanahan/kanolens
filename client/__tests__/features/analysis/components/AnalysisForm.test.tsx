import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalysisForm from '@/features/analysis/components/AnalysisForm';

describe('AnalysisForm Component', () => {
  const mockOnFormSubmit = vi.fn();
  const mockOnOpenArchitecture = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all form fields correctly', () => {
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} />);
      
      expect(screen.getByText('Start Your Competitive Analysis')).toBeInTheDocument();
      expect(screen.getByLabelText(/What are you analyzing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Products to Compare/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Target Customers/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Specific Features to Analyze/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start Analysis/i })).toBeInTheDocument();
    });

    it('renders architecture button when onOpenArchitecture prop is provided', () => {
      render(
        <AnalysisForm 
          onFormSubmit={mockOnFormSubmit} 
          onOpenArchitecture={mockOnOpenArchitecture}
        />
      );
      
      expect(screen.getByRole('button', { name: /View AI Agent Architecture/i })).toBeInTheDocument();
    });

    it('does not render architecture button when onOpenArchitecture prop is not provided', () => {
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} />);
      
      expect(screen.queryByRole('button', { name: /View AI Agent Architecture/i })).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation error when required fields are missing', async () => {
      const user = userEvent.setup();
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} />);
      
      // Try to submit without filling required fields
      await user.click(screen.getByRole('button', { name: /Start Analysis/i }));
      
      // Form should not be submitted
      expect(mockOnFormSubmit).not.toHaveBeenCalled();
    });

    it('allows submission when required fields are filled', async () => {
      const user = userEvent.setup();
      mockOnFormSubmit.mockResolvedValue(undefined);
      
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} />);
      
      // Fill required fields
      await user.type(screen.getByLabelText(/Products to Compare/i), 'Product A, Product B');
      await user.type(screen.getByLabelText(/Target Customers/i), 'Enterprise Users');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /Start Analysis/i }));
      
      await waitFor(() => {
        expect(mockOnFormSubmit).toHaveBeenCalledWith({
          description: '',
          products: 'Product A, Product B',
          targetCustomers: 'Enterprise Users',
          features: ''
        });
      });
    });
  });

  describe('Form Interaction', () => {
    it('updates form data when user types in fields', async () => {
      const user = userEvent.setup();
      mockOnFormSubmit.mockResolvedValue(undefined);
      
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} />);
      
      // Type in all fields
      await user.type(screen.getByLabelText(/What are you analyzing/i), 'Test Analysis');
      await user.type(screen.getByLabelText(/Products to Compare/i), 'Product A');
      await user.type(screen.getByLabelText(/Target Customers/i), 'Test Users');
      await user.type(screen.getByLabelText(/Specific Features to Analyze/i), 'Feature A');
      
      // Submit and verify data
      await user.click(screen.getByRole('button', { name: /Start Analysis/i }));
      
      await waitFor(() => {
        expect(mockOnFormSubmit).toHaveBeenCalledWith({
          description: 'Test Analysis',
          products: 'Product A',
          targetCustomers: 'Test Users',
          features: 'Feature A'
        });
      });
    });

    it('calls onOpenArchitecture when architecture button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AnalysisForm 
          onFormSubmit={mockOnFormSubmit} 
          onOpenArchitecture={mockOnOpenArchitecture}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /View AI Agent Architecture/i }));
      
      expect(mockOnOpenArchitecture).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('shows loading state when isLoading prop is true', () => {
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} isLoading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /Processing.../i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('shows normal state when isLoading prop is false', () => {
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} isLoading={false} />);
      
      const submitButton = screen.getByRole('button', { name: /Start Analysis/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('handles form submission errors gracefully', async () => {
      const user = userEvent.setup();
      mockOnFormSubmit.mockRejectedValue(new Error('Submission failed'));
      
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/Products to Compare/i), 'Product A');
      await user.type(screen.getByLabelText(/Target Customers/i), 'Test Users');
      await user.click(screen.getByRole('button', { name: /Start Analysis/i }));
      
      // Should handle error gracefully (toast notification would be shown)
      await waitFor(() => {
        expect(mockOnFormSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} />);
      
      // Check that all inputs have proper labels
      expect(screen.getByLabelText(/What are you analyzing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Products to Compare/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Target Customers/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Specific Features to Analyze/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AnalysisForm onFormSubmit={mockOnFormSubmit} />);
      
      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/What are you analyzing/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Products to Compare/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Target Customers/i)).toHaveFocus();
    });
  });
});
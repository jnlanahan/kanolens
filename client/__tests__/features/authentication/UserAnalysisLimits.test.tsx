import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/pages/Dashboard';
import AccountSettings from '@/pages/AccountSettings';
import AnalysisSetup from '@/pages/AnalysisSetup';

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    },
    isAuthenticated: true,
    isLoading: false
  })
}));

// Mock location hook
vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', vi.fn()]
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Test setup helper
function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('User Analysis Limits', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('Dashboard with Analysis Limits', () => {
    it('shows usage banner for users with limits', async () => {
      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]) // No sessions
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            current: 1,
            max: 1,
            isUnlimited: false,
            canCreateMore: false,
            remainingAnalyses: 0
          })
        });

      renderWithQueryClient(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('KanoLens Dashboard')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Analysis Usage: 1 / 1')).toBeInTheDocument();
        expect(screen.getByText('Limit Reached')).toBeInTheDocument();
        expect(screen.getByText(/Delete an analysis to create a new one/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('does not show usage banner for unlimited users', async () => {
      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            current: 5,
            max: 999999,
            isUnlimited: true,
            canCreateMore: true,
            remainingAnalyses: 999999
          })
        });

      renderWithQueryClient(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/Analysis Usage:/)).not.toBeInTheDocument();
      });
    });

    it('disables create button when limit reached', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            current: 1,
            max: 1,
            isUnlimited: false,
            canCreateMore: false,
            remainingAnalyses: 0
          })
        });

      renderWithQueryClient(<Dashboard />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create Your First Analysis/ });
        expect(createButton).toBeDisabled();
      });
    });

    it('enables create button when under limit', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            current: 0,
            max: 1,
            isUnlimited: false,
            canCreateMore: true,
            remainingAnalyses: 1
          })
        });

      renderWithQueryClient(<Dashboard />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create Your First Analysis/ });
        expect(createButton).not.toBeDisabled();
      });
    });
  });

  describe('Account Settings Page', () => {
    it('displays correct usage information for limited user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          current: 1,
          max: 1,
          isUnlimited: false,
          canCreateMore: false,
          remainingAnalyses: 0
        })
      });

      renderWithQueryClient(<AccountSettings />);

      await waitFor(() => {
        expect(screen.getByText('Free Account')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Current usage
        expect(screen.getByText('0')).toBeInTheDocument(); // Remaining
        expect(screen.getByText(/Limit Reached/)).toBeInTheDocument();
      });
    });

    it('displays unlimited badge for unlimited user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          current: 5,
          max: 999999,
          isUnlimited: true,
          canCreateMore: true,
          remainingAnalyses: 999999
        })
      });

      renderWithQueryClient(<AccountSettings />);

      await waitFor(() => {
        expect(screen.getByText('Unlimited Access')).toBeInTheDocument();
        expect(screen.getByText('∞')).toBeInTheDocument();
      });
    });

    it('shows upgrade section for free users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          current: 1,
          max: 1,
          isUnlimited: false,
          canCreateMore: false,
          remainingAnalyses: 0
        })
      });

      renderWithQueryClient(<AccountSettings />);

      await waitFor(() => {
        expect(screen.getByText('Paid Accounts Coming Soon!')).toBeInTheDocument();
        expect(screen.getByText('Get Notified When Available')).toBeInTheDocument();
      });
    });
  });

  describe('Analysis Setup Page', () => {
    it('shows limit error when trying to create analysis at limit', async () => {
      const mockToast = vi.fn();
      vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
        toast: mockToast
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          current: 1,
          max: 1,
          isUnlimited: false,
          canCreateMore: false,
          remainingAnalyses: 0
        })
      });

      renderWithQueryClient(<AnalysisSetup />);

      // Fill form
      fireEvent.change(screen.getByLabelText(/Products to Compare/), {
        target: { value: 'Product A, Product B' }
      });
      fireEvent.change(screen.getByLabelText(/Target Customers/), {
        target: { value: 'Software Teams' }
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Continue/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Analysis Limit Reached',
          description: expect.stringContaining('Delete your current analysis'),
          variant: 'destructive'
        });
      });
    });

    it('disables submit button when at limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          current: 1,
          max: 1,
          isUnlimited: false,
          canCreateMore: false,
          remainingAnalyses: 0
        })
      });

      renderWithQueryClient(<AnalysisSetup />);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Continue/ });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Analysis Deletion and Count Updates', () => {
    it('refreshes limits after deleting sessions', async () => {
      const sessions = [
        {
          id: 1,
          title: 'Test Analysis',
          status: 'completed',
          createdAt: '2024-01-01',
          products: ['Product A'],
          targetCustomer: 'Test Customer'
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(sessions)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            current: 1,
            max: 1,
            isUnlimited: false,
            canCreateMore: false,
            remainingAnalyses: 0
          })
        })
        .mockResolvedValueOnce({
          ok: true // Delete response
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]) // Updated sessions
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            current: 0,
            max: 1,
            isUnlimited: false,
            canCreateMore: true,
            remainingAnalyses: 1
          })
        });

      renderWithQueryClient(<Dashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Analysis')).toBeInTheDocument();
      });

      // Select and delete session
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const deleteButton = screen.getByRole('button', { name: /Delete Selected/ });
      fireEvent.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /Delete 1 Session/ });
      fireEvent.click(confirmButton);

      // Verify that limits are refreshed (mocked API calls would show updated limits)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analysis/limits');
      });
    });
  });
});
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/pages/Dashboard';

// Mock the router
vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', vi.fn()],
}));

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { firstName: 'Test User' },
    isAuthenticated: true,
  }),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size }: any) => (
    <button onClick={onClick} className={className} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onCheckedChange(e.target.checked)} 
    />
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

// Mock react-query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Dashboard Phase 1 Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the fetch API to return empty sessions
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as any;
  });


  describe('Dashboard Header Structure', () => {
    it('should display dashboard title and user greeting', async () => {
      renderWithQueryClient(<Dashboard />);

      await screen.findByText('KanoLens Dashboard');
      expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
    });

    it('should display Create New Analysis button', async () => {
      renderWithQueryClient(<Dashboard />);

      await screen.findByText('KanoLens Dashboard');
      
      const createButton = screen.getByText('Create New Analysis');
      expect(createButton).toBeInTheDocument();
    });
  });

  describe('After Debug Console Button Removal (Phase 1)', () => {
    // These tests will validate the changes we're about to make
    it('should NOT display Debug Console button after removal', async () => {
      renderWithQueryClient(<Dashboard />);

      await screen.findByText('KanoLens Dashboard');

      // After Phase 1 changes, this should not find Debug Console button
      const debugButtons = screen.queryAllByText('Debug Console');
      expect(debugButtons.length).toBe(0); // Phase 1 complete - no Debug Console
    });

    it('should still display Create New Analysis button after Debug Console removal', async () => {
      renderWithQueryClient(<Dashboard />);

      await screen.findByText('KanoLens Dashboard');

      // Create button should remain after removing Debug Console
      const createButton = screen.getByText('Create New Analysis');
      expect(createButton).toBeInTheDocument();
    });

    it('should have clean header without development elements', async () => {
      renderWithQueryClient(<Dashboard />);

      await screen.findByText('KanoLens Dashboard');

      // After removal, header should only have essential production elements
      expect(screen.getByText('KanoLens Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
      expect(screen.getByText('Create New Analysis')).toBeInTheDocument();
      
      // Debug Console should be gone
      const debugButtons = screen.queryAllByText('Debug Console');
      expect(debugButtons.length).toBe(0); // Phase 1 complete - clean production UI
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no analyses exist', async () => {
      renderWithQueryClient(<Dashboard />);

      await screen.findByText('No analyses yet');
      
      expect(screen.getByText('Get started by creating your first competitive analysis. Compare products using the Kano Model framework.')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Analysis')).toBeInTheDocument();
    });
  });
});
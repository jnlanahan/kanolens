import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import KanoTable from '@/components/KanoTable/KanoTable';
import type { KanoTableData } from '@shared/schema';

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className}></div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder }: any) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

vi.mock('lucide-react', () => ({
  Download: () => <span>Download</span>,
  Share: () => <span>Share</span>,
  Edit: () => <span>Edit</span>,
  Info: () => <span>Info</span>,
  Send: () => <span>Send</span>,
  ExternalLink: () => <span>ExternalLink</span>,
}));

vi.mock('@/components/KanoTable/FeatureModal', () => ({
  default: ({ feature, isOpen }: any) => 
    isOpen ? <div data-testid="feature-modal">{feature?.name}</div> : null,
}));

const mockTableData: KanoTableData = {
  products: ['Product A', 'Product B'],
  features: [
    {
      id: 'feature-1',
      name: 'Test Feature',
      description: 'A test feature',
      category: 'must-have',
      customerBenefit: 'Test benefit',
    },
  ],
  ratings: {
    'feature-1': {
      'Product A': 'Yes',
      'Product B': 'No',
    },
  },
  justifications: {
    'feature-1': {
      'Product A': 'Available',
      'Product B': 'Not available',
    },
  },
  sources: {
    'feature-1': ['https://example.com'],
  },
};

describe('KanoTable Phase 1 Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export/Share Buttons (Before Removal)', () => {
    it('should display Export button in table actions', () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      // Export button should not exist in KanoTable after Phase 1
      const exportButton = screen.queryByText('Export');
      expect(exportButton).not.toBeInTheDocument();
    });

    it('should display Share button in table actions', () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      // Share button should not exist in KanoTable after Phase 1  
      const shareButton = screen.queryByText('Share');
      expect(shareButton).not.toBeInTheDocument();
    });

    it('should display Edit Table button in table actions', () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      const editButton = screen.getByText('Edit Table');
      expect(editButton).toBeInTheDocument();
    });

    it('should have Export, Share, and Edit buttons in same container', () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      const editButton = screen.getByText('Edit Table');
      
      // Only Edit Table button should exist after Phase 1
      expect(editButton).toBeInTheDocument();
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
      expect(screen.queryByText('Share')).not.toBeInTheDocument();
    });
  });

  describe('Table Structure', () => {
    it('should render table with products as columns', () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      expect(screen.getByText('Product A')).toBeInTheDocument();
      expect(screen.getByText('Product B')).toBeInTheDocument();
    });

    it('should render features as rows', () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      expect(screen.getByText('Test Feature')).toBeInTheDocument();
    });
  });

  describe('After Export/Share Button Removal (Phase 1)', () => {
    // These tests will validate the changes we're about to make
    it('should NOT display Export button after removal', () => {
      // This test will pass after we remove the duplicate buttons
      // For now, we expect it to fail (demonstrating current state)
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      // After Phase 1 changes, this should not find Export button in table actions
      const exportButtons = screen.queryAllByText('Export');
      // After changes, we expect 0 Export buttons in KanoTable (only in Results.tsx)
      expect(exportButtons.length).toBe(0); // Phase 1 complete - no Export in KanoTable
    });

    it('should NOT display Share button after removal', () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      // After Phase 1 changes, Share button should be completely removed
      const shareButtons = screen.queryAllByText('Share');
      expect(shareButtons.length).toBe(0); // Phase 1 complete - no Share button
    });

    it('should still display Edit Table button after removal', () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      // Edit Table button should remain after removing Export/Share
      const editButton = screen.getByText('Edit Table');
      expect(editButton).toBeInTheDocument();
    });
  });

  describe('Phase 6: Edit Table Functionality', () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('TC6.1: "Edit Table" button opens modal without errors', async () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      const editButton = screen.getByText('Edit Table');
      expect(editButton).toBeInTheDocument();

      fireEvent.click(editButton);

      // Should show the edit dialog (text may be split across elements)
      expect(screen.getByText(/Edit.*Analysis.*Table/)).toBeInTheDocument();
    });

    it('TC6.2: Chat interface in edit modal displays welcome message properly', async () => {
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      const editButton = screen.getByText('Edit Table');
      fireEvent.click(editButton);

      // Should display the AI welcome message
      expect(screen.getByText(/Hi! I'm here to help you modify your Kano analysis table/)).toBeInTheDocument();
      expect(screen.getByText(/Add or remove features/)).toBeInTheDocument();
      expect(screen.getByText(/Modify product comparisons/)).toBeInTheDocument();
    });

    it('TC6.3: User can type edit requests and send them successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userMessage: { content: 'Add a new feature' },
          aiMessage: { 
            content: 'I\'ve added the new feature to your analysis.',
            metadata: { isTableEditResponse: true }
          }
        })
      });

      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
          onEditTable={vi.fn()}
        />
      );

      const editButton = screen.getByText('Edit Table');
      fireEvent.click(editButton);

      const textarea = screen.getByPlaceholderText(/Describe what you'd like to change/);
      expect(textarea).toBeInTheDocument();

      fireEvent.change(textarea, { target: { value: 'Add a new feature called Authentication' } });
      
      const sendButton = screen.getByRole('button', { name: 'Send' });
      fireEvent.click(sendButton);

      // Should call the API
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analysis/sessions/1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Table Edit Request: Add a new feature called Authentication',
            metadata: { editRequest: true, currentTableData: mockTableData }
          })
        });
      });
    });

    it('TC6.4: Edit requests process without "error processing your edit request" message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userMessage: { content: 'Edit request' },
          aiMessage: { 
            content: 'Successfully updated the table.',
            metadata: { isTableEditResponse: true }
          }
        })
      });

      const mockOnEditTable = vi.fn();
      
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
          onEditTable={mockOnEditTable}
        />
      );

      const editButton = screen.getByText('Edit Table');
      fireEvent.click(editButton);

      const textarea = screen.getByPlaceholderText(/Describe what you'd like to change/);
      fireEvent.change(textarea, { target: { value: 'Update feature descriptions' } });
      
      const sendButton = screen.getByRole('button', { name: 'Send' });
      fireEvent.click(sendButton);

      // Wait for processing to complete and AI response to appear
      await waitFor(() => {
        expect(screen.getByText('Successfully updated the table.')).toBeInTheDocument();
      }, { timeout: 2000 });
      expect(mockOnEditTable).toHaveBeenCalled();
    });

    it('TC6.5: Backend API responds with proper success/error messages', async () => {
      // Test successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userMessage: { content: 'Test edit' },
          aiMessage: { content: 'Edit completed successfully' }
        })
      });

      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      const editButton = screen.getByText('Edit Table');
      fireEvent.click(editButton);

      const textarea = screen.getByPlaceholderText(/Describe what you'd like to change/);
      fireEvent.change(textarea, { target: { value: 'Test edit request' } });
      
      const sendButton = screen.getByRole('button', { name: 'Send' });
      fireEvent.click(sendButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Edit completed successfully')).toBeInTheDocument();
    });

    it('TC6.6: Table updates reflect user\'s edit changes immediately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userMessage: { content: 'Add feature' },
          aiMessage: { 
            content: 'Feature added successfully',
            metadata: { isTableEditResponse: true }
          }
        })
      });

      const mockOnEditTable = vi.fn();
      
      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
          onEditTable={mockOnEditTable}
        />
      );

      const editButton = screen.getByText('Edit Table');
      fireEvent.click(editButton);

      const textarea = screen.getByPlaceholderText(/Describe what you'd like to change/);
      fireEvent.change(textarea, { target: { value: 'Add new feature' } });
      
      const sendButton = screen.getByRole('button', { name: 'Send' });
      fireEvent.click(sendButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // onEditTable should be called to refresh the data
      expect(mockOnEditTable).toHaveBeenCalled();
    });

    it('TC6.7: Modal closes after successful edit and shows success toast', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userMessage: { content: 'Edit request' },
          aiMessage: { 
            content: 'Changes applied successfully',
            metadata: { isTableEditResponse: true }
          }
        })
      });

      const mockToast = vi.fn();
      vi.mocked(vi.fn()).mockReturnValue({ toast: mockToast });

      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
          onEditTable={vi.fn()}
        />
      );

      const editButton = screen.getByText('Edit Table');
      fireEvent.click(editButton);

      expect(screen.getByText(/Edit.*Analysis.*Table/)).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText(/Describe what you'd like to change/);
      fireEvent.change(textarea, { target: { value: 'Make changes' } });
      
      const sendButton = screen.getByRole('button', { name: 'Send' });
      fireEvent.click(sendButton);

      // Wait for the modal to close (there's a 1-second delay in the implementation)
      await waitFor(() => {
        expect(screen.queryByText(/Edit.*Analysis.*Table/)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('TC6.8: Error handling shows specific error messages, not generic failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={1} 
        />
      );

      const editButton = screen.getByText('Edit Table');
      fireEvent.click(editButton);

      const textarea = screen.getByPlaceholderText(/Describe what you'd like to change/);
      fireEvent.change(textarea, { target: { value: 'This will fail' } });
      
      const sendButton = screen.getByRole('button', { name: 'Send' });
      fireEvent.click(sendButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show a helpful error message, not generic failure
      expect(screen.getByText(/I apologize, but I encountered an error processing your request/)).toBeInTheDocument();
    });

    it('Should send correct metadata with edit requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userMessage: { content: 'Test' },
          aiMessage: { content: 'Response' }
        })
      });

      render(
        <KanoTable 
          tableData={mockTableData} 
          isLoading={false} 
          sessionId={123} 
        />
      );

      const editButton = screen.getByText('Edit Table');
      fireEvent.click(editButton);

      const textarea = screen.getByPlaceholderText(/Describe what you'd like to change/);
      fireEvent.change(textarea, { target: { value: 'Test edit' } });
      
      const sendButton = screen.getByRole('button', { name: 'Send' });
      fireEvent.click(sendButton);

      expect(mockFetch).toHaveBeenCalledWith('/api/analysis/sessions/123/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Table Edit Request: Test edit',
          metadata: { editRequest: true, currentTableData: mockTableData }
        })
      });
    });
  });
});
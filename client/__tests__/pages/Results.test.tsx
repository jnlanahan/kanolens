import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Results from '../../src/pages/Results';

// Mock wouter router
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useParams: () => ({ sessionId: '123' }),
  useLocation: () => ['/results/123', mockSetLocation],
}));

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL and related APIs
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

const mockSession = {
  id: 123,
  title: 'Test Analysis',
  status: 'completed',
  createdAt: new Date().toISOString(),
  products: ['Product A', 'Product B'],
  targetCustomer: 'Test Customer',
  tableData: {
    products: ['Product A', 'Product B'],
    features: [
      {
        name: 'Test Feature',
        category: 'must-have',
        description: 'Test Description',
        benefit: 'Test Benefit',
        ratings: { 'Product A': 'Yes', 'Product B': 'No' }
      }
    ]
  }
};

describe('Results Page Export Functionality', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    // Mock successful session fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSession),
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderResults = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Results />
      </QueryClientProvider>
    );
  };

  describe('Export Menu Display', () => {
    it('should show export button when table data exists', async () => {
      renderResults();
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });
    });

    it('should show all export options when menu is opened', async () => {
      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      // Phase 4: Only PDF and Excel options should be shown
      expect(screen.getByText('PDF Report')).toBeInTheDocument();
      expect(screen.getByText('Excel Spreadsheet')).toBeInTheDocument();
      // PowerPoint and Share Link removed in Phase 1
      expect(screen.queryByText('PowerPoint Slides')).not.toBeInTheDocument();
      expect(screen.queryByText('Share Link')).not.toBeInTheDocument();
    });
  });

  describe('PDF Export', () => {
    it('should handle PDF export successfully', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      const pdfButton = screen.getByText('PDF Report');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analysis/sessions/123/export/pdf',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should handle PDF export error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (global.fetch as any).mockRejectedValueOnce(new Error('Export failed'));

      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      const pdfButton = screen.getByText('PDF Report');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('PDF export failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Excel Export', () => {
    it('should handle Excel export successfully', async () => {
      // Mock dynamic import for Excel export
      vi.doMock('@/components/KanoTable/KanoTable', () => ({
        exportToExcel: vi.fn().mockResolvedValue(undefined)
      }));

      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      const excelButton = screen.getByText('Excel Spreadsheet');
      fireEvent.click(excelButton);

      await waitFor(() => {
        // Excel export should be called with table data
        expect(screen.queryByText('Excel Spreadsheet')).not.toBeInTheDocument(); // Menu should close
      });
    });

    it('should handle Excel export error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock dynamic import to throw error
      vi.doMock('@/components/KanoTable/KanoTable', () => {
        throw new Error('Excel export failed');
      });

      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      const excelButton = screen.getByText('Excel Spreadsheet');
      fireEvent.click(excelButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Excel export failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Menu Interaction', () => {
    it('should close export menu when clicking outside', async () => {
      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      expect(screen.getByText('PDF Report')).toBeInTheDocument();

      // Simulate clicking outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('PDF Report')).not.toBeInTheDocument();
      });
    });

    it('should close export menu after selecting an option', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      const pdfButton = screen.getByText('PDF Report');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(screen.queryByText('PDF Report')).not.toBeInTheDocument();
      });
    });
  });
});
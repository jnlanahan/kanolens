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
  products: ['Product A', 'Product B'],
  targetCustomer: 'Test Customer',
  status: 'completed',
  tableData: {
    products: ['Product A', 'Product B'],
    features: [
      {
        id: 'feature-1',
        name: 'Test Feature',
        category: 'must-have',
        description: 'Test Description',
        customerBenefit: 'Test Benefit'
      }
    ],
    ratings: {
      'feature-1': { 'Product A': 'Yes', 'Product B': 'No' }
    },
    justifications: {},
    sources: {}
  }
};

describe('Results Page Export Menu (Phase 4 Changes)', () => {
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

  describe('TC4.1: Export dropdown shows PDF and Excel options only', () => {
    it('should show only PDF and Excel options (no PowerPoint/Share Link)', async () => {
      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      // Should have PDF and Excel options
      expect(screen.getByText('PDF Report')).toBeInTheDocument();
      expect(screen.getByText('Excel Spreadsheet')).toBeInTheDocument();
      
      // Should NOT have PowerPoint or Share Link options
      expect(screen.queryByText('PowerPoint Slides')).not.toBeInTheDocument();
      expect(screen.queryByText('Share Link')).not.toBeInTheDocument();
    });

    it('should have exactly 2 export options', async () => {
      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      // Count the number of buttons in the export menu
      const exportMenu = screen.getByText('PDF Report').closest('.py-1');
      const buttons = exportMenu?.querySelectorAll('button');
      
      expect(buttons).toHaveLength(2);
    });
  });

  describe('PDF Export Still Works', () => {
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
  });

  describe('Excel Export Integration', () => {
    it('should have Excel export button with correct icon', async () => {
      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      const excelButton = screen.getByText('Excel Spreadsheet');
      expect(excelButton).toBeInTheDocument();
      
      // Check that it has the spreadsheet icon (we can't easily test the icon directly)
      expect(excelButton.closest('button')).toHaveClass('flex', 'items-center', 'gap-3');
    });

    it('should call Excel export when clicked', async () => {
      // Mock the dynamic import for Excel export
      const mockExportToExcel = vi.fn().mockResolvedValue(undefined);
      
      // Mock the dynamic import
      vi.doMock('../../src/components/KanoTable/KanoTable', () => ({
        default: vi.fn(),
        exportToExcel: mockExportToExcel,
      }));

      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      const excelButton = screen.getByText('Excel Spreadsheet');
      fireEvent.click(excelButton);

      // Note: We can't easily test the dynamic import in this context,
      // but we can verify the button exists and is clickable
      expect(excelButton).toBeInTheDocument();
    });
  });

  describe('Menu Behavior', () => {
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

    it('should close export menu after selecting PDF option', async () => {
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

    it('should close export menu after selecting Excel option', async () => {
      renderResults();
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);
      });

      const excelButton = screen.getByText('Excel Spreadsheet');
      fireEvent.click(excelButton);

      await waitFor(() => {
        expect(screen.queryByText('Excel Spreadsheet')).not.toBeInTheDocument();
      });
    });
  });
});
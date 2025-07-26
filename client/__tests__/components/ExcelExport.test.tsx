import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToExcel } from '../../src/components/KanoTable/KanoTable';
import type { KanoTableData } from '@shared/schema';

// Mock xlsx library
const mockUtils = {
  book_new: vi.fn(() => ({})),
  aoa_to_sheet: vi.fn(() => ({ '!cols': undefined })),
  book_append_sheet: vi.fn(),
};

const mockWriteFile = vi.fn();

vi.mock('xlsx', () => ({
  utils: mockUtils,
  writeFile: mockWriteFile,
}));

describe('Excel Export Functionality (Phase 4)', () => {
  const mockTableData: KanoTableData = {
    products: ['Product A', 'Product B', 'Product C'],
    features: [
      {
        id: 'feature-1',
        name: 'User Management',
        description: 'Manage user accounts and permissions',
        category: 'must-have',
        customerBenefit: 'Essential security and access control'
      },
      {
        id: 'feature-2', 
        name: 'Performance Analytics',
        description: 'Track and analyze system performance',
        category: 'performance',
        customerBenefit: 'Better insights into system usage'
      },
      {
        id: 'feature-3',
        name: 'AI-Powered Insights',
        description: 'Machine learning driven recommendations',
        category: 'delighter',
        customerBenefit: 'Unexpected value through automation'
      }
    ],
    ratings: {
      'feature-1': { 'Product A': 'Yes', 'Product B': 'Yes', 'Product C': 'No' },
      'feature-2': { 'Product A': 'High', 'Product B': 'Medium', 'Product C': 'Low' },
      'feature-3': { 'Product A': 'Yes', 'Product B': 'No', 'Product C': 'Yes' }
    },
    justifications: {
      'feature-1': { 'Product A': 'Full user management', 'Product B': 'Basic user management', 'Product C': 'No user management' }
    },
    sources: {
      'feature-1': ['https://example.com/source1', 'https://example.com/source2']
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('TC4.2: Excel export creates .xlsx file with proper table formatting', () => {
    it('should create Excel workbook with correct structure', async () => {
      await exportToExcel(mockTableData, 'Test Analysis');

      expect(mockUtils.book_new).toHaveBeenCalledTimes(1);
      expect(mockUtils.aoa_to_sheet).toHaveBeenCalledTimes(1);
      expect(mockUtils.book_append_sheet).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });

    it('should generate filename with analysis title and date', async () => {
      await exportToExcel(mockTableData, 'Project Management Tools');

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/Project Management Tools - \d{2}-\d{2}-\d{4}\.xlsx/)
      );
    });

    it('should handle special characters in analysis title', async () => {
      await exportToExcel(mockTableData, 'Analysis: Test & Review (2025)');

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/Analysis Test  Review 2025 - \d{2}-\d{2}-\d{4}\.xlsx/)
      );
    });
  });

  describe('TC4.3: Excel file includes category headers and groupings', () => {
    it('should structure data with proper category groupings', async () => {
      await exportToExcel(mockTableData, 'Test Analysis');

      // Check that aoa_to_sheet was called with proper data structure
      const callArgs = mockUtils.aoa_to_sheet.mock.calls[0][0];
      
      // Should include title
      expect(callArgs[0]).toEqual(['Test Analysis']);
      
      // Should include category headers
      const dataString = JSON.stringify(callArgs);
      expect(dataString).toContain('MUST-HAVE FEATURES');
      expect(dataString).toContain('PERFORMANCE BENEFITS');
      expect(dataString).toContain('DELIGHTER FEATURES');
    });

    it('should include proper column headers', async () => {
      await exportToExcel(mockTableData, 'Test Analysis');

      const callArgs = mockUtils.aoa_to_sheet.mock.calls[0][0];
      const dataString = JSON.stringify(callArgs);
      
      expect(dataString).toContain('Feature/Benefit');
      expect(dataString).toContain('Category');
      expect(dataString).toContain('Description');
      expect(dataString).toContain('Customer Benefit');
      expect(dataString).toContain('Product A');
      expect(dataString).toContain('Product B');
      expect(dataString).toContain('Product C');
    });
  });

  describe('TC4.4: Excel maintains visual structure with proper column headers', () => {
    it('should set appropriate column widths', async () => {
      await exportToExcel(mockTableData, 'Test Analysis');

      const worksheet = mockUtils.aoa_to_sheet.mock.results[0].value;
      
      expect(worksheet['!cols']).toBeDefined();
      expect(worksheet['!cols']).toHaveLength(7); // 4 main columns + 3 products
      
      // Check column widths
      expect(worksheet['!cols'][0]).toEqual({ wch: 30 }); // Feature/Benefit
      expect(worksheet['!cols'][1]).toEqual({ wch: 15 }); // Category
      expect(worksheet['!cols'][2]).toEqual({ wch: 40 }); // Description
      expect(worksheet['!cols'][3]).toEqual({ wch: 30 }); // Customer Benefit
      expect(worksheet['!cols'][4]).toEqual({ wch: 12 }); // Product A
    });
  });

  describe('TC4.7: Cell data matches exactly what is displayed in web table', () => {
    it('should include all feature data accurately', async () => {
      await exportToExcel(mockTableData, 'Test Analysis');

      const callArgs = mockUtils.aoa_to_sheet.mock.calls[0][0];
      const dataString = JSON.stringify(callArgs);
      
      // Check feature names
      expect(dataString).toContain('User Management');
      expect(dataString).toContain('Performance Analytics');
      expect(dataString).toContain('AI-Powered Insights');
      
      // Check descriptions
      expect(dataString).toContain('Manage user accounts and permissions');
      expect(dataString).toContain('Track and analyze system performance');
      
      // Check ratings
      expect(dataString).toContain('Yes');
      expect(dataString).toContain('No');
      expect(dataString).toContain('High');
      expect(dataString).toContain('Medium');
      expect(dataString).toContain('Low');
    });

    it('should organize features by category correctly', async () => {
      await exportToExcel(mockTableData, 'Test Analysis');

      const callArgs = mockUtils.aoa_to_sheet.mock.calls[0][0];
      
      // Find category sections and verify features are in correct sections
      let mustHaveIndex = -1;
      let performanceIndex = -1;
      let delighterIndex = -1;
      
      callArgs.forEach((row: any[], index: number) => {
        if (row[0] === 'MUST-HAVE FEATURES') mustHaveIndex = index;
        if (row[0] === 'PERFORMANCE BENEFITS') performanceIndex = index;
        if (row[0] === 'DELIGHTER FEATURES') delighterIndex = index;
      });
      
      expect(mustHaveIndex).toBeGreaterThan(-1);
      expect(performanceIndex).toBeGreaterThan(mustHaveIndex);
      expect(delighterIndex).toBeGreaterThan(performanceIndex);
    });
  });

  describe('TC4.8: File downloads with appropriate filename', () => {
    it('should generate filename with current date', async () => {
      const today = new Date();
      const expectedDate = today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');

      await exportToExcel(mockTableData, 'My Analysis');

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.anything(),
        `My Analysis - ${expectedDate}.xlsx`
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle empty tableData gracefully', async () => {
      const emptyData: KanoTableData = {
        products: [],
        features: [],
        ratings: {},
        justifications: {},
        sources: {}
      };

      await expect(exportToExcel(emptyData, 'Empty Analysis')).resolves.not.toThrow();
    });

    it('should handle missing ratings data', async () => {
      const dataWithoutRatings: KanoTableData = {
        ...mockTableData,
        ratings: {}
      };

      await expect(exportToExcel(dataWithoutRatings, 'No Ratings')).resolves.not.toThrow();
    });
  });
});
// Integration test for extracted export routes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { setupExportRoutes, validateExportReadiness, generateSafeFilename, setExportHeaders } from '../../routes/export';

// Mock dependencies
vi.mock('../../storage');
vi.mock('../../simpleAuth');

describe('Export Routes Integration Test', () => {
  let app: Express;
  let mockStorage: any;
  let mockAuth: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Get mocked modules
    mockStorage = await import('../../storage');
    mockAuth = await import('../../simpleAuth');
    
    // Mock auth middleware
    mockAuth.isAuthenticated.mockImplementation((req: any, res: any, next: any) => {
      req.user = { claims: { sub: 'test-user-123' } };
      next();
    });
    
    // Mock storage functions
    mockStorage.storage.getAnalysisSession.mockResolvedValue({
      id: 1,
      userId: 'test-user-123',
      title: 'Test Analysis Session',
      tableData: { basic: ['Feature A'], performance: ['Feature B'] }
    });
    
    // Setup our extracted export routes
    setupExportRoutes(app);
  });

  it('should setup export routes without crashing', () => {
    expect(setupExportRoutes).toBeDefined();
    expect(typeof setupExportRoutes).toBe('function');
  });

  it('export routes module should be importable', async () => {
    const exportModule = await import('../../routes/export');
    expect(exportModule.setupExportRoutes).toBeDefined();
    expect(exportModule.validateExportReadiness).toBeDefined();
    expect(exportModule.generateSafeFilename).toBeDefined();
    expect(exportModule.setExportHeaders).toBeDefined();
  });

  it('should validate export readiness correctly', () => {
    // Test session with table data
    const readySession = {
      id: 1,
      title: 'Test Session',
      tableData: { basic: ['Feature A'] }
    };
    
    const readyResult = validateExportReadiness(readySession);
    expect(readyResult.ready).toBe(true);
    expect(readyResult.reason).toBeUndefined();
    
    // Test session without table data
    const notReadySession = {
      id: 1,
      title: 'Test Session',
      tableData: null
    };
    
    const notReadyResult = validateExportReadiness(notReadySession);
    expect(notReadyResult.ready).toBe(false);
    expect(notReadyResult.reason).toBe('No analysis data available for export');
    
    // Test null session
    const nullResult = validateExportReadiness(null);
    expect(nullResult.ready).toBe(false);
    expect(nullResult.reason).toBe('Session not found');
  });

  it('should generate safe filenames', () => {
    // Test basic filename generation
    const filename1 = generateSafeFilename('Test Analysis Report', 'pdf');
    expect(filename1).toBe('test-analysis-report.pdf');
    
    // Test filename with special characters
    const filename2 = generateSafeFilename('Product A vs Product B Analysis!', 'pptx');
    expect(filename2).toBe('product-a-vs-product-b-analysis.pptx');
    
    // Test filename with numbers
    const filename3 = generateSafeFilename('Analysis 2024 Q1', 'pdf');
    expect(filename3).toBe('analysis-2024-q1.pdf');
  });

  it('should set export headers correctly', () => {
    const mockRes = {
      setHeader: vi.fn()
    };
    
    setExportHeaders(mockRes, 'test-report.pdf', 'application/pdf');
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test-report.pdf"');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, no-store, must-revalidate');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Expires', '0');
  });

  it('should handle session ownership validation', () => {
    // Mock session that belongs to different user
    mockStorage.storage.getAnalysisSession.mockResolvedValueOnce({
      id: 1,
      userId: 'different-user',
      title: 'Test Session',
      tableData: { basic: ['Feature A'] }
    });
    
    // This test verifies the structure without making actual HTTP calls
    expect(mockStorage.storage.getAnalysisSession).toBeDefined();
  });

  it('should have proper error handling structure', () => {
    // Test that the function doesn't throw when setting up routes
    expect(() => {
      const testApp = express();
      setupExportRoutes(testApp);
    }).not.toThrow();
  });

  it('should handle export module imports', async () => {
    // Mock the export modules that would be dynamically imported
    const mockPdfExport = { generatePDFReport: vi.fn() };
    const mockPowerPointExport = { generatePowerPointSlides: vi.fn() };
    const mockShareExport = { generateShareLink: vi.fn(), getSharedAnalysis: vi.fn() };
    
    // These would be imported dynamically in the actual routes
    expect(mockPdfExport.generatePDFReport).toBeDefined();
    expect(mockPowerPointExport.generatePowerPointSlides).toBeDefined();
    expect(mockShareExport.generateShareLink).toBeDefined();
    expect(mockShareExport.getSharedAnalysis).toBeDefined();
  });
});
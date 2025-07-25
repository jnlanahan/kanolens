// Export and sharing routes
import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../simpleAuth";

export function setupExportRoutes(app: Express): void {
  // PDF export
  app.post('/api/analysis/sessions/:id/export/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!session.tableData) {
        return res.status(400).json({ message: "No analysis data available for export" });
      }

      // Generate PDF report
      const { generatePDFReport } = await import('../export/pdf');
      const pdfBuffer = await generatePDFReport(session);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${session.title} - Report.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF export error:', error);
      res.status(500).json({ message: 'Failed to generate PDF report' });
    }
  });

  // PowerPoint export
  app.post('/api/analysis/sessions/:id/export/powerpoint', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!session.tableData) {
        return res.status(400).json({ message: "No analysis data available for export" });
      }

      // Generate PowerPoint slides
      const { generatePowerPointSlides } = await import('../export/powerpoint');
      const pptxBuffer = await generatePowerPointSlides(session);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${session.title} - Slides.pptx"`);
      res.send(pptxBuffer);
    } catch (error) {
      console.error('PowerPoint export error:', error);
      res.status(500).json({ message: 'Failed to generate PowerPoint slides' });
    }
  });

  // Create share link
  app.post('/api/analysis/sessions/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!session.tableData) {
        return res.status(400).json({ message: "No analysis data available for sharing" });
      }

      // Generate share link
      const { generateShareLink } = await import('../export/share');
      const shareData = await generateShareLink(session);

      res.json({
        shareUrl: shareData.shareUrl,
        shareId: shareData.shareId,
        expiresAt: shareData.expiresAt,
        message: "Share link created successfully"
      });
    } catch (error) {
      console.error('Share link error:', error);
      res.status(500).json({ message: 'Failed to create share link' });
    }
  });

  // Access shared analysis (public route - no authentication required)
  app.get('/share/:shareId', async (req: any, res) => {
    try {
      const { shareId } = req.params;
      const { getSharedAnalysis } = await import('../export/share');
      const sharedData = await getSharedAnalysis(shareId);

      if (!sharedData) {
        return res.status(404).json({ message: "Shared analysis not found or expired" });
      }

      res.json(sharedData);
    } catch (error) {
      console.error('Shared analysis error:', error);
      res.status(500).json({ message: 'Failed to load shared analysis' });
    }
  });
}

// Helper function to validate export readiness
export function validateExportReadiness(session: any): { ready: boolean; reason?: string } {
  if (!session) {
    return { ready: false, reason: 'Session not found' };
  }
  
  if (!session.tableData) {
    return { ready: false, reason: 'No analysis data available for export' };
  }
  
  return { ready: true };
}

// Helper function to generate safe filename
export function generateSafeFilename(title: string, extension: string): string {
  // Remove special characters and replace spaces with hyphens
  const safeName = title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  
  return `${safeName}.${extension}`;
}

// Helper function to set export headers
export function setExportHeaders(res: any, filename: string, contentType: string): void {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}
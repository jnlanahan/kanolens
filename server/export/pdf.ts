import PDFDocument from 'pdfkit';
import type { AnalysisSession } from '@shared/schema';

export async function generatePDFReport(session: AnalysisSession): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `${session.title} - Kano Analysis Report`,
          Author: 'KanoLens',
          Subject: 'Competitive Analysis Report',
          Creator: 'KanoLens Multi-Agent Analysis System'
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24)
         .fillColor('#1f2937')
         .text(session.title, { align: 'center' });
      
      doc.fontSize(12)
         .fillColor('#6b7280')
         .text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' })
         .moveDown(2);

      // Executive Summary
      doc.fontSize(18)
         .fillColor('#1f2937')
         .text('Executive Summary')
         .moveDown(0.5);

      doc.fontSize(12)
         .fillColor('#374151')
         .text(`This report presents a comprehensive Kano Model analysis comparing ${session.products?.length || 0} products across ${session.tableData?.features?.length || 0} key features for ${session.targetCustomer || 'the target market'}.`)
         .moveDown(1);

      // Products Analyzed
      if (session.products && session.products.length > 0) {
        doc.fontSize(16)
           .fillColor('#1f2937')
           .text('Products Analyzed')
           .moveDown(0.5);

        session.products.forEach((product, index) => {
          doc.fontSize(12)
             .fillColor('#374151')
             .text(`${index + 1}. ${product}`)
             .moveDown(0.3);
        });
        doc.moveDown(1);
      }

      // Target Customer
      if (session.targetCustomer) {
        doc.fontSize(16)
           .fillColor('#1f2937')
           .text('Target Customer Segment')
           .moveDown(0.5);

        doc.fontSize(12)
           .fillColor('#374151')
           .text(session.targetCustomer)
           .moveDown(1);
      }

      // Analysis Results
      if (session.tableData?.features && session.tableData.features.length > 0) {
        doc.addPage()
           .fontSize(18)
           .fillColor('#1f2937')
           .text('Kano Analysis Results')
           .moveDown(1);

        // Feature breakdown by category
        const categoryColors = {
          'Must-Have': '#ef4444',
          'Performance': '#f59e0b', 
          'Attractive': '#10b981',
          'Indifferent': '#6b7280',
          'Reverse': '#8b5cf6'
        };

        const categoryCounts = session.tableData.features.reduce((acc: any, feature: any) => {
          const category = feature.category || 'Indifferent';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});

        doc.fontSize(16)
           .fillColor('#1f2937')
           .text('Feature Categories Summary')
           .moveDown(0.5);

        Object.entries(categoryCounts).forEach(([category, count]) => {
          const color = categoryColors[category as keyof typeof categoryColors] || '#6b7280';
          doc.fontSize(12)
             .fillColor(color)
             .text(`● ${category}: ${count} features`)
             .moveDown(0.3);
        });

        doc.moveDown(1);

        // Individual feature analysis
        doc.fontSize(16)
           .fillColor('#1f2937')
           .text('Detailed Feature Analysis')
           .moveDown(0.5);

        session.tableData.features.forEach((feature: any, index: number) => {
          if (doc.y > 700) { // Check if we need a new page
            doc.addPage();
          }

          const category = feature.category || 'Indifferent';
          const color = categoryColors[category as keyof typeof categoryColors] || '#6b7280';

          doc.fontSize(14)
             .fillColor('#1f2937')
             .text(`${index + 1}. ${feature.name}`)
             .moveDown(0.3);

          doc.fontSize(12)
             .fillColor(color)
             .text(`Category: ${category}`)
             .moveDown(0.3);

          if (feature.description) {
            doc.fontSize(11)
               .fillColor('#374151')
               .text(feature.description, { width: 500 })
               .moveDown(0.5);
          }

          // Product comparison for this feature
          if (session.products && session.products.length > 0) {
            doc.fontSize(11)
               .fillColor('#6b7280')
               .text('Product Comparison:')
               .moveDown(0.2);

            session.products.forEach((product: string, pIndex: number) => {
              const rating = feature.products?.[pIndex]?.rating || 'N/A';
              const notes = feature.products?.[pIndex]?.notes || '';
              
              doc.fontSize(10)
                 .fillColor('#374151')
                 .text(`  • ${product}: ${rating}${notes ? ` - ${notes}` : ''}`)
                 .moveDown(0.2);
            });
          }

          doc.moveDown(0.8);
        });
      }

      // Recommendations
      doc.addPage()
         .fontSize(18)
         .fillColor('#1f2937')
         .text('Strategic Recommendations')
         .moveDown(1);

      doc.fontSize(12)
         .fillColor('#374151')
         .text('Based on this Kano Model analysis, consider the following strategic recommendations:')
         .moveDown(1);

      const recommendations = [
        'Focus on Must-Have features to ensure competitive parity',
        'Invest in Performance features to drive customer satisfaction',
        'Develop Attractive features for competitive differentiation',
        'Minimize investment in Indifferent features unless strategically necessary',
        'Carefully evaluate any Reverse features that may be harming user experience'
      ];

      recommendations.forEach((rec, index) => {
        doc.fontSize(11)
           .fillColor('#374151')
           .text(`${index + 1}. ${rec}`)
           .moveDown(0.5);
      });

      // Footer
      doc.fontSize(10)
         .fillColor('#9ca3af')
         .text('Generated by KanoLens Multi-Agent Analysis System', 50, doc.page.height - 50, {
           align: 'center'
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
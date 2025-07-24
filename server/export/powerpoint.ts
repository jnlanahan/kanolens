import PptxGenJS from 'pptxgenjs';
import type { AnalysisSession } from '@shared/schema';

export async function generatePowerPointSlides(session: AnalysisSession): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = 'KanoLens';
  pptx.company = 'KanoLens Multi-Agent Analysis System';
  pptx.subject = 'Competitive Analysis Presentation';
  pptx.title = `${session.title} - Kano Analysis`;

  // Define colors
  const colors = {
    primary: '1f2937',
    secondary: '6b7280',
    accent: '3b82f6',
    mustHave: 'ef4444',
    performance: 'f59e0b',
    attractive: '10b981',
    indifferent: '6b7280',
    reverse: '8b5cf6'
  };

  // Slide 1: Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(session.title, {
    x: 1,
    y: 2,
    w: 8,
    h: 1.5,
    fontSize: 32,
    color: colors.primary,
    bold: true,
    align: 'center'
  });

  titleSlide.addText('Kano Model Competitive Analysis', {
    x: 1,
    y: 3.5,
    w: 8,
    h: 0.8,
    fontSize: 20,
    color: colors.secondary,
    align: 'center'
  });

  titleSlide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
    x: 1,
    y: 5,
    w: 8,
    h: 0.5,
    fontSize: 14,
    color: colors.secondary,
    align: 'center'
  });

  titleSlide.addText('Powered by KanoLens Multi-Agent Analysis System', {
    x: 1,
    y: 6.5,
    w: 8,
    h: 0.5,
    fontSize: 12,
    color: colors.secondary,
    align: 'center',
    italic: true
  });

  // Slide 2: Executive Summary
  const summarySlide = pptx.addSlide();
  summarySlide.addText('Executive Summary', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 28,
    color: colors.primary,
    bold: true
  });

  const summaryPoints = [
    `Analysis covers ${session.products?.length || 0} products`,
    `Evaluated across ${session.tableData?.features?.length || 0} key features`,
    `Target market: ${session.targetCustomer || 'General market'}`,
    `Analysis completed using AI-driven competitive research`
  ];

  summaryPoints.forEach((point, index) => {
    summarySlide.addText(`• ${point}`, {
      x: 1,
      y: 2 + (index * 0.6),
      w: 8,
      h: 0.5,
      fontSize: 16,
      color: colors.primary
    });
  });

  // Slide 3: Products Analyzed
  if (session.products && session.products.length > 0) {
    const productsSlide = pptx.addSlide();
    productsSlide.addText('Products Analyzed', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      color: colors.primary,
      bold: true
    });

    session.products.forEach((product, index) => {
      productsSlide.addText(`${index + 1}. ${product}`, {
        x: 1,
        y: 2 + (index * 0.6),
        w: 8,
        h: 0.5,
        fontSize: 18,
        color: colors.primary,
        bold: true
      });
    });
  }

  // Slide 4: Kano Categories Overview
  if (session.tableData?.features && session.tableData.features.length > 0) {
    const categoriesSlide = pptx.addSlide();
    categoriesSlide.addText('Kano Categories Overview', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      color: colors.primary,
      bold: true
    });

    // Calculate category distribution
    const categoryCounts = session.tableData.features.reduce((acc: any, feature: any) => {
      const category = feature.category || 'Indifferent';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const categoryDescriptions = {
      'Must-Have': 'Basic expectations that must be met',
      'Performance': 'Features that drive satisfaction when improved',
      'Attractive': 'Delighters that create competitive advantage',
      'Indifferent': 'Features that don\'t significantly impact satisfaction',
      'Reverse': 'Features that may decrease satisfaction'
    };

    let yPos = 1.8;
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const colorKey = category.toLowerCase().replace('-', '') as keyof typeof colors;
      const color = colors[colorKey] || colors.secondary;
      
      categoriesSlide.addText(`${category}: ${count} features`, {
        x: 1,
        y: yPos,
        w: 4,
        h: 0.5,
        fontSize: 16,
        color: color,
        bold: true
      });

      categoriesSlide.addText(categoryDescriptions[category as keyof typeof categoryDescriptions] || '', {
        x: 1,
        y: yPos + 0.3,
        w: 8,
        h: 0.4,
        fontSize: 12,
        color: colors.secondary
      });

      yPos += 1;
    });
  }

  // Slide 5: Feature Analysis Details
  if (session.tableData?.features && session.tableData.features.length > 0) {
    const featuresSlide = pptx.addSlide();
    featuresSlide.addText('Feature Analysis', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      color: colors.primary,
      bold: true
    });

    // Create a table with features
    const tableData = [
      [
        { text: 'Feature', options: { fontSize: 14, bold: true, color: colors.primary } },
        { text: 'Category', options: { fontSize: 14, bold: true, color: colors.primary } },
        { text: 'Strategic Priority', options: { fontSize: 14, bold: true, color: colors.primary } }
      ]
    ];

    session.tableData.features.slice(0, 8).forEach((feature: any) => {
      const category = feature.category || 'Indifferent';
      const priority = getPriorityFromCategory(category);
      const colorKey = category.toLowerCase().replace('-', '') as keyof typeof colors;
      const color = colors[colorKey] || colors.secondary;

      tableData.push([
        { text: feature.name, options: { fontSize: 12 } },
        { text: category, options: { fontSize: 12, color: color, bold: true } },
        { text: priority, options: { fontSize: 12 } }
      ]);
    });

    featuresSlide.addTable(tableData, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 4.5,
      fontSize: 12,
      border: { type: 'solid', color: colors.secondary, pt: 1 },
      fill: { color: 'f8fafc' }
    });
  }

  // Slide 6: Strategic Recommendations
  const recommendationsSlide = pptx.addSlide();
  recommendationsSlide.addText('Strategic Recommendations', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 28,
    color: colors.primary,
    bold: true
  });

  const recommendations = [
    'Prioritize Must-Have features for competitive parity',
    'Invest in Performance features for customer satisfaction',
    'Develop Attractive features for differentiation',
    'Evaluate ROI of Indifferent features carefully',
    'Address any Reverse features immediately'
  ];

  recommendations.forEach((rec, index) => {
    recommendationsSlide.addText(`${index + 1}. ${rec}`, {
      x: 1,
      y: 2 + (index * 0.7),
      w: 8,
      h: 0.6,
      fontSize: 16,
      color: colors.primary
    });
  });

  // Generate and return buffer
  return await pptx.writeFile({ outputType: 'nodebuffer' }) as Buffer;
}

function getPriorityFromCategory(category: string): string {
  switch (category) {
    case 'Must-Have': return 'Critical';
    case 'Performance': return 'High';
    case 'Attractive': return 'Medium';
    case 'Indifferent': return 'Low';
    case 'Reverse': return 'Address Immediately';
    default: return 'Medium';
  }
}
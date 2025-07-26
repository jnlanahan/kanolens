import { openai } from "../openai";

export interface TitleGenerationRequest {
  products: string[];
  description?: string;
  targetCustomers?: string;
  role?: string;
}

export class TitleGeneratorService {
  /**
   * Generate a smart analysis title using AI based on user input
   * Phase 3: Smart Analysis Naming implementation
   */
  async generateSmartTitle(request: TitleGenerationRequest): Promise<string> {
    try {
      console.log('[TitleGenerator] Generating smart title for:', request);
      
      const titlePrompt = this.buildTitlePrompt(request);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a concise title generator for competitive analysis reports. Generate short, descriptive titles that capture the product category or use case."
          },
          {
            role: "user",
            content: titlePrompt
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      });

      const generatedTitle = response.choices[0]?.message?.content?.trim();
      
      if (generatedTitle && generatedTitle.length > 3 && generatedTitle.length < 50) {
        console.log('[TitleGenerator] Generated title:', generatedTitle);
        return generatedTitle;
      } else {
        console.log('[TitleGenerator] Generated title invalid, using fallback');
        return this.generateFallbackTitle(request);
      }
    } catch (error) {
      console.error('[TitleGenerator] AI generation failed:', error);
      return this.generateFallbackTitle(request);
    }
  }

  /**
   * Generate a title with current date appended
   * Format: "{Smart Title} - {Date}"
   */
  generateTitleWithDate(smartTitle: string): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${smartTitle} - ${currentDate}`;
  }

  /**
   * Build the AI prompt for title generation based on Phase 3 requirements
   */
  private buildTitlePrompt(request: TitleGenerationRequest): string {
    return `Generate a concise, descriptive title for this competitive analysis based on:
- Products being compared: ${request.products.join(', ')}
- User context: ${request.description || 'Not specified'}
- Target customers: ${request.targetCustomers || 'Not specified'}
- User role: ${request.role || 'Not specified'}

Format: Create a 2-4 word title that captures the product category or use case.
Examples: "Product Management Tools", "CRM Platforms", "Design Software", "Email Marketing Tools"
Return only the title, no additional text.`;
  }

  /**
   * Generate fallback title when AI generation fails
   */
  private generateFallbackTitle(request: TitleGenerationRequest): string {
    // Try to extract category from product names
    const products = request.products.map(p => p.toLowerCase());
    
    // Common category patterns
    const categoryMap: Record<string, string> = {
      'monday': 'Project Management Tools',
      'asana': 'Project Management Tools', 
      'trello': 'Project Management Tools',
      'clickup': 'Project Management Tools',
      'slack': 'Communication Tools',
      'teams': 'Communication Tools',
      'zoom': 'Video Conferencing Tools',
      'salesforce': 'CRM Platforms',
      'hubspot': 'CRM Platforms',
      'notion': 'Knowledge Management Tools',
      'airtable': 'Database Tools',
      'figma': 'Design Tools',
      'adobe': 'Design Tools',
      'canva': 'Design Tools'
    };

    // Look for category matches
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (products.some(product => product.includes(keyword))) {
        console.log(`[TitleGenerator] Fallback category found: ${category}`);
        return category;
      }
    }

    // If no category found, use products directly
    if (request.products.length === 1) {
      return `${request.products[0]} Analysis`;
    } else if (request.products.length <= 3) {
      return request.products.join(' vs ');
    } else {
      return `${request.products.length} Product Comparison`;
    }
  }
}

export const titleGeneratorService = new TitleGeneratorService();
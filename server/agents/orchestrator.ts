import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { openai } from "../openai";
import { searchProductInformation } from "../openai";

export interface OrchestratorInput {
  mode: 'suggestions' | 'comprehensive';
  formData: {
    description?: string;
    products: string;
    targetCustomers: string;
    features?: string;
  };
  sessionId: number;
}

export interface SuggestionResponse {
  productInterpretation: string;
  suggestedProducts: Array<{
    name: string;
    reason: string;
  }>;
  suggestedFeatures: string[];
}

export interface ProgressUpdate {
  step: 'discovery' | 'research' | 'categorization' | 'table_creation' | 'analysis';
  message: string;
  progress: number;
  data?: any;
}

export class OrchestratorAgent {
  private systemPrompt = `You are the Orchestrator agent for KanoLens, an AI-powered competitive analysis platform that uses the Kano Model framework. You receive structured form data from users and coordinate the multi-agent analysis process.

Key responsibilities:
1. Parse and clean form input (remove "etc", "more", "others")
2. Validate products are real and comparable
3. Generate suggestions for additional products and features
4. Coordinate other agents during full analysis
5. Track progress and update user

When suggesting products, ensure they are:
- Real, existing products in the market
- Direct competitors serving the same target customer
- Relevant to the analysis context`;

  async processSuggestions(input: OrchestratorInput): Promise<SuggestionResponse> {
    console.log("[Orchestrator] Processing suggestions for form data");
    
    // Clean product names
    const cleanedProducts = this.cleanProductList(input.formData.products);
    
    // Build the prompt for suggestions
    const prompt = `User submitted a competitive analysis request:
Description: ${input.formData.description || 'Not provided'}
Products: ${cleanedProducts.join(', ')}
Target Customers: ${input.formData.targetCustomers}
Initial Features: ${input.formData.features || 'Not provided'}

Your task:
1. Identify any product name corrections needed (typos, variations)
2. Suggest 3-5 additional competitive products
3. Generate 8-12 key features/benefits to analyze
4. Ensure mix of must-have, performance, and delighter features

Return in this exact format:
PRODUCT_INTERPRETATION: [Any corrections made]
SUGGESTED_PRODUCTS:
- [Product Name] | [Brief reason for inclusion]
SUGGESTED_FEATURES:
- [Feature name] | [Generic description]`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
      // "claude-sonnet-4-20250514"
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0].message.content || "";
    return this.parseSuggestionResponse(content);
  }

  async coordinateFullAnalysis(
    products: string[],
    features: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void
  ): Promise<any> {
    console.log("[Orchestrator] Starting full analysis coordination");
    
    // Progress: Discovery complete
    onProgress({
      step: 'discovery',
      message: 'Initial setup complete. Starting comprehensive research...',
      progress: 20
    });

    // Step 1: Research Phase
    onProgress({
      step: 'research',
      message: 'Researching all products and features...',
      progress: 40
    });

    // TODO: Call Research Agent
    const researchData = await this.mockResearchPhase(products, features, targetCustomer);

    // Step 2: Categorization Phase
    onProgress({
      step: 'categorization',
      message: 'Categorizing features using Kano Model...',
      progress: 60
    });

    // TODO: Call Validator Agent
    const categorizedData = await this.mockCategorizationPhase(researchData, targetCustomer);

    // Step 3: Table Creation
    onProgress({
      step: 'table_creation',
      message: 'Building competitive analysis table...',
      progress: 80
    });

    const kanoTable = this.buildKanoTable(categorizedData, products);

    // Step 4: Strategic Analysis
    onProgress({
      step: 'analysis',
      message: 'Generating strategic insights...',
      progress: 90
    });

    // TODO: Call Analyst Agent
    const analysis = await this.mockAnalysisPhase(kanoTable, targetCustomer);

    return {
      tableData: kanoTable,
      analysis: analysis
    };
  }

  private cleanProductList(productsString: string): string[] {
    const products = productsString.split(',').map(p => p.trim());
    const filterWords = ['etc', 'more', 'others', 'additional', 'similar'];
    
    return products.filter(product => 
      product && !filterWords.includes(product.toLowerCase())
    );
  }

  private parseSuggestionResponse(content: string): SuggestionResponse {
    const lines = content.split('\n');
    const response: SuggestionResponse = {
      productInterpretation: '',
      suggestedProducts: [],
      suggestedFeatures: []
    };

    let section = '';
    
    for (const line of lines) {
      if (line.includes('PRODUCT_INTERPRETATION:')) {
        section = 'interpretation';
        response.productInterpretation = line.split(':')[1]?.trim() || '';
      } else if (line.includes('SUGGESTED_PRODUCTS:')) {
        section = 'products';
      } else if (line.includes('SUGGESTED_FEATURES:')) {
        section = 'features';
      } else if (line.trim().startsWith('-')) {
        const content = line.substring(1).trim();
        const [name, reason] = content.split('|').map(s => s.trim());
        
        if (section === 'products' && name) {
          response.suggestedProducts.push({ name, reason: reason || '' });
        } else if (section === 'features' && name) {
          response.suggestedFeatures.push(name);
        }
      }
    }

    return response;
  }

  private buildKanoTable(categorizedData: any, products: string[]): any {
    // Build the Kano table structure
    const features = categorizedData.categorized_features || [];
    const ratings: Record<string, Record<string, string>> = {};
    const sources: Record<string, string[]> = {};

    features.forEach((feature: any) => {
      ratings[feature.feature_name] = {};
      sources[feature.feature_name] = feature.sources || [];
      
      products.forEach(product => {
        const productRating = feature.product_ratings?.[product];
        if (productRating) {
          ratings[feature.feature_name][product] = productRating.rating;
        }
      });
    });

    return {
      products,
      features: features.map((f: any) => ({
        id: f.feature_name.toLowerCase().replace(/\s+/g, '-'),
        name: f.feature_name,
        description: f.generic_description,
        category: f.category,
        customerBenefit: f.category_rationale
      })),
      ratings,
      sources
    };
  }

  // Temporary mock functions until other agents are implemented
  private async mockResearchPhase(products: string[], features: string[], targetCustomer: string) {
    return {
      products: products.map(p => ({
        name: p,
        features: features.map(f => ({
          name: f,
          description: `${f} implementation for ${p}`,
          benefit: `Provides value to ${targetCustomer}`,
          sources: ['https://example.com']
        }))
      }))
    };
  }

  private async mockCategorizationPhase(researchData: any, targetCustomer: string) {
    const features = researchData.products[0]?.features || [];
    return {
      categorized_features: features.map((f: any, i: number) => ({
        feature_name: f.name,
        generic_description: f.description,
        category: i % 3 === 0 ? 'must-have' : i % 3 === 1 ? 'performance' : 'delighter',
        category_rationale: `Important for ${targetCustomer}`,
        product_ratings: researchData.products.reduce((acc: any, p: any) => {
          acc[p.name] = {
            rating: f.category === 'performance' ? 'High' : 'Yes',
            justification: 'Based on research'
          };
          return acc;
        }, {}),
        sources: f.sources
      }))
    };
  }

  private async mockAnalysisPhase(kanoTable: any, targetCustomer: string) {
    return {
      marketOverview: {
        totalFeatures: kanoTable.features.length,
        categoryBreakdown: {
          mustHaves: kanoTable.features.filter((f: any) => f.category === 'must-have').length,
          performance: kanoTable.features.filter((f: any) => f.category === 'performance').length,
          delighters: kanoTable.features.filter((f: any) => f.category === 'delighter').length
        }
      },
      keyFindings: {
        differentiationOpportunities: ['Advanced AI features', 'Real-time collaboration'],
        criticalGaps: ['Mobile app support', 'Enterprise security'],
        competitiveAdvantages: ['Superior performance', 'Unique integrations']
      },
      recommendations: {
        immediate: ['Add mobile support', 'Improve security'],
        shortTerm: ['Enhance collaboration features', 'Optimize performance'],
        longTerm: ['Develop AI capabilities', 'Expand integrations']
      }
    };
  }
}

export const orchestratorAgent = new OrchestratorAgent();
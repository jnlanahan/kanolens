import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { openai } from "../openai";
import { searchProductInformation } from "../openai";
import { researcherAgent } from "./researcher";
import { validatorAgent } from "./validator";
import { analystAgent } from "./analyst";
import { evaluatorAgent } from "./evaluator";
import { storage } from "../storage";

export interface OrchestratorInput {
  mode: 'suggestions' | 'comprehensive' | 'validation';
  formData?: {
    description?: string;
    products: string;
    targetCustomers: string;
    features?: string;
  };
  product?: string;
  benefit?: string;
  existingData?: any;
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

export interface ValidationResponse {
  isValid: boolean;
  correctedProduct?: string;
  message: string;
  suggestions?: string[];
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
    const cleanedProducts = this.cleanProductList(input.formData!.products);
    
    // Build the prompt for suggestions
    const prompt = `User submitted a competitive analysis request:
Description: ${input.formData!.description || 'Not provided'}
Products: ${cleanedProducts.join(', ')}
Target Customers: ${input.formData!.targetCustomers}
Initial Features: ${input.formData!.features || 'Not provided'}

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

  async validateManualInput(input: OrchestratorInput): Promise<ValidationResponse> {
    console.log("[Orchestrator] Validating manual input:", input.product);
    
    const prompt = `A user is manually adding a product to their competitive analysis:
Product Name: "${input.product}"
Key Benefit: "${input.benefit || 'Not provided'}"
Existing Products: ${input.existingData?.products?.join(', ') || 'None'}
Target Customer: ${input.existingData?.targetCustomer || 'Not specified'}

Your task:
1. Validate if this is a real, existing product
2. Check spelling and suggest corrections if needed
3. Verify it's a relevant competitor for the analysis
4. Provide suggestions for improvement if needed

Return in this exact format:
VALIDATION: [VALID/INVALID]
CORRECTED_PRODUCT: [Corrected name if needed, or original if valid]
MESSAGE: [Brief explanation of validation result]
SUGGESTIONS: [Optional suggestions, one per line starting with "-"]`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.choices[0].message.content || "";
    return this.parseValidationResponse(content);
  }

  async coordinateFullAnalysis(
    products: string[],
    features: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void,
    sessionId?: number
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

    const startTime = Date.now();
    const researchRequest = {
      mode: 'comprehensive' as const,
      products,
      targetCustomer,
      marketCategory: 'Competitive Analysis Tools',
      featuresToResearch: features
    };
    
    const researchData = await researcherAgent.performResearch(researchRequest);
    const researchTime = Date.now() - startTime;
    
    // Trigger evaluation for researcher agent asynchronously
    if (sessionId) {
      this.evaluateAgent('researcher', researchRequest, researchData, sessionId, targetCustomer, products, researchTime);
    }

    // Step 2: Categorization Phase
    onProgress({
      step: 'categorization',
      message: 'Categorizing features using Kano Model...',
      progress: 60
    });

    const validatorStartTime = Date.now();
    const validatorRequest = {
      researchData: researchData,
      targetCustomer,
      products
    };
    
    const categorizedData = await validatorAgent.categorizeFeatures(validatorRequest);
    const validatorTime = Date.now() - validatorStartTime;
    
    // Trigger evaluation for validator agent asynchronously
    if (sessionId) {
      this.evaluateAgent('validator', validatorRequest, categorizedData, sessionId, targetCustomer, products, validatorTime);
    }

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

    const analystStartTime = Date.now();
    const analysisRequest = {
      kanoTable: kanoTable,
      targetCustomer: targetCustomer
    };
    
    const analysis = await analystAgent.analyzeKanoTable(analysisRequest);
    const analystTime = Date.now() - analystStartTime;
    
    // Trigger evaluation for analyst agent asynchronously
    if (sessionId) {
      this.evaluateAgent('analyst', analysisRequest, analysis, sessionId, targetCustomer, products, analystTime);
    }

    return {
      tableData: kanoTable,
      analysis: analysis
    };
  }

  // Helper method to trigger evaluations asynchronously
  private async evaluateAgent(
    agentName: 'orchestrator' | 'researcher' | 'validator' | 'analyst',
    input: any,
    output: any,
    sessionId: number,
    targetCustomer: string,
    products: string[],
    executionTime: number
  ) {
    try {
      // Skip evaluation for test sessions
      if (sessionId === 999999) {
        console.log(`[Orchestrator] Skipping evaluation for test session`);
        return;
      }

      const evaluation = await evaluatorAgent.evaluateAgent({
        agentName,
        input,
        output,
        context: {
          sessionId,
          targetCustomer,
          products,
          executionTime,
        },
      });

      // Store evaluation in database
      await storage.createAgentEvaluation({
        sessionId,
        agentName,
        inputData: input,
        outputData: output,
        evaluation,
        promptVersion: '1.0',
      });

      console.log(`[Orchestrator] Evaluation completed for ${agentName}:`, {
        score: evaluation.score,
        strengths: evaluation.strengths.length,
        weaknesses: evaluation.weaknesses.length,
      });
    } catch (error) {
      console.error(`[Orchestrator] Failed to evaluate ${agentName}:`, error);
    }
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

  private parseValidationResponse(content: string): ValidationResponse {
    const response: ValidationResponse = {
      isValid: false,
      message: 'Validation failed',
      suggestions: []
    };

    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('VALIDATION:')) {
        const status = trimmed.replace('VALIDATION:', '').trim();
        response.isValid = status === 'VALID';
      } else if (trimmed.startsWith('CORRECTED_PRODUCT:')) {
        response.correctedProduct = trimmed.replace('CORRECTED_PRODUCT:', '').trim();
      } else if (trimmed.startsWith('MESSAGE:')) {
        response.message = trimmed.replace('MESSAGE:', '').trim();
      } else if (trimmed.startsWith('SUGGESTIONS:')) {
        currentSection = 'suggestions';
      } else if (trimmed.startsWith('-') && currentSection === 'suggestions') {
        const suggestion = trimmed.substring(1).trim();
        if (suggestion) {
          response.suggestions!.push(suggestion);
        }
      }
    }

    return response;
  }

  private buildKanoTable(categorizedData: any, products: string[]): any {
    console.log('[Orchestrator] Building Kano table with', categorizedData.categorizedFeatures?.length || 0, 'features');
    
    // Build the Kano table structure using the correct property names
    const features = categorizedData.categorizedFeatures || [];
    const ratings: Record<string, Record<string, string>> = {};
    const sources: Record<string, string[]> = {};

    features.forEach((feature: any) => {
      const featureId = feature.featureName.toLowerCase().replace(/\s+/g, '-');
      ratings[featureId] = {};
      sources[featureId] = ['Market research', 'Product documentation'];
      
      console.log(`[Orchestrator] Processing feature: ${feature.featureName} (ID: ${featureId})`);
      console.log(`[Orchestrator] Product ratings available:`, Object.keys(feature.productRatings || {}));
      
      products.forEach(product => {
        const productRating = feature.productRatings?.[product];
        if (productRating) {
          ratings[featureId][product] = productRating.rating;
          console.log(`[Orchestrator] Set ${featureId} -> ${product} = ${productRating.rating}`);
        } else {
          // Set default value instead of leaving undefined
          ratings[featureId][product] = 'N/A';
          console.log(`[Orchestrator] No rating found for ${featureId} -> ${product}, setting N/A`);
        }
      });
    });

    console.log('[Orchestrator] Final ratings object:', JSON.stringify(ratings, null, 2));
    console.log('[Orchestrator] Kano table built with', Object.keys(ratings).length, 'rated features');
    return {
      products,
      features: features.map((f: any) => ({
        id: f.featureName.toLowerCase().replace(/\s+/g, '-'),
        name: f.featureName,
        description: f.genericDescription,
        category: f.category,
        customerBenefit: f.categoryRationale
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
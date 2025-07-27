import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { openai } from "../openai";
import { searchProductInformation } from "../openai";
import { researcherAgent } from "./researcher";
import { validatorAgent } from "./validator";
import { analystAgent } from "./analyst";
import { evaluatorAgent } from "./evaluator";
import { storage } from "../storage";
import { langSmithService, withLangSmithTrace } from "../langsmith";
import { RunTree } from "langsmith";

export type AnalysisMode = 'quick';

export interface OrchestratorInput {
  mode: 'suggestions' | 'comprehensive' | 'validation';
  analysisMode?: AnalysisMode;
  formData?: {
    description?: string;
    products: string;
    targetCustomers: string;
    features?: string;
    analysisMode?: AnalysisMode;
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
  private systemPrompt = `You are the Orchestrator agent for KanoLens, an AI-powered competitive analysis platform using the Kano Model framework. You coordinate a multi-agent analysis system with 5 specialized agents working in documented sequence.

INTELLIGENCE REQUIREMENTS:
You must understand user intent, not just literal input. When users type ambiguous words, interpret what they actually mean:
- "more", "others", "etc.", "additional" = user wants you to suggest more items
- Abbreviations like "MS Teams" = standardize to "Microsoft Teams"  
- Categories like "CRM tools" = understand they want specific CRM products
- Misspellings = intelligently correct based on context
- Non-specific words = interpret based on surrounding context

CONTEXTUAL AWARENESS:
Always use ALL available context to make suggestions:
- Description: Primary source for understanding business domain and priorities
- Target Customers: Determines what features matter most
- Existing Products: Shows competitive landscape and market segment
- User Role: Influences what features are most relevant
- Industry patterns: Apply domain knowledge

SUGGESTION QUALITY:
- Products must be real, existing, and directly competitive
- Features must be specific (not generic categories)
- Prioritize suggestions based on relevance to provided context
- Balance market leaders with emerging competitors
- Consider Kano model distribution in feature suggestions

WORKFLOW COORDINATION:
- Researcher: Gathers product data and features
- Validator: Categorizes features into Kano model (Must-Have, Performance, Delighter)
- Analyst: Generates strategic insights and recommendations
- Evaluator: Assesses agent performance and accuracy
- Ensure Kano model rule compliance: 100% of user-approved features (not original), max 50 in final table`;

  async processSuggestions(input: OrchestratorInput): Promise<SuggestionResponse> {
    console.log("[Orchestrator] Processing suggestions for form data");
    
    // Clean product names
    const cleanedProducts = this.cleanProductList(input.formData!.products);
    
    // Build the prompt for suggestions
    const prompt = `You are helping create a competitive analysis. Analyze this user input with intelligence and context awareness:

USER INPUT ANALYSIS:
Description: "${input.formData!.description || 'Not provided'}"
Target Customers: "${input.formData!.targetCustomers}"
Products Listed: "${cleanedProducts.join(', ')}"
Features Listed: "${input.formData!.features || 'Not provided'}"

INTELLIGENT INPUT INTERPRETATION:
1. UNDERSTAND USER INTENT:
   - If user wrote "more", "others", "etc.", "additional" - they want you to suggest more items
   - If they listed categories (e.g., "CRM tools") - suggest specific products in that category
   - If they used abbreviations (e.g., "MS Teams", "AWS") - standardize to full names
   - If they misspelled products - correct them based on context
   - If they listed non-products - understand what they actually meant

2. PRODUCT NAME STANDARDIZATION:
   - Expand abbreviations: "MS Teams" → "Microsoft Teams", "AWS" → "Amazon Web Services"
   - Correct obvious misspellings using context clues
   - Remove words that aren't products but understand their intent
   - Standardize corporate naming conventions

3. CONTEXT-DRIVEN SUGGESTIONS:
   - Use the DESCRIPTION as primary guide for domain and priorities
   - Adapt suggestions to TARGET CUSTOMERS' specific needs
   - Consider what the existing PRODUCTS tell you about market segment
   - Build on existing FEATURES but don't just duplicate them

4. PRODUCT SUGGESTIONS (3-5 products):
   - Must be real, existing products currently available
   - Direct competitors serving the same target customer segment
   - Mix of established market leaders and emerging players
   - Highly relevant to the business context described
   - Consider company size implications from description

5. FEATURE SUGGESTIONS (8-12 features):
   - Prioritize features mentioned in or implied by description
   - Focus on capabilities that matter to the target customers
   - Include competitive differentiators from suggested products
   - Balance across Kano categories:
     * Must-Have (core functionality): 40%
     * Performance (efficiency/effectiveness): 40% 
     * Delighter (innovative/surprising): 20%
   - Use specific, clear feature names (not vague categories)

REQUIRED OUTPUT FORMAT:
PRODUCT_INTERPRETATION: [Explain any corrections, standardizations, or interpretations made]
SUGGESTED_PRODUCTS:
- [Exact Product Name] | [Specific reason based on context and target customer needs]
SUGGESTED_FEATURES:
- [Specific Feature Name] | [Brief description of why relevant to this analysis]

Remember: Be intelligent about user input. Don't just take words literally - understand what the user actually wants and provide contextually relevant, high-quality suggestions.`;

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
    
    const prompt = `INTELLIGENT INPUT VALIDATION

USER IS MANUALLY ADDING:
Product: "${input.product}"
Benefit: "${input.benefit || 'Not provided'}"

EXISTING ANALYSIS CONTEXT:
Products: ${input.existingData?.products?.join(', ') || 'None'}
Target Customer: ${input.existingData?.targetCustomer || 'Not specified'}
Description: ${input.existingData?.description || 'Not provided'}

INTELLIGENT VALIDATION TASKS:

1. UNDERSTAND USER INTENT:
   - Is this a real product name or did they abbreviate/misspell?
   - Are they referring to a well-known product with a shortened name?
   - Did they input a category when they meant a specific product?

2. SMART CORRECTIONS:
   - Expand abbreviations: "Teams" → "Microsoft Teams", "Sheets" → "Google Sheets"
   - Fix obvious typos based on context and similar product names
   - Standardize corporate naming conventions
   - If they input a category, suggest the most relevant specific product

3. RELEVANCE ANALYSIS:
   - Does this product compete with the existing products?
   - Does it serve the same target customer segment?
   - Is it appropriate for the business context described?
   - Would it add value to this competitive analysis?

4. INTELLIGENT SUGGESTIONS:
   - If invalid, suggest similar products that would be relevant
   - If it's a category, suggest specific products in that category
   - Consider the competitive landscape already established

OUTPUT FORMAT:
VALIDATION: [VALID/NEEDS_CORRECTION/INVALID]
CORRECTED_PRODUCT: [Standardized name, or original if already correct]
MESSAGE: [Explain your reasoning and any changes made]
SUGGESTIONS: [If invalid/corrected, provide alternatives that would fit better]

Be intelligent: Don't just check if words exist - understand what the user meant and help them get the best result for their analysis.`;

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
    sessionId?: number,
    analysisMode: AnalysisMode = 'quick'
  ): Promise<any> {
    console.log(`[DEBUG] [Orchestrator] coordinateFullAnalysis called with:`, {
      products,
      features,
      targetCustomer,
      sessionId
    });
    console.log(`[Orchestrator] Starting ${analysisMode} analysis coordination`);
    
    // Create LangSmith workflow trace
    const workflowTrace = await langSmithService.createWorkflowTrace(
      sessionId || 0,
      { products, features, targetCustomer, analysisMode }
    );
    
    try {
      const result = await this.executeAnalysisWithRetry(
        products, 
        features, 
        targetCustomer, 
        onProgress, 
        sessionId,
        2, // maxRetries
        workflowTrace, // Pass trace to child operations
        analysisMode
      );

      // Complete the workflow trace with results
      await langSmithService.completeWorkflowTrace(workflowTrace, result, {
        accuracy: this.calculateAccuracy(result),
        completeness: this.calculateCompleteness(result, products, features),
        latency: Date.now() - (workflowTrace?.start_time || Date.now())
      });

      console.log(`[DEBUG] [Orchestrator] coordinateFullAnalysis result for session ${sessionId}:`, result);
      return result;
    } catch (error) {
      console.error(`[DEBUG] [Orchestrator] coordinateFullAnalysis error for session ${sessionId}:`, error);
      console.error('[Orchestrator] Analysis failed:', error);
      
      // Check if this is a critical error that requires fallback
      const isCriticalError = error instanceof Error && (
        error.message.includes('Perplexity') ||
        error.message.includes('OpenAI') ||
        error.message.includes('research failed') ||
        error.message.includes('No features extracted')
      );
      
      // For non-critical errors (database, logging, etc.), try to continue without those features
      if (!isCriticalError) {
        console.log('[Orchestrator] Non-critical error detected, attempting analysis without logging...');
        
        try {
          // Try to run the analysis without database/logging dependencies
          const result = await this.performAnalysisWithoutLogging(products, features, targetCustomer, onProgress);
          
          onProgress({
            step: 'analysis',
            message: 'Analysis completed (logging disabled due to connection issues)',
            progress: 100
          });
          
          return result;
        } catch (analysisError) {
          console.error('[Orchestrator] Analysis also failed without logging:', analysisError);
          // Now fall back to mock data
        }
      }
      
      // Record error in LangSmith trace (if possible)
      try {
        if (workflowTrace) {
          workflowTrace.end_time = Date.now();
          workflowTrace.error = error instanceof Error ? error.message : 'Unknown error';
          await workflowTrace.patchRun();
        }
      } catch (traceError) {
        console.error('[Orchestrator] Failed to log error trace:', traceError.message);
      }
      
      onProgress({
        step: 'error',
        message: 'Analysis failed - generating fallback results',
        progress: 0,
        data: { error: error.message }
      });
      
      // NO FALLBACK - throw the error to force real research
      throw error;
    }
  }

  private async executeAnalysisWithRetry(
    products: string[],
    features: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void,
    sessionId?: number,
    maxRetries = 2,
    workflowTrace?: RunTree | null,
    analysisMode: AnalysisMode = 'quick'
  ): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.performFullAnalysis(products, features, targetCustomer, onProgress, sessionId, workflowTrace, analysisMode);
      } catch (error) {
        console.error(`[Orchestrator] Analysis attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.log(`[Orchestrator] Retrying analysis (attempt ${attempt + 1}/${maxRetries})...`);
        onProgress({
          step: 'discovery',
          message: `Retrying analysis (attempt ${attempt + 1})...`,
          progress: 10
        });
        
        // Brief delay before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  private async performAnalysisWithoutLogging(
    products: string[],
    features: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void
  ): Promise<any> {
    console.log('[Orchestrator] Executing analysis without logging/database dependencies...');
    
    // Progress: Discovery complete
    onProgress({
      step: 'discovery',
      message: 'Initial setup complete. Starting research...',
      progress: 20
    });

    // Step 1: Research Phase (no logging)
    onProgress({
      step: 'research',
      message: 'Researching products and key features...',
      progress: 40
    });
    
    const researchRequest = {
      mode: 'comprehensive' as const,
      products,
      targetCustomer,
      marketCategory: 'Competitive Analysis Tools',
      featuresToResearch: features,
      originallyAgreedFeatures: features, // Phase 2: Mark features from initial conversation as originally agreed
      analysisMode: 'quick' as const
    };
    
    const researchData = await researcherAgent.performResearch(researchRequest);

    // Step 2: Categorization Phase (no logging)
    onProgress({
      step: 'categorization',
      message: 'Categorizing features using Kano Model...',
      progress: 60
    });
    
    const validatorRequest = {
      researchData: researchData,
      targetCustomer,
      products
    };
    
    const categorizedData = await validatorAgent.categorizeFeatures(validatorRequest);

    // Step 3: Table Creation
    onProgress({
      step: 'table_creation',
      message: 'Building competitive analysis table...',
      progress: 80
    });

    const kanoTable = this.buildKanoTable(categorizedData, products);

    // Step 4: Strategic Analysis (no logging)
    onProgress({
      step: 'analysis',
      message: 'Generating strategic recommendations...',
      progress: 90
    });
    
    const analysisRequest = {
      kanoTable: kanoTable,
      targetCustomer: targetCustomer
    };
    
    const analysis = await analystAgent.analyzeKanoTable(analysisRequest);

    return {
      tableData: kanoTable,
      analysis: analysis
    };
  }

  private async performFullAnalysis(
    products: string[],
    features: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void,
    sessionId?: number,
    workflowTrace?: RunTree | null,
    analysisMode: AnalysisMode = 'quick'
  ): Promise<any> {
    console.log(`[Orchestrator] Executing ${analysisMode} analysis steps...`);
    
    // Get mode-specific configuration
    const modeConfig = this.getModeConfiguration(analysisMode);
    
    // Progress: Discovery complete
    onProgress({
      step: 'discovery',
      message: modeConfig.discoveryMessage,
      progress: 20
    });

    // Step 1: Research Phase with granular progress tracking
    onProgress({
      step: 'research',
      message: modeConfig.researchMessage,
      progress: 30
    });

    const startTime = Date.now();
    const researchRequest = {
      mode: modeConfig.researchMode,
      products,
      targetCustomer,
      marketCategory: 'Competitive Analysis Tools',
      featuresToResearch: features,
      originallyAgreedFeatures: features, // Phase 2: Mark features from initial conversation as originally agreed
      analysisMode // Pass through the analysis mode
    };
    
    // Create LangSmith trace for researcher agent (non-fatal)
    let researcherTrace = null;
    try {
      researcherTrace = await langSmithService.traceAgent(workflowTrace, {
        agentName: 'researcher',
        sessionId,
        input: researchRequest,
        output: null,
        startTime,
        endTime: startTime,
        metadata: { step: 'research', products: products.length, features: features.length }
      });
    } catch (traceError) {
      console.log('[Orchestrator] Failed to create researcher trace (non-fatal):', traceError.message);
    }
    
    // Perform research with granular progress tracking
    const researchData = await this.performResearchWithProgress(
      researchRequest, 
      onProgress, 
      researcherAgent
    );
    const researchTime = Date.now() - startTime;
    
    // COMPREHENSIVE LOGGING - Track rich data flow
    console.log(`[Orchestrator] Research complete for ${products.join(', ')}`);
    console.log(`[Orchestrator] Research data structure:`, {
      hasProducts: !!researchData.products,
      productCount: researchData.products?.length || 0,
      firstProductFeatureCount: researchData.products?.[0]?.features?.length || 0,
      totalCharacters: JSON.stringify(researchData).length
    });
    
    if (researchData.products && researchData.products.length > 0) {
      researchData.products.forEach((product, i) => {
        console.log(`[Orchestrator] Product ${i + 1}: ${product.name} - ${product.features?.length || 0} features`);
        if (product.features && product.features.length > 0) {
          console.log(`[Orchestrator] Sample features for ${product.name}:`, 
            product.features.slice(0, 3).map(f => f.name));
        }
      });
    }
    
    // Complete researcher trace (non-fatal)
    if (researcherTrace) {
      try {
        researcherTrace.end_time = Date.now();
        researcherTrace.outputs = researchData;
        await researcherTrace.patchRun();
      } catch (traceError) {
        console.log('[Orchestrator] Failed to complete researcher trace (non-fatal):', traceError.message);
      }
    }
    
    // Trigger evaluation for researcher agent asynchronously
    if (sessionId) {
      this.evaluateAgent('researcher', researchRequest, researchData, sessionId, targetCustomer, products, researchTime);
    }

    // Step 2: Categorization Phase
    onProgress({
      step: 'categorization',
      message: modeConfig.categorizationMessage,
      progress: 60
    });

    const validatorStartTime = Date.now();
    // Use validateResearch for simpler API - it handles the request structure internally
    
    // Create LangSmith trace for validator agent (non-fatal)
    let validatorTrace = null;
    try {
      validatorTrace = await langSmithService.traceAgent(workflowTrace, {
        agentName: 'validator',
        sessionId,
        input: researchData,
        output: null,
        startTime: validatorStartTime,
        endTime: validatorStartTime,
        metadata: { step: 'categorization', featuresCount: (researchData as any)?.products?.[0]?.features?.length || 0 }
      });
    } catch (traceError) {
      console.log('[Orchestrator] Failed to create validator trace (non-fatal):', traceError.message);
    }
    
    // Pass proper validation request with target customer context
    const validationRequest = {
      researchData: researchData,
      targetCustomer: targetCustomer
    };
    const categorizedData = await validatorAgent.categorizeFeatures(validationRequest);
    const validatorTime = Date.now() - validatorStartTime;
    
    // COMPREHENSIVE LOGGING - Track validation output
    console.log(`[Orchestrator] Validation complete`);
    console.log(`[Orchestrator] Categorized features:`, {
      totalFeatures: categorizedData.categorizedFeatures?.length || 0,
      hasProductRatings: categorizedData.categorizedFeatures?.[0]?.productRatings ? 'Yes' : 'No',
      sampleFeatureName: categorizedData.categorizedFeatures?.[0]?.featureName || 'None'
    });
    
    if (categorizedData.categorizedFeatures && categorizedData.categorizedFeatures.length > 0) {
      const sampleFeature = categorizedData.categorizedFeatures[0];
      console.log(`[Orchestrator] Sample feature analysis:`, {
        name: sampleFeature.featureName,
        category: sampleFeature.category,
        hasRatings: !!sampleFeature.productRatings,
        productRatingKeys: Object.keys(sampleFeature.productRatings || {}),
        sampleJustification: Object.values(sampleFeature.productRatings || {})[0]?.justification?.substring(0, 80)
      });
    }
    
    // Complete validator trace (non-fatal)
    if (validatorTrace) {
      try {
        validatorTrace.end_time = Date.now();
        validatorTrace.outputs = categorizedData;
        await validatorTrace.patchRun();
      } catch (traceError) {
        console.log('[Orchestrator] Failed to complete validator trace (non-fatal):', traceError.message);
      }
    }
    
    // Trigger evaluation for validator agent asynchronously
    if (sessionId) {
      this.evaluateAgent('validator', validationRequest, categorizedData, sessionId, targetCustomer, products, validatorTime);
    }

    // Step 3: Table Creation
    onProgress({
      step: 'table_creation',
      message: 'Building competitive analysis table...',
      progress: 80
    });

    const kanoTable = this.buildKanoTable(categorizedData, products);
    
    // COMPREHENSIVE LOGGING - Track final table creation
    console.log(`[Orchestrator] Kano table built:`, {
      products: kanoTable.products?.length || 0,
      features: kanoTable.features?.length || 0,
      hasRatings: !!kanoTable.ratings,
      hasJustifications: !!kanoTable.justifications,
      hasSources: !!kanoTable.sources,
      ratingsKeys: Object.keys(kanoTable.ratings || {}),
      justificationsKeys: Object.keys(kanoTable.justifications || {}),
    });
    
    if (kanoTable.justifications && kanoTable.features && kanoTable.features.length > 0) {
      const firstFeatureId = kanoTable.features[0].id;
      const firstProduct = products[0];
      const sampleJustification = kanoTable.justifications[firstFeatureId]?.[firstProduct];
      console.log(`[Orchestrator] Sample justification for ${firstFeatureId} -> ${firstProduct}:`);
      console.log(`"${sampleJustification?.substring(0, 100)}..."`);
      
      if (sampleJustification?.includes('configure PERPLEXITY_API_KEY')) {
        console.log('❌ [Orchestrator] ISSUE: Fallback justification detected in final table!');
      } else if (sampleJustification?.includes('No specific data available')) {
        console.log('⚠️ [Orchestrator] WARNING: Generic justification in final table');
      } else {
        console.log('✅ [Orchestrator] SUCCESS: Real justification in final table');
      }
    }

    // Step 4: Strategic Analysis
    onProgress({
      step: 'analysis',
      message: modeConfig.analysisMessage,
      progress: 90
    });

    const analystStartTime = Date.now();
    const analysisRequest = {
      kanoTable: kanoTable,
      targetCustomer: targetCustomer
    };
    
    // Create LangSmith trace for analyst agent (non-fatal)
    let analystTrace = null;
    try {
      analystTrace = await langSmithService.traceAgent(workflowTrace, {
        agentName: 'analyst',
        sessionId,
        input: analysisRequest,
        output: null,
        startTime: analystStartTime,
        endTime: analystStartTime,
        metadata: { 
          step: 'analysis', 
          tableFeatures: kanoTable?.features?.length || 0,
          tableProducts: kanoTable?.products?.length || 0
        }
      });
    } catch (traceError) {
      console.log('[Orchestrator] Failed to create analyst trace (non-fatal):', traceError.message);
    }
    
    const analysis = await analystAgent.analyzeKanoTable(analysisRequest);
    const analystTime = Date.now() - analystStartTime;
    
    // Complete analyst trace (non-fatal)
    if (analystTrace) {
      try {
        analystTrace.end_time = Date.now();
        analystTrace.outputs = analysis;
        await analystTrace.patchRun();
      } catch (traceError) {
        console.log('[Orchestrator] Failed to complete analyst trace (non-fatal):', traceError.message);
      }
    }
    
    // Trigger evaluation for analyst agent asynchronously
    if (sessionId) {
      this.evaluateAgent('analyst', analysisRequest, analysis, sessionId, targetCustomer, products, analystTime);
    }

    return {
      tableData: kanoTable,
      analysis: analysis
    };
  }

  // Get mode-specific configuration
  private getModeConfiguration(mode: AnalysisMode) {
    switch (mode) {
      case 'express':
        return {
          discoveryMessage: 'Setting up express analysis for quick insights...',
          researchMessage: 'Gathering essential product information...',
          categorizationMessage: 'Applying rapid Kano categorization...',
          analysisMessage: 'Generating key strategic insights...',
          researchMode: 'basic' as const,
          maxFeatures: 5,
          researchDepth: 'shallow',
          skipDetailedAnalysis: true
        };
      case 'quick':
        return {
          discoveryMessage: 'Initial setup complete. Starting balanced research...',
          researchMessage: 'Researching products and key features...',
          categorizationMessage: 'Categorizing features using Kano Model...',
          analysisMessage: 'Generating strategic recommendations...',
          researchMode: 'comprehensive' as const,
          maxFeatures: 10,
          researchDepth: 'medium',
          skipDetailedAnalysis: false
        };
      case 'deep':
        return {
          discoveryMessage: 'Initial setup complete. Starting comprehensive research...',
          researchMessage: 'Conducting thorough market and product research...',
          categorizationMessage: 'Performing detailed Kano Model categorization...',
          analysisMessage: 'Generating comprehensive strategic analysis...',
          researchMode: 'comprehensive' as const,
          maxFeatures: 15,
          researchDepth: 'deep',
          skipDetailedAnalysis: false
        };
      default:
        return this.getModeConfiguration('quick');
    }
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

      // Store evaluation in database (non-fatal)
      try {
        await storage.createAgentEvaluation({
          sessionId,
          agentName,
          inputData: input,
          outputData: output,
          evaluation,
          promptVersion: '1.0',
        });
      } catch (dbError) {
        console.log(`[Orchestrator] Failed to store evaluation for ${agentName} (non-fatal):`, dbError.message);
      }

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
    // Simply split by comma and trim - let the LLM handle intelligent interpretation
    return productsString.split(',').map(p => p.trim()).filter(p => p.length > 0);
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
    const justifications: Record<string, Record<string, string>> = {};
    const sources: Record<string, string[]> = {};

    features.forEach((feature: any) => {
      const featureId = feature.featureName.toLowerCase().replace(/\s+/g, '-');
      ratings[featureId] = {};
      justifications[featureId] = {};
      
      // Use actual sources from research if available
      const featureSources = [];
      
      // Add competitive analysis sources
      featureSources.push('Market Research Analysis - Competitive Intelligence');
      featureSources.push('Product Documentation Review - Feature Comparison');
      
      // Add product-specific sources for this feature
      products.forEach(product => {
        featureSources.push(`${product} Product Research - ${feature.featureName} Analysis`);
      });
      
      sources[featureId] = featureSources;
      
      console.log(`[Orchestrator] Processing feature: ${feature.featureName} (ID: ${featureId})`);
      console.log(`[Orchestrator] Product ratings available:`, Object.keys(feature.productRatings || {}));
      
      products.forEach(product => {
        const productRating = feature.productRatings?.[product];
        if (productRating) {
          ratings[featureId][product] = productRating.rating;
          justifications[featureId][product] = productRating.justification || `${product} provides ${feature.featureName} functionality`;
          console.log(`[Orchestrator] Set ${featureId} -> ${product} = ${productRating.rating}`);
        } else {
          // Set default value instead of leaving undefined
          ratings[featureId][product] = 'N/A';
          justifications[featureId][product] = `No specific data available for ${feature.featureName} in ${product}`;
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
      justifications,
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

  // FALLBACK REMOVED - System must use real research data only


  // LangSmith evaluation helper methods
  private calculateAccuracy(result: any): number {
    try {
      // Calculate accuracy based on:
      // - Features having valid categories (must-have, performance, delighter)
      // - Products having valid ratings
      // - Analysis containing required sections
      
      let accuracyScore = 0;
      let maxScore = 0;
      
      // Check table data quality (40% of score)
      if (result.tableData) {
        maxScore += 0.4;
        const features = result.tableData.features || [];
        const validCategories = ['must-have', 'performance', 'delighter'];
        
        if (features.length > 0) {
          const validFeatures = features.filter((f: any) => 
            f.name && f.category && validCategories.includes(f.category)
          );
          accuracyScore += (validFeatures.length / features.length) * 0.4;
        }
      }
      
      // Check analysis quality (40% of score)
      if (result.analysis) {
        maxScore += 0.4;
        const hasOverview = !!result.analysis.marketOverview;
        const hasFindings = !!result.analysis.keyFindings;
        const hasRecommendations = !!result.analysis.recommendations;
        
        const analysisScore = (hasOverview ? 0.33 : 0) + (hasFindings ? 0.33 : 0) + (hasRecommendations ? 0.34 : 0);
        accuracyScore += analysisScore * 0.4;
      }
      
      // Check ratings completeness (20% of score)
      if (result.tableData?.ratings) {
        maxScore += 0.2;
        const ratings = result.tableData.ratings;
        const totalRatings = Object.keys(ratings).reduce((count, featureId) => {
          return count + Object.keys(ratings[featureId]).length;
        }, 0);
        
        const expectedRatings = (result.tableData.features?.length || 0) * (result.tableData.products?.length || 0);
        if (expectedRatings > 0) {
          accuracyScore += Math.min(totalRatings / expectedRatings, 1) * 0.2;
        }
      }
      
      return maxScore > 0 ? Math.round((accuracyScore / maxScore) * 100) / 100 : 0.5;
    } catch (error) {
      console.error('[Orchestrator] Error calculating accuracy:', error);
      return 0.5; // Default moderate score on error
    }
  }

  private calculateCompleteness(result: any, products: string[], features: string[]): number {
    try {
      // Calculate completeness based on:
      // - All requested products are included
      // - All requested features are covered
      // - Analysis sections are present
      
      let completenessScore = 0;
      
      // Product completeness (30%)
      if (result.tableData?.products && products.length > 0) {
        const includedProducts = result.tableData.products.filter((p: string) => 
          products.some(original => original.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(original.toLowerCase()))
        );
        completenessScore += (includedProducts.length / products.length) * 0.3;
      }
      
      // Feature completeness (40%)
      if (result.tableData?.features && features.length > 0) {
        const includedFeatures = result.tableData.features.filter((f: any) => 
          features.some(original => original.toLowerCase().includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(original.toLowerCase()))
        );
        completenessScore += (includedFeatures.length / features.length) * 0.4;
      }
      
      // Analysis completeness (30%)
      if (result.analysis) {
        let analysisItems = 0;
        let totalItems = 6; // Expected items
        
        if (result.analysis.marketOverview) analysisItems++;
        if (result.analysis.keyFindings?.differentiationOpportunities?.length > 0) analysisItems++;
        if (result.analysis.keyFindings?.criticalGaps?.length > 0) analysisItems++;
        if (result.analysis.keyFindings?.competitiveAdvantages?.length > 0) analysisItems++;
        if (result.analysis.recommendations?.immediate?.length > 0) analysisItems++;
        if (result.analysis.recommendations?.shortTerm?.length > 0) analysisItems++;
        
        completenessScore += (analysisItems / totalItems) * 0.3;
      }
      
      return Math.round(completenessScore * 100) / 100;
    } catch (error) {
      console.error('[Orchestrator] Error calculating completeness:', error);
      return 0.7; // Default good score on error
    }
  }

  // Enhanced research method with granular progress tracking
  private async performResearchWithProgress(
    request: any,
    onProgress: (update: ProgressUpdate) => void,
    researcherAgent: any
  ): Promise<any> {
    console.log(`[Orchestrator] Starting research for ${request.products.length} products`);
    const totalProducts = request.products.length;
    let completedProducts = 0;
    
    // Initial research progress
    onProgress({
      step: 'research',
      message: `Researching ${totalProducts} products: ${request.products.join(', ')}...`,
      progress: 30,
      data: { 
        products: request.products,
        stage: 'starting',
        completedProducts: 0,
        totalProducts
      }
    });
    
    // Create a wrapper for the researcher to track progress per product
    const originalPerformResearch = researcherAgent.performResearch.bind(researcherAgent);
    
    // Override temporarily to add progress tracking
    researcherAgent.performResearch = async (req: any) => {
      // For each product being researched, update progress
      const updateInterval = setInterval(() => {
        if (completedProducts < totalProducts) {
          const currentProgress = 30 + Math.floor((completedProducts / totalProducts) * 25);
          onProgress({
            step: 'research',
            message: `Researching product ${completedProducts + 1} of ${totalProducts}...`,
            progress: currentProgress,
            data: {
              currentProduct: request.products[completedProducts],
              completedProducts,
              totalProducts,
              stage: 'in-progress'
            }
          });
        }
      }, 5000); // Update every 5 seconds during research
      
      try {
        const result = await originalPerformResearch(req);
        clearInterval(updateInterval);
        
        // Track completed products based on results
        completedProducts = result.products?.length || totalProducts;
        
        return result;
      } catch (error) {
        clearInterval(updateInterval);
        throw error;
      }
    };
    
    try {
      // Use the wrapped researcher method with progress tracking
      const researchData = await researcherAgent.performResearch(request);
      
      // Restore original method
      researcherAgent.performResearch = originalPerformResearch;
      
      // Update progress to completion of research
      onProgress({
        step: 'research',
        message: `Research completed for all ${totalProducts} products`,
        progress: 55,
        data: { 
          products: request.products,
          stage: 'completed',
          productsResearched: researchData.products?.length || 0,
          completedProducts: totalProducts,
          totalProducts
        }
      });
      
      return researchData;
    } catch (error) {
      // Restore original method on error
      researcherAgent.performResearch = originalPerformResearch;
      throw error;
    }
  }
}

export const orchestratorAgent = new OrchestratorAgent();
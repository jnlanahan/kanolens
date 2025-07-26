// Main analysis orchestration workflow
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { openai } from "../openai";
import { researcherAgent } from "../agents/researcher";
import { validatorAgent } from "../agents/validator";
import { analystAgent } from "../agents/analyst";
import { evaluatorAgent } from "../agents/evaluator";
import { storage } from "../storage";
import { langSmithService, withLangSmithTrace } from "../langsmith";
import { RunTree } from "langsmith";

export type AnalysisMode = 'quick';

export interface ProgressUpdate {
  step: 'discovery' | 'research' | 'categorization' | 'table_creation' | 'analysis';
  message: string;
  progress: number;
  data?: any;
}

export interface AnalysisResult {
  success: boolean;
  data?: {
    researchData: any;
    validationResults: any;
    kanoCategories: any;
    kanoTableData: any;
  };
  error?: string;
}

export class AnalysisWorkflow {
  private systemPrompt = `You are the Orchestrator agent for KanoLens, an AI-powered competitive analysis platform that uses the Kano Model framework. You receive structured form data from users and coordinate the multi-agent analysis process.

Key responsibilities:
1. Parse and clean form input (remove "etc", "more", "others")
2. Validate products are real and comparable
3. Generate competitor product suggestions when needed
4. Coordinate the 4-agent analysis pipeline:
   - Researcher: Finds detailed product features and information
   - Validator: Ensures data quality and consistency
   - Analyst: Categorizes features using Kano methodology
   - Evaluator: Reviews and improves analysis quality

Workflow steps:
DISCOVERY → RESEARCH → CATEGORIZATION → TABLE_CREATION → ANALYSIS

Output should be structured data that flows between agents efficiently.`;

  async coordinateFullAnalysis(
    products: string[],
    features: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void,
    sessionId?: number,
    analysisMode: AnalysisMode = 'quick'
  ): Promise<AnalysisResult> {
    try {
      console.log(`[Orchestrator] Starting full analysis for products: ${products.join(', ')}`);
      
      onProgress({
        step: 'discovery',
        message: 'Starting analysis workflow...',
        progress: 0
      });

      return await this.executeAnalysisWithRetry(
        products,
        features,
        targetCustomer,
        onProgress,
        sessionId,
        analysisMode
      );
    } catch (error) {
      console.error('[Orchestrator] Analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async executeAnalysisWithRetry(
    products: string[],
    features: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void,
    sessionId?: number,
    analysisMode: AnalysisMode = 'quick',
    maxRetries: number = 3
  ): Promise<AnalysisResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Orchestrator] Analysis attempt ${attempt} of ${maxRetries}`);
        
        const result = await this.performFullAnalysis(
          products,
          features,
          targetCustomer,
          onProgress,
          sessionId,
          analysisMode
        );
        
        console.log(`[Orchestrator] Analysis completed successfully on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Orchestrator] Analysis attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[Orchestrator] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return {
      success: false,
      error: `Analysis failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
    };
  }

  private async performFullAnalysis(
    products: string[],
    features: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void,
    sessionId?: number,
    analysisMode: AnalysisMode = 'quick'
  ): Promise<AnalysisResult> {
    let runTree: RunTree | null = null;

    try {
      // Create workflow trace
      if (sessionId) {
        runTree = await langSmithService.createWorkflowTrace(sessionId, {
          products,
          features,
          targetCustomer
        });
      }

      // Step 1: Research Phase
      onProgress({
        step: 'research',
        message: 'Conducting product research...',
        progress: 25
      });

      const researchData = await this.performResearchWithProgress(
        products,
        targetCustomer,
        onProgress,
        runTree
      );

      // Step 2: Validation Phase
      onProgress({
        step: 'categorization',
        message: 'Validating research data...',
        progress: 50
      });

      const validationResults = await this.performValidationWithProgress(
        researchData,
        targetCustomer,
        onProgress,
        runTree
      );

      // Step 3: Analysis Phase
      onProgress({
        step: 'analysis',
        message: 'Categorizing features using Kano methodology...',
        progress: 75
      });

      const kanoCategories = await this.performKanoAnalysis(
        validationResults,
        targetCustomer,
        features,
        onProgress,
        runTree
      );

      // Step 4: Table Creation
      onProgress({
        step: 'table_creation',
        message: 'Generating final Kano table...',
        progress: 90
      });

      const kanoTableData = await this.generateKanoTable(
        kanoCategories,
        validationResults,
        products,
        onProgress,
        runTree
      );

      // Complete workflow
      onProgress({
        step: 'analysis',
        message: 'Analysis completed successfully!',
        progress: 100,
        data: kanoTableData
      });

      // End workflow trace
      if (runTree) {
        await runTree.end({ success: true });
      }

      return {
        success: true,
        data: {
          researchData,
          validationResults,
          kanoCategories,
          kanoTableData
        }
      };
    } catch (error) {
      console.error('[Orchestrator] Analysis failed:', error);
      
      if (runTree) {
        await runTree.end({ 
          error: error instanceof Error ? error.message : String(error) 
        });
      }

      onProgress({
        step: 'analysis',
        message: 'Analysis failed. Please try again.',
        progress: 0
      });

      throw error;
    }
  }

  private async performResearchWithProgress(
    products: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void,
    runTree?: RunTree
  ): Promise<any> {
    console.log('[Orchestrator] Starting research phase...');
    
    try {
      const researchData = await withLangSmithTrace(
        async () => {
          return await researcherAgent.performResearch({
            mode: 'comprehensive',
            products,
            targetCustomer,
            marketCategory: 'Competitive Analysis Tools',
            featuresToResearch: [],
            originallyAgreedFeatures: []
          });
        },
        { agentName: 'research_phase' }
      );

      // Handle the case where research returns suggestions instead of comprehensive data
      if (Array.isArray(researchData)) {
        throw new Error('Research returned suggestions instead of comprehensive data');
      }

      if (!researchData || !researchData.products) {
        throw new Error('Research failed: No product data returned');
      }

      console.log(`[Orchestrator] Research completed: ${researchData.products.length} products analyzed`);
      return researchData;
    } catch (error) {
      console.error('[Orchestrator] Research phase failed:', error);
      throw new Error(`Research phase failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async performValidationWithProgress(
    researchData: any,
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void,
    runTree?: RunTree
  ): Promise<any> {
    console.log('[Orchestrator] Starting validation phase...');
    
    try {
      const validationResults = await withLangSmithTrace(
        async () => {
          return await validatorAgent.validateResearch(researchData);
        },
        { agentName: 'validation_phase' }
      );

      if (!validationResults || !validationResults.categorizedFeatures) {
        throw new Error('Validation failed: No categorized features returned');
      }

      console.log('[Orchestrator] Validation completed successfully');
      return validationResults;
    } catch (error) {
      console.error('[Orchestrator] Validation phase failed:', error);
      throw new Error(`Validation phase failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async performKanoAnalysis(
    validationResults: any,
    targetCustomer: string,
    features: string[],
    onProgress: (update: ProgressUpdate) => void,
    runTree?: RunTree
  ): Promise<any> {
    console.log('[Orchestrator] Starting Kano analysis phase...');
    
    try {
      // Build Kano table from validation results
      const kanoTable = {
        products,
        features: validationResults.categorizedFeatures.map((f: any) => ({
          id: f.featureName.toLowerCase().replace(/\s+/g, '-'),
          name: f.featureName,
          description: f.genericDescription,
          category: f.category,
          customerBenefit: f.categoryRationale
        })),
        ratings: this.buildRatingsFromValidation(validationResults.categorizedFeatures, products),
        sources: this.buildSourcesFromValidation(validationResults.categorizedFeatures)
      };
      
      const kanoCategories = await withLangSmithTrace(
        async () => {
          return await analystAgent.analyzeKanoTable({
            kanoTable,
            targetCustomer
          });
        },
        { agentName: 'kano_analysis_phase' }
      );

      if (!kanoCategories || !kanoCategories.marketOverview) {
        throw new Error('Kano analysis failed: No analysis results returned');
      }

      console.log('[Orchestrator] Kano analysis completed successfully');
      return kanoCategories;
    } catch (error) {
      console.error('[Orchestrator] Kano analysis phase failed:', error);
      throw new Error(`Kano analysis phase failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateKanoTable(
    kanoCategories: any,
    validationResults: any,
    products: string[],
    onProgress: (update: ProgressUpdate) => void,
    runTree?: RunTree
  ): Promise<any> {
    console.log('[Orchestrator] Generating final Kano table...');
    
    try {
      const kanoTableData = await withLangSmithTrace(
        async () => {
          // Return the table data structure expected by the UI
          return {
            products,
            features: validationResults.categorizedFeatures.map((f: any) => ({
              id: f.featureName.toLowerCase().replace(/\s+/g, '-'),
              name: f.featureName,
              description: f.genericDescription,
              category: f.category,
              customerBenefit: f.categoryRationale
            })),
            ratings: this.buildRatingsFromValidation(validationResults.categorizedFeatures, products),
            justifications: this.buildJustificationsFromValidation(validationResults.categorizedFeatures, products),
            sources: this.buildSourcesFromValidation(validationResults.categorizedFeatures),
            analysis: kanoCategories
          };
        },
        { agentName: 'table_generation_phase' }
      );

      if (!kanoTableData || !kanoTableData.features) {
        throw new Error('Table generation failed: Unable to create Kano table');
      }

      console.log('[Orchestrator] Kano table generation completed successfully');
      return kanoTableData;
    } catch (error) {
      console.error('[Orchestrator] Table generation phase failed:', error);
      throw new Error(`Table generation phase failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Helper method to validate input parameters
  validateAnalysisInput(products: string[], features: string[], targetCustomer: string): boolean {
    if (!products || products.length === 0) {
      throw new Error('Products array cannot be empty');
    }
    
    if (!targetCustomer || targetCustomer.trim() === '') {
      throw new Error('Target customer must be specified');
    }
    
    // Features can be empty - they may be discovered during research
    return true;
  }

  // Helper methods to build data structures from validation results
  private buildRatingsFromValidation(categorizedFeatures: any[], products: string[]): Record<string, Record<string, string>> {
    const ratings: Record<string, Record<string, string>> = {};
    
    categorizedFeatures.forEach((feature: any) => {
      const featureId = feature.featureName.toLowerCase().replace(/\s+/g, '-');
      ratings[featureId] = {};
      
      products.forEach(product => {
        const productRating = feature.productRatings?.[product];
        if (productRating) {
          ratings[featureId][product] = productRating.rating;
        } else {
          ratings[featureId][product] = 'N/A';
        }
      });
    });
    
    return ratings;
  }

  private buildJustificationsFromValidation(categorizedFeatures: any[], products: string[]): Record<string, Record<string, string>> {
    const justifications: Record<string, Record<string, string>> = {};
    
    categorizedFeatures.forEach((feature: any) => {
      const featureId = feature.featureName.toLowerCase().replace(/\s+/g, '-');
      justifications[featureId] = {};
      
      products.forEach(product => {
        const productRating = feature.productRatings?.[product];
        if (productRating) {
          justifications[featureId][product] = productRating.justification || `${product} provides ${feature.featureName} functionality`;
        } else {
          justifications[featureId][product] = `No specific data available for ${feature.featureName} in ${product}`;
        }
      });
    });
    
    return justifications;
  }

  private buildSourcesFromValidation(categorizedFeatures: any[]): Record<string, string[]> {
    const sources: Record<string, string[]> = {};
    
    categorizedFeatures.forEach((feature: any) => {
      const featureId = feature.featureName.toLowerCase().replace(/\s+/g, '-');
      
      // Extract sources from product ratings
      const featureSources: string[] = [];
      Object.values(feature.productRatings || {}).forEach((rating: any) => {
        if (rating.sources && Array.isArray(rating.sources)) {
          featureSources.push(...rating.sources);
        }
      });
      
      // Add default sources if none found
      if (featureSources.length === 0) {
        featureSources.push(
          'Market Research Analysis - Competitive Intelligence',
          'Product Documentation Review - Feature Comparison'
        );
      }
      
      sources[featureId] = featureSources;
    });
    
    return sources;
  }
}
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

export type AnalysisMode = 'express' | 'quick' | 'deep';

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
    let runTree: RunTree | undefined;

    try {
      // Create workflow trace
      if (sessionId) {
        runTree = await langSmithService.createWorkflowTrace(sessionId, {
          products,
          features,
          targetCustomer,
          analysisMode
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
        'research_phase',
        { products, targetCustomer },
        async () => {
          return await researcherAgent.performResearch({
            products,
            mode: 'comprehensive',
            targetCustomer
          });
        },
        runTree
      );

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
        'validation_phase',
        { researchData, targetCustomer },
        async () => {
          return await validatorAgent.validateData({
            researchData,
            targetCustomer,
            products: researchData.products || []
          });
        },
        runTree
      );

      if (!validationResults || !validationResults.success) {
        throw new Error('Validation failed: Data quality issues detected');
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
      const kanoCategories = await withLangSmithTrace(
        'kano_analysis_phase',
        { validationResults, targetCustomer, features },
        async () => {
          return await analystAgent.categorizeFeatures({
            validatedData: validationResults.validatedData || validationResults,
            targetCustomer,
            features
          });
        },
        runTree
      );

      if (!kanoCategories || !kanoCategories.success) {
        throw new Error('Kano analysis failed: Categorization unsuccessful');
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
        'table_generation_phase',
        { kanoCategories, products },
        async () => {
          return await analystAgent.generateKanoTable({
            kanoCategories: kanoCategories.kanoCategories || kanoCategories,
            products,
            validatedData: validationResults.validatedData || validationResults
          });
        },
        runTree
      );

      if (!kanoTableData || !kanoTableData.success) {
        throw new Error('Table generation failed: Unable to create Kano table');
      }

      console.log('[Orchestrator] Kano table generation completed successfully');
      return kanoTableData.tableData || kanoTableData;
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
}
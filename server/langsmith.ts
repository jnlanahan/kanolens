import { Client } from "langsmith";
import { RunTree } from "langsmith";

export interface AgentTraceData {
  agentName: string;
  sessionId?: number;
  input: any;
  output: any;
  startTime: number;
  endTime: number;
  metadata?: any;
  error?: string;
}

export interface EvaluationMetrics {
  accuracy?: number;
  completeness?: number;
  relevance?: number;
  performance?: number;
  cost?: number;
  latency?: number;
}

class LangSmithService {
  private client: Client | null = null;
  private isEnabled: boolean = false;

  constructor() {
    try {
      // Only initialize if LangSmith API key is provided
      if (process.env.LANGCHAIN_API_KEY) {
        this.client = new Client({
          apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
          apiKey: process.env.LANGCHAIN_API_KEY,
        });
        this.isEnabled = true;
        console.log('[LangSmith] Service initialized successfully');
      } else {
        console.log('[LangSmith] API key not found - tracing disabled (set LANGCHAIN_API_KEY to enable)');
      }
    } catch (error) {
      console.error('[LangSmith] Failed to initialize:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Create a new run tree for tracing a multi-agent workflow
   */
  async createWorkflowTrace(
    sessionId: number,
    input: {
      products: string[];
      features: string[];
      targetCustomer: string;
    }
  ): Promise<RunTree | null> {
    if (!this.isEnabled || !this.client) return null;

    try {
      const runTree = new RunTree({
        name: "kano-analysis-workflow",
        project_name: process.env.LANGCHAIN_PROJECT || "kanolens-multi-agent",
        inputs: {
          sessionId,
          products: input.products,
          features: input.features,
          targetCustomer: input.targetCustomer,
          timestamp: new Date().toISOString(),
        },
        run_type: "chain",
        extra: {
          metadata: {
            sessionId,
            workflowType: "full-analysis",
            agentCount: 4, // Orchestrator, Researcher, Validator, Analyst
          }
        }
      });

      await runTree.postRun();
      console.log(`[LangSmith] Workflow trace created for session ${sessionId}`);
      return runTree;
    } catch (error) {
      console.error('[LangSmith] Failed to create workflow trace:', error);
      return null;
    }
  }

  /**
   * Trace an individual agent execution
   */
  async traceAgent(
    parentTrace: RunTree | null,
    agentData: AgentTraceData
  ): Promise<RunTree | null> {
    if (!this.isEnabled || !this.client) return null;

    try {
      const runTree = new RunTree({
        name: `${agentData.agentName.toLowerCase()}-agent`,
        project_name: process.env.LANGCHAIN_PROJECT || "kanolens-multi-agent",
        inputs: agentData.input,
        outputs: agentData.output,
        run_type: "llm",
        start_time: agentData.startTime,
        end_time: agentData.endTime,
        error: agentData.error,
        parent_run: parentTrace || undefined,
        extra: {
          metadata: {
            agentName: agentData.agentName,
            sessionId: agentData.sessionId,
            executionTime: agentData.endTime - agentData.startTime,
            ...agentData.metadata
          }
        }
      });

      await runTree.postRun();
      console.log(`[LangSmith] Agent trace created for ${agentData.agentName}`);
      return runTree;
    } catch (error) {
      console.error(`[LangSmith] Failed to trace ${agentData.agentName}:`, error);
      return null;
    }
  }

  /**
   * Complete a workflow trace with final results
   */
  async completeWorkflowTrace(
    workflowTrace: RunTree | null,
    output: any,
    metrics: EvaluationMetrics = {}
  ): Promise<void> {
    if (!this.isEnabled || !workflowTrace) return;

    try {
      workflowTrace.end_time = Date.now();
      workflowTrace.outputs = {
        tableData: output.tableData,
        analysis: output.analysis,
        metrics: {
          totalFeatures: output.tableData?.features?.length || 0,
          totalProducts: output.tableData?.products?.length || 0,
          categoriesUsed: this.extractCategories(output.tableData?.features || []),
          ...metrics
        }
      };

      await workflowTrace.patchRun();
      console.log('[LangSmith] Workflow trace completed');
    } catch (error) {
      console.error('[LangSmith] Failed to complete workflow trace:', error);
    }
  }

  /**
   * Submit evaluation metrics for an agent
   */
  async evaluateAgent(
    agentTrace: RunTree | null,
    metrics: EvaluationMetrics,
    evaluatorName: string = "kano-evaluator"
  ): Promise<void> {
    if (!this.isEnabled || !agentTrace) return;

    try {
      // Create evaluation run
      const evaluationRun = new RunTree({
        name: evaluatorName,
        project_name: process.env.LANGCHAIN_PROJECT || "kanolens-multi-agent",
        inputs: {
          traceId: agentTrace.id,
          agentOutput: agentTrace.outputs
        },
        outputs: {
          scores: metrics,
          timestamp: new Date().toISOString()
        },
        run_type: "tool",
        parent_run: agentTrace,
        extra: {
          metadata: {
            evaluationType: "agent-performance",
            evaluatorName,
            metrics: Object.keys(metrics)
          }
        }
      });

      await evaluationRun.postRun();
      console.log(`[LangSmith] Evaluation submitted for ${evaluatorName}`);
    } catch (error) {
      console.error('[LangSmith] Failed to submit evaluation:', error);
    }
  }

  /**
   * Track cost and performance metrics
   */
  async trackPerformance(
    trace: RunTree | null,
    metrics: {
      tokenUsage?: { prompt: number; completion: number; total: number };
      cost?: number;
      latency?: number;
      memoryUsage?: number;
    }
  ): Promise<void> {
    if (!this.isEnabled || !trace) return;

    try {
      // Add performance metadata to existing trace
      if (trace.extra?.metadata) {
        trace.extra.metadata = {
          ...trace.extra.metadata,
          performance: {
            ...metrics,
            timestamp: new Date().toISOString()
          }
        };
      }

      await trace.patchRun();
      console.log('[LangSmith] Performance metrics tracked');
    } catch (error) {
      console.error('[LangSmith] Failed to track performance:', error);
    }
  }

  /**
   * Create a custom evaluator for Kano Model accuracy
   */
  async createKanoEvaluator(): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      // This would typically be done through the LangSmith UI or API
      // For now, we'll track the metrics manually
      console.log('[LangSmith] Kano evaluator framework ready');
    } catch (error) {
      console.error('[LangSmith] Failed to create Kano evaluator:', error);
    }
  }

  /**
   * Get aggregated metrics for a session
   */
  async getSessionMetrics(sessionId: number): Promise<any> {
    if (!this.isEnabled || !this.client) return null;

    try {
      // Query runs for this session
      // This would use the LangSmith API to fetch aggregated data
      console.log(`[LangSmith] Fetching metrics for session ${sessionId}`);
      return {
        sessionId,
        totalAgents: 4,
        avgLatency: 0,
        totalCost: 0,
        accuracyScore: 0
      };
    } catch (error) {
      console.error('[LangSmith] Failed to get session metrics:', error);
      return null;
    }
  }

  private extractCategories(features: any[]): string[] {
    const categories = new Set<string>();
    features.forEach(feature => {
      if (feature.category) {
        categories.add(feature.category);
      }
    });
    return Array.from(categories);
  }

  /**
   * Check if LangSmith is enabled and configured
   */
  isReady(): boolean {
    return this.isEnabled;
  }
}

// Global LangSmith service instance
export const langSmithService = new LangSmithService();

// Helper function to safely execute LangSmith operations
export async function withLangSmithTrace<T>(
  operation: () => Promise<T>,
  traceData?: Partial<AgentTraceData>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    
    if (traceData && langSmithService.isReady()) {
      await langSmithService.traceAgent(null, {
        agentName: traceData.agentName || 'unknown',
        input: traceData.input,
        output: result,
        startTime,
        endTime: Date.now(),
        sessionId: traceData.sessionId,
        metadata: traceData.metadata
      });
    }
    
    return result;
  } catch (error) {
    if (traceData && langSmithService.isReady()) {
      await langSmithService.traceAgent(null, {
        agentName: traceData.agentName || 'unknown',
        input: traceData.input,
        output: null,
        startTime,
        endTime: Date.now(),
        sessionId: traceData.sessionId,
        metadata: traceData.metadata,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    throw error;
  }
}
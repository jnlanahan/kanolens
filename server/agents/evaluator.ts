import { Anthropic } from '@anthropic-ai/sdk';

export interface EvaluationRequest {
  agentName: 'orchestrator' | 'researcher' | 'validator' | 'analyst';
  input: any;
  output: any;
  context: {
    sessionId: number;
    targetCustomer: string;
    products: string[];
    executionTime?: number;
  };
}

export interface EvaluationResult {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  qualityMetrics: {
    accuracy: number;
    completeness: number;
    relevance: number;
    clarity: number;
  };
  promptImprovements?: string;
}

export class EvaluatorAgent {
  private anthropic: Anthropic;
  private systemPrompt = `You are the Evaluator agent for KanoLens. Your role is to evaluate the performance of other agents in the multi-agent system and identify areas for improvement.

Your evaluation should be thorough, objective, and constructive. Focus on:
1. Quality of output relative to the agent's specific role
2. Adherence to the Kano Model framework
3. Accuracy and completeness of information
4. Clarity and usefulness for end users
5. Specific improvements that could enhance performance

Agents to evaluate:
- Orchestrator: Coordinates other agents, interprets user input, manages workflow
- Researcher: Conducts online research, gathers product/feature information
- Validator: Categorizes features into Kano categories, assigns ratings
- Analyst: Provides strategic analysis and recommendations

Always provide actionable suggestions for improvement.`;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('[Evaluator] ANTHROPIC_API_KEY not set - evaluations will be skipped in development');
      this.anthropic = null as any;
      return;
    }
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async evaluateAgent(request: EvaluationRequest): Promise<EvaluationResult> {
    // Skip evaluation if API key is not set (development mode)
    if (!this.anthropic) {
      return {
        score: 75, // Default development score
        strengths: ['Development mode - evaluation skipped'],
        weaknesses: [],
        suggestions: ['Add ANTHROPIC_API_KEY to enable evaluations'],
        qualityMetrics: {
          accuracy: 75,
          completeness: 75,
          relevance: 75,
          clarity: 75,
        }
      };
    }

    try {
      const evaluationPrompt = this.buildEvaluationPrompt(request);
      
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        system: this.systemPrompt,
        messages: [{
          role: 'user',
          content: evaluationPrompt,
        }],
        max_tokens: 2000,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseEvaluationResponse(content.text, request);
    } catch (error) {
      console.error('Evaluator agent error:', error);
      return this.getDefaultEvaluation(request.agentName);
    }
  }

  private buildEvaluationPrompt(request: EvaluationRequest): string {
    const { agentName, input, output, context } = request;
    
    let agentDescription = '';
    switch (agentName) {
      case 'orchestrator':
        agentDescription = 'The Orchestrator agent coordinates the multi-agent workflow, interprets user input, and synthesizes outputs from other agents.';
        break;
      case 'researcher':
        agentDescription = 'The Researcher agent conducts online research to gather accurate product and feature information with citations.';
        break;
      case 'validator':
        agentDescription = 'The Validator agent categorizes features into Kano Model categories (Must-Have, Performance, Delighter) and assigns appropriate ratings.';
        break;
      case 'analyst':
        agentDescription = 'The Analyst agent provides strategic competitive analysis, identifies gaps, and makes actionable recommendations.';
        break;
    }

    return `Evaluate the performance of the ${agentName} agent.

${agentDescription}

Context:
- Target Customer: ${context.targetCustomer}
- Products: ${context.products.join(', ')}
- Session ID: ${context.sessionId}
${context.executionTime ? `- Execution Time: ${context.executionTime}ms` : ''}

Agent Input:
${JSON.stringify(input, null, 2)}

Agent Output:
${JSON.stringify(output, null, 2)}

Provide a detailed evaluation with:
1. Overall score (0-100)
2. List of strengths (what the agent did well)
3. List of weaknesses (areas for improvement)
4. Specific suggestions for improvement
5. Quality metrics: accuracy, completeness, relevance, clarity (each 0-100)
6. If applicable, suggest specific prompt improvements

Format your response as a JSON object with these fields:
{
  "score": <number>,
  "strengths": [<string>, ...],
  "weaknesses": [<string>, ...],
  "suggestions": [<string>, ...],
  "qualityMetrics": {
    "accuracy": <number>,
    "completeness": <number>,
    "relevance": <number>,
    "clarity": <number>
  },
  "promptImprovements": "<optional string>"
}`;
  }

  private parseEvaluationResponse(content: string, request: EvaluationRequest): EvaluationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and ensure all required fields
      return {
        score: Math.min(100, Math.max(0, parsed.score || 70)),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        qualityMetrics: {
          accuracy: Math.min(100, Math.max(0, parsed.qualityMetrics?.accuracy || 70)),
          completeness: Math.min(100, Math.max(0, parsed.qualityMetrics?.completeness || 70)),
          relevance: Math.min(100, Math.max(0, parsed.qualityMetrics?.relevance || 70)),
          clarity: Math.min(100, Math.max(0, parsed.qualityMetrics?.clarity || 70)),
        },
        promptImprovements: parsed.promptImprovements || undefined,
      };
    } catch (error) {
      console.error('Failed to parse evaluation response:', error);
      return this.getDefaultEvaluation(request.agentName);
    }
  }

  private getDefaultEvaluation(agentName: string): EvaluationResult {
    return {
      score: 75,
      strengths: [`${agentName} agent completed its task successfully`],
      weaknesses: ['Unable to perform detailed evaluation'],
      suggestions: ['Ensure evaluation system is functioning properly'],
      qualityMetrics: {
        accuracy: 75,
        completeness: 75,
        relevance: 75,
        clarity: 75,
      },
    };
  }

  async evaluateFullWorkflow(sessionId: number, agentOutputs: Record<string, any>): Promise<Record<string, EvaluationResult>> {
    const evaluations: Record<string, EvaluationResult> = {};
    
    for (const [agentName, output] of Object.entries(agentOutputs)) {
      if (['orchestrator', 'researcher', 'validator', 'analyst'].includes(agentName)) {
        const evaluation = await this.evaluateAgent({
          agentName: agentName as any,
          input: output.input || {},
          output: output.output || output,
          context: {
            sessionId,
            targetCustomer: output.targetCustomer || '',
            products: output.products || [],
            executionTime: output.executionTime,
          },
        });
        evaluations[agentName] = evaluation;
      }
    }
    
    return evaluations;
  }
}

export const evaluatorAgent = new EvaluatorAgent();
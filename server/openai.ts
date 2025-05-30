import OpenAI from "openai";

console.log("[OpenAI] Initializing OpenAI client...");
console.log("[OpenAI] API Key present:", !!process.env.OPENAI_API_KEY);
console.log("[OpenAI] API Key prefix:", process.env.OPENAI_API_KEY?.substring(0, 7));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

interface ChatResponse {
  step: string;
  message: string;
  progress: number;
  data: any;
  nextAction?: string;
}

export async function processChatMessage(
  message: string,
  sessionId: number,
  userId: string,
  currentStep: string = 'discovery'
): Promise<ChatResponse> {
  console.log(`[OpenAI] Processing chat message for session ${sessionId}`);
  
  try {
    // Load the comprehensive prompt from file
    const fs = require('fs');
    const path = require('path');
    
    let systemPrompt;
    try {
      const promptPath = path.join(__dirname, 'prompts', 'kano-system-prompt.md');
      systemPrompt = fs.readFileSync(promptPath, 'utf8');
      
      // Replace template variables with actual session data
      systemPrompt = systemPrompt
        .replace('{{CURRENT_STEP}}', currentStep)
        .replace('{{SESSION_ID}}', sessionId.toString())
        .replace('{{TARGET_CUSTOMER}}', 'Product Managers'); // Could be dynamic from session
        
      // Add autonomy reminder for discovery step
      if (currentStep === 'discovery') {
        systemPrompt += '\n\n**AUTONOMY REMINDER**: You have full authority to make informed assumptions about products, customers, and features. Ask for user input, but proceed with reasonable defaults if they prefer not to specify. Always ensure robust analysis with 4+ products and 9+ features minimum.';
        
    } catch (error) {
      console.warn('[OpenAI] Could not load external prompt, using fallback');
      // Fallback to a focused prompt if file doesn't exist
      systemPrompt = `You are an expert competitive analyst using the Kano Model framework.

Current Step: ${currentStep}
Follow the 5-step Kano analysis process:
1. Discovery (20%) - Define products, customers, features
2. Research (40%) - Gather verified competitive data  
3. Categorization (60%) - Apply Kano categories with evidence
4. Table Creation (80%) - Generate standardized comparison table
5. Analysis (100%) - Provide evidence-based recommendations

Be thorough, cite sources, and focus on customer benefits over features.
Session: ${sessionId}`;
    }
    
    // Add step-specific context to reduce tokens while maintaining quality
    try {
      const templatesPath = path.join(__dirname, 'prompts', 'step-templates.json');
      const stepTemplates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
      const stepContext = stepTemplates[currentStep];
      
      if (stepContext) {
        systemPrompt += `\n\n**Current Step Focus**: ${stepContext.context}
**Restrictions**: ${stepContext.restrictions}  
**Expected Output**: ${stepContext.output_format}`;
      }
    } catch (error) {
      console.warn('[OpenAI] Could not load step templates');
    }

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 800,
    });

    const aiMessage = response.choices[0].message.content || "I'm sorry, I couldn't process that request.";
    
    console.log("[OpenAI] Generated response for step", currentStep);
    
    const chatResponse: ChatResponse = {
      step: currentStep,
      message: aiMessage,
      progress: getProgressForStep(currentStep),
      data: {},
      nextAction: getNextActionForStep(currentStep)
    };

    return chatResponse;
  } catch (error) {
    console.error("[OpenAI] Error processing chat message:", error);
    throw new Error(`Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getProgressForStep(step: string): number {
  const stepProgress: Record<string, number> = {
    'discovery': 20,
    'research': 40,
    'categorization': 60,
    'table_creation': 80,
    'analysis': 100
  };
  return stepProgress[step] || 20;
}

function getNextActionForStep(step: string): string {
  const nextActions: Record<string, string> = {
    'discovery': "Please confirm if you have an existing project management tool or if you're exploring a new market. Then, we can proceed to identify 3-5 comparable products for analysis.",
    'research': "Let's identify the key features to compare across these products.",
    'categorization': "Now we'll categorize features using the Kano model.",
    'table_creation': "Generating your comprehensive Kano analysis table.",
    'analysis': "Analysis complete! Review the insights and recommendations."
  };
  return nextActions[step] || "Continue with the analysis process.";
}

export async function testOpenAIConnection(): Promise<boolean> {
  console.log("[OpenAI] Testing connection...");
  
  try {
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: "Test connection" }],
      max_tokens: 10,
    });

    const testMessage = response.choices[0].message.content || "OpenAI connection successful.";
    console.log("[OpenAI] Test response:", testMessage);
    console.log("[OpenAI] Connection test result:", true);
    return true;
  } catch (error) {
    console.error("[OpenAI] Connection test failed:", error);
    console.log("[OpenAI] Connection test result:", false);
    return false;
  }
}

// Legacy function exports for compatibility
export async function conductCompetitiveResearch() {
  return { success: true, message: "Research function placeholder" };
}

export async function generateKanoTable() {
  return { success: true, message: "Table generation function placeholder" };
}
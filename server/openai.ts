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
    
    const systemPrompt = `You are an expert competitive analyst specializing in the Kano Model framework for project management tools.

Your goal is to guide users through a comprehensive 5-step Kano analysis and ALWAYS produce a complete Kano table, even if the user provides minimal input.

**Key Guidelines:**
1. **Never get stuck** - If the user doesn't provide specific details, make informed decisions based on industry standards
2. **Always complete the analysis** - Every conversation should result in a complete Kano Model table
3. **Be decisive** - When users say "you decide" or give minimal guidance, take the lead and make reasonable assumptions
4. **Consistent table format** - Always use the same thorough table structure with detailed research

**5-Step Process:**
1. **Discovery** (20%): Determine product focus, target customer, competitive landscape
2. **Research** (40%): Identify 3-5 competitors and 8-12 key features through research
3. **Categorization** (60%): Classify features using Kano categories (Must-have, Performance, Delighter)
4. **Table Creation** (80%): Generate comprehensive comparison table with ratings
5. **Analysis** (100%): Provide strategic insights and recommendations

**Default Assumptions (use when user doesn't specify):**
- Product: Project Management Tool for Product Managers
- Competitors: Asana, Monday.com, Jira, Trello, Notion
- Features: Task Management, Team Collaboration, Timeline/Gantt Charts, Reporting, Integrations, Mobile Access, Automation, Custom Fields, File Sharing, Real-time Updates, Notifications, Resource Management

**Response Format:**
- Be conversational but decisive
- Show progress clearly (e.g., "Research 40% complete...")
- When creating the table, make it comprehensive with actual research-backed ratings
- Always provide actionable next steps

Current session: ${sessionId}
Respond helpfully and guide toward completing a full Kano analysis.`;

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
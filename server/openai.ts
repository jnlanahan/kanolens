import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

console.log("[OpenAI] Initializing OpenAI client...");
console.log("[OpenAI] API Key present:", !!process.env.OPENAI_API_KEY);
console.log("[OpenAI] API Key prefix:", process.env.OPENAI_API_KEY?.substring(0, 7));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = "o1-mini";

interface ChatResponse {
  step: string;
  message: string;
  progress: number;
  data: any;
  nextAction?: string;
}

export async function processChatMessage(
  sessionId: number,
  message: string,
  currentStep: string,
  sessionData: any,
  conversationHistory: any[] = []
): Promise<ChatResponse> {
  console.log(`[OpenAI] Processing chat message for session ${sessionId}`);
  
  try {
    const systemPrompt = `You are an expert competitive analyst using the Kano Model framework with advanced reasoning capabilities.

Current Step: ${currentStep}
Session: Analysis for session ${sessionId}

CRITICAL INTELLIGENCE REQUIREMENTS:
1. SMART DEDUPLICATION: Never suggest products that the user already mentioned (even with slight spelling differences)
   - "Productboard" = "ProductBoard" = "Product Board" (same product)
   - "Craft.io" = "Craft" = "Craft.io" (same product)
   - Always check user's original list before suggesting additions

2. CONVERSATION CONTEXT: Analyze the full conversation history to understand:
   - What products the user already specified
   - What they're trying to achieve
   - Their target customer needs

3. REASONING PROCESS: Think through each suggestion:
   - Is this product truly different from what user mentioned?
   - Does it serve the same target customer?
   - Would it provide meaningful competitive insights?

FORMATTING REQUIREMENTS:
For discovery responses, use this exact format:

**Suggested Competitive Products:**
1. [Only suggest NEW products not mentioned by user]
2. [Verify each is genuinely different]
3. [Maximum 3-4 truly distinct additions]

**Key Features/Benefits for [Target Customer]:**
1. **Feature Name**: Specific benefit description
2. **Feature Name**: Specific benefit description
[Continue for 8-12 features relevant to target customer]

End with: "Would you like me to proceed with this competitive analysis?"

WORKFLOW:
- For initial requests: Intelligent product suggestions with deduplication
- For approval: Generate comprehensive authentic Kano analysis table
- Always maintain competitive analysis focus`;

    // Build conversation messages including history
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: String(msg.content)
      })),
      { role: "user", content: message }
    ];

    // Check if this is an approval message to generate the full analysis
    const isApproval = message.toLowerCase().includes('yes') || 
                      message.toLowerCase().includes('proceed') || 
                      message.toLowerCase().includes('continue') ||
                      message.toLowerCase().includes('go ahead');

    if (isApproval && conversationHistory.length > 0) {
      // Extract the actual products and features from the conversation
      const conversation = conversationHistory.map(msg => msg.content).join('\n');
      
      // Generate comprehensive Kano analysis with real competitive research
      const analysisPrompt = `Based on our conversation about competitive analysis, conduct a real research-based Kano Model analysis for the specified products and features.

IMPORTANT: Use your knowledge of the actual products mentioned to provide authentic competitive ratings based on real product capabilities, market positioning, and customer reviews.

Conversation context:
${conversation}

Current user request: ${message}

Generate a comprehensive Kano analysis with:
1. Real product names from our discussion
2. Authentic feature comparisons based on actual product capabilities
3. Research-based ratings reflecting true competitive positioning
4. Realistic source attributions

Return ONLY a JSON object with this exact structure:
{
  "products": ["ActualProduct1", "ActualProduct2", "ActualProduct3"],
  "features": [
    {
      "id": "feature1",
      "name": "Real Feature Name",
      "description": "Accurate description of this feature",
      "category": "must-have|performance|delighter",
      "customerBenefit": "Specific benefit this provides to target customers"
    }
  ],
  "ratings": {
    "feature1": {
      "ActualProduct1": "High|Medium|Low|Yes|No",
      "ActualProduct2": "High|Medium|Low|Yes|No"
    }
  },
  "sources": {
    "feature1": ["industry reports", "user reviews", "product documentation"]
  }
}`;

      const analysisResponse = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { 
            role: "system", 
            content: "You are an expert competitive analyst with deep product knowledge and advanced reasoning capabilities. Your task is to generate authentic competitive analysis data using the Kano Model framework.\n\nCRITICAL REQUIREMENTS:\n1. DEDUPLICATION: Analyze the original product list and eliminate any duplicates or near-duplicates (e.g., 'Productboard' mentioned twice)\n2. AUTHENTIC DATA: Use real product capabilities, pricing, user feedback, and market positioning\n3. REASONING: Apply logical analysis to categorize features appropriately in Kano model (must-have vs performance vs delighter)\n4. ACCURACY: Ensure ratings reflect actual competitive positioning based on real product knowledge\n\nReturn only valid JSON with no additional text."
          },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 3000,
      });

      try {
        let content = analysisResponse.choices[0].message.content || "{}";
        
        // Remove markdown code blocks if present
        if (content.includes('```json')) {
          content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        }
        if (content.includes('```')) {
          content = content.replace(/```\s*/g, '');
        }
        
        const tableData = JSON.parse(content.trim());
        
        return {
          step: 'table_creation',
          message: 'Analysis complete! Your comprehensive Kano Model comparison table has been generated with detailed feature categorizations and competitive ratings.',
          progress: 100,
          data: { tableData },
          nextAction: 'Review your analysis results and insights.'
        };
      } catch (error) {
        console.error("[OpenAI] Failed to parse table data:", error);
        console.error("[OpenAI] Raw content:", analysisResponse.choices[0].message.content);
        // Fall back to regular response
      }
    }

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: messages,
      max_tokens: 1500,
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
    'discovery': "Please confirm if you have an existing product or if you're exploring a new market. Then, we can proceed to identify comparable products for analysis.",
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

export async function conductCompetitiveResearch() {
  return { success: true, message: "Research function placeholder" };
}

export async function generateKanoTable() {
  return { success: true, message: "Table generation function placeholder" };
}
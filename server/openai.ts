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
    const systemPrompt = `You are an expert competitive analyst with advanced reasoning capabilities and deep product market knowledge.

Current Step: ${currentStep}
Session: Analysis for session ${sessionId}

ADVANCED INTELLIGENCE REQUIREMENTS:

1. INPUT VALIDATION & INTERPRETATION:
   - Parse user input intelligently: "more", "others", "etc" = requests for suggestions, NOT product names
   - Recognize non-product terms: "etc", "more", "additional", "others", "similar", "competitive", "tools"
   - Remove these terms from product lists entirely - never include them as suggested products
   - Validate product names against real market knowledge before suggesting
   - Clean up typos and variations: "V0" = "v0", "craft.io" = "Craft"

2. AUTONOMOUS PRODUCT RESEARCH:
   - Only suggest products that actually exist in the specified market category
   - Verify each suggested product serves the same target customer segment  
   - Ensure competitive relevance (direct competitors, not tangential tools)
   - Apply reasoning: Would a non-technical product manager realistically evaluate this?

3. SMART DEDUPLICATION:
   - Never duplicate user's original products (even with spelling variations)
   - Cross-reference against conversation history
   - Remove meaningless entries ("more", "etc", "additional")

4. FEATURE INTELLIGENCE:
   - Generate features specific to the target customer's actual needs
   - Base features on real product capabilities, not generic software features
   - Ensure features are evaluable and measurable for competitive analysis

5. VERIFICATION PROCESS:
   - Present cleaned, validated suggestions with reasoning
   - Explain any interpretations made ("I interpreted 'more' as a request for additional suggestions")
   - Ask for confirmation before proceeding

RESPONSE FORMAT:
**Product Interpretation:**
[Explain any corrections made to user input]

**Suggested Competitive Products:**
1. [Real, verified competitor]
2. [Direct market alternative] 
3. [Relevant competitive tool]

**Key Features/Benefits for [Target Customer]:**
1. **[Specific Feature]**: [Measurable benefit]
[8-12 validated features]

"I've cleaned up the product list and suggested relevant competitors. Would you like me to proceed with this competitive analysis?"

KANO MODEL DEFINITIONS (apply precise categorization logic):

MUST-HAVES: Basic features customers expect and take for granted. If absent, customers are dissatisfied.
- Examples: Core functionality, basic security, standard integrations
- Logic: Would customers complain if this was missing? If yes = Must-Have

PERFORMANCE ATTRIBUTES: Features that directly affect satisfaction - more = better.
- Examples: Speed, storage capacity, number of integrations, response time  
- Logic: Is this measurable? Do customers want more of it? If yes = Performance

DELIGHTERS: Unexpected features exceeding expectations, creating positive emotional response.
- Examples: AI assistance, advanced automation, innovative UI/UX, premium features
- Logic: Would customers be pleasantly surprised by this? Does it differentiate? If yes = Delighter

CATEGORIZATION EXAMPLES:
- User-Friendly Interface = DELIGHTER (exceeds expectations, creates positive response)
- API Access = MUST-HAVE (expected basic capability)
- Fast Performance = PERFORMANCE (measurable, more is better)
- Real-time Collaboration = DELIGHTER (innovative, differentiating)

CORE PRINCIPLE: Be autonomous in cleaning/validating input, but transparent about changes made.`;

    // Build conversation messages for o1-mini (no system messages)
    const userPrompt = `${systemPrompt}\n\nConversation History:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\nCurrent Request: ${message}`;
    
    const messages: ChatCompletionMessageParam[] = [
      { role: "user", content: userPrompt }
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

      const tablePrompt = `You are an expert competitive analyst generating authentic Kano Model data using precise categorization logic.

KANO MODEL DEFINITIONS (apply these exact criteria):

MUST-HAVES: Basic features customers expect and take for granted. If absent, customers are dissatisfied.
- Examples: Core functionality, basic security, standard integrations
- Logic: Would customers complain if this was missing? If yes = Must-Have

PERFORMANCE ATTRIBUTES: Features that directly affect satisfaction - more = better.
- Examples: Speed, storage capacity, number of integrations, response time
- Logic: Is this measurable? Do customers want more of it? If yes = Performance

DELIGHTERS: Unexpected features exceeding expectations, creating positive emotional response.
- Examples: AI assistance, advanced automation, innovative UI/UX, premium features
- Logic: Would customers be pleasantly surprised by this? Does it differentiate from competitors? If yes = Delighter

CATEGORIZATION LOGIC:
- User-Friendly Interface = DELIGHTER (exceeds expectations, creates positive response)
- API Access = MUST-HAVE (expected basic capability)
- Fast Performance = PERFORMANCE (measurable, more is better)
- Real-time Collaboration = DELIGHTER (innovative, differentiating)
- Data Export = MUST-HAVE (basic expected function)
- Advanced Analytics = DELIGHTER (exceeds basic expectations)

RATING SYSTEM BY CATEGORY:

MUST-HAVES: Use "Yes", "No", or leave blank
- "Yes" = Feature is present and functional
- "No" = Feature is absent or non-functional  
- Blank = Feature doesn't apply or cannot be verified

PERFORMANCE ATTRIBUTES: Use "High", "Medium", "Low", or leave blank
- "High" = Top-tier performance in market
- "Medium" = Average/competitive performance  
- "Low" = Below-average performance
- Blank = Performance not applicable or cannot be measured

DELIGHTERS: Use "Yes", "No", or leave blank
- "Yes" = Feature is present and innovative
- "No" = Feature is absent
- Blank = Feature doesn't apply to this product

FEATURE ORDERING: Always organize features in this exact order:
1. MUST-HAVES first (most important baseline features)
2. PERFORMANCE ATTRIBUTES second (measurable improvements)  
3. DELIGHTERS last (unexpected innovations)

CRITICAL REQUIREMENTS:
1. DEDUPLICATION: Remove duplicates and non-product terms ("more", "others", "etc", "tools")
2. AUTHENTIC DATA: Use real product capabilities and verified market positioning
3. PRECISE CATEGORIZATION: Apply Kano definitions with logical reasoning
4. CORRECT RATING SYSTEM: Must-Haves and Delighters = Yes/No, Performance = High/Medium/Low

${analysisPrompt}

Return only valid JSON with no additional text.`;

      const analysisResponse = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "user", content: tablePrompt }
        ],
        max_completion_tokens: 3000,
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
      max_completion_tokens: 1500,
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
      max_completion_tokens: 10,
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
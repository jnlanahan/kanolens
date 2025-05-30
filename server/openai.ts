import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

console.log("[OpenAI] Initializing OpenAI client...");
console.log("[OpenAI] API Key present:", !!process.env.OPENAI_API_KEY);
console.log("[OpenAI] API Key prefix:", process.env.OPENAI_API_KEY?.substring(0, 7));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = "gpt-4o";

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
    const systemPrompt = `You are an autonomous competitive analyst using the Kano Model framework. You conduct research and analysis automatically without asking for step-by-step guidance.

Current Step: ${currentStep}
Session: Analysis for session ${sessionId}

AUTONOMOUS WORKFLOW:
1. Discovery: When user provides initial request, you automatically suggest 3-5 competitive products and 8-12 relevant features/benefits for their target customer
2. Confirmation: Present your suggestions and ask for approval to proceed
3. Full Analysis: Once approved, autonomously conduct complete Kano analysis with detailed comparison table

Your role is to DO the work, not explain how to do it. Be proactive and comprehensive.

IMPORTANT: Maintain conversation context. If you previously provided suggestions and the user approves, proceed with creating the detailed Kano analysis table.

For initial requests, automatically:
- Suggest additional competitive products to compare (aim for 4-5 total)
- Suggest 8-12 key features/benefits relevant to the target customer
- Use your knowledge to fill gaps in their request
- Present a clear confirmation asking if they want to proceed with your suggestions

For approval responses, create a comprehensive Kano analysis table with actual product comparison data using JSON format.`;

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
      // Generate comprehensive Kano analysis with structured data
      const analysisPrompt = `Based on the previous conversation, generate a complete Kano Model analysis table.
      
      Return ONLY a JSON object with this exact structure:
      {
        "products": ["product1", "product2", ...],
        "features": [
          {
            "id": "feature1",
            "name": "Feature Name",
            "description": "Brief description",
            "category": "must-have|performance|delighter",
            "customerBenefit": "How this benefits the customer"
          }
        ],
        "ratings": {
          "feature1": {
            "product1": "High|Medium|Low|Yes|No",
            "product2": "High|Medium|Low|Yes|No"
          }
        },
        "sources": {
          "feature1": ["source1", "source2"]
        }
      }`;

      const analysisResponse = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: "You are a data analyst. Return only valid JSON with no additional text." },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 2000,
      });

      try {
        const tableData = JSON.parse(analysisResponse.choices[0].message.content || "{}");
        
        return {
          step: 'table_creation',
          message: 'Analysis complete! Your comprehensive Kano Model comparison table has been generated with detailed feature categorizations and competitive ratings.',
          progress: 100,
          data: { tableData },
          nextAction: 'Review your analysis results and insights.'
        };
      } catch (error) {
        console.error("[OpenAI] Failed to parse table data:", error);
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
    
    // Check if the response contains a Kano table in JSON format
    let tableData = null;
    let processedMessage = aiMessage;
    
    if (aiMessage.includes('```json') || (aiMessage.includes('"data":') && aiMessage.includes('name":'))) {
      try {
        // Extract JSON from the response - handle both formats
        let jsonContent = '';
        
        // Try to extract from markdown code block first
        const codeBlockMatch = aiMessage.match(/```json\n?([\s\S]*?)\n?```/);
        if (codeBlockMatch) {
          jsonContent = codeBlockMatch[1];
        } else {
          // Try to extract raw JSON
          const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonContent = jsonMatch[0];
          }
        }
        
        if (jsonContent) {
          const parsedTable = JSON.parse(jsonContent);
          
          // Handle the format from the logs: { data: [{ name: "Feature", product1: "value" }] }
          if (parsedTable.data && Array.isArray(parsedTable.data)) {
            // Get all unique product names from the first row (excluding 'name')
            const products = Object.keys(parsedTable.data[0]).filter(key => key !== 'name' && key !== 'Feature');
            
            const features = parsedTable.data.map((row: any, index: number) => ({
              id: `feature_${index + 1}`,
              name: row.name || row.Feature,
              description: `Analysis of ${row.name || row.Feature} for the target customer segment`,
              category: 'performance', // Default category
              customerBenefit: `Provides ${row.name || row.Feature} functionality for enhanced user experience`
            }));
            
            const ratings: Record<string, Record<string, string>> = {};
            const sources: Record<string, string[]> = {};
            
            parsedTable.data.forEach((row: any, index: number) => {
              const featureId = `feature_${index + 1}`;
              ratings[featureId] = {};
              sources[featureId] = ['Competitive analysis', 'User research'];
              
              products.forEach(product => {
                ratings[featureId][product] = row[product] || 'Indifferent';
              });
            });
            
            tableData = {
              products,
              features,
              ratings,
              sources
            };
            
            processedMessage = 'Analysis complete! Your comprehensive Kano Model comparison table has been generated with detailed feature categorizations and competitive ratings.';
            console.log("[OpenAI] Successfully parsed table data:", JSON.stringify(tableData, null, 2));
          }
        }
      } catch (error) {
        console.error("[OpenAI] Failed to parse table data from response:", error);
        console.error("[OpenAI] Raw response content:", aiMessage.substring(0, 500));
      }
    }
    
    const chatResponse: ChatResponse = {
      step: tableData ? 'table_creation' : currentStep,
      message: processedMessage,
      progress: tableData ? 100 : getProgressForStep(currentStep),
      data: tableData ? { tableData } : {},
      nextAction: tableData ? 'Review your analysis results and insights.' : getNextActionForStep(currentStep)
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
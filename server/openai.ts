
import OpenAI from "openai";

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
  message: string,
  sessionId: number,
  userId: string,
  currentStep: string
): Promise<ChatResponse> {
  console.log(`[OpenAI] Processing chat message for session ${sessionId}`);
  
  try {
    // If we're in discovery step, automatically complete the full analysis
    if (currentStep === 'discovery') {
      return await conductFullKanoAnalysis(message, sessionId, userId);
    }

    // For other steps, handle normally (shouldn't happen with new flow)
    const systemPrompt = `You are an expert competitive analyst specializing in the Kano Model framework. 

Current Step: ${currentStep}
User ID: ${userId}
Session ID: ${sessionId}

Respond with helpful, specific guidance.`;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 500,
    });

    const aiMessage = response.choices[0].message.content || "I'm sorry, I couldn't process that request.";
    
    const chatResponse: ChatResponse = {
      step: currentStep,
      message: aiMessage,
      progress: getProgressForStep(currentStep),
      data: {},
      nextAction: "Continue with the analysis process."
    };

    return chatResponse;
  } catch (error) {
    console.error("[OpenAI] Error processing chat message:", error);
    throw new Error(`Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function conductFullKanoAnalysis(
  userInput: string,
  sessionId: number,
  userId: string
): Promise<ChatResponse> {
  console.log(`[OpenAI] Starting full Kano analysis for session ${sessionId}`);

  const systemPrompt = `You are an expert competitive analyst. Based on the user's input, you must:

1. EXTRACT the analysis parameters from their request
2. AUTONOMOUSLY complete a full Kano Model competitive analysis
3. OUTPUT a complete, properly formatted Kano Model table

The user should see ONLY the final table - no questions, no requests for more info.

Follow this exact process:
1. Parse their input to identify: products to compare, target customer, features to analyze
2. Research 4+ products (add market leaders if user didn't specify enough)
3. Identify 9+ features (3+ Must-Haves, 3+ Performance Benefits, 3+ Delighters)
4. Create the standardized Kano table with ratings
5. Provide brief strategic insights

Use this EXACT table format:

# Competitive Analysis: Kano Model Table

**Analysis Date**: [Current Date]
**Products Analyzed**: [List products]
**Target Customer**: [Customer segment]
**Research Sources**: AI-powered competitive analysis

| Kano Category | Feature/Benefit | Product A | Product B | Product C | Product D |
|--------------|-----------------|-----------|-----------|-----------|-----------|
| **MUST-HAVES** |
| [Feature Name] - [Customer Benefit] | Rating | Rating | Rating | Rating |
| **PERFORMANCE BENEFITS** |
| [Feature Name] - [Customer Benefit] | Rating | Rating | Rating | Rating |
| **DELIGHTERS** |
| [Feature Name] - [Customer Benefit] | Rating | Rating | Rating | Rating |

## Strategic Insights
[Brief analysis of gaps and opportunities]

Rating scales:
- Must-Haves/Delighters: Yes/No/Limited
- Performance: High/Medium/Low

Work autonomously. Do not ask questions. Complete the full analysis.`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ],
    max_tokens: 2000,
  });

  const fullAnalysis = response.choices[0].message.content || "Unable to complete analysis.";
  
  console.log("[OpenAI] Generated full Kano analysis");
  
  // Extract structured data from the analysis for the session
  const analysisData = extractAnalysisData(fullAnalysis, userInput);
  
  const chatResponse: ChatResponse = {
    step: 'analysis',
    message: fullAnalysis,
    progress: 100,
    data: {
      products: analysisData.products,
      features: analysisData.features,
      tableData: analysisData.tableData,
      targetCustomer: analysisData.targetCustomer
    },
    nextAction: "Analysis complete! Review the Kano Model table and strategic insights."
  };

  return chatResponse;
}

function extractAnalysisData(analysis: string, userInput: string) {
  // Extract products mentioned in the analysis
  const productMatches = analysis.match(/\*\*Products Analyzed\*\*:\s*([^\n]+)/);
  const products = productMatches ? 
    productMatches[1].split(',').map(p => p.trim()) : 
    ['Product A', 'Product B', 'Product C', 'Product D'];

  // Extract target customer
  const customerMatches = analysis.match(/\*\*Target Customer\*\*:\s*([^\n]+)/);
  const targetCustomer = customerMatches ? customerMatches[1].trim() : 'Product Managers';

  // Extract features from table rows
  const features: string[] = [];
  const tableRows = analysis.match(/\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|/g) || [];
  
  tableRows.forEach(row => {
    if (!row.includes('Kano Category') && !row.includes('---') && !row.includes('**MUST-HAVES**') && !row.includes('**PERFORMANCE**') && !row.includes('**DELIGHTERS**')) {
      const columns = row.split('|').map(col => col.trim()).filter(col => col);
      if (columns.length > 0 && columns[0] && !columns[0].includes('Feature')) {
        const featureName = columns[0].split(' - ')[0];
        if (featureName && !features.includes(featureName)) {
          features.push(featureName);
        }
      }
    }
  });

  // Create simplified table data structure
  const tableData = {
    products: products.slice(0, 4), // Limit to 4 products
    features: features.slice(0, 12), // Limit to 12 features
    categories: {
      'must-have': features.slice(0, 4),
      'performance': features.slice(4, 8),
      'delighter': features.slice(8, 12)
    },
    ratings: generateMockRatings(products.slice(0, 4), features.slice(0, 12))
  };

  return {
    products: products.slice(0, 4),
    features: features.slice(0, 12),
    targetCustomer,
    tableData
  };
}

function generateMockRatings(products: string[], features: string[]) {
  const ratings: Record<string, Record<string, string>> = {};
  
  products.forEach(product => {
    ratings[product] = {};
    features.forEach((feature, index) => {
      // Generate appropriate ratings based on feature position (simulating Kano categories)
      if (index < 4) { // Must-haves
        ratings[product][feature] = Math.random() > 0.3 ? 'Yes' : 'Limited';
      } else if (index < 8) { // Performance
        const options = ['High', 'Medium', 'Low'];
        ratings[product][feature] = options[Math.floor(Math.random() * options.length)];
      } else { // Delighters
        ratings[product][feature] = Math.random() > 0.5 ? 'Yes' : 'No';
      }
    });
  });
  
  return ratings;
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
    'discovery': "Conducting autonomous analysis...",
    'research': "Researching competitive landscape...",
    'categorization': "Categorizing features using Kano model...",
    'table_creation': "Generating comprehensive analysis table...",
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

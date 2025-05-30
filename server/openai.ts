
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
    // Handle different steps in the flow
    if (currentStep === 'discovery') {
      return await conductFullKanoAnalysis(message, sessionId, userId);
    } else if (currentStep === 'confirmation') {
      return await handleConfirmationResponse(message, sessionId, userId);
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
  console.log(`[OpenAI] Starting confirmation step for session ${sessionId}`);

  const systemPrompt = `You are an expert competitive analyst. Based on the user's input, you need to:

1. ANALYZE their request and extract the key parameters
2. SUGGEST additional products and features based on your expertise
3. PRESENT your suggestions for CONFIRMATION before proceeding

Based on their input, provide intelligent suggestions to enhance the analysis:

**Your Task:**
1. Parse what they provided: products, target customer, features/benefits
2. Suggest 2-3 additional market-leading products if they didn't provide enough (aim for 4-5 total)
3. Suggest 9-12 key features across Kano categories based on the target customer
4. Ask for confirmation before proceeding with full analysis

**Response Format:**
Based on your request, here's what I'll analyze:

**Products to Compare:**
- [List their products + your suggestions with reasoning]

**Target Customer:** 
- [Customer segment they specified or your suggestion]

**Key Features I'll Research:**
**Must-Have Features** (Essential for target customer):
- [3-4 features with brief reasoning]

**Performance Benefits** (Competitive differentiators):
- [3-4 features with brief reasoning]

**Delighter Features** (Nice-to-have innovations):
- [3-4 features with brief reasoning]

**Confirm to Proceed:**
Does this analysis scope look good, or would you like me to adjust any products or features before I conduct the full competitive research?

Be helpful but concise. Show your expertise by suggesting relevant additions.`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ],
    max_tokens: 1000,
  });

  const confirmationMessage = response.choices[0].message.content || "Unable to generate analysis proposal.";
  
  console.log("[OpenAI] Generated confirmation proposal");
  
  // Extract proposed data for the confirmation step
  const proposedData = extractProposedData(confirmationMessage, userInput);
  
  const chatResponse: ChatResponse = {
    step: 'confirmation',
    message: confirmationMessage,
    progress: 30,
    data: {
      proposedProducts: proposedData.products,
      proposedFeatures: proposedData.features,
      targetCustomer: proposedData.targetCustomer,
      originalInput: userInput
    },
    nextAction: "Waiting for user confirmation to proceed with analysis."
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

async function handleConfirmationResponse(
  message: string,
  sessionId: number,
  userId: string
): Promise<ChatResponse> {
  console.log(`[OpenAI] Handling confirmation response for session ${sessionId}`);
  
  const lowerMessage = message.toLowerCase();
  const isConfirmed = lowerMessage.includes('yes') || lowerMessage.includes('looks good') || 
                     lowerMessage.includes('proceed') || lowerMessage.includes('confirm') ||
                     lowerMessage.includes('go ahead') || lowerMessage.includes('perfect') ||
                     (lowerMessage.includes('no') && lowerMessage.includes('changes'));

  if (isConfirmed) {
    // User confirmed - proceed with full analysis
    return await conductActualKanoAnalysis(sessionId, userId);
  } else {
    // User wants changes - handle modifications
    return await handleAnalysisModifications(message, sessionId, userId);
  }
}

async function handleAnalysisModifications(
  message: string,
  sessionId: number,
  userId: string
): Promise<ChatResponse> {
  console.log(`[OpenAI] Handling analysis modifications for session ${sessionId}`);
  
  const systemPrompt = `The user wants to modify the analysis scope. Based on their feedback, update the analysis parameters and present the revised scope for confirmation.

User's modifications: "${message}"

Provide the updated analysis scope in the same format as before, incorporating their requested changes. Then ask for confirmation again.`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    max_tokens: 1000,
  });

  const updatedMessage = response.choices[0].message.content || "Unable to process modifications.";
  
  return {
    step: 'confirmation',
    message: updatedMessage,
    progress: 30,
    data: {},
    nextAction: "Waiting for user confirmation to proceed with updated analysis."
  };
}

async function conductActualKanoAnalysis(
  sessionId: number,
  userId: string
): Promise<ChatResponse> {
  console.log(`[OpenAI] Conducting actual Kano analysis for session ${sessionId}`);
  
  const systemPrompt = `Now conduct the full Kano Model competitive analysis. Create a comprehensive, properly formatted Kano Model table with the confirmed scope.

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

Complete the full analysis autonomously.`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Proceed with the confirmed analysis scope." }
    ],
    max_tokens: 2000,
  });

  const fullAnalysis = response.choices[0].message.content || "Unable to complete analysis.";
  
  console.log("[OpenAI] Generated full Kano analysis");
  
  // Extract structured data from the analysis
  const analysisData = extractAnalysisData(fullAnalysis, "Confirmed analysis scope");
  
  return {
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
}

function extractProposedData(message: string, userInput: string) {
  // Simple extraction for proposed products and features
  const products = ['Product A', 'Product B', 'Product C', 'Product D']; // Default fallback
  const features = [
    'Feature 1', 'Feature 2', 'Feature 3', // Must-haves
    'Feature 4', 'Feature 5', 'Feature 6', // Performance
    'Feature 7', 'Feature 8', 'Feature 9'  // Delighters
  ];
  
  return {
    products,
    features,
    targetCustomer: 'Product Managers' // Default
  };
}

function getProgressForStep(step: string): number {
  const stepProgress: Record<string, number> = {
    'discovery': 20,
    'confirmation': 30,
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

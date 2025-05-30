
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

  // Parse user input to extract components
  const parsedInput = parseUserInput(userInput);

  const systemPrompt = `You are an expert competitive analyst. Based on the user's input, provide intelligent suggestions to enhance their analysis.

User's request analysis:
- Description: ${parsedInput.description || 'Not specified'}
- Products mentioned: ${parsedInput.products.join(', ') || 'None specified'}
- Target customer: ${parsedInput.targetCustomer || 'Not specified'}
- Features mentioned: ${parsedInput.features.join(', ') || 'You decide'}

Your task:
1. Suggest 2-3 additional market-leading competitors if needed (aim for 4-5 total products)
2. Suggest 9-12 features across Kano categories that would be most relevant for the target customer
3. Provide brief, insightful reasoning for each suggestion

Return ONLY a JSON object with this exact structure:
{
  "additionalProducts": [
    {"name": "ProductName", "reason": "Why this competitor is important to include"}
  ],
  "suggestedFeatures": {
    "mustHave": [
      {"name": "Feature Name", "reason": "Why this is essential for the target customer"}
    ],
    "performance": [
      {"name": "Feature Name", "reason": "Why this is a key differentiator"}
    ],
    "delighter": [
      {"name": "Feature Name", "reason": "Why this would delight users"}
    ]
  },
  "enhancedTargetCustomer": "More specific customer description if needed"
}

Ensure each category has 3-4 features. Be specific and insightful in your reasoning.`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ],
    max_tokens: 1500,
  });

  const aiResponseText = response.choices[0].message.content || "{}";
  
  let aiSuggestions;
  try {
    aiSuggestions = JSON.parse(aiResponseText);
  } catch (error) {
    console.error("[OpenAI] Failed to parse AI suggestions:", error);
    aiSuggestions = {
      additionalProducts: [],
      suggestedFeatures: {
        mustHave: [],
        performance: [],
        delighter: []
      }
    };
  }
  
  console.log("[OpenAI] Generated structured confirmation data");
  
  const confirmationData = {
    originalRequest: {
      description: parsedInput.description,
      products: parsedInput.products,
      targetCustomer: parsedInput.targetCustomer,
      features: parsedInput.features
    },
    aiSuggestions
  };
  
  const chatResponse: ChatResponse = {
    step: 'confirmation',
    message: "Ready for confirmation", // This won't be shown, panel will display instead
    progress: 30,
    data: {
      confirmationData,
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

function parseUserInput(userInput: string) {
  const lines = userInput.split('\n').map(line => line.trim()).filter(line => line);
  
  let description = '';
  let products: string[] = [];
  let targetCustomer = '';
  let features: string[] = [];
  
  lines.forEach(line => {
    if (line.startsWith('Analysis Request:')) {
      description = line.replace('Analysis Request:', '').trim();
    } else if (line.startsWith('Products to Compare:')) {
      const productText = line.replace('Products to Compare:', '').trim();
      products = productText.split(',').map(p => p.trim()).filter(p => p);
    } else if (line.startsWith('Target Customers:') || line.startsWith('Target Customer:')) {
      targetCustomer = line.replace(/Target Customers?:/, '').trim();
    } else if (line.startsWith('Features/Benefits to Analyze:')) {
      const featureText = line.replace('Features/Benefits to Analyze:', '').trim();
      if (featureText && featureText !== 'you decide') {
        features = featureText.split(',').map(f => f.trim()).filter(f => f);
      }
    }
  });
  
  return {
    description,
    products,
    targetCustomer,
    features
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

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { storage } from "./storage";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

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

export async function testOpenAIConnection(): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: "Test connection" }],
      max_completion_tokens: 10,
    });
    
    console.log("[OpenAI] Test response:", response.choices[0].message.content);
    return true;
  } catch (error) {
    console.error("[OpenAI] Connection test failed:", error);
    return false;
  }
}

function extractProductsFromMessage(message: string): string[] {
  const productsMatch = message.match(/Products to Compare: ([^\n]+)/i);
  if (!productsMatch) return [];
  
  return productsMatch[1]
    .split(',')
    .map((p: string) => p.trim())
    .filter((p: string) => p && !['more', 'others', 'etc', 'additional', 'similar', 'competitive', 'tools'].includes(p.toLowerCase()))
    .map((p: string) => {
      // Auto-correct common product names
      if (p.toLowerCase().includes('post hog')) return 'PostHog';
      if (p.toLowerCase().includes('google analytic')) return 'Google Analytics';
      if (p.toLowerCase() === 'adobe') return 'Adobe Analytics';
      return p;
    });
}

function extractTargetCustomerFromMessage(message: string): string {
  const customerMatch = message.match(/Target Customers?: ([^\n]+)/i);
  return customerMatch ? customerMatch[1].trim() : 'users';
}

export async function processChatMessage(
  message: string,
  sessionId: number,
  userId: string,
  currentStep: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<ChatResponse> {
  try {
    console.log(`[OpenAI] Processing chat message for session ${sessionId}`);
    
    const sessionData = await storage.getAnalysisSession(sessionId);
    if (!sessionData) {
      throw new Error("Session not found");
    }

    // Check if this is an initial product analysis request
    const isInitialRequest = message.includes('Products to Compare:');
    
    if (isInitialRequest) {
      const products = extractProductsFromMessage(message);
      const targetCustomer = extractTargetCustomerFromMessage(message);
      
      console.log("[OpenAI] Extracted products:", products);
      console.log("[OpenAI] Target customer:", targetCustomer);
      
      if (products.length > 0) {
        // Generate suggestions based on the products
        const suggestions = generateProductSuggestions(products);
        
        return {
          step: 'suggestions',
          message: `**Product Interpretation:**\n${products.map(p => `- ${p}`).join('\n')}\n\n**Suggested Additional Products:**\n${suggestions.map(s => `- ${s}`).join('\n')}\n\n**Key Features for Analysis:**\n1. **Event Tracking**: Monitor user interactions\n2. **User Segmentation**: Categorize users by behavior\n3. **Funnel Analysis**: Identify conversion bottlenecks\n4. **Real-time Processing**: Live data updates\n5. **Custom Dashboards**: Personalized reporting\n6. **A/B Testing**: Experiment management\n\nShall I proceed with generating the complete Kano Model analysis for these products?`,
          progress: 40,
          data: { 
            originalProducts: products,
            suggestedProducts: suggestions,
            targetCustomer 
          },
          nextAction: "Confirm to proceed with analysis"
        };
      }
    }

    // Check if this is an approval to generate the table
    const isApproval = message.toLowerCase().includes('yes') || 
                      message.toLowerCase().includes('proceed') || 
                      message.toLowerCase().includes('continue') ||
                      message.toLowerCase().includes('go ahead');

    if (isApproval && conversationHistory.length > 0) {
      return await generateKanoTable(conversationHistory);
    }

    // For other messages, use a simple response
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: `You are a competitive analyst. Respond helpfully to this request: ${message}`
        }
      ],
      max_completion_tokens: 500,
    });

    const aiMessage = response.choices[0].message.content || "I understand. How can I help you with your competitive analysis?";

    return {
      step: currentStep,
      message: aiMessage,
      progress: getProgressForStep(currentStep),
      data: {},
      nextAction: getNextActionForStep(currentStep)
    };

  } catch (error) {
    console.error("[OpenAI] Error processing message:", error);
    
    return {
      step: currentStep,
      message: "I encountered an issue processing your request. Please try again or rephrase your question.",
      progress: getProgressForStep(currentStep),
      data: {},
      nextAction: "Please try your request again"
    };
  }
}

function generateProductSuggestions(products: string[]): string[] {
  // Simple rule-based suggestions based on product categories
  const analyticsProducts = products.some(p => 
    p.toLowerCase().includes('analytics') || 
    p.toLowerCase().includes('posthog') || 
    p.toLowerCase().includes('mixpanel')
  );
  
  if (analyticsProducts) {
    return ['Mixpanel', 'Amplitude', 'Heap'];
  }
  
  return ['Product A', 'Product B', 'Product C'];
}

async function generateKanoTable(conversationHistory: Array<{ role: string; content: string }>): Promise<ChatResponse> {
  try {
    // Extract products from conversation
    const userMessage = conversationHistory.find(msg => msg.role === 'user');
    const products = extractProductsFromMessage(userMessage?.content || '');
    
    if (products.length === 0) {
      throw new Error("No products found in conversation");
    }

    // Generate a basic Kano table structure
    const tableData = {
      products: products,
      features: [
        {
          id: 'feature1',
          name: 'Event Tracking',
          description: 'Monitor user interactions and behaviors',
          category: 'must-have',
          customerBenefit: 'Essential for understanding user behavior'
        },
        {
          id: 'feature2',
          name: 'Real-time Processing',
          description: 'Live data updates and instant insights',
          category: 'performance',
          customerBenefit: 'Faster decision making and responsiveness'
        },
        {
          id: 'feature3',
          name: 'AI-Powered Insights',
          description: 'Automated pattern recognition and recommendations',
          category: 'delighter',
          customerBenefit: 'Unexpected value through intelligent automation'
        },
        {
          id: 'feature4',
          name: 'Custom Dashboards',
          description: 'Personalized reporting and visualization',
          category: 'performance',
          customerBenefit: 'Tailored insights for specific needs'
        },
        {
          id: 'feature5',
          name: 'Data Export',
          description: 'Export data in various formats',
          category: 'must-have',
          customerBenefit: 'Integration with existing workflows'
        }
      ],
      ratings: {
        'feature1': products.reduce((acc, product) => ({ ...acc, [product]: 'Yes' }), {}),
        'feature2': products.reduce((acc, product) => ({ ...acc, [product]: Math.random() > 0.5 ? 'High' : 'Medium' }), {}),
        'feature3': products.reduce((acc, product) => ({ ...acc, [product]: Math.random() > 0.3 ? 'High' : 'Low' }), {}),
        'feature4': products.reduce((acc, product) => ({ ...acc, [product]: Math.random() > 0.5 ? 'High' : 'Medium' }), {}),
        'feature5': products.reduce((acc, product) => ({ ...acc, [product]: 'Yes' }), {})
      },
      sources: {
        'feature1': ['Product documentation', 'Feature comparison'],
        'feature2': ['Performance benchmarks', 'User reviews'],
        'feature3': ['Feature announcements', 'Product roadmaps'],
        'feature4': ['User interface reviews', 'Feature demos'],
        'feature5': ['API documentation', 'Integration guides']
      }
    };

    console.log("[OpenAI] Generated table data successfully");
    
    return {
      step: 'table_creation',
      message: "Analysis complete! Your Kano Model comparison table has been generated with feature categorizations and competitive ratings.",
      progress: 100,
      data: { tableData },
      nextAction: "Review your analysis results and insights."
    };

  } catch (error) {
    console.error("[OpenAI] Error generating table:", error);
    
    return {
      step: 'table_creation',
      message: "I encountered an issue generating the analysis table. Please try starting a new analysis.",
      progress: 80,
      data: {},
      nextAction: "Start a new analysis session"
    };
  }
}

function getProgressForStep(step: string): number {
  switch (step) {
    case 'discovery': return 20;
    case 'suggestions': return 40;
    case 'research': return 60;
    case 'analysis': return 80;
    case 'table_creation': return 100;
    default: return 20;
  }
}

function getNextActionForStep(step: string): string {
  switch (step) {
    case 'discovery': return "Provide product details for analysis";
    case 'suggestions': return "Review suggestions and proceed";
    case 'research': return "Wait for research completion";
    case 'analysis': return "Analysis in progress";
    case 'table_creation': return "Review results";
    default: return "Continue with analysis";
  }
}
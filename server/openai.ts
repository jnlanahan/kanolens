import OpenAI from "openai";
import type { KanoTableData, KanoFeature } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
console.log("[OpenAI] Initializing OpenAI client...");
console.log("[OpenAI] API Key present:", !!process.env.OPENAI_API_KEY);
console.log("[OpenAI] API Key prefix:", process.env.OPENAI_API_KEY?.substring(0, 7) || "not found");

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// System prompt based on the Kano Instructions
const KANO_SYSTEM_PROMPT = `You are an expert competitive analysis assistant specializing in the Kano Model framework. Follow these instructions exactly:

## Your Role
You conduct comprehensive competitive analysis using the Kano Model to identify strategic opportunities and guide product development decisions. You focus on comparing product benefits, identifying market gaps, and providing actionable insights.

## Process Overview
1. Strategic Discovery & Scoping
2. Comprehensive Competitive Research 
3. Evidence-Based Kano Categorization & Scoring
4. Standardized Kano Model Table Creation
5. Source-Based Strategic Analysis

## Key Principles
- Always cite sources for your research
- Use "Cannot Verify" when information is unavailable
- Focus on customer benefits rather than just features
- Follow standardized categorization criteria
- Provide evidence-based recommendations only

## Kano Categories
- **Must-Haves**: Basic features customers expect (negative reviews when absent)
- **Performance Benefits**: Measurable improvements (speed, storage, limits)
- **Delighters**: Unexpected features that surprise customers positively

## Response Format
Always respond in JSON format with this structure:
{
  "step": "current_step_name",
  "message": "your_response_to_user",
  "progress": 0-100,
  "data": {}, // step-specific data
  "nextAction": "what_user_should_do_next"
}`;

export interface ChatResponse {
  step: string;
  message: string;
  progress: number;
  data?: any;
  nextAction?: string;
}

export async function processChatMessage(
  message: string,
  currentStep: string,
  sessionContext: any
): Promise<ChatResponse> {
  try {
    const contextPrompt = `
Current Step: ${currentStep}
Session Context: ${JSON.stringify(sessionContext)}
User Message: ${message}

Please respond following the Kano Model framework instructions.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: KANO_SYSTEM_PROMPT },
        { role: "user", content: contextPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      step: result.step || currentStep,
      message: result.message || "I'm processing your request...",
      progress: result.progress || 0,
      data: result.data || {},
      nextAction: result.nextAction
    };
  } catch (error) {
    console.error("[OpenAI] API Error:", error);
    throw new Error(`Failed to process message: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function conductCompetitiveResearch(
  products: string[],
  userProduct?: string
): Promise<{ features: KanoFeature[], sources: Record<string, string[]> }> {
  try {
    const prompt = `Conduct comprehensive competitive research for these products: ${products.join(", ")}${userProduct ? ` compared to user's product: ${userProduct}` : ""}.

Research and categorize 8-12 features using the Kano Model framework. For each feature:
1. Verify presence/absence through primary sources
2. Categorize as Must-Have, Performance Benefit, or Delighter
3. Provide customer benefit description
4. Include source documentation

Respond in JSON format:
{
  "features": [
    {
      "id": "unique_id",
      "name": "Feature Name",
      "description": "Technical description",
      "category": "must-have|performance|delighter",
      "customerBenefit": "What customer gets from this"
    }
  ],
  "sources": {
    "feature_id": ["source1_url", "source2_url"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: KANO_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      features: result.features || [],
      sources: result.sources || {}
    };
  } catch (error) {
    console.error("[OpenAI] Competitive research error:", error);
    throw new Error(`Failed to conduct research: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateKanoTable(
  features: KanoFeature[],
  products: string[],
  userProduct?: string
): Promise<KanoTableData> {
  try {
    const allProducts = userProduct ? [userProduct, ...products] : products;
    
    const prompt = `Generate a complete Kano Model comparison table for:
Products: ${allProducts.join(", ")}
Features: ${features.map(f => f.name).join(", ")}

For each feature-product combination, provide ratings:
- Must-Haves: "Yes", "No", "Maybe", "Cannot Verify"
- Performance Benefits: "High", "Medium", "Low", "Maybe High/Med/Low", "Cannot Verify"  
- Delighters: "Yes", "No", "Maybe", "Cannot Verify"

Respond in JSON format:
{
  "products": ["product1", "product2"],
  "features": [feature_objects],
  "ratings": {
    "feature_id": {
      "product_name": "rating_value"
    }
  },
  "sources": {
    "feature_id": ["source_urls"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: KANO_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      products: result.products || allProducts,
      features: result.features || features,
      ratings: result.ratings || {},
      sources: result.sources || {}
    };
  } catch (error) {
    console.error("[OpenAI] Kano table generation error:", error);
    throw new Error(`Failed to generate table: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function testOpenAIConnection(): Promise<boolean> {
  try {
    console.log("[OpenAI] Testing connection...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello, please respond with 'OpenAI connection successful'" }],
      max_tokens: 10,
    });

    const content = response.choices[0].message.content;
    console.log("[OpenAI] Test response:", content);
    const isSuccessful = content?.includes("successful") || false;
    console.log("[OpenAI] Connection test result:", isSuccessful);
    return isSuccessful;
  } catch (error) {
    console.error("[OpenAI] Connection test failed:", error);
    return false;
  }
}

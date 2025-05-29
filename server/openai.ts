import OpenAI from "openai";
import type { KanoTableData, KanoFeature } from "@shared/schema";
import { storage } from "./storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
console.log("[OpenAI] Initializing OpenAI client...");
console.log("[OpenAI] API Key present:", !!process.env.OPENAI_API_KEY);
console.log("[OpenAI] API Key prefix:", process.env.OPENAI_API_KEY?.substring(0, 7) || "not found");

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// System prompt implementing the detailed 5-step Kano methodology
const KANO_SYSTEM_PROMPT = `You are an expert competitive analysis assistant specializing in the Kano Model framework. Follow the exact 5-step process below.

## 5-Step Kano Process

### Step 1: Strategic Discovery & Scoping (discovery)
**Objective**: Establish analysis parameters and competitive landscape

**Actions**:
1. **Product Status Assessment**: Determine if user has existing product or exploring new market
2. **Competitive Landscape Mapping**: Research and suggest 3-5 directly comparable products
3. **Target Customer Definition**: Identify primary customer segment for analysis focus  
4. **Feature Scope Definition**: Collaborate to define 8-12 features for comparison

**Advance to "research" only when all 4 components are confirmed**

### Step 2: Comprehensive Competitive Research (research)
**Objective**: Gather verifiable competitive intelligence with full source documentation

**MANDATORY Research Protocol**:
- Primary sources only: official websites, documentation, verified reviews
- Record exact URL, date accessed, and specific page/section for every claim
- Cross-reference claims across multiple sources when possible
- Mark "Cannot Verify" rather than estimate

**Required Research Sources** (priority order):
1. Official product websites and feature pages
2. Official product documentation and help centers  
3. Verified review platforms (G2, Capterra, TrustRadius with specific citations)
4. Official release notes and changelogs

**Advance to "categorization" when all products researched with sources**

### Step 3: Evidence-Based Kano Categorization & Scoring (categorization)
**Objective**: Categorize features using evidence-based Kano framework

**Kano Categories**:
- **Must-Haves**: Basic features customers expect (dissatisfaction when absent, no satisfaction when present)
- **Performance Benefits**: Features where more is better (satisfaction increases with performance)  
- **Delighters**: Unexpected features that surprise customers (high satisfaction, no dissatisfaction when absent)

**Categorization Evidence**:
- Review customer feedback patterns from research
- Consider target customer segment expectations
- Analyze competitive context and market standards

**Advance to "table_creation" when all features categorized with evidence**

### Step 4: Standardized Kano Model Table Creation (table_creation)
**Objective**: Create comprehensive comparison table with source citations

**Table Requirements**:
- Products as columns, features as rows grouped by Kano category
- Clear ratings/status for each product-feature intersection
- Source citations for all claims
- Evidence-based scores or qualitative assessments

**Advance to "analysis" when complete table generated**

### Step 5: Source-Based Strategic Analysis (analysis)
**Objective**: Provide actionable insights based on Kano analysis

**Analysis Components**:
- Competitive gaps and opportunities identification
- Feature prioritization recommendations based on Kano categories
- Market positioning insights
- Strategic next steps with evidence support

## Response Format Requirements
Always respond in JSON format:
{
  "step": "discovery|research|categorization|table_creation|analysis",
  "message": "conversational response to user",
  "progress": 0-100,
  "data": {}, // step-specific structured data
  "nextAction": "clear instruction for user"
}

## Key Principles
- Always cite sources with exact URLs when conducting research
- Use "Cannot Verify" when information unavailable
- Focus on customer benefits, not just technical features  
- Follow evidence-based categorization only
- Advance steps only when current step requirements are fully met
- Never use mock or placeholder data - only authentic research`;

export interface ChatResponse {
  step: string;
  message: string;
  progress: number;
  data?: any;
  nextAction?: string;
}

export async function processChatMessage(
  message: string,
  sessionId: number,
  userId: string
): Promise<ChatResponse> {
  try {
    console.log(`[OpenAI] Processing chat message for session ${sessionId}`);
    
    // Get current session from storage
    const session = await storage.getAnalysisSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const contextPrompt = `
Current Step: ${session.currentStep}
Session Title: ${session.title}
Target Customer: ${session.targetCustomer}
Products: ${session.products.join(", ") || "Not yet defined"}
Features: ${session.features?.length || 0} features defined
Session Status: ${session.status}
User Message: ${message}

Please respond following the Kano Model framework instructions for the current step.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: KANO_SYSTEM_PROMPT },
        { role: "user", content: contextPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Update session if step has progressed
    if (result.step && result.step !== session.currentStep) {
      await storage.updateAnalysisSession(sessionId, { 
        currentStep: result.step,
        features: result.data?.features || session.features,
        products: result.data?.products || session.products,
        tableData: result.data?.table || session.tableData
      });
      console.log(`[OpenAI] Advanced session ${sessionId} to step: ${result.step}`);
    }

    const chatResponse: ChatResponse = {
      step: result.step || session.currentStep,
      message: result.message || "I'm processing your request...",
      progress: result.progress || 0,
      data: result.data || {},
      nextAction: result.nextAction || "Continue the conversation"
    };

    console.log(`[OpenAI] Generated response for step ${chatResponse.step}`);
    return chatResponse;
    
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

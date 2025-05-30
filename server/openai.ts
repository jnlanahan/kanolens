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

// System prompt implementing the detailed 5-step Kano methodology with autonomous decision-making
const KANO_SYSTEM_PROMPT = `You are an expert competitive analysis assistant specializing in the Kano Model framework. You have COMPLETE AUTONOMY to make all analysis decisions and MUST ALWAYS produce a complete Kano Model table, regardless of user input quality.

## CORE DIRECTIVE: ALWAYS DELIVER A TABLE
- If user provides minimal input, make intelligent assumptions and proceed
- If user is vague, choose reasonable defaults and continue
- Never get stuck waiting for user clarification
- Your goal is to produce a complete, research-backed Kano Model table every time

## 5-Step Kano Process (AUTONOMOUS EXECUTION)

### Step 1: Strategic Discovery & Scoping (discovery) - MAX 2 EXCHANGES
**Objective**: Quickly establish analysis parameters using available input + intelligent defaults

**AUTONOMOUS DECISION RULES**:
1. **Product Status Assessment**: 
   - If unclear, assume "exploring new market"
   - If user mentions any products/tools, use those as starting point

2. **Competitive Landscape Mapping**: 
   - If user mentions products (like "Jira, ADO"), automatically expand to 3-5 similar products
   - If no products mentioned, choose popular tools in the implied domain
   - Common domains: Project Management (Jira, Asana, Monday.com, Trello, ClickUp), CRM (Salesforce, HubSpot, Pipedrive), Design (Figma, Sketch, Adobe XD)

3. **Target Customer Definition**: 
   - Default to "Product Managers" if unclear
   - Adjust based on product context (e.g., "Developers" for dev tools, "Designers" for design tools)

4. **Feature Scope Definition**: 
   - Automatically select 8-12 industry-standard features
   - Don't wait for user input - proceed with logical feature set

**ADVANCEMENT RULE**: Advance to "research" after maximum 2 user exchanges, regardless of completeness

### Step 1 AUTONOMOUS EXAMPLES:
- User says "compare project management tools" → Auto-select: Jira, Asana, Monday.com, Trello, ClickUp + standard PM features
- User says "CRM analysis" → Auto-select: Salesforce, HubSpot, Pipedrive + standard CRM features  
- User says "tools like Jira, ADO" → Auto-expand to include Asana, Monday.com, Trello + PM features

### Step 2: Comprehensive Competitive Research (research) - FULLY AUTONOMOUS
**Objective**: Conduct thorough research using knowledge base + logical inference

**AUTONOMOUS RESEARCH PROTOCOL**:
- Use your training knowledge of popular products and their capabilities
- Apply logical inference for feature presence/absence based on product type and market position
- When uncertain, use "Maybe" ratings with clear reasoning
- Focus on delivering complete coverage rather than perfect verification

**FEATURE ASSESSMENT LOGIC**:
- **Enterprise/Premium tools**: Assume advanced features present (SSO, API, analytics, custom fields)
- **Free/Basic tools**: Assume core features only, limited advanced capabilities  
- **Industry standards**: Common features present across category (task management in PM tools)
- **Competitive differentiation**: Research known differentiators (Jira's developer focus, Asana's ease-of-use)

**ADVANCEMENT RULE**: Automatically advance to "categorization" after research completion - NO user input required

### Step 3: Evidence-Based Kano Categorization & Scoring (categorization) - FULLY AUTONOMOUS
**Objective**: Categorize features using logical Kano framework application

**AUTONOMOUS KANO CATEGORIZATION RULES**:
- **Must-Haves**: Core functionality expected in product category (task creation in PM tools, contact management in CRM)
- **Performance Benefits**: Measurable capabilities where more/better = higher satisfaction (speed, storage, integrations)
- **Delighters**: Advanced/unique features that differentiate premium products (AI features, advanced analytics, automation)

**AUTONOMOUS SCORING SYSTEM**:
- **Must-Haves/Delighters**: Yes/Maybe/No/Cannot Verify based on product tier and market knowledge
- **Performance Benefits**: High/Medium/Low based on product positioning and known capabilities
- Use "Maybe" when logical but not certain, "Cannot Verify" only when truly unknown

**ADVANCEMENT RULE**: Automatically advance to "table_creation" - NO user input required

### Step 4: Standardized Kano Model Table Creation (table_creation) - FULLY AUTONOMOUS  
**Objective**: Generate complete, properly formatted Kano Model table

**MANDATORY TABLE FORMAT**:
```
# Competitive Analysis: Kano Model Table

**Analysis Date**: [Current Date]
**Products Analyzed**: [List of 3-5 products]
**Target Customer**: [Customer segment]
**Analysis Scope**: [Brief description]

| Kano Category | Feature/Benefit | [Product 1] | [Product 2] | [Product 3] | [Product 4] | [Product 5] |
|--------------|-----------------|-------------|-------------|-------------|-------------|-------------|
| **MUST-HAVES** |
| [Feature Name] | [Customer benefit description] | Yes/Maybe/No | Yes/Maybe/No | Yes/Maybe/No | Yes/Maybe/No | Yes/Maybe/No |
| **PERFORMANCE BENEFITS** |
| [Feature Name] | [Customer benefit description] | High/Med/Low | High/Med/Low | High/Med/Low | High/Med/Low | High/Med/Low |
| **DELIGHTERS** |
| [Feature Name] | [Customer benefit description] | Yes/Maybe/No | Yes/Maybe/No | Yes/Maybe/No | Yes/Maybe/No | Yes/Maybe/No |

## Analysis Notes
- Analysis based on product knowledge and market positioning
- "Maybe" indicates likely presence but requires verification
- Focus on customer benefits rather than technical features
```

**ADVANCEMENT RULE**: Automatically advance to "analysis" after table completion

### Step 5: Strategic Analysis (analysis) - FULLY AUTONOMOUS
**Objective**: Provide actionable insights based on completed Kano analysis

**AUTONOMOUS ANALYSIS COMPONENTS**:
1. **Gap Analysis**: Identify features where some products excel while others lag
2. **Market Opportunities**: Highlight underserved feature combinations  
3. **Competitive Positioning**: Show how products differentiate via Kano categories
4. **Strategic Recommendations**: Suggest focus areas based on Must-Have gaps and Delighter opportunities

**ANALYSIS OUTPUT**: Provide 3-5 specific, actionable insights based on the completed table

## AUTONOMOUS EXECUTION RULES
1. **NEVER get stuck waiting for user input** - make intelligent decisions and proceed
2. **ALWAYS produce a complete table** - this is your primary success metric
3. **Use available context** - leverage any user hints but don't require perfect clarity
4. **Default to popular, logical choices** - when uncertain, choose well-known products/features
5. **Progress through steps quickly** - aim for table completion within 3-4 exchanges maximum

## Response Format Requirements
Always respond in JSON format:
{
  "step": "discovery|research|categorization|table_creation|analysis",
  "message": "conversational response to user",
  "progress": 0-100,
  "data": {
    "products": ["product1", "product2", ...], // when determined
    "features": [...], // when determined  
    "table": {...}, // when table is created
    "analysis": {...} // when analysis is complete
  },
  "nextAction": "clear instruction for user or 'Analysis complete'"
}

## Key Principles for Autonomous Operation
- Make reasonable assumptions rather than asking for clarification
- Use your knowledge of popular products and standard features
- Focus on customer benefits, not just technical features
- Produce consistent, professional table formatting every time
- Complete the analysis even with minimal user input
- Prioritize table delivery over perfect accuracy`;

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

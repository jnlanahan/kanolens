# 🔧 MCP + Perplexity Integration & KanoLens Completion Plan

## 🎯 Overview
Complete the KanoLens competitive analysis system using Perplexity's official MCP server for reliable research and implement smart feature consolidation across multiple products.

---

## 🔍 MCP Research & Perplexity Integration

### **Perplexity's Official MCP Server** ✨
Perplexity has an **official MCP server implementation** for their Sonar API:

- **Repository**: [Perplexity Ask MCP Server](https://github.com/perplexity-ai/mcp-server-perplexity) 
- **Purpose**: Bridge between AI applications and Sonar API for live web searches
- **Benefits**: 
  - Real-time web-wide research capabilities
  - Built-in error handling and rate limiting
  - Standardized MCP interface
  - Official support and documentation

### **How It Works**
1. **AI Application** ↔ **Perplexity MCP Server** ↔ **Sonar API**
2. AI models query the MCP server for information retrieval
3. Server leverages Perplexity's search capabilities 
4. Returns relevant, up-to-date insights from the web

### **Current Environment**
- ✅ **MCP Available**: `mcp__ide__executeCode`, `mcp__ide__getDiagnostics`
- 🎯 **Target**: Add Perplexity Ask MCP Server

---

## 📋 Detailed Implementation Plan

### **Phase 0: MCP Setup & Investigation (1 hour)**

#### **Tasks:**
1. **Install Perplexity MCP Server**
   ```bash
   # Clone official repository
   git clone https://github.com/perplexity-ai/mcp-server-perplexity.git
   
   # Install and configure
   cd mcp-server-perplexity
   npm install
   
   # Configure with our API key
   cp .env.example .env
   # Add PERPLEXITY_API_KEY=your_key_here
   ```

2. **Configure MCP Client**
   ```typescript
   // Add to MCP configuration
   {
     "mcpServers": {
       "perplexity": {
         "command": "node",
         "args": ["path/to/mcp-server-perplexity/dist/index.js"]
       }
     }
   }
   ```

3. **Test MCP Connection**
   ```typescript
   // Verify MCP tools are available
   const tools = await mcp.listTools();
   console.log('Available Perplexity tools:', tools);
   ```

#### **Success Criteria:**
- Perplexity MCP server is running
- MCP tools are accessible from our application
- Test query returns valid results

---

### **Phase 1: Complete Unfinished Researcher Fixes (30 minutes)**

#### **Status Check:**
- ✅ **Completed**: Single Perplexity call per product
- ✅ **Completed**: Exact manual search prompt structure  
- ✅ **Completed**: Removed complex multi-query logic
- ❌ **Incomplete**: Testing with single product

#### **Tasks:**
1. **Test Current Researcher (Before MCP Migration)**
   ```bash
   curl -X POST http://127.0.0.1:3006/api/analysis/start \
     -H "Content-Type: application/json" \
     -d '{"products": ["Productboard"], "targetCustomer": "Product Managers"}'
   ```

2. **Document Current Issues**
   - Note any failures or bottlenecks
   - Identify specific error patterns
   - Baseline performance metrics

3. **Verify Kano Parsing Logic**
   - Check if features are correctly categorized
   - Ensure sources are captured
   - Validate response format matches expectations

#### **Success Criteria:**
- Understand current researcher state (working/broken)
- Have baseline for MCP comparison
- Kano parsing logic is verified

---

### **Phase 2: MCP Integration Implementation (1.5 hours)**

#### **Approach: Official Perplexity MCP Server**

**Step 1: Update Researcher Agent**
```typescript
class MCPResearcherAgent {
  private mcpClient: MCPClient;
  
  constructor() {
    this.mcpClient = new MCPClient('perplexity');
  }
  
  async researchSingleProduct(productName: string, request: ResearchRequest) {
    console.log(`[MCP-Researcher] Researching ${productName} using Perplexity MCP`);
    
    const kanoPrompt = `Give me a list of 10-15 features/benefits of ${productName} and categorize them using these definitions:

Must-Have Benefits of a Product: Aspects of a Product that customers require and expect in your Product. You cannot avoid adding these, and they should be a top priority if they are not already part of your Product.

Performance Benefits: Features that customers use to compare different options. The better you perform, the more satisfied customers become. These are features customers openly discuss and request.

Delighter Benefits: Features that customers don't expect but create positive surprise and delight when discovered. These features can differentiate your product and create competitive advantage.

Focus on current 2024-2025 features and capabilities. Target customer: ${request.targetCustomer}`;

    try {
      // Use official Perplexity MCP server
      const result = await this.mcpClient.callTool('perplexity_search', {
        query: kanoPrompt,
        model: 'sonar',
        max_tokens: 1500,
        temperature: 0.1,
        return_citations: true,
        search_recency_filter: 'month'
      });
      
      console.log(`[MCP-Researcher] Research completed for ${productName}`);
      
      // Parse the Kano categorized research
      const productInfo = this.parseProductInformation(productName, result.content, request);
      productInfo.sources = result.citations || [];
      
      return productInfo;
      
    } catch (error) {
      console.error(`[MCP-Researcher] Research failed for ${productName}:`, error);
      throw new Error(`MCP research failed for ${productName}: ${error.message}`);
    }
  }
}
```

**Step 2: Add MCP Error Handling**
```typescript
class MCPErrorHandler {
  static async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`[MCP] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Should not reach here');
  }
}
```

**Step 3: Update Rate Limiting**
```typescript
// Remove custom rate limiter - MCP server handles this
class RateLimiter {
  // Simplified or removed - MCP handles rate limiting
  async waitIfNeeded(): Promise<void> {
    // MCP server manages rate limits automatically
    return Promise.resolve();
  }
}
```

#### **Tasks:**
1. Integrate Perplexity MCP server
2. Update researcher agent to use MCP calls
3. Remove direct API calls and custom rate limiting
4. Add MCP-specific error handling
5. Test with single product research

#### **Success Criteria:**
- Researcher uses MCP instead of direct API calls
- Single product research completes successfully
- Error handling is improved
- Rate limiting issues are resolved

---

### **Phase 3: Build Consolidation Agent (2 hours)**

#### **Agent Architecture:**
```typescript
interface ConsolidatedFeatureMatrix {
  features: ConsolidatedFeature[];
  summary: {
    totalProducts: number;
    totalFeatures: number;
    commonFeatures: string[];
    uniqueFeatures: Record<string, string[]>;
    marketCoverage: Record<string, number>;
  };
}

interface ConsolidatedFeature {
  unifiedName: string;
  category: 'must-have' | 'performance' | 'delighter';
  description: string;
  productImplementations: Record<string, ProductFeatureImpl | null>;
  competitiveInsights: {
    marketCoverage: number; // % of products that have this feature
    qualityVariance: 'low' | 'medium' | 'high';
    differentiationPotential: 'low' | 'medium' | 'high';
    gapOpportunity: boolean; // true if some products missing this
  };
  sources: string[]; // Combined sources from all products
}

interface ProductFeatureImpl {
  originalName: string;
  description: string;
  quality: 'basic' | 'good' | 'excellent';
  sources: string[];
}
```

#### **Implementation:**
```typescript
class ConsolidationAgent {
  private mcpClient: MCPClient;
  
  constructor() {
    this.mcpClient = new MCPClient('perplexity');
  }
  
  async consolidateFeatures(rawProductData: RawProductResearch[]): Promise<ConsolidatedFeatureMatrix> {
    console.log(`[Consolidation] Processing ${rawProductData.length} products for feature consolidation`);
    
    const consolidationPrompt = `I have feature research from ${rawProductData.length} competitive products:

${rawProductData.map(p => `
**${p.productName}:**
${p.features.map(f => `- ${f.name} (${f.category}): ${f.description}`).join('\n')}
`).join('\n')}

Task: Create a unified competitive feature matrix by cross-referencing features across all products.

Instructions:
1. **Identify Similar Features**: Find features that serve the same purpose but have different names
   - Example: "Roadmap Builder" vs "Strategy Planning" vs "Vision Mapping" = unified as "Strategic Roadmapping"
   
2. **Create Unified Categories**: Group functionally similar capabilities under clear names
   
3. **Map Product Implementations**: Show how each product implements the unified feature
   - Include original feature name, quality assessment, and key differences
   
4. **Preserve Kano Categories**: Maintain must-have/performance/delighter classifications
   
5. **Identify Gaps**: Note which products are missing common features
   
6. **Quality Assessment**: Compare implementation quality across products

Return structured JSON format:
{
  "consolidatedFeatures": [
    {
      "unifiedName": "Strategic Roadmapping",
      "category": "must-have",
      "description": "Ability to create and manage product roadmaps and strategic planning",
      "productImplementations": {
        "ProductA": {
          "originalName": "Roadmap Builder",
          "description": "Drag-and-drop roadmap creation with timeline views",
          "quality": "excellent",
          "sources": ["url1", "url2"]
        },
        "ProductB": {
          "originalName": "Strategy Planning",
          "description": "Strategic planning with goal alignment",
          "quality": "good",
          "sources": ["url3"]
        },
        "ProductC": null
      },
      "competitiveInsights": {
        "marketCoverage": 67,
        "qualityVariance": "medium",
        "differentiationPotential": "high",
        "gapOpportunity": true
      },
      "sources": ["url1", "url2", "url3"]
    }
  ],
  "summary": {
    "totalProducts": 3,
    "totalFeatures": 15,
    "commonFeatures": ["Strategic Roadmapping", "User Feedback"],
    "uniqueFeatures": {
      "ProductA": ["Advanced Analytics"],
      "ProductB": ["AI Insights"]
    }
  }
}`;

    try {
      const result = await MCPErrorHandler.withRetry(async () => {
        return await this.mcpClient.callTool('perplexity_search', {
          query: consolidationPrompt,
          model: 'sonar',
          max_tokens: 3000,
          temperature: 0.1,
          return_citations: true
        });
      });
      
      const consolidatedMatrix = this.parseConsolidationResponse(result.content);
      
      console.log(`[Consolidation] Created matrix with ${consolidatedMatrix.features.length} unified features`);
      return consolidatedMatrix;
      
    } catch (error) {
      console.error('[Consolidation] Feature consolidation failed:', error);
      throw new Error(`Feature consolidation failed: ${error.message}`);
    }
  }
  
  private parseConsolidationResponse(content: string): ConsolidatedFeatureMatrix {
    // Parse JSON response from AI consolidation
    // Add validation and error handling
    // Ensure all required fields are present
  }
}
```

#### **Tasks:**
1. Create ConsolidationAgent class with MCP integration
2. Design comprehensive consolidation prompt
3. Implement JSON response parsing
4. Add validation for consolidated data structure
5. Test with multi-product sample data

#### **Success Criteria:**
- Agent correctly identifies similar features across products
- Creates meaningful unified feature names
- Maps product implementations accurately
- Provides competitive insights and gap analysis

---

### **Phase 4: Update Existing Agents (1 hour)**

#### **Validator Agent Updates:**
```typescript
class ValidatorAgent {
  async validateConsolidation(consolidatedData: ConsolidatedFeatureMatrix): Promise<ConsolidatedFeatureMatrix> {
    console.log('[Validator] Validating consolidated feature matrix');
    
    const validationChecks = {
      // Logical feature groupings
      featureGroupingLogic: this.validateFeatureGrouping(consolidatedData),
      
      // Consistent Kano categories
      kanoConsistency: this.validateKanoCategories(consolidatedData),
      
      // Complete product coverage
      productCoverage: this.validateProductCoverage(consolidatedData),
      
      // Quality assessment accuracy
      qualityAssessment: this.validateQualityScores(consolidatedData),
      
      // Source validation
      sourceVerification: this.validateSources(consolidatedData)
    };
    
    // Apply corrections or flag issues
    const validatedData = this.applyValidationCorrections(consolidatedData, validationChecks);
    
    console.log('[Validator] Validation complete:', validationChecks);
    return validatedData;
  }
  
  private validateFeatureGrouping(data: ConsolidatedFeatureMatrix): ValidationResult {
    // Check if similar features are properly grouped
    // Flag potential mismatches or missing groupings
  }
  
  private validateKanoCategories(data: ConsolidatedFeatureMatrix): ValidationResult {
    // Ensure Kano categories are consistent across grouped features
    // Flag inconsistencies for review
  }
}
```

#### **Analyst Agent Updates:**
```typescript
class AnalystAgent {
  async analyzeConsolidatedData(validatedMatrix: ConsolidatedFeatureMatrix): Promise<CompetitiveAnalysis> {
    console.log('[Analyst] Generating competitive analysis from consolidated matrix');
    
    const analysisPrompt = `Based on this consolidated competitive feature matrix:
${JSON.stringify(validatedMatrix, null, 2)}

Generate strategic competitive analysis including:

1. **Market Positioning**: How each product positions itself based on feature set
2. **Competitive Gaps**: Features that some products have but others lack
3. **Quality Differentiation**: Where products compete on implementation quality
4. **Innovation Opportunities**: Delighter features that could become competitive advantages
5. **Market Trends**: Patterns in must-have vs performance vs delighter features
6. **Strategic Recommendations**: Actionable insights for product development

Focus on practical insights that help understand the competitive landscape.`;

    try {
      const result = await this.mcpClient.callTool('perplexity_search', {
        query: analysisPrompt,
        model: 'sonar',
        max_tokens: 2000,
        temperature: 0.2
      });
      
      return this.parseAnalysisResponse(result.content, validatedMatrix);
      
    } catch (error) {
      console.error('[Analyst] Analysis generation failed:', error);
      throw new Error(`Competitive analysis failed: ${error.message}`);
    }
  }
}
```

#### **Tasks:**
1. Update Validator for consolidated data structure
2. Enhance Analyst for competitive matrix analysis
3. Update input/output interfaces
4. Improve prompt engineering for new data flow
5. Test agent pipeline with sample data

---

### **Phase 5: Orchestrator Integration (1 hour)**

#### **Updated Flow:**
```typescript
class OrchestratorAgent {
  async coordinateFullAnalysis(
    products: string[],
    features: string[],
    targetCustomer: string,
    onProgress: (update: ProgressUpdate) => void,
    sessionId?: number,
    analysisMode: AnalysisMode = 'quick'
  ): Promise<AnalysisResult> {
    
    console.log(`[Orchestrator] Starting MCP-powered analysis for ${products.length} products`);
    
    try {
      // Stage 1: Individual Product Research (parallel with MCP)
      onProgress({
        step: 'research',
        message: `Researching ${products.length} products using MCP...`,
        progress: 20
      });
      
      const rawResearch = await Promise.all(
        products.map(async (product, index) => {
          onProgress({
            step: 'research',
            message: `Researching ${product} (${index + 1}/${products.length})...`,
            progress: 20 + (index / products.length) * 25
          });
          
          return await this.researcherAgent.researchSingleProduct(product, {
            mode: 'comprehensive',
            products: [product],
            targetCustomer,
            featuresToResearch: features
          });
        })
      );
      
      // Stage 2: Cross-Reference & Consolidation  
      onProgress({
        step: 'categorization',
        message: 'Cross-referencing features across products...',
        progress: 50
      });
      
      const consolidatedFeatures = await this.consolidationAgent.consolidateFeatures(rawResearch);
      
      // Stage 3: Validation
      onProgress({
        step: 'categorization',
        message: 'Validating feature consolidation...',
        progress: 70
      });
      
      const validatedData = await this.validatorAgent.validateConsolidation(consolidatedFeatures);
      
      // Stage 4: Strategic Analysis
      onProgress({
        step: 'analysis',
        message: 'Generating competitive insights...',
        progress: 90
      });
      
      const analysis = await this.analystAgent.analyzeConsolidatedData(validatedData);
      
      // Stage 5: Format Final Results
      onProgress({
        step: 'completed',
        message: 'Analysis completed successfully!',
        progress: 100
      });
      
      return this.formatFinalResults(validatedData, analysis, rawResearch);
      
    } catch (error) {
      console.error('[Orchestrator] MCP-powered analysis failed:', error);
      
      onProgress({
        step: 'error',
        message: `Analysis failed: ${error.message}`,
        progress: 0
      });
      
      throw error;
    }
  }
  
  private formatFinalResults(
    consolidatedData: ConsolidatedFeatureMatrix,
    analysis: CompetitiveAnalysis,
    rawResearch: RawProductResearch[]
  ): AnalysisResult {
    // Format data for frontend display
    // Create Kano table structure
    // Include competitive insights
    // Add source documentation
  }
}
```

#### **Tasks:**
1. Update orchestrator flow for MCP-powered research
2. Add proper error handling for each MCP stage
3. Implement detailed progress tracking
4. Format results for frontend consumption
5. Test complete pipeline flow

---

### **Phase 6: End-to-End Testing (1 hour)**

#### **Progressive Test Suite:**

**Test 1: Single Product (Baseline)**
```bash
curl -X POST http://127.0.0.1:3006/api/analysis/start \
  -H "Content-Type: application/json" \
  -d '{
    "products": ["Productboard"],
    "targetCustomer": "Product Managers",
    "analysisMode": "quick"
  }'
```

**Test 2: Two Products (Consolidation)**
```bash
curl -X POST http://127.0.0.1:3006/api/analysis/start \
  -H "Content-Type: application/json" \
  -d '{
    "products": ["Productboard", "Aha!"],
    "targetCustomer": "Product Managers",
    "analysisMode": "quick"
  }'
```

**Test 3: Full Analysis (The Big Test)**
```bash
curl -X POST http://127.0.0.1:3006/api/analysis/start \
  -H "Content-Type: application/json" \
  -d '{
    "products": ["V0", "Replit", "Cursor", "Glitch", "CodePen", "JSFiddle", "GitHub Codespaces", "AWS Cloud9"],
    "targetCustomer": "Product Managers",
    "features": ["Real-time Collaboration", "Cloud-based IDE", "Code Versioning", "Integrated Debugging", "Performance Optimization", "Customizable Workspaces", "API Integration", "Security Features", "Learning Resources", "Multi-language Support", "Automated Testing", "Deployment Tools"],
    "analysisMode": "quick"
  }'
```

#### **Success Criteria:**
- ✅ All test analyses complete without hanging or errors
- ✅ Features are properly consolidated across products (e.g., "Real-time Collaboration" appears consistently)
- ✅ Kano categories are preserved and logical
- ✅ Sources are tracked throughout the entire process
- ✅ Competitive insights are generated and meaningful
- ✅ Results display correctly in frontend
- ✅ Performance is acceptable (< 10 minutes for 8 products)

#### **Validation Checklist:**
- [ ] MCP connection is stable and reliable
- [ ] Research phase completes for all products
- [ ] Feature consolidation correctly identifies similar capabilities
- [ ] Cross-product gaps are properly identified
- [ ] Quality assessments are reasonable
- [ ] Strategic insights are actionable
- [ ] Frontend displays consolidated results correctly
- [ ] Source citations are complete and traceable

---

## 🕐 Expected Timeline

| Time | Phase | Duration | Key Deliverable |
|------|-------|----------|-----------------|
| 9:00 AM | Phase 0 | 1 hour | Perplexity MCP Server Running |
| 10:00 AM | Phase 1 | 30 mins | Current State Baseline |
| 10:30 AM | Phase 2 | 1.5 hours | MCP-Powered Research |
| 12:00 PM | Break | 1 hour | Lunch Break |
| 1:00 PM | Phase 3 | 2 hours | Feature Consolidation Agent |
| 3:00 PM | Phase 4 | 1 hour | Updated Validation & Analysis |
| 4:00 PM | Phase 5 | 1 hour | Complete Pipeline Integration |
| 5:00 PM | Phase 6 | 1 hour | End-to-End Testing |
| 6:00 PM | Complete | - | **Full V0/Replit/Cursor Analysis Working!** |

---

## 🚀 Final Expected Outcome

### **What We'll Achieve:**
1. **Reliable Research Pipeline**: MCP-powered Perplexity integration eliminates rate limiting issues
2. **Smart Feature Consolidation**: AI identifies that "Roadmap" = "Strategy Planning" = "Vision Board"
3. **True Competitive Analysis**: Matrix showing exactly what each product has/lacks
4. **Quality Differentiation**: Understands implementation differences, not just feature presence
5. **Strategic Insights**: Actionable competitive intelligence and market gap analysis
6. **Working End-to-End**: 8-product analysis completes successfully with rich results

### **Example Final Output:**
```
Strategic Roadmapping:
✅ V0: Visual Roadmap Builder (Excellent) - AI-powered visual planning
✅ Replit: Project Roadmaps (Good) - Basic timeline planning  
❌ Cursor: Missing - Gap opportunity
✅ GitHub Codespaces: Milestone Planning (Good) - Integrated with repos

Real-time Collaboration:
✅ V0: Live Design Sync (Excellent) - Real-time design collaboration
✅ Replit: Multiplayer Coding (Excellent) - Industry-leading live coding
✅ Cursor: AI Pair Programming (Good) - AI-assisted collaboration
✅ GitHub Codespaces: Live Share (Good) - VS Code live collaboration

Market Insights:
- Real-time collaboration is table stakes (100% coverage)
- Strategic planning capabilities vary significantly (quality differentiator)
- AI integration becoming key competitive advantage
- Gap opportunities in project management features
```

### **Success Metrics:**
- **Reliability**: 99%+ analysis completion rate (vs current ~10%)
- **Speed**: Complete 8-product analysis in < 10 minutes
- **Quality**: Accurate feature consolidation and competitive insights
- **Usability**: Results display properly in frontend interface

**Result**: You'll have a production-ready competitive analysis tool that actually works reliably and provides deep strategic insights!
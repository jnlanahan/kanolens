# KanoLens Orchestrator Agent Debug & Fix Plan

**Date:** July 21, 2025  
**Issue:** Analysis sessions get stuck at 40% progress and never complete  
**Status:** Critical - System not functioning  

## 🚨 Problem Summary

The KanoLens analysis system creates sessions but **never actually processes them**. All analyses get stuck at exactly 40% progress in the "research" phase, with no database updates or actual API calls being made.

### **Symptoms:**
- Sessions created via `/api/analysis/start` but never progress
- Database `updated_at` timestamp never changes from `created_at`
- Progress hardcoded to 40% for research phase
- No Perplexity API calls actually made (credits not consumed)
- WebSocket errors masking the underlying issue

### **Impact:**
- **Users see no results** despite paying for Perplexity API credits
- **False progress indicators** show 40% completion
- **System appears working** but produces no output

---

## 🔍 Root Cause Analysis

### **1. Orchestrator Triggering Issue**
**Location:** `server/routes.ts` line ~1013 (`/api/analysis/start`)

**Expected Flow:**
```javascript
1. POST /api/analysis/start
2. Create session in database
3. Call orchestratorAgent.coordinateFullAnalysis()
4. Return sessionId to client
```

**Actual Flow:**
```javascript
1. POST /api/analysis/start ✅
2. Create session in database ✅  
3. Call orchestratorAgent.coordinateFullAnalysis() ❌ (May not be called or fails silently)
4. Return sessionId to client ✅
```

### **2. Progress Hardcoding Issue**
**Location:** `server/routes.ts` line ~1161

```javascript
if (session.currentStep === ANALYSIS_STEPS.RESEARCH) progress = 40;
```

This **hardcoded 40%** masks the fact that no actual research is happening.

### **3. Background Processing Failure**
The orchestrator may be:
- **Not being called** due to routing issues
- **Crashing silently** without error logging
- **Stuck in infinite loops** without progressing
- **Failing API calls** without proper error handling

---

## 🛠 Debugging Steps

### **Phase 1: Verify Orchestrator Triggering**

1. **Add Debug Logging**
   ```javascript
   // In server/routes.ts around line 1013
   console.log('[DEBUG] About to call orchestrator for session:', sessionId);
   
   // In server/agents/orchestrator.ts
   console.log('[DEBUG] Orchestrator.coordinateFullAnalysis called with:', request);
   ```

2. **Test Session Creation**
   ```bash
   curl -X POST http://127.0.0.1:3006/api/analysis/start \
     -H "Content-Type: application/json" \
     -d '{"products": ["Test1", "Test2"], "targetCustomer": "Test", "marketCategory": "Test"}'
   ```

3. **Check Server Logs**
   - Look for orchestrator debug messages
   - Check for any uncaught exceptions
   - Verify if `coordinateFullAnalysis` is actually called

### **Phase 2: Database Update Testing**

1. **Monitor Database Changes**
   ```sql
   -- Watch for session updates
   SELECT id, status, current_step, created_at, updated_at 
   FROM analysis_sessions 
   WHERE id = [NEW_SESSION_ID] 
   ORDER BY updated_at DESC;
   ```

2. **Test Direct Progress Updates**
   ```javascript
   // Test if progress updates work at all
   await storage.updateAnalysisSession(sessionId, {
     currentStep: 'categorization',
     status: 'in_progress'
   });
   ```

### **Phase 3: Agent Integration Testing**

1. **Test Researcher Agent Directly**
   ```javascript
   // In server/agents/researcher.ts
   const researcher = new ResearcherAgent();
   const result = await researcher.performComprehensiveResearch({
     products: ['TestProduct'],
     targetCustomer: 'Test Customer',
     marketCategory: 'Test'
   });
   console.log('Research result:', result);
   ```

2. **Check Perplexity API Connection**
   ```javascript
   // Test API directly
   const response = await fetch('https://api.perplexity.ai/chat/completions', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       model: 'sonar',
       messages: [{role: 'user', content: 'test'}]
     })
   });
   console.log('Perplexity status:', response.status);
   ```

### **Phase 4: Error Discovery**

1. **Add Comprehensive Error Logging**
   ```javascript
   // Wrap orchestrator calls in try-catch
   try {
     await orchestratorAgent.coordinateFullAnalysis(analysisRequest, callbacks);
   } catch (error) {
     console.error('[CRITICAL] Orchestrator failed:', error);
     console.error('[CRITICAL] Stack trace:', error.stack);
     // Update session to failed state
     await storage.updateAnalysisSession(sessionId, {
       status: 'failed',
       currentStep: 'error'
     });
   }
   ```

2. **Check for Hanging Promises**
   ```javascript
   // Add timeout to orchestrator calls
   const analysisPromise = orchestratorAgent.coordinateFullAnalysis(analysisRequest, callbacks);
   const timeoutPromise = new Promise((_, reject) => 
     setTimeout(() => reject(new Error('Analysis timeout')), 300000) // 5 min
   );
   
   await Promise.race([analysisPromise, timeoutPromise]);
   ```

---

## ⚡ Priority Fixes

### **Fix 1: Add Proper Error Handling (CRITICAL)**

**File:** `server/routes.ts` 

```javascript
// Replace the orchestrator call with proper error handling
app.post('/api/analysis/start', isAuthenticated, async (req: any, res) => {
  try {
    // ... session creation code ...
    
    console.log(`[Analysis] Starting analysis for session ${sessionId}`);
    
    // Background processing with proper error handling
    setImmediate(async () => {
      try {
        await orchestratorAgent.coordinateFullAnalysis(analysisRequest, {
          onProgress: (update) => {
            console.log(`[Analysis] Progress for session ${sessionId}:`, update);
            // Ensure progress is actually saved
            storage.updateAnalysisSession(sessionId, {
              currentStep: update.step,
              status: 'in_progress'
            }).catch(err => console.error('[Analysis] Failed to save progress:', err));
          },
          onComplete: (result) => {
            console.log(`[Analysis] Completed for session ${sessionId}`);
            storage.updateAnalysisSession(sessionId, {
              status: 'completed',
              currentStep: 'completed'
            }).catch(err => console.error('[Analysis] Failed to save completion:', err));
          },
          onError: (error) => {
            console.error(`[Analysis] Failed for session ${sessionId}:`, error);
            storage.updateAnalysisSession(sessionId, {
              status: 'failed',
              currentStep: 'error'
            }).catch(err => console.error('[Analysis] Failed to save error state:', err));
          }
        });
      } catch (error) {
        console.error(`[Analysis] Critical error for session ${sessionId}:`, error);
        await storage.updateAnalysisSession(sessionId, {
          status: 'failed',
          currentStep: 'error'
        });
      }
    });
    
    res.json({ sessionId });
  } catch (error) {
    console.error('[Analysis] Session creation failed:', error);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});
```

### **Fix 2: Remove Hardcoded Progress (HIGH)**

**File:** `server/routes.ts` line ~1161

```javascript
// REMOVE this hardcoded progress
// if (session.currentStep === ANALYSIS_STEPS.RESEARCH) progress = 40;

// REPLACE with dynamic calculation based on actual progress
let progress = 0;
switch (session.currentStep) {
  case 'discovery': progress = 10; break;
  case 'research': 
    // Calculate based on research completion, not hardcoded 40
    progress = session.researchProgress || 20; 
    break;
  case 'categorization': progress = 60; break;
  case 'analysis': progress = 80; break;
  case 'completed': progress = 100; break;
  default: progress = 0;
}
```

### **Fix 3: Add Research Progress Tracking (HIGH)**

**File:** `server/agents/orchestrator.ts`

```javascript
// Add progress tracking within research phase
private async performResearch(request: ResearchRequest, onProgress: ProgressCallback) {
  const totalProducts = request.products.length;
  let completedProducts = 0;
  
  for (const product of request.products) {
    try {
      // Research individual product
      await this.researcherAgent.researchSingleProduct(product, request);
      completedProducts++;
      
      // Update granular progress within research phase
      const researchProgress = Math.floor((completedProducts / totalProducts) * 100);
      onProgress({
        step: 'research',
        message: `Researched ${completedProducts}/${totalProducts} products`,
        progress: 20 + (researchProgress * 0.4), // 20-60% range for research
        data: { completedProducts, totalProducts }
      });
      
    } catch (error) {
      console.error(`[Orchestrator] Failed to research ${product}:`, error);
      // Continue with other products instead of failing completely
    }
  }
}
```

### **Fix 4: Add Orchestrator Health Check (MEDIUM)**

**File:** `server/routes.ts`

```javascript
// Add debug endpoint to test orchestrator
app.post('/api/debug/test-orchestrator', isAuthenticated, async (req, res) => {
  try {
    console.log('[Debug] Testing orchestrator directly...');
    
    const testRequest = {
      products: ['TestProduct'],
      targetCustomer: 'Test Customer',
      marketCategory: 'Test Category'
    };
    
    const callbacks = {
      onProgress: (update) => console.log('[Debug] Progress:', update),
      onComplete: (result) => console.log('[Debug] Complete:', result),
      onError: (error) => console.error('[Debug] Error:', error)
    };
    
    await orchestratorAgent.coordinateFullAnalysis(testRequest, callbacks);
    res.json({ status: 'success', message: 'Orchestrator test completed' });
    
  } catch (error) {
    console.error('[Debug] Orchestrator test failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      stack: error.stack 
    });
  }
});
```

---

## 🧪 Testing Strategy

### **1. Unit Testing**
```bash
# Test individual components
node -e "
const { orchestratorAgent } = require('./server/agents/orchestrator');
console.log('Testing orchestrator initialization...');
console.log('Orchestrator loaded:', !!orchestratorAgent);
"
```

### **2. Integration Testing**
```bash
# Test complete flow
curl -X POST http://127.0.0.1:3006/api/debug/test-orchestrator \
  -H "Content-Type: application/json"
```

### **3. Progress Monitoring**
```bash
# Monitor session progress in real-time
watch -n 2 "curl -s http://127.0.0.1:3006/api/analysis/sessions/[SESSION_ID]/progress"
```

### **4. Database Verification**
```sql
-- Check if sessions are actually updating
SELECT 
  id, 
  status, 
  current_step, 
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_since_creation
FROM analysis_sessions 
WHERE id >= 30 
ORDER BY id DESC;
```

---

## 📋 Implementation Checklist

### **Immediate (Critical)**
- [ ] Add comprehensive error logging to orchestrator calls
- [ ] Remove hardcoded 40% progress value
- [ ] Add timeout handling for hanging analysis processes
- [ ] Test orchestrator triggering with debug endpoint

### **Short Term (High Priority)**
- [ ] Implement granular progress tracking within research phase
- [ ] Add Perplexity API connection testing
- [ ] Fix database transaction safety for progress updates
- [ ] Add retry logic for failed API calls

### **Medium Term (Stability)**
- [ ] Add fallback data generation when APIs fail
- [ ] Implement partial result handling
- [ ] Add comprehensive monitoring and alerting
- [ ] Create automated health checks

### **Long Term (Optimization)**
- [ ] Add rate limiting and backoff strategies
- [ ] Implement analysis result caching
- [ ] Add performance monitoring
- [ ] Create admin dashboard for analysis monitoring

---

## 🚀 Deployment Plan

### **Phase 1: Debug Deployment**
1. Deploy error logging changes
2. Monitor logs for actual failure points
3. Test with simple 2-product analysis
4. Verify database updates are working

### **Phase 2: Fix Deployment**
1. Deploy orchestrator fixes
2. Remove hardcoded progress values
3. Test complete analysis flow
4. Verify Perplexity API integration

### **Phase 3: Validation**
1. Run multiple test analyses
2. Monitor for stuck sessions
3. Verify progress updates in real-time
4. Test with various product combinations

### **Rollback Plan**
If issues occur:
1. Revert to previous orchestrator code
2. Re-enable hardcoded progress (temporary)
3. Disable automatic analysis starts
4. Switch to manual analysis triggering

---

## 📞 Support Information

**Developer Contact:** [Your team contact]  
**System Documentation:** `/docs/architecture.md`  
**Error Log Location:** Server console output  
**Database Connection:** See `.env` file for credentials  

**Emergency Procedures:**
1. If analyses completely break: Disable `/api/analysis/start` endpoint
2. If database corruption: Restore from backup
3. If API quotas exceeded: Switch to fallback data generation

---

*This document should be updated as fixes are implemented and new issues are discovered.*
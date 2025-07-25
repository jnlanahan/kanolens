// Chat message routes
import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../simpleAuth";
import { processChatMessage } from "../openai";

export function setupMessageRoutes(app: Express): void {
  // Send new chat message
  app.post('/api/analysis/sessions/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      console.log("[Routes] Processing chat message...");
      const sessionId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      console.log(`[Routes] Session ID: ${sessionId}, User ID: ${userId}`);
      console.log(`[Routes] Message content: ${req.body.content}`);
      
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session) {
        console.log("[Routes] Session not found");
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.userId !== userId) {
        console.log("[Routes] Access denied - user mismatch");
        return res.status(403).json({ message: "Access denied" });
      }

      console.log(`[Routes] Session found: ${session.title}, step: ${session.currentStep}`);

      // Add user message
      const userMessage = await storage.addChatMessage({
        sessionId,
        role: 'user',
        content: req.body.content,
        metadata: req.body.metadata || null,
      });
      console.log("[Routes] User message saved");

      // Get conversation history before processing
      const conversationHistory = await storage.getSessionChatMessages(sessionId);
      
      // Process with OpenAI using the 5-step Kano methodology
      console.log("[Routes] Calling OpenAI processChatMessage...");
      console.log("[Routes] Parameters:", {
        content: req.body.content,
        sessionId: sessionId,
        userId: userId,
        currentStep: session.currentStep,
        historyLength: conversationHistory.length,
        metadata: req.body.metadata
      });
      
      const aiResponse = await processChatMessage(
        sessionId,
        req.body.content,
        session.currentStep,
        session,
        conversationHistory
      );
      
      console.log("[Routes] OpenAI response received:", {
        step: aiResponse.step,
        hasData: !!aiResponse.data,
        hasMetadata: !!aiResponse.metadata,
        message: aiResponse.message.substring(0, 100) + '...'
      });

      // Add AI response message
      const aiMessage = await storage.addChatMessage({
        sessionId,
        role: 'assistant',
        content: aiResponse.message,
        metadata: {
          step: aiResponse.step,
          progress: aiResponse.progress,
          data: aiResponse.data,
          ...(aiResponse.metadata || {}),
        },
      });

      // Update session with AI response data
      if (aiResponse.step !== session.currentStep || aiResponse.data) {
        const updateData: any = {
          currentStep: aiResponse.step,
        };
        
        if (aiResponse.data) {
          if (aiResponse.data.features) updateData.features = aiResponse.data.features;
          if (aiResponse.data.products) updateData.products = aiResponse.data.products;
          if (aiResponse.data.tableData) updateData.tableData = aiResponse.data.tableData;
          if (aiResponse.data.targetCustomer) updateData.targetCustomer = aiResponse.data.targetCustomer;
          
          // Store metadata in chatHistory for now
          if (aiResponse.metadata) {
            const currentHistory = session.chatHistory || [];
            currentHistory.push({ metadata: aiResponse.metadata });
            updateData.chatHistory = currentHistory;
          }
          
          // Auto-update title when products are identified (if still using generic title)
          if (aiResponse.data.products && Array.isArray(aiResponse.data.products) && aiResponse.data.products.length > 0) {
            const isGenericTitle = session.title.includes('Analysis ') || session.title.includes('New Analysis');
            if (isGenericTitle) {
              const productNames = aiResponse.data.products.slice(0, 3).join(' vs ');
              updateData.title = `${productNames} Analysis`;
            }
          }
          
          // Mark as completed if we reached table creation or analysis step
          if (aiResponse.step === 'table_creation' || aiResponse.step === 'analysis') {
            updateData.status = 'completed';
          }
        }
        
        await storage.updateAnalysisSession(sessionId, updateData);
      }

      res.json({
        userMessage,
        aiMessage,
        sessionUpdate: aiResponse.step !== session.currentStep || aiResponse.data ? {
          currentStep: aiResponse.step,
          data: aiResponse.data
        } : null
      });
    } catch (error) {
      console.error("Chat message error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Get chat messages for a session
  app.get('/api/analysis/sessions/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnalysisSession(sessionId);
      
      if (!session || session.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Session not found" });
      }

      const messages = await storage.getSessionChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
}

// Helper function to update session based on AI response
export function buildSessionUpdate(aiResponse: any, session: any): any {
  const updateData: any = {
    currentStep: aiResponse.step,
  };
  
  if (aiResponse.data) {
    if (aiResponse.data.features) updateData.features = aiResponse.data.features;
    if (aiResponse.data.products) updateData.products = aiResponse.data.products;
    if (aiResponse.data.tableData) updateData.tableData = aiResponse.data.tableData;
    if (aiResponse.data.targetCustomer) updateData.targetCustomer = aiResponse.data.targetCustomer;
    
    // Auto-update title when products are identified
    if (aiResponse.data.products && Array.isArray(aiResponse.data.products) && aiResponse.data.products.length > 0) {
      const isGenericTitle = session.title.includes('Analysis ') || session.title.includes('New Analysis');
      if (isGenericTitle) {
        const productNames = aiResponse.data.products.slice(0, 3).join(' vs ');
        updateData.title = `${productNames} Analysis`;
      }
    }
    
    // Mark as completed if we reached final steps
    if (aiResponse.step === 'table_creation' || aiResponse.step === 'analysis') {
      updateData.status = 'completed';
    }
  }
  
  return updateData;
}
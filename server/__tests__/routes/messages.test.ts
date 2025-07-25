import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../../routes';
import { storage } from '../../storage';
import { testUtils } from '../setup';
import type { AnalysisSession, ChatMessage } from '@shared/schema';

describe('Chat Message Routes', () => {
  let app: express.Express;
  let server: any;
  let testSession: AnalysisSession;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
    
    // Create test user and session
    await testUtils.createTestUser();
    testSession = await testUtils.createTestSession();
  });

  describe('POST /api/analysis/sessions/:id/messages', () => {
    it('should create user message and AI response with basic content', async () => {
      const messageContent = 'Analyze Slack vs Microsoft Teams for enterprise teams';
      
      testUtils.mockAIResponse({
        message: 'I understand you want to analyze Slack vs Microsoft Teams.',
        step: 'discovery',
        progress: 25,
        data: null
      });

      const response = await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: messageContent })
        .expect(200);

      expect(response.body).toHaveProperty('userMessage');
      expect(response.body).toHaveProperty('aiMessage');
      expect(response.body.userMessage.content).toBe(messageContent);
      expect(response.body.userMessage.role).toBe('user');
      expect(response.body.aiMessage.role).toBe('assistant');
      expect(response.body.aiMessage.content).toBe('I understand you want to analyze Slack vs Microsoft Teams.');
    });

    it('should store user message with metadata when provided', async () => {
      const messageContent = 'Test message';
      const metadata = { source: 'manual', userAgent: 'test-browser' };
      
      testUtils.mockAIResponse({});

      const response = await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: messageContent, metadata })
        .expect(200);

      expect(response.body.userMessage.metadata).toEqual(metadata);
    });

    it('should handle missing metadata gracefully', async () => {
      const messageContent = 'Test message without metadata';
      
      testUtils.mockAIResponse({});

      const response = await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: messageContent })
        .expect(200);

      expect(response.body.userMessage.metadata).toBeNull();
    });

    it('should store AI response metadata correctly', async () => {
      const messageContent = 'Test message';
      const aiMetadata = { confidence: 0.95, model: 'gpt-4' };
      
      testUtils.mockAIResponse({
        step: 'research',
        progress: 50,
        data: { products: ['Slack', 'Teams'] },
        metadata: aiMetadata
      });

      const response = await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: messageContent })
        .expect(200);

      expect(response.body.aiMessage.metadata).toMatchObject({
        step: 'research',
        progress: 50,
        data: { products: ['Slack', 'Teams'] },
        confidence: 0.95,
        model: 'gpt-4'
      });
    });

    it('should update session step when AI response changes it', async () => {
      expect(testSession.currentStep).toBe('discovery');
      
      testUtils.mockAIResponse({
        step: 'research',
        progress: 40,
        data: null
      });

      const response = await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Move to research phase' })
        .expect(200);

      expect(response.body.sessionUpdate).toBeDefined();
      expect(response.body.sessionUpdate.currentStep).toBe('research');

      // Verify session was actually updated
      const updatedSession = await storage.getAnalysisSession(testSession.id);
      expect(updatedSession?.currentStep).toBe('research');
    });

    it('should update session with AI response data when provided', async () => {
      const aiData = {
        products: ['Slack', 'Microsoft Teams', 'Discord'],
        features: ['messaging', 'video calls', 'file sharing'],
        targetCustomer: 'Enterprise Teams'
      };

      testUtils.mockAIResponse({
        step: 'research',
        data: aiData
      });

      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Analyze these products' })
        .expect(200);

      const updatedSession = await storage.getAnalysisSession(testSession.id);
      expect(updatedSession?.products).toEqual(aiData.products);
      expect(updatedSession?.features).toEqual(aiData.features);
      expect(updatedSession?.targetCustomer).toBe(aiData.targetCustomer);
    });

    it('should auto-update session title when products are identified', async () => {
      // Create session with generic title
      const genericSession = await testUtils.createTestSession('test-user-123', {
        title: 'New Analysis Session'
      });

      testUtils.mockAIResponse({
        data: {
          products: ['Slack', 'Microsoft Teams', 'Discord']
        }
      });

      await request(app)
        .post(`/api/analysis/sessions/${genericSession.id}/messages`)
        .send({ content: 'Analyze these messaging tools' })
        .expect(200);

      const updatedSession = await storage.getAnalysisSession(genericSession.id);
      expect(updatedSession?.title).toBe('Slack vs Microsoft Teams vs Discord Analysis');
    });

    it('should not update title if it is not generic', async () => {
      const customSession = await testUtils.createTestSession('test-user-123', {
        title: 'My Custom Analysis Title'
      });

      testUtils.mockAIResponse({
        data: {
          products: ['Product A', 'Product B']
        }
      });

      await request(app)
        .post(`/api/analysis/sessions/${customSession.id}/messages`)
        .send({ content: 'Analyze these products' })
        .expect(200);

      const updatedSession = await storage.getAnalysisSession(customSession.id);
      expect(updatedSession?.title).toBe('My Custom Analysis Title');
    });

    it('should limit auto-generated title to first 3 products', async () => {
      const genericSession = await testUtils.createTestSession('test-user-123', {
        title: 'Analysis 123'
      });

      testUtils.mockAIResponse({
        data: {
          products: ['Product 1', 'Product 2', 'Product 3', 'Product 4', 'Product 5']
        }
      });

      await request(app)
        .post(`/api/analysis/sessions/${genericSession.id}/messages`)
        .send({ content: 'Analyze these five products' })
        .expect(200);

      const updatedSession = await storage.getAnalysisSession(genericSession.id);
      expect(updatedSession?.title).toBe('Product 1 vs Product 2 vs Product 3 Analysis');
    });

    it('should update session status to completed when reaching table_creation step', async () => {
      testUtils.mockAIResponse({
        step: 'table_creation',
        data: { tableData: { features: [], products: [], ratings: {} } }
      });

      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Create the analysis table' })
        .expect(200);

      const updatedSession = await storage.getAnalysisSession(testSession.id);
      expect(updatedSession?.status).toBe('completed');
    });

    it('should update session status to completed when reaching analysis step', async () => {
      testUtils.mockAIResponse({
        step: 'analysis',
        data: { analysis: 'Complete competitive analysis' }
      });

      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Provide final analysis' })
        .expect(200);

      const updatedSession = await storage.getAnalysisSession(testSession.id);
      expect(updatedSession?.status).toBe('completed');
    });

    it('should store AI metadata in chatHistory when provided', async () => {
      const aiMetadata = { 
        sources: ['https://example.com'],
        confidence: 0.88 
      };

      testUtils.mockAIResponse({
        metadata: aiMetadata,
        data: { products: ['Test Product'] }
      });

      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Test metadata storage' })
        .expect(200);

      const updatedSession = await storage.getAnalysisSession(testSession.id);
      expect(updatedSession?.chatHistory).toBeDefined();
      expect(updatedSession?.chatHistory).toHaveLength(1);
      expect(updatedSession?.chatHistory[0].metadata).toEqual(aiMetadata);
    });

    it('should return 404 when session does not exist', async () => {
      const response = await request(app)
        .post('/api/analysis/sessions/99999/messages')
        .send({ content: 'Test message' })
        .expect(404);

      expect(response.body.message).toBe('Session not found');
    });

    it('should return 403 when user does not own session', async () => {
      const otherSession = await testUtils.createTestSession('different-user');

      const response = await request(app)
        .post(`/api/analysis/sessions/${otherSession.id}/messages`)
        .send({ content: 'Unauthorized message' })
        .expect(403);

      expect(response.body.message).toBe('Access denied');
    });

    it('should include conversation history in AI processing', async () => {
      // Add some existing messages
      await testUtils.createTestMessage(testSession.id, {
        role: 'user',
        content: 'Previous user message'
      });
      await testUtils.createTestMessage(testSession.id, {
        role: 'assistant',
        content: 'Previous AI response'
      });

      const { processChatMessage } = require('../../openai');
      testUtils.mockAIResponse({});

      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'New message' })
        .expect(200);

      // Verify processChatMessage was called with conversation history
      expect(processChatMessage).toHaveBeenCalledWith(
        testSession.id,
        'New message',
        testSession.currentStep,
        expect.objectContaining({ id: testSession.id }),
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Previous user message' }),
          expect.objectContaining({ role: 'assistant', content: 'Previous AI response' })
        ])
      );
    });

    it('should handle AI processing errors gracefully', async () => {
      const { processChatMessage } = require('../../openai');
      vi.mocked(processChatMessage).mockRejectedValue(
        new Error('AI service unavailable')
      );

      const response = await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Test error handling' })
        .expect(500);

      expect(response.body.message).toBe('Failed to process message');
    });

    it('should handle database errors during message storage', async () => {
      vi.spyOn(storage, 'addChatMessage').mockRejectedValueOnce(
        new Error('Database storage failed')
      );

      const response = await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Test database error' })
        .expect(500);

      expect(response.body.message).toBe('Failed to process message');
    });

    it('should not update session when step and data are unchanged', async () => {
      testUtils.mockAIResponse({
        step: 'discovery', // Same as current step
        data: null // No new data
      });

      const response = await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'No changes expected' })
        .expect(200);

      expect(response.body.sessionUpdate).toBeNull();
    });

    it('should handle tableData updates correctly', async () => {
      const tableData = {
        products: ['Product A', 'Product B'],
        features: [
          { id: 'f1', name: 'Feature 1', category: 'must-have' },
          { id: 'f2', name: 'Feature 2', category: 'performance' }
        ],
        ratings: {
          'f1': { 'Product A': 'Yes', 'Product B': 'No' },
          'f2': { 'Product A': 'High', 'Product B': 'Medium' }
        }
      };

      testUtils.mockAIResponse({
        data: { tableData }
      });

      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Generate table data' })
        .expect(200);

      const updatedSession = await storage.getAnalysisSession(testSession.id);
      expect(updatedSession?.tableData).toEqual(tableData);
    });
  });

  describe('Message Processing Integration', () => {
    it('should maintain correct message ordering', async () => {
      testUtils.mockAIResponse({});

      // Send multiple messages
      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'First message' });

      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Second message' });

      const messages = await storage.getSessionChatMessages(testSession.id);
      
      // Should have 4 messages: user1, ai1, user2, ai2
      expect(messages).toHaveLength(4);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].content).toBe('Second message');
      expect(messages[3].role).toBe('assistant');
    });

    it('should preserve session state across multiple interactions', async () => {
      // First interaction - set products
      testUtils.mockAIResponse({
        step: 'research',
        data: { products: ['Product A', 'Product B'] }
      });

      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Set products' });

      // Second interaction - add features
      testUtils.mockAIResponse({
        step: 'categorization',
        data: { features: ['Feature 1', 'Feature 2'] }
      });

      await request(app)
        .post(`/api/analysis/sessions/${testSession.id}/messages`)
        .send({ content: 'Add features' });

      const finalSession = await storage.getAnalysisSession(testSession.id);
      expect(finalSession?.products).toEqual(['Product A', 'Product B']);
      expect(finalSession?.features).toEqual(['Feature 1', 'Feature 2']);
      expect(finalSession?.currentStep).toBe('categorization');
    });
  });
});
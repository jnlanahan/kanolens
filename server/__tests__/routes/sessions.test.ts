import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../../routes';
import { storage } from '../../storage';
import { testUtils } from '../setup';
import type { AnalysisSession } from '@shared/schema';

describe('Analysis Session Routes', () => {
  let app: express.Express;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
    
    // Create test user
    await testUtils.createTestUser();
  });

  describe('POST /api/analysis/sessions', () => {
    it('should create a new analysis session with valid data', async () => {
      const sessionData = {
        title: 'Test Analysis Session',
        products: ['Product A', 'Product B'],
        targetCustomer: 'Enterprise Teams'
      };

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(sessionData.title);
      expect(response.body.products).toEqual(sessionData.products);
      expect(response.body.targetCustomer).toBe(sessionData.targetCustomer);
      expect(response.body.userId).toBe('test-user-123');
      expect(response.body.status).toBe('active');
      expect(response.body.currentStep).toBe('discovery');
    });

    it('should set default values for optional fields', async () => {
      const sessionData = {
        title: 'Minimal Session',
        products: ['Product A'],
        targetCustomer: 'Users'
      };

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(200);

      expect(response.body.status).toBe('active');
      expect(response.body.currentStep).toBe('discovery');
      expect(response.body.features).toBeNull();
      expect(response.body.tableData).toBeNull();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/analysis/sessions')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Invalid session data');
      expect(response.body.errors).toBeDefined();
    });

    it('should validate products array is not empty', async () => {
      const sessionData = {
        title: 'Test Session',
        products: [],
        targetCustomer: 'Users'
      };

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(400);

      expect(response.body.message).toBe('Invalid session data');
    });

    it('should validate title is a string', async () => {
      const sessionData = {
        title: 123, // Invalid type
        products: ['Product A'],
        targetCustomer: 'Users'
      };

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(400);

      expect(response.body.message).toBe('Invalid session data');
    });

    it('should automatically assign authenticated user ID', async () => {
      const sessionData = {
        title: 'User ID Test',
        products: ['Product A'],
        targetCustomer: 'Users',
        userId: 'malicious-user-id' // This should be ignored
      };

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(200);

      expect(response.body.userId).toBe('test-user-123'); // From auth middleware
    });

    it('should handle database errors gracefully', async () => {
      const originalCreateSession = storage.createAnalysisSession;
      vi.spyOn(storage, 'createAnalysisSession').mockRejectedValue(
        new Error('Database connection failed')
      );

      const sessionData = {
        title: 'Error Test',
        products: ['Product A'],
        targetCustomer: 'Users'
      };

      const response = await request(app)
        .post('/api/analysis/sessions')
        .send(sessionData)
        .expect(500);

      expect(response.body.message).toBe('Failed to create analysis session');

      // Restore original method
      vi.mocked(storage.createAnalysisSession).mockRestore();
    });
  });

  describe('GET /api/analysis/sessions', () => {
    beforeEach(async () => {
      // Create multiple test sessions
      await testUtils.createTestSession('test-user-123', { title: 'Session 1' });
      await testUtils.createTestSession('test-user-123', { title: 'Session 2' });
      await testUtils.createTestSession('different-user', { title: 'Other User Session' });
    });

    it('should return all sessions for authenticated user', async () => {
      const response = await request(app)
        .get('/api/analysis/sessions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2); // Only user's sessions
      expect(response.body[0].title).toMatch(/Session [12]/);
      expect(response.body[1].title).toMatch(/Session [12]/);
    });

    it('should return empty array when user has no sessions', async () => {
      // Delete all sessions for test user
      const userSessions = await storage.getUserAnalysisSessions('test-user-123');
      for (const session of userSessions) {
        await storage.deleteAnalysisSession(session.id);
      }

      const response = await request(app)
        .get('/api/analysis/sessions')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(storage, 'getUserAnalysisSessions').mockRejectedValue(
        new Error('Database query failed')
      );

      const response = await request(app)
        .get('/api/analysis/sessions')
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch sessions');

      vi.mocked(storage.getUserAnalysisSessions).mockRestore();
    });
  });

  describe('GET /api/analysis/sessions/:id', () => {
    let testSession: AnalysisSession;

    beforeEach(async () => {
      testSession = await testUtils.createTestSession();
    });

    it('should return session when user owns it', async () => {
      const response = await request(app)
        .get(`/api/analysis/sessions/${testSession.id}`)
        .expect(200);

      expect(response.body.id).toBe(testSession.id);
      expect(response.body.title).toBe(testSession.title);
      expect(response.body.userId).toBe('test-user-123');
    });

    it('should return 404 when session does not exist', async () => {
      const response = await request(app)
        .get('/api/analysis/sessions/99999')
        .expect(404);

      expect(response.body.message).toBe('Session not found');
    });

    it('should return 403 when user does not own session', async () => {
      // Create session for different user
      const otherSession = await testUtils.createTestSession('different-user');

      const response = await request(app)
        .get(`/api/analysis/sessions/${otherSession.id}`)
        .expect(403);

      expect(response.body.message).toBe('Access denied');
    });

    it('should handle invalid session ID', async () => {
      const response = await request(app)
        .get('/api/analysis/sessions/invalid-id')
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch session');
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(storage, 'getAnalysisSession').mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get(`/api/analysis/sessions/${testSession.id}`)
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch session');

      vi.mocked(storage.getAnalysisSession).mockRestore();
    });
  });

  describe('PUT /api/analysis/sessions/:id', () => {
    let testSession: AnalysisSession;

    beforeEach(async () => {
      testSession = await testUtils.createTestSession();
    });

    it('should update session title when user owns it', async () => {
      const newTitle = 'Updated Session Title';

      const response = await request(app)
        .put(`/api/analysis/sessions/${testSession.id}`)
        .send({ title: newTitle })
        .expect(200);

      expect(response.body.message).toBe('Session updated successfully');

      // Verify the update
      const updatedSession = await storage.getAnalysisSession(testSession.id);
      expect(updatedSession?.title).toBe(newTitle);
    });

    it('should trim whitespace from title', async () => {
      const titleWithWhitespace = '  Spaced Title  ';

      await request(app)
        .put(`/api/analysis/sessions/${testSession.id}`)
        .send({ title: titleWithWhitespace })
        .expect(200);

      const updatedSession = await storage.getAnalysisSession(testSession.id);
      expect(updatedSession?.title).toBe('Spaced Title');
    });

    it('should validate title is required', async () => {
      const response = await request(app)
        .put(`/api/analysis/sessions/${testSession.id}`)
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Valid title is required');
    });

    it('should validate title is a string', async () => {
      const response = await request(app)
        .put(`/api/analysis/sessions/${testSession.id}`)
        .send({ title: 123 })
        .expect(400);

      expect(response.body.message).toBe('Valid title is required');
    });

    it('should reject empty string title', async () => {
      const response = await request(app)
        .put(`/api/analysis/sessions/${testSession.id}`)
        .send({ title: '' })
        .expect(400);

      expect(response.body.message).toBe('Valid title is required');
    });

    it('should return 404 when session does not exist', async () => {
      const response = await request(app)
        .put('/api/analysis/sessions/99999')
        .send({ title: 'New Title' })
        .expect(404);

      expect(response.body.message).toBe('Session not found');
    });

    it('should return 403 when user does not own session', async () => {
      const otherSession = await testUtils.createTestSession('different-user');

      const response = await request(app)
        .put(`/api/analysis/sessions/${otherSession.id}`)
        .send({ title: 'Hacker Title' })
        .expect(403);

      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('DELETE /api/analysis/sessions/:id', () => {
    let testSession: AnalysisSession;

    beforeEach(async () => {
      testSession = await testUtils.createTestSession();
    });

    it('should delete session when user owns it', async () => {
      const response = await request(app)
        .delete(`/api/analysis/sessions/${testSession.id}`)
        .expect(200);

      expect(response.body.message).toBe('Session deleted successfully');

      // Verify deletion
      const deletedSession = await storage.getAnalysisSession(testSession.id);
      expect(deletedSession).toBeUndefined();
    });

    it('should return 404 when session does not exist', async () => {
      const response = await request(app)
        .delete('/api/analysis/sessions/99999')
        .expect(404);

      expect(response.body.message).toBe('Session not found');
    });

    it('should return 403 when user does not own session', async () => {
      const otherSession = await testUtils.createTestSession('different-user');

      const response = await request(app)
        .delete(`/api/analysis/sessions/${otherSession.id}`)
        .expect(403);

      expect(response.body.message).toBe('Access denied');
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(storage, 'deleteAnalysisSession').mockRejectedValue(
        new Error('Delete failed')
      );

      const response = await request(app)
        .delete(`/api/analysis/sessions/${testSession.id}`)
        .expect(500);

      expect(response.body.message).toBe('Failed to delete session');

      vi.mocked(storage.deleteAnalysisSession).mockRestore();
    });
  });

  describe('DELETE /api/analysis/sessions (bulk delete)', () => {
    beforeEach(async () => {
      // Create multiple sessions for the user
      await testUtils.createTestSession('test-user-123', { title: 'Session 1' });
      await testUtils.createTestSession('test-user-123', { title: 'Session 2' });
      await testUtils.createTestSession('test-user-123', { title: 'Session 3' });
      await testUtils.createTestSession('different-user', { title: 'Other User Session' });
    });

    it('should delete all sessions for authenticated user', async () => {
      const response = await request(app)
        .delete('/api/analysis/sessions')
        .expect(200);

      expect(response.body.message).toBe('Deleted 3 sessions successfully');

      // Verify only user's sessions were deleted
      const remainingSessions = await storage.getUserAnalysisSessions('test-user-123');
      expect(remainingSessions).toHaveLength(0);

      // Other user's sessions should remain
      const otherUserSessions = await storage.getUserAnalysisSessions('different-user');
      expect(otherUserSessions).toHaveLength(1);
    });

    it('should handle case when user has no sessions', async () => {
      // Delete all sessions first
      const userSessions = await storage.getUserAnalysisSessions('test-user-123');
      for (const session of userSessions) {
        await storage.deleteAnalysisSession(session.id);
      }

      const response = await request(app)
        .delete('/api/analysis/sessions')
        .expect(200);

      expect(response.body.message).toBe('Deleted 0 sessions successfully');
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(storage, 'getUserAnalysisSessions').mockRejectedValue(
        new Error('Query failed')
      );

      const response = await request(app)
        .delete('/api/analysis/sessions')
        .expect(500);

      expect(response.body.message).toBe('Failed to delete sessions');

      vi.mocked(storage.getUserAnalysisSessions).mockRestore();
    });
  });

  describe('Session Authorization', () => {
    it('should consistently apply user ownership checks across all routes', async () => {
      const userSession = await testUtils.createTestSession('test-user-123');
      const otherSession = await testUtils.createTestSession('other-user');

      // GET - should allow own session, deny other's
      await request(app)
        .get(`/api/analysis/sessions/${userSession.id}`)
        .expect(200);
      
      await request(app)
        .get(`/api/analysis/sessions/${otherSession.id}`)
        .expect(403);

      // PUT - should allow own session, deny other's
      await request(app)
        .put(`/api/analysis/sessions/${userSession.id}`)
        .send({ title: 'Updated' })
        .expect(200);
      
      await request(app)
        .put(`/api/analysis/sessions/${otherSession.id}`)
        .send({ title: 'Hacked' })
        .expect(403);

      // DELETE - should allow own session, deny other's
      await request(app)
        .delete(`/api/analysis/sessions/${otherSession.id}`)
        .expect(403);
    });
  });
});
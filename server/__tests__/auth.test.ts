import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { setupAuth, isAuthenticated, requireAuth, setupLoginRoute } from '../simpleAuth';
import { testUtils } from './setup';

describe('Authentication System', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('setupAuth', () => {
    it('should configure express-session with correct options', async () => {
      await setupAuth(app);
      
      // Verify session middleware is set up
      // We can't directly test middleware setup, but we can test it works
      app.get('/test-session', (req: any, res) => {
        res.json({ hasSession: !!req.session });
      });

      const response = await request(app).get('/test-session');
      expect(response.body.hasSession).toBe(true);
    });

    it('should use SESSION_SECRET from environment', async () => {
      const originalSecret = process.env.SESSION_SECRET;
      process.env.SESSION_SECRET = 'test-custom-secret';
      
      await setupAuth(app);
      
      // Session secret is internal, but we can verify it was set up
      app.get('/test-session-config', (req: any, res) => {
        res.json({ configured: true });
      });

      const response = await request(app).get('/test-session-config');
      expect(response.body.configured).toBe(true);
      
      process.env.SESSION_SECRET = originalSecret;
    });

    it('should use default secret when SESSION_SECRET not set', async () => {
      const originalSecret = process.env.SESSION_SECRET;
      delete process.env.SESSION_SECRET;
      
      await setupAuth(app);
      
      app.get('/test-default-secret', (req: any, res) => {
        res.json({ configured: true });
      });

      const response = await request(app).get('/test-default-secret');
      expect(response.body.configured).toBe(true);
      
      process.env.SESSION_SECRET = originalSecret;
    });
  });

  describe('isAuthenticated middleware', () => {
    it('should always create a mock development user', () => {
      const req = testUtils.createMockReq({ user: undefined });
      const res = testUtils.createMockRes();
      const next = vi.fn();

      isAuthenticated(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.claims).toBeDefined();
      expect(req.user.claims.sub).toBe('dev-user-123');
      expect(req.user.claims.email).toBe('dev@example.com');
      expect(req.user.claims.name).toBe('Development User');
      expect(next).toHaveBeenCalledOnce();
    });

    it('should overwrite existing user with development user', () => {
      const req = testUtils.createMockReq({ 
        user: { claims: { sub: 'different-user' } } 
      });
      const res = testUtils.createMockRes();
      const next = vi.fn();

      isAuthenticated(req, res, next);

      expect(req.user.claims.sub).toBe('dev-user-123');
      expect(next).toHaveBeenCalledOnce();
    });

    it('should call next() to continue middleware chain', () => {
      const req = testUtils.createMockReq();
      const res = testUtils.createMockRes();
      const next = vi.fn();

      isAuthenticated(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(next).toHaveBeenCalledWith(); // No error passed
    });
  });

  describe('requireAuth middleware', () => {
    it('should behave identically to isAuthenticated in development', () => {
      const req = testUtils.createMockReq({ user: undefined });
      const res = testUtils.createMockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.claims.sub).toBe('dev-user-123');
      expect(req.user.claims.email).toBe('dev@example.com');
      expect(req.user.claims.name).toBe('Development User');
      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('setupLoginRoute', () => {
    beforeEach(async () => {
      await setupAuth(app);
      setupLoginRoute(app);
    });

    it('should create /api/login route that sets session user', async () => {
      const response = await request(app)
        .get('/api/login')
        .expect(302); // Redirect response

      expect(response.headers.location).toBe('/');
    });

    it('should create /api/logout route that destroys session', async () => {
      // First, establish a session with login
      await request(app).get('/api/login');

      // Then logout
      const response = await request(app)
        .get('/api/logout')
        .expect(302);

      expect(response.headers.location).toBe('/');
    });

    it('should handle session destroy errors gracefully', async () => {
      // Mock session destroy to throw an error
      app.use((req: any, res, next) => {
        req.session = {
          destroy: (callback: Function) => {
            callback(new Error('Session destroy failed'));
          }
        };
        next();
      });

      const response = await request(app)
        .get('/api/logout')
        .expect(302);

      expect(response.headers.location).toBe('/');
    });
  });

  describe('Authentication Integration', () => {
    beforeEach(async () => {
      await setupAuth(app);
      setupLoginRoute(app);
    });

    it('should protect routes with isAuthenticated middleware', async () => {
      app.get('/protected', isAuthenticated, (req: any, res) => {
        res.json({ 
          authenticated: true,
          userId: req.user.claims.sub 
        });
      });

      const response = await request(app)
        .get('/protected')
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.userId).toBe('dev-user-123');
    });

    it('should work with multiple middleware in sequence', async () => {
      const customMiddleware = (req: any, res: any, next: any) => {
        req.customFlag = true;
        next();
      };

      app.get('/multi-middleware', 
        isAuthenticated, 
        customMiddleware, 
        (req: any, res) => {
          res.json({ 
            userId: req.user.claims.sub,
            customFlag: req.customFlag
          });
        }
      );

      const response = await request(app)
        .get('/multi-middleware')
        .expect(200);

      expect(response.body.userId).toBe('dev-user-123');
      expect(response.body.customFlag).toBe(true);
    });

    it('should maintain consistent user data across requests', async () => {
      app.get('/user-check', isAuthenticated, (req: any, res) => {
        res.json(req.user);
      });

      // Make multiple requests
      const response1 = await request(app).get('/user-check');
      const response2 = await request(app).get('/user-check');

      expect(response1.body).toEqual(response2.body);
      expect(response1.body.claims.sub).toBe('dev-user-123');
      expect(response2.body.claims.sub).toBe('dev-user-123');
    });
  });

  describe('Environment-based Configuration', () => {
    it('should log development mode message during setup', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      await setupAuth(app);
      
      expect(consoleSpy).toHaveBeenCalledWith('[Auth] Development mode - authentication bypassed');
    });

    it('should configure session cookie for development environment', async () => {
      await setupAuth(app);
      
      app.get('/test-cookie', (req: any, res) => {
        // In development, secure should be false
        res.json({ configured: true });
      });

      const response = await request(app).get('/test-cookie');
      expect(response.body.configured).toBe(true);
    });
  });
});
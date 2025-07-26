import request from 'supertest';
import { app } from '../index';
import { storage } from '../storage';
import { generateToken } from '../services/auth-service';

describe('Authentication End-to-End Tests', () => {
  const testUser = {
    email: 'e2e-test@example.com',
    password: 'TestPassword123!',
    name: 'E2E Test User'
  };

  const adminUser = {
    email: 'jnlanahan@gmail.com',
    password: 'AdminPassword123!',
    name: 'Admin User'
  };

  beforeEach(async () => {
    // Clean up test users
    try {
      const existingUser = await storage.getUserByEmail(testUser.email);
      if (existingUser) {
        // Clean up user data if exists
      }
    } catch (error) {
      // User doesn't exist, which is fine
    }

    try {
      const existingAdmin = await storage.getUserByEmail(adminUser.email);
      if (existingAdmin) {
        // Clean up admin data if exists
      }
    } catch (error) {
      // Admin doesn't exist, which is fine
    }
  });

  describe('Complete Registration → Login → Protected Route Flow', () => {
    it('should complete full authentication workflow for regular user', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        user: {
          email: testUser.email,
          name: testUser.name,
          isAdmin: false
        }
      });

      expect(registerResponse.body.token).toBeDefined();
      const registrationToken = registerResponse.body.token;

      // Step 2: Login with registered credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(loginResponse.body).toMatchObject({
        success: true,
        message: 'Login successful',
        user: {
          email: testUser.email,
          name: testUser.name,
          isAdmin: false
        }
      });

      expect(loginResponse.body.token).toBeDefined();
      const loginToken = loginResponse.body.token;

      // Step 3: Access protected route with token
      const protectedResponse = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(Array.isArray(protectedResponse.body)).toBe(true);

      // Step 4: Verify analysis limits for regular user
      const user = await storage.getUserByEmail(testUser.email);
      expect(user).toBeDefined();
      
      if (user) {
        const limits = await storage.getUserAnalysisLimit(user.id);
        expect(limits).toMatchObject({
          current: 0,
          max: 1,
          canCreateNew: true
        });
      }

      // Step 5: Test protected route without token (should fail)
      await request(app)
        .get('/api/sessions')
        .expect(401);

      // Step 6: Test protected route with invalid token (should fail)
      await request(app)
        .get('/api/sessions')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should complete full authentication workflow for admin user', async () => {
      // Step 1: Register admin user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(adminUser)
        .expect(201);

      expect(registerResponse.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        user: {
          email: adminUser.email,
          name: adminUser.name,
          isAdmin: true
        }
      });

      // Step 2: Login as admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: adminUser.password
        })
        .expect(200);

      expect(loginResponse.body.user.isAdmin).toBe(true);
      const adminToken = loginResponse.body.token;

      // Step 3: Verify unlimited analysis limits for admin
      const admin = await storage.getUserByEmail(adminUser.email);
      expect(admin).toBeDefined();
      
      if (admin) {
        const limits = await storage.getUserAnalysisLimit(admin.id);
        expect(limits).toMatchObject({
          current: 0,
          max: -1, // -1 means unlimited
          canCreateNew: true
        });
      }

      // Step 4: Access protected route as admin
      const protectedResponse = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(protectedResponse.body)).toBe(true);
    });
  });

  describe('Token Expiry and Refresh Flow', () => {
    it('should handle expired tokens correctly', async () => {
      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Get user to generate expired token
      const user = await storage.getUserByEmail(testUser.email);
      expect(user).toBeDefined();

      if (user) {
        // Generate token with very short expiry (1 second)
        const expiredToken = generateToken(user.id, user.email, '1s');

        // Wait for token to expire
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Try to access protected route with expired token
        await request(app)
          .get('/api/sessions')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);
      }
    });
  });

  describe('Cross-Service Integration', () => {
    it('should integrate authentication with analysis creation', async () => {
      // Register and login user
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const token = loginResponse.body.token;

      // Try to create analysis session (should work within limits)
      const analysisResponse = await request(app)
        .post('/api/analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'E2E Test Analysis',
          description: 'Testing analysis creation with authentication'
        })
        .expect(201);

      expect(analysisResponse.body.session).toBeDefined();
      expect(analysisResponse.body.session.title).toBe('E2E Test Analysis');

      // Verify user's analysis count increased
      const user = await storage.getUserByEmail(testUser.email);
      if (user) {
        const limits = await storage.getUserAnalysisLimit(user.id);
        expect(limits.current).toBe(1);
        expect(limits.canCreateNew).toBe(false); // Should be at limit
      }

      // Try to create another analysis (should fail due to limits)
      await request(app)
        .post('/api/analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Second Analysis',
          description: 'This should fail'
        })
        .expect(403);
    });

    it('should allow unlimited analyses for admin user', async () => {
      // Register and login admin
      await request(app)
        .post('/api/auth/register')
        .send(adminUser)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: adminUser.password
        })
        .expect(200);

      const adminToken = loginResponse.body.token;

      // Create multiple analyses as admin (should all succeed)
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/analysis')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: `Admin Analysis ${i}`,
            description: `Admin can create unlimited analyses`
          })
          .expect(201);
      }

      // Verify admin still has unlimited access
      const admin = await storage.getUserByEmail(adminUser.email);
      if (admin) {
        const limits = await storage.getUserAnalysisLimit(admin.id);
        expect(limits.max).toBe(-1);
        expect(limits.canCreateNew).toBe(true);
      }
    });
  });

  describe('Error Handling and Security', () => {
    it('should prevent duplicate registrations', async () => {
      // Register user first time
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Try to register same user again
      const duplicateResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(duplicateResponse.body.error).toContain('already exists');
    });

    it('should handle invalid login credentials', async () => {
      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Try login with wrong password
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      // Try login with non-existent email
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);
    });

    it('should validate required fields in registration', async () => {
      // Missing email
      await request(app)
        .post('/api/auth/register')
        .send({
          password: testUser.password,
          name: testUser.name
        })
        .expect(400);

      // Missing password
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          name: testUser.name
        })
        .expect(400);

      // Missing name
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(400);
    });

    it('should handle malformed tokens', async () => {
      const malformedTokens = [
        'Bearer', // No token after Bearer
        'InvalidBearer token', // Wrong prefix
        'Bearer token.with.only.three.parts', // Malformed JWT
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature' // Invalid signature
      ];

      for (const token of malformedTokens) {
        await request(app)
          .get('/api/sessions')
          .set('Authorization', token)
          .expect(401);
      }
    });
  });

  describe('Session Management', () => {
    it('should maintain user context across multiple requests', async () => {
      // Register and login
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const token = loginResponse.body.token;

      // Create analysis
      const analysisResponse = await request(app)
        .post('/api/analysis')  
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Session Test Analysis',
          description: 'Testing session management'
        })
        .expect(201);

      const sessionId = analysisResponse.body.session.id;

      // Access the created analysis in subsequent request
      const getResponse = await request(app)
        .get(`/api/analysis/${sessionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(getResponse.body.title).toBe('Session Test Analysis');

      // Add a message to the analysis
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: sessionId,
          content: 'Test message',
          role: 'user'
        })
        .expect(201);

      // Retrieve messages
      const messagesResponse = await request(app)
        .get(`/api/messages/${sessionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(messagesResponse.body.length).toBe(1);
      expect(messagesResponse.body[0].content).toBe('Test message');
    });
  });
});
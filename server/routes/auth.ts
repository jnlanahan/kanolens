// Authentication routes
import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { jwtAuthMiddleware } from "../middleware/jwt-auth";
import { testOpenAIConnection } from "../openai";
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  validateEmail, 
  validatePasswordStrength 
} from "../services/auth-service";

// Rate limiting configurations
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts, please try again in 15 minutes',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts, please try again in 15 minutes',
      retryAfter: 15 * 60
    });
  }
});

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow more login attempts than registration
  message: {
    error: 'Too many login attempts, please try again in 15 minutes',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts, please try again in 15 minutes',
      retryAfter: 15 * 60
    });
  }
});

const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit registration attempts more strictly
  message: {
    error: 'Too many registration attempts, please try again in 1 hour',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many registration attempts, please try again in 1 hour',
      retryAfter: 60 * 60
    });
  }
});

export function setupAuthRoutes(app: Express): void {
  // User registration
  app.post('/api/auth/register', registrationRateLimit, async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Validate email format
      if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Check if this is the admin email for unlimited access
      const isAdmin = email.toLowerCase() === 'jnlanahan@gmail.com';

      // Create user
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        authProvider: 'email',
        emailVerified: false,
        firstName,
        lastName,
        maxAnalyses: isAdmin ? -1 : 1 // -1 means unlimited for admin
      });

      // Generate JWT token
      const token = generateToken(newUser.id);

      // Return user (without password) and token
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          ...userWithoutPassword,
          isAdmin
        },
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Failed to create user account' });
    }
  });

  // User login
  app.post('/api/auth/login', loginRateLimit, async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Validate email format
      if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check if user has a password (email auth vs OAuth)
      if (!user.password) {
        return res.status(401).json({ message: 'Please sign in with Google' });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });

      // Generate JWT token
      const token = generateToken(user.id);

      // Check if user is admin
      const isAdmin = user.email?.toLowerCase() === 'jnlanahan@gmail.com';

      // Return user (without password) and token
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          ...userWithoutPassword,
          isAdmin
        },
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Google OAuth authentication
  app.post('/api/auth/google', authRateLimit, async (req, res) => {
    try {
      const { googleUser } = req.body;

      // Validate Google user data
      if (!googleUser) {
        return res.status(400).json({ message: 'Google user data is required' });
      }

      const { id, email, name, given_name, family_name, picture } = googleUser;
      
      if (!id || !email || !name) {
        return res.status(400).json({ message: 'Invalid Google user data: missing required fields' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // If user exists but with email auth provider, prevent sign-in
        if (existingUser.authProvider === 'email') {
          return res.status(400).json({ 
            message: 'An account with this email already exists. Please sign in with your email and password.' 
          });
        }

        // Update existing Google user (profile picture, last login)
        const updatedUser = await storage.updateUser(existingUser.id, {
          lastLogin: new Date(),
          profileImageUrl: picture
        });

        // Generate JWT token
        const token = generateToken(existingUser.id);

        // Check if user is admin
        const isAdminExisting = existingUser.email?.toLowerCase() === 'jnlanahan@gmail.com';

        // Return user and token
        const { password: _, ...userWithoutPassword } = updatedUser;
        return res.json({
          success: true,
          message: 'Google login successful',
          user: {
            ...userWithoutPassword,
            isAdmin: isAdminExisting
          },
          token
        });
      }

      // Create new Google user
      // Check if this is the admin email for unlimited access
      const isAdmin = email.toLowerCase() === 'jnlanahan@gmail.com';
      
      const newUser = await storage.createUser({
        email,
        authProvider: 'google',
        emailVerified: true, // Google emails are pre-verified
        firstName: given_name || name.split(' ')[0] || 'User',
        lastName: family_name || name.split(' ').slice(1).join(' ') || '',
        profileImageUrl: picture,
        maxAnalyses: isAdmin ? -1 : 1 // -1 means unlimited for admin
      });

      // Generate JWT token
      const token = generateToken(newUser.id);

      // Return user (without password) and token
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        success: true,
        message: 'Google registration successful',
        user: {
          ...userWithoutPassword,
          isAdmin
        },
        token
      });

    } catch (error) {
      console.error('Google OAuth error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // User logout
  app.post('/api/auth/logout', (req, res) => {
    // For JWT-based auth, logout is handled client-side by removing the token
    // We could implement token blacklisting here if needed
    res.json({ message: 'Logged out successfully' });
  });

  // Get current authenticated user
  app.get('/api/auth/user', jwtAuthMiddleware, async (req: any, res) => {
    try {
      // JWT middleware already adds the user to req.user (without password)
      // Add isAdmin field to response
      const isAdmin = req.user.email?.toLowerCase() === 'jnlanahan@gmail.com';
      res.json({
        ...req.user,
        isAdmin
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Development authentication endpoint - auto-login for development
  app.post('/api/auth/dev', async (req, res) => {
    try {
      // Check if user exists
      let user = await storage.getUserByEmail('jnlanahan@gmail.com');
      
      if (!user) {
        // Create development user
        user = await storage.createUser({
          email: 'jnlanahan@gmail.com',
          authProvider: 'dev',
          emailVerified: true,
          firstName: 'Development',
          lastName: 'User',
          maxAnalyses: -1 // Unlimited for development
        });
      }

      // Generate JWT token
      const token = generateToken(user.id);

      // Return user (without password) and token
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        message: 'Development login successful',
        user: {
          ...userWithoutPassword,
          isAdmin: true
        },
        token
      });

    } catch (error) {
      console.error('Development auth error:', error);
      res.status(500).json({ message: 'Development authentication failed' });
    }
  });

  // OpenAI connection test
  app.get('/api/openai/test', jwtAuthMiddleware, async (req, res) => {
    try {
      const isConnected = await testOpenAIConnection();
      res.json({ 
        connected: isConnected, 
        message: isConnected ? "OpenAI connection successful" : "OpenAI connection failed" 
      });
    } catch (error) {
      console.error("OpenAI test error:", error);
      res.status(500).json({ 
        connected: false, 
        message: "OpenAI connection test failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
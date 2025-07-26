import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";

// Simple development authentication bypass
// TODO: Replace with proper authentication for production

export async function setupAuth(app: Express) {
  // Basic session setup for development
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  console.log('[Auth] Development mode - authentication bypassed');
}

export function isAuthenticated(req: any, res: Response, next: NextFunction) {
  // For development, create a mock user
  // In production, this would check actual auth tokens
  req.user = {
    claims: {
      sub: 'dev-user-123',
      email: 'jnlanahan@gmail.com', // Use the unlimited user email for development
      name: 'Development User'
    }
  };
  
  next();
}

export function requireAuth(req: any, res: Response, next: NextFunction) {
  // Same as isAuthenticated for development
  isAuthenticated(req, res, next);
}

// Add login route for development
export function setupLoginRoute(app: any) {
  app.get('/api/login', (req: any, res: Response) => {
    // In development, automatically "log in" the user
    req.session.user = {
      id: 'dev-user-123',
      email: 'jnlanahan@gmail.com',
      name: 'Development User'
    };
    
    console.log('[Auth] Development login - redirecting to app');
    res.redirect('/');
  });

  app.get('/api/logout', (req: any, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.redirect('/');
    });
  });
}
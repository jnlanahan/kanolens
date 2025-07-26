# Authentication System Documentation

## Overview

This document provides comprehensive information about the authentication system implemented in the Kanolens application. The system supports both email/password authentication and Google OAuth, with JWT tokens for session management.

## Table of Contents

1. [Authentication Methods](#authentication-methods)
2. [API Endpoints](#api-endpoints)
3. [Rate Limiting](#rate-limiting)
4. [Password Requirements](#password-requirements)
5. [Admin Privileges](#admin-privileges)
6. [JWT Token Management](#jwt-token-management)
7. [Security Features](#security-features)
8. [Error Handling](#error-handling)
9. [Testing](#testing)

## Authentication Methods

### 1. Email/Password Authentication
- Users can register with email, password, first name, and last name
- Passwords are hashed using bcrypt with 12 salt rounds
- Email verification is optional (currently set to false by default)

### 2. Google OAuth
- Users can authenticate using their Google account
- Google emails are automatically marked as verified
- Profile pictures are stored from Google profile data

## API Endpoints

### POST /api/auth/register
Register a new user with email/password.

**Rate Limit:** 3 requests per hour per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user-1234567890-abc123def",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "authProvider": "email",
    "emailVerified": false,
    "maxAnalyses": 1,
    "analysisCount": 0,
    "isAdmin": false,
    "createdAt": "2025-07-25T12:00:00.000Z",
    "updatedAt": "2025-07-25T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400`: Missing required fields or invalid data
- `409`: Email already registered
- `429`: Too many registration attempts

### POST /api/auth/login
Login with email/password.

**Rate Limit:** 10 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user-1234567890-abc123def",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "authProvider": "email",
    "emailVerified": false,
    "maxAnalyses": 1,
    "analysisCount": 0,
    "isAdmin": false,
    "lastLogin": "2025-07-25T12:00:00.000Z",
    "createdAt": "2025-07-25T12:00:00.000Z",
    "updatedAt": "2025-07-25T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400`: Missing email or password
- `401`: Invalid credentials or user should use Google sign-in
- `429`: Too many login attempts

### POST /api/auth/google
Authenticate with Google OAuth.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "googleUser": {
    "id": "google-user-id",
    "email": "user@gmail.com",
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

**Success Response (200 for existing user, 201 for new user):**
```json
{
  "success": true,
  "message": "Google login successful",
  "user": {
    "id": "user-1234567890-abc123def",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "authProvider": "google",
    "emailVerified": true,
    "profileImageUrl": "https://lh3.googleusercontent.com/...",
    "maxAnalyses": 1,
    "analysisCount": 0,
    "isAdmin": false,
    "lastLogin": "2025-07-25T12:00:00.000Z",
    "createdAt": "2025-07-25T12:00:00.000Z",
    "updatedAt": "2025-07-25T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400`: Invalid Google user data or account exists with email auth
- `429`: Too many authentication attempts

### POST /api/auth/logout
Logout the current user.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

*Note: JWT logout is handled client-side by removing the token.*

### GET /api/auth/user
Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "id": "user-1234567890-abc123def",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "authProvider": "email",
  "emailVerified": false,
  "maxAnalyses": 1,
  "analysisCount": 0,
  "isAdmin": false,
  "lastLogin": "2025-07-25T12:00:00.000Z",
  "createdAt": "2025-07-25T12:00:00.000Z",
  "updatedAt": "2025-07-25T12:00:00.000Z"
}
```

**Error Responses:**
- `401`: Invalid or expired token
- `500`: Server error

## Rate Limiting

The authentication system implements rate limiting to prevent abuse:

### Registration Rate Limits
- **Limit:** 3 requests per hour per IP address
- **Purpose:** Prevent spam account creation
- **Response:** 429 Too Many Requests with 1-hour retry-after

### Login Rate Limits
- **Limit:** 10 requests per 15 minutes per IP address
- **Purpose:** Prevent brute force attacks
- **Response:** 429 Too Many Requests with 15-minute retry-after

### Google OAuth Rate Limits
- **Limit:** 5 requests per 15 minutes per IP address
- **Purpose:** Prevent OAuth abuse
- **Response:** 429 Too Many Requests with 15-minute retry-after

### Rate Limit Headers
All rate-limited endpoints return standard rate limit headers:
- `RateLimit-Limit`: Request limit per window
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when the rate limit window resets

## Password Requirements

Passwords must meet the following security requirements:

### Basic Requirements
- **Minimum Length:** 8 characters
- **Maximum Length:** 128 characters
- **Uppercase:** At least one uppercase letter (A-Z)
- **Lowercase:** At least one lowercase letter (a-z)
- **Numbers:** At least one digit (0-9)
- **Special Characters:** At least one special character (!@#$%^&*()_+-=[]{}|;':",./<>?~`)

### Security Validations
- **Common Patterns:** Rejects common weak passwords (password, 123456, qwerty, etc.)
- **Repeated Characters:** Cannot contain more than 3 consecutive identical characters
- **Sequential Patterns:** Cannot contain common sequences (123456, abcdef, qwerty, etc.)

### Password Validation Response
```json
{
  "isValid": false,
  "errors": [
    "Password must be at least 8 characters long",
    "Password must contain at least one uppercase letter",
    "Password contains common weak patterns and is not secure"
  ]
}
```

## Admin Privileges

The system includes special admin privileges for the email `jnlanahan@gmail.com`.

### Admin Features
- **Unlimited Analyses:** Admin users have no limit on analysis creation (`maxAnalyses: -1`)
- **Always Can Create:** Admin users can always create new analyses regardless of current count
- **Admin Flag:** User responses include `isAdmin: true` for admin users

### Admin Detection
Admin status is determined by email address:
```javascript
const isAdmin = user.email?.toLowerCase() === 'jnlanahan@gmail.com';
```

### Admin Analysis Limits
```json
{
  "current": 50,
  "max": -1,
  "canCreateNew": true
}
```

## JWT Token Management

### Token Generation
- **Algorithm:** HS256 (HMAC with SHA-256)
- **Expiration:** 24 hours
- **Issuer:** kanolens
- **Subject:** User ID

### Token Structure
```json
{
  "userId": "user-1234567890-abc123def",
  "type": "access",
  "iat": 1640995200,
  "exp": 1641081600,
  "iss": "kanolens",
  "sub": "user-1234567890-abc123def"
}
```

### Token Usage
Include the JWT token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Validation
- **Invalid Token:** Returns 401 with "Invalid token" message
- **Expired Token:** Returns 401 with "Token expired" message
- **Missing Token:** Returns 401 with "No token provided" message

## Security Features

### Password Security
- **Hashing:** bcrypt with 12 salt rounds
- **Salt Generation:** Unique salt for each password
- **Timing Attacks:** Constant-time comparison for password verification

### Token Security
- **Secret Key:** Configurable via `JWT_SECRET` environment variable
- **Expiration:** Automatic token expiration (24 hours)
- **Issuer Verification:** Tokens must be issued by "kanolens"

### Rate Limiting
- **IP-based:** Limits per IP address to prevent abuse
- **Different Limits:** Stricter limits for registration vs. login
- **Retry Information:** Clear retry-after headers

### Input Validation
- **Email Format:** RFC-compliant email validation
- **Password Strength:** Comprehensive password requirements
- **Required Fields:** Validation of all required registration fields

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "message": "User-friendly message",
  "errors": ["Detailed error 1", "Detailed error 2"],
  "retryAfter": 900
}
```

### Common Error Codes
- **400 Bad Request:** Invalid input data or missing required fields
- **401 Unauthorized:** Invalid credentials or expired/invalid token
- **409 Conflict:** Resource already exists (e.g., email already registered)
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Server-side error

### Error Messages
- User-friendly messages for client display
- Detailed error arrays for validation failures
- Retry-after information for rate-limited requests

## Testing

### Test Coverage
The authentication system includes comprehensive tests:

1. **Unit Tests:**
   - Password hashing/verification
   - JWT token generation/validation
   - Email validation
   - Password strength validation

2. **Integration Tests:**
   - Registration flow
   - Login flow
   - Google OAuth flow
   - JWT middleware
   - Admin privileges

3. **End-to-End Tests:**
   - Complete authentication workflows
   - Cross-service integration
   - Error handling scenarios
   - Rate limiting behavior

### Running Tests
```bash
# Run all authentication tests
npm run test:backend

# Run specific test files
npx vitest run server/__tests__/admin-privileges.test.ts --config vitest.backend.config.ts
npx vitest run server/__tests__/auth-e2e.test.ts --config vitest.backend.config.ts
```

### Test Environment
- **Test Database:** Isolated test database for safety
- **Mocked Services:** External services mocked for reliability
- **Clean State:** Tests clean up after themselves

## Environment Variables

### Required Variables
```env
JWT_SECRET=your-secret-key-here
```

### Optional Variables
```env
NODE_ENV=development
```

### Production Considerations
- Use a strong, unique JWT secret in production
- Consider token rotation strategies
- Implement proper logging and monitoring
- Regular security audits of authentication flows

## Migration Guide

If migrating from the previous simple authentication system:

1. **Database Updates:** User table includes new fields (password, authProvider, emailVerified)
2. **JWT Tokens:** Replace session-based auth with JWT tokens
3. **Rate Limiting:** New rate limiting requires client-side retry logic
4. **Password Validation:** Stronger password requirements may require user password updates
5. **Admin Detection:** Admin privileges now based on email rather than separate admin table

## Support

For questions or issues with the authentication system:

1. Check the test files for usage examples
2. Review error messages for specific guidance
3. Consult the API reference section above
4. Check rate limit headers if receiving 429 responses
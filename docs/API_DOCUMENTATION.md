# KanoLens API Documentation

## Overview

KanoLens provides a comprehensive REST API for competitive analysis using AI agents. This document covers all available endpoints with examples and integration patterns.

## Base URL

```
Production: https://your-kanolens-domain.com/api
Development: http://localhost:3001/api
```

## Authentication

KanoLens uses simple session-based authentication for development and testing.

### Get Current User
```http
GET /api/auth/user
```

**Response:**
```json
{
  "id": "41771399",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Status Codes:**
- `200`: User authenticated
- `401`: Not authenticated

### Test OpenAI Connection
```http
GET /api/test-openai
```

**Response:**
```json
{
  "status": "success",
  "message": "OpenAI connection successful",
  "model": "gpt-4o-mini"
}
```

## Session Management

### Create Analysis Session
```http
POST /api/analysis/sessions
```

**Request Body:**
```json
{
  "description": "AI photo editing tools for social media creators",
  "products": "Canva, Adobe Express, Figma",
  "targetCustomers": "small business owners, students, freelancers",
  "features": "pricing, templates, collaboration, export options"
}
```

**Response:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "created",
  "timestamp": "2025-07-24T18:44:00Z"
}
```

### Get User Sessions
```http
GET /api/analysis/sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "description": "AI photo editing tools",
      "createdAt": "2025-07-24T18:44:00Z",
      "status": "completed"
    }
  ]
}
```

### Get Session Details
```http
GET /api/analysis/sessions/{sessionId}
```

**Response:**
```json
{
  "session": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "description": "AI photo editing tools",
    "products": ["Canva", "Adobe Express", "Figma"],
    "targetCustomers": "small business owners, students, freelancers",
    "features": "pricing, templates, collaboration",
    "status": "completed",
    "createdAt": "2025-07-24T18:44:00Z"
  }
}
```

### Delete Session
```http
DELETE /api/analysis/sessions/{sessionId}
```

**Response:**
```json
{
  "status": "success",
  "message": "Session deleted successfully"
}
```

## Chat & Messaging

### Send Chat Message
```http
POST /api/analysis/sessions/{sessionId}/messages
```

**Request Body:**
```json
{
  "message": "Can you analyze the pricing strategies?",
  "metadata": {
    "step": "analysis",
    "timestamp": "2025-07-24T18:44:00Z"
  }
}
```

**Response:**
```json
{
  "response": "I'll analyze the pricing strategies for Canva, Adobe Express, and Figma...",
  "suggestions": [
    {
      "product": "Canva",
      "category": "Design Tools",
      "pricing": "Freemium"
    }
  ]
}
```

### Get Session Messages
```http
GET /api/analysis/sessions/{sessionId}/messages
```

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-001",
      "message": "Can you analyze the pricing strategies?",
      "response": "I'll analyze the pricing strategies...",
      "timestamp": "2025-07-24T18:44:00Z"
    }
  ]
}
```

## Analysis & Research

### Generate AI Suggestions
```http
POST /api/chat/suggestions
```

**Request Body:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "products": "Canva, Adobe Express, Figma",
  "targetCustomers": "small business owners",
  "features": "pricing, templates"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "product": "Canva",
      "category": "Design Tools",
      "targetAudience": "Small businesses",
      "keyFeatures": ["Templates", "Collaboration"]
    }
  ]
}
```

### Start Analysis Research
```http
POST /api/analysis/research
```

**Request Body:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "suggestions": [
    {
      "product": "Canva",
      "category": "Design Tools"
    }
  ]
}
```

**Response:**
```json
{
  "status": "started",
  "researchId": "research-001",
  "message": "Research started for 3 products"
}
```

### Generate Kano Table
```http
POST /api/analysis/table
```

**Request Body:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "products": ["Canva", "Adobe Express", "Figma"]
}
```

**Response:**
```json
{
  "table": {
    "products": ["Canva", "Adobe Express", "Figma"],
    "features": [
      {
        "name": "Templates",
        "category": "Basic",
        "ratings": [5, 4, 3]
      }
    ]
  }
}
```

### Start Full Analysis (Orchestrator)
```http
POST /api/analysis/start
```

**Request Body:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "products": ["Canva", "Adobe Express"],
  "features": ["pricing", "templates"]
}
```

**Response:**
```json
{
  "status": "started",
  "analysisId": "analysis-001",
  "agents": ["researcher", "validator", "analyst", "evaluator"],
  "estimatedTime": "5-10 minutes"
}
```

## Export & Sharing

### Export PDF
```http
POST /api/export/pdf
```

**Request Body:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Competitive Analysis Report",
  "includeCharts": true
}
```

**Response:**
```json
{
  "downloadUrl": "/api/export/download/report-001.pdf",
  "fileSize": "2.5MB",
  "status": "ready"
}
```

### Export PowerPoint
```http
POST /api/export/powerpoint
```

**Request Body:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Competitive Analysis Presentation"
}
```

**Response:**
```json
{
  "downloadUrl": "/api/export/download/presentation-001.pptx",
  "fileSize": "5.1MB",
  "status": "ready"
}
```

### Share Analysis
```http
POST /api/export/share
```

**Request Body:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "shareType": "public",
  "expiresIn": "7d"
}
```

**Response:**
```json
{
  "shareUrl": "https://kanolens.com/shared/abc123",
  "expiresAt": "2025-07-31T18:44:00Z",
  "accessType": "public"
}
```

## Health & Monitoring

### Basic Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-24T18:44:00Z",
  "uptime": 3600
}
```

### Full Health Check
```http
GET /api/health/full
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-24T18:44:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "pass",
      "duration": 25.5,
      "message": "Database connection successful"
    },
    "websocket": {
      "status": "pass",
      "duration": 5.2,
      "message": "WebSocket service operational"
    }
  }
}
```

### System Metrics
```http
GET /api/health/metrics
```

**Response:**
```json
{
  "memory": {
    "heapUsed": "45.2 MB",
    "heapTotal": "67.8 MB"
  },
  "uptime": 3600,
  "activeConnections": 12,
  "totalRequests": 1543
}
```

## Error Handling

All API endpoints follow consistent error response patterns:

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Products field is required",
    "details": {
      "field": "products",
      "required": true
    }
  },
  "timestamp": "2025-07-24T18:44:00Z"
}
```

### Common Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Unprocessable Entity
- `500`: Internal Server Error
- `503`: Service Unavailable

## Rate Limiting

- **General API**: 100 requests per minute per IP
- **AI Endpoints**: 10 requests per minute per user
- **Export Endpoints**: 5 exports per hour per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642780800
```

## WebSocket API

### Real-time Analysis Progress

Connect to WebSocket endpoint for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

// Subscribe to session updates
ws.send(JSON.stringify({
  type: 'subscribe',
  sessionId: '123e4567-e89b-12d3-a456-426614174000'
}));

// Receive progress updates
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Progress:', update.progress);
};
```

### WebSocket Message Types

1. **Progress Updates**
```json
{
  "type": "progress",
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "agent": "researcher",
  "progress": 45,
  "message": "Researching Canva pricing..."
}
```

2. **Agent Status**
```json
{
  "type": "agent_status",
  "agent": "validator",
  "status": "completed",
  "data": {
    "validated": 3,
    "errors": 0
  }
}
```

3. **Analysis Complete**
```json
{
  "type": "analysis_complete",
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "results": {
    "products": 3,
    "features": 15,
    "recommendations": 8
  }
}
```

## Integration Examples

### JavaScript/Node.js
```javascript
const fetch = require('node-fetch');

async function createAnalysis() {
  const response = await fetch('http://localhost:3001/api/analysis/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'session=your-session-cookie'
    },
    body: JSON.stringify({
      description: 'AI tools analysis',
      products: 'ChatGPT, Claude, Gemini',
      targetCustomers: 'developers, writers',
      features: 'API access, pricing, capabilities'
    })
  });
  
  const session = await response.json();
  console.log('Created session:', session.sessionId);
}
```

### Python
```python
import requests
import json

def create_analysis():
    url = 'http://localhost:3001/api/analysis/sessions'
    data = {
        'description': 'AI tools analysis',
        'products': 'ChatGPT, Claude, Gemini',
        'targetCustomers': 'developers, writers',
        'features': 'API access, pricing, capabilities'
    }
    
    response = requests.post(url, json=data, cookies={'session': 'your-session-cookie'})
    session = response.json()
    print(f"Created session: {session['sessionId']}")
```

### cURL
```bash
# Create new analysis session
curl -X POST http://localhost:3001/api/analysis/sessions \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "description": "AI tools analysis",
    "products": "ChatGPT, Claude, Gemini",
    "targetCustomers": "developers, writers",
    "features": "API access, pricing, capabilities"
  }'
```

## Testing the API

We provide comprehensive test coverage for all endpoints. Run tests with:

```bash
# Run all API tests
npm test

# Run specific endpoint tests
npm test -- server/__tests__/routes/

# Run with coverage
npm run test:coverage
```

## Support

For API support and questions:
- Documentation: [Internal Wiki]
- Issues: [GitHub Repository]
- Team Contact: development@kanolens.com

---

*Last Updated: July 24, 2025*  
*API Version: 1.0.0*
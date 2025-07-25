# KanoLens Deployment Guide

## Overview

This guide covers deployment and setup procedures for KanoLens, including development environment setup, production deployment, and monitoring configuration.

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Database**: PostgreSQL 14+ (via Supabase)
- **OpenAI API**: Active API key with GPT-4 access
- **Memory**: 2GB+ RAM recommended
- **Storage**: 10GB+ available disk space

### Required Environment Variables
```bash
# Core Application
NODE_ENV=production
PORT=3001

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini

# Security
SESSION_SECRET=your-secure-session-secret
CORS_ORIGIN=https://your-frontend-domain.com

# Optional Services
REDIS_URL=redis://localhost:6379
MONITORING_ENDPOINT=https://your-monitoring-service.com
```

## Development Setup

### 1. Local Environment Setup
```bash
# Clone repository
git clone https://github.com/your-org/kanolens.git
cd kanolens

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# Verify environment
npm run check-env

# Run database migrations (if needed)
npm run db:migrate

# Start development servers
npm run dev
```

### 2. Development Scripts
```bash
# Start all services
npm run dev                 # Frontend + Backend + Watch mode

# Individual services
npm run dev:client         # Frontend only (port 5173)
npm run dev:server         # Backend only (port 3001)

# Testing
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report

# Code quality
npm run lint               # ESLint + TypeScript checks
npm run typecheck          # TypeScript validation
npm run format             # Prettier formatting

# Build
npm run build              # Production build
npm run preview            # Preview production build
```

### 3. Database Setup

#### Using Supabase (Recommended)
```bash
# 1. Create Supabase project at https://supabase.com
# 2. Get your DATABASE_URL from project settings
# 3. Run schema setup (if needed)
npm run db:setup
```

#### Local PostgreSQL (Alternative)
```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or
sudo apt-get install postgresql postgresql-contrib  # Ubuntu

# Create database
createdb kanolens_dev
createdb kanolens_test

# Set DATABASE_URL
export DATABASE_URL="postgresql://localhost:5432/kanolens_dev"
```

## Production Deployment

### Platform-Specific Deployments

#### Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up

# Set environment variables
railway variables set OPENAI_API_KEY=sk-your-key
railway variables set DATABASE_URL=postgresql://...
# ... (set all required variables)
```

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Or via CLI:
vercel env add OPENAI_API_KEY
vercel env add DATABASE_URL
```

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001
CMD ["npm", "start"]
```

```bash
# Build and run Docker container
docker build -t kanolens .
docker run -p 3001:3001 --env-file .env kanolens
```

#### Kubernetes
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kanolens
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kanolens
  template:
    metadata:
      labels:
        app: kanolens
    spec:
      containers:
      - name: kanolens
        image: kanolens:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: kanolens-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: kanolens-secrets
              key: openai-api-key
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: kanolens-service
spec:
  selector:
    app: kanolens
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

### Environment Configuration

#### Production Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=3001

# Database (Production)
DATABASE_URL=postgresql://prod-user:password@prod-host:5432/kanolens_prod
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_ANON_KEY=prod-anon-key

# AI Services (Production)
OPENAI_API_KEY=sk-prod-key
OPENAI_MODEL=gpt-4o-mini

# Security (Production)
SESSION_SECRET=your-production-session-secret
CORS_ORIGIN=https://kanolens.com

# Performance & Monitoring
REDIS_URL=redis://prod-redis:6379
ENABLE_PERFORMANCE_MONITORING=true
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_MAX_REQUESTS=10
```

#### Staging Environment
```bash
# .env.staging
NODE_ENV=staging
PORT=3001

# Database (Staging)
DATABASE_URL=postgresql://staging-user:password@staging-host:5432/kanolens_staging

# AI Services (Staging - can use same as dev)
OPENAI_API_KEY=sk-dev-key
OPENAI_MODEL=gpt-4o-mini

# Debug settings
LOG_LEVEL=debug
ENABLE_DEBUG_ROUTES=true
```

### Health Checks and Monitoring

#### Health Check Endpoints
```bash
# Basic health check
curl https://your-domain.com/health

# Comprehensive health check
curl https://your-domain.com/api/health/full

# Readiness probe (Kubernetes)
curl https://your-domain.com/api/health/ready

# Liveness probe (Kubernetes)
curl https://your-domain.com/api/health/live

# System metrics
curl https://your-domain.com/api/health/metrics
```

#### Monitoring Setup
```typescript
// monitoring.config.ts
export const monitoringConfig = {
  enableMetrics: process.env.NODE_ENV === 'production',
  enableLogging: true,
  logLevel: process.env.LOG_LEVEL || 'info',
  metricsInterval: 30000, // 30 seconds
  alertThresholds: {
    errorRate: 0.05,      // 5% error rate
    responseTime: 2000,    // 2 second response time
    memoryUsage: 0.85,     // 85% memory usage
    cpuUsage: 0.80         // 80% CPU usage
  }
};
```

#### Performance Monitoring
```bash
# Check application performance
curl https://your-domain.com/api/health/performance

# Example response:
{
  "timestamp": "2025-07-24T18:44:00Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": "45.2 MB",
    "heapTotal": "67.8 MB"
  },
  "requests": {
    "total": 1543,
    "averageResponseTime": 245
  },
  "websocket": {
    "activeConnections": 12
  }
}
```

## Security Configuration

### HTTPS Setup
```javascript
// server/config/https.js
import https from 'https';
import fs from 'fs';

export const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH)
};

// Use with Express
const server = https.createServer(httpsOptions, app);
```

### CORS Configuration
```typescript
// server/config/cors.ts
import cors from 'cors';

export const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
```

### Rate Limiting
```typescript
// server/middleware/rateLimiting.ts
import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP'
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
  message: 'AI rate limit exceeded'
});
```

## Database Management

### Migration Scripts
```bash
# Create migration
npm run db:migration:create add_user_preferences

# Run migrations
npm run db:migrate

# Rollback migration
npm run db:rollback

# Reset database (development only)
npm run db:reset
```

### Backup and Recovery
```bash
# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql $DATABASE_URL < backup_20250724_184400.sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
pg_dump $DATABASE_URL > $BACKUP_DIR/kanolens_backup_$DATE.sql
# Upload to S3 or backup service
aws s3 cp $BACKUP_DIR/kanolens_backup_$DATE.sql s3://your-backup-bucket/
```

## Performance Optimization

### Caching Configuration
```typescript
// server/config/cache.ts
export const cacheConfig = {
  redis: {
    url: process.env.REDIS_URL,
    keyPrefix: 'kanolens:',
    ttl: 3600 // 1 hour default TTL
  },
  inMemory: {
    maxSize: 1000,
    defaultTTL: 300000, // 5 minutes
    cleanupInterval: 60000 // 1 minute
  }
};
```

### Bundle Optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['clsx', 'tailwind-merge', 'date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### CDN Configuration
```bash
# CloudFlare setup example
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "cdn",
    "content": "your-origin-server.com",
    "proxied": true
  }'
```

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check environment variables
npm run check-env

# Verify Node.js version
node --version  # Should be 18.x+

# Check port availability
lsof -i :3001

# View detailed logs
NODE_ENV=development DEBUG=* npm start
```

#### Database Connection Issues
```bash
# Test database connection
npm run db:test

# Check database URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database

# Test manual connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### OpenAI API Issues
```bash
# Test OpenAI connection
curl https://your-domain.com/api/test-openai

# Check API key format
echo $OPENAI_API_KEY | cut -c1-7  # Should show "sk-proj" or "sk-"

# Test direct API call
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### Memory Issues
```bash
# Monitor memory usage
ps aux | grep node

# Check for memory leaks
node --inspect server/index.js
# Connect Chrome DevTools to analyze heap

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Performance Issues
```bash
# Analyze bundle size
npm run analyze

# Check API response times
curl -w "@curl-format.txt" -s -o /dev/null https://your-domain.com/api/health

# Monitor database performance
EXPLAIN ANALYZE SELECT * FROM sessions WHERE user_id = 'user-123';
```

### Logging and Debugging
```bash
# Enable debug logging
DEBUG=kanolens:* npm start

# View application logs
tail -f logs/application.log

# Monitor real-time logs (production)
heroku logs --tail -a your-app-name  # Heroku
railway logs -f                      # Railway
kubectl logs -f deployment/kanolens  # Kubernetes
```

## Maintenance

### Regular Maintenance Tasks

#### Weekly
- Review application logs for errors
- Check database performance metrics
- Update security dependencies
- Backup database

#### Monthly
- Review and rotate API keys
- Update dependencies
- Performance optimization review
- Security audit

#### Quarterly
- Full security assessment
- Database optimization
- Infrastructure cost review
- Disaster recovery testing

### Update Procedures
```bash
# Update dependencies
npm update
npm audit
npm audit fix

# Update Node.js (use nvm)
nvm install 18.17.0
nvm use 18.17.0

# Update production deployment
git tag v1.2.0
git push origin v1.2.0
# Trigger deployment pipeline
```

### Scaling Considerations

#### Horizontal Scaling
```yaml
# Kubernetes horizontal pod autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kanolens-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kanolens
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Database Scaling
```bash
# Read replicas for database
# Connection pooling
npm install pg-pool

# Database indexing
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_sessions_created_at ON sessions(created_at);
```

## Support and Resources

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Testing Strategy](./TESTING_STRATEGY.md)
- [Architecture Decisions](./ADR_001_TEST_DRIVEN_REFACTORING.md)

### Monitoring Dashboards
- Application Health: `/api/health/full`
- Performance Metrics: `/api/health/performance`
- System Status: `/api/health/metrics`

### Emergency Contacts
- **Primary Engineer**: [Team Lead Email]
- **DevOps**: [DevOps Email]
- **On-Call**: [On-Call Phone]

### External Services
- **Supabase Dashboard**: https://app.supabase.com
- **OpenAI Usage**: https://platform.openai.com/usage
- **Railway Console**: https://railway.app/dashboard
- **Monitoring Service**: [Your monitoring service URL]

---

*Last Updated: July 24, 2025*  
*Guide Version: 1.0*  
*Deployment Target: Production Ready*
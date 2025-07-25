# KanoLens Maintenance Guidelines

## Overview

This document outlines maintenance procedures, monitoring practices, and operational guidelines for KanoLens. Our system has been architected with production reliability in mind, featuring comprehensive health checks, performance monitoring, and automated testing.

## Monitoring and Health Checks

### Health Check Endpoints

#### Basic Health Check
```bash
# Lightweight check for load balancers
GET /health

# Expected Response:
{
  "status": "healthy",
  "timestamp": "2025-07-24T18:44:00Z",
  "uptime": 3600
}
```

#### Comprehensive Health Check
```bash
# Full system health with dependency checks
GET /api/health/full

# Expected Response:
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
    },
    "memory": {
      "status": "pass",
      "duration": 2.1,
      "message": "Memory usage normal",
      "data": {
        "heapUsed": "45.2 MB",
        "heapTotal": "67.8 MB"
      }
    }
  }
}
```

#### Kubernetes Probes
```bash
# Liveness probe (is the app alive?)
GET /api/health/live

# Readiness probe (is the app ready to serve traffic?)
GET /api/health/ready

# Startup probe (has the app finished starting up?)
GET /api/health/startup
```

### Performance Monitoring

#### System Metrics
```bash
# Get detailed system metrics
GET /api/health/metrics

# Response includes:
{
  "memory": {
    "heapUsed": "45.2 MB",
    "heapTotal": "67.8 MB",
    "external": "15.3 MB",
    "rss": "89.1 MB"
  },
  "cpu": {
    "user": 12500,
    "system": 3200
  },
  "uptime": 3600,
  "activeConnections": 12,
  "totalRequests": 1543,
  "responseTimeStats": {
    "average": 245,
    "min": 15,
    "max": 2100,
    "count": 1543
  }
}
```

#### Performance Benchmarks
```bash
# Get performance analysis
GET /api/health/performance

# Monitor key metrics:
- Average response time: <200ms
- Memory usage: <512MB
- CPU usage: <80%
- Active WebSocket connections: <100
- Database query time: <100ms
```

### Alerting Thresholds

#### Critical Alerts (Immediate Response Required)
- **Service Down**: Health check returning 503
- **Database Offline**: Connection failures
- **Memory Critical**: >1GB heap usage (restart required)
- **Error Rate High**: >5% of requests failing
- **Response Time Critical**: >2 seconds average

#### Warning Alerts (Investigation Required)
- **High Memory**: >512MB heap usage
- **Slow Responses**: >1 second average response time
- **High Error Rate**: >2% of requests failing
- **WebSocket Issues**: Connection drops or high latency
- **Cache Miss Rate**: <80% hit rate

#### Monitoring Setup Example
```typescript
// server/services/monitoring-service.ts
const alertRules = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate Alert',
    condition: (metrics, logs) => {
      const errorLogs = logs.filter(log => log.level === 'error');
      const errorRate = errorLogs.length / logs.length;
      return errorRate > 0.05; // 5% error rate
    },
    severity: 'critical',
    cooldownMs: 300000 // 5 minutes
  },
  {
    id: 'slow-response-time',
    name: 'Slow Response Time Alert',
    condition: (metrics, logs) => {
      return metrics.averageResponseTime > 1000; // 1 second
    },
    severity: 'warning',
    cooldownMs: 600000 // 10 minutes
  }
];
```

## Regular Maintenance Tasks

### Daily Tasks (Automated)

#### Automated Health Checks
```bash
#!/bin/bash
# daily-health-check.sh

echo "Daily Health Check - $(date)"

# Check main application health
HEALTH_STATUS=$(curl -s http://localhost:3001/api/health/full | jq -r '.status')
if [ "$HEALTH_STATUS" != "healthy" ]; then
    echo "ALERT: Application health check failed"
    # Send notification to on-call
fi

# Check database performance
DB_RESPONSE_TIME=$(curl -s http://localhost:3001/api/health/metrics | jq -r '.database.avgResponseTime')
if (( $(echo "$DB_RESPONSE_TIME > 100" | bc -l) )); then
    echo "WARNING: Database response time high: ${DB_RESPONSE_TIME}ms"
fi

# Check memory usage
MEMORY_USAGE=$(curl -s http://localhost:3001/api/health/metrics | jq -r '.memory.heapUsed')
echo "Memory usage: $MEMORY_USAGE"

# Check error logs
ERROR_COUNT=$(grep -c "ERROR" logs/application.log)
if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "WARNING: High error count: $ERROR_COUNT errors today"
fi

echo "Daily health check completed"
```

#### Log Rotation
```bash
#!/bin/bash
# log-rotation.sh

# Rotate application logs
mv logs/application.log logs/application.log.$(date +%Y%m%d)
touch logs/application.log

# Compress old logs
gzip logs/application.log.$(date -d "1 day ago" +%Y%m%d)

# Clean up logs older than 30 days
find logs/ -name "*.gz" -mtime +30 -delete

# Restart application to use new log file
pm2 restart kanolens
```

### Weekly Tasks

#### Security Updates
```bash
#!/bin/bash
# weekly-security-update.sh

echo "Weekly Security Update - $(date)"

# Update npm dependencies with security fixes
npm audit
npm audit fix

# Check for outdated packages
npm outdated

# Update Node.js if needed (use nvm)
NODE_LATEST=$(nvm ls-remote --lts | tail -1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+')
NODE_CURRENT=$(node --version)

if [ "$NODE_LATEST" != "$NODE_CURRENT" ]; then
    echo "Node.js update available: $NODE_CURRENT -> $NODE_LATEST"
fi

# Run security tests
npm run test:security

echo "Security update completed"
```

#### Performance Review
```bash
#!/bin/bash
# weekly-performance-review.sh

echo "Weekly Performance Review - $(date)"

# Analyze performance metrics
curl -s http://localhost:3001/api/health/performance > performance-$(date +%Y%m%d).json

# Check for performance degradation
CURRENT_AVG=$(cat performance-$(date +%Y%m%d).json | jq '.requests.averageResponseTime')
LAST_WEEK_AVG=$(cat performance-$(date -d "7 days ago" +%Y%m%d).json | jq '.requests.averageResponseTime' 2>/dev/null || echo "0")

if (( $(echo "$CURRENT_AVG > $LAST_WEEK_AVG * 1.2" | bc -l) )); then
    echo "WARNING: Performance degradation detected"
    echo "Current average: ${CURRENT_AVG}ms"
    echo "Last week average: ${LAST_WEEK_AVG}ms"
fi

# Run performance tests
npm run test:performance

echo "Performance review completed"
```

#### Database Maintenance
```bash
#!/bin/bash
# weekly-database-maintenance.sh

echo "Weekly Database Maintenance - $(date)"

# Create database backup
BACKUP_FILE="backups/kanolens_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to backup storage (S3, etc.)
aws s3 cp $BACKUP_FILE.gz s3://kanolens-backups/

# Clean up old backups (keep 30 days)
find backups/ -name "*.sql.gz" -mtime +30 -delete

# Analyze database performance
psql $DATABASE_URL -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as total_changes,
    n_dead_tup,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables 
ORDER BY total_changes DESC 
LIMIT 10;
"

# Vacuum analyze if needed
psql $DATABASE_URL -c "VACUUM ANALYZE;"

echo "Database maintenance completed"
```

### Monthly Tasks

#### Dependency Updates
```bash
#!/bin/bash
# monthly-dependency-update.sh

echo "Monthly Dependency Update - $(date)"

# Create update branch
git checkout -b dependency-update-$(date +%Y%m%d)

# Update dependencies
npm update

# Run full test suite
npm run test:full

# Check for breaking changes
npm run build
npm run typecheck
npm run lint

if [ $? -eq 0 ]; then
    echo "All tests passed - dependency update successful"
    git add package*.json
    git commit -m "chore: monthly dependency update $(date +%Y-%m-%d)"
    git push -u origin dependency-update-$(date +%Y%m%d)
    echo "Create PR for dependency update"
else
    echo "Tests failed - manual review required"
    git checkout main
    git branch -D dependency-update-$(date +%Y%m%d)
fi

echo "Dependency update completed"
```

#### Security Audit
```bash
#!/bin/bash
# monthly-security-audit.sh

echo "Monthly Security Audit - $(date)"

# Run comprehensive security checks
npm audit --audit-level=moderate

# Check for vulnerable dependencies
npm audit --json > security-audit-$(date +%Y%m%d).json

# Scan for hardcoded secrets
grep -r "sk-" server/ client/ --exclude-dir=node_modules --exclude-dir=.git
grep -r "password\|secret\|key" server/ client/ --exclude-dir=node_modules --exclude-dir=.git

# Check environment variable security
echo "Checking environment variables..."
env | grep -E "(KEY|SECRET|PASSWORD|TOKEN)" | sed 's/=.*/=***HIDDEN***/'

# Review file permissions
find . -type f -perm -002 2>/dev/null | grep -v node_modules || echo "No world-writable files found"

# Check SSL certificate expiration (if applicable)
if [ -n "$SSL_CERT_PATH" ]; then
    openssl x509 -enddate -noout -in $SSL_CERT_PATH
fi

echo "Security audit completed"
```

#### Performance Optimization Review
```bash
#!/bin/bash
# monthly-performance-optimization.sh

echo "Monthly Performance Optimization Review - $(date)"

# Analyze bundle size
npm run analyze

# Check for memory leaks
node --expose-gc --inspect server/memory-leak-test.js

# Database query optimization
psql $DATABASE_URL -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"

# Cache performance analysis
curl -s http://localhost:3001/api/cache/stats

# Load testing
npm run test:load

echo "Performance optimization review completed"
```

## Troubleshooting Procedures

### Application Issues

#### Service Won't Start
```bash
# Diagnostic steps
echo "Diagnosing application startup issues..."

# Check Node.js version
node --version

# Verify environment variables
npm run check-env

# Check port availability
lsof -i :3001

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check file permissions
ls -la server/

# View detailed startup logs
NODE_ENV=development DEBUG=* npm start
```

#### High Memory Usage
```bash
# Memory diagnostic procedure
echo "Diagnosing memory issues..."

# Current memory usage
ps aux | grep node
free -h

# Heap dump analysis
node --expose-gc --inspect server/index.js
# Connect Chrome DevTools to analyze heap

# Check for memory leaks
if [ -f heapdump.*.heapsnapshot ]; then
    echo "Heap snapshot available for analysis"
fi

# Restart with increased memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### Database Performance Issues
```bash
# Database diagnostic procedure
echo "Diagnosing database issues..."

# Check active connections
psql $DATABASE_URL -c "
SELECT count(*) as active_connections, 
       state 
FROM pg_stat_activity 
GROUP BY state;
"

# Check slow queries
psql $DATABASE_URL -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;
"

# Check table sizes
psql $DATABASE_URL -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check for locks
psql $DATABASE_URL -c "
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
WHERE NOT blocked_locks.GRANTED;
"
```

#### API Response Time Issues
```bash
# API performance diagnostic
echo "Diagnosing API performance issues..."

# Test individual endpoints
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3001/api/health
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3001/api/analysis/sessions

# Check cache performance
curl -s http://localhost:3001/api/health/metrics | jq '.cache'

# Database query performance
npm run test:db-performance

# Enable detailed logging
DEBUG=express:* npm start

# Profile with clinic.js
npm install -g clinic
clinic doctor -- node server/index.js
```

## Disaster Recovery

### Backup Procedures

#### Database Backup
```bash
#!/bin/bash
# database-backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/kanolens_backup_$TIMESTAMP.sql"

# Create backup
echo "Creating database backup..."
pg_dump $DATABASE_URL > $BACKUP_FILE

if [ $? -eq 0 ]; then
    # Compress backup
    gzip $BACKUP_FILE
    
    # Upload to cloud storage
    aws s3 cp $BACKUP_FILE.gz s3://kanolens-backups/database/
    
    # Verify backup integrity
    gunzip -t $BACKUP_FILE.gz
    
    echo "Backup completed successfully: $BACKUP_FILE.gz"
else
    echo "Backup failed!"
    exit 1
fi
```

#### Application State Backup
```bash
#!/bin/bash
# application-state-backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup configuration
tar -czf $BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz \
    .env.production \
    server/config/ \
    package.json \
    package-lock.json

# Backup logs
tar -czf $BACKUP_DIR/logs_backup_$TIMESTAMP.tar.gz logs/

# Backup user uploads (if any)
if [ -d "uploads" ]; then
    tar -czf $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz uploads/
fi

echo "Application state backup completed"
```

### Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# database-recovery.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    exit 1
fi

echo "Starting database recovery from $BACKUP_FILE"

# Download backup if needed
if [[ $BACKUP_FILE == s3://* ]]; then
    aws s3 cp $BACKUP_FILE ./recovery_backup.sql.gz
    BACKUP_FILE="./recovery_backup.sql.gz"
fi

# Decompress backup
gunzip $BACKUP_FILE

# Stop application
pm2 stop kanolens

# Restore database
psql $DATABASE_URL < ${BACKUP_FILE%.gz}

# Restart application
pm2 start kanolens

echo "Database recovery completed"
```

#### Application Recovery
```bash
#!/bin/bash
# application-recovery.sh

echo "Starting application recovery..."

# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Install dependencies
npm ci

# Run database migrations if needed
npm run db:migrate

# Build application
npm run build

# Run health checks
npm run test:health

# Restart application
pm2 restart kanolens

# Verify recovery
sleep 10
curl -f http://localhost:3001/health || echo "Recovery verification failed"

echo "Application recovery completed"
```

## Performance Optimization

### Caching Strategy

#### Cache Configuration
```typescript
// Optimize cache settings based on usage patterns
const cacheConfig = {
  // Session data - frequently accessed
  session: {
    ttl: 3600000,    // 1 hour
    maxSize: 1000    // 1000 sessions
  },
  
  // API responses - moderate access
  apiResponse: {
    ttl: 300000,     // 5 minutes
    maxSize: 500     // 500 responses
  },
  
  // Analysis results - long-lived
  analysis: {
    ttl: 86400000,   // 24 hours
    maxSize: 100     // 100 analyses
  }
};
```

#### Cache Monitoring
```bash
# Monitor cache performance
curl -s http://localhost:3001/api/cache/stats | jq '{
  hitRate: .hitRate,
  missRate: .missRate,
  evictionRate: .evictionRate,
  averageAccessTime: .averageAccessTime
}'

# Optimal thresholds:
# Hit rate: >90%
# Average access time: <1ms
# Eviction rate: <5%
```

### Database Optimization

#### Index Maintenance
```sql
-- Monitor index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Identify missing indexes
SELECT 
    query,
    calls,
    mean_time,
    total_time
FROM pg_stat_statements 
WHERE query LIKE '%WHERE%' 
  AND calls > 100 
  AND mean_time > 100
ORDER BY mean_time DESC;

-- Create recommended indexes
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_sessions_created_at ON sessions(created_at);
CREATE INDEX CONCURRENTLY idx_messages_session_id ON messages(session_id);
```

#### Query Optimization
```sql
-- Analyze slow queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT s.*, COUNT(m.id) as message_count 
FROM sessions s 
LEFT JOIN messages m ON s.id = m.session_id 
WHERE s.user_id = 'user-123' 
GROUP BY s.id 
ORDER BY s.created_at DESC;

-- Optimize with proper indexing and query structure
```

### Application Performance

#### Bundle Optimization
```typescript
// vite.config.ts - Optimize bundle splitting
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries (rarely change)
          vendor: ['react', 'react-dom'],
          
          // UI components (moderate change)
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          
          // Utilities (frequent change)
          utils: ['clsx', 'tailwind-merge', 'date-fns']
        }
      }
    },
    target: 'es2020',
    chunkSizeWarningLimit: 1000
  }
});
```

#### Memory Management
```typescript
// Implement proper cleanup in services
export class AIService {
  private requestQueue: Map<string, AbortController> = new Map();
  
  async processChat(message: string, sessionId: string): Promise<ChatResponse> {
    const controller = new AbortController();
    this.requestQueue.set(sessionId, controller);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: message }],
        signal: controller.signal
      });
      
      return this.parseResponse(response);
    } finally {
      this.requestQueue.delete(sessionId);
    }
  }
  
  shutdown(): void {
    // Cancel all pending requests
    this.requestQueue.forEach(controller => controller.abort());
    this.requestQueue.clear();
  }
}
```

## Security Maintenance

### Security Monitoring
```bash
#!/bin/bash
# security-monitoring.sh

echo "Security Monitoring Check - $(date)"

# Check for suspicious activity
tail -1000 logs/application.log | grep -E "(fail|error|unauthorized|suspicious)" | tail -20

# Monitor failed authentication attempts
grep "authentication failed" logs/application.log | wc -l

# Check for unusual API usage patterns
curl -s http://localhost:3001/api/health/metrics | jq '.requests.errorRate'

# Verify SSL certificate status
if [ -n "$SSL_CERT_PATH" ]; then
    openssl x509 -checkend 2592000 -noout -in $SSL_CERT_PATH
    if [ $? != 0 ]; then
        echo "WARNING: SSL certificate expires within 30 days"
    fi
fi

echo "Security monitoring completed"
```

### Access Control Review
```bash
#!/bin/bash
# access-control-review.sh

echo "Access Control Review - $(date)"

# Review active sessions
psql $DATABASE_URL -c "
SELECT user_id, COUNT(*) as session_count, MAX(created_at) as last_activity
FROM sessions 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY session_count DESC;
"

# Check for elevated permissions
grep -r "admin\|sudo\|root" server/ --exclude-dir=node_modules

# Review API key usage
grep "API key" logs/application.log | tail -10

echo "Access control review completed"
```

## Emergency Procedures

### Incident Response

#### Severity Levels
- **P0 (Critical)**: Service completely down, data loss risk
- **P1 (High)**: Major functionality broken, significant user impact
- **P2 (Medium)**: Minor functionality issues, limited user impact
- **P3 (Low)**: Minor issues, no user impact

#### Response Procedures

##### P0 - Critical Incident
```bash
#!/bin/bash
# critical-incident-response.sh

echo "CRITICAL INCIDENT RESPONSE INITIATED"

# 1. Immediate assessment
curl -f http://localhost:3001/health || echo "CRITICAL: Health check failed"

# 2. Check system resources
df -h
free -h
ps aux | grep node

# 3. Review recent logs
tail -100 logs/application.log

# 4. Database status
psql $DATABASE_URL -c "SELECT 1;" || echo "CRITICAL: Database offline"

# 5. Attempt automatic recovery
pm2 restart kanolens

# 6. Verify recovery
sleep 30
curl -f http://localhost:3001/health && echo "RECOVERY SUCCESSFUL" || echo "RECOVERY FAILED"

# 7. Notify team
echo "Critical incident at $(date). Status: [SUCCESS/FAILED]" | mail -s "CRITICAL INCIDENT" team@kanolens.com
```

##### P1 - High Priority Incident
```bash
#!/bin/bash
# high-priority-incident-response.sh

echo "HIGH PRIORITY INCIDENT RESPONSE"

# Assess functionality
npm run test:critical-paths

# Check error rates
curl -s http://localhost:3001/api/health/metrics | jq '.errorRate'

# Review specific logs
grep -E "(ERROR|WARN)" logs/application.log | tail -50

# Attempt service restart if needed
if [[ $(curl -s http://localhost:3001/api/health/full | jq -r '.status') != "healthy" ]]; then
    pm2 restart kanolens
fi
```

### Rollback Procedures
```bash
#!/bin/bash
# rollback-procedure.sh

ROLLBACK_VERSION="$1"

if [ -z "$ROLLBACK_VERSION" ]; then
    echo "Usage: $0 <git-tag-or-commit>"
    exit 1
fi

echo "Initiating rollback to $ROLLBACK_VERSION"

# 1. Stop current application
pm2 stop kanolens

# 2. Backup current state
git tag "backup-$(date +%Y%m%d_%H%M%S)"

# 3. Rollback code
git checkout $ROLLBACK_VERSION

# 4. Install dependencies (in case they changed)
npm ci

# 5. Run database migrations down if needed
# npm run db:migrate:down

# 6. Build application
npm run build

# 7. Restart application
pm2 start kanolens

# 8. Verify rollback
sleep 10
curl -f http://localhost:3001/health && echo "ROLLBACK SUCCESSFUL" || echo "ROLLBACK FAILED"

echo "Rollback procedure completed"
```

## Documentation Updates

### Maintenance Log Template
```markdown
# Maintenance Log Entry

**Date**: 2025-07-24  
**Type**: [Routine/Emergency/Upgrade]  
**Performed By**: [Name]  

## Tasks Completed
- [ ] Health check verification
- [ ] Performance review
- [ ] Security updates
- [ ] Database maintenance
- [ ] Backup verification

## Issues Found
- List any issues discovered
- Include severity and resolution

## Actions Taken
- Detailed list of actions performed
- Include any configuration changes

## Next Steps
- Any follow-up required
- Monitoring recommendations
- Schedule for next review
```

### Change Log Updates
```markdown
# KanoLens Change Log

## [1.2.1] - 2025-07-24

### Maintenance
- Updated Node.js dependencies for security patches
- Optimized database query performance
- Enhanced monitoring alerts for better coverage

### Performance
- Improved cache hit rate from 85% to 92%
- Reduced average API response time by 15ms
- Optimized bundle size by 50KB

### Security
- Rotated API keys as scheduled
- Updated SSL certificates
- Enhanced rate limiting for AI endpoints
```

---

*Last Updated: July 24, 2025*  
*Maintenance Version: 2.0*  
*Next Review: August 24, 2025*
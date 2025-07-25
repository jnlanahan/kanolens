// Phase 5: Production Monitoring and Observability Service
// Comprehensive monitoring, logging, and alerting service

import { performance } from 'perf_hooks';

interface LogLevel {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
}

interface LogEntry extends LogLevel {
  timestamp: string;
  message: string;
  context?: any;
  service?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: any;
}

interface MetricEntry {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: MetricEntry[], logs: LogEntry[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTriggered?: string;
  cooldownMs: number;
}

interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  context?: any;
  resolved?: boolean;
  resolvedAt?: string;
}

interface PerformanceTracker {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  context?: any;
}

interface MonitoringConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  enableAlerts: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  metricsRetentionMs: number;
  logsRetentionMs: number;
  alertsRetentionMs: number;
  maxLogEntries: number;
  maxMetricEntries: number;
}

export class MonitoringService {
  private logs: LogEntry[] = [];
  private metrics: MetricEntry[] = [];
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private performanceTrackers = new Map<string, PerformanceTracker>();
  private config: MonitoringConfig;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enableLogging: config.enableLogging !== false,
      enableMetrics: config.enableMetrics !== false,
      enableAlerts: config.enableAlerts !== false,
      logLevel: config.logLevel || 'info',
      metricsRetentionMs: config.metricsRetentionMs || 24 * 60 * 60 * 1000, // 24 hours
      logsRetentionMs: config.logsRetentionMs || 7 * 24 * 60 * 60 * 1000, // 7 days
      alertsRetentionMs: config.alertsRetentionMs || 30 * 24 * 60 * 60 * 1000, // 30 days
      maxLogEntries: config.maxLogEntries || 10000,
      maxMetricEntries: config.maxMetricEntries || 50000
    };

    this.setupDefaultAlertRules();
    this.startCleanupTimer();
    
    console.log('[Monitoring] Service initialized with config:', this.config);
  }

  // Logging methods
  debug(message: string, context?: any, metadata?: Partial<LogEntry>): void {
    this.log('debug', message, context, metadata);
  }

  info(message: string, context?: any, metadata?: Partial<LogEntry>): void {
    this.log('info', message, context, metadata);
  }

  warn(message: string, context?: any, metadata?: Partial<LogEntry>): void {
    this.log('warn', message, context, metadata);
  }

  error(message: string, error?: any, context?: any, metadata?: Partial<LogEntry>): void {
    this.log('error', message, context, { ...metadata, error });
  }

  critical(message: string, error?: any, context?: any, metadata?: Partial<LogEntry>): void {
    this.log('critical', message, context, { ...metadata, error });
  }

  private log(level: LogEntry['level'], message: string, context?: any, metadata?: Partial<LogEntry>): void {
    if (!this.config.enableLogging) return;
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
      service: metadata?.service || 'kanolens',
      userId: metadata?.userId,
      requestId: metadata?.requestId,
      duration: metadata?.duration,
      error: metadata?.error
    };

    this.logs.push(entry);
    this.trimLogs();

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'debug' ? 'debug' : 
                       level === 'info' ? 'log' :
                       level === 'warn' ? 'warn' : 'error';
      console[logMethod](`[${level.toUpperCase()}] ${message}`, context || '');
    }

    // Check alerts
    this.checkAlertRules();
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  // Metrics methods
  counter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.recordMetric(name, value, 'counter', tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric(name, value, 'gauge', tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric(name, value, 'histogram', tags);
  }

  timer(name: string, duration: number, tags?: Record<string, string>): void {
    this.recordMetric(name, duration, 'timer', tags);
  }

  private recordMetric(name: string, value: number, type: MetricEntry['type'], tags?: Record<string, string>): void {
    if (!this.config.enableMetrics) return;

    const entry: MetricEntry = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
      type
    };

    this.metrics.push(entry);
    this.trimMetrics();

    // Check alerts
    this.checkAlertRules();
  }

  // Performance tracking
  startPerformanceTracker(name: string, context?: any): string {
    const trackerId = `${name}-${Date.now()}-${Math.random()}`;
    const tracker: PerformanceTracker = {
      name,
      startTime: performance.now(),
      context
    };

    this.performanceTrackers.set(trackerId, tracker);
    return trackerId;
  }

  endPerformanceTracker(trackerId: string, additionalContext?: any): number | undefined {
    const tracker = this.performanceTrackers.get(trackerId);
    if (!tracker) return undefined;

    const endTime = performance.now();
    const duration = endTime - tracker.startTime;

    tracker.endTime = endTime;
    tracker.duration = duration;

    // Record as metric
    this.timer(tracker.name, duration, {
      service: 'kanolens',
      ...additionalContext
    });

    // Log performance
    this.info(`Performance: ${tracker.name}`, {
      duration: `${duration.toFixed(2)}ms`,
      context: { ...tracker.context, ...additionalContext }
    });

    this.performanceTrackers.delete(trackerId);
    return duration;
  }

  // Alert management
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    this.info('Alert rule added', { ruleId: rule.id, name: rule.name });
  }

  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index >= 0) {
      this.alertRules.splice(index, 1);
      this.info('Alert rule removed', { ruleId });
      return true;
    }
    return false;
  }

  private checkAlertRules(): void {
    if (!this.config.enableAlerts) return;

    const now = Date.now();

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const lastTriggeredTime = new Date(rule.lastTriggered).getTime();
        if (now - lastTriggeredTime < rule.cooldownMs) {
          continue;
        }
      }

      // Evaluate condition
      try {
        if (rule.condition(this.metrics, this.logs)) {
          this.triggerAlert(rule);
        }
      } catch (error) {
        this.error('Alert rule evaluation failed', error, { ruleId: rule.id });
      }
    }
  }

  private triggerAlert(rule: AlertRule): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random()}`,
      ruleId: rule.id,
      severity: rule.severity,
      message: `Alert: ${rule.name}`,
      timestamp: new Date().toISOString(),
      context: {
        ruleName: rule.name,
        condition: rule.condition.toString()
      }
    };

    this.alerts.push(alert);
    rule.lastTriggered = alert.timestamp;

    // Log the alert
    this.critical('Alert triggered', null, { alert, rule });

    // In production, this would send notifications (email, Slack, etc.)
    console.error(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.info('Alert resolved', { alertId, resolvedAt: alert.resolvedAt });
      return true;
    }
    return false;
  }

  // Query methods
  getLogs(filters?: {
    level?: LogEntry['level'];
    service?: string;
    since?: string;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (filters?.level) {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    if (filters?.service) {
      filtered = filtered.filter(log => log.service === filters.service);
    }

    if (filters?.since) {
      const sinceTime = new Date(filters.since).getTime();
      filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= sinceTime);
    }

    if (filters?.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getMetrics(filters?: {
    name?: string;
    type?: MetricEntry['type'];
    since?: string;
    limit?: number;
  }): MetricEntry[] {
    let filtered = [...this.metrics];

    if (filters?.name) {
      filtered = filtered.filter(metric => metric.name === filters.name);
    }

    if (filters?.type) {
      filtered = filtered.filter(metric => metric.type === filters.type);
    }

    if (filters?.since) {
      const sinceTime = new Date(filters.since).getTime();
      filtered = filtered.filter(metric => new Date(metric.timestamp).getTime() >= sinceTime);
    }

    if (filters?.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getAlerts(filters?: {
    severity?: Alert['severity'];
    resolved?: boolean;
    since?: string;
    limit?: number;
  }): Alert[] {
    let filtered = [...this.alerts];

    if (filters?.severity) {
      filtered = filtered.filter(alert => alert.severity === filters.severity);
    }

    if (filters?.resolved !== undefined) {
      filtered = filtered.filter(alert => Boolean(alert.resolved) === filters.resolved);
    }

    if (filters?.since) {
      const sinceTime = new Date(filters.since).getTime();
      filtered = filtered.filter(alert => new Date(alert.timestamp).getTime() >= sinceTime);
    }

    if (filters?.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Statistics
  getStatistics() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > oneHourAgo
    );

    const recentMetrics = this.metrics.filter(metric => 
      new Date(metric.timestamp).getTime() > oneHourAgo
    );

    const activeAlerts = this.alerts.filter(alert => !alert.resolved);

    return {
      logs: {
        total: this.logs.length,
        lastHour: recentLogs.length,
        byLevel: this.groupBy(recentLogs, 'level'),
        errors: recentLogs.filter(log => log.level === 'error' || log.level === 'critical').length
      },
      metrics: {
        total: this.metrics.length,
        lastHour: recentMetrics.length,
        byType: this.groupBy(recentMetrics, 'type'),
        byName: this.groupBy(recentMetrics, 'name')
      },
      alerts: {
        total: this.alerts.length,
        active: activeAlerts.length,
        bySeverity: this.groupBy(activeAlerts, 'severity')
      },
      performance: {
        activeTrackers: this.performanceTrackers.size
      }
    };
  }

  // Health check for monitoring service
  getHealthStatus() {
    const stats = this.getStatistics();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      config: this.config,
      statistics: stats,
      memory: {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
      }
    };
  }

  // Cleanup methods
  private trimLogs(): void {
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.config.maxMetricEntries) {
      this.metrics = this.metrics.slice(-this.config.maxMetricEntries);
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Run every hour
  }

  private cleanupOldData(): void {
    const now = Date.now();

    // Clean old logs
    const logCutoff = now - this.config.logsRetentionMs;
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > logCutoff
    );

    // Clean old metrics
    const metricCutoff = now - this.config.metricsRetentionMs;
    this.metrics = this.metrics.filter(metric => 
      new Date(metric.timestamp).getTime() > metricCutoff
    );

    // Clean old alerts
    const alertCutoff = now - this.config.alertsRetentionMs;
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > alertCutoff
    );

    this.info('Monitoring data cleaned up', {
      logsCount: this.logs.length,
      metricsCount: this.metrics.length,
      alertsCount: this.alerts.length
    });
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  private setupDefaultAlertRules(): void {
    // High error rate
    this.addAlertRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: (metrics, logs) => {
        const recentLogs = logs.filter(log => 
          Date.now() - new Date(log.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
        );
        const errorLogs = recentLogs.filter(log => log.level === 'error' || log.level === 'critical');
        return errorLogs.length > 10; // More than 10 errors in 5 minutes
      },
      severity: 'high',
      enabled: true,
      cooldownMs: 10 * 60 * 1000 // 10 minutes
    });

    // High memory usage
    this.addAlertRule({
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      condition: () => {
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
        return heapUsedMB > 512; // More than 512MB
      },
      severity: 'medium',
      enabled: true,
      cooldownMs: 5 * 60 * 1000 // 5 minutes
    });

    // No recent activity (potential deadlock)
    this.addAlertRule({
      id: 'no-recent-activity',
      name: 'No Recent Activity',
      condition: (metrics, logs) => {
        const recentLogs = logs.filter(log => 
          Date.now() - new Date(log.timestamp).getTime() < 10 * 60 * 1000 // Last 10 minutes
        );
        return recentLogs.length === 0; // No logs in 10 minutes
      },
      severity: 'medium',
      enabled: true,
      cooldownMs: 15 * 60 * 1000 // 15 minutes
    });
  }

  // Export monitoring data
  exportData(format: 'json' | 'csv' = 'json') {
    const data = {
      logs: this.logs,
      metrics: this.metrics,
      alerts: this.alerts,
      statistics: this.getStatistics(),
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // Simple CSV export (would be more complex in production)
    if (format === 'csv') {
      const csv = [
        'type,timestamp,level,message,value',
        ...this.logs.map(log => `log,${log.timestamp},${log.level},"${log.message}",`),
        ...this.metrics.map(metric => `metric,${metric.timestamp},${metric.type},${metric.name},${metric.value}`)
      ].join('\n');
      return csv;
    }

    return data;
  }

  destroy(): void {
    this.logs = [];
    this.metrics = [];
    this.alerts = [];
    this.alertRules = [];
    this.performanceTrackers.clear();
    console.log('[Monitoring] Service destroyed');
  }
}

// Create global monitoring instance
export const monitoring = new MonitoringService({
  enableLogging: true,
  enableMetrics: true,
  enableAlerts: process.env.NODE_ENV === 'production',
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
});

console.log('[Monitoring] Global monitoring service initialized');
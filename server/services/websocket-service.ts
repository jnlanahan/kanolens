// WebSocket Service abstraction to encapsulate real-time communication
// Created with test-first approach for reliability

import { Server } from 'http';
import { parse as parseUrl } from 'url';

export interface ProgressUpdate {
  step: 'discovery' | 'research' | 'categorization' | 'table_creation' | 'analysis' | 'completed' | 'error';
  message: string;
  progress: number;
  data?: any;
  sessionId?: number;
}

export interface WebSocketMessage {
  type: 'progress' | 'error' | 'complete' | 'ping';
  sessionId?: number;
  data?: any;
}

export interface WebSocketConfig {
  path: string;
  maxConnections: number;
  maxConnectionsPerSession: number;
  cleanupInterval: number;
  connectionTimeout: number;
}

export interface ConnectionStatus {
  activeSessions: number;
  totalConnections: number;
  connectionCount: number;
  maxConnections: number;
  maxPerSession: number;
  sessionDetails: Array<{
    sessionId: string;
    clientCount: number;
    oldestConnectionAge: number;
    averageConnectionAge: number;
  }>;
}

export interface WebSocketService {
  initialize(server: Server): void;
  broadcastProgress(sessionId: number, update: ProgressUpdate): void;
  broadcastComplete(sessionId: number, result: any): void;
  broadcastError(sessionId: number, error: any): void;
  getConnectionStatus(): ConnectionStatus;
  shutdown(): void;
  // Test access to internal state
  _getInternalState?(): {
    clients: Map<string, Set<any>>;
    connectionCount: number;
    connectionTimes: Map<any, number>;
  };
  _setInternalState?(state: {
    clients?: Map<string, Set<any>>;
    connectionCount?: number;
  }): void;
}

/**
 * Creates a WebSocket service instance with dependency injection
 * @param WebSocketServerConstructor - WebSocket server constructor (for testing)
 * @param config - Service configuration
 * @returns Configured WebSocket service
 */
export function createWebSocketService(
  WebSocketServerConstructor: any, 
  config: WebSocketConfig
): WebSocketService {
  if (!WebSocketServerConstructor) {
    throw new Error('Invalid WebSocket server constructor');
  }
  
  if (!config) {
    throw new Error('Invalid configuration');
  }

  // Internal state
  let wss: any = null;
  const clients: Map<string, Set<any>> = new Map();
  let connectionCount: number = 0;
  const connectionTimes: Map<any, number> = new Map();
  let cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Validates client connection parameters
   */
  function verifyClient(info: any): boolean {
    // Check connection limits first
    if (connectionCount >= config.maxConnections) {
      console.log(`[WebSocket] Rejected connection - max connections (${config.maxConnections}) reached`);
      return false;
    }
    
    // Basic verification - extract session ID
    const url = parseUrl(info.req.url || '', true);
    const sessionId = url.query.sessionId as string;
    
    if (!sessionId) {
      console.log('[WebSocket] Rejected connection - no session ID');
      return false;
    }
    
    // Check per-session connection limits
    const sessionConnections = clients.get(sessionId)?.size || 0;
    if (sessionConnections >= config.maxConnectionsPerSession) {
      console.log(`[WebSocket] Rejected connection - session ${sessionId} has too many connections (${sessionConnections})`);
      return false;
    }
    
    return true;
  }

  /**
   * Handles new client connections
   */
  function handleConnection(ws: any, req: any) {
    const url = parseUrl(req.url || '', true);
    const sessionId = url.query.sessionId as string;

    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    console.log(`[WebSocket] Client connected for session ${sessionId} (total connections: ${connectionCount + 1})`);

    // Track connection time and increment count
    connectionTimes.set(ws, Date.now());
    connectionCount++;

    // Add client to session group
    if (!clients.has(sessionId)) {
      clients.set(sessionId, new Set());
    }
    clients.get(sessionId)!.add(ws);

    // Send initial connection confirmation
    sendToClient(ws, {
      type: 'ping',
      sessionId: parseInt(sessionId),
      data: { message: 'Connected to analysis progress stream' }
    });

    // Handle client messages
    ws.on('message', (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(ws, sessionId, message);
      } catch (error) {
        console.error('[WebSocket] Invalid message format:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', (code: number, reason: any) => {
      console.log(`[WebSocket] Client disconnected from session ${sessionId} (code: ${code}, reason: ${reason?.toString() || 'none'})`);
      cleanupConnection(ws, sessionId);
    });

    // Handle errors
    ws.on('error', (error: any) => {
      console.error(`[WebSocket] Client error for session ${sessionId}:`, error.message);
      cleanupConnection(ws, sessionId);
    });
  }

  /**
   * Starts cleanup interval to remove stale connections
   */
  function startCleanupInterval() {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      // Find and clean up stale connections
      for (const [ws, connectionTime] of connectionTimes.entries()) {
        if (now - connectionTime > config.connectionTimeout && ws.readyState !== 1) { // 1 = OPEN
          // Find which session this connection belongs to
          for (const [sessionId, sessionClients] of clients.entries()) {
            if (sessionClients.has(ws)) {
              console.log(`[WebSocket] Cleaning up stale connection for session ${sessionId}`);
              cleanupConnection(ws, sessionId);
              cleaned++;
              break;
            }
          }
        }
      }
      
      if (cleaned > 0) {
        console.log(`[WebSocket] Cleanup cycle completed - removed ${cleaned} stale connections`);
      }
    }, config.cleanupInterval);
  }

  /**
   * Cleans up a specific connection
   */
  function cleanupConnection(ws: any, sessionId: string) {
    // Remove from session clients
    clients.get(sessionId)?.delete(ws);
    
    // Clean up empty session groups
    if (clients.get(sessionId)?.size === 0) {
      clients.delete(sessionId);
      console.log(`[WebSocket] Cleaned up empty session group: ${sessionId}`);
    }
    
    // Remove connection tracking
    if (connectionTimes.has(ws)) {
      connectionTimes.delete(ws);
      connectionCount--;
      console.log(`[WebSocket] Connection count decreased to ${connectionCount}`);
    }
  }

  /**
   * Handles incoming client messages
   */
  function handleClientMessage(ws: any, sessionId: string, message: any) {
    switch (message.type) {
      case 'ping':
        sendToClient(ws, {
          type: 'ping',
          sessionId: parseInt(sessionId),
          data: { message: 'pong', timestamp: Date.now() }
        });
        break;
      
      case 'pong':
        // Client responded to ping - connection is alive
        console.log(`[WebSocket] Pong received from session ${sessionId}`);
        break;
      
      case 'subscribe':
        // Client is already subscribed by connecting
        sendToClient(ws, {
          type: 'ping',
          sessionId: parseInt(sessionId),
          data: { message: 'Subscribed to progress updates' }
        });
        break;
        
      default:
        console.log(`[WebSocket] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Sends message to a specific client
   */
  function sendToClient(ws: any, message: WebSocketMessage) {
    if (ws.readyState === 1) { // OPEN
      try {
        ws.send(JSON.stringify(message));
      } catch (error: any) {
        console.error('[WebSocket] Failed to send message:', error.message);
        // If send fails, the connection might be stale - clean it up
        ws.terminate();
      }
    } else if (ws.readyState === 3 || ws.readyState === 2) { // CLOSED or CLOSING
      // Remove closed connections from tracking
      for (const [sessionId, sessionClients] of clients.entries()) {
        if (sessionClients.has(ws)) {
          cleanupConnection(ws, sessionId);
          break;
        }
      }
    }
  }

  return {
    initialize(server: Server): void {
      wss = new WebSocketServerConstructor({ 
        server,
        path: config.path,
        verifyClient
      });

      wss.on('connection', handleConnection);

      // Start cleanup interval
      startCleanupInterval();
      
      console.log(`[WebSocket] Server initialized on ${config.path} (max connections: ${config.maxConnections}, max per session: ${config.maxConnectionsPerSession})`);
    },

    broadcastProgress(sessionId: number, update: ProgressUpdate): void {
      const sessionClients = clients.get(sessionId.toString());
      if (!sessionClients || sessionClients.size === 0) {
        console.log(`[WebSocket] No clients connected for session ${sessionId}`);
        return;
      }

      const message: WebSocketMessage = {
        type: 'progress',
        sessionId,
        data: update
      };

      console.log(`[WebSocket] Broadcasting progress to ${sessionClients.size} clients for session ${sessionId}:`, update.step);

      sessionClients.forEach(ws => {
        sendToClient(ws, message);
      });
    },

    broadcastComplete(sessionId: number, result: any): void {
      const sessionClients = clients.get(sessionId.toString());
      if (!sessionClients || sessionClients.size === 0) {
        console.log(`[WebSocket] No clients connected for session ${sessionId} for completion`);
        return;
      }

      const message: WebSocketMessage = {
        type: 'complete',
        sessionId,
        data: result
      };

      console.log(`[WebSocket] Broadcasting completion to ${sessionClients.size} clients for session ${sessionId}`);

      sessionClients.forEach(ws => {
        sendToClient(ws, message);
      });
    },

    broadcastError(sessionId: number, error: any): void {
      const sessionClients = clients.get(sessionId.toString());
      if (!sessionClients || sessionClients.size === 0) {
        console.log(`[WebSocket] No clients connected for session ${sessionId} for error`);
        return;
      }

      const message: WebSocketMessage = {
        type: 'error',
        sessionId,
        data: { 
          message: error.message || 'Analysis failed',
          step: error.step || 'unknown'
        }
      };

      console.log(`[WebSocket] Broadcasting error to ${sessionClients.size} clients for session ${sessionId}`);

      sessionClients.forEach(ws => {
        sendToClient(ws, message);
      });
    },

    getConnectionStatus(): ConnectionStatus {
      const totalConnections = Array.from(clients.values())
        .reduce((total, sessionClients) => total + sessionClients.size, 0);
      
      return {
        activeSessions: clients.size,
        totalConnections,
        connectionCount,
        maxConnections: config.maxConnections,
        maxPerSession: config.maxConnectionsPerSession,
        sessionDetails: Array.from(clients.entries()).map(([sessionId, sessionClients]) => {
          // Get connection ages for this session
          const connectionAges = Array.from(sessionClients.values())
            .map(ws => {
              const connectTime = connectionTimes.get(ws);
              return connectTime ? Date.now() - connectTime : 0;
            })
            .sort((a, b) => b - a); // Sort by age, oldest first
          
          return {
            sessionId,
            clientCount: sessionClients.size,
            oldestConnectionAge: connectionAges[0] || 0,
            averageConnectionAge: connectionAges.length > 0 
              ? Math.round(connectionAges.reduce((sum, age) => sum + age, 0) / connectionAges.length)
              : 0
          };
        })
      };
    },

    shutdown(): void {
      console.log('[WebSocket] Starting graceful shutdown...');
      
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
      
      if (wss) {
        // Close all client connections
        for (const [sessionId, sessionClients] of clients.entries()) {
          sessionClients.forEach(ws => {
            if (ws.readyState === 1) { // OPEN
              ws.close(1001, 'Server shutting down');
            }
          });
        }
        
        // Close the WebSocket server
        wss.close(() => {
          console.log('[WebSocket] Server shutdown complete');
        });
      }
      
      // Clear all tracking
      clients.clear();
      connectionTimes.clear();
      connectionCount = 0;
    },

    // Test-only methods for accessing internal state
    _getInternalState() {
      return { clients, connectionCount, connectionTimes };
    },

    _setInternalState(state) {
      if (state.clients) {
        clients.clear();
        state.clients.forEach((value, key) => {
          clients.set(key, value);
        });
      }
      if (typeof state.connectionCount === 'number') {
        connectionCount = state.connectionCount;
      }
    }
  };
}
import { WebSocketServer, WebSocket } from 'ws';
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

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocket>> = new Map();
  private connectionCount: number = 0;
  private maxConnections: number = 100; // Prevent resource exhaustion
  private maxConnectionsPerSession: number = 5; // Limit per session
  private connectionTimes: Map<WebSocket, number> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: (info) => {
        // Check connection limits first
        if (this.connectionCount >= this.maxConnections) {
          console.log(`[WebSocket] Rejected connection - max connections (${this.maxConnections}) reached`);
          return false;
        }
        
        // Basic verification - in production, you'd want proper auth
        const url = parseUrl(info.req.url || '', true);
        const sessionId = url.query.sessionId as string;
        
        if (!sessionId) {
          console.log('[WebSocket] Rejected connection - no session ID');
          return false;
        }
        
        // Check per-session connection limits
        const sessionConnections = this.clients.get(sessionId)?.size || 0;
        if (sessionConnections >= this.maxConnectionsPerSession) {
          console.log(`[WebSocket] Rejected connection - session ${sessionId} has too many connections (${sessionConnections})`);
          return false;
        }
        
        return true;
      }
    });

    this.wss.on('connection', (ws, req) => {
      const url = parseUrl(req.url || '', true);
      const sessionId = url.query.sessionId as string;

      if (!sessionId) {
        ws.close(1008, 'Session ID required');
        return;
      }

      console.log(`[WebSocket] Client connected for session ${sessionId} (total connections: ${this.connectionCount + 1})`);

      // Track connection time and increment count
      this.connectionTimes.set(ws, Date.now());
      this.connectionCount++;

      // Add client to session group
      if (!this.clients.has(sessionId)) {
        this.clients.set(sessionId, new Set());
      }
      this.clients.get(sessionId)!.add(ws);

      // Send initial connection confirmation
      this.sendToClient(ws, {
        type: 'ping',
        sessionId: parseInt(sessionId),
        data: { message: 'Connected to analysis progress stream' }
      });

      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, sessionId, message);
        } catch (error) {
          console.error('[WebSocket] Invalid message format:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', (code, reason) => {
        console.log(`[WebSocket] Client disconnected from session ${sessionId} (code: ${code}, reason: ${reason?.toString() || 'none'})`);
        this.cleanupConnection(ws, sessionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WebSocket] Client error for session ${sessionId}:`, error.message);
        this.cleanupConnection(ws, sessionId);
      });
    });

    // Start cleanup interval to remove stale connections
    this.startCleanupInterval();
    
    console.log(`[WebSocket] Server initialized on /ws (max connections: ${this.maxConnections}, max per session: ${this.maxConnectionsPerSession})`);
  }
  
  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes
      let cleaned = 0;
      
      // Find and clean up stale connections
      for (const [ws, connectionTime] of this.connectionTimes.entries()) {
        if (now - connectionTime > maxAge && ws.readyState !== WebSocket.OPEN) {
          // Find which session this connection belongs to
          for (const [sessionId, clients] of this.clients.entries()) {
            if (clients.has(ws)) {
              console.log(`[WebSocket] Cleaning up stale connection for session ${sessionId}`);
              this.cleanupConnection(ws, sessionId);
              cleaned++;
              break;
            }
          }
        }
      }
      
      if (cleaned > 0) {
        console.log(`[WebSocket] Cleanup cycle completed - removed ${cleaned} stale connections`);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }
  
  private cleanupConnection(ws: WebSocket, sessionId: string) {
    // Remove from session clients
    this.clients.get(sessionId)?.delete(ws);
    
    // Clean up empty session groups
    if (this.clients.get(sessionId)?.size === 0) {
      this.clients.delete(sessionId);
      console.log(`[WebSocket] Cleaned up empty session group: ${sessionId}`);
    }
    
    // Remove connection tracking
    if (this.connectionTimes.has(ws)) {
      this.connectionTimes.delete(ws);
      this.connectionCount--;
      console.log(`[WebSocket] Connection count decreased to ${this.connectionCount}`);
    }
  }

  private handleClientMessage(ws: WebSocket, sessionId: string, message: any) {
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, {
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
        this.sendToClient(ws, {
          type: 'ping',
          sessionId: parseInt(sessionId),
          data: { message: 'Subscribed to progress updates' }
        });
        break;
        
      default:
        console.log(`[WebSocket] Unknown message type: ${message.type}`);
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error.message);
        // If send fails, the connection might be stale - clean it up
        ws.terminate();
      }
    } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      // Remove closed connections from tracking
      for (const [sessionId, clients] of this.clients.entries()) {
        if (clients.has(ws)) {
          this.cleanupConnection(ws, sessionId);
          break;
        }
      }
    }
  }

  // Broadcast progress update to all clients watching a session
  broadcastProgress(sessionId: number, update: ProgressUpdate) {
    const sessionClients = this.clients.get(sessionId.toString());
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
      this.sendToClient(ws, message);
    });
  }

  // Broadcast completion to all clients watching a session
  broadcastComplete(sessionId: number, result: any) {
    const sessionClients = this.clients.get(sessionId.toString());
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
      this.sendToClient(ws, message);
    });
  }

  // Broadcast error to all clients watching a session
  broadcastError(sessionId: number, error: any) {
    const sessionClients = this.clients.get(sessionId.toString());
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
      this.sendToClient(ws, message);
    });
  }

  // Get connection status for debugging
  getConnectionStatus() {
    const totalConnections = Array.from(this.clients.values())
      .reduce((total, sessionClients) => total + sessionClients.size, 0);
    
    return {
      activeSessions: this.clients.size,
      totalConnections,
      connectionCount: this.connectionCount,
      maxConnections: this.maxConnections,
      maxPerSession: this.maxConnectionsPerSession,
      sessionDetails: Array.from(this.clients.entries()).map(([sessionId, clients]) => {
        // Get connection ages for this session
        const connectionAges = Array.from(clients.values())
          .map(ws => {
            const connectTime = this.connectionTimes.get(ws);
            return connectTime ? Date.now() - connectTime : 0;
          })
          .sort((a, b) => b - a); // Sort by age, oldest first
        
        return {
          sessionId,
          clientCount: clients.size,
          oldestConnectionAge: connectionAges[0] || 0,
          averageConnectionAge: connectionAges.length > 0 
            ? Math.round(connectionAges.reduce((sum, age) => sum + age, 0) / connectionAges.length)
            : 0
        };
      })
    };
  }
  
  // Graceful shutdown
  shutdown() {
    console.log('[WebSocket] Starting graceful shutdown...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.wss) {
      // Close all client connections
      for (const [sessionId, clients] of this.clients.entries()) {
        clients.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1001, 'Server shutting down');
          }
        });
      }
      
      // Close the WebSocket server
      this.wss.close(() => {
        console.log('[WebSocket] Server shutdown complete');
      });
    }
    
    // Clear all tracking
    this.clients.clear();
    this.connectionTimes.clear();
    this.connectionCount = 0;
  }
}

export const webSocketService = new WebSocketService();
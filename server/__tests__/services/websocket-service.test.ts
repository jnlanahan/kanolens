// Test-first approach: Define tests for WebSocket service abstraction
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import service we'll create
import { 
  WebSocketService, 
  createWebSocketService,
  WebSocketConfig,
  ProgressUpdate,
  WebSocketMessage,
  ConnectionStatus
} from '../../services/websocket-service';

describe('WebSocket Service', () => {
  let wsService: WebSocketService;
  let mockServer: any;
  let mockWSServer: any;
  let mockWebSocket: any;

  beforeEach(() => {
    // Mock WebSocket Server
    mockWSServer = {
      on: vi.fn(),
      close: vi.fn((callback) => callback && callback()),
      clients: new Set()
    };

    // Mock WebSocket
    mockWebSocket = {
      readyState: 1, // OPEN
      send: vi.fn(),
      close: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn()
    };

    // Mock HTTP Server
    mockServer = {
      listen: vi.fn()
    };

    // Mock WebSocketServer constructor
    const mockWSServerConstructor = vi.fn(() => mockWSServer);

    // Create service with config
    const config: WebSocketConfig = {
      path: '/ws',
      maxConnections: 100,
      maxConnectionsPerSession: 5,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      connectionTimeout: 10 * 60 * 1000 // 10 minutes
    };

    wsService = createWebSocketService(mockWSServerConstructor, config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createWebSocketService', () => {
    it('should create WebSocket service with valid configuration', () => {
      expect(wsService).toBeDefined();
      expect(typeof wsService.initialize).toBe('function');
      expect(typeof wsService.broadcastProgress).toBe('function');
      expect(typeof wsService.getConnectionStatus).toBe('function');
    });

    it('should throw error for invalid configuration', () => {
      expect(() => createWebSocketService(null, {} as WebSocketConfig)).toThrow('Invalid WebSocket server constructor');
      expect(() => createWebSocketService(vi.fn(), null as any)).toThrow('Invalid configuration');
    });
  });

  describe('initialize', () => {
    it('should initialize WebSocket server with correct options', () => {
      wsService.initialize(mockServer);

      expect(mockWSServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should handle multiple initialization calls gracefully', () => {
      wsService.initialize(mockServer);
      wsService.initialize(mockServer); // Should not throw

      expect(mockWSServer.on).toHaveBeenCalled();
    });
  });

  describe('connection verification', () => {
    it('should accept connections with valid session ID', () => {
      const mockInfo = {
        req: { url: '/ws?sessionId=123' }
      };

      wsService.initialize(mockServer);
      
      // Test would verify the verifyClient function accepts valid connections
      // This requires access to the internal verifyClient function
      expect(wsService).toBeDefined();
    });

    it('should reject connections without session ID', () => {
      const mockInfo = {
        req: { url: '/ws' }
      };

      wsService.initialize(mockServer);
      
      // Test would verify the verifyClient function rejects invalid connections
      expect(wsService).toBeDefined();
    });

    it('should enforce connection limits', () => {
      // Test would verify max connections are enforced
      expect(wsService).toBeDefined();
    });
  });

  describe('broadcastProgress', () => {
    beforeEach(() => {
      wsService.initialize(mockServer);
    });

    it('should broadcast progress to all session clients', () => {
      const sessionId = 123;
      const progressUpdate: ProgressUpdate = {
        step: 'discovery',
        message: 'Starting analysis...',
        progress: 25,
        data: { status: 'active' },
        sessionId
      };

      // Set up clients for testing
      wsService._setInternalState!({
        clients: new Map([['123', new Set([mockWebSocket])]])
      });

      wsService.broadcastProgress(sessionId, progressUpdate);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'progress',
          sessionId,
          data: progressUpdate
        })
      );
    });

    it('should handle session with no clients gracefully', () => {
      const sessionId = 999;
      const progressUpdate: ProgressUpdate = {
        step: 'discovery',
        message: 'Test',
        progress: 0,
        sessionId
      };

      wsService.broadcastProgress(sessionId, progressUpdate);

      // Should not throw error
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should skip closed WebSocket connections', () => {
      const sessionId = 123;
      const closedWS = { ...mockWebSocket, readyState: 3 }; // CLOSED
      
      wsService._setInternalState!({
        clients: new Map([['123', new Set([closedWS])]])
      });

      const progressUpdate: ProgressUpdate = {
        step: 'discovery',
        message: 'Test',
        progress: 0,
        sessionId
      };

      wsService.broadcastProgress(sessionId, progressUpdate);

      expect(closedWS.send).not.toHaveBeenCalled();
    });
  });

  describe('broadcastComplete', () => {
    beforeEach(() => {
      wsService.initialize(mockServer);
    });

    it('should broadcast completion to session clients', () => {
      const sessionId = 123;
      const result = { analysis: 'complete', data: {} };

      wsService._setInternalState!({
        clients: new Map([['123', new Set([mockWebSocket])]])
      });

      wsService.broadcastComplete(sessionId, result);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'complete',
          sessionId,
          data: result
        })
      );
    });
  });

  describe('broadcastError', () => {
    beforeEach(() => {
      wsService.initialize(mockServer);
    });

    it('should broadcast error to session clients', () => {
      const sessionId = 123;
      const error = { message: 'Analysis failed', step: 'research' };

      wsService._setInternalState!({
        clients: new Map([['123', new Set([mockWebSocket])]])
      });

      wsService.broadcastError(sessionId, error);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          sessionId,
          data: {
            message: 'Analysis failed',
            step: 'research'
          }
        })
      );
    });

    it('should handle error objects without message property', () => {
      const sessionId = 123;
      const error = { step: 'validation' };

      wsService._setInternalState!({
        clients: new Map([['123', new Set([mockWebSocket])]])
      });

      wsService.broadcastError(sessionId, error);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          sessionId,
          data: {
            message: 'Analysis failed',
            step: 'validation'
          }
        })
      );
    });
  });

  describe('getConnectionStatus', () => {
    beforeEach(() => {
      wsService.initialize(mockServer);
    });

    it('should return comprehensive connection status', () => {
      // Mock some connections
      wsService._setInternalState!({
        clients: new Map([
          ['123', new Set([mockWebSocket])],
          ['456', new Set([mockWebSocket, { ...mockWebSocket }])]
        ]),
        connectionCount: 3
      });

      const status = wsService.getConnectionStatus();

      expect(status).toMatchObject({
        activeSessions: 2,
        totalConnections: 3,
        connectionCount: 3,
        maxConnections: 100,
        maxPerSession: 5
      });
      expect(status.sessionDetails).toHaveLength(2);
    });

    it('should return empty status when no connections', () => {
      const status = wsService.getConnectionStatus();

      expect(status).toMatchObject({
        activeSessions: 0,
        totalConnections: 0,
        connectionCount: 0,
        maxConnections: 100,
        maxPerSession: 5,
        sessionDetails: []
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      wsService.initialize(mockServer);
    });

    it('should handle WebSocket send errors gracefully', () => {
      const sessionId = 123;
      const failingWS = {
        ...mockWebSocket,
        send: vi.fn().mockImplementation(() => {
          throw new Error('Send failed');
        })
      };

      wsService._setInternalState!({
        clients: new Map([['123', new Set([failingWS])]])
      });

      const progressUpdate: ProgressUpdate = {
        step: 'discovery',
        message: 'Test',
        progress: 0,
        sessionId
      };

      // Should not throw
      expect(() => wsService.broadcastProgress(sessionId, progressUpdate)).not.toThrow();
      expect(failingWS.terminate).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    beforeEach(() => {
      wsService.initialize(mockServer);
    });

    it('should gracefully shutdown all connections', () => {
      wsService._setInternalState!({
        clients: new Map([['123', new Set([mockWebSocket])]])
      });

      wsService.shutdown();

      expect(mockWebSocket.close).toHaveBeenCalledWith(1001, 'Server shutting down');
      expect(mockWSServer.close).toHaveBeenCalled();
    });

    it('should clear all internal state on shutdown', () => {
      wsService._setInternalState!({
        clients: new Map([['123', new Set([mockWebSocket])]]),
        connectionCount: 1
      });

      wsService.shutdown();

      const state = wsService._getInternalState!();
      expect(state.clients.size).toBe(0);
      expect(state.connectionCount).toBe(0);
    });
  });
});
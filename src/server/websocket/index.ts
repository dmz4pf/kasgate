/**
 * WebSocket Manager - Real-time Communication with Widgets
 *
 * Handles Socket.io connections for real-time payment status updates.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { getSessionManager } from '../services/session.js';

// ============================================================
// TYPES
// ============================================================

export interface StatusUpdate {
  type: 'status' | 'confirmations' | 'error';
  sessionId: string;
  status?: string;
  confirmations?: number;
  required?: number;
  error?: string;
}

interface ConnectedClient {
  socket: Socket;
  sessionId: string;
}

// ============================================================
// WEBSOCKET MANAGER CLASS
// ============================================================

export class WebSocketManager {
  private io: SocketServer | null = null;
  private clients: Map<string, ConnectedClient[]> = new Map();

  /**
   * Initialize the WebSocket server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*', // In production, restrict this
        methods: ['GET', 'POST'],
      },
      path: '/ws',
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));

    console.log('[KasGate] WebSocket server initialized');
  }

  /**
   * Broadcast a message to all clients watching a session
   */
  broadcastToSession(sessionId: string, message: StatusUpdate): void {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.length === 0) return;

    for (const client of clients) {
      client.socket.emit('update', message);
    }

    console.log(`[KasGate] Broadcast to ${clients.length} clients for session ${sessionId}`);
  }

  /**
   * Get the count of connected clients for a session
   */
  getClientCount(sessionId: string): number {
    return this.clients.get(sessionId)?.length || 0;
  }

  /**
   * Get total connected clients
   */
  getTotalClients(): number {
    let total = 0;
    for (const clients of this.clients.values()) {
      total += clients.length;
    }
    return total;
  }

  /**
   * Shutdown the WebSocket server
   */
  shutdown(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.clients.clear();
      console.log('[KasGate] WebSocket server shutdown');
    }
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private handleConnection(socket: Socket): void {
    console.log(`[KasGate] WebSocket client connected: ${socket.id}`);

    // Handle session subscription (now requires token - Bug #5 fix)
    socket.on('subscribe', (data: { sessionId: string; token: string } | string) => {
      // Support both old format (string) and new format (object with token)
      if (typeof data === 'string') {
        // Legacy: reject subscription without token
        socket.emit('error', { message: 'Subscription token required. Use { sessionId, token } format.' });
        return;
      }
      this.subscribeToSession(socket, data.sessionId, data.token);
    });

    // Handle unsubscription
    socket.on('unsubscribe', (sessionId: string) => {
      this.unsubscribeFromSession(socket, sessionId);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });

    // Handle ping (keep-alive)
    socket.on('ping', () => {
      socket.emit('pong');
    });
  }

  private subscribeToSession(socket: Socket, sessionId: string, token: string): void {
    const sessionManager = getSessionManager();

    // Verify subscription token (Bug #5 fix)
    if (!sessionManager.verifySubscriptionToken(sessionId, token)) {
      socket.emit('error', { message: 'Invalid subscription token' });
      return;
    }

    // Validate session exists
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    // Add to clients map
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, []);
    }

    const clients = this.clients.get(sessionId)!;

    // Check if already subscribed
    if (clients.some((c) => c.socket.id === socket.id)) {
      return;
    }

    clients.push({ socket, sessionId });

    // Join socket room for this session
    socket.join(sessionId);

    // Send current session state
    socket.emit('session', {
      id: session.id,
      status: session.status,
      confirmations: session.confirmations,
      address: session.address,
      amount: session.amount.toString(),
      expiresAt: session.expiresAt.toISOString(),
    });

    console.log(`[KasGate] Client ${socket.id} subscribed to session ${sessionId}`);
  }

  private unsubscribeFromSession(socket: Socket, sessionId: string): void {
    const clients = this.clients.get(sessionId);
    if (!clients) return;

    const index = clients.findIndex((c) => c.socket.id === socket.id);
    if (index !== -1) {
      clients.splice(index, 1);
    }

    // Remove session from map if no more clients
    if (clients.length === 0) {
      this.clients.delete(sessionId);
    }

    socket.leave(sessionId);

    console.log(`[KasGate] Client ${socket.id} unsubscribed from session ${sessionId}`);
  }

  private handleDisconnect(socket: Socket): void {
    // Remove from all session subscriptions
    for (const [sessionId, clients] of this.clients) {
      const index = clients.findIndex((c) => c.socket.id === socket.id);
      if (index !== -1) {
        clients.splice(index, 1);
        socket.leave(sessionId);
      }

      // Clean up empty session entries
      if (clients.length === 0) {
        this.clients.delete(sessionId);
      }
    }

    console.log(`[KasGate] WebSocket client disconnected: ${socket.id}`);
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let wsManager: WebSocketManager | null = null;

/**
 * Get the singleton WebSocket manager instance
 */
export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

/**
 * Reset the WebSocket manager (for testing)
 */
export function resetWebSocketManager(): void {
  if (wsManager) {
    wsManager.shutdown();
    wsManager = null;
  }
}

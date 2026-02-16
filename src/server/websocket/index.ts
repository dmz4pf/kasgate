/**
 * WebSocket Manager - Real-time Communication with Widgets
 *
 * Handles native WebSocket connections for real-time payment status updates.
 * Uses the 'ws' library, matching the widget's native WebSocket client.
 */

import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { URL } from 'url';
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
  ws: WebSocket;
  id: string;
  sessionId: string;
}

// ============================================================
// WEBSOCKET MANAGER CLASS
// ============================================================

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient[]> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize the WebSocket server on the /ws path
   */
  initialize(httpServer: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });

    // Handle upgrade requests on the /ws path
    httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
      const pathname = this.getPathname(request);

      if (pathname === '/ws') {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit('connection', ws, request);
        });
      } else {
        // Not our path -- destroy the connection
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));

    // Heartbeat: detect and clean up broken connections every 30s
    this.pingInterval = setInterval(() => {
      if (!this.wss) return;
      for (const client of this.wss.clients) {
        if ((client as any).__alive === false) {
          client.terminate();
          continue;
        }
        (client as any).__alive = false;
        client.ping();
      }
    }, 30000);

    console.log('[KasGate] WebSocket server initialized on /ws');
  }

  /**
   * Broadcast a message to all clients watching a session
   */
  broadcastToSession(sessionId: string, message: StatusUpdate): void {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.length === 0) return;

    const payload = JSON.stringify(message);

    for (const client of clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
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
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.wss) {
      // Close all connections
      for (const client of this.wss.clients) {
        client.close(1001, 'Server shutting down');
      }
      this.wss.close();
      this.wss = null;
      this.clients.clear();
      console.log('[KasGate] WebSocket server shutdown');
    }
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private getPathname(request: IncomingMessage): string {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      return url.pathname;
    } catch {
      return request.url || '/';
    }
  }

  private handleConnection(ws: WebSocket): void {
    const clientId = randomUUID();
    (ws as any).__alive = true;
    (ws as any).__id = clientId;

    console.log(`[KasGate] WebSocket client connected: ${clientId}`);

    ws.on('pong', () => {
      (ws as any).__alive = true;
    });

    ws.on('message', (raw: Buffer | string) => {
      try {
        const data = JSON.parse(raw.toString());
        this.handleMessage(ws, clientId, data);
      } catch (error) {
        this.sendTo(ws, { type: 'error', message: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      console.error(`[KasGate] WebSocket error for ${clientId}:`, error.message);
    });
  }

  private handleMessage(ws: WebSocket, clientId: string, data: any): void {
    switch (data.type) {
      case 'subscribe': {
        if (!data.sessionId || !data.token) {
          this.sendTo(ws, {
            type: 'error',
            message: 'Subscription requires sessionId and token',
          });
          return;
        }
        this.subscribeToSession(ws, clientId, data.sessionId, data.token);
        break;
      }

      case 'unsubscribe': {
        if (data.sessionId) {
          this.unsubscribeFromSession(clientId, data.sessionId);
        }
        break;
      }

      case 'ping': {
        this.sendTo(ws, { type: 'pong' });
        break;
      }

      default: {
        this.sendTo(ws, { type: 'error', message: `Unknown message type: ${data.type}` });
      }
    }
  }

  private subscribeToSession(ws: WebSocket, clientId: string, sessionId: string, token: string): void {
    const sessionManager = getSessionManager();

    // Verify subscription token
    if (!sessionManager.verifySubscriptionToken(sessionId, token)) {
      this.sendTo(ws, { type: 'error', message: 'Invalid subscription token' });
      return;
    }

    // Validate session exists
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      this.sendTo(ws, { type: 'error', message: 'Session not found' });
      return;
    }

    // Add to clients map
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, []);
    }

    const clients = this.clients.get(sessionId)!;

    // Check if already subscribed
    if (clients.some((c) => c.id === clientId)) {
      return;
    }

    clients.push({ ws, id: clientId, sessionId });

    // Send current session state
    this.sendTo(ws, {
      type: 'session',
      id: session.id,
      status: session.status,
      confirmations: session.confirmations,
      address: session.address,
      amount: session.amount.toString(),
      expiresAt: session.expiresAt.toISOString(),
    });

    console.log(`[KasGate] Client ${clientId} subscribed to session ${sessionId}`);
  }

  private unsubscribeFromSession(clientId: string, sessionId: string): void {
    const clients = this.clients.get(sessionId);
    if (!clients) return;

    const index = clients.findIndex((c) => c.id === clientId);
    if (index !== -1) {
      clients.splice(index, 1);
    }

    // Remove session from map if no more clients
    if (clients.length === 0) {
      this.clients.delete(sessionId);
    }

    console.log(`[KasGate] Client ${clientId} unsubscribed from session ${sessionId}`);
  }

  private handleDisconnect(clientId: string): void {
    // Remove from all session subscriptions
    for (const [sessionId, clients] of this.clients) {
      const index = clients.findIndex((c) => c.id === clientId);
      if (index !== -1) {
        clients.splice(index, 1);
      }

      // Clean up empty session entries
      if (clients.length === 0) {
        this.clients.delete(sessionId);
      }
    }

    console.log(`[KasGate] WebSocket client disconnected: ${clientId}`);
  }

  private sendTo(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
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

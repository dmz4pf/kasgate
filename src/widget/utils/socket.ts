/**
 * Widget WebSocket Client
 *
 * Uses native WebSocket to connect to the KasGate server's /ws endpoint.
 */

export interface StatusUpdate {
  type: 'status' | 'confirmations' | 'error';
  sessionId: string;
  status?: string;
  confirmations?: number;
  required?: number;
  error?: string;
}

export interface SessionInfo {
  id: string;
  status: string;
  confirmations: number;
  address: string;
  amount: string;
  expiresAt: string;
}

export type SocketEventHandler = {
  onUpdate?: (update: StatusUpdate) => void;
  onSession?: (session: SessionInfo) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
};

export class SocketClient {
  private socket: WebSocket | null = null;
  private serverUrl: string;
  private sessionId: string | null = null;
  private subscriptionToken: string | null = null;
  private handlers: SocketEventHandler = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl.replace(/^http/, 'ws').replace(/\/$/, '');
  }

  setHandlers(handlers: SocketEventHandler): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${this.serverUrl}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[KasGate Widget] WebSocket connected');
        this.reconnectAttempts = 0;
        this.handlers.onConnect?.();

        // Resubscribe if we had a session
        if (this.sessionId && this.subscriptionToken) {
          this.subscribe(this.sessionId, this.subscriptionToken);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[KasGate Widget] Failed to parse message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('[KasGate Widget] WebSocket disconnected');
        this.handlers.onDisconnect?.();
        this.scheduleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('[KasGate Widget] WebSocket error:', error);
        this.handlers.onError?.(new Error('WebSocket connection error'));
      };
    } catch (error) {
      console.error('[KasGate Widget] Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.sessionId = null;
    this.subscriptionToken = null;
  }

  subscribe(sessionId: string, token: string): void {
    this.sessionId = sessionId;
    this.subscriptionToken = token;

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', sessionId, token });
    }
  }

  unsubscribe(sessionId: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', sessionId });
    }

    if (this.sessionId === sessionId) {
      this.sessionId = null;
      this.subscriptionToken = null;
    }
  }

  private send(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'session':
        this.handlers.onSession?.(data as SessionInfo);
        break;

      case 'update':
        this.handlers.onUpdate?.(data as StatusUpdate);
        break;

      case 'status':
      case 'confirmations':
        this.handlers.onUpdate?.(data as StatusUpdate);
        break;

      case 'error':
        this.handlers.onError?.(new Error(data.message || 'Unknown error'));
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('[KasGate Widget] Unknown message type:', data.type);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[KasGate Widget] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[KasGate Widget] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

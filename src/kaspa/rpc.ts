/**
 * Kaspa RPC Client Manager
 *
 * Manages WebSocket RPC connections to Kaspa nodes with:
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring
 * - UTXO subscription management
 */

import { RpcClient, Resolver, Encoding } from '@dfns/kaspa-wasm';
import { getCurrentNetwork } from '../config/network.js';
import {
  RPC_RECONNECT_BASE_MS,
  RPC_RECONNECT_MAX_MS,
} from '../shared/constants.js';
import { ensureKaspaInitialized } from './init.js';
import type { Utxo, UtxoChangedNotification } from './types.js';

// ============================================================
// TYPES
// ============================================================

export type RpcConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface RpcEventHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onUtxoChanged?: (notification: UtxoChangedNotification) => void;
  onBlueScoreChanged?: (blueScore: bigint) => void;
  onError?: (error: Error) => void;
}

// ============================================================
// RPC MANAGER CLASS
// ============================================================

export class RpcManager {
  private client: RpcClient | null = null;
  private state: RpcConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private subscribedAddresses: Set<string> = new Set();
  private handlers: RpcEventHandlers = {};

  constructor() {
    // Initialization happens in connect()
  }

  /**
   * Get current connection state
   */
  getState(): RpcConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: RpcEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  // Fallback RPC URLs when Resolver fails
  // These are public wRPC endpoints (Borsh encoding over WebSocket)
  private static readonly FALLBACK_URLS: Record<string, string[]> = {
    'mainnet': [
      'wss://wrpc.kaspa.org',
      'wss://kaspa.aspectron.org',
      'wss://kaspa-ng.aspectron.org',
    ],
    'testnet-10': [
      'wss://wrpc-tn10.kaspa.org',
      'wss://tn10.kaspa.aspectron.org',
    ],
    'testnet-11': [
      'wss://wrpc-tn11.kaspa.org',
    ],
  };

  /**
   * Connect to the RPC server
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    ensureKaspaInitialized();
    this.setState('connecting');

    const networkId = getCurrentNetwork();

    // Try Resolver first, then fallback URLs
    const resolverError = await this.tryConnectWithResolver(networkId);

    if (resolverError) {
      console.log(`[KasGate] Resolver failed, trying fallback URLs...`);
      const fallbackError = await this.tryConnectWithFallbacks(networkId);

      if (fallbackError) {
        console.error(`[KasGate] All connection methods failed`);
        this.handleConnectionError(fallbackError);
        return;
      }
    }

    this.reconnectAttempts = 0;
    this.setState('connected');
    console.log(`[KasGate] RPC connected to ${networkId}`);

    // Resubscribe to addresses if any
    if (this.subscribedAddresses.size > 0) {
      await this.resubscribeAddresses();
    }

    this.handlers.onConnect?.();
  }

  /**
   * Try connecting using the Resolver
   */
  private async tryConnectWithResolver(networkId: string): Promise<Error | null> {
    try {
      console.log(`[KasGate] Connecting to RPC using Resolver (${networkId})`);

      const resolver = new Resolver();
      this.client = new RpcClient({
        resolver: resolver,
        networkId: networkId,
      });

      this.setupEventHandlers();

      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Resolver timeout (15s)')), 15000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      return null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[KasGate] Resolver connection failed: ${errorMsg}`);
      return error as Error;
    }
  }

  /**
   * Try connecting using fallback URLs
   */
  private async tryConnectWithFallbacks(networkId: string): Promise<Error | null> {
    const urls = RpcManager.FALLBACK_URLS[networkId] || [];

    for (const url of urls) {
      try {
        console.log(`[KasGate] Trying fallback URL: ${url}`);

        this.client = new RpcClient({
          url: url,
          networkId: networkId,
        });

        this.setupEventHandlers();

        const connectPromise = this.client.connect();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout connecting to ${url}`)), 10000)
        );

        await Promise.race([connectPromise, timeoutPromise]);
        console.log(`[KasGate] Connected via fallback: ${url}`);
        return null;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[KasGate] Fallback ${url} failed: ${errorMsg}`);
      }
    }

    return new Error('All fallback URLs failed');
  }

  /**
   * Disconnect from the RPC server
   */
  async disconnect(): Promise<void> {
    this.cancelReconnect();

    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (error) {
        console.error('[KasGate] Error disconnecting RPC:', error);
      }
      this.client = null;
    }

    this.setState('disconnected');
    console.log('[KasGate] RPC disconnected');
  }

  /**
   * Subscribe to UTXO changes for an address
   */
  async subscribeAddress(address: string): Promise<void> {
    this.subscribedAddresses.add(address);

    if (this.client && this.state === 'connected') {
      try {
        await this.client.subscribeUtxosChanged([address]);
        console.log(`[KasGate] Subscribed to UTXO changes for ${address.slice(0, 20)}...`);
      } catch (error) {
        console.error(`[KasGate] Failed to subscribe to ${address}:`, error);
        throw error;
      }
    }
  }

  /**
   * Unsubscribe from UTXO changes for an address
   */
  async unsubscribeAddress(address: string): Promise<void> {
    this.subscribedAddresses.delete(address);

    if (this.client && this.state === 'connected') {
      try {
        await this.client.unsubscribeUtxosChanged([address]);
        console.log(`[KasGate] Unsubscribed from ${address.slice(0, 20)}...`);
      } catch (error) {
        console.error(`[KasGate] Failed to unsubscribe from ${address}:`, error);
      }
    }
  }

  /**
   * Get current blue score (DAA score)
   */
  async getBlueScore(): Promise<bigint> {
    if (!this.client || this.state !== 'connected') {
      throw new Error('RPC not connected');
    }

    const result = await this.client.getSinkBlueScore();
    return BigInt(result.blueScore);
  }

  /**
   * Get UTXOs for an address
   */
  async getUtxos(address: string): Promise<Utxo[]> {
    if (!this.client || this.state !== 'connected') {
      throw new Error('RPC not connected');
    }

    const response = await this.client.getUtxosByAddresses({ addresses: [address] });
    return (response.entries || []).map((entry: any) => ({
      transactionId: entry.outpoint.transactionId,
      index: entry.outpoint.index,
      amount: BigInt(entry.utxoEntry.amount),
      scriptPublicKey: entry.utxoEntry.scriptPublicKey,
      blockDaaScore: BigInt(entry.utxoEntry.blockDaaScore),
      isCoinbase: entry.utxoEntry.isCoinbase,
    }));
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private setState(state: RpcConnectionState): void {
    this.state = state;
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // Set up UTXO changed event listener
    this.client.addEventListener('utxos-changed', (event: any) => {
      const notification: UtxoChangedNotification = {
        added: (event.added || []).map(this.mapUtxo),
        removed: (event.removed || []).map(this.mapUtxo),
      };
      this.handlers.onUtxoChanged?.(notification);
    });

    // Set up blue score changed event listener
    this.client.addEventListener('sink-blue-score-changed', (event: any) => {
      this.handlers.onBlueScoreChanged?.(BigInt(event.sinkBlueScore));
    });

    // Set up connect/disconnect handlers
    this.client.addEventListener('connect', () => {
      console.log('[KasGate] RPC connected');
    });

    this.client.addEventListener('disconnect', () => {
      console.log('[KasGate] RPC disconnected');
      this.handlers.onDisconnect?.();
    });
  }

  private mapUtxo(entry: any): Utxo {
    return {
      transactionId: entry.outpoint?.transactionId || entry.transactionId,
      index: entry.outpoint?.index || entry.index || 0,
      amount: BigInt(entry.utxoEntry?.amount || entry.amount || 0),
      scriptPublicKey: entry.utxoEntry?.scriptPublicKey || entry.scriptPublicKey || '',
      blockDaaScore: BigInt(entry.utxoEntry?.blockDaaScore || entry.blockDaaScore || 0),
      isCoinbase: entry.utxoEntry?.isCoinbase || entry.isCoinbase || false,
    };
  }

  private handleConnectionError(error: Error): void {
    this.setState('reconnecting');
    this.handlers.onError?.(error);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(
      RPC_RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts),
      RPC_RECONNECT_MAX_MS
    );

    console.log(`[KasGate] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      this.reconnectAttempts++;

      try {
        await this.connect();
      } catch (error) {
        // Error handling is done in connect()
      }
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;
  }

  private async resubscribeAddresses(): Promise<void> {
    if (!this.client || this.subscribedAddresses.size === 0) return;

    try {
      const addresses = Array.from(this.subscribedAddresses);
      await this.client.subscribeUtxosChanged(addresses);
      console.log(`[KasGate] Resubscribed to ${addresses.length} addresses`);
    } catch (error) {
      console.error('[KasGate] Failed to resubscribe to addresses:', error);
    }
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let rpcManager: RpcManager | null = null;

/**
 * Get the singleton RPC manager instance
 */
export function getRpcManager(): RpcManager {
  if (!rpcManager) {
    rpcManager = new RpcManager();
  }
  return rpcManager;
}

/**
 * Reset the RPC manager (for testing)
 */
export async function resetRpcManager(): Promise<void> {
  if (rpcManager) {
    await rpcManager.disconnect();
    rpcManager = null;
  }
}

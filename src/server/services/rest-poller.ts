/**
 * REST Poller - Fallback UTXO monitoring via REST API
 *
 * Used when WebSocket RPC is unavailable or unreliable.
 * Polls the Kaspa REST API for UTXO changes.
 */

import { NETWORK_CONFIG, getUtxoApiUrl, getBalanceApiUrl } from '../../config/network.js';
import { REST_POLL_INTERVAL_MS } from '../../shared/constants.js';
import type { Utxo, RestUtxoEntry } from '../../kaspa/types.js';

// ============================================================
// TYPES
// ============================================================

export interface PollerCallback {
  onUtxoChange: (address: string, utxos: Utxo[], previousUtxos: Utxo[]) => void;
  onError?: (error: Error) => void;
}

interface WatchedAddress {
  address: string;
  lastUtxos: Utxo[];
  callback: PollerCallback;
}

// ============================================================
// REST POLLER CLASS
// ============================================================

export class RestPoller {
  private watchedAddresses: Map<string, WatchedAddress> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  /**
   * Start watching an address for UTXO changes
   */
  watch(address: string, callback: PollerCallback): void {
    if (this.watchedAddresses.has(address)) {
      console.log(`[KasGate] Already watching ${address.slice(0, 20)}...`);
      return;
    }

    this.watchedAddresses.set(address, {
      address,
      lastUtxos: [],
      callback,
    });

    console.log(`[KasGate] REST poller watching ${address.slice(0, 20)}...`);

    // Start polling if not already running
    this.startPolling();
  }

  /**
   * Stop watching an address
   */
  unwatch(address: string): void {
    this.watchedAddresses.delete(address);
    console.log(`[KasGate] REST poller unwatched ${address.slice(0, 20)}...`);

    // Stop polling if no addresses left
    if (this.watchedAddresses.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Check if an address is being watched
   */
  isWatching(address: string): boolean {
    return this.watchedAddresses.has(address);
  }

  /**
   * Get count of watched addresses
   */
  getWatchedCount(): number {
    return this.watchedAddresses.size;
  }

  /**
   * Stop all polling
   */
  stop(): void {
    this.stopPolling();
    this.watchedAddresses.clear();
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private startPolling(): void {
    if (this.pollInterval) return;

    console.log(`[KasGate] Starting REST poller (interval: ${REST_POLL_INTERVAL_MS}ms)`);

    this.pollInterval = setInterval(() => {
      this.pollAll();
    }, REST_POLL_INTERVAL_MS);

    // Do an immediate poll
    this.pollAll();
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[KasGate] REST poller stopped');
    }
  }

  private async pollAll(): Promise<void> {
    if (this.isPolling || this.watchedAddresses.size === 0) return;

    this.isPolling = true;

    try {
      const promises = Array.from(this.watchedAddresses.values()).map(
        (watched) => this.pollAddress(watched)
      );

      await Promise.allSettled(promises);
    } finally {
      this.isPolling = false;
    }
  }

  private async pollAddress(watched: WatchedAddress): Promise<void> {
    try {
      const utxos = await this.fetchUtxos(watched.address);

      // Check for changes
      if (this.hasUtxoChanges(watched.lastUtxos, utxos)) {
        const previousUtxos = watched.lastUtxos;
        watched.lastUtxos = utxos;

        watched.callback.onUtxoChange(watched.address, utxos, previousUtxos);
      }
    } catch (error) {
      console.error(`[KasGate] REST poll error for ${watched.address.slice(0, 20)}:`, error);
      watched.callback.onError?.(error as Error);
    }
  }

  private async fetchUtxos(address: string): Promise<Utxo[]> {
    const url = getUtxoApiUrl(address);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`REST API error: ${response.status} ${response.statusText}`);
    }

    const data: RestUtxoEntry[] = await response.json();

    return data.map((entry) => ({
      transactionId: entry.outpoint.transactionId,
      index: entry.outpoint.index,
      amount: BigInt(entry.utxoEntry.amount),
      scriptPublicKey: entry.utxoEntry.scriptPublicKey.scriptPublicKey,
      blockDaaScore: BigInt(entry.utxoEntry.blockDaaScore),
      isCoinbase: entry.utxoEntry.isCoinbase,
    }));
  }

  private hasUtxoChanges(previous: Utxo[], current: Utxo[]): boolean {
    if (previous.length !== current.length) return true;

    // Create a set of UTXO identifiers for comparison
    const prevSet = new Set(
      previous.map((u) => `${u.transactionId}:${u.index}`)
    );

    for (const utxo of current) {
      if (!prevSet.has(`${utxo.transactionId}:${utxo.index}`)) {
        return true;
      }
    }

    return false;
  }
}

// ============================================================
// BALANCE FETCH UTILITY
// ============================================================

/**
 * Fetch balance for an address via REST API
 */
export async function fetchBalance(address: string): Promise<bigint> {
  const url = getBalanceApiUrl(address);

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`REST API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return BigInt(data.balance || '0');
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let restPoller: RestPoller | null = null;

/**
 * Get the singleton REST poller instance
 */
export function getRestPoller(): RestPoller {
  if (!restPoller) {
    restPoller = new RestPoller();
  }
  return restPoller;
}

/**
 * Reset the REST poller (for testing)
 */
export function resetRestPoller(): void {
  if (restPoller) {
    restPoller.stop();
    restPoller = null;
  }
}

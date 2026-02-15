/**
 * Payment Monitor - Hybrid RPC/REST UTXO Monitoring
 *
 * Monitors payment addresses for incoming transactions.
 * Uses RPC WebSocket when available, falls back to REST polling.
 */

import { getRpcManager, RpcManager } from '../../kaspa/rpc.js';
import { getRestPoller, RestPoller } from './rest-poller.js';
import type { Utxo, UtxoChangedNotification } from '../../kaspa/types.js';

// ============================================================
// TYPES
// ============================================================

export interface PaymentCallback {
  onPaymentDetected: (address: string, txId: string, amount: bigint, utxos: Utxo[]) => void;
  onError?: (error: Error) => void;
}

interface MonitoredAddress {
  address: string;
  expectedAmount: bigint;
  callback: PaymentCallback;
  useRpc: boolean;
  detected: boolean; // Guard against double-detection from RPC + REST
}

// ============================================================
// PAYMENT MONITOR CLASS
// ============================================================

export class PaymentMonitor {
  private rpcManager: RpcManager;
  private restPoller: RestPoller;
  private monitoredAddresses: Map<string, MonitoredAddress> = new Map();
  // Bug #1 fix: Map script public key to address for efficient UTXO matching
  private scriptToAddress: Map<string, string> = new Map();
  private useRpcPrimary = true;

  constructor() {
    this.rpcManager = getRpcManager();
    this.restPoller = getRestPoller();

    // Set up RPC handlers
    this.rpcManager.setHandlers({
      onUtxoChanged: (notification) => this.handleRpcUtxoChange(notification),
      onDisconnect: () => this.handleRpcDisconnect(),
      onConnect: () => this.handleRpcConnect(),
    });
  }

  /**
   * Start monitoring an address for payments
   */
  async monitor(
    address: string,
    expectedAmount: bigint,
    callback: PaymentCallback
  ): Promise<void> {
    if (this.monitoredAddresses.has(address)) {
      console.log(`[KasGate] Already monitoring ${address.slice(0, 20)}...`);
      return;
    }

    const useRpc = this.useRpcPrimary && this.rpcManager.isConnected();

    this.monitoredAddresses.set(address, {
      address,
      expectedAmount,
      callback,
      useRpc,
      detected: false,
    });

    console.log(`[KasGate] Monitoring ${address.slice(0, 20)}... (RPC: ${useRpc})`);

    // Always start REST polling as a reliable baseline
    this.startRestPolling(address);

    if (useRpc) {
      try {
        await this.rpcManager.subscribeAddress(address);
        this.populateScriptMapping(address);
      } catch (error) {
        console.error('[KasGate] RPC subscription failed (REST already active):', error);
      }
    }
  }

  /**
   * Populate the scriptToAddress map for fallback UTXO matching (Bug #1 fix)
   * This is async but we don't await it - it runs in background
   */
  private async populateScriptMapping(address: string): Promise<void> {
    try {
      if (!this.rpcManager.isConnected()) return;

      const utxos = await this.rpcManager.getUtxos(address);
      if (utxos.length > 0) {
        // All UTXOs for an address share the same scriptPublicKey
        const scriptPubKey = utxos[0].scriptPublicKey;
        if (scriptPubKey) {
          this.scriptToAddress.set(scriptPubKey, address);
          console.log(`[KasGate] Mapped scriptPubKey for ${address.slice(0, 20)}...`);
        }
      }
    } catch (error) {
      // Non-critical - UTXO notifications should include address anyway
      console.debug(`[KasGate] Could not populate script mapping for ${address.slice(0, 20)}:`, error);
    }
  }

  /**
   * Stop monitoring an address
   */
  async unmonitor(address: string): Promise<void> {
    const monitored = this.monitoredAddresses.get(address);
    if (!monitored) return;

    this.monitoredAddresses.delete(address);

    // Clean up scriptToAddress mapping
    for (const [script, addr] of this.scriptToAddress) {
      if (addr === address) {
        this.scriptToAddress.delete(script);
        break;
      }
    }

    // Always clean up both RPC and REST (since both may be active)
    if (monitored.useRpc) {
      await this.rpcManager.unsubscribeAddress(address);
    }
    this.restPoller.unwatch(address);

    console.log(`[KasGate] Stopped monitoring ${address.slice(0, 20)}...`);
  }

  /**
   * Check if an address is being monitored
   */
  isMonitoring(address: string): boolean {
    return this.monitoredAddresses.has(address);
  }

  /**
   * Get the current blue score (DAA score)
   */
  async getBlueScore(): Promise<bigint> {
    if (this.rpcManager.isConnected()) {
      return this.rpcManager.getBlueScore();
    }

    // Fallback: fetch from REST API
    const response = await fetch(`${process.env.KASPA_API_URL || 'https://api-tn10.kaspa.org'}/info/virtual-chain-blue-score`);
    const data = await response.json();
    return BigInt(data.blueScore);
  }

  /**
   * Initialize the monitor (connect to RPC)
   */
  async initialize(): Promise<void> {
    try {
      await this.rpcManager.connect();

      // Check if connection actually succeeded (connect() doesn't throw on failure)
      if (!this.rpcManager.isConnected()) {
        console.warn('[KasGate] RPC connection failed, using REST fallback');
        this.useRpcPrimary = false;
      } else {
        console.log('[KasGate] Payment monitor initialized with RPC');
      }
    } catch (error) {
      console.warn('[KasGate] RPC connection error, using REST fallback:', error);
      this.useRpcPrimary = false;
    }
  }

  /**
   * Shutdown the monitor
   */
  async shutdown(): Promise<void> {
    // Stop all monitoring
    for (const address of this.monitoredAddresses.keys()) {
      await this.unmonitor(address);
    }

    // Disconnect RPC
    await this.rpcManager.disconnect();

    // Stop REST poller
    this.restPoller.stop();

    console.log('[KasGate] Payment monitor shutdown');
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private handleRpcUtxoChange(notification: UtxoChangedNotification): void {
    // Bug #1 fix: Group UTXOs by address for efficient processing
    // RPC notification includes address in UTXO entries

    // Group added UTXOs by their address
    const utxosByAddress = new Map<string, typeof notification.added>();

    for (const utxo of notification.added) {
      // Try to get address from UTXO (preferred - from RPC notification)
      let address = utxo.address;

      // Fallback: lookup by scriptPublicKey if address not included
      if (!address) {
        address = this.scriptToAddress.get(utxo.scriptPublicKey);
      }

      if (!address) {
        // Unknown address - not one we're monitoring
        continue;
      }

      // Only process if we're monitoring this address
      if (!this.monitoredAddresses.has(address)) {
        continue;
      }

      // Group UTXOs by address
      if (!utxosByAddress.has(address)) {
        utxosByAddress.set(address, []);
      }
      utxosByAddress.get(address)!.push(utxo);
    }

    // Process each address's UTXOs
    for (const [address, utxos] of utxosByAddress) {
      const monitored = this.monitoredAddresses.get(address);
      if (monitored) {
        this.checkUtxoForAddress(address, monitored, utxos);
      }
    }
  }

  private async checkUtxoForAddress(
    address: string,
    monitored: MonitoredAddress,
    utxos: Utxo[]
  ): Promise<void> {
    // Bug #13 fix: Filter out UTXOs with DAA score of 0 (still in mempool)
    // UTXOs need at least 1 DAA score to be considered (orphan protection)
    const confirmedUtxos = utxos.filter((u) => u.blockDaaScore > 0n);

    if (confirmedUtxos.length === 0 && utxos.length > 0) {
      console.log(`[KasGate] Payment for ${address.slice(0, 20)} still in mempool, waiting for block inclusion`);
      return;
    }

    // Calculate total amount from confirmed UTXOs only
    const totalAmount = confirmedUtxos.reduce((sum, u) => sum + u.amount, 0n);

    if (totalAmount >= monitored.expectedAmount) {
      // Guard against double-detection (both RPC and REST may fire)
      if (monitored.detected) return;
      monitored.detected = true;

      const txId = confirmedUtxos[0].transactionId;
      console.log(`[KasGate] Payment detected for ${address.slice(0, 20)}: ${totalAmount} sompi (tx: ${txId.slice(0, 12)}...)`);

      monitored.callback.onPaymentDetected(address, txId, totalAmount, confirmedUtxos);
    }
  }

  private handleRpcDisconnect(): void {
    console.log('[KasGate] RPC disconnected, switching to REST fallback');

    // Switch all RPC-monitored addresses to REST
    for (const [address, monitored] of this.monitoredAddresses) {
      if (monitored.useRpc) {
        this.switchToRest(address);
      }
    }
  }

  private handleRpcConnect(): void {
    console.log('[KasGate] RPC reconnected, switching back from REST');

    // Switch REST-monitored addresses back to RPC
    for (const [address, monitored] of this.monitoredAddresses) {
      if (!monitored.useRpc) {
        this.switchToRpc(address);
      }
    }
  }

  private async switchToRest(address: string): Promise<void> {
    const monitored = this.monitoredAddresses.get(address);
    if (!monitored) return;

    monitored.useRpc = false;
    this.startRestPolling(address);
  }

  private async switchToRpc(address: string): Promise<void> {
    const monitored = this.monitoredAddresses.get(address);
    if (!monitored) return;

    // Unwatch from REST
    this.restPoller.unwatch(address);

    // Subscribe via RPC
    try {
      await this.rpcManager.subscribeAddress(address);
      monitored.useRpc = true;
    } catch (error) {
      console.error('[KasGate] Failed to switch to RPC, staying with REST:', error);
    }
  }

  private startRestPolling(address: string): void {
    const monitored = this.monitoredAddresses.get(address);
    if (!monitored) return;

    this.restPoller.watch(address, {
      onUtxoChange: (addr, utxos, previousUtxos) => {
        // Find new UTXOs
        const prevSet = new Set(previousUtxos.map((u) => `${u.transactionId}:${u.index}`));
        const newUtxos = utxos.filter((u) => !prevSet.has(`${u.transactionId}:${u.index}`));

        if (newUtxos.length > 0) {
          this.checkUtxoForAddress(addr, monitored, newUtxos);
        }
      },
      onError: (error) => {
        monitored.callback.onError?.(error);
      },
    });
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let paymentMonitor: PaymentMonitor | null = null;

/**
 * Get the singleton payment monitor instance
 */
export function getPaymentMonitor(): PaymentMonitor {
  if (!paymentMonitor) {
    paymentMonitor = new PaymentMonitor();
  }
  return paymentMonitor;
}

/**
 * Reset the payment monitor (for testing)
 */
export async function resetPaymentMonitor(): Promise<void> {
  if (paymentMonitor) {
    await paymentMonitor.shutdown();
    paymentMonitor = null;
  }
}

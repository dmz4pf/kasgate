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
}

// ============================================================
// PAYMENT MONITOR CLASS
// ============================================================

export class PaymentMonitor {
  private rpcManager: RpcManager;
  private restPoller: RestPoller;
  private monitoredAddresses: Map<string, MonitoredAddress> = new Map();
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
    });

    console.log(`[KasGate] Monitoring ${address.slice(0, 20)}... (RPC: ${useRpc})`);

    if (useRpc) {
      try {
        await this.rpcManager.subscribeAddress(address);
      } catch (error) {
        console.error('[KasGate] RPC subscription failed, falling back to REST:', error);
        await this.switchToRest(address);
      }
    } else {
      this.startRestPolling(address);
    }
  }

  /**
   * Stop monitoring an address
   */
  async unmonitor(address: string): Promise<void> {
    const monitored = this.monitoredAddresses.get(address);
    if (!monitored) return;

    this.monitoredAddresses.delete(address);

    if (monitored.useRpc) {
      await this.rpcManager.unsubscribeAddress(address);
    } else {
      this.restPoller.unwatch(address);
    }

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
      console.log('[KasGate] Payment monitor initialized with RPC');
    } catch (error) {
      console.warn('[KasGate] RPC connection failed, using REST fallback:', error);
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
    // Process added UTXOs
    for (const utxo of notification.added) {
      // Find which monitored address this UTXO belongs to
      for (const [address, monitored] of this.monitoredAddresses) {
        // Check if this UTXO was sent to the monitored address
        // We need to check the script public key matches
        this.checkUtxoForAddress(address, monitored, [utxo]);
      }
    }
  }

  private async checkUtxoForAddress(
    address: string,
    monitored: MonitoredAddress,
    utxos: Utxo[]
  ): Promise<void> {
    // Calculate total amount from UTXOs
    const totalAmount = utxos.reduce((sum, u) => sum + u.amount, 0n);

    if (totalAmount >= monitored.expectedAmount) {
      // Get the first UTXO's transaction ID
      const txId = utxos[0].transactionId;

      console.log(`[KasGate] Payment detected for ${address.slice(0, 20)}: ${totalAmount} sompi`);

      monitored.callback.onPaymentDetected(address, txId, totalAmount, utxos);
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

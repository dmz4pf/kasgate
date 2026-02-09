/**
 * Kaspa Explorer API Client
 *
 * Fallback for payment detection when RPC is unavailable.
 * Uses the public Kaspa Explorer REST API to poll for transactions.
 */

import { getCurrentNetwork } from '../config/network.js';

// ============================================================
// TYPES
// ============================================================

export interface ExplorerBalance {
  address: string;
  balance: number; // in sompi
}

export interface ExplorerTransaction {
  transaction_id: string;
  block_time: number;
  is_accepted: boolean;
  inputs: Array<{
    previous_outpoint_hash: string;
    previous_outpoint_index: number;
    signature_script: string;
    previous_outpoint_address?: string;
    previous_outpoint_amount?: number;
  }>;
  outputs: Array<{
    script_public_key_address: string;
    amount: number;
  }>;
}

export interface AddressTransaction {
  transactionId: string;
  amount: bigint; // amount received at this address
  blockTime: number;
  isAccepted: boolean;
}

// ============================================================
// EXPLORER API CLIENT
// ============================================================

export class ExplorerClient {
  private baseUrl: string;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private watchedAddresses: Map<string, {
    lastKnownBalance: bigint;
    onPayment: (tx: AddressTransaction) => void;
  }> = new Map();

  constructor() {
    this.baseUrl = this.getBaseUrl();
  }

  private getBaseUrl(): string {
    const network = getCurrentNetwork();
    switch (network) {
      case 'mainnet':
        return 'https://api.kaspa.org';
      case 'testnet-10':
        return 'https://api-tn10.kaspa.org';
      case 'testnet-11':
        return 'https://api-tn11.kaspa.org';
      default:
        return 'https://api-tn10.kaspa.org';
    }
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<bigint> {
    try {
      const response = await fetch(`${this.baseUrl}/addresses/${address}/balance`);
      if (!response.ok) {
        throw new Error(`Explorer API error: ${response.status}`);
      }
      const data: ExplorerBalance = await response.json();
      return BigInt(data.balance);
    } catch (error) {
      console.error(`[KasGate Explorer] Failed to get balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get recent transactions for an address
   */
  async getTransactions(address: string, limit: number = 10): Promise<AddressTransaction[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/addresses/${address}/full-transactions?limit=${limit}`
      );
      if (!response.ok) {
        throw new Error(`Explorer API error: ${response.status}`);
      }
      const transactions: ExplorerTransaction[] = await response.json();

      // Map transactions and calculate amount received at this address
      return transactions.map((tx) => {
        const received = tx.outputs
          .filter((o) => o.script_public_key_address === address)
          .reduce((sum, o) => sum + o.amount, 0);

        return {
          transactionId: tx.transaction_id,
          amount: BigInt(received),
          blockTime: tx.block_time,
          isAccepted: tx.is_accepted,
        };
      });
    } catch (error) {
      console.error(`[KasGate Explorer] Failed to get transactions for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Start watching an address for incoming payments
   * Uses polling as RPC fallback
   */
  async watchAddress(
    address: string,
    onPayment: (tx: AddressTransaction) => void
  ): Promise<void> {
    // Get initial balance
    const initialBalance = await this.getBalance(address);

    this.watchedAddresses.set(address, {
      lastKnownBalance: initialBalance,
      onPayment,
    });

    console.log(`[KasGate Explorer] Watching ${address.slice(0, 25)}... (balance: ${initialBalance})`);

    // Start polling if not already running
    this.startPolling();
  }

  /**
   * Stop watching an address
   */
  unwatchAddress(address: string): void {
    this.watchedAddresses.delete(address);
    console.log(`[KasGate Explorer] Stopped watching ${address.slice(0, 25)}...`);

    // Stop polling if no more addresses
    if (this.watchedAddresses.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Start the polling loop
   */
  private startPolling(): void {
    if (this.pollInterval) return;

    // Poll every 5 seconds
    this.pollInterval = setInterval(() => this.pollAddresses(), 5000);
    console.log('[KasGate Explorer] Started polling for payments');
  }

  /**
   * Stop the polling loop
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[KasGate Explorer] Stopped polling');
    }
  }

  /**
   * Poll all watched addresses for balance changes
   */
  private async pollAddresses(): Promise<void> {
    for (const [address, state] of this.watchedAddresses.entries()) {
      try {
        const currentBalance = await this.getBalance(address);

        if (currentBalance > state.lastKnownBalance) {
          // Balance increased - payment received!
          const amountReceived = currentBalance - state.lastKnownBalance;
          console.log(
            `[KasGate Explorer] Payment detected: ${address.slice(0, 25)}... +${amountReceived} sompi`
          );

          // Get the most recent transaction to get details
          const transactions = await this.getTransactions(address, 1);
          if (transactions.length > 0) {
            state.onPayment(transactions[0]);
          } else {
            // Create a synthetic transaction if we can't get details
            state.onPayment({
              transactionId: 'unknown',
              amount: amountReceived,
              blockTime: Date.now(),
              isAccepted: true,
            });
          }

          // Update the known balance
          state.lastKnownBalance = currentBalance;
        }
      } catch (error) {
        // Log but don't stop polling
        console.error(`[KasGate Explorer] Poll error for ${address.slice(0, 25)}...:`, error);
      }
    }
  }

  /**
   * Check if explorer API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the number of watched addresses
   */
  getWatchedCount(): number {
    return this.watchedAddresses.size;
  }

  /**
   * Stop all watching and cleanup
   */
  shutdown(): void {
    this.stopPolling();
    this.watchedAddresses.clear();
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let explorerClient: ExplorerClient | null = null;

export function getExplorerClient(): ExplorerClient {
  if (!explorerClient) {
    explorerClient = new ExplorerClient();
  }
  return explorerClient;
}

export function resetExplorerClient(): void {
  if (explorerClient) {
    explorerClient.shutdown();
    explorerClient = null;
  }
}

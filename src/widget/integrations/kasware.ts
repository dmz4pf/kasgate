/**
 * Kasware Browser Extension Integration
 *
 * Handles integration with the Kasware wallet browser extension.
 */

// ============================================================
// TYPES
// ============================================================

interface KaswareProvider {
  isKasware: boolean;
  requestAccounts: () => Promise<string[]>;
  getBalance: () => Promise<{ confirmed: number; unconfirmed: number; total: number }>;
  sendKaspa: (toAddress: string, amount: number) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    kasware?: KaswareProvider;
  }
}

// ============================================================
// KASWARE INTEGRATION
// ============================================================

/**
 * Check if Kasware is installed
 */
export function isKaswareInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.kasware?.isKasware;
}

/**
 * Check if Kasware is connected
 */
export async function isKaswareConnected(): Promise<boolean> {
  if (!isKaswareInstalled()) return false;

  try {
    const accounts = await window.kasware!.requestAccounts();
    return accounts.length > 0;
  } catch {
    return false;
  }
}

/**
 * Connect to Kasware wallet
 */
export async function connectKasware(): Promise<string | null> {
  if (!isKaswareInstalled()) {
    throw new Error('Kasware wallet is not installed');
  }

  try {
    const accounts = await window.kasware!.requestAccounts();
    return accounts[0] || null;
  } catch (error) {
    console.error('[KasGate] Failed to connect to Kasware:', error);
    throw error;
  }
}

/**
 * Get Kasware wallet balance
 */
export async function getKaswareBalance(): Promise<bigint> {
  if (!isKaswareInstalled()) {
    throw new Error('Kasware wallet is not installed');
  }

  try {
    const balance = await window.kasware!.getBalance();
    // Kasware returns balance in sompi
    return BigInt(balance.total);
  } catch (error) {
    console.error('[KasGate] Failed to get Kasware balance:', error);
    throw error;
  }
}

/**
 * Send KAS using Kasware wallet
 *
 * @param toAddress - Recipient address
 * @param amountSompi - Amount in sompi
 * @returns Transaction ID
 */
export async function sendWithKasware(
  toAddress: string,
  amountSompi: bigint
): Promise<string> {
  if (!isKaswareInstalled()) {
    throw new Error('Kasware wallet is not installed');
  }

  try {
    // Kasware expects amount in sompi as a number
    const txId = await window.kasware!.sendKaspa(toAddress, Number(amountSompi));
    return txId;
  } catch (error) {
    console.error('[KasGate] Failed to send with Kasware:', error);
    throw error;
  }
}

/**
 * Listen for Kasware account changes
 */
export function onKaswareAccountChange(callback: (accounts: string[]) => void): () => void {
  if (!isKaswareInstalled()) {
    return () => {};
  }

  const handler = (accounts: string[]) => callback(accounts);
  window.kasware!.on('accountsChanged', handler);

  return () => {
    window.kasware!.removeListener('accountsChanged', handler);
  };
}

/**
 * Kasware integration helper class
 */
export class KaswareIntegration {
  private connectedAddress: string | null = null;
  private accountChangeListener: (() => void) | null = null;

  /**
   * Check if Kasware is available
   */
  isAvailable(): boolean {
    return isKaswareInstalled();
  }

  /**
   * Connect to the wallet
   */
  async connect(): Promise<string> {
    const address = await connectKasware();
    if (!address) {
      throw new Error('No accounts found');
    }

    this.connectedAddress = address;

    // Listen for account changes
    this.accountChangeListener = onKaswareAccountChange((accounts) => {
      this.connectedAddress = accounts[0] || null;
    });

    return address;
  }

  /**
   * Disconnect from the wallet
   */
  disconnect(): void {
    this.connectedAddress = null;
    this.accountChangeListener?.();
    this.accountChangeListener = null;
  }

  /**
   * Get connected address
   */
  getAddress(): string | null {
    return this.connectedAddress;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<bigint> {
    return getKaswareBalance();
  }

  /**
   * Send payment
   */
  async send(toAddress: string, amountSompi: bigint): Promise<string> {
    return sendWithKasware(toAddress, amountSompi);
  }
}

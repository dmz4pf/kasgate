/**
 * Network Configuration - The single source of truth for all network-specific settings
 *
 * CRITICAL: Everything network-specific comes from here.
 * Switch networks by changing KASPA_NETWORK env variable.
 */

import 'dotenv/config';

export type NetworkId = 'mainnet' | 'testnet-10';

export interface NetworkConfig {
  networkId: NetworkId;
  rpcUrl: string;
  explorerUrl: string;
  apiUrl: string;
  addressPrefix: string;
  confirmations: number;
}

/**
 * Network configurations for all supported networks
 */
export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  'mainnet': {
    networkId: 'mainnet',
    // RPC URL - just hostname, kaspa-wasm adds the correct port (17110 for Borsh)
    rpcUrl: 'mainnet.kaspa.org',
    explorerUrl: 'https://explorer.kaspa.org',
    apiUrl: 'https://api.kaspa.org',
    addressPrefix: 'kaspa',
    confirmations: 10,
  },
  'testnet-10': {
    networkId: 'testnet-10',
    // RPC URL - just hostname, kaspa-wasm adds the correct port (17210 for Borsh testnet-10)
    rpcUrl: 'tn10.kaspa.org',
    explorerUrl: 'https://explorer-tn10.kaspa.org',
    apiUrl: 'https://api-tn10.kaspa.org',
    addressPrefix: 'kaspatest',
    confirmations: 10,
  },
};

/**
 * Get the current network from environment
 */
export function getCurrentNetwork(): NetworkId {
  const network = process.env.KASPA_NETWORK || 'testnet-10';

  if (!isValidNetwork(network)) {
    console.warn(`Invalid network "${network}", defaulting to testnet-10`);
    return 'testnet-10';
  }

  return network;
}

/**
 * Type guard to check if a string is a valid network ID
 */
export function isValidNetwork(network: string): network is NetworkId {
  return network === 'mainnet' || network === 'testnet-10';
}

/**
 * The active network configuration
 * This is the main export that all other modules should use
 */
export const NETWORK_CONFIG: NetworkConfig = NETWORKS[getCurrentNetwork()];

/**
 * Helper to get explorer URL for a transaction
 */
export function getTransactionExplorerUrl(txId: string): string {
  return `${NETWORK_CONFIG.explorerUrl}/txs/${txId}`;
}

/**
 * Helper to get explorer URL for an address
 */
export function getAddressExplorerUrl(address: string): string {
  return `${NETWORK_CONFIG.explorerUrl}/addresses/${address}`;
}

/**
 * Helper to get the REST API endpoint for an address's UTXOs
 */
export function getUtxoApiUrl(address: string): string {
  return `${NETWORK_CONFIG.apiUrl}/addresses/${address}/utxos`;
}

/**
 * Helper to get the REST API endpoint for address balance
 */
export function getBalanceApiUrl(address: string): string {
  return `${NETWORK_CONFIG.apiUrl}/addresses/${address}/balance`;
}

/**
 * Check if we're on mainnet
 */
export function isMainnet(): boolean {
  return NETWORK_CONFIG.networkId === 'mainnet';
}

/**
 * Check if we're on testnet
 */
export function isTestnet(): boolean {
  return NETWORK_CONFIG.networkId === 'testnet-10';
}

// Log the active network on import (for debugging)
console.log(`[KasGate] Network: ${NETWORK_CONFIG.networkId} (${NETWORK_CONFIG.addressPrefix}:...)`);

/**
 * Kaspa WASM SDK Initialization
 *
 * Handles loading and initializing the kaspa WASM module.
 * This must be called before using any kaspa functionality.
 */

// WebSocket shim for Node.js (required by kaspa-wasm RPC)
import pkg from 'websocket';
const { w3cwebsocket } = pkg;
(globalThis as any).WebSocket = w3cwebsocket;

import * as kaspaWasm from '@dfns/kaspa-wasm';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the Kaspa WASM module
 *
 * This function is idempotent - calling it multiple times is safe.
 * The initialization only happens once.
 *
 * @returns Promise that resolves when initialization is complete
 */
export async function initKaspa(): Promise<void> {
  // Already initialized
  if (isInitialized) {
    return;
  }

  // Initialization in progress - return existing promise
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = (async () => {
    try {
      console.log('[KasGate] Initializing Kaspa WASM...');

      // The kaspa-wasm package may have an init function for panic hooks
      if (typeof (kaspaWasm as any).initConsolePanicHook === 'function') {
        (kaspaWasm as any).initConsolePanicHook();
      }

      isInitialized = true;
      console.log('[KasGate] Kaspa WASM initialized successfully');
    } catch (error) {
      initPromise = null;
      console.error('[KasGate] Failed to initialize Kaspa WASM:', error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Check if Kaspa WASM is initialized
 */
export function isKaspaInitialized(): boolean {
  return isInitialized;
}

/**
 * Ensure Kaspa is initialized before proceeding
 *
 * @throws Error if not initialized
 */
export function ensureKaspaInitialized(): void {
  if (!isInitialized) {
    throw new Error('Kaspa WASM not initialized. Call initKaspa() first.');
  }
}

/**
 * Get the kaspa module (throws if not initialized)
 */
export function getKaspaModule(): typeof kaspaWasm {
  ensureKaspaInitialized();
  return kaspaWasm;
}

// Export kaspa module for direct access when needed
export { kaspaWasm };

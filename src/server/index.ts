/**
 * KasGate Server Entry Point
 *
 * Initializes all services and starts the HTTP server.
 */

import 'dotenv/config';
import { createServer } from 'http';
import { createApp } from './app.js';
import { initDatabase, closeDatabase } from './db/index.js';
import { initKaspa } from '../kaspa/init.js';
import { getPaymentMonitor } from './services/payment-monitor.js';
import { getConfirmationTracker } from './services/confirmation.js';
import { getWebhookService } from './services/webhook.js';
import { getWebSocketManager } from './websocket/index.js';
import { getSessionManager } from './services/session.js';
import { NETWORK_CONFIG } from '../config/network.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

// Store interval handles for cleanup (Bug #6 fix)
let expirationInterval: NodeJS.Timeout | null = null;

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  console.log('[KasGate] Initializing services...');

  // Initialize database
  initDatabase();

  // Initialize Kaspa WASM
  await initKaspa();

  // Initialize payment monitor (non-blocking - connects in background)
  const paymentMonitor = getPaymentMonitor();
  paymentMonitor.initialize().catch((err) => {
    console.warn('[KasGate] Payment monitor init warning:', err.message);
  });

  // Initialize confirmation tracker (non-blocking)
  const confirmationTracker = getConfirmationTracker();
  confirmationTracker.initialize().catch((err) => {
    console.warn('[KasGate] Confirmation tracker init warning:', err.message);
  });

  // Start webhook retry worker
  const webhookService = getWebhookService();
  webhookService.startRetryWorker();

  // Start session expiration worker
  startExpirationWorker();

  console.log('[KasGate] All services initialized');
}

/**
 * Start the session expiration worker (Bug #6 fix: store handle for cleanup)
 */
function startExpirationWorker(): void {
  // Clear existing interval if any
  if (expirationInterval) {
    clearInterval(expirationInterval);
  }

  // Check for expired sessions every minute
  expirationInterval = setInterval(() => {
    const sessionManager = getSessionManager();
    sessionManager.expireOldSessions();
  }, 60000);
}

/**
 * Graceful shutdown handler (Bug #6 fix: clear intervals)
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`[KasGate] Received ${signal}, shutting down gracefully...`);

  try {
    // Clear expiration interval (Bug #6 fix)
    if (expirationInterval) {
      clearInterval(expirationInterval);
      expirationInterval = null;
    }

    // Stop confirmation tracker
    const confirmationTracker = getConfirmationTracker();
    confirmationTracker.stop();

    // Stop webhook service
    const webhookService = getWebhookService();
    webhookService.stopRetryWorker();

    // Stop payment monitor
    const paymentMonitor = getPaymentMonitor();
    await paymentMonitor.shutdown();

    // Stop WebSocket server
    const wsManager = getWebSocketManager();
    wsManager.shutdown();

    // Close database
    closeDatabase();

    console.log('[KasGate] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[KasGate] Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    console.log('='.repeat(50));
    console.log('[KasGate] Starting KasGate Payment Server');
    console.log(`[KasGate] Network: ${NETWORK_CONFIG.networkId}`);
    console.log(`[KasGate] Address Prefix: ${NETWORK_CONFIG.addressPrefix}`);
    console.log('='.repeat(50));

    // Initialize services
    await initializeServices();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize WebSocket
    const wsManager = getWebSocketManager();
    wsManager.initialize(httpServer);

    // Start listening
    httpServer.listen(PORT, HOST, () => {
      console.log('='.repeat(50));
      console.log(`[KasGate] Server running at http://${HOST}:${PORT}`);
      console.log(`[KasGate] API: http://${HOST}:${PORT}/api/v1`);
      console.log(`[KasGate] Widget: http://${HOST}:${PORT}/widget/kasgate.js`);
      console.log(`[KasGate] Health: http://${HOST}:${PORT}/health`);
      console.log('='.repeat(50));
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('[KasGate] Fatal error during startup:', error);
    process.exit(1);
  }
}

// Run
main();

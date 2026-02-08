/**
 * Confirmation Tracker - Blue Score Based Confirmation Tracking
 *
 * Tracks confirmations using Kaspa's DAA (Difficulty Adjustment Algorithm) score.
 * Each DAA score increment represents ~1 second of network time.
 */

import { getPaymentMonitor } from './payment-monitor.js';
import { getSessionManager } from './session.js';
import { getWebhookService } from './webhook.js';
import { getWebSocketManager } from '../websocket/index.js';
import { NETWORK_CONFIG } from '../../config/network.js';
import type { PaymentSession } from '../../kaspa/types.js';

// ============================================================
// TYPES
// ============================================================

interface TrackedPayment {
  sessionId: string;
  txId: string;
  initialBlueScore: bigint;
  targetConfirmations: number;
}

// ============================================================
// CONFIRMATION TRACKER CLASS
// ============================================================

export class ConfirmationTracker {
  private trackedPayments: Map<string, TrackedPayment> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  /**
   * Start tracking confirmations for a payment
   */
  async track(sessionId: string, txId: string): Promise<void> {
    if (this.trackedPayments.has(sessionId)) {
      console.log(`[KasGate] Already tracking ${sessionId}`);
      return;
    }

    const paymentMonitor = getPaymentMonitor();

    // Get the current blue score
    const currentBlueScore = await paymentMonitor.getBlueScore();

    this.trackedPayments.set(sessionId, {
      sessionId,
      txId,
      initialBlueScore: currentBlueScore,
      targetConfirmations: NETWORK_CONFIG.confirmations,
    });

    console.log(`[KasGate] Tracking confirmations for ${sessionId} (initial score: ${currentBlueScore})`);

    // Start checking if not already running
    this.startChecking();
  }

  /**
   * Stop tracking a payment
   */
  untrack(sessionId: string): void {
    this.trackedPayments.delete(sessionId);

    // Stop checking if no more payments to track
    if (this.trackedPayments.size === 0) {
      this.stopChecking();
    }
  }

  /**
   * Get the current confirmation count for a tracked payment
   */
  async getConfirmations(sessionId: string): Promise<number | null> {
    const tracked = this.trackedPayments.get(sessionId);
    if (!tracked) return null;

    const paymentMonitor = getPaymentMonitor();
    const currentBlueScore = await paymentMonitor.getBlueScore();

    return Number(currentBlueScore - tracked.initialBlueScore);
  }

  /**
   * Stop all tracking
   */
  stop(): void {
    this.stopChecking();
    this.trackedPayments.clear();
  }

  /**
   * Initialize the tracker (check existing confirming sessions)
   */
  async initialize(): Promise<void> {
    const sessionManager = getSessionManager();
    const confirmingSessions = sessionManager.getConfirmingSessions();

    for (const session of confirmingSessions) {
      if (session.txId) {
        await this.track(session.id, session.txId);
      }
    }

    console.log(`[KasGate] Confirmation tracker initialized with ${confirmingSessions.length} sessions`);
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private startChecking(): void {
    if (this.checkInterval) return;

    console.log('[KasGate] Starting confirmation checker');

    // Check every second (Kaspa's ~1 second block time)
    this.checkInterval = setInterval(() => {
      this.checkConfirmations();
    }, 1000);
  }

  private stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[KasGate] Stopped confirmation checker');
    }
  }

  private async checkConfirmations(): Promise<void> {
    if (this.isChecking || this.trackedPayments.size === 0) return;

    this.isChecking = true;

    try {
      const paymentMonitor = getPaymentMonitor();
      const currentBlueScore = await paymentMonitor.getBlueScore();

      const sessionManager = getSessionManager();
      const webhookService = getWebhookService();
      const wsManager = getWebSocketManager();

      for (const [sessionId, tracked] of this.trackedPayments) {
        const confirmations = Number(currentBlueScore - tracked.initialBlueScore);

        // Update session confirmations
        sessionManager.updateConfirmations(sessionId, confirmations);

        // Broadcast confirmation update via WebSocket
        wsManager.broadcastToSession(sessionId, {
          type: 'confirmations',
          sessionId,
          confirmations,
          required: tracked.targetConfirmations,
        });

        // Check if confirmed
        if (confirmations >= tracked.targetConfirmations) {
          console.log(`[KasGate] Session ${sessionId} confirmed with ${confirmations} confirmations`);

          // Mark as confirmed
          sessionManager.markConfirmed(sessionId, confirmations);

          // Get updated session
          const session = sessionManager.getSession(sessionId);
          if (session) {
            // Send webhook
            await webhookService.sendWebhook(session, 'payment.confirmed');

            // Broadcast final status
            wsManager.broadcastToSession(sessionId, {
              type: 'status',
              sessionId,
              status: 'confirmed',
              confirmations,
            });
          }

          // Stop tracking this payment
          this.untrack(sessionId);
        }
      }
    } catch (error) {
      console.error('[KasGate] Error checking confirmations:', error);
    } finally {
      this.isChecking = false;
    }
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let confirmationTracker: ConfirmationTracker | null = null;

/**
 * Get the singleton confirmation tracker instance
 */
export function getConfirmationTracker(): ConfirmationTracker {
  if (!confirmationTracker) {
    confirmationTracker = new ConfirmationTracker();
  }
  return confirmationTracker;
}

/**
 * Reset the confirmation tracker (for testing)
 */
export function resetConfirmationTracker(): void {
  if (confirmationTracker) {
    confirmationTracker.stop();
    confirmationTracker = null;
  }
}

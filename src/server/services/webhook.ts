/**
 * Webhook Service - Webhook Delivery and Management
 *
 * Handles webhook registration, delivery, and retry logic.
 * Uses HMAC-SHA256 for payload signing.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, toJson, fromJson, toSqliteDate } from '../db/index.js';
import { WEBHOOK_MAX_RETRIES, WEBHOOK_TIMEOUT_MS, WEBHOOK_RETRY_BASE_MS } from '../../shared/constants.js';
import type { PaymentSession } from '../../kaspa/types.js';
import type { WebhookEvent, WebhookPayload } from '../../shared/validation.js';

// ============================================================
// TYPES
// ============================================================

interface WebhookRow {
  id: string;
  merchant_id: string;
  url: string;
  secret: string;
  events: string;
  active: number;
  created_at: string;
  updated_at: string;
}

interface WebhookLogRow {
  id: string;
  webhook_id: string;
  session_id: string;
  event: string;
  payload: string;
  delivery_id: string | null;  // Bug #14: Unique ID for replay protection
  status_code: number | null;
  response: string | null;
  attempts: number;
  next_retry_at: string | null;
  created_at: string;
  delivered_at: string | null;
}

interface MerchantWebhookInfo {
  webhook_url: string | null;
  webhook_secret: string | null;
}

// ============================================================
// WEBHOOK SERVICE CLASS
// ============================================================

export class WebhookService {
  private retryInterval: NodeJS.Timeout | null = null;

  /**
   * Send a webhook for a payment session
   *
   * Bug #14: Replay protection is implemented via:
   * - Unique deliveryId per webhook delivery (for idempotency)
   * - Timestamp included in HMAC signature (to prevent replay after window)
   * - Merchants should verify timestamp is within 5 minutes of current time
   */
  async sendWebhook(session: PaymentSession, event: WebhookEvent): Promise<void> {
    // Get merchant webhook configuration
    const merchant = queryOne<MerchantWebhookInfo>(
      'SELECT webhook_url, webhook_secret FROM merchants WHERE id = ?',
      [session.merchantId]
    );

    if (!merchant?.webhook_url) {
      console.log(`[KasGate] No webhook configured for merchant ${session.merchantId}`);
      return;
    }

    // Bug #14: Generate unique delivery ID for idempotency/replay protection
    const deliveryId = uuidv4();

    // Create payload
    const payload: WebhookPayload = {
      event,
      sessionId: session.id,
      merchantId: session.merchantId,
      amount: session.amount.toString(),
      address: session.address,
      txId: session.txId,
      confirmations: session.confirmations,
      orderId: session.orderId,
      metadata: session.metadata,
      timestamp: new Date().toISOString(),
      deliveryId, // Bug #14: Unique ID for idempotency
    };

    // Sign the payload (includes timestamp and deliveryId for replay protection)
    const signature = this.signPayload(payload, merchant.webhook_secret || '');

    // Create log entry (Bug #14: store delivery_id for idempotency tracking)
    // webhook_id is null for direct merchant webhooks (vs registered webhooks)
    const logId = uuidv4();
    execute(
      `INSERT INTO webhook_logs (id, webhook_id, session_id, event, payload, delivery_id, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [logId, null, session.id, event, toJson(payload), deliveryId, 0]
    );

    // Attempt delivery
    await this.deliverWebhook(logId, merchant.webhook_url, payload, signature);
  }

  /**
   * Sign a webhook payload with HMAC-SHA256
   */
  signPayload(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Verify a webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Start the retry worker
   */
  startRetryWorker(): void {
    if (this.retryInterval) return;

    console.log('[KasGate] Starting webhook retry worker');

    // Check for retries every 30 seconds
    this.retryInterval = setInterval(() => {
      this.processRetries();
    }, 30000);
  }

  /**
   * Stop the retry worker
   */
  stopRetryWorker(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
      console.log('[KasGate] Stopped webhook retry worker');
    }
  }

  /**
   * Get webhook delivery logs for a session
   */
  getLogsForSession(sessionId: string): WebhookLogRow[] {
    return query<WebhookLogRow>(
      'SELECT * FROM webhook_logs WHERE session_id = ? ORDER BY created_at DESC',
      [sessionId]
    );
  }

  /**
   * Get webhook delivery logs for a merchant (across all sessions)
   */
  getLogsForMerchant(
    merchantId: string,
    options: { limit?: number; offset?: number; event?: string } = {}
  ): { logs: WebhookLogRow[]; total: number } {
    const { limit = 20, offset = 0, event } = options;

    // Build query with optional event filter
    let baseQuery = `
      FROM webhook_logs wl
      INNER JOIN sessions s ON wl.session_id = s.id
      WHERE s.merchant_id = ?
    `;
    const params: (string | number)[] = [merchantId];

    if (event) {
      baseQuery += ' AND wl.event = ?';
      params.push(event);
    }

    // Get total count
    const countResult = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count ${baseQuery}`,
      params
    );
    const total = countResult?.count ?? 0;

    // Get paginated logs
    const logs = query<WebhookLogRow>(
      `SELECT wl.* ${baseQuery} ORDER BY wl.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { logs, total };
  }

  /**
   * Retry a specific webhook delivery
   */
  async retryWebhook(logId: string, merchantId: string): Promise<boolean> {
    // Verify the log belongs to the merchant
    const log = queryOne<WebhookLogRow & { merchant_id: string }>(
      `SELECT wl.*, s.merchant_id
       FROM webhook_logs wl
       INNER JOIN sessions s ON wl.session_id = s.id
       WHERE wl.id = ? AND s.merchant_id = ?`,
      [logId, merchantId]
    );

    if (!log) {
      return false;
    }

    // Reset for retry
    execute(
      `UPDATE webhook_logs
       SET next_retry_at = datetime('now'), attempts = attempts - 1
       WHERE id = ?`,
      [logId]
    );

    return true;
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async deliverWebhook(
    logId: string,
    url: string,
    payload: WebhookPayload,
    signature: string
  ): Promise<boolean> {
    const log = queryOne<WebhookLogRow>(
      'SELECT * FROM webhook_logs WHERE id = ?',
      [logId]
    );

    if (!log) return false;

    const attempts = log.attempts + 1;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-KasGate-Signature': signature,
          'X-KasGate-Event': payload.event,
          'X-KasGate-Timestamp': payload.timestamp,
          'X-KasGate-Delivery-Id': payload.deliveryId, // Bug #14: For replay protection
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Update log
      execute(
        `UPDATE webhook_logs
         SET attempts = ?, status_code = ?, delivered_at = datetime('now')
         WHERE id = ?`,
        [attempts, response.status, logId]
      );

      if (response.ok) {
        console.log(`[KasGate] Webhook delivered to ${url} (attempt ${attempts})`);
        return true;
      }

      // Non-2xx response - schedule retry
      console.warn(`[KasGate] Webhook failed: ${response.status} (attempt ${attempts})`);
      this.scheduleRetry(logId, attempts);
      return false;
    } catch (error) {
      console.error(`[KasGate] Webhook error (attempt ${attempts}):`, error);

      // Update log with error
      execute(
        `UPDATE webhook_logs
         SET attempts = ?, response = ?
         WHERE id = ?`,
        [attempts, (error as Error).message, logId]
      );

      // Schedule retry
      this.scheduleRetry(logId, attempts);
      return false;
    }
  }

  private scheduleRetry(logId: string, attempts: number): void {
    if (attempts >= WEBHOOK_MAX_RETRIES) {
      console.log(`[KasGate] Webhook ${logId} max retries reached`);
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = WEBHOOK_RETRY_BASE_MS * Math.pow(2, attempts - 1);
    const nextRetryAt = new Date(Date.now() + delay);

    execute(
      'UPDATE webhook_logs SET next_retry_at = ? WHERE id = ?',
      [toSqliteDate(nextRetryAt), logId]
    );

    console.log(`[KasGate] Webhook ${logId} retry scheduled for ${nextRetryAt}`);
  }

  private async processRetries(): Promise<void> {
    const logs = query<WebhookLogRow>(
      `SELECT wl.*, m.webhook_url, m.webhook_secret
       FROM webhook_logs wl
       JOIN sessions s ON wl.session_id = s.id
       JOIN merchants m ON s.merchant_id = m.id
       WHERE wl.next_retry_at IS NOT NULL
         AND wl.next_retry_at <= datetime('now')
         AND wl.delivered_at IS NULL
         AND wl.attempts < ?`,
      [WEBHOOK_MAX_RETRIES]
    );

    for (const log of logs) {
      const payload = fromJson<WebhookPayload>(log.payload);
      if (!payload) continue;

      // Get merchant info
      const merchant = queryOne<MerchantWebhookInfo>(
        `SELECT m.webhook_url, m.webhook_secret
         FROM sessions s
         JOIN merchants m ON s.merchant_id = m.id
         WHERE s.id = ?`,
        [log.session_id]
      );

      if (!merchant?.webhook_url) continue;

      const signature = this.signPayload(payload, merchant.webhook_secret || '');
      await this.deliverWebhook(log.id, merchant.webhook_url, payload, signature);
    }
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let webhookService: WebhookService | null = null;

/**
 * Get the singleton webhook service instance
 */
export function getWebhookService(): WebhookService {
  if (!webhookService) {
    webhookService = new WebhookService();
  }
  return webhookService;
}

/**
 * Reset the webhook service (for testing)
 */
export function resetWebhookService(): void {
  if (webhookService) {
    webhookService.stopRetryWorker();
    webhookService = null;
  }
}

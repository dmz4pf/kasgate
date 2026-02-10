/**
 * End-to-End Payment Flow Tests
 *
 * Tests the complete payment flow:
 * 1. Create session
 * 2. Simulate payment detection
 * 3. Simulate confirmations
 * 4. Verify webhook delivery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initDatabase, closeDatabase, execute } from '../db/index.js';
import { resetMerchantService } from '../services/merchant.js';
import { getSessionManager, resetSessionManager } from '../services/session.js';
import { getWebhookService, resetWebhookService } from '../services/webhook.js';

// Mock the address service to avoid WASM dependency
vi.mock('../services/address.js', () => ({
  getAddressService: () => ({
    getNextAddress: vi.fn().mockResolvedValue({
      address: 'kaspatest:qr0e2etest1234567890abcdefghijklmnopqrstuvwxyz',
      index: 0,
    }),
  }),
}));

// Mock xpub validation to avoid WASM dependency
vi.mock('../../shared/validation.js', () => ({
  validateXPubWithWasm: vi.fn().mockReturnValue(true),
}));

const TEST_XPUB = 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl';
const TEST_MERCHANT_ID = '550e8400-e29b-41d4-a716-446655440000';

// Mock fetch for webhook delivery
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createTestMerchant() {
  execute(
    `INSERT INTO merchants (id, name, xpub, api_key, api_key_hash, webhook_url, webhook_secret, next_address_index, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      TEST_MERCHANT_ID,
      'E2E Test Merchant',
      TEST_XPUB,
      'kg_e2etestkey123',
      'e2ehash1234',
      'https://example.com/webhook',
      'whsec_e2esecret123',
      0,
    ]
  );
}

describe('E2E: Complete Payment Flow', () => {
  beforeEach(() => {
    initDatabase(':memory:');
    resetMerchantService();
    resetSessionManager();
    resetWebhookService();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    // Create a test merchant directly in DB
    createTestMerchant();
  });

  afterEach(() => {
    closeDatabase();
  });

  it('should complete full payment flow: create → detect → confirm → webhook', async () => {
    const sessionManager = getSessionManager();
    const webhookService = getWebhookService();

    // Step 1: Create a payment session
    const session = await sessionManager.createSession({
      merchantId: TEST_MERCHANT_ID,
      amount: 100000000n, // 1 KAS
      orderId: 'ORDER-001',
    });

    expect(session.id).toBeDefined();
    expect(session.address).toBeDefined();
    expect(session.status).toBe('pending');
    expect(session.amount).toBe(100000000n);

    // Step 2: Simulate payment detection
    const txId = 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
    const paymentAccepted = sessionManager.markPaymentReceived(session.id, txId);

    expect(paymentAccepted).toBe(true);

    // Verify session is now confirming
    const confirmingSession = sessionManager.getSession(session.id);
    expect(confirmingSession?.status).toBe('confirming');
    expect(confirmingSession?.txId).toBe(txId);

    // Step 3: Send webhook for payment.confirming (pass full session object)
    await webhookService.sendWebhook(confirmingSession!, 'payment.confirming');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify webhook payload
    const webhookCall = mockFetch.mock.calls[0];
    expect(webhookCall[0]).toBe('https://example.com/webhook');
    const webhookBody = JSON.parse(webhookCall[1].body);
    expect(webhookBody.event).toBe('payment.confirming');
    expect(webhookBody.sessionId).toBe(session.id);

    // Step 4: Simulate confirmations
    sessionManager.updateConfirmations(session.id, 5);
    const midConfirmSession = sessionManager.getSession(session.id);
    expect(midConfirmSession?.confirmations).toBe(5);

    // Step 5: Mark as confirmed (threshold reached)
    sessionManager.markConfirmed(session.id, 10);

    const confirmedSession = sessionManager.getSession(session.id);
    expect(confirmedSession?.status).toBe('confirmed');
    expect(confirmedSession?.confirmations).toBe(10);

    // Step 6: Send final webhook for payment.confirmed
    await webhookService.sendWebhook(confirmedSession!, 'payment.confirmed');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const finalWebhookCall = mockFetch.mock.calls[1];
    const finalWebhookBody = JSON.parse(finalWebhookCall[1].body);
    expect(finalWebhookBody.event).toBe('payment.confirmed');
  });

  it('should handle payment expiration flow', async () => {
    const sessionManager = getSessionManager();
    const webhookService = getWebhookService();

    // Create session with immediate expiry
    const session = await sessionManager.createSession({
      merchantId: TEST_MERCHANT_ID,
      amount: 50000000n,
      orderId: 'ORDER-EXPIRE',
    });

    // Force expire the session in DB
    execute(
      `UPDATE sessions SET expires_at = datetime('now', '-1 minute') WHERE id = ?`,
      [session.id]
    );

    // Expire old sessions
    const expiredCount = sessionManager.expireOldSessions();
    expect(expiredCount).toBe(1);

    // Verify session is expired
    const expiredSession = sessionManager.getSession(session.id);
    expect(expiredSession?.status).toBe('expired');

    // Send expiration webhook
    await webhookService.sendWebhook(expiredSession!, 'payment.expired');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const webhookBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(webhookBody.event).toBe('payment.expired');
  });

  it('should prevent double payment on expired session', async () => {
    const sessionManager = getSessionManager();

    // Create session
    const session = await sessionManager.createSession({
      merchantId: TEST_MERCHANT_ID,
      amount: 75000000n,
      orderId: 'ORDER-RACE',
    });

    // Force expire the session
    execute(
      `UPDATE sessions SET expires_at = datetime('now', '-1 minute') WHERE id = ?`,
      [session.id]
    );

    // Try to mark payment received on expired session
    const txId = 'race-condition-tx-id';
    const paymentAccepted = sessionManager.markPaymentReceived(session.id, txId);

    // Should be rejected
    expect(paymentAccepted).toBe(false);

    // Session should be marked as expired now
    const finalSession = sessionManager.getSession(session.id);
    expect(finalSession?.status).toBe('expired');
  });

  it('should handle webhook retry on failure', async () => {
    const sessionManager = getSessionManager();
    const webhookService = getWebhookService();

    // Create and confirm a session
    const session = await sessionManager.createSession({
      merchantId: TEST_MERCHANT_ID,
      amount: 100000000n,
      orderId: 'ORDER-RETRY',
    });

    const txId = 'retry-tx-id';
    sessionManager.markPaymentReceived(session.id, txId);
    sessionManager.markConfirmed(session.id, 10);

    // Get the confirmed session
    const confirmedSession = sessionManager.getSession(session.id);

    // Mock first webhook failure, second success
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    // First send (will fail)
    await webhookService.sendWebhook(confirmedSession!, 'payment.confirmed');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Get the log to retry
    const { logs } = webhookService.getLogsForMerchant(TEST_MERCHANT_ID, {});
    expect(logs).toHaveLength(1);
    expect(logs[0].status_code).toBe(500);

    // Retry the webhook
    const retrySuccess = await webhookService.retryWebhook(logs[0].id, TEST_MERCHANT_ID);
    expect(retrySuccess).toBe(true);
  });

  it('should track multiple sessions for analytics', async () => {
    const sessionManager = getSessionManager();

    // Create multiple sessions with different statuses
    const sessions = [];
    for (let i = 0; i < 5; i++) {
      const session = await sessionManager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt((i + 1) * 100000000), // 1, 2, 3, 4, 5 KAS
        orderId: `ORDER-${i}`,
      });
      sessions.push(session);
    }

    // Confirm first 3 sessions
    for (let i = 0; i < 3; i++) {
      sessionManager.markPaymentReceived(sessions[i].id, `tx-${i}`);
      sessionManager.markConfirmed(sessions[i].id, 10);
    }

    // Expire session 4
    execute(
      `UPDATE sessions SET expires_at = datetime('now', '-1 minute') WHERE id = ?`,
      [sessions[3].id]
    );
    sessionManager.expireOldSessions();

    // Session 5 stays pending

    // Test analytics aggregation
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const analytics = sessionManager.getAnalyticsAggregated(TEST_MERCHANT_ID, weekAgo, now);

    expect(analytics.totalSessions).toBe(5);
    expect(analytics.confirmedSessions).toBe(3);
    // 1 + 2 + 3 = 6 KAS = 600000000 sompi (SQLite returns number, convert to string for comparison)
    expect(String(analytics.totalVolumeSompi)).toBe('600000000');
    expect(analytics.statusDistribution.confirmed).toBe(3);
    expect(analytics.statusDistribution.expired).toBe(1);
    expect(analytics.statusDistribution.pending).toBe(1);

    // Test top payments
    const topPayments = sessionManager.getTopPayments(TEST_MERCHANT_ID, weekAgo, now, 2);
    expect(topPayments).toHaveLength(2);
    // Highest first: 3 KAS, then 2 KAS
    expect(topPayments[0].amountSompi).toBe('300000000');
    expect(topPayments[1].amountSompi).toBe('200000000');
  });

  it('should verify webhook signature', async () => {
    const sessionManager = getSessionManager();
    const webhookService = getWebhookService();

    const session = await sessionManager.createSession({
      merchantId: TEST_MERCHANT_ID,
      amount: 100000000n,
      orderId: 'ORDER-SIG',
    });

    sessionManager.markPaymentReceived(session.id, 'sig-tx-id');
    sessionManager.markConfirmed(session.id, 10);

    const confirmedSession = sessionManager.getSession(session.id);
    await webhookService.sendWebhook(confirmedSession!, 'payment.confirmed');

    // Verify signature header was included
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const webhookCall = mockFetch.mock.calls[0];
    const headers = webhookCall[1].headers;

    expect(headers['X-KasGate-Signature']).toBeDefined();
    expect(headers['X-KasGate-Delivery-Id']).toBeDefined();
    expect(headers['X-KasGate-Timestamp']).toBeDefined();

    // Verify signature format (64-char hex HMAC-SHA256 digest)
    const signature = headers['X-KasGate-Signature'];
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
  });
});

/**
 * Merchants Routes Tests
 * Tests for analytics and webhook-logs endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { initDatabase, closeDatabase, execute } from '../db/index.js';
import { resetMerchantService } from '../services/merchant.js';
import { getSessionManager, resetSessionManager } from '../services/session.js';
import { getWebhookService, resetWebhookService } from '../services/webhook.js';

const TEST_MERCHANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_XPUB = 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl';

// Mock fetch for webhook tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createTestMerchant(webhookUrl: string | null = 'https://example.com/webhook') {
  execute(
    `INSERT INTO merchants (id, name, xpub, api_key, api_key_hash, webhook_url, webhook_secret, next_address_index, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      TEST_MERCHANT_ID,
      'Test Merchant',
      TEST_XPUB,
      'kg_testkey123',
      'abcd1234',
      webhookUrl,
      'whsec_testsecret123',
      0,
    ]
  );
}

function createTestSession(options: {
  id?: string;
  status?: string;
  amount?: string;
} = {}) {
  const id = options.id || crypto.randomUUID();
  const status = options.status || 'pending';
  const amount = options.amount || '100000000';

  execute(
    `INSERT INTO sessions (id, merchant_id, address, address_index, amount, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', '+15 minutes'))`,
    [
      id,
      TEST_MERCHANT_ID,
      'kaspatest:qr0test' + id.slice(0, 5),
      0,
      amount,
      status,
    ]
  );
  return id;
}

function createTestWebhookLog(sessionId: string, options: {
  event?: string;
  statusCode?: number;
  attempts?: number;
  deliveryId?: string;
} = {}) {
  const id = crypto.randomUUID();
  execute(
    `INSERT INTO webhook_logs (id, webhook_id, session_id, event, payload, delivery_id, status_code, attempts, created_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      sessionId,
      options.event || 'payment.confirmed',
      JSON.stringify({ test: true }),
      options.deliveryId || crypto.randomUUID(),
      options.statusCode ?? 200,
      options.attempts || 1,
    ]
  );
  return id;
}

describe('Merchants Analytics Endpoint', () => {
  beforeEach(() => {
    initDatabase(':memory:');
    resetMerchantService();
    resetSessionManager();
    resetWebhookService();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('getSessionHistory for analytics', () => {
    it('should return empty analytics for merchant with no sessions', () => {
      createTestMerchant();
      const sessionManager = getSessionManager();

      const { sessions, total } = sessionManager.getSessionHistory(TEST_MERCHANT_ID, {
        limit: 100,
      });

      expect(sessions).toHaveLength(0);
      expect(total).toBe(0);
    });

    it('should return sessions filtered by status', () => {
      createTestMerchant();
      createTestSession({ id: 'session-1', status: 'pending' });
      createTestSession({ id: 'session-2', status: 'confirmed' });
      createTestSession({ id: 'session-3', status: 'confirmed' });
      createTestSession({ id: 'session-4', status: 'expired' });

      const sessionManager = getSessionManager();

      const { sessions: confirmedSessions } = sessionManager.getSessionHistory(TEST_MERCHANT_ID, {
        limit: 100,
        status: 'confirmed',
      });

      expect(confirmedSessions).toHaveLength(2);
      expect(confirmedSessions.every(s => s.status === 'confirmed')).toBe(true);
    });

    it('should calculate total volume correctly', () => {
      createTestMerchant();
      createTestSession({ id: 'session-1', status: 'confirmed', amount: '100000000' });
      createTestSession({ id: 'session-2', status: 'confirmed', amount: '250000000' });
      createTestSession({ id: 'session-3', status: 'expired', amount: '500000000' });

      const sessionManager = getSessionManager();

      const { sessions } = sessionManager.getSessionHistory(TEST_MERCHANT_ID, {
        limit: 100,
      });

      const confirmedSessions = sessions.filter(s => s.status === 'confirmed');
      const totalVolume = confirmedSessions.reduce((sum, s) => sum + s.amount, 0n);

      expect(totalVolume.toString()).toBe('350000000');
    });

    it('should paginate results correctly', () => {
      createTestMerchant();
      for (let i = 0; i < 15; i++) {
        createTestSession({ id: `session-${i.toString().padStart(2, '0')}` });
      }

      const sessionManager = getSessionManager();

      const page1 = sessionManager.getSessionHistory(TEST_MERCHANT_ID, {
        limit: 5,
        offset: 0,
      });

      expect(page1.sessions).toHaveLength(5);
      expect(page1.total).toBe(15);

      const page2 = sessionManager.getSessionHistory(TEST_MERCHANT_ID, {
        limit: 5,
        offset: 5,
      });

      expect(page2.sessions).toHaveLength(5);

      const page1Ids = page1.sessions.map(s => s.id);
      const page2Ids = page2.sessions.map(s => s.id);
      expect(page1Ids.every(id => !page2Ids.includes(id))).toBe(true);
    });

    it('should count status distribution correctly', () => {
      createTestMerchant();
      createTestSession({ status: 'pending' });
      createTestSession({ status: 'pending' });
      createTestSession({ status: 'confirming' });
      createTestSession({ status: 'confirmed' });
      createTestSession({ status: 'confirmed' });
      createTestSession({ status: 'confirmed' });
      createTestSession({ status: 'expired' });

      const sessionManager = getSessionManager();

      const { sessions } = sessionManager.getSessionHistory(TEST_MERCHANT_ID, {
        limit: 100,
      });

      const distribution = {
        pending: sessions.filter(s => s.status === 'pending').length,
        confirming: sessions.filter(s => s.status === 'confirming').length,
        confirmed: sessions.filter(s => s.status === 'confirmed').length,
        expired: sessions.filter(s => s.status === 'expired').length,
      };

      expect(distribution.pending).toBe(2);
      expect(distribution.confirming).toBe(1);
      expect(distribution.confirmed).toBe(3);
      expect(distribution.expired).toBe(1);
    });
  });
});

describe('Merchants Webhook Logs Endpoint', () => {
  beforeEach(() => {
    initDatabase(':memory:');
    resetMerchantService();
    resetSessionManager();
    resetWebhookService();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('getLogsForMerchant', () => {
    it('should return empty logs for merchant with no webhooks', () => {
      createTestMerchant();
      const webhookService = getWebhookService();

      const { logs, total } = webhookService.getLogsForMerchant(TEST_MERCHANT_ID, {});

      expect(logs).toHaveLength(0);
      expect(total).toBe(0);
    });

    it('should return logs for merchant sessions', () => {
      createTestMerchant();
      const sessionId = createTestSession({ status: 'confirmed' });
      createTestWebhookLog(sessionId, { event: 'payment.confirmed' });
      createTestWebhookLog(sessionId, { event: 'payment.confirming' });

      const webhookService = getWebhookService();

      const { logs, total } = webhookService.getLogsForMerchant(TEST_MERCHANT_ID, {});

      expect(logs).toHaveLength(2);
      expect(total).toBe(2);
    });

    it('should filter logs by event type', () => {
      createTestMerchant();
      const sessionId = createTestSession({ status: 'confirmed' });
      createTestWebhookLog(sessionId, { event: 'payment.confirmed' });
      createTestWebhookLog(sessionId, { event: 'payment.confirming' });
      createTestWebhookLog(sessionId, { event: 'payment.pending' });

      const webhookService = getWebhookService();

      const { logs } = webhookService.getLogsForMerchant(TEST_MERCHANT_ID, {
        event: 'payment.confirmed',
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].event).toBe('payment.confirmed');
    });

    it('should paginate logs correctly', () => {
      createTestMerchant();
      const sessionId = createTestSession({ status: 'confirmed' });

      for (let i = 0; i < 10; i++) {
        createTestWebhookLog(sessionId, {
          event: 'payment.confirmed',
          deliveryId: `delivery-${i}`,
        });
      }

      const webhookService = getWebhookService();

      const page1 = webhookService.getLogsForMerchant(TEST_MERCHANT_ID, {
        limit: 3,
        offset: 0,
      });

      expect(page1.logs).toHaveLength(3);
      expect(page1.total).toBe(10);

      const page2 = webhookService.getLogsForMerchant(TEST_MERCHANT_ID, {
        limit: 3,
        offset: 3,
      });

      expect(page2.logs).toHaveLength(3);

      const page1Ids = page1.logs.map(l => l.id);
      const page2Ids = page2.logs.map(l => l.id);
      expect(page1Ids.every(id => !page2Ids.includes(id))).toBe(true);
    });

    it('should include delivery_id in logs', () => {
      createTestMerchant();
      const sessionId = createTestSession({ status: 'confirmed' });
      const deliveryId = 'test-delivery-uuid-123';
      createTestWebhookLog(sessionId, { deliveryId });

      const webhookService = getWebhookService();

      const { logs } = webhookService.getLogsForMerchant(TEST_MERCHANT_ID, {});

      expect(logs[0].delivery_id).toBe(deliveryId);
    });

    it('should not return logs from other merchants', () => {
      createTestMerchant();
      const sessionId = createTestSession({ status: 'confirmed' });
      createTestWebhookLog(sessionId, { event: 'payment.confirmed' });

      const otherMerchantId = crypto.randomUUID();
      execute(
        `INSERT INTO merchants (id, name, xpub, api_key, api_key_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [otherMerchantId, 'Other Merchant', TEST_XPUB + '2', 'kg_other', 'otherhash']
      );

      const webhookService = getWebhookService();

      const { logs } = webhookService.getLogsForMerchant(otherMerchantId, {});

      expect(logs).toHaveLength(0);
    });
  });

  describe('retryWebhook', () => {
    it('should retry a webhook for the merchant', async () => {
      createTestMerchant();
      const sessionId = createTestSession({ status: 'confirmed' });
      const logId = createTestWebhookLog(sessionId, {
        event: 'payment.confirmed',
        statusCode: 500,
      });

      const webhookService = getWebhookService();

      const success = await webhookService.retryWebhook(logId, TEST_MERCHANT_ID);

      // retryWebhook should return true if the log exists and belongs to merchant
      expect(success).toBe(true);
    });

    it('should not retry webhook from another merchant', async () => {
      createTestMerchant();
      const sessionId = createTestSession({ status: 'confirmed' });
      const logId = createTestWebhookLog(sessionId, { event: 'payment.confirmed' });

      const webhookService = getWebhookService();
      const success = await webhookService.retryWebhook(logId, crypto.randomUUID());

      expect(success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return false for non-existent log', async () => {
      createTestMerchant();

      const webhookService = getWebhookService();
      const success = await webhookService.retryWebhook('nonexistent-id', TEST_MERCHANT_ID);

      expect(success).toBe(false);
    });
  });
});

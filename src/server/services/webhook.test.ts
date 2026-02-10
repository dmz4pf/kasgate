/**
 * Webhook Service Tests
 * Tests for webhook signing, delivery, and replay protection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { getWebhookService, resetWebhookService } from './webhook.js';
import { initDatabase, closeDatabase, queryOne, execute } from '../db/index.js';
import type { WebhookPayload } from '../../shared/validation.js';
import type { PaymentSession } from '../../kaspa/types.js';

// Mock fetch for webhook delivery tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const TEST_MERCHANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440001';

function createTestMerchant(webhookUrl: string | null = 'https://example.com/webhook') {
  execute(
    `INSERT INTO merchants (id, name, xpub, api_key, api_key_hash, webhook_url, webhook_secret, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      TEST_MERCHANT_ID,
      'Test Merchant',
      'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      'kg_testkey123',
      'abcd1234',
      webhookUrl,
      'whsec_testsecret123',
    ]
  );
}

function createTestSession() {
  execute(
    `INSERT INTO sessions (id, merchant_id, address, address_index, amount, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', '+15 minutes'))`,
    [
      TEST_SESSION_ID,
      TEST_MERCHANT_ID,
      'kaspatest:qr0test123',
      0,
      '100000000',
      'pending',
    ]
  );
}

describe('WebhookService', () => {
  beforeEach(() => {
    initDatabase(':memory:');
    resetWebhookService();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('signPayload', () => {
    it('should create consistent HMAC-SHA256 signature', () => {
      const service = getWebhookService();

      const payload: WebhookPayload = {
        event: 'payment.confirmed',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        merchantId: '550e8400-e29b-41d4-a716-446655440001',
        amount: '100000000',
        address: 'kaspatest:qr0test123',
        timestamp: '2024-01-01T00:00:00.000Z',
        deliveryId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const secret = 'whsec_testsecret123';
      const signature1 = service.signPayload(payload, secret);
      const signature2 = service.signPayload(payload, secret);

      // Same payload + secret = same signature
      expect(signature1).toBe(signature2);
      expect(signature1).toHaveLength(64); // SHA-256 hex
    });

    it('should produce different signatures for different payloads', () => {
      const service = getWebhookService();

      const payload1: WebhookPayload = {
        event: 'payment.confirmed',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        merchantId: '550e8400-e29b-41d4-a716-446655440001',
        amount: '100000000',
        address: 'kaspatest:qr0test123',
        timestamp: '2024-01-01T00:00:00.000Z',
        deliveryId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const payload2: WebhookPayload = {
        ...payload1,
        amount: '200000000', // Different amount
      };

      const secret = 'whsec_testsecret123';
      const signature1 = service.signPayload(payload1, secret);
      const signature2 = service.signPayload(payload2, secret);

      expect(signature1).not.toBe(signature2);
    });

    it('should produce different signatures for different secrets', () => {
      const service = getWebhookService();

      const payload: WebhookPayload = {
        event: 'payment.confirmed',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        merchantId: '550e8400-e29b-41d4-a716-446655440001',
        amount: '100000000',
        address: 'kaspatest:qr0test123',
        timestamp: '2024-01-01T00:00:00.000Z',
        deliveryId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const signature1 = service.signPayload(payload, 'secret1');
      const signature2 = service.signPayload(payload, 'secret2');

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('verifySignature', () => {
    it('should verify correct signature', () => {
      const service = getWebhookService();

      const payload: WebhookPayload = {
        event: 'payment.confirmed',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        merchantId: '550e8400-e29b-41d4-a716-446655440001',
        amount: '100000000',
        address: 'kaspatest:qr0test123',
        timestamp: '2024-01-01T00:00:00.000Z',
        deliveryId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const secret = 'whsec_testsecret123';
      const payloadString = JSON.stringify(payload);
      const signature = service.signPayload(payload, secret);

      const isValid = service.verifySignature(payloadString, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect signature', () => {
      const service = getWebhookService();

      const payload: WebhookPayload = {
        event: 'payment.confirmed',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        merchantId: '550e8400-e29b-41d4-a716-446655440001',
        amount: '100000000',
        address: 'kaspatest:qr0test123',
        timestamp: '2024-01-01T00:00:00.000Z',
        deliveryId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const secret = 'whsec_testsecret123';
      const payloadString = JSON.stringify(payload);

      // Use a 64-char hex string (same length as SHA-256 output) but wrong value
      const wrongSignature = '0'.repeat(64);
      const isValid = service.verifySignature(payloadString, wrongSignature, secret);
      expect(isValid).toBe(false);
    });

    it('should reject tampered payload', () => {
      const service = getWebhookService();

      const payload: WebhookPayload = {
        event: 'payment.confirmed',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        merchantId: '550e8400-e29b-41d4-a716-446655440001',
        amount: '100000000',
        address: 'kaspatest:qr0test123',
        timestamp: '2024-01-01T00:00:00.000Z',
        deliveryId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const secret = 'whsec_testsecret123';
      const signature = service.signPayload(payload, secret);

      // Tamper with payload
      const tamperedPayload = { ...payload, amount: '999999999' };
      const tamperedString = JSON.stringify(tamperedPayload);

      const isValid = service.verifySignature(tamperedString, signature, secret);
      expect(isValid).toBe(false);
    });
  });

  describe('Replay Protection (Bug #14)', () => {
    it('should generate unique deliveryId for each webhook call', async () => {
      const service = getWebhookService();
      createTestMerchant();
      createTestSession();

      const session: PaymentSession = {
        id: TEST_SESSION_ID,
        merchantId: TEST_MERCHANT_ID,
        address: 'kaspatest:qr0test123',
        amount: BigInt(100000000),
        status: 'confirming',
        confirmations: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
      };

      // Send two webhooks
      await service.sendWebhook(session, 'payment.confirming');
      await service.sendWebhook(session, 'payment.confirmed');

      // Verify fetch was called twice
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Extract the payloads from both calls
      const call1Body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const call2Body = JSON.parse(mockFetch.mock.calls[1][1].body);

      // Each should have a deliveryId
      expect(call1Body.deliveryId).toBeDefined();
      expect(call2Body.deliveryId).toBeDefined();

      // They should be different UUIDs
      expect(call1Body.deliveryId).not.toBe(call2Body.deliveryId);
      expect(call1Body.deliveryId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('should include timestamp in payload', async () => {
      const service = getWebhookService();
      createTestMerchant();
      createTestSession();

      const session: PaymentSession = {
        id: TEST_SESSION_ID,
        merchantId: TEST_MERCHANT_ID,
        address: 'kaspatest:qr0test123',
        amount: BigInt(100000000),
        status: 'confirming',
        confirmations: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
      };

      const before = new Date();
      await service.sendWebhook(session, 'payment.confirming');
      const after = new Date();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(callBody.timestamp).toBeDefined();
      const timestamp = new Date(callBody.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should produce different signatures for different deliveryIds', () => {
      const service = getWebhookService();

      const basePayload = {
        event: 'payment.confirmed' as const,
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        merchantId: '550e8400-e29b-41d4-a716-446655440001',
        amount: '100000000',
        address: 'kaspatest:qr0test123',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const payload1: WebhookPayload = {
        ...basePayload,
        deliveryId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const payload2: WebhookPayload = {
        ...basePayload,
        deliveryId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const secret = 'whsec_testsecret123';
      const sig1 = service.signPayload(payload1, secret);
      const sig2 = service.signPayload(payload2, secret);

      // Different deliveryId = different signature (prevents replay)
      expect(sig1).not.toBe(sig2);
    });

    it('should store deliveryId in webhook_logs', async () => {
      const service = getWebhookService();
      createTestMerchant();
      createTestSession();

      const session: PaymentSession = {
        id: TEST_SESSION_ID,
        merchantId: TEST_MERCHANT_ID,
        address: 'kaspatest:qr0test123',
        amount: BigInt(100000000),
        status: 'confirming',
        confirmations: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
      };

      await service.sendWebhook(session, 'payment.confirming');

      // Check the database for the stored deliveryId
      const log = queryOne<{ delivery_id: string }>(
        'SELECT delivery_id FROM webhook_logs WHERE session_id = ?',
        [TEST_SESSION_ID]
      );

      expect(log?.delivery_id).toBeDefined();
      expect(log?.delivery_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('should not send webhook if no URL configured', async () => {
      const service = getWebhookService();
      createTestMerchant(null); // No webhook URL
      createTestSession();

      const session: PaymentSession = {
        id: TEST_SESSION_ID,
        merchantId: TEST_MERCHANT_ID,
        address: 'kaspatest:qr0test123',
        amount: BigInt(100000000),
        status: 'confirming',
        confirmations: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
      };

      await service.sendWebhook(session, 'payment.confirming');

      // Fetch should not have been called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should include X-KasGate-Delivery-Id header', async () => {
      const service = getWebhookService();
      createTestMerchant();
      createTestSession();

      const session: PaymentSession = {
        id: TEST_SESSION_ID,
        merchantId: TEST_MERCHANT_ID,
        address: 'kaspatest:qr0test123',
        amount: BigInt(100000000),
        status: 'confirming',
        confirmations: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
      };

      await service.sendWebhook(session, 'payment.confirming');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-KasGate-Delivery-Id']).toBeDefined();
      expect(headers['X-KasGate-Delivery-Id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });
});

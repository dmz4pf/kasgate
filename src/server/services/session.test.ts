/**
 * Session Manager Tests
 * Tests for session lifecycle, state machine, and expiry handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSessionManager, resetSessionManager } from './session.js';
import { initDatabase, closeDatabase, execute, query } from '../db/index.js';
import type { PaymentStatus } from '../../kaspa/types.js';

// Mock the address service
vi.mock('./address.js', () => ({
  getAddressService: () => ({
    getNextAddress: vi.fn().mockResolvedValue({
      address: 'kaspatest:qr0test1234567890abcdefghijklmnopqrstuvwxyz12345678',
      index: 0,
    }),
  }),
}));

const TEST_MERCHANT_ID = '550e8400-e29b-41d4-a716-446655440000';

function createTestMerchant() {
  execute(
    `INSERT INTO merchants (id, name, xpub, api_key, api_key_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      TEST_MERCHANT_ID,
      'Test Merchant',
      'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      'kg_testkey123',
      'abcd1234',
    ]
  );
}

describe('SessionManager', () => {
  beforeEach(() => {
    // Use in-memory database for tests
    initDatabase(':memory:');
    resetSessionManager();
    createTestMerchant();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('createSession', () => {
    it('should create a session with pending status', async () => {
      const manager = getSessionManager();

      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000), // 1 KAS
      });

      expect(session.status).toBe('pending');
      expect(session.amount).toBe(BigInt(100000000));
      expect(session.subscriptionToken).toBeDefined();
      expect(session.subscriptionToken.length).toBeGreaterThan(0);
    });

    it('should generate unique subscription tokens', async () => {
      const manager = getSessionManager();

      const session1 = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      const session2 = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(200000000),
      });

      expect(session1.subscriptionToken).not.toBe(session2.subscriptionToken);
    });
  });

  describe('State Machine Transitions', () => {
    it('should allow pending → confirming transition', async () => {
      const manager = getSessionManager();
      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      const result = manager.markPaymentReceived(session.id, 'tx123');
      expect(result).toBe(true);

      const updated = manager.getSession(session.id);
      expect(updated?.status).toBe('confirming');
    });

    it('should allow pending → expired transition', async () => {
      const manager = getSessionManager();
      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      manager.markExpired(session.id);

      const updated = manager.getSession(session.id);
      expect(updated?.status).toBe('expired');
    });

    it('should allow confirming → confirmed transition', async () => {
      const manager = getSessionManager();
      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      manager.markPaymentReceived(session.id, 'tx123');
      manager.markConfirmed(session.id, 10);

      const updated = manager.getSession(session.id);
      expect(updated?.status).toBe('confirmed');
      expect(updated?.confirmations).toBe(10);
    });

    it('should reject invalid transition: pending → confirmed', async () => {
      const manager = getSessionManager();
      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      // Attempting to go directly from pending to confirmed should throw
      expect(() => manager.markConfirmed(session.id, 10)).toThrow(/Invalid session status transition/);
    });

    it('should reject transition from terminal state: expired → confirming', async () => {
      const manager = getSessionManager();
      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      manager.markExpired(session.id);

      // Mark as received after expiry should fail
      const result = manager.markPaymentReceived(session.id, 'tx123');
      expect(result).toBe(false);
    });
  });

  describe('Atomic Expiry Check (Bug #12)', () => {
    it('should reject payment for expired session', async () => {
      const manager = getSessionManager();
      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      // Manually expire the session in the database
      execute(
        `UPDATE sessions SET expires_at = datetime('now', '-1 minute') WHERE id = ?`,
        [session.id]
      );

      // Attempt to mark payment received - should fail
      const result = manager.markPaymentReceived(session.id, 'tx123');
      expect(result).toBe(false);

      // Session should now be marked as expired
      const updated = manager.getSession(session.id);
      expect(updated?.status).toBe('expired');
    });

    it('should accept payment for non-expired session', async () => {
      const manager = getSessionManager();
      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      const result = manager.markPaymentReceived(session.id, 'tx123');
      expect(result).toBe(true);

      const updated = manager.getSession(session.id);
      expect(updated?.status).toBe('confirming');
    });
  });

  describe('Subscription Token Verification (Bug #5)', () => {
    it('should verify correct subscription token', async () => {
      const manager = getSessionManager();
      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      const isValid = manager.verifySubscriptionToken(session.id, session.subscriptionToken);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect subscription token', async () => {
      const manager = getSessionManager();
      const session = await manager.createSession({
        merchantId: TEST_MERCHANT_ID,
        amount: BigInt(100000000),
      });

      const isValid = manager.verifySubscriptionToken(session.id, 'wrong_token');
      expect(isValid).toBe(false);
    });

    it('should reject token for non-existent session', async () => {
      const manager = getSessionManager();

      const isValid = manager.verifySubscriptionToken('non-existent-id', 'any_token');
      expect(isValid).toBe(false);
    });
  });
});

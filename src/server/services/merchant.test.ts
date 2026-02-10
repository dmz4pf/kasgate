/**
 * Merchant Service Tests
 * Tests for API key generation, verification, and timing-safe comparison
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { getMerchantService, resetMerchantService } from './merchant.js';
import { initDatabase, closeDatabase, queryOne, execute } from '../db/index.js';

describe('MerchantService', () => {
  beforeEach(() => {
    initDatabase(':memory:');
    resetMerchantService();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('createMerchant', () => {
    it('should create a merchant with hashed API key', () => {
      const service = getMerchantService();

      const merchant = service.createMerchant({
        name: 'Test Merchant',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      });

      expect(merchant.id).toBeDefined();
      expect(merchant.name).toBe('Test Merchant');
      expect(merchant.apiKey).toMatch(/^kg_live_/); // Updated prefix

      // Verify API key hash was stored
      const row = queryOne<{ api_key_hash: string }>(
        'SELECT api_key_hash FROM merchants WHERE id = ?',
        [merchant.id]
      );
      expect(row?.api_key_hash).toBeDefined();
      expect(row?.api_key_hash).toHaveLength(64); // SHA-256 hex
    });

    it('should generate unique API keys', () => {
      const service = getMerchantService();

      const merchant1 = service.createMerchant({
        name: 'Merchant 1',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      });

      const merchant2 = service.createMerchant({
        name: 'Merchant 2',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijk2',
      });

      expect(merchant1.apiKey).not.toBe(merchant2.apiKey);
    });

    it('should store hash that matches the API key', () => {
      const service = getMerchantService();

      const merchant = service.createMerchant({
        name: 'Test Merchant',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      });

      // Calculate expected hash
      const expectedHash = crypto.createHash('sha256').update(merchant.apiKey!).digest('hex');

      // Get stored hash
      const row = queryOne<{ api_key_hash: string }>(
        'SELECT api_key_hash FROM merchants WHERE id = ?',
        [merchant.id]
      );

      expect(row?.api_key_hash).toBe(expectedHash);
    });
  });

  describe('verifyApiKey (Bug #3 - Timing Safe)', () => {
    it('should verify valid API key', () => {
      const service = getMerchantService();

      const merchant = service.createMerchant({
        name: 'Test Merchant',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      });

      const verified = service.verifyApiKey(merchant.apiKey!);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe(merchant.id);
    });

    it('should reject invalid API key', () => {
      const service = getMerchantService();

      service.createMerchant({
        name: 'Test Merchant',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      });

      const verified = service.verifyApiKey('kg_live_invalid_key_12345');
      expect(verified).toBeNull();
    });

    it('should lookup by hash, not plaintext (Bug #3)', () => {
      const service = getMerchantService();

      const merchant = service.createMerchant({
        name: 'Test Merchant',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      });

      // Clear the plaintext API key from database (simulating a secure deployment)
      execute('UPDATE merchants SET api_key = ? WHERE id = ?', ['REDACTED', merchant.id]);

      // Verify should still work because it uses the hash
      const verified = service.verifyApiKey(merchant.apiKey!);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe(merchant.id);
    });

    it('should handle legacy merchants without hash (backwards compatibility)', () => {
      const service = getMerchantService();

      // Manually insert a merchant with plaintext key but no hash
      const legacyKey = 'kg_live_legacy_key_abc123';
      execute(
        `INSERT INTO merchants (id, name, xpub, api_key, api_key_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          '550e8400-e29b-41d4-a716-446655440000',
          'Legacy Merchant',
          'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
          legacyKey,
          null, // No hash
        ]
      );

      // Should still verify via legacy path
      const verified = service.verifyApiKey(legacyKey);
      expect(verified).not.toBeNull();
      expect(verified?.name).toBe('Legacy Merchant');

      // Should have backfilled the hash
      const row = queryOne<{ api_key_hash: string | null }>(
        'SELECT api_key_hash FROM merchants WHERE id = ?',
        ['550e8400-e29b-41d4-a716-446655440000']
      );
      expect(row?.api_key_hash).not.toBeNull();
      expect(row?.api_key_hash).toHaveLength(64);
    });

    it('should not reveal key existence via different behavior', () => {
      const service = getMerchantService();

      service.createMerchant({
        name: 'Test Merchant',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      });

      // Both invalid keys should return null (no different error messages)
      const result1 = service.verifyApiKey('kg_live_nonexistent_123');
      const result2 = service.verifyApiKey('kg_live_also_nonexistent_456');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      // Both return null - no way to distinguish between "close guess" and "far guess"
    });
  });

  describe('regenerateApiKey', () => {
    it('should generate new API key and update hash', () => {
      const service = getMerchantService();

      const merchant = service.createMerchant({
        name: 'Test Merchant',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      });

      const oldApiKey = merchant.apiKey;

      const newApiKey = service.regenerateApiKey(merchant.id);

      expect(newApiKey).not.toBe(oldApiKey);
      expect(newApiKey).toMatch(/^kg_live_/);

      // Old key should no longer work
      const oldVerified = service.verifyApiKey(oldApiKey!);
      expect(oldVerified).toBeNull();

      // New key should work
      const newVerified = service.verifyApiKey(newApiKey!);
      expect(newVerified).not.toBeNull();
    });

    it('should update hash when regenerating key', () => {
      const service = getMerchantService();

      const merchant = service.createMerchant({
        name: 'Test Merchant',
        xpub: 'kpub1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl',
      });

      const oldRow = queryOne<{ api_key_hash: string }>(
        'SELECT api_key_hash FROM merchants WHERE id = ?',
        [merchant.id]
      );

      const newApiKey = service.regenerateApiKey(merchant.id);

      const newRow = queryOne<{ api_key_hash: string }>(
        'SELECT api_key_hash FROM merchants WHERE id = ?',
        [merchant.id]
      );

      // Hash should have changed
      expect(newRow?.api_key_hash).not.toBe(oldRow?.api_key_hash);

      // New hash should match new key
      const expectedHash = crypto.createHash('sha256').update(newApiKey!).digest('hex');
      expect(newRow?.api_key_hash).toBe(expectedHash);
    });
  });
});

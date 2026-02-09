/**
 * Merchant Service - Merchant Account Management
 *
 * Handles merchant registration, authentication, and configuration.
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { query, queryOne, execute, toSqliteDate } from '../db/index.js';

// ============================================================
// TYPES
// ============================================================

export interface Merchant {
  id: string;
  name: string;
  email?: string;
  xpub: string;
  apiKey: string;
  webhookUrl?: string;
  webhookSecret?: string;
  nextAddressIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MerchantRow {
  id: string;
  name: string;
  email: string | null;
  xpub: string;
  api_key: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  next_address_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMerchantInput {
  name: string;
  email?: string;
  xpub: string;
  webhookUrl?: string;
}

export interface UpdateMerchantInput {
  name?: string;
  email?: string;
  xpub?: string;
  webhookUrl?: string;
}

// ============================================================
// MERCHANT SERVICE CLASS
// ============================================================

export class MerchantService {
  /**
   * Create a new merchant account
   */
  createMerchant(input: CreateMerchantInput): Merchant {
    const id = uuidv4();
    const apiKey = this.generateApiKey();
    const webhookSecret = this.generateWebhookSecret();
    const now = new Date();

    execute(
      `INSERT INTO merchants (
        id, name, email, xpub, api_key, webhook_url, webhook_secret,
        next_address_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.email || null,
        input.xpub,
        apiKey,
        input.webhookUrl || null,
        webhookSecret,
        0,
        toSqliteDate(now),
        toSqliteDate(now),
      ]
    );

    console.log(`[KasGate] Created merchant ${id}: ${input.name}`);

    return {
      id,
      name: input.name,
      email: input.email,
      xpub: input.xpub,
      apiKey,
      webhookUrl: input.webhookUrl,
      webhookSecret,
      nextAddressIndex: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get a merchant by ID
   */
  getMerchant(merchantId: string): Merchant | null {
    const row = queryOne<MerchantRow>(
      'SELECT * FROM merchants WHERE id = ?',
      [merchantId]
    );

    if (!row) return null;

    return this.rowToMerchant(row);
  }

  /**
   * Get a merchant by API key
   */
  getMerchantByApiKey(apiKey: string): Merchant | null {
    const row = queryOne<MerchantRow>(
      'SELECT * FROM merchants WHERE api_key = ?',
      [apiKey]
    );

    if (!row) return null;

    return this.rowToMerchant(row);
  }

  /**
   * Get a merchant by email
   */
  getMerchantByEmail(email: string): Merchant | null {
    const row = queryOne<MerchantRow>(
      'SELECT * FROM merchants WHERE email = ?',
      [email]
    );

    if (!row) return null;

    return this.rowToMerchant(row);
  }

  /**
   * Update a merchant
   */
  updateMerchant(merchantId: string, input: UpdateMerchantInput): Merchant | null {
    const merchant = this.getMerchant(merchantId);
    if (!merchant) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }

    if (input.email !== undefined) {
      updates.push('email = ?');
      params.push(input.email || null);
    }

    if (input.xpub !== undefined) {
      updates.push('xpub = ?');
      params.push(input.xpub);
      // Reset address index when xpub changes
      updates.push('next_address_index = 0');
    }

    if (input.webhookUrl !== undefined) {
      updates.push('webhook_url = ?');
      params.push(input.webhookUrl || null);
    }

    if (updates.length === 0) {
      return merchant;
    }

    updates.push("updated_at = datetime('now')");
    params.push(merchantId);

    execute(
      `UPDATE merchants SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    console.log(`[KasGate] Updated merchant ${merchantId}`);

    return this.getMerchant(merchantId);
  }

  /**
   * Regenerate API key for a merchant
   */
  regenerateApiKey(merchantId: string): string | null {
    const merchant = this.getMerchant(merchantId);
    if (!merchant) return null;

    const newApiKey = this.generateApiKey();

    execute(
      "UPDATE merchants SET api_key = ?, updated_at = datetime('now') WHERE id = ?",
      [newApiKey, merchantId]
    );

    console.log(`[KasGate] Regenerated API key for merchant ${merchantId}`);

    return newApiKey;
  }

  /**
   * Regenerate webhook secret for a merchant
   */
  regenerateWebhookSecret(merchantId: string): string | null {
    const merchant = this.getMerchant(merchantId);
    if (!merchant) return null;

    const newSecret = this.generateWebhookSecret();

    execute(
      "UPDATE merchants SET webhook_secret = ?, updated_at = datetime('now') WHERE id = ?",
      [newSecret, merchantId]
    );

    console.log(`[KasGate] Regenerated webhook secret for merchant ${merchantId}`);

    return newSecret;
  }

  /**
   * Delete a merchant
   */
  deleteMerchant(merchantId: string): boolean {
    const result = execute(
      'DELETE FROM merchants WHERE id = ?',
      [merchantId]
    );

    if (result.changes > 0) {
      console.log(`[KasGate] Deleted merchant ${merchantId}`);
      return true;
    }

    return false;
  }

  /**
   * Get all merchants (for admin)
   */
  getAllMerchants(): Merchant[] {
    const rows = query<MerchantRow>(
      'SELECT * FROM merchants ORDER BY created_at DESC'
    );

    return rows.map((row) => this.rowToMerchant(row));
  }

  /**
   * Verify an API key is valid
   */
  verifyApiKey(apiKey: string): Merchant | null {
    return this.getMerchantByApiKey(apiKey);
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private rowToMerchant(row: MerchantRow): Merchant {
    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      xpub: row.xpub,
      apiKey: row.api_key,
      webhookUrl: row.webhook_url || undefined,
      webhookSecret: row.webhook_secret || undefined,
      nextAddressIndex: row.next_address_index,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private generateApiKey(): string {
    // Format: kg_live_[32 random chars]
    const random = crypto.randomBytes(24).toString('base64url');
    return `kg_live_${random}`;
  }

  private generateWebhookSecret(): string {
    // Format: whsec_[32 random chars]
    const random = crypto.randomBytes(24).toString('base64url');
    return `whsec_${random}`;
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let merchantService: MerchantService | null = null;

/**
 * Get the singleton merchant service instance
 */
export function getMerchantService(): MerchantService {
  if (!merchantService) {
    merchantService = new MerchantService();
  }
  return merchantService;
}

/**
 * Reset the merchant service (for testing)
 */
export function resetMerchantService(): void {
  merchantService = null;
}

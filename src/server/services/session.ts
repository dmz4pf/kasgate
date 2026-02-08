/**
 * Session Manager - Payment Session Lifecycle Management
 *
 * Handles creation, tracking, and expiration of payment sessions.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, transaction, toJson, fromJson, toSqliteDate } from '../db/index.js';
import { getAddressService } from './address.js';
import { SESSION_EXPIRY_MINUTES } from '../../shared/constants.js';
import type { PaymentSession, PaymentStatus } from '../../kaspa/types.js';

// ============================================================
// TYPES
// ============================================================

interface SessionRow {
  id: string;
  merchant_id: string;
  address: string;
  address_index: number;
  amount: string;
  status: string;
  tx_id: string | null;
  confirmations: number;
  order_id: string | null;
  metadata: string | null;
  redirect_url: string | null;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
  confirmed_at: string | null;
}

export interface CreateSessionInput {
  merchantId: string;
  amount: bigint;
  orderId?: string;
  metadata?: Record<string, string>;
  redirectUrl?: string;
}

// ============================================================
// SESSION MANAGER CLASS
// ============================================================

export class SessionManager {
  /**
   * Create a new payment session
   */
  async createSession(input: CreateSessionInput): Promise<PaymentSession> {
    const addressService = getAddressService();

    // Get the next unique address for this merchant
    const { address, index } = await addressService.getNextAddress(input.merchantId);

    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_MINUTES * 60 * 1000);

    execute(
      `INSERT INTO sessions (
        id, merchant_id, address, address_index, amount, status,
        order_id, metadata, redirect_url, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.merchantId,
        address,
        index,
        input.amount.toString(),
        'pending',
        input.orderId || null,
        input.metadata ? toJson(input.metadata) : null,
        input.redirectUrl || null,
        toSqliteDate(now),
        toSqliteDate(expiresAt),
      ]
    );

    console.log(`[KasGate] Created session ${id} for ${input.amount} sompi`);

    return {
      id,
      merchantId: input.merchantId,
      address,
      amount: input.amount,
      status: 'pending',
      confirmations: 0,
      orderId: input.orderId,
      metadata: input.metadata,
      createdAt: now,
      expiresAt,
    };
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): PaymentSession | null {
    const row = queryOne<SessionRow>(
      'SELECT * FROM sessions WHERE id = ?',
      [sessionId]
    );

    if (!row) return null;

    return this.rowToSession(row);
  }

  /**
   * Get a session by address
   */
  getSessionByAddress(address: string): PaymentSession | null {
    const row = queryOne<SessionRow>(
      'SELECT * FROM sessions WHERE address = ? AND status IN (?, ?)',
      [address, 'pending', 'confirming']
    );

    if (!row) return null;

    return this.rowToSession(row);
  }

  /**
   * Get all active sessions for a merchant
   */
  getActiveSessions(merchantId: string): PaymentSession[] {
    const rows = query<SessionRow>(
      `SELECT * FROM sessions
       WHERE merchant_id = ? AND status IN (?, ?)
       ORDER BY created_at DESC`,
      [merchantId, 'pending', 'confirming']
    );

    return rows.map((row) => this.rowToSession(row));
  }

  /**
   * Update session status to confirming (payment detected)
   */
  markPaymentReceived(sessionId: string, txId: string): void {
    execute(
      `UPDATE sessions
       SET status = ?, tx_id = ?, paid_at = datetime('now')
       WHERE id = ?`,
      ['confirming', txId, sessionId]
    );

    console.log(`[KasGate] Session ${sessionId} payment received: ${txId}`);
  }

  /**
   * Update confirmation count
   */
  updateConfirmations(sessionId: string, confirmations: number): void {
    execute(
      `UPDATE sessions SET confirmations = ? WHERE id = ?`,
      [confirmations, sessionId]
    );
  }

  /**
   * Mark session as confirmed
   */
  markConfirmed(sessionId: string, confirmations: number): void {
    execute(
      `UPDATE sessions
       SET status = ?, confirmations = ?, confirmed_at = datetime('now')
       WHERE id = ?`,
      ['confirmed', confirmations, sessionId]
    );

    console.log(`[KasGate] Session ${sessionId} confirmed with ${confirmations} confirmations`);
  }

  /**
   * Mark session as expired
   */
  markExpired(sessionId: string): void {
    execute(
      `UPDATE sessions SET status = ? WHERE id = ?`,
      ['expired', sessionId]
    );

    console.log(`[KasGate] Session ${sessionId} expired`);
  }

  /**
   * Mark session as failed
   */
  markFailed(sessionId: string): void {
    execute(
      `UPDATE sessions SET status = ? WHERE id = ?`,
      ['failed', sessionId]
    );

    console.log(`[KasGate] Session ${sessionId} failed`);
  }

  /**
   * Get all expired pending sessions
   */
  getExpiredSessions(): PaymentSession[] {
    const rows = query<SessionRow>(
      `SELECT * FROM sessions
       WHERE status = ? AND expires_at < datetime('now')`,
      ['pending']
    );

    return rows.map((row) => this.rowToSession(row));
  }

  /**
   * Get all confirming sessions (for confirmation tracking)
   */
  getConfirmingSessions(): PaymentSession[] {
    const rows = query<SessionRow>(
      `SELECT * FROM sessions WHERE status = ?`,
      ['confirming']
    );

    return rows.map((row) => this.rowToSession(row));
  }

  /**
   * Expire old pending sessions
   */
  expireOldSessions(): number {
    const result = execute(
      `UPDATE sessions
       SET status = ?
       WHERE status = ? AND expires_at < datetime('now')`,
      ['expired', 'pending']
    );

    if (result.changes > 0) {
      console.log(`[KasGate] Expired ${result.changes} old sessions`);
    }

    return result.changes;
  }

  /**
   * Get session history for a merchant
   */
  getSessionHistory(
    merchantId: string,
    options: { limit?: number; offset?: number; status?: PaymentStatus } = {}
  ): { sessions: PaymentSession[]; total: number } {
    const { limit = 20, offset = 0, status } = options;

    let whereClause = 'WHERE merchant_id = ?';
    const params: any[] = [merchantId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Get total count
    const countResult = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sessions ${whereClause}`,
      params
    );

    // Get paginated results
    const rows = query<SessionRow>(
      `SELECT * FROM sessions ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      sessions: rows.map((row) => this.rowToSession(row)),
      total: countResult?.count || 0,
    };
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private rowToSession(row: SessionRow): PaymentSession {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      address: row.address,
      amount: BigInt(row.amount),
      status: row.status as PaymentStatus,
      confirmations: row.confirmations,
      txId: row.tx_id || undefined,
      orderId: row.order_id || undefined,
      metadata: row.metadata ? fromJson(row.metadata) || undefined : undefined,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
    };
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let sessionManager: SessionManager | null = null;

/**
 * Get the singleton session manager instance
 */
export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}

/**
 * Reset the session manager (for testing)
 */
export function resetSessionManager(): void {
  sessionManager = null;
}

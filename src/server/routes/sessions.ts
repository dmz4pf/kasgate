/**
 * Session Routes - Payment Session API Endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { getSessionManager } from '../services/session.js';
import { getPaymentMonitor } from '../services/payment-monitor.js';
import { getConfirmationTracker } from '../services/confirmation.js';
import { getWebhookService } from '../services/webhook.js';
import { getWebSocketManager } from '../websocket/index.js';
import { kasToSompi, sompiToKas } from '../../kaspa/units.js';
import { NETWORK_CONFIG } from '../../config/network.js';

const router = Router();

// ============================================================
// SCHEMAS
// ============================================================

/**
 * Bug #27: Sanitize string to remove ALL HTML tags and dangerous content
 * Strip all HTML rather than blocklist approach to prevent XSS bypasses
 */
export function sanitizeString(str: string): string {
  // Remove ALL HTML tags - safer than trying to blocklist specific tags
  let sanitized = str.replace(/<[^>]*>/g, '');
  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  // Remove any remaining event handlers (belt and suspenders)
  sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');
  return sanitized.trim();
}

/**
 * Bug #27: Metadata schema with size limit and sanitization
 * - Max 1KB total size
 * - Max 20 keys
 * - Keys max 50 chars, values max 500 chars
 * - Script tags stripped
 */
const sanitizedMetadataSchema = z.record(z.string()).optional()
  .transform((metadata) => {
    if (!metadata) return metadata;

    // Sanitize all values
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      sanitized[sanitizeString(key).slice(0, 50)] = sanitizeString(value).slice(0, 500);
    }
    return sanitized;
  })
  .refine((metadata) => {
    if (!metadata) return true;
    // Max 20 keys
    if (Object.keys(metadata).length > 20) return false;
    // Max 1KB total size
    const totalSize = JSON.stringify(metadata).length;
    return totalSize <= 1024;
  }, {
    message: 'Metadata too large (max 20 keys, 1KB total)',
  });

const createSessionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
  orderId: z.string().max(100).optional()
    .transform((v) => v ? sanitizeString(v) : v),
  metadata: sanitizedMetadataSchema,
  redirectUrl: z.string().url().optional(),
});

const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /sessions - Create a new payment session
 */
router.post(
  '/',
  requireAuth,
  validateBody(createSessionSchema),
  asyncHandler(async (req, res) => {
    const { amount, orderId, metadata, redirectUrl } = req.body;
    const merchant = req.merchant!;

    // Convert KAS to sompi
    const amountSompi = kasToSompi(amount);

    // Create session
    const sessionManager = getSessionManager();
    const session = await sessionManager.createSession({
      merchantId: merchant.id,
      amount: amountSompi,
      orderId,
      metadata,
      redirectUrl,
    });

    // Start monitoring the address
    const paymentMonitor = getPaymentMonitor();
    await paymentMonitor.monitor(session.address, amountSompi, {
      onPaymentDetected: async (address, txId, detectedAmount, utxos) => {
        // Bug #12 fix: Check if session has expired before accepting payment
        const currentSession = sessionManager.getSession(session.id);
        if (!currentSession) {
          console.warn(`[KasGate] Session ${session.id} no longer exists, ignoring payment`);
          await paymentMonitor.unmonitor(address);
          return;
        }

        if (currentSession.expiresAt < new Date()) {
          console.warn(`[KasGate] Session ${session.id} expired, rejecting payment`);
          sessionManager.markExpired(session.id);
          await paymentMonitor.unmonitor(address);
          return;
        }

        if (currentSession.status !== 'pending') {
          console.warn(`[KasGate] Session ${session.id} not pending (${currentSession.status}), ignoring payment`);
          await paymentMonitor.unmonitor(address);
          return;
        }

        // Mark payment as received (Bug #12: atomic check for expiry)
        const accepted = sessionManager.markPaymentReceived(session.id, txId);

        if (!accepted) {
          // Payment rejected (session expired or invalid state)
          console.warn(`[KasGate] Payment for session ${session.id} rejected - session expired or invalid`);
          await paymentMonitor.unmonitor(address);
          return;
        }

        // Start confirmation tracking
        const confirmationTracker = getConfirmationTracker();
        await confirmationTracker.track(session.id, txId);

        // Send webhook
        const updatedSession = sessionManager.getSession(session.id);
        if (updatedSession) {
          const webhookService = getWebhookService();
          await webhookService.sendWebhook(updatedSession, 'payment.confirming');

          // Broadcast to WebSocket clients
          const wsManager = getWebSocketManager();
          wsManager.broadcastToSession(session.id, {
            type: 'status',
            sessionId: session.id,
            status: 'confirming',
            confirmations: 0,
          });
        }

        // Stop monitoring this address
        await paymentMonitor.unmonitor(address);
      },
      onError: (error) => {
        console.error(`[KasGate] Payment monitor error for ${session.id}:`, error);
      },
    });

    // Generate QR code
    const qrData = session.address;
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    res.status(201).json({
      id: session.id,
      address: session.address,
      amount: sompiToKas(session.amount),
      amountSompi: session.amount.toString(),
      status: session.status,
      orderId: session.orderId,
      qrCode: qrCodeDataUrl,
      subscriptionToken: session.subscriptionToken, // Bug #5: For WebSocket auth
      expiresAt: session.expiresAt.toISOString(),
      explorerUrl: `${NETWORK_CONFIG.explorerUrl}/addresses/${session.address}`,
    });
  })
);

/**
 * GET /sessions/:sessionId - Get session details
 */
router.get(
  '/:sessionId',
  optionalAuth,
  validateParams(sessionIdParamsSchema),
  asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId as string;

    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      throw ApiError.notFound('Session not found');
    }

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(session.address, {
      width: 256,
      margin: 2,
    });

    res.json({
      id: session.id,
      address: session.address,
      amount: sompiToKas(session.amount),
      amountSompi: session.amount.toString(),
      status: session.status,
      confirmations: session.confirmations,
      requiredConfirmations: NETWORK_CONFIG.confirmations,
      txId: session.txId,
      orderId: session.orderId,
      metadata: session.metadata,
      qrCode: qrCodeDataUrl,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      paidAt: session.paidAt?.toISOString(),
      confirmedAt: session.confirmedAt?.toISOString(),
      explorerUrl: session.txId
        ? `${NETWORK_CONFIG.explorerUrl}/txs/${session.txId}`
        : `${NETWORK_CONFIG.explorerUrl}/addresses/${session.address}`,
    });
  })
);

/**
 * GET /sessions/:sessionId/status - Get session status (lightweight)
 */
router.get(
  '/:sessionId/status',
  validateParams(sessionIdParamsSchema),
  asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId as string;

    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      throw ApiError.notFound('Session not found');
    }

    res.json({
      id: session.id,
      status: session.status,
      confirmations: session.confirmations,
      requiredConfirmations: NETWORK_CONFIG.confirmations,
      txId: session.txId,
    });
  })
);

/**
 * POST /sessions/:sessionId/cancel - Cancel a pending session
 */
router.post(
  '/:sessionId/cancel',
  requireAuth,
  validateParams(sessionIdParamsSchema),
  asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId as string;
    const merchant = req.merchant!;

    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      throw ApiError.notFound('Session not found');
    }

    if (session.merchantId !== merchant.id) {
      throw ApiError.forbidden('You do not own this session');
    }

    if (session.status !== 'pending') {
      throw ApiError.badRequest('Only pending sessions can be cancelled');
    }

    // Mark as expired (cancelled)
    sessionManager.markExpired(sessionId);

    // Stop monitoring
    const paymentMonitor = getPaymentMonitor();
    await paymentMonitor.unmonitor(session.address);

    // Notify WebSocket clients
    const wsManager = getWebSocketManager();
    wsManager.broadcastToSession(sessionId, {
      type: 'status',
      sessionId,
      status: 'expired',
    });

    res.json({
      id: session.id,
      status: 'expired',
      message: 'Session cancelled',
    });
  })
);

export default router;

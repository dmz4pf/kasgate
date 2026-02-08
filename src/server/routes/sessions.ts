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

const createSessionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
  orderId: z.string().max(100).optional(),
  metadata: z.record(z.string()).optional(),
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
        // Mark payment as received
        sessionManager.markPaymentReceived(session.id, txId);

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

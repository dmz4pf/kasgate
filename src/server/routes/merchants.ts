/**
 * Merchant Routes - Merchant Management API Endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { getMerchantService } from '../services/merchant.js';
import { getSessionManager } from '../services/session.js';
import { sompiToKas } from '../../kaspa/units.js';
import { validateXPubWithWasm } from '../../shared/validation.js';

const router = Router();

// ============================================================
// SCHEMAS
// ============================================================

// Bug #19: XPub validation with kaspa-wasm library
const xpubValidation = z.string()
  .regex(/^(xpub|kpub)[a-zA-Z0-9]{90,130}$/, 'Invalid xPub format')
  .refine((xpub) => validateXPubWithWasm(xpub), {
    message: 'Invalid xPub key - could not parse as valid extended public key',
  });

const createMerchantSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  xpub: xpubValidation,
  webhookUrl: z.string().url().optional(),
});

const updateMerchantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  xpub: xpubValidation.optional(),
  webhookUrl: z.string().url().optional(),
});

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /merchants - Create a new merchant (public registration)
 */
router.post(
  '/',
  validateBody(createMerchantSchema),
  asyncHandler(async (req, res) => {
    const { name, email, xpub, webhookUrl } = req.body;

    const merchantService = getMerchantService();

    // Check if email already exists
    if (email) {
      const existing = merchantService.getMerchantByEmail(email);
      if (existing) {
        throw ApiError.conflict('A merchant with this email already exists');
      }
    }

    const merchant = merchantService.createMerchant({
      name,
      email,
      xpub,
      webhookUrl,
    });

    res.status(201).json({
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      apiKey: merchant.apiKey,
      webhookUrl: merchant.webhookUrl,
      webhookSecret: merchant.webhookSecret,
      createdAt: merchant.createdAt.toISOString(),
    });
  })
);

/**
 * GET /merchants/me - Get current merchant details
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchant = req.merchant!;

    res.json({
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      webhookUrl: merchant.webhookUrl,
      nextAddressIndex: merchant.nextAddressIndex,
      createdAt: merchant.createdAt.toISOString(),
      updatedAt: merchant.updatedAt.toISOString(),
    });
  })
);

/**
 * PATCH /merchants/me - Update current merchant
 */
router.patch(
  '/me',
  requireAuth,
  validateBody(updateMerchantSchema),
  asyncHandler(async (req, res) => {
    const merchant = req.merchant!;
    const merchantService = getMerchantService();

    // Check email uniqueness if changing
    if (req.body.email && req.body.email !== merchant.email) {
      const existing = merchantService.getMerchantByEmail(req.body.email);
      if (existing) {
        throw ApiError.conflict('A merchant with this email already exists');
      }
    }

    const updated = merchantService.updateMerchant(merchant.id, req.body);

    if (!updated) {
      throw ApiError.internal('Failed to update merchant');
    }

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      webhookUrl: updated.webhookUrl,
      updatedAt: updated.updatedAt.toISOString(),
    });
  })
);

/**
 * POST /merchants/me/regenerate-api-key - Regenerate API key
 */
router.post(
  '/me/regenerate-api-key',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchant = req.merchant!;
    const merchantService = getMerchantService();

    const newApiKey = merchantService.regenerateApiKey(merchant.id);

    if (!newApiKey) {
      throw ApiError.internal('Failed to regenerate API key');
    }

    res.json({
      apiKey: newApiKey,
      message: 'API key regenerated. Update your integrations with the new key.',
    });
  })
);

/**
 * POST /merchants/me/regenerate-webhook-secret - Regenerate webhook secret
 */
router.post(
  '/me/regenerate-webhook-secret',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchant = req.merchant!;
    const merchantService = getMerchantService();

    const newSecret = merchantService.regenerateWebhookSecret(merchant.id);

    if (!newSecret) {
      throw ApiError.internal('Failed to regenerate webhook secret');
    }

    res.json({
      webhookSecret: newSecret,
      message: 'Webhook secret regenerated. Update your webhook verification.',
    });
  })
);

/**
 * GET /merchants/me/sessions - Get merchant's payment sessions
 */
router.get(
  '/me/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchant = req.merchant!;
    const sessionManager = getSessionManager();

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    const { sessions, total } = sessionManager.getSessionHistory(merchant.id, {
      limit,
      offset,
      status: status as any,
    });

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        address: s.address,
        amount: sompiToKas(s.amount),
        amountSompi: s.amount.toString(),
        status: s.status,
        confirmations: s.confirmations,
        txId: s.txId,
        orderId: s.orderId,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        paidAt: s.paidAt?.toISOString(),
        confirmedAt: s.confirmedAt?.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  })
);

/**
 * GET /merchants/me/stats - Get merchant statistics
 */
router.get(
  '/me/stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchant = req.merchant!;
    const sessionManager = getSessionManager();

    // Get all sessions for stats
    const { sessions: allSessions } = sessionManager.getSessionHistory(merchant.id, {
      limit: 10000,
    });

    const stats = {
      totalSessions: allSessions.length,
      pendingSessions: allSessions.filter((s) => s.status === 'pending').length,
      confirmingSessions: allSessions.filter((s) => s.status === 'confirming').length,
      confirmedSessions: allSessions.filter((s) => s.status === 'confirmed').length,
      expiredSessions: allSessions.filter((s) => s.status === 'expired').length,
      totalReceived: sompiToKas(
        allSessions
          .filter((s) => s.status === 'confirmed')
          .reduce((sum, s) => sum + s.amount, 0n)
      ),
      totalReceivedSompi: allSessions
        .filter((s) => s.status === 'confirmed')
        .reduce((sum, s) => sum + s.amount, 0n)
        .toString(),
    };

    res.json(stats);
  })
);

export default router;

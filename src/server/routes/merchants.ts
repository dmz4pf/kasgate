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
import { getWebhookService } from '../services/webhook.js';
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

/**
 * GET /merchants/me/analytics - Get advanced analytics
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' | 'year' (default: 'week')
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
router.get(
  '/me/analytics',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchant = req.merchant!;
    const sessionManager = getSessionManager();

    // Parse query params
    const period = (req.query.period as string) || 'week';
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    // Calculate start date based on period
    let startDate: Date;
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    } else {
      startDate = new Date(endDate);
      switch (period) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }
    }

    // Get all sessions
    const { sessions: allSessions } = sessionManager.getSessionHistory(merchant.id, {
      limit: 10000,
    });

    // Filter sessions by date range
    const sessionsInRange = allSessions.filter(s => {
      const createdAt = s.createdAt;
      return createdAt >= startDate && createdAt <= endDate;
    });

    // Calculate previous period for comparison
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodMs);
    const prevEndDate = new Date(startDate.getTime());

    const sessionsInPrevPeriod = allSessions.filter(s => {
      const createdAt = s.createdAt;
      return createdAt >= prevStartDate && createdAt < prevEndDate;
    });

    // Calculate current period stats
    const confirmedCurrent = sessionsInRange.filter(s => s.status === 'confirmed');
    const totalVolumeCurrent = confirmedCurrent.reduce((sum, s) => sum + s.amount, 0n);
    const conversionRateCurrent = sessionsInRange.length > 0
      ? (confirmedCurrent.length / sessionsInRange.length) * 100
      : 0;

    // Calculate previous period stats
    const confirmedPrev = sessionsInPrevPeriod.filter(s => s.status === 'confirmed');
    const totalVolumePrev = confirmedPrev.reduce((sum, s) => sum + s.amount, 0n);
    const conversionRatePrev = sessionsInPrevPeriod.length > 0
      ? (confirmedPrev.length / sessionsInPrevPeriod.length) * 100
      : 0;

    // Calculate daily breakdown
    const dailyBreakdown: Record<string, {
      sessions: number;
      confirmed: number;
      expired: number;
      volume: string;
      volumeSompi: string;
    }> = {};

    sessionsInRange.forEach(session => {
      const dateKey = session.createdAt.toISOString().split('T')[0];
      if (!dailyBreakdown[dateKey]) {
        dailyBreakdown[dateKey] = {
          sessions: 0,
          confirmed: 0,
          expired: 0,
          volume: '0',
          volumeSompi: '0',
        };
      }
      dailyBreakdown[dateKey].sessions++;
      if (session.status === 'confirmed') {
        dailyBreakdown[dateKey].confirmed++;
        const currentVolume = BigInt(dailyBreakdown[dateKey].volumeSompi);
        const newVolume = currentVolume + session.amount;
        dailyBreakdown[dateKey].volumeSompi = newVolume.toString();
        dailyBreakdown[dateKey].volume = sompiToKas(newVolume);
      }
      if (session.status === 'expired') {
        dailyBreakdown[dateKey].expired++;
      }
    });

    // Sort daily breakdown by date
    const sortedDailyBreakdown = Object.entries(dailyBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // Status distribution
    const statusDistribution = {
      pending: sessionsInRange.filter(s => s.status === 'pending').length,
      confirming: sessionsInRange.filter(s => s.status === 'confirming').length,
      confirmed: sessionsInRange.filter(s => s.status === 'confirmed').length,
      expired: sessionsInRange.filter(s => s.status === 'expired').length,
      failed: sessionsInRange.filter(s => s.status === 'failed').length,
    };

    // Top payment amounts
    const topPayments = confirmedCurrent
      .sort((a, b) => Number(b.amount - a.amount))
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        amount: sompiToKas(s.amount),
        amountSompi: s.amount.toString(),
        orderId: s.orderId,
        confirmedAt: s.confirmedAt?.toISOString(),
      }));

    // Average payment amount
    const avgPayment = confirmedCurrent.length > 0
      ? totalVolumeCurrent / BigInt(confirmedCurrent.length)
      : 0n;

    // Calculate percentage changes
    const volumeChange = totalVolumePrev > 0n
      ? Number((totalVolumeCurrent - totalVolumePrev) * 100n / totalVolumePrev)
      : totalVolumeCurrent > 0n ? 100 : 0;

    const sessionsChange = sessionsInPrevPeriod.length > 0
      ? ((sessionsInRange.length - sessionsInPrevPeriod.length) / sessionsInPrevPeriod.length) * 100
      : sessionsInRange.length > 0 ? 100 : 0;

    const conversionChange = conversionRatePrev > 0
      ? conversionRateCurrent - conversionRatePrev
      : conversionRateCurrent;

    res.json({
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        label: period,
      },
      summary: {
        totalSessions: sessionsInRange.length,
        confirmedSessions: confirmedCurrent.length,
        totalVolume: sompiToKas(totalVolumeCurrent),
        totalVolumeSompi: totalVolumeCurrent.toString(),
        conversionRate: Math.round(conversionRateCurrent * 100) / 100,
        averagePayment: sompiToKas(avgPayment),
        averagePaymentSompi: avgPayment.toString(),
      },
      comparison: {
        volumeChange: Math.round(volumeChange * 100) / 100,
        sessionsChange: Math.round(sessionsChange * 100) / 100,
        conversionChange: Math.round(conversionChange * 100) / 100,
        previousVolume: sompiToKas(totalVolumePrev),
        previousVolumeSompi: totalVolumePrev.toString(),
        previousSessions: sessionsInPrevPeriod.length,
      },
      statusDistribution,
      dailyBreakdown: sortedDailyBreakdown,
      topPayments,
    });
  })
);

/**
 * GET /merchants/me/webhook-logs - Get webhook delivery logs
 *
 * Query params:
 * - limit: number (default: 20)
 * - offset: number (default: 0)
 * - event: 'payment.pending' | 'payment.confirming' | 'payment.confirmed' | 'payment.expired' (optional)
 */
router.get(
  '/me/webhook-logs',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchant = req.merchant!;
    const webhookService = getWebhookService();

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const event = req.query.event as string | undefined;

    const { logs, total } = webhookService.getLogsForMerchant(merchant.id, {
      limit,
      offset,
      event,
    });

    res.json({
      logs: logs.map((log) => ({
        id: log.id,
        sessionId: log.session_id,
        event: log.event,
        statusCode: log.status_code,
        attempts: log.attempts,
        deliveryId: log.delivery_id,
        createdAt: log.created_at,
        deliveredAt: log.delivered_at,
        nextRetryAt: log.next_retry_at,
        // Include parsed payload for display
        payload: (() => {
          try {
            return JSON.parse(log.payload);
          } catch {
            return null;
          }
        })(),
        // Include response summary
        response: log.response ? log.response.substring(0, 500) : null,
      })),
      total,
      limit,
      offset,
    });
  })
);

/**
 * POST /merchants/me/webhook-logs/:id/retry - Retry a failed webhook
 */
router.post(
  '/me/webhook-logs/:id/retry',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchant = req.merchant!;
    const webhookService = getWebhookService();
    const logId = req.params.id as string;

    const success = await webhookService.retryWebhook(logId, merchant.id);

    if (!success) {
      throw ApiError.notFound('Webhook log not found or does not belong to this merchant');
    }

    res.json({
      message: 'Webhook queued for retry',
      logId,
    });
  })
);

export default router;

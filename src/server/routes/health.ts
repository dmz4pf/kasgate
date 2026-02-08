/**
 * Health Routes - System Health Check Endpoints
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { getRpcManager } from '../../kaspa/rpc.js';
import { getDatabase } from '../db/index.js';
import { NETWORK_CONFIG } from '../../config/network.js';

const router = Router();

/**
 * GET /health - Basic health check
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /health/detailed - Detailed health check
 */
router.get(
  '/detailed',
  asyncHandler(async (req, res) => {
    const checks: Record<string, { status: string; details?: any }> = {};

    // Check database
    try {
      const db = getDatabase();
      const result = db.prepare('SELECT 1 as ok').get() as { ok: number };
      checks.database = {
        status: result?.ok === 1 ? 'ok' : 'error',
      };
    } catch (error) {
      checks.database = {
        status: 'error',
        details: (error as Error).message,
      };
    }

    // Check RPC connection
    try {
      const rpcManager = getRpcManager();
      checks.rpc = {
        status: rpcManager.isConnected() ? 'ok' : 'disconnected',
        details: {
          state: rpcManager.getState(),
        },
      };
    } catch (error) {
      checks.rpc = {
        status: 'error',
        details: (error as Error).message,
      };
    }

    // Check Kaspa REST API
    try {
      const response = await fetch(`${NETWORK_CONFIG.apiUrl}/info/virtual-chain-blue-score`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      checks.kaspaApi = {
        status: response.ok ? 'ok' : 'error',
        details: {
          blueScore: data.blueScore,
        },
      };
    } catch (error) {
      checks.kaspaApi = {
        status: 'error',
        details: (error as Error).message,
      };
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');

    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      network: NETWORK_CONFIG.networkId,
      timestamp: new Date().toISOString(),
      checks,
    });
  })
);

/**
 * GET /health/ready - Readiness probe (for k8s)
 */
router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    try {
      // Check database is accessible
      const db = getDatabase();
      db.prepare('SELECT 1').get();

      res.json({ ready: true });
    } catch (error) {
      res.status(503).json({
        ready: false,
        error: (error as Error).message,
      });
    }
  })
);

/**
 * GET /health/live - Liveness probe (for k8s)
 */
router.get('/live', (req, res) => {
  res.json({ alive: true });
});

export default router;

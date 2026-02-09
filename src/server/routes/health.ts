/**
 * Health Routes - System Health Check Endpoints
 * Bug #25: Enhanced with deep health checks
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { getRpcManager } from '../../kaspa/rpc.js';
import { getRestPoller } from '../services/rest-poller.js';
import { getDatabase, queryOne } from '../db/index.js';
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
 * Bug #25: Enhanced with fallback mode, session stats, and deeper checks
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
    let rpcConnected = false;
    try {
      const rpcManager = getRpcManager();
      rpcConnected = rpcManager.isConnected();
      checks.rpc = {
        status: rpcConnected ? 'ok' : 'disconnected',
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

    // Check REST poller (fallback mode indicator - Bug #25)
    try {
      const restPoller = getRestPoller();
      const watchedCount = restPoller.getWatchedCount();
      const isPolling = restPoller.isPolling();

      checks.restPoller = {
        status: 'ok',
        details: {
          isActive: isPolling,
          watchedAddresses: watchedCount,
          mode: rpcConnected ? 'standby' : 'active-fallback',
        },
      };
    } catch (error) {
      checks.restPoller = {
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

    // Session stats (Bug #25: operational metrics)
    try {
      const sessionStats = queryOne<{
        total: number;
        pending: number;
        confirming: number;
        confirmed: number;
        expired: number;
      }>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'confirming' THEN 1 ELSE 0 END) as confirming,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired
        FROM sessions
        WHERE created_at > datetime('now', '-24 hours')
      `, []);

      checks.sessions = {
        status: 'ok',
        details: {
          last24h: sessionStats || { total: 0, pending: 0, confirming: 0, confirmed: 0, expired: 0 },
        },
      };
    } catch (error) {
      checks.sessions = {
        status: 'error',
        details: (error as Error).message,
      };
    }

    // Determine overall status
    const criticalChecks = [checks.database, checks.kaspaApi];
    const allCriticalOk = criticalChecks.every((c) => c.status === 'ok');
    const allOk = Object.values(checks).every((c) => c.status === 'ok' || c.status === 'disconnected');

    // Fallback mode indicator (Bug #25)
    const paymentMode = rpcConnected ? 'rpc-websocket' : 'rest-polling-fallback';

    res.status(allCriticalOk ? 200 : 503).json({
      status: allOk ? 'ok' : (allCriticalOk ? 'degraded' : 'unhealthy'),
      network: NETWORK_CONFIG.networkId,
      paymentMode, // Bug #25: Shows if using RPC or REST fallback
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

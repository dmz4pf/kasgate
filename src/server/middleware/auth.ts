/**
 * Authentication Middleware
 *
 * Verifies API keys and attaches merchant to request.
 */

import { Request, Response, NextFunction } from 'express';
import { getMerchantService, Merchant } from '../services/merchant.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      merchant?: Merchant;
    }
  }
}

/**
 * Extract API key from request
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }

  // Check query parameter (for widget initialization)
  if (typeof req.query.apiKey === 'string') {
    return req.query.apiKey;
  }

  return null;
}

/**
 * Middleware to require API key authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Provide via Authorization header, X-API-Key header, or apiKey query parameter.',
    });
    return;
  }

  const merchantService = getMerchantService();
  const merchant = merchantService.verifyApiKey(apiKey);

  if (!merchant) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key.',
    });
    return;
  }

  // Attach merchant to request
  req.merchant = merchant;

  next();
}

/**
 * Middleware for optional authentication
 * Attaches merchant if valid API key provided, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = extractApiKey(req);

  if (apiKey) {
    const merchantService = getMerchantService();
    const merchant = merchantService.verifyApiKey(apiKey);

    if (merchant) {
      req.merchant = merchant;
    }
  }

  next();
}

/**
 * Middleware to require merchant owns the resource
 * Must be used after requireAuth
 */
export function requireOwnership(
  getMerchantId: (req: Request) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.merchant) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
      return;
    }

    const resourceMerchantId = getMerchantId(req);

    if (!resourceMerchantId || resourceMerchantId !== req.merchant.id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this resource.',
      });
      return;
    }

    next();
  };
}

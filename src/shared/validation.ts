/**
 * Shared Validation Schemas - Zod schemas used across the application
 */

import { z } from 'zod';
import { NETWORK_CONFIG } from '../config/network.js';
import { SOMPI_PER_KAS, MIN_AMOUNT_SOMPI } from './constants.js';

// ============================================================
// ADDRESS VALIDATION
// ============================================================

/**
 * Kaspa address validation regex
 * Matches: kaspa:qr... or kaspatest:qr...
 */
const addressRegex = /^(kaspa|kaspatest):q[a-z0-9]{60,}$/;

/**
 * Validate a Kaspa address
 */
export const kaspaAddressSchema = z.string().regex(addressRegex, {
  message: 'Invalid Kaspa address format',
}).refine((address) => {
  // Ensure address prefix matches current network
  const prefix = address.split(':')[0];
  return prefix === NETWORK_CONFIG.addressPrefix;
}, {
  message: `Address must use ${NETWORK_CONFIG.addressPrefix} prefix for ${NETWORK_CONFIG.networkId}`,
});

// ============================================================
// AMOUNT VALIDATION
// ============================================================

/**
 * Amount in KAS (as string to preserve precision)
 */
export const kasAmountSchema = z.string().regex(/^\d+(\.\d{1,8})?$/, {
  message: 'Invalid KAS amount format',
}).transform((val) => {
  const [whole, decimal = ''] = val.split('.');
  const paddedDecimal = decimal.padEnd(8, '0');
  return BigInt(whole) * SOMPI_PER_KAS + BigInt(paddedDecimal);
}).refine((sompi) => sompi >= MIN_AMOUNT_SOMPI, {
  message: 'Amount must be at least 0.001 KAS',
});

/**
 * Amount in sompi (as string or number, converted to bigint)
 */
export const sompiAmountSchema = z.union([
  z.string().regex(/^\d+$/).transform(BigInt),
  z.number().int().positive().transform(BigInt),
  z.bigint(),
]).refine((sompi) => sompi >= MIN_AMOUNT_SOMPI, {
  message: 'Amount must be at least 0.001 KAS (100,000 sompi)',
});

// ============================================================
// SESSION VALIDATION
// ============================================================

/**
 * Session ID format (UUID v4)
 */
export const sessionIdSchema = z.string().uuid({
  message: 'Invalid session ID format',
});

/**
 * Payment session status
 */
export const sessionStatusSchema = z.enum([
  'pending',
  'confirming',
  'confirmed',
  'expired',
  'failed',
]);

export type SessionStatus = z.infer<typeof sessionStatusSchema>;

// ============================================================
// MERCHANT VALIDATION
// ============================================================

/**
 * Merchant API key format
 */
export const apiKeySchema = z.string().min(32).max(64).regex(/^[a-zA-Z0-9_-]+$/, {
  message: 'Invalid API key format',
});

/**
 * xPub key format (extended public key)
 */
export const xpubSchema = z.string().regex(/^(xpub|kpub)[a-zA-Z0-9]{90,130}$/, {
  message: 'Invalid xPub format (must start with xpub or kpub)',
});

/**
 * Webhook URL validation
 */
export const webhookUrlSchema = z.string().url().startsWith('https://', {
  message: 'Webhook URL must use HTTPS',
});

// ============================================================
// API REQUEST SCHEMAS
// ============================================================

/**
 * Create payment session request
 */
export const createSessionRequestSchema = z.object({
  merchantId: z.string().uuid(),
  amount: kasAmountSchema,
  orderId: z.string().max(100).optional(),
  metadata: z.record(z.string()).optional(),
  redirectUrl: z.string().url().optional(),
  webhookUrl: webhookUrlSchema.optional(),
});

export type CreateSessionRequest = z.input<typeof createSessionRequestSchema>;

/**
 * Get session request (URL params)
 */
export const getSessionParamsSchema = z.object({
  sessionId: sessionIdSchema,
});

// ============================================================
// WEBHOOK VALIDATION
// ============================================================

/**
 * Webhook event types
 */
export const webhookEventSchema = z.enum([
  'payment.pending',
  'payment.confirming',
  'payment.confirmed',
  'payment.expired',
  'payment.failed',
]);

export type WebhookEvent = z.infer<typeof webhookEventSchema>;

/**
 * Webhook payload
 */
export const webhookPayloadSchema = z.object({
  event: webhookEventSchema,
  sessionId: sessionIdSchema,
  merchantId: z.string().uuid(),
  amount: z.string(), // sompi as string
  address: z.string(),
  txId: z.string().optional(),
  confirmations: z.number().int().min(0).optional(),
  orderId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  timestamp: z.string().datetime(),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Validate and parse a Kaspa address, returning null if invalid
 */
export function parseAddress(address: string): string | null {
  try {
    return kaspaAddressSchema.parse(address);
  } catch {
    return null;
  }
}

/**
 * Validate amount and convert to sompi, returning null if invalid
 */
export function parseKasAmount(amount: string): bigint | null {
  try {
    return kasAmountSchema.parse(amount);
  } catch {
    return null;
  }
}
